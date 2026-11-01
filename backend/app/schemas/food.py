from typing import Dict, Optional, Any
from pydantic import BaseModel, Field

class FoodItemBase(BaseModel):
    food_code: str
    food_name: str
    source: str = "Anuvaad_INDB_2024.11"
    primarysource: Optional[str] = None
    nutrition_basis: str = "100g"
    nutrients: Dict[str, Optional[float]] = Field(default_factory=dict)
    servings_unit: Optional[str] = None
    serving_nutrients: Optional[Dict[str, Optional[float]]] = None

class FoodSearchResult(BaseModel):
    food_code: str
    food_name: str
    nutrition_basis: str = "100g"
    energy_kcal: Optional[float] = None
    protein_g: Optional[float] = None
    carb_g: Optional[float] = None
    fat_g: Optional[float] = None
    fibre_g: Optional[float] = None
    servings_unit: Optional[str] = None

class FoodDetail(FoodItemBase):
    pass
