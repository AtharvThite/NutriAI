import logging
import re
from typing import List, Optional, Dict, Any
from app.core.database import get_foods_collection
from app.schemas.food import FoodSearchResult, FoodDetail

logger = logging.getLogger("nutriai.food_service")

class FoodService:
    @staticmethod
    def get_foods(skip: int = 0, limit: int = 50) -> List[Dict[str, Any]]:
        collection = get_foods_collection()
        if collection is None:
            return []
        cursor = collection.find({}, {"_id": 0}).skip(skip).limit(limit)
        return list(cursor)

    @staticmethod
    def count_foods() -> int:
        collection = get_foods_collection()
        if collection is None:
            return 0
        return collection.count_documents({})

    @staticmethod
    def search_foods(query: str, limit: int = 20) -> List[FoodSearchResult]:
        collection = get_foods_collection()
        if collection is None or not query.strip():
            return []

        clean_query = query.strip()
        escaped = re.escape(clean_query)
        # Use word boundaries for short queries (<= 4 chars) so words like 'who' do not match 'whole'
        if len(clean_query) <= 4:
            regex = re.compile(rf"\b{escaped}\b", re.IGNORECASE)
        else:
            regex = re.compile(escaped, re.IGNORECASE)

        cursor = collection.find(
            {"food_name": {"$regex": regex}},
            {"_id": 0}
        ).limit(limit)

        results: List[FoodSearchResult] = []
        for doc in cursor:
            nutrients = doc.get("nutrients", {})
            results.append(FoodSearchResult(
                food_code=doc.get("food_code", ""),
                food_name=doc.get("food_name", ""),
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
    def get_food_by_code(food_code: str) -> Optional[Dict[str, Any]]:
        collection = get_foods_collection()
        if collection is None:
            return None
        return collection.find_one({"food_code": food_code}, {"_id": 0})

food_service = FoodService()
