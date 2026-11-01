"""
rag_service.py - Refactored RAG pipeline adapted from support_rag.py.
Handles knowledge retrieval from 20 NutriAI TXT documents, intent classification for
nutrition topics, LangGraph state execution, Groq API LLM drafting, and source verification.
"""

import os
import sys
import time
import logging
from typing import List, Dict, Any, TypedDict, Optional
import requests
import torch
from dotenv import load_dotenv

from langchain_core.documents import Document
from langchain_huggingface import HuggingFaceEmbeddings
from langgraph.graph import END, START, StateGraph

from app.core.config import settings

logger = logging.getLogger("nutriai.rag_service")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", ".."))
FAISS_INDEX_DIR = os.path.join(BACKEND_DIR, "artifacts", "faiss_index")

FALLBACK_TEXT = (
    "I could not locate sufficiently verified clinical nutrition guidelines for this query in the "
    "NutriAI reference knowledge base. Please consult an accredited dietitian or nutritionist, and "
    "verify specific food intake against measured gram weights in the Nutrition Checker."
)

FALLBACK_UNRELATED_ANSWER = (
    "I am **NutriAI**, your dedicated clinical nutrition and Indian food assistant.\n\n"
    "I specialize exclusively in **human nutrition, dietary science, metabolic health, and Indian food composition**. "
    "I cannot answer questions outside of nutrition and dietetics (such as general trivia, sports, politics, or coding).\n\n"
    "### What you can ask me about:\n"
    "• **Indian Food Composition**: Nutrient breakdowns for over 1,014 Anuvaad lab-analyzed foods (e.g. *dal tadka, rotis, paneer, idli*).\n"
    "• **Macronutrients & Micronutrients**: Caloric densities, protein quality, essential amino acids, dietary fiber, iron, and vitamins.\n"
    "• **Clinical Dietary Guidance**: Evidence-based strategies for Type-2 diabetes, hypertension, dyslipidemia, and renal health.\n"
    "• **Culinary Nutrition Science**: How fermentation, germination, and traditional cooking methods impact nutrient bioavailability."
)

NUTRITION_KEYWORDS = {
    # Nutrients & energy
    "calorie", "calories", "kcal", "energy", "joule", "atwater",
    "protein", "proteins", "amino", "amino acid", "amino acids", "peptides",
    "carb", "carbs", "carbohydrate", "carbohydrates", "starch", "sugar", "sugars", "glucose", "fructose", "sucrose",
    "fat", "fats", "lipid", "lipids", "oil", "oils", "ghee", "fatty acid", "fatty acids", "sfa", "mufa", "pufa",
    "fiber", "fibre", "roughage", "cellulose", "pectin",
    "vitamin", "vitamins", "mineral", "minerals", "iron", "calcium", "zinc", "iodine", "potassium", "sodium", "magnesium", "folate", "b12",
    "macro", "macros", "macronutrient", "macronutrients", "micronutrient", "micronutrients",
    "electrolyte", "electrolytes", "water", "hydration", "fluid",
    # Diet & health
    "diet", "diets", "dietary", "dieting", "nutrition", "nutritional", "nutrient", "nutrients", "rda", "intake",
    "balanced diet", "portion", "portions", "deficit", "surplus", "weight loss", "weight gain", "obesity", "bmi", "lean mass",
    "fasting", "intermittent fasting", "metabolism", "metabolic", "digestion", "digestive", "satiety", "appetite", "absorption",
    "glycemic", "glycaemic", "gi", "gl", "glycemic index", "glycemic load", "insulin", "diabetes", "diabetic",
    "hypertension", "blood pressure", "bp", "dash", "cholesterol", "ldl", "hdl", "triglycerides", "cardiovascular", "heart",
    "kidney", "renal", "uric acid", "gout", "anemia", "anaemia", "thyroid", "pcos", "pcod", "fatty liver",
    "gut", "gut health", "microbiome", "acid reflux", "gerd", "bloating", "constipation", "celiac", "gluten", "lactose", "allergy",
    "vegan", "vegetarian", "non-vegetarian", "jain", "keto", "ketogenic",
    # Food & cooking
    "food", "foods", "meal", "meals", "dish", "dishes", "ingredient", "ingredients", "recipe", "recipes",
    "eat", "eating", "ate", "breakfast", "lunch", "dinner", "snack", "snacks", "thali",
    "cook", "cooking", "cooked", "boil", "boiling", "steam", "steaming", "fry", "frying", "fried", "roast", "roasting",
    "ferment", "fermentation", "fermented", "sprout", "sprouts", "sprouting", "germination", "soak", "soaking",
    "bioavailability", "anti-nutrient", "anti-nutrients", "phytate", "phytates", "tannin", "oxalate",
    # Indian foods & staples
    "roti", "rotis", "chapati", "chapatis", "paratha", "parathas", "naan", "puri", "poori", "phulka", "kulcha",
    "dal", "dals", "daal", "lentil", "lentils", "pulses", "legume", "legumes",
    "chana", "chickpea", "chickpeas", "rajma", "moong", "masoor", "urad", "toor", "arhar", "lobia",
    "paneer", "curd", "dahi", "yogurt", "yoghurt", "chaas", "buttermilk", "lassi", "milk", "cheese",
    "rice", "pulao", "biryani", "khichdi", "idli", "idlis", "dosa", "dosas", "uttapam", "upma", "poha", "vada",
    "sabzi", "sabji", "curry", "tadka", "baghar", "chutney", "raita", "sambar", "rasam", "salad",
    "apple", "banana", "mango", "orange", "papaya", "guava", "fruit", "fruits", "vegetable", "vegetables",
    "spinach", "palak", "methi", "bhindi", "okra", "gobi", "cauliflower", "potato", "aloo", "tomato", "onion",
    "turmeric", "haldi", "ginger", "garlic", "cumin", "jeera", "coriander", "mustard", "fenugreek", "spices",
    "egg", "eggs", "chicken", "fish", "mutton", "meat", "tofu", "soya", "soy", "soybean",
    "almond", "almonds", "walnut", "walnuts", "cashew", "cashews", "peanut", "peanuts", "seeds", "flaxseed", "chia",
    "atta", "wheat", "flour", "maida", "besan", "sattu", "oats", "ragi", "bajra", "jowar", "millet", "millets"
}

