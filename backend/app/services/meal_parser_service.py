"""
meal_parser_service.py - LoRA-powered Natural Language Indian Meal Extraction Service.
Loads Qwen2.5-0.5B-Instruct with fine-tuned LoRA adapter from 2023300247_LLM_Exp2.ipynb.
Extracts structured food items, quantities, units, and meal types without inventing nutrition values.
Integrates with MongoDB Anuvaad matching and portion clarification.
"""

import os
import re
import json
import logging
from typing import Dict, Any, List, Optional, Tuple

import torch
from transformers import AutoTokenizer, AutoModelForCausalLM
from peft import PeftModel

from app.core.config import settings
from app.schemas.meal_intelligence import (
    ExtractedFoodItem,
    ExtractedMeal,
    ClarificationQuestion,
    MealExtractionResponse
)
from app.services.food_matching_service import food_matching_service

logger = logging.getLogger("nutriai.meal_parser_service")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ADAPTER_R8_PATH = os.path.join(BASE_DIR, "artifacts", "lora_adapter", "qwen_lora_r8_lr2e4")
ADAPTER_R4_PATH = os.path.join(BASE_DIR, "artifacts", "lora_adapter", "qwen_lora_r4_lr2e4")

# Global singleton model & tokenizer
_parser_model = None
_parser_tokenizer = None
_active_adapter_path: Optional[str] = None
_model_load_error: Optional[str] = None

def get_preferred_adapter_path() -> Optional[str]:
    """Finds available fine-tuned LoRA adapter (preferring r=8, fallback r=4)."""
    if os.path.exists(os.path.join(ADAPTER_R8_PATH, "adapter_model.safetensors")):
        return ADAPTER_R8_PATH
    if os.path.exists(os.path.join(ADAPTER_R4_PATH, "adapter_model.safetensors")):
        return ADAPTER_R4_PATH
    return None

def load_lora_parser_model() -> Tuple[Optional[Any], Optional[Any]]:
    """Loads base model and attaches the fine-tuned LoRA adapter (Singleton)."""
    global _parser_model, _parser_tokenizer, _active_adapter_path, _model_load_error

    if _parser_model is not None and _parser_tokenizer is not None:
        return _parser_model, _parser_tokenizer

    adapter_path = get_preferred_adapter_path()
    if not adapter_path:
        _model_load_error = "No LoRA adapter found in artifacts/lora_adapter"
        logger.warning(_model_load_error)
        return None, None

    try:
        logger.info("Initializing LoRA Meal Parser using base model '%s'...", settings.BASE_MODEL_NAME)
        device = "cuda" if torch.cuda.is_available() else "cpu"

        # Load Tokenizer
        tokenizer = AutoTokenizer.from_pretrained(adapter_path)
        if tokenizer.pad_token is None:
            tokenizer.pad_token = tokenizer.eos_token

        # Load Base Model
        base_model = AutoModelForCausalLM.from_pretrained(
            settings.BASE_MODEL_NAME,
            torch_dtype=torch.float32,
            low_cpu_mem_usage=True
        )

        # Attach LoRA Adapter
        logger.info("Attaching fine-tuned LoRA weights from: %s", adapter_path)
        model = PeftModel.from_pretrained(base_model, adapter_path)
        model.eval()

        _parser_model = model
        _parser_tokenizer = tokenizer
        _active_adapter_path = adapter_path
        _model_load_error = None
        logger.info("LoRA Meal Parser model loaded successfully on %s.", device)
        return _parser_model, _parser_tokenizer

    except Exception as exc:
        _model_load_error = f"Failed to load LoRA model: {str(exc)}"
        logger.error(_model_load_error, exc_info=True)
        return None, None

def is_lora_ready() -> bool:
    return get_preferred_adapter_path() is not None

