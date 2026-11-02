import os
import re
import logging
from typing import List, Dict, Any, Optional

from app.core.database import get_foods_collection
from app.services.food_similarity_service import FoodSimilarityService
from app.services.rag_service import get_retriever, initialize_rag, is_ready, generate_with_groq
from app.schemas.food_alternative import ExplainAlternativeRequest, ExplainAlternativeResponse

logger = logging.getLogger("nutriai.alternative_explanation_service")

# Mapping of recommendation objectives to relevant knowledge base search queries
OBJECTIVE_KNOWLEDGE_QUERIES = {
    "higher_protein": "protein sources amino acid bioavailability pulses legumes biological value Indian diet",
    "lower_calorie": "energy density caloric balance satiety weight management portion control",
    "higher_fibre": "dietary fiber soluble insoluble roughage glycemic response whole grains digestion",
    "lower_carb": "complex carbohydrates glycemic index starch blood glucose insulin response",
    "similar": "balanced diet food substitution nutritional equivalents Indian food habits portion"
}

class AlternativeExplanationService:

    @staticmethod
    def _read_direct_kb_fallback(objective: str) -> List[Dict[str, Any]]:
        """Fallback to read direct knowledge base files if vector store is indexing."""
        kb_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "knowledge_base")
        file_map = {
            "higher_protein": ["protein.txt", "pulses_and_legumes.txt", "vegetarian_nutrition.txt"],
            "higher_fibre": ["dietary_fiber.txt", "whole_grains.txt", "fruits_and_vegetables.txt"],
            "lower_calorie": ["macronutrients.txt", "balanced_diet.txt"],
            "lower_carb": ["carbohydrates.txt", "whole_grains.txt"],
            "similar": ["balanced_diet.txt", "indian_food_habits.txt"]
        }

        target_files = file_map.get(objective, ["balanced_diet.txt", "macronutrients.txt"])
        docs = []
        for fn in target_files:
            fp = os.path.join(kb_dir, fn)
            if os.path.exists(fp):
                try:
                    with open(fp, "r", encoding="utf-8") as f:
                        content = f.read(1500)
                        title = fn.replace(".txt", "").replace("_", " ").title()
                        docs.append({
                            "document_id": fn,
                            "title": title,
                            "snippet": content[:350] + "...",
                            "full_text": content
                        })
                except Exception as e:
                    logger.warning("Error reading knowledge file %s: %s", fn, e)
        return docs

    @staticmethod
    def explain_alternative(req: ExplainAlternativeRequest) -> ExplainAlternativeResponse:
        col = get_foods_collection()
        if col is None:
            raise ValueError("Foods database collection is not available.")

        orig_doc = col.find_one({"food_code": req.original_food_code}, {"_id": 0})
        alt_doc = col.find_one({"food_code": req.alternative_food_code}, {"_id": 0})

        if not orig_doc:
            raise KeyError(f"Original food code '{req.original_food_code}' not found.")
        if not alt_doc:
            raise KeyError(f"Alternative food code '{req.alternative_food_code}' not found.")

        orig_name = orig_doc.get("food_name", "Original Food")
        alt_name = alt_doc.get("food_name", "Alternative Food")

        orig_n = orig_doc.get("nutrients", {})
        alt_n = alt_doc.get("nutrients", {})

        # Compute scaled comparison metrics for exact quantities
        factor = req.quantity_g / 100.0
        
        orig_cal = round(float(orig_n.get("energy_kcal", 0.0) or 0.0) * factor, 1) if orig_n.get("energy_kcal") is not None else None
        alt_cal = round(float(alt_n.get("energy_kcal", 0.0) or 0.0) * factor, 1) if alt_n.get("energy_kcal") is not None else None

        orig_pro = round(float(orig_n.get("protein_g", 0.0) or 0.0) * factor, 1) if orig_n.get("protein_g") is not None else None
        alt_pro = round(float(alt_n.get("protein_g", 0.0) or 0.0) * factor, 1) if alt_n.get("protein_g") is not None else None

        orig_carb = round(float(orig_n.get("carb_g", 0.0) or 0.0) * factor, 1) if orig_n.get("carb_g") is not None else None
        alt_carb = round(float(alt_n.get("carb_g", 0.0) or 0.0) * factor, 1) if alt_n.get("carb_g") is not None else None

        orig_fat = round(float(orig_n.get("fat_g", 0.0) or 0.0) * factor, 1) if orig_n.get("fat_g") is not None else None
        alt_fat = round(float(alt_n.get("fat_g", 0.0) or 0.0) * factor, 1) if alt_n.get("fat_g") is not None else None

        orig_fib = round(float(orig_n.get("fibre_g", 0.0) or 0.0) * factor, 1) if orig_n.get("fibre_g") is not None else None
        alt_fib = round(float(alt_n.get("fibre_g", 0.0) or 0.0) * factor, 1) if alt_n.get("fibre_g") is not None else None

        # Build comparison highlights
        highlights: List[str] = []
        if orig_pro is not None and alt_pro is not None:
            pro_d = round(alt_pro - orig_pro, 1)
            if abs(pro_d) >= 0.2:
                word = "higher" if pro_d > 0 else "lower"
                highlights.append(f"Protein is {abs(pro_d)}g {word} in {alt_name} ({alt_pro}g vs {orig_pro}g)")

        if orig_cal is not None and alt_cal is not None:
            cal_d = round(alt_cal - orig_cal, 0)
            if abs(cal_d) >= 5:
                word = "higher" if cal_d > 0 else "fewer"
                highlights.append(f"Energy has {abs(int(cal_d))} {word} calories ({alt_cal} kcal vs {orig_cal} kcal)")

        if orig_fib is not None and alt_fib is not None:
            fib_d = round(alt_fib - orig_fib, 1)
            if abs(fib_d) >= 0.2:
                word = "more" if fib_d > 0 else "less"
                highlights.append(f"Dietary fibre provides {abs(fib_d)}g {word} roughage ({alt_fib}g vs {orig_fib}g)")

        if orig_carb is not None and alt_carb is not None:
            carb_d = round(alt_carb - orig_carb, 1)
            if abs(carb_d) >= 1.0:
                word = "higher" if carb_d > 0 else "lower"
                highlights.append(f"Carbohydrates are {abs(carb_d)}g {word} ({alt_carb}g vs {orig_carb}g)")

        # 1. RAG Retrieval from Vector Store
        if not is_ready():
            try:
                initialize_rag()
            except Exception as e:
                logger.warning("RAG initialization in explanation failed: %s", e)

        sources: List[Dict[str, Any]] = []
        context_chunks: List[str] = []
        is_fallback = False

        retriever = get_retriever()
        search_query = f"{orig_name} to {alt_name} {OBJECTIVE_KNOWLEDGE_QUERIES.get(req.objective, 'nutrition composition')}"

        if retriever is not None:
            try:
                retrieved_docs = retriever.invoke(search_query)
                seen_ids = set()
                for d in retrieved_docs:
                    doc_id = d.metadata.get("document_id", "knowledge")
                    title = d.metadata.get("title", doc_id.replace("_", " ").title())
                    if doc_id not in seen_ids:
                        seen_ids.add(doc_id)
                        sources.append({
                            "document_id": doc_id,
                            "title": title,
                            "snippet": d.page_content[:240] + "..."
                        })
                    context_chunks.append(d.page_content)
            except Exception as exc:
                logger.warning("Vector retrieval error: %s. Using direct KB fallback.", exc)

        if not sources:
            # Fallback to direct knowledge files
            fb_docs = AlternativeExplanationService._read_direct_kb_fallback(req.objective)
            for d in fb_docs:
                sources.append({
                    "document_id": d["document_id"],
                    "title": d["title"],
                    "snippet": d["snippet"]
                })
                context_chunks.append(d["full_text"])

        if not sources:
            is_fallback = True

        # Synthesize structured clinical explanation
        # Rule: Nutritional values MUST come from actual MongoDB numbers, never invented by LLM!
        context_text = "\n---\n".join(context_chunks[:3])
        objective_label = req.objective.replace("_", " ").title()

        explanation_prompt = f"""You are NutriAI, an evidence-based Indian clinical nutritionist.
Explain why '{alt_name}' is a relevant '{objective_label}' alternative to '{orig_name}' for a serving of {req.quantity_g}g.

GROUND TRUTH NUTRIENT COMPARISON ({req.quantity_g}g serving):
- Original ({orig_name}): Calories={orig_cal} kcal, Protein={orig_pro}g, Carbs={orig_carb}g, Fat={orig_fat}g, Fibre={orig_fib}g
- Alternative ({alt_name}): Calories={alt_cal} kcal, Protein={alt_pro}g, Carbs={alt_carb}g, Fat={alt_fat}g, Fibre={alt_fib}g

KNOWLEDGE BASE CONTEXT:
{context_text}

INSTRUCTIONS:
1. Explain WHY the alternative is nutritionally relevant for the '{objective_label}' objective using the EXACT ground truth numbers above.
2. Discuss the physiological roles of the differing nutrients based on the knowledge context.
3. Provide practical culinary considerations for Indian meal preparation.
4. Do NOT invent new numbers. Do NOT claim unrealistic medical cures.
Keep the response structured under 4 sections: Nutritional Relevance, Nutrient Shift, Metabolic Role, and Practical Guidance."""

        explanation = ""

        # Try Groq or local LLM for drafting
        try:
            explanation = generate_with_groq(explanation_prompt)
        except Exception as e:
            logger.info("Groq drafting skipped or failed (%s). Generating deterministic clinical synthesis.", e)
            # Deterministic, evidence-backed clinical synthesis
            explanation = (
                f"### 1. Nutritional Relevance\n"
                f"When evaluating **{alt_name}** as an alternative to **{orig_name}** ({req.quantity_g}g serving basis), "
                f"the primary objective is **{objective_label}**. In this comparison, {alt_name} delivers "
                f"**{alt_cal if alt_cal is not None else 'N/A'} kcal** and **{alt_pro if alt_pro is not None else 'N/A'}g of protein**, "
                f"compared to **{orig_cal if orig_cal is not None else 'N/A'} kcal** and **{orig_pro if orig_pro is not None else 'N/A'}g of protein** in {orig_name}.\n\n"
                f"### 2. Verified Nutrient Shifts ({req.quantity_g}g Serving)\n"
                f"• **Energy**: {alt_cal} kcal vs {orig_cal} kcal ({'+' if (alt_cal or 0) >= (orig_cal or 0) else ''}{round((alt_cal or 0) - (orig_cal or 0), 1)} kcal)\n"
                f"• **Protein**: {alt_pro}g vs {orig_pro}g ({'+' if (alt_pro or 0) >= (orig_pro or 0) else ''}{round((alt_pro or 0) - (orig_pro or 0), 1)}g)\n"
                f"• **Carbohydrates**: {alt_carb}g vs {orig_carb}g ({'+' if (alt_carb or 0) >= (orig_carb or 0) else ''}{round((alt_carb or 0) - (orig_carb or 0), 1)}g)\n"
                f"• **Dietary Fibre**: {alt_fib}g vs {orig_fib}g ({'+' if (alt_fib or 0) >= (orig_fib or 0) else ''}{round((alt_fib or 0) - (orig_fib or 0), 1)}g)\n\n"
                f"### 3. Metabolic & Clinical Evidence\n"
                f"According to NutriAI guidelines, macro shifts alter glycemic response, digestive transit time, and satiety signaling. "
                f"Higher dietary fibre slows gastric emptying, blunts postprandial glucose spikes, and promotes colonic short-chain fatty acid (SCFA) synthesis. "
                f"Higher protein density provides essential amino acids required for muscle protein synthesis and enzymatic repair.\n\n"
                f"### 4. Culinary Considerations\n"
                f"When substituting {alt_name} for {orig_name} in Indian meal planning, consider differences in cooking hydration, "
                f"cooking duration, and spice absorption. Monitor added fats (ghee/oil) during preparation to preserve the intended caloric profile."
            )

        return ExplainAlternativeResponse(
            original_food_name=orig_name,
            alternative_food_name=alt_name,
            objective=req.objective,
            explanation=explanation,
            sources=sources,
            is_fallback=is_fallback,
            comparison_highlights=highlights
        )
