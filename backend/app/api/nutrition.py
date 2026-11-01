from fastapi import APIRouter, HTTPException
from app.schemas.nutrition import NutritionAnalyzeRequest, NutritionAnalysisResponse
from app.services.food_service import food_service
from app.services.nutrition_calculator import analyze_consumed_items

router = APIRouter(prefix="/nutrition", tags=["Nutrition"])

@router.post("/analyze", response_model=NutritionAnalysisResponse)
def analyze_nutrition(request: NutritionAnalyzeRequest):
    items_data = []
    missing_codes = []

    for item in request.items:
        food_doc = food_service.get_food_by_code(item.food_code)
        if not food_doc:
            missing_codes.append(item.food_code)
        else:
            items_data.append((food_doc, item.quantity_g))

    if missing_codes:
        raise HTTPException(
            status_code=404,
            detail=f"The following food codes were not found in the Anuvaad database: {', '.join(missing_codes)}"
        )

    return analyze_consumed_items(items_data)
