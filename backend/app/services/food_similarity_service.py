import re
import math
import logging
from typing import Dict, List, Any, Optional, Tuple
from app.schemas.food_alternative import (
    NutrientComparisonItem,
    OriginalFoodSummary,
    AlternativeCandidate
)

logger = logging.getLogger("nutriai.food_similarity_service")

# Nutrient display metadata: name, unit, standard normalizer for 100g
NUTRIENT_METADATA = {
    "energy_kcal": {"name": "Energy", "unit": "kcal", "norm": 400.0, "weight": 1.0},
    "protein_g": {"name": "Protein", "unit": "g", "norm": 30.0, "weight": 1.5},
    "carb_g": {"name": "Carbohydrates", "unit": "g", "norm": 80.0, "weight": 1.0},
    "fat_g": {"name": "Total Fat", "unit": "g", "norm": 30.0, "weight": 1.0},
    "fibre_g": {"name": "Dietary Fibre", "unit": "g", "norm": 15.0, "weight": 1.2},
    "freesugar_g": {"name": "Free Sugar", "unit": "g", "norm": 25.0, "weight": 0.5},
    "calcium_mg": {"name": "Calcium", "unit": "mg", "norm": 300.0, "weight": 0.4},
    "iron_mg": {"name": "Iron", "unit": "mg", "norm": 8.0, "weight": 0.4},
    "potassium_mg": {"name": "Potassium", "unit": "mg", "norm": 600.0, "weight": 0.3},
    "sodium_mg": {"name": "Sodium", "unit": "mg", "norm": 500.0, "weight": 0.3},
    "vitc_mg": {"name": "Vitamin C", "unit": "mg", "norm": 40.0, "weight": 0.3},
}