SYSTEM_EXTRACTION_PROMPT = """You are NutriAI, an Indian clinical nutrition expert. Extract food items, quantities, units, and meal types from the user's meal description into structured JSON.
Return ONLY valid JSON matching this exact structure:
{
  "meals": [
    {
      "meal_type": "breakfast",
      "items": [
        {
          "food_name": "idli",
          "quantity": 2,
          "unit": "pieces",
          "quantity_g": null,
          "confidence": 0.95
        }
      ]
    }
  ],
  "requires_clarification": true,
  "clarification_questions": [
    {
      "food_name": "idli",
      "question": "What is the approximate weight of each idli?"
    }
  ]
}

Extraction Rules:
1. Identify all food items mentioned.
2. Extract numerical quantity and unit (pieces, bowl, katori, cup, grams, etc.).
3. Identify meal type: breakfast, lunch, dinner, snack, or unspecified.
4. Set quantity_g to null unless the user explicitly specified grams (e.g. '100g').
5. NEVER invent or output calories, protein, carbohydrates, or fat values.
6. Flag requires_clarification: true when piece/bowl weights are unspecified.
Return ONLY the raw JSON object, without introductory text or explanations."""

def clean_and_extract_json(text: str) -> Optional[Dict[str, Any]]:
    """Robustly extracts and parses JSON from model generation output."""
    cleaned = text.strip()

    # 1. Direct JSON check
    if cleaned.startswith("{") and cleaned.endswith("}"):
        try:
            return json.loads(cleaned)
        except Exception:
            pass

    # 2. Extract from ```json ... ``` or ``` ... ``` code blocks
    code_block_match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", cleaned, re.IGNORECASE)
    if code_block_match:
        try:
            return json.loads(code_block_match.group(1).strip())
        except Exception:
            pass

    # 3. Find outer braces
    first_brace = cleaned.find("{")
    last_brace = cleaned.rfind("}")
    if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
        json_slice = cleaned[first_brace : last_brace + 1]
        try:
            return json.loads(json_slice)
        except Exception:
            # Try removing trailing commas
            fixed = re.sub(r",\s*([}\]])", r"\1", json_slice)
            try:
                return json.loads(fixed)
            except Exception:
                pass

    return None

def deterministic_regex_fallback_extractor(text: str) -> Dict[str, Any]:
    """
    Deterministic NLP rule-based meal parser used as an explicit fallback
    if local PyTorch memory is exhausted or LoRA fails.
    Never invents calories or mock nutrition.
    """
    meals: List[Dict[str, Any]] = []
    text_lower = text.lower()

    # Detect meal types present in text
    sections: List[Tuple[str, str]] = []
    markers = [
        ("breakfast", ["for breakfast", "breakfast:", "in breakfast", "breakfast was", "breakfast"]),
        ("lunch", ["for lunch", "lunch:", "in lunch", "lunch was", "lunch"]),
        ("dinner", ["for dinner", "dinner:", "in dinner", "dinner was", "dinner"]),
        ("snack", ["for snack", "snacks:", "evening snack", "tea time", "snack"])
    ]

    found_markers = []
    for m_type, phrases in markers:
        for phrase in phrases:
            idx = text_lower.find(phrase)
            if idx != -1:
                found_markers.append((idx, m_type, len(phrase)))
                break

    found_markers.sort(key=lambda x: x[0])

    if found_markers:
        for i in range(len(found_markers)):
            m_idx, m_type, p_len = found_markers[i]
            start = m_idx + p_len
            end = found_markers[i + 1][0] if i + 1 < len(found_markers) else len(text)
            sec_text = text[start:end].strip()
            sections.append((m_type, sec_text))
    else:
        sections.append(("unspecified", text))

    # Pattern for number + unit + food (e.g. 2 idlis, 1 bowl of dal, 100g of rice)
    item_pattern = re.compile(
        r"(?:(\d+(?:\.\d+)?)\s*(pieces?|bowls?|katoris?|cups?|plates?|grams?|gm|gms|g|ml|rotis?|chapatis?|idlis?|dosas?|spoons?|tbsp)?\s*(?:of)?\s*)?([a-zA-Z\s]{2,30})",
        re.IGNORECASE
    )

    for m_type, sec_text in sections:
        items = []
        chunks = re.split(r"[,;]|\band\b|\bwith\b|\bplus\b", sec_text)
        for chunk in chunks:
            chunk = chunk.strip()
            if not chunk or len(chunk) < 2:
                continue

            # Check quantity
            match = re.search(r"(\d+(?:\.\d+)?)\s*(grams?|gm|gms|g|ml|kg|pieces?|bowls?|katoris?|cups?|plates?|serving)?\s*(?:of)?\s*(.+)", chunk, re.IGNORECASE)
            if match:
                qty = float(match.group(1))
                unit = match.group(2) or "pieces"
                food = match.group(3).strip()
            else:
                # Food without number
                qty = 1.0
                unit = "serving"
                food = chunk

            # Strip filler words
            food = re.sub(r"\b(i ate|i had|ate|had|eating|some|a|an|bowl of|plate of|cup of|for|my)\b", "", food, flags=re.IGNORECASE).strip()
            if len(food) >= 2:
                items.append({
                    "food_name": food,
                    "quantity": qty,
                    "unit": unit,
                    "quantity_g": qty if unit.lower() in ("g", "gram", "grams", "gm", "gms") else None,
                    "confidence": 0.85
                })

        if items:
            meals.append({"meal_type": m_type, "items": items})

    return {
        "meals": meals if meals else [{"meal_type": "unspecified", "items": [{"food_name": text.strip()[:40], "quantity": 1, "unit": "serving", "quantity_g": None, "confidence": 0.70}]}],
        "requires_clarification": True,
        "clarification_questions": []
    }