OUT_OF_DOMAIN_PATTERNS = [
    r"\b(fifa|football|soccer|cricket|ipl|nba|messi|ronaldo|world cup|olympics|badminton|tennis|tournament|trophy|match)\b",
    r"\b(python|javascript|typescript|java|c\+\+|golang|html|css|coding|programming|github|algorithm|binary tree|linked list|bug|debug|code to|write code)\b",
    r"\b(movie|movies|cinema|actor|actress|hollywood|bollywood|singer|song|lyrics|netflix|celebrity)\b",
    r"\b(president|prime minister|election|elections|parliament|congress|bjp|senate|politician|war|military|army|navy)\b",
    r"\b(car|cars|engine|vehicle|tire|tires|mechanic|airplane|flight|quantum mechanics|bitcoin|crypto|ethereum|stock market)\b",
    r"\b(joke|funny joke|tell me a joke|riddle|who is the president|capital of|weather in|who won)\b"
]

import re

def is_query_nutrition_related(query: str, vector_score: float = 0.0) -> bool:
    """Classifies whether an input query is related to food, nutrition, or dietary health."""
    q_lower = query.lower()

    # 1. Check strong out-of-domain patterns
    has_ood_pattern = any(re.search(pat, q_lower) for pat in OUT_OF_DOMAIN_PATTERNS)

    # 2. Check in-domain nutrition keywords
    words = re.findall(r"\b[a-z0-9\-]+\b", q_lower)
    word_set = set(words)
    bigrams = {f"{words[i]} {words[i+1]}" for i in range(len(words)-1)}
    combined_tokens = word_set | bigrams

    matching_keywords = combined_tokens & NUTRITION_KEYWORDS
    has_nutrition_terms = len(matching_keywords) > 0

    if has_ood_pattern and not has_nutrition_terms:
        return False

    if vector_score > 0 and vector_score < 0.30 and not has_nutrition_terms:
        return False

    if has_nutrition_terms:
        return True

    if vector_score >= 0.35:
        return True

    return False

class LLMBackendError(Exception):
    """Raised when Groq API encounters an error."""

