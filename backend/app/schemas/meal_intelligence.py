from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field
from app.schemas.nutrition import NutritionAnalysisResponse

class MealMatchCandidate(BaseModel):
    food_code: str
    food_name: str
    nutrition_basis: str = "100g"
    energy_kcal: Optional[float] = None
    protein_g: Optional[float] = None
    carb_g: Optional[float] = None
    fat_g: Optional[float] = None
    fibre_g: Optional[float] = None
    servings_unit: Optional[str] = None
    match_score: Optional[float] = None

class ExtractedFoodItem(BaseModel):
    food_name: str = Field(..., description="Name of the food item")
    quantity: Optional[float] = Field(None, description="Extracted numerical quantity")
    unit: Optional[str] = Field(None, description="Extracted unit (e.g., pieces, bowl, cup, grams)")
    quantity_g: Optional[float] = Field(None, description="Weight in grams if explicitly provided or resolved")
    confidence: Optional[float] = Field(0.9, description="Confidence score of natural language extraction")
    matched_food_code: Optional[str] = Field(None, description="Matched Anuvaad food code")
    matched_food_name: Optional[str] = Field(None, description="Matched Anuvaad food name")
    match_status: str = Field("unmatched", description="Status: matched, ambiguous, not_found, unmatched")
    match_candidates: List[MealMatchCandidate] = Field(default_factory=list, description="Plausible MongoDB candidate matches")
    portion_known: bool = Field(False, description="True if verified weight in grams is available")

class ExtractedMeal(BaseModel):
    meal_type: str = Field("unspecified", description="Meal type e.g. breakfast, lunch, dinner, snack")
    items: List[ExtractedFoodItem] = Field(default_factory=list, description="Extracted food items for this meal")

class ClarificationQuestion(BaseModel):
    food_name: str
    question: str
    suggested_weight_g: Optional[float] = None
    answered: bool = False

class MealExtractionResponse(BaseModel):
    meals: List[ExtractedMeal]
    requires_clarification: bool = False
    clarification_questions: List[ClarificationQuestion] = Field(default_factory=list)
    model_used: str = "Qwen2.5-0.5B-Instruct + LoRA"

class ParseMealRequest(BaseModel):
    message: str = Field(..., min_length=2, description="Natural language meal description")

class MatchFoodsRequest(BaseModel):
    query: str = Field(..., min_length=1, description="Food name query to match against Anuvaad")
    limit: int = Field(5, ge=1, le=20)

class MatchFoodsResponse(BaseModel):
    query: str
    matches: List[MealMatchCandidate]

class UpdateSessionRequest(BaseModel):
    meals: List[ExtractedMeal]

class RAGSourceRef(BaseModel):
    document_id: str
    title: str
    snippet: Optional[str] = None

class MealIntelligenceSessionResponse(BaseModel):
    session_id: str
    raw_input: str
    status: str  # clarification_required, ready_for_calculation, calculated, saved
    model_used: str
    meals: List[ExtractedMeal]
    requires_clarification: bool
    clarification_questions: List[ClarificationQuestion]
    nutrition_analysis: Optional[NutritionAnalysisResponse] = None
    ai_summary: Optional[str] = None
    rag_sources: List[RAGSourceRef] = Field(default_factory=list)
    saved_meal_id: Optional[str] = None
    created_at: str
    updated_at: str

class SaveConfirmedMealRequest(BaseModel):
    meal_name: Optional[str] = None
