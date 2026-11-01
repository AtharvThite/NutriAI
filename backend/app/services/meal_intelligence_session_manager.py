import uuid
import logging
from datetime import datetime
from typing import Dict, Optional, List, Tuple, Any

from app.schemas.meal_intelligence import (
    ExtractedMeal,
    ExtractedFoodItem,
    ClarificationQuestion,
    MealIntelligenceSessionResponse,
    RAGSourceRef
)
from app.schemas.nutrition import NutritionAnalysisResponse
from app.schemas.meal import MealCreateRequest, MealResponse
from app.services.food_service import food_service
from app.services.nutrition_calculator import analyze_consumed_items
from app.services.meal_service import meal_service
from app.services.rag_service import get_retriever, initialize_rag
from app.services.food_matching_service import food_matching_service

logger = logging.getLogger("nutriai.meal_session_manager")

class MealIntelligenceSessionManager:
    def __init__(self):
        # In-memory session dictionary: session_id -> dict
        self._sessions: Dict[str, Dict[str, Any]] = {}

    def create_session(
        self,
        raw_input: str,
        meals: List[ExtractedMeal],
        requires_clarification: bool,
        clarification_questions: List[ClarificationQuestion],
        model_used: str
    ) -> MealIntelligenceSessionResponse:
        session_id = f"mis_{uuid.uuid4().hex[:10]}"
        now = datetime.utcnow().isoformat() + "Z"

        status = "clarification_required" if requires_clarification else "ready_for_calculation"

        session_data = {
            "session_id": session_id,
            "raw_input": raw_input,
            "status": status,
            "model_used": model_used,
            "meals": meals,
            "requires_clarification": requires_clarification,
            "clarification_questions": clarification_questions,
            "nutrition_analysis": None,
            "ai_summary": None,
            "rag_sources": [],
            "saved_meal_id": None,
            "created_at": now,
            "updated_at": now
        }
        self._sessions[session_id] = session_data
        return MealIntelligenceSessionResponse(**session_data)

    def get_session(self, session_id: str) -> Optional[MealIntelligenceSessionResponse]:
        data = self._sessions.get(session_id)
        if not data:
            return None
        return MealIntelligenceSessionResponse(**data)

    def update_session_meals(
        self,
        session_id: str,
        meals: List[ExtractedMeal]
    ) -> Optional[MealIntelligenceSessionResponse]:
        session_data = self._sessions.get(session_id)
        if not session_data:
            return None

        # Re-evaluate portions and matches
        all_items = []
        for meal in meals:
            for item in meal.items:
                # If quantity_g was provided, mark portion known
                if item.quantity_g is not None and item.quantity_g > 0:
                    item.portion_known = True
                else:
                    item.portion_known = False

                # Ensure matched food details
                if item.matched_food_code and not item.matched_food_name:
                    doc = food_service.get_food_by_code(item.matched_food_code)
                    if doc:
                        item.matched_food_name = doc.get("food_name")
                        item.match_status = "matched"

                all_items.append(item)

        # Recompute clarification questions
        questions = food_matching_service.generate_clarification_questions(all_items)
        requires_clarification = len(questions) > 0

        session_data["meals"] = meals
        session_data["requires_clarification"] = requires_clarification
        session_data["clarification_questions"] = questions
        session_data["status"] = "clarification_required" if requires_clarification else "ready_for_calculation"
        session_data["updated_at"] = datetime.utcnow().isoformat() + "Z"

        return MealIntelligenceSessionResponse(**session_data)

    def calculate_session_nutrition(
        self,
        session_id: str
    ) -> MealIntelligenceSessionResponse:
        session_data = self._sessions.get(session_id)
        if not session_data:
            raise ValueError(f"Session '{session_id}' not found.")

        meals: List[ExtractedMeal] = session_data["meals"]
        items_data: List[Tuple[Dict[str, Any], float]] = []

        unresolved_items = []
        for meal in meals:
            for item in meal.items:
                if not item.matched_food_code:
                    unresolved_items.append(f"'{item.food_name}' has no matched Anuvaad food record.")
                    continue
                if item.quantity_g is None or item.quantity_g <= 0:
                    unresolved_items.append(f"'{item.food_name}' is missing weight in grams.")
                    continue

                food_doc = food_service.get_food_by_code(item.matched_food_code)
                if not food_doc:
                    unresolved_items.append(f"Food code '{item.matched_food_code}' not found in database.")
                    continue

                items_data.append((food_doc, float(item.quantity_g)))

        if unresolved_items:
            raise ValueError("Cannot calculate nutrition: " + "; ".join(unresolved_items))

        if not items_data:
            raise ValueError("No valid food items available for nutrition calculation.")

        # 1. Deterministic Calculation via nutrition_calculator
        analysis: NutritionAnalysisResponse = analyze_consumed_items(items_data)

        # 2. Retrieve Educational RAG Context
        rag_snippets: List[str] = []
        rag_sources: List[RAGSourceRef] = []
        try:
            retriever = get_retriever()
            if not retriever:
                initialize_rag()
                retriever = get_retriever()

            if retriever:
                food_names_str = ", ".join([doc.get("food_name", "") for doc, _ in items_data[:4]])
                query = f"Nutritional characteristics and health role of {food_names_str}"
                docs = retriever.invoke(query)
                for d in docs[:3]:
                    doc_id = d.metadata.get("id") or d.metadata.get("document_id") or "rag_doc"
                    title = d.metadata.get("title") or d.metadata.get("source") or "NutriAI Knowledge Document"
                    content_clean = d.page_content.strip()
                    if "LIMITATIONS AND UNCERTAINTY" in content_clean:
                        content_clean = content_clean.split("LIMITATIONS AND UNCERTAINTY")[0].strip()
                    if not content_clean or len(content_clean) < 30:
                        continue
                    rag_snippets.append(content_clean[:300])
                    rag_sources.append(RAGSourceRef(
                        document_id=doc_id,
                        title=title,
                        snippet=content_clean[:180] + "..."
                    ))
        except Exception as e:
            logger.warning("RAG retrieval for meal intelligence summary was skipped: %s", e)

        # 3. Generate AI Meal Summary
        from app.services.meal_parser_service import meal_parser_service
        meal_titles = [m.meal_type.title() for m in meals if m.meal_type != "unspecified"]
        meal_name = " / ".join(set(meal_titles)) if meal_titles else "Meal"

        items_breakdown_dicts = [b.dict() for b in analysis.items_breakdown]
        ratios_dict = analysis.macronutrient_ratios.dict()

        ai_summary = meal_parser_service.generate_ai_meal_summary(
            meal_name=meal_name,
            items_breakdown=items_breakdown_dicts,
            total_nutrients=analysis.total_nutrients,
            macronutrient_ratios=ratios_dict,
            rag_context_snippets=rag_snippets
        )

        session_data["nutrition_analysis"] = analysis
        session_data["ai_summary"] = ai_summary
        session_data["rag_sources"] = rag_sources
        session_data["status"] = "calculated"
        session_data["updated_at"] = datetime.utcnow().isoformat() + "Z"

        return MealIntelligenceSessionResponse(**session_data)

    def save_confirmed_meal(
        self,
        session_id: str,
        custom_name: Optional[str] = None
    ) -> MealResponse:
        session_data = self._sessions.get(session_id)
        if not session_data:
            raise ValueError(f"Session '{session_id}' not found.")

        if not session_data.get("nutrition_analysis"):
            raise ValueError("Meal cannot be saved before deterministic nutrition calculation.")

        meals: List[ExtractedMeal] = session_data["meals"]
        meal_items_input = []
        for meal in meals:
            for it in meal.items:
                if it.matched_food_code and it.quantity_g and it.quantity_g > 0:
                    meal_items_input.append({
                        "food_code": it.matched_food_code,
                        "quantity_g": it.quantity_g
                    })

        if not meal_items_input:
            raise ValueError("No verified food items with valid gram weights to save.")

        if custom_name and custom_name.strip():
            name = custom_name.strip()
        else:
            types = [m.meal_type.title() for m in meals if m.meal_type != "unspecified"]
            name = f"AI Meal ({', '.join(set(types))})" if types else "AI Analyzed Meal"

        req = MealCreateRequest(meal_name=name, items=meal_items_input)
        saved_meal = meal_service.create_meal(req)

        session_data["saved_meal_id"] = saved_meal.meal_id
        session_data["status"] = "saved"
        session_data["updated_at"] = datetime.utcnow().isoformat() + "Z"

        return saved_meal

meal_intelligence_session_manager = MealIntelligenceSessionManager()