class MealParserService:
    @staticmethod
    def parse_meal_description(message: str) -> MealExtractionResponse:
        """
        Parses raw meal descriptions using the fine-tuned LoRA model.
        Returns validated structured meals matched against MongoDB Anuvaad records.
        """
        logger.info("Parsing meal description with LoRA: '%s'", message[:80])
        model, tokenizer = load_lora_parser_model()
        raw_json_data = None
        model_used = "Qwen2.5-0.5B-Instruct + LoRA (qwen_lora_r8_lr2e4)"

        if model is not None and tokenizer is not None:
            try:
                formatted_prompt = (
                    f"<|im_start|>system\n{SYSTEM_EXTRACTION_PROMPT}<|im_end|>\n"
                    f"<|im_start|>user\n{message.strip()}<|im_end|>\n"
                    f"<|im_start|>assistant\n"
                )
                inputs = tokenizer(formatted_prompt, return_tensors="pt")
                device = next(model.parameters()).device
                inputs = {k: v.to(device) for k, v in inputs.items()}

                with torch.no_grad():
                    outputs = model.generate(
                        **inputs,
                        max_new_tokens=450,
                        do_sample=False,
                        pad_token_id=tokenizer.eos_token_id
                    )

                gen_tokens = outputs[0][inputs["input_ids"].shape[1]:]
                response_text = tokenizer.decode(gen_tokens, skip_special_tokens=True).strip()
                logger.debug("LoRA Raw Generation:\n%s", response_text)

                raw_json_data = clean_and_extract_json(response_text)
                if not raw_json_data:
                    logger.warning("LoRA output was not valid JSON, running deterministic repair...")
            except Exception as e:
                logger.error("LoRA inference error: %s", e)

        if not raw_json_data:
            logger.info("Using deterministic NLP fallback parser...")
            raw_json_data = deterministic_regex_fallback_extractor(message)
            model_used = "Deterministic Fallback Parser (LoRA Inference Deferred)"

        # Adapt raw json into ExtractedMeal objects
        parsed_meals: List[ExtractedMeal] = []
        raw_meals_list = raw_json_data.get("meals", [])
        if not raw_meals_list and "items" in raw_json_data:
            raw_meals_list = [{"meal_type": "unspecified", "items": raw_json_data["items"]}]

        all_items: List[ExtractedFoodItem] = []

        for m_data in raw_meals_list:
            meal_type = m_data.get("meal_type", "unspecified")
            items_list: List[ExtractedFoodItem] = []

            for item_dict in m_data.get("items", []):
                raw_name = item_dict.get("food_name") or item_dict.get("name") or "Food Item"
                food_name = str(raw_name).replace("_", " ").strip()
                raw_qty = item_dict.get("quantity")
                try:
                    qty = float(raw_qty) if raw_qty is not None else None
                except (ValueError, TypeError):
                    qty = None

                unit = item_dict.get("unit")
                raw_g = item_dict.get("quantity_g")
                try:
                    qty_g = float(raw_g) if raw_g is not None and float(raw_g) > 0 else None
                except (ValueError, TypeError):
                    qty_g = None

                # Check if unit itself is in grams/ml
                unit_str = str(unit).strip().lower() if unit else ""
                if qty_g is None and unit_str in ("g", "gram", "grams", "gm", "gms", "ml") and qty and qty > 0:
                    qty_g = qty

                # If qty_g is still None, inspect user's raw message for explicit weight patterns associated with this food
                if qty_g is None:
                    clean_name = food_name.lower()
                    tokens = [clean_name] + [w for w in clean_name.split() if len(w) > 2]
                    for w in tokens:
                        # 1. Number + weight unit right before food: e.g. "150g boiled rice", "100 g paneer"
                        pat_before = rf"(\d+(?:\.\d+)?)\s*(?:g|gm|gms|gram|grams|ml)\b\s*(?:of\s+)?(?:\w+\s+){{0,2}}\b{re.escape(w)}\b"
                        m_before = re.findall(pat_before, message, re.IGNORECASE)
                        if m_before:
                            qty_g = float(m_before[-1])
                            unit = "grams"
                            qty = qty_g
                            break
                        # 2. Food right before number + weight unit: e.g. "boiled rice 150g"
                        pat_after = rf"\b{re.escape(w)}\b(?:\s+\w+){{0,2}}\s*(\d+(?:\.\d+)?)\s*(?:g|gm|gms|gram|grams|ml)\b"
                        m_after = re.findall(pat_after, message, re.IGNORECASE)
                        if m_after:
                            qty_g = float(m_after[0])
                            unit = "grams"
                            qty = qty_g
                            break

                conf = item_dict.get("confidence", 0.90)

                extracted_item = ExtractedFoodItem(
                    food_name=food_name,
                    quantity=qty,
                    unit=str(unit).strip() if unit else None,
                    quantity_g=qty_g,
                    confidence=conf,
                    portion_known=qty_g is not None and qty_g > 0
                )

                # Match against MongoDB Anuvaad collection
                matched_item = food_matching_service.match_extracted_item(extracted_item)
                items_list.append(matched_item)
                all_items.append(matched_item)

            if items_list:
                parsed_meals.append(ExtractedMeal(meal_type=meal_type, items=items_list))

        # Generate portion clarification questions
        clarification_questions = food_matching_service.generate_clarification_questions(all_items)
        requires_clarification = len(clarification_questions) > 0

        return MealExtractionResponse(
            meals=parsed_meals,
            requires_clarification=requires_clarification,
            clarification_questions=clarification_questions,
            model_used=model_used
        )

    @staticmethod
    def generate_ai_meal_summary(
        meal_name: str,
        items_breakdown: List[Dict[str, Any]],
        total_nutrients: Dict[str, Optional[float]],
        macronutrient_ratios: Dict[str, float],
        rag_context_snippets: Optional[List[str]] = None
    ) -> str:
        """
        Synthesizes a clean, evidence-based clinical assessment of the calculated meal.
        Contains NO noisy RAG dumps, myths, or disclaimers.
        """
        calories = total_nutrients.get("energy_kcal", 0.0) or 0.0
        protein = total_nutrients.get("protein_g", 0.0) or 0.0
        carbs = total_nutrients.get("carb_g", 0.0) or 0.0
        fat = total_nutrients.get("fat_g", 0.0) or 0.0
        fibre = total_nutrients.get("fibre_g", 0.0) or 0.0

        food_bullets = []
        for it in items_breakdown:
            name = it.get("food_name", "Item")
            qty = it.get("quantity_g", 0.0)
            nuts = it.get("nutrients", {})
            kcal = nuts.get("energy_kcal", 0.0) or 0.0
            prot = nuts.get("protein_g", 0.0) or 0.0
            c = nuts.get("carb_g", 0.0) or 0.0
            f = nuts.get("fat_g", 0.0) or 0.0
            food_bullets.append(
                f"- **{name}** ({qty}g): {round(kcal, 1)} kcal | Protein: {round(prot, 1)}g | Carbs: {round(c, 1)}g | Fat: {round(f, 1)}g"
            )

        foods_text = "\n".join(food_bullets)

        carb_pct = macronutrient_ratios.get("carb_energy_pct", 0.0)
        protein_pct = macronutrient_ratios.get("protein_energy_pct", 0.0)
        fat_pct = macronutrient_ratios.get("fat_energy_pct", 0.0)

        # Observations based on ICMR-NIN nutritional criteria
        if protein >= 20.0:
            protein_obs = f"Excellent protein density with **{round(protein, 1)}g** total protein, meeting over 35% of daily adult RDA."
        elif protein >= 12.0:
            protein_obs = f"Moderate protein contribution (**{round(protein, 1)}g**). Combining dairy, legumes, or eggs can enhance essential amino acid completeness."
        else:
            protein_obs = f"Relatively low protein yield (**{round(protein, 1)}g**). Consider pairing with lentils (dal), paneer, tofu, or sprouts to raise protein adequacy."

        if fibre >= 8.0:
            fibre_obs = f"High in dietary fibre (**{round(fibre, 1)}g**), promoting sustained satiety, optimal gut microbiota fermentation, and blunted postprandial glucose spikes."
        elif fibre >= 4.0:
            fibre_obs = f"Moderate dietary fibre (**{round(fibre, 1)}g**). Adding raw salads, whole grains, or leafy vegetables can further assist digestive motility."
        else:
            fibre_obs = f"Low in dietary fibre (**{round(fibre, 1)}g**). Pairing with fibre-rich vegetables or legumes helps improve glycemic control."

        if 50.0 <= carb_pct <= 65.0 and 10.0 <= protein_pct <= 20.0:
            macro_obs = "Macronutrient distribution aligns well with ICMR-NIN recommendations for balanced Indian plates (50-65% carbohydrates, 10-15% protein, 20-30% fats)."
        elif carb_pct > 65.0:
            macro_obs = "Carbohydrate-dominant energy profile. Balancing with higher protein or healthy lipid sources helps steady glycemic response."
        else:
            macro_obs = f"Balanced macronutrient ratio ({round(carb_pct, 1)}% carbs, {round(protein_pct, 1)}% protein, {round(fat_pct, 1)}% fat)."

        summary = (
            f"### AI Clinical Assessment for {meal_name}\n\n"
            f"Your meal provides a total of **{round(calories, 1)} kcal**, with an energy distribution of "
            f"**{carb_pct}% Carbohydrates**, **{protein_pct}% Protein**, and **{fat_pct}% Healthy Fats**.\n\n"
            f"#### Key Food Contributions:\n{foods_text}\n\n"
            f"#### Clinical Dietary Observations:\n"
            f"- **Protein Adequacy**: {protein_obs}\n"
            f"- **Glycemic Balance & Fiber**: {fibre_obs}\n"
            f"- **Macronutrient Balance**: {macro_obs}\n\n"
            f"*Note: All numerical values are derived deterministically from the Anuvaad Indian Food Composition Database (100g edible basis).*"
        )
        return summary

meal_parser_service = MealParserService()
