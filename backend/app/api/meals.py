from typing import List
from fastapi import APIRouter, HTTPException, Path, Query
from app.schemas.meal import MealCreateRequest, MealResponse
from app.services.meal_service import meal_service

router = APIRouter(prefix="/meals", tags=["Meals"])

@router.post("", response_model=MealResponse, status_code=201)
def create_meal(request: MealCreateRequest):
    try:
        return meal_service.create_meal(request)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to save meal: {str(exc)}")

@router.get("", response_model=List[MealResponse])
def get_meals(limit: int = Query(50, ge=1, le=100)):
    return meal_service.list_meals(limit=limit)

@router.get("/{meal_id}", response_model=MealResponse)
def get_meal(meal_id: str = Path(...)):
    meal = meal_service.get_meal(meal_id)
    if not meal:
        raise HTTPException(status_code=404, detail=f"Meal '{meal_id}' not found")
    return meal

@router.delete("/{meal_id}", status_code=200)
def delete_meal(meal_id: str = Path(...)):
    deleted = meal_service.delete_meal(meal_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Meal '{meal_id}' not found")
    return {"status": "success", "message": f"Meal '{meal_id}' successfully deleted"}
