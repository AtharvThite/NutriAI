# NutriAI – AI-Powered Indian Food Nutrition Checker

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19.0+-61DAFB.svg?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-Local%20%7C%20Atlas-47A248.svg?logo=mongodb&logoColor=white)](https://www.mongodb.com)
[![Qdrant](https://img.shields.io/badge/Qdrant-Cloud%20%7C%20Vector-DC2626.svg)](https://qdrant.tech)
[![PyTorch](https://img.shields.io/badge/PyTorch-PEFT%20%7C%20LoRA-EE4C2C.svg?logo=pytorch&logoColor=white)](https://pytorch.org)

NutriAI is a comprehensive full-stack AI/ML health-tech application designed for Indian food nutrition assessment, interactive meal building, conversational dietary guidance, and **Smart Food Alternatives discovery**. It incorporates deterministic numerical calculations based on verified laboratory data alongside cutting-edge LLM techniques: **Retrieval-Augmented Generation (RAG)**, **LoRA Fine-Tuning**, and **4-bit NF4 Quantization (QLoRA)**.

---

## 1. System Architecture

```
                                  USER
                                    │
                                    ▼
                             REACT FRONTEND
                     (Vite + TypeScript + Tailwind)
                                    │
                               Axios (REST)
                                    │
                                    ▼
                             FASTAPI BACKEND
                                    │
                 ┌──────────────────┼──────────────────┐
                 ▼                  ▼                  ▼
              MongoDB             Qdrant            LLM / PEFT
           (1,014 Foods)       (Vector RAG)       (Qwen2.5-0.5B)
                 │                  │                  │
                 ▼                  ▼            ┌─────┴─────┐
           Food Records            RAG           │           │
                 │                  │          LoRA        QLoRA
                 ▼                  │       (Intent)    (Quantized)
      Deterministic Calculator      │
      [N = (N_per100g * W) / 100]   │
                 │                  │
                 └─────────┬────────┘
                           ▼
             Smart Food Alternatives Engine
             • LoRA Natural Language Intent Parsing
             • Deterministic Multi-Objective Ranking
             • Side-by-Side Macro/Micro Deltas
             • Evidence-Backed RAG Clinical Explanations
             • Persistent MongoDB Saved Comparisons
```

### Key Architectural Tenets
1. **Deterministic Arithmetic:** LLMs are never used for nutrient calculations. All calorie and nutrient calculations use exact laboratory data from the Anuvaad Indian Food Composition Database ($N_{\text{consumed}} = (N_{\text{per } 100\text{g}} \times W) / 100$).
2. **Strict RAG Grounding:** The conversational and alternative explanation systems query 20 educational documents in Qdrant across 104 vector chunks. If evidence is lacking, the system clearly states that evidence-based citations are unavailable rather than hallucinating dietary advice.
3. **Decoupled Offline ML:** LoRA training, quantization benchmarking, and evaluation scripts run independently from HTTP request paths to guarantee fast responses.
4. **Targeted Indexed Database Queries:** Nutritional alternative searches use compound B-tree indexes (`energy_kcal`, `protein_g`, `carb_g`, `fibre_g`) and dietary pre-filters to query targeted subsets (down from full 1,014 collection scans).

---

## 2. Core Features

### A. Smart Food Alternatives
- **Natural Language Intent Parsing (LoRA):** Converts conversational queries (e.g. *"Find a higher protein veg alternative for chicken"*) into structured targets: baseline food, optimization objective, dietary preferences, and comparison criteria.
- **Transparent Multi-Objective Recommendation:**
  - `similar`: Minimizes normalized weighted Euclidean distance with continuous exponential decay ($99.0 \times e^{-1.5 \times \text{dist}}$).
  - `higher_protein`: Identifies alternatives with superior protein density (supports plant-based protein swaps for meat).
  - `lower_calorie`: Discovers calorie-reduced alternatives without penalizing essential macronutrients.
  - `higher_fibre`: Prioritizes dietary fibre density for digestive satiety and gut health.
  - `lower_carb`: Surfaces lower carbohydrate options for postprandial glycemic moderation.
- **Dietary & Culinary Classification:** Deterministically classifies Anuvaad foods into *Vegetarian*, *Vegan*, or *Non-Vegetarian*, as well as 8 standardized culinary groups.
- **Side-by-Side Nutrient Comparison & Recharts Visualization:** Displays gram-scaled macro and micronutrient deltas with favorable/unfavorable highlighting.
- **Grounded RAG Clinical Explanations:** Explains the physiological mechanisms of nutrient shifts with collapsible Qdrant knowledge source badges.
- **Saved Comparisons:** Persists comparisons in MongoDB with revisit, review, and delete actions.

### B. Nutrition Checker & Meal Intelligence
- Substring and autocomplete search across 1,014 Anuvaad Indian food records.
- Deterministic analysis of 39 macro and micronutrients based on input gram weights.
- Visual breakdown of Energy, Protein, Carbohydrates, Fat, and Dietary Fibre.

### C. Conversational RAG Dietary Assistant
- Multi-intent routing across nutritional queries, meal planning, and health topics.
- Grounded citations linking answers to verified knowledge base documents.

---

## 3. Adaptation of Reference Experiment Code

NutriAI refactors and adapts baseline experiment implementations:

| Original Source | NutriAI Module | Adaptations |
| :--- | :--- | :--- |
| **`support_rag.py`** (Exp 6/7 FAQ RAG) | `backend/app/services/rag_service.py` & `backend/app/services/alternative_explanation_service.py` | • Replaced customer support FAQ text with **20 NutriAI TXT documents**.<br>• Preserved document IDs, titles, and section metadata.<br>• Adapted intent classification to nutrition categories.<br>• Retained LangGraph state graph (`classify_intent` &rarr; `retrieve` &rarr; `draft_answer` &rarr; `review_answer` &rarr; `rewrite_query` &rarr; `fallback`).<br>• Initialized embeddings and retriever once on FastAPI lifespan startup.<br>• Added Qdrant Cloud cluster support with FAISS local fallback. |
| **`2023300247_LLM_Exp2.ipynb`** (LoRA) | `backend/ml/finetuning/train_lora.py` & `backend/app/services/food_alternative_service.py` | • Replaced RecipeNLG with `nutrition_train.jsonl` and `nutrition_validation.jsonl`.<br>• Preserved `LoraConfig` ($r=4, 8, 16$, $\alpha=16, 32$, `q_proj, v_proj`).<br>• Applied LoRA adapter for zero-shot natural language intent parsing.<br>• Exported adapter weights to `backend/artifacts/lora_adapter/`.<br>• Logged verified training loss and parameters to `lora_results.json`. |
| **`2023300247_LLM_Exp_3.ipynb`** (Quant & QLoRA) | `backend/ml/quantization/benchmark_quantization.py` & `backend/ml/finetuning/train_qlora.py` | • Replaced RecipeNLG with NutriAI instruction dataset.<br>• Implemented 4-bit NF4 double quantization and INT8 evaluation.<br>• Benchmarked model parameter footprint, generation latency, and tokens/sec throughput.<br>• Saved verified benchmarks to `quantization_results.json` and `qlora_results.json`. |

---

## 4. Verified Datasets & Knowledge Base

- **Structured Nutrition Data:** `backend/datasets/structured/Anuvaad_INDB_2024.11.xlsx` (1,014 verified Indian foods, 39 nutrients per 100g, imported into MongoDB collection `foods`).
- **Knowledge Base:** 20 standalone UTF-8 `.txt` documents in `backend/knowledge_base/` covering Macronutrients, Micronutrients, Balanced Diets, Traditional Indian Cooking, and Limitations.
- **LoRA Datasets:** `nutrition_train.jsonl`, `nutrition_validation.jsonl`, `nutrition_test.jsonl` in `backend/datasets/finetuning/`.
- **Evaluation Datasets:** `rag_eval.jsonl` (100 benchmark queries), `model_eval.jsonl`, `rag_query_expansion.jsonl`, and `food_alternatives_eval.json` in `backend/artifacts/experiment_results/`.

---

## 5. Setup & Running Instructions

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

# Evaluate Smart Food Alternatives benchmarks
python scripts/evaluate_alternatives.py

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

## 6. Qdrant Configuration (Local, Container, or Cloud)

NutriAI supports both local vector storage and Qdrant Cloud clusters.

### Using Qdrant Cloud Cluster Credentials
To connect NutriAI to your remote Qdrant Cloud cluster, update `backend/.env`:
```env
QDRANT_URL=https://your-cluster-id.us-east4-0.gcp.cloud.qdrant.io:6333
QDRANT_API_KEY=your_qdrant_api_key_here
QDRANT_COLLECTION=nutriai_knowledge
```
Re-run `python ml/rag/ingest.py` to upload the 104 vector chunks directly to your Qdrant Cloud collection.

### Offline / Local Development Fallback
If `QDRANT_URL` is omitted or uncontactable, NutriAI seamlessly utilizes the local FAISS index stored in `backend/artifacts/faiss_index/`.

---

## 7. API Reference

### Core Nutrition & Meal Endpoints
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

### Smart Food Alternatives Endpoints
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/alternatives/search?q={query}` | Autocomplete search for baseline Indian food records |
| `POST` | `/api/alternatives/recommend` | Ranked alternatives based on objective, diet, and nutrient criteria |
| `POST` | `/api/alternatives/compare` | Multi-food side-by-side nutrient profile comparison on common gram basis |
| `POST` | `/api/alternatives/explain` | Synthesize RAG-grounded clinical explanation citing Qdrant sources |
| `POST` | `/api/alternatives/parse-request` | LoRA intent parsing converting natural language queries into structured parameters |
| `GET` | `/api/alternatives/saved` | Retrieve user's saved food comparisons history |
| `POST` | `/api/alternatives/saved` | Persist a food alternative comparison to MongoDB |
| `DELETE`| `/api/alternatives/saved/{id}` | Remove a saved comparison record |

### Experiment Benchmarks Endpoints
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/experiments/summary` | Overall status summary across all ML experiments |
| `GET` | `/api/experiments/lora` | Real LoRA fine-tuning metrics ($r=4, 8, 16$) |
| `GET` | `/api/experiments/quantization`| Benchmark results for FP32 vs INT8 vs 4-bit NF4 |
| `GET` | `/api/experiments/rag` | Precision@k, Recall@k, and MRR retrieval metrics |
| `GET` | `/api/experiments/alternatives`| Benchmark metrics for Smart Food Alternatives pipeline |

---

## 8. Experiment Benchmark Results

### A. Smart Food Alternatives Evaluation
- **LoRA Intent Objective Accuracy:** `100.0%`
- **LoRA Dietary Preference Accuracy:** `100.0%`
- **LoRA Food Extraction Accuracy:** `100.0%`
- **LoRA Inference Latency:** `~900 ms`
- **RAG Knowledge Retrieval MRR:** `0.767`
- **RAG Retrieval Latency:** `~279 ms`
- **Deterministic Numerical Scoring Latency:** `84.4 ms`
- **Targeted MongoDB Candidate Scan:** Filtered down to ~77–123 candidates using nutrient B-tree indexes (avoiding 1,014 full collection scans).

### B. RAG Retrieval Evaluation (across 100 benchmark queries)
- **Vector Store:** FAISS index / Qdrant Cloud (`nutriai_knowledge`, 20 documents, 104 chunks)
- **Embedding Model:** `sentence-transformers/all-MiniLM-L6-v2`
- **Mean Reciprocal Rank (MRR):** `0.8192`
- **Precision@4:** `63.75%`
- **Recall@4:** `2.0867`
- **Average Retrieval Latency:** `373.99 ms`

### C. 4-bit NF4 Quantization Comparison (Qwen2.5-0.5B-Instruct on RTX 3050 Laptop GPU)
- **FP16 Baseline:** 942.29 MB model size, 950.17 MB memory allocated, 33.36 tokens/sec, latency 1.799s
- **8-bit INT8:** 601.04 MB model size, 602.23 MB memory allocated, 5.43 tokens/sec, latency 11.054s
- **4-bit NF4 Double Quant:** 430.42 MB model size, 436.29 MB memory allocated (**54.3% memory reduction**), 31.03 tokens/sec, latency 1.934s

### D. LoRA Fine-Tuning Performance (Qwen2.5-0.5B-Instruct)
- **Run A ($r=4, \alpha=16$):** 270,336 trainable parameters (0.0547%), Training Loss: 3.2041, Training Time: 33.07s
- **Run B ($r=8, \alpha=16$):** 540,672 trainable parameters (0.1093%), Training Loss: 3.2121, Training Time: 32.65s
- **Meal Intelligence Benchmark:** LoRA Food Identification Accuracy: **95.0%** (vs Base Zero-Shot: **72.5%**, $+22.5\%$ improvement)
