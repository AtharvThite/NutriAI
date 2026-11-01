from typing import List, Dict, Optional
from datetime import datetime
from pydantic import BaseModel, Field
from app.schemas.nutrition import MealItemInput, ItemNutrientBreakdown, MacronutrientRatios

class MealCreateRequest(BaseModel):
    meal_name: str = Field(..., min_length=1, max_length=100, description="User-friendly meal name e.g. Breakfast, Lunch")
    items: List[MealItemInput] = Field(..., min_length=1, description="List of meal items with weights in grams")

class MealResponse(BaseModel):
    meal_id: str
    meal_name: str
    total_weight_g: float
    items: List[ItemNutrientBreakdown]
    total_nutrients: Dict[str, Optional[float]]
    macronutrient_ratios: MacronutrientRatios
    created_at: str
