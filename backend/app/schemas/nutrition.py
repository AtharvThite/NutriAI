from typing import List, Dict, Optional
from pydantic import BaseModel, Field

class MealItemInput(BaseModel):
    food_code: str = Field(..., description="Unique food code e.g. ASC001")
    quantity_g: float = Field(..., gt=0, description="Consumed weight in grams")

class NutritionAnalyzeRequest(BaseModel):
    items: List[MealItemInput] = Field(..., min_length=1, description="List of consumed food items with weights in grams")

class ItemNutrientBreakdown(BaseModel):
    food_code: str
    food_name: str
    quantity_g: float
    nutrients: Dict[str, Optional[float]]

class MacronutrientRatios(BaseModel):
    carb_energy_pct: float
    protein_energy_pct: float
    fat_energy_pct: float

class NutritionAnalysisResponse(BaseModel):
    total_weight_g: float
    total_nutrients: Dict[str, Optional[float]]
    items_breakdown: List[ItemNutrientBreakdown]
    macronutrient_ratios: MacronutrientRatios
