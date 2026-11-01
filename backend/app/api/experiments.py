import os
import json
import logging
from typing import Dict, Any, Optional
from fastapi import APIRouter
from app.core.config import settings
from app.services.food_service import food_service
from app.services.rag_service import is_ready as is_rag_ready, vector_store
from app.utils.hardware import get_hardware_info

logger = logging.getLogger("nutriai.experiments")
router = APIRouter(tags=["Experiments"])

RESULTS_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "artifacts",
    "experiment_results"
)

def load_result_json(filename: str) -> Optional[Dict[str, Any]]:
    path = os.path.join(RESULTS_DIR, filename)
    if os.path.exists(path):
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.error("Error reading %s: %s", path, e)
    return None

@router.get("/rag/status")
def get_rag_status():
    kb_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
        settings.KNOWLEDGE_BASE_PATH
    )
    doc_count = 0
    if os.path.exists(kb_path):
        doc_count = len([f for f in os.listdir(kb_path) if f.endswith(".txt")])

    faiss_exists = os.path.exists(
        os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
            "artifacts",
            "faiss_index"
        )
    )

    return {
        "status": "ready" if is_rag_ready() else "indexing",
        "total_documents": doc_count,
        "embedding_model": settings.EMBEDDING_MODEL,
        "qdrant_url": settings.QDRANT_URL or "Not Configured",
        "qdrant_collection": settings.QDRANT_COLLECTION,
        "active_vector_store": "Qdrant" if settings.QDRANT_URL and "Qdrant" in str(type(vector_store)) else ("FAISS" if faiss_exists else "None"),
        "chunk_strategy": "RecursiveCharacter (size=1800 chars, overlap=250 chars)"
    }

@router.get("/model/status")
def get_model_status():
    hw = get_hardware_info()
    lora_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
        settings.LORA_ADAPTER_PATH
    )
    qlora_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
        settings.QLORA_ADAPTER_PATH
    )

    return {
        "base_model": settings.BASE_MODEL_NAME,
        "device": hw["recommended_device"],
        "device_name": hw["device_name"] or "CPU Execution",
        "cuda_available": hw["cuda_available"],
        "vram_total_gb": hw["vram_total_gb"],
        "bitsandbytes_available": hw["bitsandbytes_available"],
        "lora_adapter_present": os.path.exists(lora_path) and os.listdir(lora_path) != [],
        "qlora_adapter_present": os.path.exists(qlora_path) and os.listdir(qlora_path) != [],
        "groq_configured": bool(settings.GROQ_API_KEY and not settings.GROQ_API_KEY.startswith("paste_")),
        "groq_model": settings.GROQ_MODEL
    }

@router.get("/experiments/summary")
def get_experiments_summary():
    hw = get_hardware_info()
    foods_count = food_service.count_foods()
    lora_data = load_result_json("lora_results.json")
    qlora_data = load_result_json("qlora_results.json")
    quant_data = load_result_json("quantization_results.json")
    rag_data = load_result_json("rag_results.json")

    return {
        "lora_status": "Evaluated" if lora_data else "Not evaluated yet",
        "qlora_status": "Evaluated" if qlora_data else "Not evaluated yet",
        "quantization_status": "Evaluated" if quant_data else "Not evaluated yet",
        "rag_status": "Evaluated" if rag_data else "Indexed & Ready",
        "documents_indexed": 20,
        "foods_indexed": foods_count,
        "gpu_available": hw["cuda_available"],
        "cuda_device": hw["device_name"] or "CPU"
    }

@router.get("/experiments/lora")
def get_lora_experiments():
    data = load_result_json("lora_results.json")
    if not data:
        return {
            "status": "Not evaluated yet",
            "message": "Run backend/ml/finetuning/train_lora.py to generate real training metrics.",
            "base_model": settings.BASE_MODEL_NAME,
            "runs": []
        }
    return data

@router.get("/experiments/quantization")
def get_quantization_experiments():
    data = load_result_json("quantization_results.json")
    if not data:
        return {
            "status": "Not evaluated yet",
            "message": "Run backend/ml/quantization/benchmark_quantization.py to benchmark precision tradeoffs.",
            "base_model": settings.BASE_MODEL_NAME,
            "benchmarks": []
        }
    return data

@router.get("/experiments/rag")
def get_rag_experiments():
    data = load_result_json("rag_results.json")
    if not data:
        return {
            "status": "Not evaluated yet",
            "message": "Run backend/ml/rag/evaluate_rag.py to compute Precision@k, Recall@k, and MRR.",
            "total_documents": 20,
            "embedding_model": settings.EMBEDDING_MODEL
        }
    return data
