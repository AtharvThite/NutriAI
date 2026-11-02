import logging
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.core.security import decode_access_token
from app.services.food_alternative_service import FoodAlternativeService
from app.services.alternative_explanation_service import AlternativeExplanationService
from app.schemas.food_alternative import (
    FoodSearchResultItem,
    RecommendAlternativesRequest,
    RecommendAlternativesResponse,
    CompareFoodsRequest,
    CompareFoodsResponse,
    ExplainAlternativeRequest,
    ExplainAlternativeResponse,
    SaveComparisonRequest,
    SaveComparisonResponse,
    SavedComparisonItem,
    NaturalLanguageIntentRequest,
    NaturalLanguageIntentResponse
)

logger = logging.getLogger("nutriai.api.food_alternatives")
router = APIRouter(prefix="/alternatives", tags=["Smart Food Alternatives"])

security_scheme = HTTPBearer(auto_error=False)

def get_optional_user_id(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme)) -> Optional[str]:
    if not credentials or not credentials.credentials:
        return None
    try:
        payload = decode_access_token(credentials.credentials)
        if payload:
            return payload.get("sub")
    except Exception:
        pass
    return None

@router.get("/search", response_model=List[FoodSearchResultItem])
def search_foods(
    q: str = Query(..., min_length=1, description="Food name search query"),
    limit: int = Query(15, ge=1, le=50)
):
    """Search for foods that can be selected as the original food."""
    return FoodAlternativeService.search_foods(query=q, limit=limit)

@router.post("/recommend", response_model=RecommendAlternativesResponse)
def recommend_alternatives(payload: RecommendAlternativesRequest):
    """Generate smart food alternatives based on nutritional similarity and goals."""
    try:
        return FoodAlternativeService.recommend_alternatives(payload)
    except KeyError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except Exception as exc:
        logger.error("Error generating food alternatives: %s", exc, exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to generate alternatives: {str(exc)}")

@router.post("/compare", response_model=CompareFoodsResponse)
def compare_foods(payload: CompareFoodsRequest):
    """Compare multiple foods side-by-side using a common quantity and nutritional basis."""
    try:
        return FoodAlternativeService.compare_foods(payload)
    except Exception as exc:
        logger.error("Error comparing foods: %s", exc, exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Comparison failed: {str(exc)}")

@router.post("/explain", response_model=ExplainAlternativeResponse)
def explain_alternative(payload: ExplainAlternativeRequest):
    """Generate RAG-grounded clinical nutrition explanation for a selected alternative."""
    try:
        return AlternativeExplanationService.explain_alternative(payload)
    except KeyError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except Exception as exc:
        logger.error("Error explaining alternative: %s", exc, exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Explanation generation failed: {str(exc)}")

@router.post("/parse-request", response_model=NaturalLanguageIntentResponse)
def parse_natural_language_request(payload: NaturalLanguageIntentRequest):
    """Interpret natural language queries (e.g. 'find high-protein alternative to white rice') into structured criteria."""
    try:
        return FoodAlternativeService.parse_natural_language_request(payload.query)
    except Exception as exc:
        logger.error("Error parsing natural request: %s", exc)
        return NaturalLanguageIntentResponse(
            original_food_query=payload.query,
            objective="similar",
            dietary_preference="all",
            requires_clarification=True,
            clarification_message="Could not parse request. Please select a food manually."
        )

@router.get("/saved", response_model=List[SavedComparisonItem])
def get_saved_comparisons(user_id: Optional[str] = Depends(get_optional_user_id)):
    """Retrieve saved comparisons."""
    try:
        return FoodAlternativeService.get_saved_comparisons(user_id=user_id)
    except Exception as exc:
        logger.error("Error fetching saved comparisons: %s", exc)
        return []

@router.post("/saved", response_model=SaveComparisonResponse)
def save_comparison(
    payload: SaveComparisonRequest,
    user_id: Optional[str] = Depends(get_optional_user_id)
):
    """Save an interesting food comparison for later reference."""
    try:
        return FoodAlternativeService.save_comparison(payload, user_id=user_id)
    except Exception as exc:
        logger.error("Error saving comparison: %s", exc)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to save comparison: {str(exc)}")

@router.delete("/saved/{comparison_id}")
def delete_saved_comparison(
    comparison_id: str,
    user_id: Optional[str] = Depends(get_optional_user_id)
):
    """Delete a previously saved comparison."""
    deleted = FoodAlternativeService.delete_saved_comparison(comparison_id, user_id=user_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comparison not found or unauthorized")
    return {"success": True, "message": "Saved comparison deleted successfully"}
