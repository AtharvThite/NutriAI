from typing import List, Optional
from fastapi import APIRouter, Query, HTTPException, Path
from app.services.food_service import food_service
from app.schemas.food import FoodSearchResult, FoodDetail

router = APIRouter(prefix="/foods", tags=["Foods"])

@router.get("", response_model=List[FoodSearchResult])
def get_foods(
    skip: int = Query(0, ge=0, description="Offset for pagination"),
    limit: int = Query(50, ge=1, le=200, description="Number of items to retrieve")
):
    docs = food_service.get_foods(skip=skip, limit=limit)
    results = []
    for doc in docs:
        nutrients = doc.get("nutrients", {})
        results.append(FoodSearchResult(
            food_code=doc.get("food_code", ""),
            food_name=doc.get("food_name", ""),
            nutrition_basis=doc.get("nutrition_basis", "100g"),
            energy_kcal=nutrients.get("energy_kcal"),
            protein_g=nutrients.get("protein_g"),
            carb_g=nutrients.get("carb_g"),
            fat_g=nutrients.get("fat_g"),
            fibre_g=nutrients.get("fibre_g"),
            servings_unit=doc.get("servings_unit")
        ))
    return results

@router.get("/search", response_model=List[FoodSearchResult])
def search_foods(
    q: str = Query(..., min_length=1, description="Search term for Indian food names"),
    limit: int = Query(20, ge=1, le=100, description="Maximum search results")
):
    return food_service.search_foods(query=q, limit=limit)

@router.get("/{food_code}", response_model=FoodDetail)
def get_food(
    food_code: str = Path(..., description="Unique food code e.g. ASC001")
):
    doc = food_service.get_food_by_code(food_code)
    if not doc:
        raise HTTPException(status_code=404, detail=f"Food item '{food_code}' not found")
    return FoodDetail(**doc)
