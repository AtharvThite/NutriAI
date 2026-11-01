import uuid
import logging
from datetime import datetime
from typing import List, Optional, Dict, Any
from app.core.database import get_meals_collection
from app.services.food_service import food_service
from app.services.nutrition_calculator import analyze_consumed_items
from app.schemas.nutrition import MealItemInput
from app.schemas.meal import MealResponse, MealCreateRequest

logger = logging.getLogger("nutriai.meal_service")

class MealService:
    @staticmethod
    def create_meal(request: MealCreateRequest) -> MealResponse:
        meals_col = get_meals_collection()
        items_data = []

        for item in request.items:
            food_doc = food_service.get_food_by_code(item.food_code)
            if not food_doc:
                raise ValueError(f"Food item with code '{item.food_code}' not found")
            items_data.append((food_doc, item.quantity_g))

        analysis = analyze_consumed_items(items_data)
        meal_id = f"meal_{uuid.uuid4().hex[:8]}"
        created_at = datetime.utcnow().isoformat() + "Z"

        meal_doc = {
            "meal_id": meal_id,
            "meal_name": request.meal_name,
            "total_weight_g": analysis.total_weight_g,
            "items": [item.dict() for item in analysis.items_breakdown],
            "total_nutrients": analysis.total_nutrients,
            "macronutrient_ratios": analysis.macronutrient_ratios.dict(),
            "created_at": created_at
        }

        if meals_col is not None:
            meals_col.insert_one(meal_doc)

        # Remove MongoDB _id before returning
        meal_doc.pop("_id", None)
        return MealResponse(**meal_doc)

    @staticmethod
    def list_meals(limit: int = 50) -> List[MealResponse]:
        meals_col = get_meals_collection()
        if meals_col is None:
            return []

        cursor = meals_col.find({}, {"_id": 0}).sort("created_at", -1).limit(limit)
        return [MealResponse(**doc) for doc in cursor]

    @staticmethod
    def get_meal(meal_id: str) -> Optional[MealResponse]:
        meals_col = get_meals_collection()
        if meals_col is None:
            return None

        doc = meals_col.find_one({"meal_id": meal_id}, {"_id": 0})
        if doc:
            return MealResponse(**doc)
        return None

    @staticmethod
    def delete_meal(meal_id: str) -> bool:
        meals_col = get_meals_collection()
        if meals_col is None:
            return False

        res = meals_col.delete_one({"meal_id": meal_id})
        return res.deleted_count > 0

meal_service = MealService()
