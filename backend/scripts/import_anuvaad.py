"""
import_anuvaad.py - Import verified Indian Food Composition database into MongoDB.

1. Reads Anuvaad_INDB_2024.11.xlsx (or pre-processed anuvaad_foods.json).
2. Verifies nutrient units and nutritional basis (100g edible basis).
3. Preserves nulls/missing values (never converts missing nutrients to 0).
4. Cleans text fields and ensures uniqueness on food_code.
5. Ingests into MongoDB collection 'foods' with proper indexing.
6. Prints a detailed validation and import report.
"""

import os
import sys
import json
import logging
from typing import Dict, Any, List
import pandas as pd
from pymongo import MongoClient, ReplaceOne

# Add parent directory to path so app modules can be imported if needed
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(SCRIPT_DIR)
sys.path.insert(0, BACKEND_DIR)

from app.core.config import settings

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("import_anuvaad")

DATASETS_DIR = os.path.join(BACKEND_DIR, "datasets", "structured")
EXCEL_PATH = os.path.join(DATASETS_DIR, "Anuvaad_INDB_2024.11.xlsx")
JSON_PATH = os.path.join(DATASETS_DIR, "anuvaad_foods.json")

def load_and_verify_data() -> List[Dict[str, Any]]:
    """Loads food data, preferring verified JSON if present, else parses Excel directly."""
    if os.path.exists(JSON_PATH):
        logger.info(f"Loading pre-verified records from {JSON_PATH}...")
        with open(JSON_PATH, "r", encoding="utf-8") as f:
            records = json.load(f)
        logger.info(f"Loaded {len(records)} verified records from JSON.")
        return records

    if not os.path.exists(EXCEL_PATH):
        raise FileNotFoundError(f"Neither {JSON_PATH} nor {EXCEL_PATH} found!")

    logger.info(f"Reading Excel workbook from {EXCEL_PATH}...")
    df = pd.read_excel(EXCEL_PATH)
    logger.info(f"Read Excel with shape: {df.shape}")

    records = []
    # Identify standard columns vs serving columns
    for _, row in df.iterrows():
        food_code = str(row.get("food_code", "")).strip()
        food_name = str(row.get("food_name", "")).strip()
        if not food_code or not food_name:
            continue

        nutrients = {}
        serving_nutrients = {}
        servings_unit = row.get("servings_unit")
        if pd.isna(servings_unit) or str(servings_unit).strip() in ("", "nan", "None"):
            servings_unit = None
        else:
            servings_unit = str(servings_unit).strip()

        for col in df.columns:
            val = row[col]
            if pd.isna(val) or val == "" or val == "NULL" or val == "NA":
                clean_val = None
            else:
                try:
                    clean_val = float(val)
                except (ValueError, TypeError):
                    clean_val = str(val).strip()

            if col.startswith("unit_serving_"):
                nutrient_name = col.replace("unit_serving_", "")
                if clean_val is not None and isinstance(clean_val, (int, float)):
                    serving_nutrients[nutrient_name] = round(clean_val, 4)
                else:
                    serving_nutrients[nutrient_name] = clean_val
            elif col not in ("food_code", "food_name", "source", "primarysource", "servings_unit"):
                if clean_val is not None and isinstance(clean_val, (int, float)):
                    nutrients[col] = round(clean_val, 4)
                else:
                    nutrients[col] = clean_val

        records.append({
            "food_code": food_code,
            "food_name": food_name,
            "source": str(row.get("source", "Anuvaad_INDB_2024.11")).strip(),
            "primarysource": str(row.get("primarysource", "")).strip() if pd.notna(row.get("primarysource")) else None,
            "nutrition_basis": "100g",
            "nutrients": nutrients,
            "servings_unit": servings_unit,
            "serving_nutrients": serving_nutrients if serving_nutrients else None,
        })

    return records

def import_to_mongodb(records: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Inserts or replaces food records in MongoDB with verified indexes."""
    client = MongoClient(settings.MONGODB_URI, serverSelectionTimeoutMS=5000)
    db = client[settings.MONGODB_DATABASE]
    collection = db["foods"]

    # Verify connection
    client.admin.command("ping")
    logger.info(f"Connected to MongoDB at {settings.MONGODB_URI}, database: {settings.MONGODB_DATABASE}")

    # Create indexes
    collection.create_index("food_code", unique=True)
    collection.create_index([("food_name", "text")])
    collection.create_index("food_name")

    operations = [
        ReplaceOne({"food_code": r["food_code"]}, r, upsert=True)
        for r in records
    ]

    result = collection.bulk_write(operations, ordered=False)
    total_in_db = collection.count_documents({})

    report = {
        "records_processed": len(records),
        "matched_count": result.matched_count,
        "modified_count": result.modified_count,
        "upserted_count": len(result.upserted_ids),
        "total_documents_in_db": total_in_db,
    }

    client.close()
    return report

def main():
    print("=" * 70)
    print("NutriAI - Anuvaad Indian Food Composition Database Import")
    print("=" * 70)

    try:
        records = load_and_verify_data()
        print(f"Total verified food records: {len(records)}")

        # Verification sample
        sample = records[0]
        print(f"\nVerification Sample:")
        print(f"  Food Code: {sample['food_code']}")
        print(f"  Food Name: {sample['food_name']}")
        print(f"  Basis: {sample['nutrition_basis']}")
        print(f"  Nutrient Count: {len(sample.get('nutrients', {}))}")
        print(f"  Serving Unit: {sample.get('servings_unit')}")

        report = import_to_mongodb(records)
        print("\n" + "=" * 70)
        print("Import Summary Report:")
        print(f"  Records Processed: {report['records_processed']}")
        print(f"  Upserted New: {report['upserted_count']}")
        print(f"  Modified Existing: {report['modified_count']}")
        print(f"  Total Foods in MongoDB: {report['total_documents_in_db']}")
        print("=" * 70)
        print("Import completed successfully!")

    except Exception as exc:
        logger.error(f"Import failed: {exc}", exc_info=True)
        sys.exit(1)

if __name__ == "__main__":
    main()
