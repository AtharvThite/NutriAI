"""
evaluate_rag.py - Evaluates NutriAI RAG retrieval pipeline against rag_eval.jsonl.
Computes Precision@k, Recall@k, Mean Reciprocal Rank (MRR), and average latency (ms).
Saves actual evaluation results to backend/artifacts/experiment_results/rag_results.json.
"""

import os
import sys
import json
import time
import logging
from typing import List, Dict, Any

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))
sys.path.insert(0, BACKEND_DIR)

from app.core.config import settings
from app.services.rag_service import initialize_rag, get_retriever

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("evaluate_rag")

EVAL_PATH = os.path.join(BACKEND_DIR, "datasets", "evaluation", "rag_eval.jsonl")
OUT_DIR = os.path.join(BACKEND_DIR, "artifacts", "experiment_results")
OUT_PATH = os.path.join(OUT_DIR, "rag_results.json")

def load_eval_dataset() -> List[Dict[str, Any]]:
    if not os.path.exists(EVAL_PATH):
        raise FileNotFoundError(f"Evaluation dataset not found at {EVAL_PATH}")
    eval_queries = []
    with open(EVAL_PATH, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                eval_queries.append(json.loads(line))
    return eval_queries

def run_evaluation(k: int = 4) -> Dict[str, Any]:
    initialize_rag()
    active_retriever = get_retriever()
    queries = load_eval_dataset()
    logger.info(f"Running RAG evaluation across {len(queries)} benchmark queries at k={k}...")

    precisions = []
    recalls = []
    reciprocal_ranks = []
    latencies_ms = []
    query_details = []

    for item in queries:
        question = item["question"]
        expected_ids = set(item.get("relevant_document_ids", []))

        start_t = time.time()
        retrieved_docs = active_retriever.invoke(question)
        latency = (time.time() - start_t) * 1000.0
        latencies_ms.append(latency)

        retrieved_ids = [
            doc.metadata.get("document_id", "")
            for doc in retrieved_docs[:k]
        ]

        # Precision@k: relevant retrieved / total retrieved
        hits = [rid for rid in retrieved_ids if rid in expected_ids]
        precision = len(hits) / float(k)
        precisions.append(precision)

        # Recall@k: relevant retrieved / total expected
        recall = len(hits) / float(len(expected_ids)) if expected_ids else 1.0
        recalls.append(recall)

        # Reciprocal Rank: 1 / rank of first relevant item
        rr = 0.0
        for rank, rid in enumerate(retrieved_ids, 1):
            if rid in expected_ids:
                rr = 1.0 / rank
                break
        reciprocal_ranks.append(rr)

        query_details.append({
            "question": question,
            "expected_ids": list(expected_ids),
            "retrieved_ids": retrieved_ids,
            "precision_at_k": round(precision, 3),
            "recall_at_k": round(recall, 3),
            "reciprocal_rank": round(rr, 3),
            "latency_ms": round(latency, 2)
        })

    avg_precision = sum(precisions) / len(precisions) if precisions else 0.0
    avg_recall = sum(recalls) / len(recalls) if recalls else 0.0
    mrr = sum(reciprocal_ranks) / len(reciprocal_ranks) if reciprocal_ranks else 0.0
    avg_latency = sum(latencies_ms) / len(latencies_ms) if latencies_ms else 0.0

    result = {
        "status": "Evaluated",
        "eval_timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "total_documents": 20,
        "total_chunks": 104,
        "eval_queries_count": len(queries),
        "k": k,
        "embedding_model": settings.EMBEDDING_MODEL,
        "vector_store": "FAISS (with Qdrant cloud/container adapter)",
        "precision_at_k": round(avg_precision, 4),
        "recall_at_k": round(avg_recall, 4),
        "mrr": round(mrr, 4),
        "avg_latency_ms": round(avg_latency, 2),
        "query_evaluations": query_details[:10]  # top 10 preview
    }

    os.makedirs(OUT_DIR, exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2)

    logger.info(f"RAG Evaluation saved to {OUT_PATH}")
    return result

def main():
    print("=" * 70)
    print("NutriAI - Evaluating RAG Retrieval Pipeline")
    print("=" * 70)
    results = run_evaluation(k=4)
    print("\nRAG Benchmark Results:")
    print(f"  Queries Evaluated: {results['eval_queries_count']}")
    print(f"  Precision@4:       {results['precision_at_k'] * 100:.1f}%")
    print(f"  Recall@4:          {results['recall_at_k'] * 100:.1f}%")
    print(f"  MRR (Rank):        {results['mrr']:.4f}")
    print(f"  Avg Latency:       {results['avg_latency_ms']:.2f} ms")
    print("=" * 70)

if __name__ == "__main__":
    main()
