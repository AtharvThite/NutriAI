import re
import logging
from typing import List, Dict, Any, Optional, Tuple
from app.core.database import get_foods_collection
from app.schemas.meal_intelligence import MealMatchCandidate, ExtractedFoodItem, ClarificationQuestion

logger = logging.getLogger("nutriai.food_matching_service")

# Common Indian food aliases and culinary equivalents
INDIAN_FOOD_ALIASES: Dict[str, List[str]] = {
    "idli": ["idli", "steamed idli"],
    "idlis": ["idli", "steamed idli"],
    "sambar": ["sambar", "sambhar"],
    "sambhar": ["sambar", "sambhar"],
    "chapati": ["chapati", "roti", "phulka"],
    "chapatis": ["chapati", "roti", "phulka"],
    "roti": ["chapati", "roti", "phulka"],
    "rotis": ["chapati", "roti", "phulka"],
    "phulka": ["chapati", "roti", "phulka"],
    "phulkas": ["chapati", "roti", "phulka"],
    "paratha": ["parantha", "paratha"],
    "parathas": ["parantha", "paratha"],
    "parantha": ["parantha", "paratha"],
    "paranthas": ["parantha", "paratha"],
    "rice": ["chawal", "boiled rice", "steamed rice", "rice"],
    "chawal": ["chawal", "boiled rice", "steamed rice", "rice"],
    "bhaat": ["chawal", "boiled rice", "rice"],
    "dal": ["dal", "daal", "lentil", "arhar", "moong"],
    "daal": ["dal", "daal", "lentil", "arhar", "moong"],
    "dals": ["dal", "daal", "lentil"],
    "curd": ["curd", "dahi", "yogurt"],
    "dahi": ["curd", "dahi", "yogurt"],
    "yogurt": ["curd", "dahi", "yogurt"],
    "poha": ["poha", "chirwa", "chivda"],
    "upma": ["upma", "rava upma", "suji upma"],
    "dosa": ["dosa", "masala dosa"],
    "dosas": ["dosa", "masala dosa"],
    "chai": ["tea", "garam chai", "chai"],
    "tea": ["tea", "garam chai", "chai"],
    "paneer": ["paneer"],
    "khichdi": ["khichdi", "khichri"],
    "khichri": ["khichdi", "khichri"],
    "chickpea": ["chickpeas", "chana", "chhole"],
    "chana": ["chana", "chickpeas", "chole"],
    "rajma": ["rajma", "kidney beans"],
    "egg": ["egg", "anda"],
    "eggs": ["egg", "anda"],
    "paneer bhurji": ["paneer curry", "paneer", "kadhai paneer"],
    "bhurji": ["paneer curry", "paneer", "anda bhurji", "egg bhurji"],
    "boiled rice": ["boiled rice", "steamed rice", "rice", "chawal"],
    "curd rice": ["curd rice", "dahi chawal", "curd", "rice"],
}

# Standard serving weight approximations in grams for portion suggestion
STANDARD_PORTION_SUGGESTIONS: Dict[str, Dict[str, float]] = {
    "idli": {"piece": 50.0, "pieces": 50.0, "default": 50.0},
    "roti": {"piece": 35.0, "pieces": 35.0, "serving": 35.0, "default": 35.0},
    "chapati": {"piece": 35.0, "pieces": 35.0, "serving": 35.0, "default": 35.0},
    "phulka": {"piece": 30.0, "pieces": 30.0, "serving": 30.0, "default": 30.0},
    "paratha": {"piece": 85.0, "pieces": 85.0, "serving": 85.0, "default": 85.0},
    "parantha": {"piece": 85.0, "pieces": 85.0, "serving": 85.0, "default": 85.0},
    "sambar": {"bowl": 150.0, "katori": 150.0, "cup": 180.0, "default": 150.0},
    "dal": {"bowl": 150.0, "katori": 150.0, "cup": 180.0, "default": 150.0},
    "rice": {"bowl": 150.0, "katori": 150.0, "cup": 150.0, "plate": 200.0, "default": 150.0},
    "curd": {"bowl": 100.0, "katori": 100.0, "cup": 120.0, "default": 100.0},
    "dahi": {"bowl": 100.0, "katori": 100.0, "cup": 120.0, "default": 100.0},
    "poha": {"bowl": 150.0, "katori": 150.0, "plate": 180.0, "default": 150.0},
    "upma": {"bowl": 150.0, "katori": 150.0, "plate": 180.0, "default": 150.0},
    "dosa": {"piece": 80.0, "pieces": 80.0, "default": 80.0},
    "tea": {"cup": 150.0, "glass": 150.0, "default": 150.0},
    "chai": {"cup": 150.0, "glass": 150.0, "default": 150.0},
}

