import logging
from typing import Optional
from pymongo import MongoClient
from pymongo.database import Database
from pymongo.collection import Collection
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
from app.core.config import settings

logger = logging.getLogger("nutriai.database")

class MongoDBManager:
    client: Optional[MongoClient] = None
    db: Optional[Database] = None

    def connect(self) -> None:
        try:
            self.client = MongoClient(
                settings.MONGODB_URI,
                serverSelectionTimeoutMS=3000,
                connectTimeoutMS=3000,
            )
            # Trigger a ping to verify connection immediately
            self.client.admin.command("ping")
            self.db = self.client[settings.MONGODB_DATABASE]
            logger.info("Connected to MongoDB at %s (Database: %s)", settings.MONGODB_URI, settings.MONGODB_DATABASE)
            self._ensure_indexes()
        except (ConnectionFailure, ServerSelectionTimeoutError) as exc:
            logger.warning("Failed to connect to MongoDB (%s). Offline mode active.", exc)
            self.client = None
            self.db = None

    def _ensure_indexes(self) -> None:
        if self.db is not None:
            try:
                foods_col = self.db["foods"]
                foods_col.create_index("food_code", unique=True)
                foods_col.create_index([("food_name", "text")])
                foods_col.create_index("food_name")

                meals_col = self.db["meals"]
                meals_col.create_index("meal_id", unique=True)
                meals_col.create_index("created_at")
            except Exception as e:
                logger.error("Error creating MongoDB indexes: %s", e)

    def close(self) -> None:
        if self.client:
            self.client.close()
            logger.info("MongoDB connection closed.")
            self.client = None
            self.db = None

    def is_connected(self) -> bool:
        if not self.client:
            return False
        try:
            self.client.admin.command("ping")
            return True
        except Exception:
            return False

db_manager = MongoDBManager()

def get_database() -> Optional[Database]:
    if db_manager.db is None:
        db_manager.connect()
    return db_manager.db

def get_foods_collection() -> Optional[Collection]:
    if db_manager.db is None:
        db_manager.connect()
    if db_manager.db is not None:
        return db_manager.db["foods"]
    return None

def get_meals_collection() -> Optional[Collection]:
    if db_manager.db is None:
        db_manager.connect()
    if db_manager.db is not None:
        return db_manager.db["meals"]
    return None