class FoodSimilarityService:

    @staticmethod
    def classify_dietary_type(food_name: str) -> str:
        """Deterministically classifies food into Non-Vegetarian, Vegetarian, or Vegan."""
        n = food_name.lower()
        if re.search(r'\b(chicken|murgh|fish|machli|mutton|gosht|lamb|pork|beef|prawn|prawns|crab|shrimp|meat|keema|egg|eggs|ande)\b', n) and not re.search(r'\b(eggplant|eggless)\b', n):
            return "Non-Vegetarian"
        if re.search(r'\b(milk|curd|dahi|paneer|cheese|butter|ghee|cream|lassi|chaas|kheer|rabri|khoa|mawa|dairy)\b', n):
            return "Vegetarian"
        return "Vegan"

    @staticmethod
    def classify_food_category(food_name: str, dietary_type: str = "") -> str:
        """Classifies food into one of 8 standardized culinary categories."""
        n = food_name.lower()
        if re.search(r'\b(rice|chawal|bhaat|roti|chapati|phulka|paratha|parantha|puri|poori|naan|kulcha|khichdi|pulao|biryani|poha|upma|oats|wheat|atta|maida|suji|semolina|dalia|bajra|jowar|ragi|millet|cereal|bread|noodle|pasta|corn)\b', n):
            return "Grains & Cereals"
        if re.search(r'\b(dal|daal|lentil|chana|chole|rajma|moong|masoor|urad|toor|arhar|lobia|soy|soya|soybean|chickpea|pulse|pulses|legume|sprout|sprouts|besan|sattu)\b', n):
            return "Pulses & Legumes"
        if re.search(r'\b(milk|curd|dahi|paneer|cheese|lassi|chaas|yogurt|buttermilk|cream|tofu)\b', n):
            return "Dairy & Alternatives"
        if dietary_type == "Non-Vegetarian" or re.search(r'\b(chicken|fish|mutton|egg|meat|prawn)\b', n):
            return "Meat, Poultry & Eggs"
        if re.search(r'\b(sabzi|sabji|curry|palak|methi|bhindi|gobi|aloo|baingan|brinjal|eggplant|tomato|onion|carrot|capsicum|mushroom|gourd|salad|vegetable|leafy)\b', n):
            return "Vegetables & Curries"
        if re.search(r'\b(apple|banana|mango|orange|papaya|guava|fruit|fruits|berry|grapes)\b', n):
            return "Fruits"
        if re.search(r'\b(tea|chai|coffee|juice|soup|beverage|drink|water|sherbet)\b', n):
            return "Beverages"
        return "Traditional Dishes & Snacks"

    @staticmethod
    def scale_nutrients(nutrients: Dict[str, Any], quantity_g: float) -> Dict[str, Optional[float]]:
        """Formula: Nutrient consumed = (Nutrient per 100 g * Quantity in g) / 100.
        Preserves None values explicitly."""
        factor = quantity_g / 100.0
        scaled = {}
        for k, v in nutrients.items():
            if v is None:
                scaled[k] = None
            else:
                try:
                    scaled[k] = round(float(v) * factor, 3)
                except (ValueError, TypeError):
                    scaled[k] = None
        return scaled

    @staticmethod
    def build_comparison_item(
        key: str,
        orig_val: Optional[float],
        alt_val: Optional[float]
    ) -> NutrientComparisonItem:
        meta = NUTRIENT_METADATA.get(key, {"name": key.replace("_", " ").title(), "unit": ""})
        if orig_val is None or alt_val is None:
            return NutrientComparisonItem(
                nutrient_key=key,
                nutrient_name=meta["name"],
                unit=meta["unit"],
                original_val=orig_val,
                alternative_val=alt_val,
                diff=None,
                diff_pct=None,
                is_higher=None,
                is_compatible=False
            )

        diff = round(alt_val - orig_val, 2)
        diff_pct = None
        if orig_val > 0.001:
            diff_pct = round((diff / orig_val) * 100.0, 1)

        return NutrientComparisonItem(
            nutrient_key=key,
            nutrient_name=meta["name"],
            unit=meta["unit"],
            original_val=round(orig_val, 2),
            alternative_val=round(alt_val, 2),
            diff=diff,
            diff_pct=diff_pct,
            is_higher=diff > 0.05,
            is_compatible=True
        )

    @staticmethod
    def calculate_candidate_score_and_reasons(
        orig_doc: Dict[str, Any],
        cand_doc: Dict[str, Any],
        objective: str
    ) -> Tuple[float, str, List[str]]:
        """
        Calculates a transparent recommendation score (0 - 100) and human-readable reasons
        based only on normalized compatible nutrients per 100g.
        """
        orig_n = orig_doc.get("nutrients", {})
        cand_n = cand_doc.get("nutrients", {})

        orig_diet = FoodSimilarityService.classify_dietary_type(orig_doc.get("food_name", ""))
        orig_cat = FoodSimilarityService.classify_food_category(orig_doc.get("food_name", ""), orig_diet)

        cand_diet = FoodSimilarityService.classify_dietary_type(cand_doc.get("food_name", ""))
        cand_cat = FoodSimilarityService.classify_food_category(cand_doc.get("food_name", ""), cand_diet)

        same_category = (orig_cat == cand_cat)
        same_diet = (orig_diet == cand_diet)

        # Baseline macro values per 100g
        orig_cal = orig_n.get("energy_kcal")
        cand_cal = cand_n.get("energy_kcal")

        orig_pro = orig_n.get("protein_g")
        cand_pro = cand_n.get("protein_g")

        orig_carb = orig_n.get("carb_g")
        cand_carb = cand_n.get("carb_g")

        orig_fat = orig_n.get("fat_g")
        cand_fat = cand_n.get("fat_g")

        orig_fib = orig_n.get("fibre_g")
        cand_fib = cand_n.get("fibre_g")

        reasons: List[str] = []
        match_reason = ""
        score = 50.0

        if objective == "higher_protein":
            if orig_pro is None or cand_pro is None:
                return 0.0, "Missing protein data", []
            pro_diff = cand_pro - orig_pro
            is_plant_swap = (orig_diet == "Non-Vegetarian" and cand_diet in ("Vegetarian", "Vegan"))

            if pro_diff <= 0.1:
                if is_plant_swap and cand_pro >= 7.5:
                    reasons.append(f"High-protein plant alternative offering {round(cand_pro, 1)}g protein per 100g")
                    score = 45.0 + min(cand_pro * 2.8, 40.0) + (10.0 if same_category else 3.0)
                    match_reason = f"Top plant protein source providing {round(cand_pro, 1)}g protein per 100g"
                else:
                    return 0.0, "Not higher in protein", []
            else:
                pro_pct = (pro_diff / max(orig_pro, 0.1)) * 100.0
                reasons.append(f"+{round(pro_diff, 1)}g more protein ({round(pro_pct, 0):+0.0f}%) per 100g")
                
                # Score formula: base 45 + protein gain bonus + category relevance
                gain_score = min(pro_diff * 4.0, 30.0)
                ratio_score = min(pro_pct * 0.15, 15.0)
                cat_bonus = 10.0 if same_category else 3.0
                score = 45.0 + gain_score + ratio_score + cat_bonus
                match_reason = f"High-protein alternative offering +{round(pro_diff, 1)}g extra protein per 100g"

            if cand_cal is not None and orig_cal is not None:
                cal_diff = cand_cal - orig_cal
                if cal_diff < 0:
                    reasons.append(f"{abs(round(cal_diff, 0))} fewer calories per 100g")
                    score += 5.0
                elif cal_diff > 120:
                    score -= 8.0  # slight penalty for very high calorie density

        elif objective == "lower_calorie":
            if orig_cal is None or cand_cal is None:
                return 0.0, "Missing energy data", []
            cal_diff = orig_cal - cand_cal
            if cal_diff <= 5.0:
                return 0.0, "Not significantly lower in calories", []

            cal_pct = (cal_diff / max(orig_cal, 1.0)) * 100.0
            reasons.append(f"-{round(cal_diff, 0)} fewer calories (-{round(cal_pct, 0):.0f}%) per 100g")

            # Avoid recommending empty low-calorie foods with zero protein/fibre to replace a substantial staple
            protein_retention = (cand_pro or 0.0) / max(orig_pro or 1.0, 0.1)
            cat_bonus = 15.0 if same_category else 5.0

            savings_score = min(cal_pct * 0.6, 35.0)
            retention_bonus = min(protein_retention * 10.0, 15.0)
            score = 35.0 + savings_score + retention_bonus + cat_bonus

            match_reason = f"Calorie-reduced alternative saving {round(cal_diff, 0)} kcal (-{round(cal_pct, 0):.0f}%)"

        elif objective == "higher_fibre":
            cand_fib_val = cand_fib or 0.0
            orig_fib_val = orig_fib or 0.0
            fib_diff = cand_fib_val - orig_fib_val
            if fib_diff <= 0.2:
                return 0.0, "Not higher in dietary fibre", []

            reasons.append(f"+{round(fib_diff, 1)}g more dietary fibre per 100g")
            gain_score = min(fib_diff * 8.0, 35.0)
            cat_bonus = 15.0 if same_category else 5.0
            score = 45.0 + gain_score + cat_bonus

            match_reason = f"Higher fibre profile offering +{round(fib_diff, 1)}g more roughage"

        elif objective == "lower_carb":
            if orig_carb is None or cand_carb is None:
                return 0.0, "Missing carbohydrate data", []
            carb_diff = orig_carb - cand_carb
            if carb_diff <= 2.0:
                return 0.0, "Not significantly lower in carbohydrates", []

            carb_pct = (carb_diff / max(orig_carb, 1.0)) * 100.0
            reasons.append(f"-{round(carb_diff, 1)}g lower carbohydrates (-{round(carb_pct, 0):.0f}%)")
            savings_score = min(carb_pct * 0.5, 30.0)
            cat_bonus = 15.0 if same_category else 5.0
            score = 45.0 + savings_score + cat_bonus

            match_reason = f"Low-carb alternative with {round(carb_diff, 1)}g fewer carbohydrates"

        else:  # "similar" - Overall nutritional proximity
            # Weighted normalized Euclidean distance
            dist_sq = 0.0
            total_w = 0.0

            for k in ["energy_kcal", "protein_g", "carb_g", "fat_g", "fibre_g"]:
                ov = orig_n.get(k)
                cv = cand_n.get(k)
                if ov is not None and cv is not None:
                    norm = NUTRIENT_METADATA[k]["norm"]
                    w = NUTRIENT_METADATA[k]["weight"]
                    diff_norm = (cv - ov) / norm
                    dist_sq += w * (diff_norm ** 2)
                    total_w += w

            if total_w < 1.0:
                return 0.0, "Insufficient compatible nutrients", []

            dist = math.sqrt(dist_sq / total_w)
            # Continuous decay: dist=0 -> 99.0%, dist=0.05 -> ~92%, dist=0.15 -> ~79%
            base_sim = 99.0 * math.exp(-1.5 * dist)
            cat_factor = 1.0 if same_category else 0.88
            score = base_sim * cat_factor

            reasons.append(f"Balanced nutritional profile closely matching {orig_doc.get('food_name', 'original')}")
            if same_category:
                reasons.append(f"Belongs to the same culinary group: {cand_cat}")
            match_reason = f"{round(score, 1):.1f}% nutritional similarity in {cand_cat}"

        # Additional highlights for common nutrients
        if cand_fib is not None and cand_fib > 2.0 and "fibre" not in " ".join(reasons):
            reasons.append(f"Provides {round(cand_fib, 1)}g dietary fibre per 100g")
        if cand_pro is not None and cand_pro > 8.0 and "protein" not in " ".join(reasons):
            reasons.append(f"Good protein density ({round(cand_pro, 1)}g per 100g)")

        return round(min(max(score, 10.0), 99.5), 1), match_reason, reasons
