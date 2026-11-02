import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from app.main import app
from app.services.food_similarity_service import FoodSimilarityService
from app.schemas.food_alternative import RecommendAlternativesRequest

client = TestClient(app)

def test_nutrient_scaling_and_none_preservation():
    raw_nutrients = {
        "energy_kcal": 200.0,
        "protein_g": 10.0,
        "carb_g": None,  # Missing in raw data
        "fat_g": 5.0
    }
    
    # 150g serving
    scaled_150 = FoodSimilarityService.scale_nutrients(raw_nutrients, 150.0)
    assert scaled_150["energy_kcal"] == 300.0
    assert scaled_150["protein_g"] == 15.0
    assert scaled_150["fat_g"] == 7.5
    # Strict rule: None must be preserved, never coerced to 0!
    assert scaled_150["carb_g"] is None

def test_food_dietary_and_category_classification():
    diet_egg, cat_egg = FoodSimilarityService.classify_dietary_type("Egg sandwich"), FoodSimilarityService.classify_food_category("Egg sandwich", "Non-Vegetarian")
    assert diet_egg == "Non-Vegetarian"
    assert cat_egg == "Meat, Poultry & Eggs"

    diet_curd, cat_curd = FoodSimilarityService.classify_dietary_type("Curd rice (Dahi chawal)"), FoodSimilarityService.classify_food_category("Curd rice (Dahi chawal)", "Vegetarian")
    assert diet_curd == "Vegetarian"
    assert cat_curd == "Grains & Cereals"

    diet_dal, cat_dal = FoodSimilarityService.classify_dietary_type("Dal tadka (Yellow lentils)"), FoodSimilarityService.classify_food_category("Dal tadka (Yellow lentils)", "Vegan")
    assert diet_dal == "Vegan"
    assert cat_dal == "Pulses & Legumes"

def test_search_and_recommend_api():
    # 1. Search
    res_search = client.get("/api/alternatives/search?q=rice")
    assert res_search.status_code == 200
    data = res_search.json()
    assert len(data) > 0
    food_code = data[0]["food_code"]

    # 2. Recommend higher_protein
    res_rec = client.post("/api/alternatives/recommend", json={
        "food_code": food_code,
        "quantity_g": 100.0,
        "objective": "higher_protein",
        "dietary_preference": "all",
        "limit": 5
    })
    assert res_rec.status_code == 200
    rec_data = res_rec.json()
    assert "original_food" in rec_data
    assert "alternatives" in rec_data
    assert len(rec_data["alternatives"]) > 0

    # Ensure ranking is descending by score
    scores = [a["score"] for a in rec_data["alternatives"]]
    assert scores == sorted(scores, reverse=True)

    # 3. Test Compare
    alt_code = rec_data["alternatives"][0]["food_code"]
    res_cmp = client.post("/api/alternatives/compare", json={
        "food_codes": [food_code, alt_code],
        "quantity_g": 100.0
    })
    assert res_cmp.status_code == 200
    assert len(res_cmp.json()["foods"]) == 2
    assert "comparison_matrix" in res_cmp.json()

    # 4. Test Explain
    res_exp = client.post("/api/alternatives/explain", json={
        "original_food_code": food_code,
        "alternative_food_code": alt_code,
        "objective": "higher_protein",
        "quantity_g": 100.0
    })
    assert res_exp.status_code == 200
    assert len(res_exp.json()["explanation"]) > 50
    assert "sources" in res_exp.json()

def test_saved_alternatives_crud():
    # Create
    res_save = client.post("/api/alternatives/saved", json={
        "original_food_code": "TEST_ORIG",
        "alternative_food_code": "TEST_ALT",
        "objective": "similar",
        "quantity_g": 100.0,
        "notes": "Unit test comparison"
    })
    assert res_save.status_code == 200
    cmp_id = res_save.json()["comparison_id"]

    # Read
    res_get = client.get("/api/alternatives/saved")
    assert res_get.status_code == 200
    assert any(x["comparison_id"] == cmp_id for x in res_get.json())

    # Delete
    res_del = client.delete(f"/api/alternatives/saved/{cmp_id}")
    assert res_del.status_code == 200
