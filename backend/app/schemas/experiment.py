from typing import List, Dict, Optional, Any
from pydantic import BaseModel

class ExperimentSummary(BaseModel):
    lora_status: str
    qlora_status: str
    quantization_status: str
    rag_status: str
    documents_indexed: int
    foods_indexed: int
    gpu_available: bool
    cuda_device: Optional[str] = None

class LoRAExperimentRun(BaseModel):
    run_name: str
    learning_rate: float
    epochs: int
    lora_r: int
    lora_alpha: int
    trainable_parameters: int
    all_parameters: int
    trainable_percentage: float
    training_loss: float
    training_time_seconds: float
    eval_loss: Optional[float] = None

class LoRAResultsResponse(BaseModel):
    base_model: str
    runs: List[LoRAExperimentRun]
    best_run: Optional[str] = None
    evaluation_samples: List[Dict[str, Any]] = []

class QuantizationBenchmark(BaseModel):
    precision: str
    model_size_mb: float
    memory_allocated_mb: float
    memory_reserved_mb: float
    latency_seconds: float
    tokens_per_second: float
    sample_output: str

class QuantizationResultsResponse(BaseModel):
    base_model: str
    benchmarks: List[QuantizationBenchmark]
    comparisons: Dict[str, Any]

class RAGMetricsResponse(BaseModel):
    total_documents: int
    total_chunks: int
    embedding_model: str
    vector_store: str
    precision_at_k: float
    recall_at_k: float
    mrr: float
    avg_latency_ms: float
    eval_queries_count: int