class FoodMatchingService:
    @staticmethod
    def _normalize_name(name: str) -> str:
        """Strips numerical prefixes, punctuation, underscores, and extra whitespace."""
        cleaned = name.replace("_", " ").strip()
        cleaned = re.sub(r"^\d+(\.\d+)?\s*", "", cleaned)
        cleaned = re.sub(r"[^\w\s\(\)/-]", "", cleaned)
        cleaned = re.sub(r"\s+", " ", cleaned)
        return cleaned.strip().lower()

    @staticmethod
    def _get_stems_and_aliases(query: str) -> List[str]:
        q = FoodMatchingService._normalize_name(query)
        stems = [q]

        # Simple English plural stemming
        if q.endswith("ies") and len(q) > 4:
            stems.append(q[:-3] + "y")
        elif q.endswith("es") and len(q) > 3:
            stems.append(q[:-2])
        elif q.endswith("s") and len(q) > 2:
            stems.append(q[:-1])

        # Also consider individual words if multi-word
        words = [w for w in q.split() if len(w) > 2 and w not in ("with", "and", "the", "for", "one", "two", "three")]

        all_candidates = set(stems + words)
        for s in list(all_candidates):
            if s in INDIAN_FOOD_ALIASES:
                all_candidates.update(INDIAN_FOOD_ALIASES[s])

        return sorted(list(all_candidates), key=lambda x: -len(x))

    @staticmethod
    def search_anuvaad_matches(query: str, limit: int = 5) -> List[MealMatchCandidate]:
        """
        Searches MongoDB Anuvaad foods collection with multi-tier ranking:
        1. Exact/Whole-word match on food_name
        2. Food name starts with query stem
        3. Substring match on English or Hindi parenthetical name
        """
        col = get_foods_collection()
        if col is None:
            logger.warning("MongoDB foods collection not available for matching.")
            return []

        search_terms = FoodMatchingService._get_stems_and_aliases(query)
        seen_codes = set()
        ranked_candidates: List[Tuple[float, Dict[str, Any]]] = []
        fetch_limit = max(limit * 4, 30)

        for term in search_terms:
            escaped = re.escape(term)
            # Tier 1: Word boundary match
            reg_word = re.compile(rf"\b{escaped}\b", re.IGNORECASE)
            cursor = col.find({"food_name": reg_word}).limit(fetch_limit)
            for doc in cursor:
                code = doc.get("food_code")
                if code and code not in seen_codes:
                    seen_codes.add(code)
                    # Score calculation
                    name_lower = doc.get("food_name", "").lower()
                    if name_lower == term or name_lower.startswith(f"{term}/") or name_lower.startswith(f"{term} ("):
                        score = 1.0
                    elif name_lower.startswith(term):
                        score = 0.92
                    elif f"({term}" in name_lower or f"/{term}" in name_lower:
                        score = 0.88
                    else:
                        score = 0.80
                    ranked_candidates.append((score, doc))

            # Tier 2: Substring if we still need more candidates
            if len(ranked_candidates) < limit:
                reg_sub = re.compile(escaped, re.IGNORECASE)
                cursor_sub = col.find({"food_name": reg_sub}).limit(fetch_limit)
                for doc in cursor_sub:
                    code = doc.get("food_code")
                    if code and code not in seen_codes:
                        seen_codes.add(code)
                        ranked_candidates.append((0.70, doc))

        # Sort candidates descending by match score, preferring shorter/more concise staple dish names on ties
        ranked_candidates.sort(key=lambda x: (-x[0], len(x[1].get("food_name", ""))))

        results: List[MealMatchCandidate] = []
        for score, doc in ranked_candidates[:limit]:
            nutrients = doc.get("nutrients", {})
            results.append(MealMatchCandidate(
                food_code=doc.get("food_code", ""),
                food_name=doc.get("food_name", ""),
                nutrition_basis=doc.get("nutrition_basis", "100g"),
                energy_kcal=nutrients.get("energy_kcal"),
                protein_g=nutrients.get("protein_g"),
                carb_g=nutrients.get("carb_g"),
                fat_g=nutrients.get("fat_g"),
                fibre_g=nutrients.get("fibre_g"),
                servings_unit=doc.get("servings_unit"),
                match_score=round(score, 2)
            ))

        return results

    @staticmethod
    def match_extracted_item(item: ExtractedFoodItem) -> ExtractedFoodItem:
        """
        Enhances an extracted food item with MongoDB Anuvaad matches and resolves portion information.
        """
        candidates = FoodMatchingService.search_anuvaad_matches(item.food_name, limit=5)
        item.match_candidates = candidates

        if len(candidates) == 1:
            item.matched_food_code = candidates[0].food_code
            item.matched_food_name = candidates[0].food_name
            item.match_status = "matched"
        elif len(candidates) > 1:
            # If top match is an exact name match, pre-select it but mark as matched
            if candidates[0].match_score and candidates[0].match_score >= 0.95:
                item.matched_food_code = candidates[0].food_code
                item.matched_food_name = candidates[0].food_name
                item.match_status = "matched"
            else:
                item.matched_food_code = candidates[0].food_code
                item.matched_food_name = candidates[0].food_name
                item.match_status = "ambiguous"
        else:
            item.match_status = "not_found"

        # Resolve portion / weight in grams
        unit_lower = (item.unit or "").strip().lower()
        qty = item.quantity

        if item.quantity_g is not None and item.quantity_g > 0:
            item.portion_known = True
        elif unit_lower in ("g", "gram", "grams", "gm", "gms") and qty is not None and qty > 0:
            item.quantity_g = float(qty)
            item.portion_known = True
        elif unit_lower in ("kg", "kilogram", "kilograms") and qty is not None and qty > 0:
            item.quantity_g = float(qty) * 1000.0
            item.portion_known = True
        elif unit_lower in ("ml", "millilitre", "millilitres") and qty is not None and qty > 0:
            item.quantity_g = float(qty)
            item.portion_known = True
        else:
            item.portion_known = False

        return item

    @staticmethod
    def generate_clarification_questions(
        items: List[ExtractedFoodItem]
    ) -> List[ClarificationQuestion]:
        """
        Detects missing portion information, ambiguous foods, or unmeasured servings,
        and generates specific, contextual clarification questions.
        """
        questions: List[ClarificationQuestion] = []
        for item in items:
            food_norm = FoodMatchingService._normalize_name(item.food_name)
            # Find portion suggestions if available
            stem_key = food_norm
            for k in STANDARD_PORTION_SUGGESTIONS:
                if k in food_norm:
                    stem_key = k
                    break

            suggestions = STANDARD_PORTION_SUGGESTIONS.get(stem_key, {})
            unit_norm = (item.unit or "").strip().lower()
            unit_weight = suggestions.get(unit_norm, suggestions.get("default", 100.0))

            qty_val = item.quantity if item.quantity is not None else 1.0
            suggested_total = round(qty_val * unit_weight, 1)

            if not item.portion_known:
                if item.quantity is not None and item.unit:
                    q_text = (
                        f"You mentioned {item.quantity} {item.unit} of '{item.food_name}'. "
                        f"What is the approximate total weight in grams (e.g. ~{suggested_total}g)?"
                    )
                elif item.quantity is not None:
                    q_text = (
                        f"You mentioned '{item.quantity} {item.food_name}'. "
                        f"Please specify the portion weight in grams (approx ~{suggested_total}g)."
                    )
                else:
                    q_text = (
                        f"Portion quantity is missing for '{item.food_name}'. "
                        f"Approximately how many grams or standard bowls/pieces did you have?"
                    )
                questions.append(ClarificationQuestion(
                    food_name=item.food_name,
                    question=q_text,
                    suggested_weight_g=suggested_total,
                    answered=False
                ))

            if item.match_status == "not_found":
                questions.append(ClarificationQuestion(
                    food_name=item.food_name,
                    question=(
                        f"'{item.food_name}' was not directly located in the Anuvaad Indian Food Composition database. "
                        f"Please select a similar Anuvaad food from the Nutrition Checker or modify the name."
                    ),
                    suggested_weight_g=None,
                    answered=False
                ))

        return questions

food_matching_service = FoodMatchingService()
