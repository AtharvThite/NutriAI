import axios from 'axios';
import {
  FoodItem,
  NutritionAnalysis,
  MealItemInput,
  Meal,
  ChatMessage,
  SystemHealth,
  ExperimentSummary,
  LoRAResults,
  QuantizationResults,
  QLoRAResults,
  RAGMetrics,
  MealIntelligenceSession,
  ExtractedMeal,
  MealMatchCandidate,
  MealIntelligenceEvalReport,
  User,
  AuthResponse,
  LoginCredentials,
  SignupCredentials
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 45000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Automatically inject JWT token into outgoing requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('nutriai_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const api = {
  // System Health & Status
  async getHealth(): Promise<SystemHealth> {
    const res = await apiClient.get<SystemHealth>('/health');
    return res.data;
  },

  async getRagStatus(): Promise<any> {
    const res = await apiClient.get('/rag/status');
    return res.data;
  },

  async getModelStatus(): Promise<any> {
    const res = await apiClient.get('/model/status');
    return res.data;
  },

  // Foods
  async getFoods(skip = 0, limit = 50): Promise<FoodItem[]> {
    const res = await apiClient.get<FoodItem[]>('/foods', { params: { skip, limit } });
    return res.data;
  },

  async searchFoods(query: string, limit = 20): Promise<FoodItem[]> {
    const res = await apiClient.get<FoodItem[]>('/foods/search', { params: { q: query, limit } });
    return res.data;
  },

  async getFoodDetail(foodCode: string): Promise<FoodItem> {
    const res = await apiClient.get<FoodItem>(`/foods/${foodCode}`);
    return res.data;
  },

  // Nutrition Analysis
  async analyzeNutrition(items: MealItemInput[]): Promise<NutritionAnalysis> {
    const payload = {
      items: items.map(item => ({
        food_code: item.food_code,
        quantity_g: Number(item.quantity_g)
      }))
    };
    const res = await apiClient.post<NutritionAnalysis>('/nutrition/analyze', payload);
    return res.data;
  },

  // Meals
  async createMeal(meal_name: string, items: MealItemInput[]): Promise<Meal> {
    const payload = {
      meal_name,
      items: items.map(item => ({
        food_code: item.food_code,
        quantity_g: Number(item.quantity_g)
      }))
    };
    const res = await apiClient.post<Meal>('/meals', payload);
    return res.data;
  },

  async getMeals(limit = 50): Promise<Meal[]> {
    const res = await apiClient.get<Meal[]>('/meals', { params: { limit } });
    return res.data;
  },

  async getMeal(mealId: string): Promise<Meal> {
    const res = await apiClient.get<Meal>(`/meals/${mealId}`);
    return res.data;
  },

  async deleteMeal(mealId: string): Promise<void> {
    await apiClient.delete(`/meals/${mealId}`);
  },

  // AI Nutrition Chat
  async sendChatMessage(message: string, modelProvider: 'lora' | 'groq' = 'lora', sessionId?: string): Promise<{
    answer: string;
    sources: any[];
    requires_clarification: boolean;
    intent?: string;
  }> {
    const res = await apiClient.post('/chat', {
      message,
      model_provider: modelProvider,
      session_id: sessionId
    });
    return res.data;
  },

  // Experiments
  async getExperimentSummary(): Promise<ExperimentSummary> {
    const res = await apiClient.get<ExperimentSummary>('/experiments/summary');
    return res.data;
  },

  async getLoRAResults(): Promise<LoRAResults> {
    const res = await apiClient.get<LoRAResults>('/experiments/lora');
    return res.data;
  },

  async getQuantizationResults(): Promise<QuantizationResults> {
    const res = await apiClient.get<QuantizationResults>('/experiments/quantization');
    return res.data;
  },

  async getQLoRAResults(): Promise<QLoRAResults> {
    const res = await apiClient.get<QLoRAResults>('/experiments/qlora');
    return res.data;
  },

  async getRAGMetrics(): Promise<RAGMetrics> {
    const res = await apiClient.get<RAGMetrics>('/experiments/rag');
    return res.data;
  },

  // AI Meal Intelligence
  async parseMeal(message: string): Promise<MealIntelligenceSession> {
    const res = await apiClient.post<MealIntelligenceSession>('/meal-intelligence/parse', { message });
    return res.data;
  },

  async matchFoods(query: string, limit = 5): Promise<MealMatchCandidate[]> {
    const res = await apiClient.post<{ query: string; matches: MealMatchCandidate[] }>('/meal-intelligence/match-foods', {
      query,
      limit
    });
    return res.data.matches;
  },

  async getMealSession(sessionId: string): Promise<MealIntelligenceSession> {
    const res = await apiClient.get<MealIntelligenceSession>(`/meal-intelligence/${sessionId}`);
    return res.data;
  },

  async updateMealSession(sessionId: string, meals: ExtractedMeal[]): Promise<MealIntelligenceSession> {
    const res = await apiClient.put<MealIntelligenceSession>(`/meal-intelligence/${sessionId}`, { meals });
    return res.data;
  },

  async calculateMealNutrition(sessionId: string): Promise<MealIntelligenceSession> {
    const res = await apiClient.post<MealIntelligenceSession>(`/meal-intelligence/${sessionId}/calculate`);
    return res.data;
  },

  async saveConfirmedMeal(sessionId: string, mealName?: string): Promise<Meal> {
    const res = await apiClient.post<Meal>(`/meal-intelligence/${sessionId}/save`, { meal_name: mealName });
    return res.data;
  },

  async getMealIntelligenceEvaluation(): Promise<MealIntelligenceEvalReport> {
    const res = await apiClient.get<MealIntelligenceEvalReport>('/meal-intelligence/evaluation/report');
    return res.data;
  },

  // Authentication
  async signup(credentials: SignupCredentials): Promise<AuthResponse> {
    const res = await apiClient.post<AuthResponse>('/auth/signup', credentials);
    return res.data;
  },

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const res = await apiClient.post<AuthResponse>('/auth/login', credentials);
    return res.data;
  },

  async getMe(): Promise<User> {
    const res = await apiClient.get<User>('/auth/me');
    return res.data;
  },

  async logout(): Promise<{ success: boolean; message: string }> {
    try {
      const res = await apiClient.post('/auth/logout');
      return res.data;
    } catch {
      return { success: true, message: 'Logged out' };
    }
  },

  async updateProfile(updates: Partial<User>): Promise<User> {
    const res = await apiClient.put<User>('/auth/profile', updates);
    return res.data;
  }
};
