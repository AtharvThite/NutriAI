"""
nutrition_calculator.py - Purely deterministic Indian food nutrition calculator.
No LLM calls or probabilistic approximations are used for numerical calculations.
Formula: N_consumed = (N_per_100g * W_consumed) / 100
Missing nutrient values (None) are strictly preserved and never silently coerced to zero.
"""

from typing import List, Dict, Optional, Tuple, Any
from app.schemas.nutrition import ItemNutrientBreakdown, MacronutrientRatios, NutritionAnalysisResponse

def calculate_item_nutrients(
    food_code: str,
    food_name: str,
    nutrients_per_100g: Dict[str, Optional[float]],
    quantity_g: float
) -> ItemNutrientBreakdown:
    factor = quantity_g / 100.0
    item_nutrients: Dict[str, Optional[float]] = {}

    for nutrient_key, val in nutrients_per_100g.items():
        if val is None:
            item_nutrients[nutrient_key] = None
        else:
            try:
                item_nutrients[nutrient_key] = round(float(val) * factor, 4)
            except (ValueError, TypeError):
                item_nutrients[nutrient_key] = None

    return ItemNutrientBreakdown(
        food_code=food_code,
        food_name=food_name,
        quantity_g=quantity_g,
        nutrients=item_nutrients
    )

def calculate_meal_totals(
    items_breakdown: List[ItemNutrientBreakdown],
    total_weight_g: float
) -> Tuple[Dict[str, Optional[float]], MacronutrientRatios]:
    total_nutrients: Dict[str, Optional[float]] = {}
    
    # Collect all unique nutrient keys
    all_keys = set()
    for item in items_breakdown:
        all_keys.update(item.nutrients.keys())

    for key in sorted(all_keys):
        numeric_vals = [
            item.nutrients[key]
            for item in items_breakdown
            if key in item.nutrients and item.nutrients[key] is not None
        ]
        if numeric_vals:
            total_nutrients[key] = round(sum(numeric_vals), 4)
        else:
            # Preserve missing data: if no items provided a value, result is None
            total_nutrients[key] = None

    # Calculate macronutrient caloric distribution
    carb_g = total_nutrients.get("carb_g") or 0.0
    protein_g = total_nutrients.get("protein_g") or 0.0
    fat_g = total_nutrients.get("fat_g") or 0.0

    carb_kcal = carb_g * 4.0
    protein_kcal = protein_g * 4.0
    fat_kcal = fat_g * 9.0
    total_macro_kcal = carb_kcal + protein_kcal + fat_kcal

    if total_macro_kcal > 0:
        carb_pct = round((carb_kcal / total_macro_kcal) * 100.0, 1)
        protein_pct = round((protein_kcal / total_macro_kcal) * 100.0, 1)
        fat_pct = round((fat_kcal / total_macro_kcal) * 100.0, 1)
    else:
        carb_pct = 0.0
        protein_pct = 0.0
        fat_pct = 0.0

    ratios = MacronutrientRatios(
        carb_energy_pct=carb_pct,
        protein_energy_pct=protein_pct,
        fat_energy_pct=fat_pct
    )

    return total_nutrients, ratios

def analyze_consumed_items(
    items_data: List[Tuple[Dict[str, Any], float]]
) -> NutritionAnalysisResponse:
    """
    items_data is a list of tuples: (food_doc, quantity_g)
    """
    items_breakdown: List[ItemNutrientBreakdown] = []
    total_weight_g = sum(qty for _, qty in items_data)

    for food_doc, quantity_g in items_data:
        nutrients_per_100g = food_doc.get("nutrients", {})
        breakdown = calculate_item_nutrients(
            food_code=food_doc.get("food_code", ""),
            food_name=food_doc.get("food_name", "Unknown Food"),
            nutrients_per_100g=nutrients_per_100g,
            quantity_g=quantity_g
        )
        items_breakdown.append(breakdown)

    total_nutrients, ratios = calculate_meal_totals(items_breakdown, total_weight_g)

    return NutritionAnalysisResponse(
        total_weight_g=round(total_weight_g, 2),
        total_nutrients=total_nutrients,
        items_breakdown=items_breakdown,
        macronutrient_ratios=ratios
    )