class NutritionState(TypedDict, total=False):
    question: str
    intent: str
    search_query: str
    context: str
    sources: List[Dict[str, str]]
    draft: str
    retry_count: int
    final_answer: str
    is_unrelated: bool

# Reusable pipeline objects initialized once at FastAPI startup
retriever = None
vector_store = None
nutrition_graph = None
embedding_model = None

def generate_with_groq(prompt: str) -> str:
    """Invokes Groq LLM API with proper timeouts, headers, and rate-limit backoff."""
    api_key = settings.GROQ_API_KEY.strip()
    if not api_key or api_key.startswith("paste_your"):
        raise LLMBackendError("GROQ_API_KEY is not configured or invalid.")

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": settings.GROQ_MODEL,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are NutriAI, an authoritative, evidence-based nutrition assistant specializing in "
                    "Indian food composition and clinical nutrition. Answer strictly using the provided context."
                )
            },
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.1,
        "max_tokens": 450,
    }

    for attempt in (1, 2):
        try:
            resp = requests.post(
                settings.GROQ_API_URL,
                headers=headers,
                json=payload,
                timeout=settings.LLM_TIMEOUT_SECONDS
            )
        except requests.exceptions.Timeout:
            raise LLMBackendError("Groq LLM request timed out.")
        except requests.exceptions.RequestException as e:
            raise LLMBackendError(f"Network error contacting Groq LLM: {str(e)}")

        if resp.status_code == 429 and attempt == 1:
            wait = min(float(resp.headers.get("Retry-After", 2) or 2), 5)
            logger.warning("Groq rate limit hit. Retrying in %.1fs...", wait)
            time.sleep(wait)
            continue

        if resp.status_code != 200:
            err_msg = ""
            try:
                err_msg = resp.json().get("error", {}).get("message", "")
            except Exception:
                err_msg = resp.text[:120]
            raise LLMBackendError(f"Groq API returned HTTP {resp.status_code}: {err_msg}")

        try:
            return resp.json()["choices"][0]["message"]["content"].strip()
        except (KeyError, IndexError, ValueError):
            raise LLMBackendError("Unexpected response structure from Groq.")

    raise LLMBackendError("Failed to receive a valid response from Groq.")

def classify_nutrition_intent(state: NutritionState) -> Dict[str, Any]:
    question = state.get("question", "")
    if not is_query_nutrition_related(question):
        return {
            "intent": "Out of Domain / Unrelated",
            "search_query": question,
            "retry_count": state.get("retry_count", 0),
            "is_unrelated": True,
            "final_answer": FALLBACK_UNRELATED_ANSWER,
            "sources": []
        }

    q = question.lower()
    intent = "General Nutrition"

    keyword_map = [
        ("Macronutrients & Energy", ["calorie", "kcal", "energy", "macro", "atwater", "joule"]),
        ("Proteins & Amino Acids", ["protein", "amino", "dal", "pulses", "paneer", "egg", "soya", "whey", "leucine"]),
        ("Carbohydrates & Fiber", ["carb", "carbohydrate", "starch", "sugar", "fiber", "fibre", "glycemic", "gi"]),
        ("Lipids & Healthy Fats", ["fat", "lipid", "oil", "ghee", "omega", "sfa", "mufa", "pufa", "cholesterol"]),
        ("Micronutrients & Vitamins", ["vitamin", "mineral", "iron", "calcium", "zinc", "anemia", "b12", "folate", "scurvy"]),
        ("Indian Meal Architecture", ["breakfast", "thali", "curry", "tadka", "ferment", "idli", "dosa", "roti", "dal"]),
        ("Dietary Balance & Portions", ["balanced", "portion", "plate", "measure", "dietary guideline", "deficit", "surplus"])
    ]

    for category, keywords in keyword_map:
        if any(k in q for k in keywords):
            intent = category
            break

    return {
        "intent": intent,
        "search_query": state["question"],
        "retry_count": state.get("retry_count", 0),
        "is_unrelated": False,
    }

def retrieve_context(state: NutritionState) -> Dict[str, Any]:
    global retriever
    if not retriever:
        return {"context": "", "sources": []}

    docs = retriever.invoke(state["search_query"])
    context_chunks = []
    sources = []
    seen_ids = set()

    for d in docs:
        context_chunks.append(d.page_content)
        doc_id = d.metadata.get("document_id", "unknown")
        if doc_id not in seen_ids:
            seen_ids.add(doc_id)
            sources.append({
                "document_id": doc_id,
                "title": d.metadata.get("title", doc_id.replace("_", " ").title()),
                "snippet": d.page_content[:200] + "..."
            })

    return {
        "context": "\n\n---\n\n".join(context_chunks),
        "sources": sources
    }

