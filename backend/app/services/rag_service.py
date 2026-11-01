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
    q = state["question"].lower()
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

def build_nutrition_graph():
    g = StateGraph(NutritionState)
    g.add_node("classify_intent", classify_nutrition_intent)
    g.add_node("retrieve", retrieve_context)
    g.add_node("draft_answer", draft_answer)
    g.add_node("review_answer", review_answer)
    g.add_node("rewrite_query", rewrite_query)
    g.add_node("fallback", fallback_answer)

    g.add_edge(START, "classify_intent")
    g.add_edge("classify_intent", "retrieve")
    g.add_edge("retrieve", "draft_answer")
    g.add_edge("draft_answer", "review_answer")
    g.add_conditional_edges(
        "review_answer",
        route_after_review,
        {"finish": END, "retry": "rewrite_query", "fallback": "fallback"}
    )
    g.add_edge("rewrite_query", "retrieve")
    g.add_edge("fallback", END)
    return g.compile()

def initialize_rag():
    """Initializes embeddings, connects to Qdrant or FAISS, and compiles the LangGraph workflow."""
    global retriever, vector_store, nutrition_graph, embedding_model

    logger.info("Initializing NutriAI RAG service...")
    embedding_model = HuggingFaceEmbeddings(model_name=settings.EMBEDDING_MODEL)

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
    return {
        "answer": answer,
        "intent": result.get("intent", "General Nutrition"),
        "sources": result.get("sources", []),
        "retries": result.get("retry_count", 0),
        "fallback": answer == FALLBACK_TEXT or "INSUFFICIENT_CONTEXT" in answer
    }
