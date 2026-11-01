import re
import logging
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException
from app.schemas.chat import ChatRequest, ChatResponse, ChatSource
from app.services.food_service import food_service
from app.services.rag_service import (
    answer_nutrition_question,
    is_query_nutrition_related,
    FALLBACK_UNRELATED_ANSWER,
    FALLBACK_TEXT
)
from app.core.config import settings

logger = logging.getLogger("nutriai.chat")
router = APIRouter(prefix="/chat", tags=["Chat"])

STOP_WORDS = {
    "who", "what", "where", "when", "why", "how", "which", "whom", "whose",
    "the", "and", "or", "an", "a", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "can", "could", "shall", "should", "will", "would", "may", "might",
    "in", "on", "at", "to", "for", "of", "with", "by", "from", "up", "about", "into", "over", "after",
    "i", "me", "my", "myself", "we", "our", "ours", "you", "your", "yours", "he", "him", "his", "she", "her",
    "it", "its", "they", "them", "their", "this", "that", "these", "those",
    "won", "cup", "car", "tell", "give", "show", "find", "best", "good", "bad", "many", "much",
    "please", "help", "value", "values", "check", "know", "want", "some", "like", "need"
}

def detect_food_query(query: str) -> Optional[List[Dict[str, Any]]]:
    """Detects if query is asking for numerical nutrient composition of an Indian food."""
    q_lower = query.lower()
    composition_triggers = [
        "calorie", "calories", "protein", "carbs", "carbohydrate", "fat", "nutrition",
        "nutrient", "how much", "composition", "in 100g", "per 100g", "values", "macros"
    ]
    is_composition_query = any(trigger in q_lower for trigger in composition_triggers)

    # Extract potential food words by stripping common question phrases and punctuation
    cleaned = re.sub(
        r"\b(what is the|what are the|how much|calories in|protein in|fat in|nutrition in|composition of|of|for|100g|grams|in)\b",
        " ",
        q_lower
    )
    words = [
        w.strip() for w in re.findall(r"\b[a-z]{3,}\b", cleaned)
        if w.strip() not in STOP_WORDS
    ]

    if not words:
        return None

    found_foods = []
    # Try searching 2-word combinations first (e.g. "dal tadka", "paneer butter")
    for i in range(len(words) - 1):
        bigram = f"{words[i]} {words[i+1]}"
        matches = food_service.search_foods(bigram, limit=2)
        if matches:
            found_foods.extend(matches)

    # Then search single significant tokens
    for word in words:
        matches = food_service.search_foods(word, limit=2)
        if matches:
            found_foods.extend(matches)

    if not found_foods:
        return None

    # De-duplicate matches
    unique = {f.food_code: f for f in found_foods}
    # Only return food composition if composition was explicitly requested or valid food names matched
    return list(unique.values()) if is_composition_query else None

@router.post("", response_model=ChatResponse)
def chat_endpoint(request: ChatRequest):
    user_msg = request.message.strip()
    if not user_msg:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    q_lower = user_msg.lower()

    # 1. Unrelated / Out-of-Domain Detection
    if not is_query_nutrition_related(user_msg):
        logger.info("Unrelated / out-of-domain query intercepted: '%s'", user_msg)
        return ChatResponse(
            answer=FALLBACK_UNRELATED_ANSWER,
            sources=[],
            requires_clarification=False,
            intent="Out of Domain / Unrelated",
            retries=0,
            fallback=True
        )

    # 2. Check if user mentions vague meal without quantities (e.g., "I had 2 rotis and dal")
    portion_vague_triggers = ["i ate", "i had", "my lunch was", "for dinner i had", "eating"]
    has_vague_meal = any(t in q_lower for t in portion_vague_triggers)
    lacks_weight = not bool(re.search(r"\b\d+\s*(g|gram|grams|ml|kg)\b", q_lower))

    if has_vague_meal and lacks_weight:
        return ChatResponse(
            answer=(
                "I identified the foods in your meal. However, standard Indian preparations vary significantly in size "
                "and oil/liquid content. To provide an accurate, deterministic nutritional calculation without fabricating numbers, "
                "please specify the weight in grams (e.g., '150g dal tadka, 60g roti'), or use the interactive Nutrition Checker."
            ),
            sources=[],
            requires_clarification=True,
            intent="Meal Clarification",
            fallback=False
        )

    # 3. Check for Food Composition Search in MongoDB
    matched_foods = detect_food_query(user_msg)

    # 4. Handle Pure or Mixed RAG
    model_provider = request.model_provider or "lora"
    rag_result = answer_nutrition_question(user_msg, model_provider=model_provider)
    rag_answer = rag_result.get("answer", "")

    # If RAG determined this was unrelated or fallback
    if rag_result.get("intent") == "Out of Domain / Unrelated" or rag_answer == FALLBACK_UNRELATED_ANSWER:
        return ChatResponse(
            answer=FALLBACK_UNRELATED_ANSWER,
            sources=[],
            requires_clarification=False,
            intent="Out of Domain / Unrelated",
            retries=0,
            fallback=True
        )

    sources = [
        ChatSource(
            document_id=s.get("document_id", "kb_doc"),
            title=s.get("title", "NutriAI Knowledge Document"),
            snippet=s.get("snippet")
        )
        for s in rag_result.get("sources", [])
    ]

    # Combine with deterministic food data if relevant
    if matched_foods:
        food_details = []
        for f in matched_foods[:3]:
            food_details.append(
                f"• **{f.food_name}** (per 100g):\n"
                f"  Energy: {f.energy_kcal or 'N/A'} kcal | Protein: {f.protein_g or 'N/A'}g | "
                f"Carbs: {f.carb_g or 'N/A'}g | Fat: {f.fat_g or 'N/A'}g | Fiber: {f.fibre_g or 'N/A'}g"
            )
        db_block = "### Verified Food Composition (from Anuvaad Database):\n" + "\n".join(food_details)

        if rag_result.get("fallback") or not rag_answer:
            final_text = (
                f"Here are the verified laboratory composition values from the Indian Food Composition Database:\n\n"
                f"{db_block}\n\n"
                f"You can add these items to the **Nutrition Checker** to calculate exact meal totals for your portion."
            )
        else:
            final_text = f"{db_block}\n\n### Nutritional Context & Guidance:\n{rag_answer}"

        return ChatResponse(
            answer=final_text,
            sources=sources,
            requires_clarification=False,
            intent="Food Composition & Knowledge",
            retries=rag_result.get("retries", 0),
            fallback=False
        )

    return ChatResponse(
        answer=rag_answer,
        sources=sources,
        requires_clarification=False,
        intent=rag_result.get("intent", "General Nutrition"),
        retries=rag_result.get("retries", 0),
        fallback=rag_result.get("fallback", False)
    )