def draft_answer(state: NutritionState) -> Dict[str, Any]:
    context = state.get("context", "").strip()
    question = state["question"]

    prompt = f"""You are NutriAI, an expert Indian clinical nutritionist.
Answer the nutrition inquiry using ONLY the provided verified KNOWLEDGE CONTEXT.
Do not invent facts, nutrient quantities, or clinical treatments not supported by the context.

If the provided context does not contain sufficient factual information to answer accurately,
output exactly:
INSUFFICIENT_CONTEXT

Never calculate hypothetical recipe calories without gram weights.
Keep the explanation clear, educational, and structured.

KNOWLEDGE CONTEXT:
{context}

USER QUESTION:
{question}

NUTRITION GUIDANCE:"""

    model_provider = state.get("model_provider", "lora")
    draft = ""

    if model_provider == "lora":
        try:
            from app.services.llm_service import generate_with_local_lora
            logger.info("Drafting answer using fine-tuned local LoRA model (Qwen2.5-0.5B + Adapter)...")
            draft = generate_with_local_lora(f"Context:\n{context}\n\nQuestion: {question}")
        except Exception as exc:
            logger.warning("Local LoRA inference failed (%s). Falling back to Groq cloud API.", exc)
            try:
                draft = generate_with_groq(prompt)
            except LLMBackendError as e:
                draft = f"INSUFFICIENT_CONTEXT: {str(e)}"
    else:
        try:
            draft = generate_with_groq(prompt)
        except LLMBackendError as exc:
            logger.warning("Groq generation failed in draft_answer: %s", exc)
            draft = f"INSUFFICIENT_CONTEXT: {str(exc)}"

    return {"draft": draft}

def review_answer(state: NutritionState) -> Dict[str, Any]:
    draft = state.get("draft", "").strip()
    if not draft or "INSUFFICIENT_CONTEXT" in draft.upper():
        return {"final_answer": ""}
    return {"final_answer": draft}

def route_after_review(state: NutritionState) -> str:
    if state.get("final_answer"):
        return "finish"
    if state.get("retry_count", 0) < 1:
        return "retry"
    return "fallback"

def rewrite_query(state: NutritionState) -> Dict[str, Any]:
    intent = state.get("intent", "General Nutrition")
    enrichment = {
        "Macronutrients & Energy": "energy yield carbohydrates proteins lipids calories",
        "Proteins & Amino Acids": "protein sources amino acid bioavailability biological value",
        "Carbohydrates & Fiber": "complex carbohydrates soluble insoluble fiber glycemic response",
        "Lipids & Healthy Fats": "fatty acids monounsaturated polyunsaturated cooking oils",
        "Micronutrients & Vitamins": "vitamins minerals deficiency dietary absorption",
        "Indian Meal Architecture": "traditional Indian food cooking methods regional diet",
        "Dietary Balance & Portions": "recommended dietary allowances balanced portion control",
    }.get(intent, "Indian food nutrition composition guidelines")

    new_query = f"{state['question']} {enrichment}"
    return {
        "search_query": new_query,
        "retry_count": state.get("retry_count", 0) + 1
    }

def fallback_answer(state: NutritionState) -> Dict[str, Any]:
    return {"final_answer": FALLBACK_TEXT}

def fallback_unrelated_answer(state: NutritionState) -> Dict[str, Any]:
    return {"final_answer": FALLBACK_UNRELATED_ANSWER, "sources": []}

def route_after_intent(state: NutritionState) -> str:
    if state.get("is_unrelated"):
        return "fallback_unrelated"
    return "retrieve"

