export interface FoodItem {
  food_code: string;
  food_name: string;
  nutrition_basis: string;
  energy_kcal?: number | null;
  protein_g?: number | null;
  carb_g?: number | null;
  fat_g?: number | null;
  fibre_g?: number | null;
  servings_unit?: string | null;
  nutrients?: Record<string, number | null>;
  serving_nutrients?: Record<string, number | null>;
}

export interface MealItemInput {
  food_code: string;
  quantity_g: number;
  food_name?: string;
  servings_unit?: string | null;
}

export interface ItemNutrientBreakdown {
  food_code: string;
  food_name: string;
  quantity_g: number;
  nutrients: Record<string, number | null>;
}

export interface MacronutrientRatios {
  carb_energy_pct: number;
  protein_energy_pct: number;
  fat_energy_pct: number;
}

export interface NutritionAnalysis {
  total_weight_g: number;
  total_nutrients: Record<string, number | null>;
  items_breakdown: ItemNutrientBreakdown[];
  macronutrient_ratios: MacronutrientRatios;
}

export interface Meal {
  meal_id: string;
  meal_name: string;
  total_weight_g: number;
  items: ItemNutrientBreakdown[];
  total_nutrients: Record<string, number | null>;
  macronutrient_ratios: MacronutrientRatios;
  created_at: string;
}

export interface ChatSource {
  document_id: string;
  title: string;
  snippet?: string | null;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: ChatSource[];
  requires_clarification?: boolean;
  intent?: string | null;
  timestamp: string;
}

export interface SystemHealth {
  status: string;
  database: {
    mongodb_connected: boolean;
  };
  rag: {
    ready: boolean;
  };
  hardware: {
    cuda_available: boolean;
    device: string;
    vram_gb: number;
  };
}

export interface ExperimentSummary {
  lora_status: string;
  qlora_status: string;
  quantization_status: string;
  rag_status: string;
  documents_indexed: number;
  foods_indexed: number;
  gpu_available: boolean;
  cuda_device: string;
}

export interface LoRARun {
  run_name: string;
  learning_rate: number;
  epochs: number;
  lora_r: number;
  lora_alpha: number;
  trainable_parameters: number;
  all_parameters: number;
  trainable_percentage: number;
  training_loss: number;
  training_time_seconds: number;
}

export interface LoRAResults {
  status: string;
  base_model: string;
  best_run?: string;
  runs: LoRARun[];
  evaluation_samples?: Array<{ prompt: string; expected: string }>;
}

export interface QuantizationBenchmark {
  precision: string;
  status: string;
  model_size_mb: number;
  memory_allocated_mb: number;
  memory_reserved_mb: number;
  latency_seconds: number;
  tokens_per_second: number;
  sample_output?: string;
}

export interface QuantizationResults {
  status: string;
  base_model: string;
  hardware_environment?: {
    device: string;
    device_name?: string;
    cuda_available: boolean;
    vram_gb: number;
    bitsandbytes: boolean;
  };
  benchmarks: QuantizationBenchmark[];
  comparisons?: {
    memory_reduction_4bit_pct: number;
    throughput_gain_pct: number;
    best_precision_for_edge: string;
  };
}

export interface QLoRAResults {
  status: string;
  base_model: string;
  quantization: string;
  double_quant?: boolean;
  lora_rank?: number;
  lora_alpha?: number;
  target_modules?: string[];
  base_model_status?: string;
  trainable_parameters: number;
  all_parameters: number;
  trainable_percentage: number;
  training_loss: number;
  training_time_seconds?: number;
  training_samples?: number;
  vram_allocated_mb?: number;
  vram_reserved_mb?: number;
  gpu_vram_saving_pct: number;
  device?: string;
  device_name?: string;
  adapter_saved_path?: string;
  timestamp?: string;
}

export interface RAGMetrics {
  status: string;
  total_documents: number;
  total_chunks: number;
  eval_queries_count?: number;
  embedding_model: string;
  vector_store: string;
  precision_at_k: number;
  recall_at_k: number;
  mrr: number;
  avg_latency_ms: number;
  query_evaluations?: Array<{
    question: string;
    expected_ids: string[];
    retrieved_ids: string[];
    precision_at_k: number;
    recall_at_k: number;
    reciprocal_rank: number;
    latency_ms: number;
  }>;
}

// AI Meal Intelligence Types
export interface MealMatchCandidate {
  food_code: string;
  food_name: string;
  nutrition_basis: string;
  energy_kcal?: number | null;
  protein_g?: number | null;
  carb_g?: number | null;
  fat_g?: number | null;
  fibre_g?: number | null;
  servings_unit?: string | null;
  match_score?: number | null;
}

export interface ExtractedFoodItem {
  food_name: string;
  quantity?: number | null;
  unit?: string | null;
  quantity_g?: number | null;
  confidence?: number | null;
  matched_food_code?: string | null;
  matched_food_name?: string | null;
  match_status: 'matched' | 'ambiguous' | 'not_found' | 'unmatched';
  match_candidates: MealMatchCandidate[];
  portion_known: boolean;
}

export interface ExtractedMeal {
  meal_type: string;
  items: ExtractedFoodItem[];
}

export interface ClarificationQuestion {
  food_name: string;
  question: string;
  suggested_weight_g?: number | null;
  answered: boolean;
}

export interface RAGSourceRef {
  document_id: string;
  title: string;
  snippet?: string | null;
}

export interface MealIntelligenceSession {
  session_id: string;
  raw_input: string;
  status: 'clarification_required' | 'ready_for_calculation' | 'calculated' | 'saved';
  model_used: string;
  meals: ExtractedMeal[];
  requires_clarification: boolean;
  clarification_questions: ClarificationQuestion[];
  nutrition_analysis?: NutritionAnalysis | null;
  ai_summary?: string | null;
  rag_sources: RAGSourceRef[];
  saved_meal_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface MealIntelligenceEvalReport {
  status: string;
  base_model_name: string;
  lora_adapter: string;
  total_test_scenarios: number;
  base_model_metrics: {
    model: string;
    food_identification_acc: number;
    quantity_extraction_acc: number;
    unit_extraction_acc: number;
    meal_type_acc: number;
    clarification_detection_acc: number;
    json_validity_rate: number;
    unsupported_assumptions_rate: number;
    avg_latency_ms: number;
  };
  lora_model_metrics: {
    model: string;
    food_identification_acc: number;
    quantity_extraction_acc: number;
    unit_extraction_acc: number;
    meal_type_acc: number;
    clarification_detection_acc: number;
    json_validity_rate: number;
    unsupported_assumptions_rate: number;
    avg_latency_ms: number;
  };
  comparison_table: Array<{
    metric: string;
    base_model: string;
    lora_model: string;
    delta: string;
    description: string;
  }>;
  sample_evaluations: Array<{
    prompt: string;
    base_model_output: string;
    lora_model_output: string;
  }>;
  timestamp: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  dietary_preference: string;
  daily_calorie_target: number;
  created_at?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
  message?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupCredentials {
  email: string;
  password: string;
  full_name: string;
  dietary_preference?: string;
  daily_calorie_target?: number;
}
