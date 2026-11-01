import logging
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, status

from app.schemas.meal_intelligence import (
    ParseMealRequest,
    MatchFoodsRequest,
    MatchFoodsResponse,
    UpdateSessionRequest,
    MealIntelligenceSessionResponse,
    SaveConfirmedMealRequest
)
from app.schemas.meal import MealResponse
from app.services.meal_parser_service import meal_parser_service
from app.services.food_matching_service import food_matching_service
from app.services.meal_intelligence_session_manager import meal_intelligence_session_manager

logger = logging.getLogger("nutriai.api.meal_intelligence")

router = APIRouter(prefix="/meal-intelligence", tags=["AI Meal Intelligence"])

@router.post("/parse", response_model=MealIntelligenceSessionResponse, status_code=status.HTTP_200_OK)
def parse_meal(request: ParseMealRequest):
    """
    Parses natural language meal descriptions using fine-tuned LoRA model (Qwen2.5-0.5B-Instruct),
    extracts food components, matches items with MongoDB Anuvaad records, and creates a draft session.
    """
    try:
        extraction = meal_parser_service.parse_meal_description(request.message)
        session = meal_intelligence_session_manager.create_session(
            raw_input=request.message,
            meals=extraction.meals,
            requires_clarification=extraction.requires_clarification,
            clarification_questions=extraction.clarification_questions,
            model_used=extraction.model_used
        )

        # If weight/portion is known and all items matched, directly calculate meal nutrition & AI summary
        if not session.requires_clarification and all(
            it.matched_food_code and it.quantity_g and it.quantity_g > 0
            for m in session.meals for it in m.items
        ):
            try:
                session = meal_intelligence_session_manager.calculate_session_nutrition(session.session_id)
            except Exception as calc_err:
                logger.warning("Direct calculation of meal nutrition deferred: %s", calc_err)

        return session
    except Exception as exc:
        logger.error("Error during meal parsing: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Meal intelligence parsing failed: {str(exc)}"
        )

@router.post("/match-foods", response_model=MatchFoodsResponse)
def match_foods(request: MatchFoodsRequest):
    """
    Matches a food query against MongoDB Anuvaad Indian Food Composition records.
    Returns ranked candidates with verified nutritional benchmarks.
    """
    matches = food_matching_service.search_anuvaad_matches(request.query, limit=request.limit)
    return MatchFoodsResponse(query=request.query, matches=matches)

@router.get("/{session_id}", response_model=MealIntelligenceSessionResponse)
def get_session(session_id: str):
    """Retrieves an active meal intelligence session."""
    session = meal_intelligence_session_manager.get_session(session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Meal intelligence session '{session_id}' not found."
        )
    return session

@router.put("/{session_id}", response_model=MealIntelligenceSessionResponse)
def update_session(session_id: str, request: UpdateSessionRequest):
    """
    Updates food items, quantities, weights, and food selections in a draft meal session.
    Re-evaluates portion clarification questions.
    """
    session = meal_intelligence_session_manager.update_session_meals(session_id, request.meals)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Meal intelligence session '{session_id}' not found."
        )
    return session

@router.post("/{session_id}/calculate", response_model=MealIntelligenceSessionResponse)
def calculate_meal_nutrition(session_id: str):
    """
    Calculates deterministic nutrition using verified MongoDB Anuvaad records and
    generates an AI Meal Summary synthesized with educational RAG context.
    """
    try:
        updated_session = meal_intelligence_session_manager.calculate_session_nutrition(session_id)
        return updated_session
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(val_err)
        )
    except Exception as exc:
        logger.error("Error calculating meal nutrition: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Calculation failed: {str(exc)}"
        )

@router.post("/{session_id}/save", response_model=MealResponse)
def save_confirmed_meal(session_id: str, request: Optional[SaveConfirmedMealRequest] = None):
    """
    Saves the confirmed, deterministically analyzed meal into the permanent MongoDB 'meals' collection.
    """
    try:
        custom_name = request.meal_name if request else None
        saved = meal_intelligence_session_manager.save_confirmed_meal(session_id, custom_name)
        return saved
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(val_err)
        )
    except Exception as exc:
        logger.error("Error saving confirmed meal: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save meal: {str(exc)}"
        )

@router.get("/evaluation/report", response_model=Dict[str, Any])
def get_evaluation_report():
    """
    Returns empirical benchmark comparing Base Model vs LoRA fine-tuned model
    on structured Indian food meal intelligence extraction.
    """
    import os, json
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    eval_file = os.path.join(base_dir, "artifacts", "experiment_results", "meal_intelligence_eval.json")
    if os.path.exists(eval_file):
        with open(eval_file, "r", encoding="utf-8") as f:
            return json.load(f)
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evaluation report not found")
