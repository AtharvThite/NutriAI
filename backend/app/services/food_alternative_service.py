import re
import uuid
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

from app.core.database import get_foods_collection, get_saved_alternatives_collection
from app.services.food_similarity_service import FoodSimilarityService, NUTRIENT_METADATA
from app.schemas.food_alternative import (
    FoodSearchResultItem,
    OriginalFoodSummary,
    AlternativeCandidate,
    RecommendAlternativesRequest,
    RecommendAlternativesResponse,
    CompareFoodsRequest,
    CompareFoodsResponse,
    SaveComparisonRequest,
    SaveComparisonResponse,
    SavedComparisonItem,
    NaturalLanguageIntentResponse
)

logger = logging.getLogger("nutriai.food_alternative_service")

# In-memory store fallback if MongoDB offline
_memory_saved_comparisons: Dict[str, Dict[str, Any]] = {}

class FoodAlternativeService:

    @staticmethod
    def search_foods(query: str, limit: int = 15) -> List[FoodSearchResultItem]:
        col = get_foods_collection()
        if col is None or not query.strip():
            return []

        import re
        clean_q = query.strip()
        escaped = re.escape(clean_q)
        regex = re.compile(rf"\b{escaped}\b" if len(clean_q) <= 4 else escaped, re.IGNORECASE)

        cursor = col.find({"food_name": {"$regex": regex}}, {"_id": 0}).limit(limit)
        results: List[FoodSearchResultItem] = []

        for doc in cursor:
            nutrients = doc.get("nutrients", {})
            dietary_type = FoodSimilarityService.classify_dietary_type(doc.get("food_name", ""))
            category = FoodSimilarityService.classify_food_category(doc.get("food_name", ""), dietary_type)

            results.append(FoodSearchResultItem(
                food_code=doc.get("food_code", ""),
                food_name=doc.get("food_name", ""),
                category=category,
                dietary_type=dietary_type,
                nutrition_basis=doc.get("nutrition_basis", "100g"),
                energy_kcal=nutrients.get("energy_kcal"),
                protein_g=nutrients.get("protein_g"),
                carb_g=nutrients.get("carb_g"),
                fat_g=nutrients.get("fat_g"),
                fibre_g=nutrients.get("fibre_g"),
                servings_unit=doc.get("servings_unit")
            ))

        return results

    @staticmethod
    def recommend_alternatives(req: RecommendAlternativesRequest) -> RecommendAlternativesResponse:
        col = get_foods_collection()
        if col is None:
            raise ValueError("Foods database collection is not available.")

        orig_doc = col.find_one({"food_code": req.food_code}, {"_id": 0})
        if not orig_doc:
            raise KeyError(f"Food item with code '{req.food_code}' not found in database.")

        orig_nutrients_100g = orig_doc.get("nutrients", {})
        orig_diet = FoodSimilarityService.classify_dietary_type(orig_doc.get("food_name", ""))
        orig_cat = FoodSimilarityService.classify_food_category(orig_doc.get("food_name", ""), orig_diet)

        orig_scaled_nutrients = FoodSimilarityService.scale_nutrients(orig_nutrients_100g, req.quantity_g)

        original_summary = OriginalFoodSummary(
            food_code=orig_doc.get("food_code", ""),
            food_name=orig_doc.get("food_name", ""),
            category=orig_cat,
            dietary_type=orig_diet,
            nutrition_basis=orig_doc.get("nutrition_basis", "100g"),
            quantity_g=req.quantity_g,
            nutrients=orig_scaled_nutrients,
            nutrients_per_100g=orig_nutrients_100g,
            servings_unit=orig_doc.get("servings_unit")
        )

        # Targeted pre-filtering directly in MongoDB using indexed nutrient fields
        filter_query: Dict[str, Any] = {"food_code": {"$ne": req.food_code}}

        orig_cal = orig_nutrients_100g.get("energy_kcal")
        orig_pro = orig_nutrients_100g.get("protein_g")
        orig_carb = orig_nutrients_100g.get("carb_g")
        orig_fib = orig_nutrients_100g.get("fibre_g")

        # 1. Objective-specific nutrient bounds
        if req.objective == "higher_protein" and orig_pro is not None:
            # If switching from non-veg to veg, allow high plant protein threshold (>= 7.5g)
            if orig_diet == "Non-Vegetarian" and (req.dietary_preference and req.dietary_preference.lower() in ("vegetarian", "vegan")):
                filter_query["nutrients.protein_g"] = {"$gte": max(orig_pro * 0.5, 7.5)}
            else:
                filter_query["nutrients.protein_g"] = {"$gt": orig_pro}
        elif req.objective == "lower_calorie" and orig_cal is not None:
            filter_query["nutrients.energy_kcal"] = {"$lt": orig_cal}
        elif req.objective == "higher_fibre":
            filter_query["nutrients.fibre_g"] = {"$gt": max(orig_fib or 0.0, 0.2)}
        elif req.objective == "lower_carb" and orig_carb is not None:
            filter_query["nutrients.carb_g"] = {"$lt": orig_carb}
        elif req.objective == "similar" and orig_cal is not None:
            filter_query["nutrients.energy_kcal"] = {
                "$gte": max(0.0, orig_cal * 0.35),
                "$lte": orig_cal * 1.85
            }

        # 2. Dietary preference pre-filtering in MongoDB
        diet_conditions: List[Dict[str, Any]] = []
        if req.dietary_preference and req.dietary_preference.lower() != "all":
            pref = req.dietary_preference.lower()
            if pref == "vegetarian":
                diet_conditions.append({
                    "food_name": {"$not": {"$regex": r"\b(chicken|murgh|fish|machli|mutton|gosht|lamb|pork|beef|prawn|prawns|crab|shrimp|meat|keema|ande)\b", "$options": "i"}}
                })
            elif pref == "vegan":
                diet_conditions.append({
                    "food_name": {"$not": {"$regex": r"\b(chicken|murgh|fish|machli|mutton|gosht|lamb|pork|beef|prawn|prawns|crab|shrimp|meat|keema|ande|milk|curd|dahi|paneer|cheese|butter|ghee|cream|lassi|chaas|kheer|rabri|khoa|mawa|dairy)\b", "$options": "i"}}
                })
            elif pref == "non-vegetarian":
                diet_conditions.append({
                    "food_name": {"$regex": r"\b(chicken|murgh|fish|machli|mutton|gosht|lamb|pork|beef|prawn|prawns|crab|shrimp|meat|keema|egg|ande)\b", "$options": "i"}
                })

        # 3. Category pre-filtering in MongoDB
        target_cat = req.category_filter
        if (not target_cat or target_cat.lower() == "all") and req.objective == "similar":
            target_cat = orig_cat

        category_regex_map = {
            "grains & cereals": r"\b(rice|chawal|bhaat|roti|chapati|phulka|paratha|parantha|puri|poori|naan|kulcha|khichdi|pulao|biryani|poha|upma|oats|wheat|atta|maida|suji|semolina|dalia|bajra|jowar|ragi|millet|cereal|bread|noodle|pasta|corn)\b",
            "pulses & legumes": r"\b(dal|daal|lentil|chana|chole|rajma|moong|masoor|urad|toor|arhar|lobia|soy|soya|soybean|chickpea|pulse|pulses|legume|sprout|sprouts|besan|sattu)\b",
            "dairy & alternatives": r"\b(milk|curd|dahi|paneer|cheese|lassi|chaas|yogurt|buttermilk|cream|tofu)\b",
            "meat, poultry & eggs": r"\b(chicken|fish|mutton|egg|meat|prawn)\b",
            "vegetables & curries": r"\b(sabzi|sabji|curry|palak|methi|bhindi|gobi|aloo|baingan|brinjal|eggplant|tomato|onion|carrot|capsicum|mushroom|gourd|salad|vegetable|leafy)\b",
            "fruits": r"\b(apple|banana|mango|orange|papaya|guava|fruit|fruits|berry|grapes)\b",
            "beverages": r"\b(tea|chai|coffee|juice|soup|beverage|drink|water|sherbet)\b",
        }

        cat_condition = None
        if target_cat and target_cat.lower() in category_regex_map:
            cat_regex = category_regex_map[target_cat.lower()]
            cat_condition = {"food_name": {"$regex": cat_regex, "$options": "i"}}

        all_conditions = list(diet_conditions)
        if cat_condition:
            all_conditions.append(cat_condition)

        if all_conditions:
            filter_query["$and"] = all_conditions

        # Ensure targeted query returns candidates; if strict category reduces pool too much, relax category only (preserve diet)
        matched_count = col.count_documents(filter_query)
        if matched_count < req.limit and cat_condition:
            filter_query.pop("$and", None)
            if diet_conditions:
                filter_query["$and"] = diet_conditions

        cursor = col.find(filter_query, {"_id": 0})

        candidates_pool: List[AlternativeCandidate] = []
        analyzed_count = 0

        for cand_doc in cursor:
            analyzed_count += 1
            cand_name = cand_doc.get("food_name", "")
            cand_diet = FoodSimilarityService.classify_dietary_type(cand_name)
            cand_cat = FoodSimilarityService.classify_food_category(cand_name, cand_diet)

            # Category filter verification
            if req.category_filter and req.category_filter.lower() != "all":
                if cand_cat.lower() != req.category_filter.lower():
                    continue

            # 3. Transparent scoring
            score, match_reason, key_diffs = FoodSimilarityService.calculate_candidate_score_and_reasons(
                orig_doc=orig_doc,
                cand_doc=cand_doc,
                objective=req.objective
            )

            if score <= 0.0:
                continue

            cand_nutrients_100g = cand_doc.get("nutrients", {})
            cand_scaled_nutrients = FoodSimilarityService.scale_nutrients(cand_nutrients_100g, req.quantity_g)

            # Build side-by-side nutrient comparison map for quantity_g
            comparisons: Dict[str, Any] = {}
            for k in NUTRIENT_METADATA.keys():
                ov = orig_scaled_nutrients.get(k)
                cv = cand_scaled_nutrients.get(k)
                comparisons[k] = FoodSimilarityService.build_comparison_item(k, ov, cv)

            candidates_pool.append(AlternativeCandidate(
                food_code=cand_doc.get("food_code", ""),
                food_name=cand_name,
                category=cand_cat,
                dietary_type=cand_diet,
                nutrition_basis=cand_doc.get("nutrition_basis", "100g"),
                quantity_g=req.quantity_g,
                nutrients=cand_scaled_nutrients,
                nutrients_per_100g=cand_nutrients_100g,
                score=score,
                rank=0,
                match_reason=match_reason,
                key_differences=key_diffs,
                comparisons=comparisons
            ))

        # Sort highest score first
        candidates_pool.sort(key=lambda x: x.score, reverse=True)

        # Assign final rank
        top_candidates = candidates_pool[:req.limit]
        for idx, item in enumerate(top_candidates, 1):
            item.rank = idx

        return RecommendAlternativesResponse(
            original_food=original_summary,
            objective=req.objective,
            quantity_g=req.quantity_g,
            dietary_preference=req.dietary_preference or "all",
            alternatives=top_candidates,
            total_candidates_analyzed=analyzed_count,
            explanation_available=True
        )

    @staticmethod
    def compare_foods(req: CompareFoodsRequest) -> CompareFoodsResponse:
        col = get_foods_collection()
        if col is None:
            raise ValueError("Foods database collection is not available.")

        summaries: List[OriginalFoodSummary] = []
        macro_ratios: Dict[str, Dict[str, float]] = {}

        for code in req.food_codes:
            doc = col.find_one({"food_code": code}, {"_id": 0})
            if not doc:
                continue
            diet = FoodSimilarityService.classify_dietary_type(doc.get("food_name", ""))
            cat = FoodSimilarityService.classify_food_category(doc.get("food_name", ""), diet)
            n_100g = doc.get("nutrients", {})
            scaled = FoodSimilarityService.scale_nutrients(n_100g, req.quantity_g)

            summaries.append(OriginalFoodSummary(
                food_code=doc.get("food_code", ""),
                food_name=doc.get("food_name", ""),
                category=cat,
                dietary_type=diet,
                nutrition_basis=doc.get("nutrition_basis", "100g"),
                quantity_g=req.quantity_g,
                nutrients=scaled,
                nutrients_per_100g=n_100g,
                servings_unit=doc.get("servings_unit")
            ))

            # Caloric ratios
            c_g = scaled.get("carb_g") or 0.0
            p_g = scaled.get("protein_g") or 0.0
            f_g = scaled.get("fat_g") or 0.0
            total_cal = (c_g * 4.0) + (p_g * 4.0) + (f_g * 9.0)
            if total_cal > 0:
                macro_ratios[code] = {
                    "carb_pct": round((c_g * 4.0 / total_cal) * 100.0, 1),
                    "protein_pct": round((p_g * 4.0 / total_cal) * 100.0, 1),
                    "fat_pct": round((f_g * 9.0 / total_cal) * 100.0, 1),
                }
            else:
                macro_ratios[code] = {"carb_pct": 0.0, "protein_pct": 0.0, "fat_pct": 0.0}

        # Build comparison matrix rows
        comparison_matrix: List[Dict[str, Any]] = []
        for k, meta in NUTRIENT_METADATA.items():
            row: Dict[str, Any] = {
                "nutrient_key": k,
                "nutrient_name": meta["name"],
                "unit": meta["unit"],
                "values": {}
            }
            for s in summaries:
                row["values"][s.food_code] = s.nutrients.get(k)
            comparison_matrix.append(row)

        return CompareFoodsResponse(
            foods=summaries,
            comparison_matrix=comparison_matrix,
            macro_ratios=macro_ratios,
            quantity_g=req.quantity_g
        )

    @staticmethod
    def save_comparison(req: SaveComparisonRequest, user_id: Optional[str] = None) -> SaveComparisonResponse:
        col = get_foods_collection()
        saved_col = get_saved_alternatives_collection()

        orig_doc = col.find_one({"food_code": req.original_food_code}) if col is not None else None
        alt_doc = col.find_one({"food_code": req.alternative_food_code}) if col is not None else None

        orig_name = orig_doc.get("food_name", req.original_food_code) if orig_doc else req.original_food_code
        alt_name = alt_doc.get("food_name", req.alternative_food_code) if alt_doc else req.alternative_food_code

        orig_cat = FoodSimilarityService.classify_food_category(orig_name)
        alt_cat = FoodSimilarityService.classify_food_category(alt_name)

        orig_n = orig_doc.get("nutrients", {}) if orig_doc else {}
        alt_n = alt_doc.get("nutrients", {}) if alt_doc else {}

        comparison_id = f"cmp_{uuid.uuid4().hex[:12]}"
        now = datetime.now(timezone.utc).isoformat()

        doc = {
            "comparison_id": comparison_id,
            "user_id": user_id,
            "original_food_code": req.original_food_code,
            "original_food_name": orig_name,
            "original_category": orig_cat,
            "alternative_food_code": req.alternative_food_code,
            "alternative_food_name": alt_name,
            "alternative_category": alt_cat,
            "objective": req.objective,
            "quantity_g": req.quantity_g,
            "notes": req.notes,
            "created_at": now,
            "original_calories": orig_n.get("energy_kcal"),
            "alternative_calories": alt_n.get("energy_kcal"),
            "original_protein": orig_n.get("protein_g"),
            "alternative_protein": alt_n.get("protein_g")
        }

        _memory_saved_comparisons[comparison_id] = doc

        if saved_col is not None:
            try:
                saved_col.insert_one(doc)
            except Exception as exc:
                logger.warning("MongoDB insert saved comparison failed: %s", exc)

        return SaveComparisonResponse(
            success=True,
            comparison_id=comparison_id,
            message="Food alternative comparison saved successfully."
        )

    @staticmethod
    def get_saved_comparisons(user_id: Optional[str] = None) -> List[SavedComparisonItem]:
        saved_col = get_saved_alternatives_collection()
        items: List[SavedComparisonItem] = []

        if saved_col is not None:
            try:
                query = {"user_id": user_id} if user_id else {}
                cursor = saved_col.find(query, {"_id": 0}).sort("created_at", -1).limit(50)
                for d in cursor:
                    items.append(SavedComparisonItem(**d))
                return items
            except Exception as exc:
                logger.warning("Error fetching saved comparisons from MongoDB: %s", exc)

        # Fallback to memory
        for d in sorted(_memory_saved_comparisons.values(), key=lambda x: x.get("created_at", ""), reverse=True):
            if not user_id or d.get("user_id") == user_id:
                items.append(SavedComparisonItem(**d))

        return items

    @staticmethod
    def delete_saved_comparison(comparison_id: str, user_id: Optional[str] = None) -> bool:
        saved_col = get_saved_alternatives_collection()
        deleted = False

        if saved_col is not None:
            try:
                query: Dict[str, Any] = {"comparison_id": comparison_id}
                if user_id:
                    query["user_id"] = user_id
                res = saved_col.delete_one(query)
                deleted = (res.deleted_count > 0)
            except Exception as exc:
                logger.warning("Error deleting from MongoDB: %s", exc)

        if comparison_id in _memory_saved_comparisons:
            del _memory_saved_comparisons[comparison_id]
            deleted = True

        return deleted

    @staticmethod
    def parse_natural_language_request(query: str) -> NaturalLanguageIntentResponse:
        """
        Parses user's natural query into structured objective, dietary preference, and food mention.
        Uses local fine-tuned LoRA model if active, otherwise relies on deterministic Indian food regex.
        """
        q_lower = query.lower()
        used_lora = False

        # Attempt LoRA inference if available
        try:
            from app.services.llm_service import is_local_lora_available, generate_with_local_lora
            if is_local_lora_available():
                prompt = (
                    f"Extract nutrition alternative criteria as JSON from: '{query}'. "
                    f"Fields: objective, dietary_preference, target_food"
                )
                logger.info("Attempting LoRA intent parsing on: %s", query)
                out = generate_with_local_lora(prompt, max_new_tokens=120)
                used_lora = True
        except Exception as e:
            logger.info("Local LoRA extraction skipped (%s). Using deterministic rules.", e)

        # 1. Objective detection
        objective = "similar"
        comparison_criteria = []

        if re.search(r'\b(protein|more protein|high protein|higher protein|rich in protein)\b', q_lower):
            objective = "higher_protein"
            comparison_criteria.append("protein")
        elif re.search(r'\b(calorie|calories|low calorie|lower calorie|less calorie|weight loss|cut calories)\b', q_lower):
            objective = "lower_calorie"
            comparison_criteria.append("energy_kcal")
        elif re.search(r'\b(fibre|fiber|high fibre|higher fibre|roughage|digestion)\b', q_lower):
            objective = "higher_fibre"
            comparison_criteria.append("fibre_g")
        elif re.search(r'\b(carb|carbs|carbohydrate|lower carb|low carb|keto)\b', q_lower):
            objective = "lower_carb"
            comparison_criteria.append("carb_g")

        # 2. Dietary preference detection
        dietary_pref = "all"
        if re.search(r'\b(vegan)\b', q_lower):
            dietary_pref = "Vegan"
        elif re.search(r'\b(vegetarian|veg)\b', q_lower) and not re.search(r'\b(non-veg|non veg)\b', q_lower):
            dietary_pref = "Vegetarian"
        elif re.search(r'\b(non-vegetarian|non veg|meat)\b', q_lower):
            dietary_pref = "Non-Vegetarian"

        # 3. Extract candidate food name from query
        extracted_food = None
        stopwords = {
            "find", "suggest", "give", "me", "an", "a", "alternative", "alternatives",
            "to", "for", "with", "more", "less", "high", "low", "higher", "lower",
            "protein", "calorie", "calories", "fibre", "fiber", "carb", "carbs",
            "vegetarian", "veg", "vegan", "non", "something", "similar", "like", "food",
            "instead", "of", "option", "options", "choice", "choices", "substitute", "substitutes"
        }
        tokens = [t for t in re.findall(r'\b[a-zA-Z]+\b', q_lower) if t not in stopwords]
        potential_food_term = " ".join(tokens)

        # Match against MongoDB foods
        matched_code = None
        matched_name = None

        if potential_food_term:
            extracted_food = potential_food_term
            search_res = FoodAlternativeService.search_foods(potential_food_term, limit=1)
            if search_res:
                matched_code = search_res[0].food_code
                matched_name = search_res[0].food_name

        requires_clarification = (matched_code is None)
        clarification_msg = None
        if requires_clarification:
            clarification_msg = (
                f"We identified your objective as '{objective.replace('_', ' ').title()}', "
                f"but could not pinpoint the exact Indian food in our database. Please select a food from search."
            )

        return NaturalLanguageIntentResponse(
            original_food_query=extracted_food,
            matched_food_code=matched_code,
            matched_food_name=matched_name,
            objective=objective,
            dietary_preference=dietary_pref,
            comparison_criteria=comparison_criteria,
            requires_clarification=requires_clarification,
            clarification_message=clarification_msg,
            used_lora=used_lora
        )
