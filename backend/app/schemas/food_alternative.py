from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class FoodSearchResultItem(BaseModel):
    food_code: str
    food_name: str
    category: str
    dietary_type: str
    nutrition_basis: str = "100g"
    energy_kcal: Optional[float] = None
    protein_g: Optional[float] = None
    carb_g: Optional[float] = None
    fat_g: Optional[float] = None
    fibre_g: Optional[float] = None
    servings_unit: Optional[str] = None

class NutrientComparisonItem(BaseModel):
    nutrient_key: str
    nutrient_name: str
    unit: str
    original_val: Optional[float] = None
    alternative_val: Optional[float] = None
    diff: Optional[float] = None
    diff_pct: Optional[float] = None
    is_higher: Optional[bool] = None
    is_compatible: bool = True

class OriginalFoodSummary(BaseModel):
    food_code: str
    food_name: str
    category: str
    dietary_type: str
    nutrition_basis: str = "100g"
    quantity_g: float = 100.0
    nutrients: Dict[str, Optional[float]]
    nutrients_per_100g: Dict[str, Optional[float]]
    servings_unit: Optional[str] = None

class AlternativeCandidate(BaseModel):
    food_code: str
    food_name: str
    category: str
    dietary_type: str
    nutrition_basis: str = "100g"
    quantity_g: float = 100.0
    nutrients: Dict[str, Optional[float]]
    nutrients_per_100g: Dict[str, Optional[float]]
    score: float = Field(..., description="Similarity or ranking score from 0 to 100")
    rank: int
    match_reason: str
    key_differences: List[str]
    comparisons: Dict[str, NutrientComparisonItem]

class RecommendAlternativesRequest(BaseModel):
    food_code: str = Field(..., description="Original food code from Anuvaad database")
    quantity_g: float = Field(100.0, ge=1.0, le=5000.0, description="Common comparison weight in grams")
    objective: str = Field("similar", description="similar | higher_protein | lower_calorie | higher_fibre | lower_carb")
    dietary_preference: Optional[str] = Field("all", description="all | Vegetarian | Vegan | Non-Vegetarian")
    category_filter: Optional[str] = Field(None, description="Optional food category to restrict search")
    limit: int = Field(6, ge=1, le=20)

class RecommendAlternativesResponse(BaseModel):
    original_food: OriginalFoodSummary
    objective: str
    quantity_g: float
    dietary_preference: str
    alternatives: List[AlternativeCandidate]
    total_candidates_analyzed: int
    explanation_available: bool = True

class CompareFoodsRequest(BaseModel):
    food_codes: List[str] = Field(..., min_length=2, max_length=5)
    quantity_g: float = Field(100.0, ge=1.0, le=5000.0)

class CompareFoodsResponse(BaseModel):
    foods: List[OriginalFoodSummary]
    comparison_matrix: List[Dict[str, Any]]
    macro_ratios: Dict[str, Dict[str, float]]
    quantity_g: float

class ExplainAlternativeRequest(BaseModel):
    original_food_code: str
    alternative_food_code: str
    objective: str = "similar"
    quantity_g: float = 100.0

class ExplainAlternativeResponse(BaseModel):
    original_food_name: str
    alternative_food_name: str
    objective: str
    explanation: str
    sources: List[Dict[str, Any]]
    is_fallback: bool
    comparison_highlights: List[str]

class NaturalLanguageIntentRequest(BaseModel):
    query: str = Field(..., min_length=3, max_length=300)

class NaturalLanguageIntentResponse(BaseModel):
    original_food_query: Optional[str] = None
    matched_food_code: Optional[str] = None
    matched_food_name: Optional[str] = None
    objective: str = "similar"
    dietary_preference: str = "all"
    comparison_criteria: List[str] = []
    requires_clarification: bool = False
    clarification_message: Optional[str] = None
    used_lora: bool = False

class SaveComparisonRequest(BaseModel):
    original_food_code: str
    alternative_food_code: str
    objective: str = "similar"
    quantity_g: float = 100.0
    notes: Optional[str] = None

class SavedComparisonItem(BaseModel):
    comparison_id: str
    user_id: Optional[str] = None
    original_food_code: str
    original_food_name: str
    original_category: str = ""
    alternative_food_code: str
    alternative_food_name: str
    alternative_category: str = ""
    objective: str
    quantity_g: float
    notes: Optional[str] = None
    created_at: str
    original_calories: Optional[float] = None
    alternative_calories: Optional[float] = None
    original_protein: Optional[float] = None
    alternative_protein: Optional[float] = None

class SaveComparisonResponse(BaseModel):
    success: bool
    comparison_id: str
    message: str
