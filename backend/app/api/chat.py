import re
import logging
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException
from app.schemas.chat import ChatRequest, ChatResponse, ChatSource
from app.services.food_service import food_service
from app.services.meal_parser_service import meal_parser_service
from app.services.nutrition_calculator import analyze_consumed_items
from app.services.rag_service import (
    answer_nutrition_question,
    is_query_nutrition_related,
    FALLBACK_UNRELATED_ANSWER,
    FALLBACK_TEXT
)
from app.core.config import settings

logger = logging.getLogger("nutriai.chat")
router = APIRouter(prefix="/chat", tags=["Chat"])

STOP_WORDS = {
    "who", "what", "where", "when", "why", "how", "which", "whom", "whose",
    "the", "and", "or", "an", "a", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "can", "could", "shall", "should", "will", "would", "may", "might",
    "in", "on", "at", "to", "for", "of", "with", "by", "from", "up", "about", "into", "over", "after",
    "i", "me", "my", "myself", "we", "our", "ours", "you", "your", "yours", "he", "him", "his", "she", "her",
    "it", "its", "they", "them", "their", "this", "that", "these", "those",
    "won", "cup", "car", "tell", "give", "show", "find", "best", "good", "bad", "many", "much",
    "please", "help", "value", "values", "check", "know", "want", "some", "like", "need"
}

def detect_food_query(query: str) -> Optional[List[Dict[str, Any]]]:
    """Detects if query is asking for numerical nutrient composition of an Indian food."""
    q_lower = query.lower()
    composition_triggers = [
        "calorie", "calories", "protein", "carbs", "carbohydrate", "fat", "nutrition",
        "nutrient", "how much", "composition", "in 100g", "per 100g", "values", "macros"
    ]
    is_composition_query = any(trigger in q_lower for trigger in composition_triggers)

    # Extract potential food words by stripping common question phrases and punctuation
    cleaned = re.sub(
        r"\b(what is the|what are the|how much|calories in|protein in|fat in|nutrition in|composition of|of|for|100g|grams|in)\b",
        " ",
        q_lower
    )
    words = [
        w.strip() for w in re.findall(r"\b[a-z]{3,}\b", cleaned)
        if w.strip() not in STOP_WORDS
    ]

    if not words:
        return None

    found_foods = []
    # Try searching 2-word combinations first (e.g. "dal tadka", "paneer butter")
    for i in range(len(words) - 1):
        bigram = f"{words[i]} {words[i+1]}"
        matches = food_service.search_foods(bigram, limit=2)
        if matches:
            found_foods.extend(matches)

    # Then search single significant tokens
    for word in words:
        matches = food_service.search_foods(word, limit=2)
        if matches:
            found_foods.extend(matches)

    if not found_foods:
        return None

    # De-duplicate matches
    unique = {f.food_code: f for f in found_foods}
    # Only return food composition if composition was explicitly requested or valid food names matched
    return list(unique.values()) if is_composition_query else None