def build_nutrition_graph():
    g = StateGraph(NutritionState)
    g.add_node("classify_intent", classify_nutrition_intent)
    g.add_node("retrieve", retrieve_context)
    g.add_node("draft_answer", draft_answer)
    g.add_node("review_answer", review_answer)
    g.add_node("rewrite_query", rewrite_query)
    g.add_node("fallback", fallback_answer)
    g.add_node("fallback_unrelated", fallback_unrelated_answer)

    g.add_edge(START, "classify_intent")
    g.add_conditional_edges(
        "classify_intent",
        route_after_intent,
        {"retrieve": "retrieve", "fallback_unrelated": "fallback_unrelated"}
    )
    g.add_edge("retrieve", "draft_answer")
    g.add_edge("draft_answer", "review_answer")
    g.add_conditional_edges(
        "review_answer",
        route_after_review,
        {"finish": END, "retry": "rewrite_query", "fallback": "fallback"}
    )
    g.add_edge("rewrite_query", "retrieve")
    g.add_edge("fallback", END)
    g.add_edge("fallback_unrelated", END)
    return g.compile()

def initialize_rag():
    """Initializes embeddings, connects to Qdrant or FAISS, and compiles the LangGraph workflow."""
    global retriever, vector_store, nutrition_graph, embedding_model

    device = "cuda" if torch.cuda.is_available() else "cpu"
    logger.info("Initializing NutriAI RAG service with embeddings on %s...", device)
    embedding_model = HuggingFaceEmbeddings(
        model_name=settings.EMBEDDING_MODEL,
        model_kwargs={"device": device}
    )

    # 1. Try Qdrant Vector Store
    if settings.QDRANT_URL:
        try:
            from qdrant_client import QdrantClient
            from langchain_qdrant import QdrantVectorStore

            client = QdrantClient(
                url=settings.QDRANT_URL,
                api_key=settings.QDRANT_API_KEY if settings.QDRANT_API_KEY else None,
                timeout=4.0
            )
            if client.collection_exists(settings.QDRANT_COLLECTION):
                logger.info("Found existing Qdrant collection '%s'.", settings.QDRANT_COLLECTION)
                vector_store = QdrantVectorStore(
                    client=client,
                    collection_name=settings.QDRANT_COLLECTION,
                    embedding=embedding_model,
                )
                logger.info("Connected to Qdrant vector store.")
        except Exception as exc:
            logger.warning("Could not connect to Qdrant collection: %s", exc)

    # 2. Fallback to FAISS if Qdrant is not connected
    if vector_store is None:
        if os.path.exists(FAISS_INDEX_DIR):
            try:
                from langchain_community.vectorstores import FAISS
                logger.info("Loading FAISS vector store from %s", FAISS_INDEX_DIR)
                vector_store = FAISS.load_local(
                    FAISS_INDEX_DIR,
                    embedding_model,
                    allow_dangerous_deserialization=True
                )
                logger.info("FAISS vector store loaded successfully.")
            except Exception as e:
                logger.error("Failed to load FAISS index: %s", e)

    if vector_store is not None:
        retriever = vector_store.as_retriever(search_kwargs={"k": 4})
        logger.info("RAG retriever configured (k=4).")
    else:
        logger.warning("RAG retriever could not be established. Ensure ingest.py has run.")

    nutrition_graph = build_nutrition_graph()
    logger.info("NutriAI LangGraph compiled successfully.")

def get_retriever():
    global retriever
    return retriever

def is_ready() -> bool:
    return nutrition_graph is not None and retriever is not None

def answer_nutrition_question(question: str, model_provider: str = "lora") -> Dict[str, Any]:
    if not is_ready():
        # Attempt just-in-time initialization if not already done
        initialize_rag()
        if not is_ready():
            return {
                "answer": "The RAG vector store is currently indexing. Please try again in a few moments.",
                "sources": [],
                "intent": "Uninitialized",
                "retries": 0,
                "fallback": True
            }

    result = nutrition_graph.invoke({"question": question, "retry_count": 0, "model_provider": model_provider})
    answer = result.get("final_answer", "")
    is_fallback = (
        answer == FALLBACK_TEXT or
        answer == FALLBACK_UNRELATED_ANSWER or
        "INSUFFICIENT_CONTEXT" in answer
    )
    sources = [] if (answer == FALLBACK_UNRELATED_ANSWER or result.get("is_unrelated")) else result.get("sources", [])
    return {
        "answer": answer,
        "intent": result.get("intent", "General Nutrition"),
        "sources": sources,
        "retries": result.get("retry_count", 0),
        "fallback": is_fallback
    }
