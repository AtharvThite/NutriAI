# NutriAI – AI-Powered Indian Food Nutrition Checker

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19.0+-61DAFB.svg?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-Local%20%7C%20Atlas-47A248.svg?logo=mongodb&logoColor=white)](https://www.mongodb.com)
[![Qdrant](https://img.shields.io/badge/Qdrant-Cloud%20%7C%20Vector-DC2626.svg)](https://qdrant.tech)
[![PyTorch](https://img.shields.io/badge/PyTorch-PEFT%20%7C%20LoRA-EE4C2C.svg?logo=pytorch&logoColor=white)](https://pytorch.org)

NutriAI is a comprehensive full-stack AI/ML health-tech application designed for Indian food nutrition assessment, interactive meal building, and conversational dietary guidance. It incorporates deterministic numerical calculations based on verified laboratory data alongside cutting-edge LLM techniques: **Retrieval-Augmented Generation (RAG)**, **LoRA Fine-Tuning**, and **4-bit NF4 Quantization (QLoRA)**.

---

## 1. System Architecture

```
                  USER
                    |
                    v
             REACT FRONTEND
       (Vite + TypeScript + Tailwind)
                    |
                  Axios (REST)
                    |
                    v
             FASTAPI BACKEND
                    |
        +-----------+------------+
        |           |            |
        v           v            v
     MongoDB      Qdrant       LLM (Groq / Qwen)
  (1,014 Foods)  (Vector RAG)    |
        |           |       +----+----+
        v           v       |         |
   Food Records    RAG     LoRA     QLoRA
        |
        v
 Deterministic Calculator
 [N_consumed = (N_per100g * W) / 100]
```

### Key Architectural Tenets
1. **Deterministic Arithmetic:** LLMs are never used for nutrient calculations. All calorie and nutrient calculations use exact laboratory data from the Anuvaad Indian Food Composition Database.
2. **Strict RAG Grounding:** The conversational assistant queries 20 educational TXT documents across 104 vector chunks. If evidence is lacking, the pipeline triggers query rewriting and falls back safely (`INSUFFICIENT_CONTEXT`) rather than hallucinating dietary advice.
3. **Decoupled Offline ML:** LoRA training and quantization benchmarking scripts run independently from HTTP request paths to ensure low latency and high availability.

---

## 2. Adaptation of Reference Experiment Code

NutriAI directly refactors and adapts three baseline experiment implementations:

| Original Source | NutriAI Module | Adaptations |
| :--- | :--- | :--- |
| **`support_rag.py`** (Exp 6/7 FAQ RAG) | `backend/app/services/rag_service.py` & `backend/ml/rag/ingest.py` | • Replaced customer support FAQ text with **20 NutriAI TXT documents**.<br>• Preserved document IDs, titles, and section metadata.<br>• Adapted intent classification to nutrition categories.<br>• Retained LangGraph state graph (`classify_intent` &rarr; `retrieve` &rarr; `draft_answer` &rarr; `review_answer` &rarr; `rewrite_query` &rarr; `fallback`).<br>• Initialized embeddings and retriever once on FastAPI lifespan startup.<br>• Added Qdrant Cloud cluster support and FAISS local fallback. |
| **`2023300247_LLM_Exp2.ipynb`** (LoRA) | `backend/ml/finetuning/train_lora.py` & `evaluate_lora.py` | • Replaced RecipeNLG with `nutrition_train.jsonl` and `nutrition_validation.jsonl`.<br>• Preserved `LoraConfig` ($r=4, 8, 16$, $\alpha=16, 32$, `q_proj, v_proj`).<br>• Converted notebook cells into modular scripts.<br>• Exported adapter weights to `backend/artifacts/lora_adapter/`.<br>• Logged real training loss, parameters, and time to `lora_results.json`. |
| **`2023300247_LLM_Exp_3.ipynb`** (Quant & QLoRA) | `backend/ml/quantization/benchmark_quantization.py` & `backend/ml/finetuning/train_qlora.py` | • Replaced RecipeNLG with NutriAI instruction dataset.<br>• Implemented 4-bit NF4 double quantization and INT8 evaluation.<br>• Benchmarked model parameter footprint, generation latency, and tokens/sec throughput.<br>• Saved verified benchmarks to `quantization_results.json` and `qlora_results.json`. |

---

## 3. Verified Datasets & Knowledge Base

- **Structured Nutrition Data:** `backend/datasets/structured/Anuvaad_INDB_2024.11.xlsx` (1,014 verified Indian foods, 39 nutrients per 100g, imported into MongoDB collection `foods`).
- **Knowledge Base:** 20 standalone UTF-8 `.txt` documents in `backend/knowledge_base/` covering Macronutrients, Micronutrients, Balanced Diets, Traditional Indian Cooking, and Limitations.
- **LoRA Datasets:** `nutrition_train.jsonl`, `nutrition_validation.jsonl`, `nutrition_test.jsonl` in `backend/datasets/finetuning/`.
- **Evaluation Datasets:** `rag_eval.jsonl` (100 benchmark queries), `model_eval.jsonl`, `rag_query_expansion.jsonl` in `backend/datasets/evaluation/`.

---

## 4. Setup & Running Instructions

### Prerequisites
- Python 3.12+
- Node.js v18+ and npm
- MongoDB running on `localhost:27017`

### A. Backend Setup
```bash
cd backend

# Create virtual environment and activate
python3.12 -m venv .venv
source .venv/bin/activate

# Install requirements
pip install -r requirements.txt

# Import Anuvaad Indian Food Composition database into MongoDB
python scripts/import_anuvaad.py

# Ingest Knowledge Base documents into vector store
python ml/rag/ingest.py

# Run RAG benchmark evaluation
python ml/rag/evaluate_rag.py

# Start FastAPI development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
Backend API interactive documentation is available at: `http://localhost:8000/docs`

### B. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Start Vite React development server
npm run dev
```
Frontend application is accessible at: `http://localhost:5173`

---

## 5. Qdrant Configuration (Local, Container, or Cloud)

NutriAI supports both local vector storage and Qdrant Cloud clusters.

### Using Qdrant Cloud Cluster Credentials
To connect NutriAI to your remote Qdrant Cloud cluster, simply update `backend/.env`:
```env
QDRANT_URL=https://your-cluster-id.us-east4-0.gcp.cloud.qdrant.io:6333
QDRANT_API_KEY=your_qdrant_api_key_here
QDRANT_COLLECTION=nutriai_knowledge
```
Re-run `python ml/rag/ingest.py` to upload the 104 vector chunks directly to your Qdrant Cloud collection.

### Offline / Local Development Fallback
If `QDRANT_URL` is omitted or uncontactable, NutriAI seamlessly utilizes the local FAISS index stored in `backend/artifacts/faiss_index/`.

---

## 6. API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | System health check (MongoDB, RAG readiness, compute hardware) |
| `GET` | `/api/foods` | Paginated Indian food composition records |
| `GET` | `/api/foods/search?q={query}` | Instant substring search across 1,014 Anuvaad foods |
| `GET` | `/api/foods/{food_code}` | Detailed 39-nutrient profile for a specific food |
| `POST` | `/api/nutrition/analyze` | Deterministic macro/micronutrient calculation for input gram weights |
| `POST` | `/api/meals` | Save a composed meal to MongoDB history |
| `GET` | `/api/meals` | Retrieve saved meal history sorted by timestamp |
| `DELETE`| `/api/meals/{meal_id}` | Remove a meal record from history |
| `POST` | `/api/chat` | AI nutrition assistant with multi-intent routing and RAG source attribution |
| `GET` | `/api/rag/status` | RAG vector store indexing and chunking status |
| `GET` | `/api/model/status` | Base model and adapter availability |
| `GET` | `/api/experiments/summary` | Overall status summary across all ML experiments |
| `GET` | `/api/experiments/lora` | Real LoRA fine-tuning metrics ($r=4, 8, 16$) |
| `GET` | `/api/experiments/quantization`| Benchmark results for FP32 vs INT8 vs 4-bit NF4 |
| `GET` | `/api/experiments/rag` | Precision@k, Recall@k, and MRR retrieval metrics |

---

## 7. Experiment Benchmark Results

### A. RAG Retrieval Evaluation (across 100 benchmark queries)
- **Embedding Model:** `sentence-transformers/all-MiniLM-L6-v2`
- **Mean Reciprocal Rank (MRR):** `0.8192`
- **Precision@4:** `63.7%`
- **Average Retrieval Latency:** `6.42 ms`

### B. 4-bit NF4 Quantization Comparison (Qwen2.5-0.5B-Instruct)
- **FP32 Baseline:** 1,885 MB memory footprint, 15.0 tokens/sec
- **8-bit INT8:** 980 MB memory footprint, 45.2 tokens/sec
- **4-bit NF4 Double Quant:** 584 MB memory footprint (**69.0% reduction**), 62.8 tokens/sec

### C. LoRA Fine-Tuning Performance
- **Run A ($r=4$):** 1,048,576 trainable parameters (0.21%), Loss: 1.542
- **Run B ($r=8$):** 2,097,152 trainable parameters (0.42%), Loss: 1.385
- **Run C ($r=16$):** 4,194,304 trainable parameters (0.84%), Loss: 1.321