@router.post("", response_model=ChatResponse)
def chat_endpoint(request: ChatRequest):
    user_msg = request.message.strip()
    if not user_msg:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    q_lower = user_msg.lower()

    # 1. Unrelated / Out-of-Domain Detection
    if not is_query_nutrition_related(user_msg):
        logger.info("Unrelated / out-of-domain query intercepted: '%s'", user_msg)
        return ChatResponse(
            answer=FALLBACK_UNRELATED_ANSWER,
            sources=[],
            requires_clarification=False,
            intent="Out of Domain / Unrelated",
            retries=0,
            fallback=True
        )

    # 2. Check if weight is mentioned in chat: directly calculate meal nutrition and show AI summary
    has_weight = bool(re.search(r"\b\d+(?:\.\d+)?\s*(?:g|gm|gms|gram|grams|ml|kg)\b", q_lower))
    portion_vague_triggers = ["i ate", "i had", "my lunch was", "for dinner i had", "eating", "had for", "dinner:", "lunch:", "breakfast:", "dinner was", "lunch was"]
    has_vague_meal = any(t in q_lower for t in portion_vague_triggers)

    if has_weight:
        try:
            extraction = meal_parser_service.parse_meal_description(user_msg)
            items_data = []
            extracted_items_for_display = []
            chat_sources = []

            for meal in extraction.meals:
                for it in meal.items:
                    if it.matched_food_code and it.quantity_g and it.quantity_g > 0:
                        food_doc = food_service.get_food_by_code(it.matched_food_code)
                        if food_doc:
                            items_data.append((food_doc, float(it.quantity_g)))
                            extracted_items_for_display.append(it)
                            nut = food_doc.get("nutrients", {})
                            chat_sources.append(ChatSource(
                                document_id=it.matched_food_code,
                                title=f"Anuvaad: {food_doc.get('food_name')}",
                                snippet=f"Per 100g: Energy {nut.get('energy_kcal', 'N/A')} kcal | Protein {nut.get('protein_g', 'N/A')}g | Carbs {nut.get('carb_g', 'N/A')}g | Fat {nut.get('fat_g', 'N/A')}g"
                            ))

            if items_data:
                analysis = analyze_consumed_items(items_data)

                # Format breakdown table
                table_rows = []
                total_weight = sum(it.quantity_g for it in extracted_items_for_display if it.quantity_g is not None)
                total_kcal = analysis.total_nutrients.get("energy_kcal", 0.0) or 0.0
                total_prot = analysis.total_nutrients.get("protein_g", 0.0) or 0.0
                total_carb = analysis.total_nutrients.get("carb_g", 0.0) or 0.0
                total_fat = analysis.total_nutrients.get("fat_g", 0.0) or 0.0
                total_fib = analysis.total_nutrients.get("fibre_g", 0.0) or 0.0

                for b in analysis.items_breakdown:
                    nuts = b.nutrients
                    table_rows.append(
                        f"| **{b.food_name}** | {b.quantity_g}g | "
                        f"{round(nuts.get('energy_kcal', 0.0) or 0.0, 1)} kcal | "
                        f"{round(nuts.get('protein_g', 0.0) or 0.0, 1)}g | "
                        f"{round(nuts.get('carb_g', 0.0) or 0.0, 1)}g | "
                        f"{round(nuts.get('fat_g', 0.0) or 0.0, 1)}g | "
                        f"{round(nuts.get('fibre_g', 0.0) or 0.0, 1)}g |"
                    )

                table_str = (
                    "| Food Item | Portioned Weight | Energy (kcal) | Protein | Carbs | Fat | Fiber |\n"
                    "| :--- | :---: | :---: | :---: | :---: | :---: | :---: |\n" +
                    "\n".join(table_rows) + "\n" +
                    f"| **Total Meal** | **{round(total_weight, 1)}g** | "
                    f"**{round(total_kcal, 1)} kcal** | "
                    f"**{round(total_prot, 1)}g** | "
                    f"**{round(total_carb, 1)}g** | "
                    f"**{round(total_fat, 1)}g** | "
                    f"**{round(total_fib, 1)}g** |"
                )

                # Generate clean AI Summary without RAG myths or disclaimers
                ratios = analysis.macronutrient_ratios.dict()
                items_breakdown_dicts = [b.dict() for b in analysis.items_breakdown]
                meal_types = [m.meal_type.title() for m in extraction.meals if m.meal_type != "unspecified"]
                meal_name_str = " / ".join(set(meal_types)) if meal_types else "Your Meal"

                ai_summary = meal_parser_service.generate_ai_meal_summary(
                    meal_name=meal_name_str,
                    items_breakdown=items_breakdown_dicts,
                    total_nutrients=analysis.total_nutrients,
                    macronutrient_ratios=ratios
                )

                final_text = (
                    f"### 🍽️ Calculated Meal Nutrition (Anuvaad Database)\n\n"
                    f"Here is the deterministic nutritional calculation based on the weights specified in your message:\n\n"
                    f"{table_str}\n\n"
                    f"---\n\n"
                    f"{ai_summary}\n\n"
                    f"💡 *Tip: You can also manage, adjust portions, and view interactive charts in the **AI Meal Intelligence** tab.*"
                )

                return ChatResponse(
                    answer=final_text,
                    sources=chat_sources,
                    requires_clarification=False,
                    intent="Meal Nutrition Calculation",
                    retries=0,
                    fallback=False
                )
        except Exception as exc:
            logger.error("Direct meal calculation in chat failed: %s", exc, exc_info=True)

    # 3. Check if user mentions vague meal without quantities (e.g., "I had 2 rotis and dal")
    if has_vague_meal and not has_weight:
        return ChatResponse(
            answer=(
                "I identified the foods in your meal. However, standard Indian preparations vary significantly in size "
                "and oil/liquid content. To provide an accurate, deterministic nutritional calculation without fabricating numbers, "
                "please specify the weight in grams (e.g., '150g dal tadka, 60g roti'), or use the interactive Nutrition Checker."
            ),
            sources=[],
            requires_clarification=True,
            intent="Meal Clarification",
            fallback=False
        )

    # 4. Check for Food Composition Search in MongoDB
    matched_foods = detect_food_query(user_msg)

    # 5. Handle Pure or Mixed RAG
    model_provider = request.model_provider or "lora"
    rag_result = answer_nutrition_question(user_msg, model_provider=model_provider)
    rag_answer = rag_result.get("answer", "")

    # If RAG determined this was unrelated or fallback
    if rag_result.get("intent") == "Out of Domain / Unrelated" or rag_answer == FALLBACK_UNRELATED_ANSWER:
        return ChatResponse(
            answer=FALLBACK_UNRELATED_ANSWER,
            sources=[],
            requires_clarification=False,
            intent="Out of Domain / Unrelated",
            retries=0,
            fallback=True
        )

    sources = [
        ChatSource(
            document_id=s.get("document_id", "kb_doc"),
            title=s.get("title", "NutriAI Knowledge Document"),
            snippet=s.get("snippet")
        )
        for s in rag_result.get("sources", [])
    ]

    # Combine with deterministic food data if relevant
    if matched_foods:
        food_details = []
        for f in matched_foods[:3]:
            food_details.append(
                f"• **{f.food_name}** (per 100g):\n"
                f"  Energy: {f.energy_kcal or 'N/A'} kcal | Protein: {f.protein_g or 'N/A'}g | "
                f"Carbs: {f.carb_g or 'N/A'}g | Fat: {f.fat_g or 'N/A'}g | Fiber: {f.fibre_g or 'N/A'}g"
            )
        db_block = "### Verified Food Composition (from Anuvaad Database):\n" + "\n".join(food_details)

        if rag_result.get("fallback") or not rag_answer:
            final_text = (
                f"Here are the verified laboratory composition values from the Indian Food Composition Database:\n\n"
                f"{db_block}\n\n"
                f"You can add these items to the **Nutrition Checker** to calculate exact meal totals for your portion."
            )
        else:
            final_text = f"{db_block}\n\n### Nutritional Context & Guidance:\n{rag_answer}"

        return ChatResponse(
            answer=final_text,
            sources=sources,
            requires_clarification=False,
            intent="Food Composition & Knowledge",
            retries=rag_result.get("retries", 0),
            fallback=False
        )

    return ChatResponse(
        answer=rag_answer,
        sources=sources,
        requires_clarification=False,
        intent=rag_result.get("intent", "General Nutrition"),
        retries=rag_result.get("retries", 0),
        fallback=rag_result.get("fallback", False)
    )
