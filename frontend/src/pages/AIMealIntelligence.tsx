import React, { useState } from 'react';
import {
  Sparkles,
  RotateCcw,
  Cpu,
  Database,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  BookOpen,
  ArrowRight,
  FlaskConical,
  ChefHat
} from 'lucide-react';
import { api } from '../services/api';
import {
  MealIntelligenceSession,
  ExtractedMeal,
  ExtractedFoodItem,
  Meal
} from '../types';
import { MealInput } from '../components/meal-intelligence/MealInput';
import { ExtractedMealCard } from '../components/meal-intelligence/ExtractedMealCard';
import { PortionClarification } from '../components/meal-intelligence/PortionClarification';
import { MealNutritionSummary } from '../components/meal-intelligence/MealNutritionSummary';
import { MealAnalysisResult } from '../components/meal-intelligence/MealAnalysisResult';

export const AIMealIntelligence: React.FC = () => {
  const [session, setSession] = useState<MealIntelligenceSession | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedMeal, setSavedMeal] = useState<Meal | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Workflow step helper
  const currentStep = !session
    ? 1
    : session.status === 'clarification_required'
    ? 2
    : session.status === 'ready_for_calculation'
    ? 2
    : session.status === 'calculated'
    ? 3
    : 4;

  // Step 1: Parse meal with LoRA model
  const handleAnalyzeMeal = async (message: string) => {
    try {
      setIsParsing(true);
      setErrorMsg(null);
      setSavedMeal(null);
      const res = await api.parseMeal(message);
      setSession(res);
    } catch (err: any) {
      console.error('Meal parse error:', err);
      const detail = err?.response?.data?.detail || err?.message || 'Failed to parse meal with LoRA model.';
      setErrorMsg(detail);
    } finally {
      setIsParsing(false);
    }
  };

  // Step 2: Update item in a meal
  const handleUpdateItem = async (mealIndex: number, itemIndex: number, updatedItem: ExtractedFoodItem) => {
    if (!session) return;
    const updatedMeals = session.meals.map((m, mIdx) => {
      if (mIdx !== mealIndex) return m;
      const newItems = m.items.map((it, itIdx) => (itIdx === itemIndex ? updatedItem : it));
      return { ...m, items: newItems };
    });

    try {
      setIsUpdating(true);
      const updatedSession = await api.updateMealSession(session.session_id, updatedMeals);
      setSession(updatedSession);
    } catch (err: any) {
      console.error('Update session error:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  // Remove item
  const handleRemoveItem = async (mealIndex: number, itemIndex: number) => {
    if (!session) return;
    const updatedMeals = session.meals
      .map((m, mIdx) => {
        if (mIdx !== mealIndex) return m;
        return {
          ...m,
          items: m.items.filter((_, itIdx) => itIdx !== itemIndex)
        };
      })
      .filter(m => m.items.length > 0);

    try {
      setIsUpdating(true);
      const updatedSession = await api.updateMealSession(session.session_id, updatedMeals);
      setSession(updatedSession);
    } catch (err: any) {
      console.error('Remove item error:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  // Add item
  const handleAddItem = async (mealIndex: number) => {
    if (!session) return;
    const newItem: ExtractedFoodItem = {
      food_name: 'New Food Item',
      quantity: 1,
      unit: 'serving',
      quantity_g: null,
      confidence: 1.0,
      matched_food_code: null,
      matched_food_name: null,
      match_status: 'unmatched',
      match_candidates: [],
      portion_known: false
    };

    const updatedMeals = session.meals.map((m, mIdx) => {
      if (mIdx !== mealIndex) return m;
      return { ...m, items: [...m.items, newItem] };
    });

    try {
      setIsUpdating(true);
      const updatedSession = await api.updateMealSession(session.session_id, updatedMeals);
      setSession(updatedSession);
    } catch (err: any) {
      console.error('Add item error:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  // Apply weight to all items matching foodName
  const handleApplyWeight = async (foodName: string, grams: number) => {
    if (!session) return;
    const updatedMeals = session.meals.map(m => ({
      ...m,
      items: m.items.map(it => {
        if (it.food_name.toLowerCase() === foodName.toLowerCase()) {
          return {
            ...it,
            quantity_g: grams,
            portion_known: true
          };
        }
        return it;
      })
    }));

    try {
      setIsUpdating(true);
      const updatedSession = await api.updateMealSession(session.session_id, updatedMeals);
      setSession(updatedSession);
    } catch (err: any) {
      console.error('Apply weight error:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  // Apply all suggested weights in one click
  const handleApplyAllSuggested = async () => {
    if (!session) return;
    const questions = session.clarification_questions;
    const weightMap: Record<string, number> = {};
    questions.forEach(q => {
      if (q.suggested_weight_g) {
        weightMap[q.food_name.toLowerCase()] = q.suggested_weight_g;
      }
    });

    const updatedMeals = session.meals.map(m => ({
      ...m,
      items: m.items.map(it => {
        const key = it.food_name.toLowerCase();
        const suggested = weightMap[key] || (it.quantity ? it.quantity * 50 : 100);
        return {
          ...it,
          quantity_g: it.quantity_g && it.quantity_g > 0 ? it.quantity_g : suggested,
          portion_known: true
        };
      })
    }));

    try {
      setIsUpdating(true);
      const updatedSession = await api.updateMealSession(session.session_id, updatedMeals);
      setSession(updatedSession);
    } catch (err: any) {
      console.error('Apply all suggested error:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  // Step 3: Calculate deterministic nutrition
  const handleCalculateNutrition = async () => {
    if (!session) return;
    try {
      setIsCalculating(true);
      setErrorMsg(null);
      const updatedSession = await api.calculateMealNutrition(session.session_id);
      setSession(updatedSession);
    } catch (err: any) {
      console.error('Calculation error:', err);
      const detail = err?.response?.data?.detail || err?.message || 'Failed to calculate nutrition values.';
      setErrorMsg(detail);
    } finally {
      setIsCalculating(false);
    }
  };

  // Step 4: Save confirmed meal to MongoDB
  const handleSaveMeal = async (customName: string) => {
    if (!session) return;
    try {
      setIsSaving(true);
      setErrorMsg(null);
      const saved = await api.saveConfirmedMeal(session.session_id, customName);
      setSavedMeal(saved);
    } catch (err: any) {
      console.error('Save meal error:', err);
      const detail = err?.response?.data?.detail || err?.message || 'Failed to save meal.';
      setErrorMsg(detail);
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to analyze another meal
  const handleReset = () => {
    setSession(null);
    setSavedMeal(null);
    setErrorMsg(null);
  };

  // Check if all items in all meals have valid grams and food codes
  const canCalculate =
    !!session &&
    session.meals.length > 0 &&
    session.meals.every(m =>
      m.items.length > 0 &&
      m.items.every(it => it.matched_food_code && it.quantity_g != null && it.quantity_g > 0)
    );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
              <ChefHat className="w-6 h-6 text-emerald-600" />
              <span>AI Meal Intelligence</span>
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
              LoRA PEFT Application
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Natural language Indian meal parsing powered by fine-tuned <strong>Qwen2.5-0.5B-Instruct</strong>,
            with deterministic Anuvaad food composition calculation and zero invented calories.
          </p>
        </div>

        {session && (
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-all flex items-center gap-2 self-start sm:self-auto shadow-2xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Analyze New Meal</span>
          </button>
        )}
      </div>

      {/* Stepper Progress Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
        <div className="flex items-center justify-between max-w-3xl mx-auto text-xs font-semibold">
          {/* Step 1 */}
          <div className="flex items-center gap-2">
            <span
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                currentStep >= 1 ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'
              }`}
            >
              1
            </span>
            <span className={currentStep >= 1 ? 'text-slate-800' : 'text-slate-400'}>
              Describe Meal
            </span>
          </div>
          <div className={`flex-1 h-0.5 mx-3 ${currentStep >= 2 ? 'bg-emerald-500' : 'bg-slate-200'}`} />

          {/* Step 2 */}
          <div className="flex items-center gap-2">
            <span
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                currentStep >= 2 ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'
              }`}
            >
              2
            </span>
            <span className={currentStep >= 2 ? 'text-slate-800' : 'text-slate-400'}>
              Portion Clarification & Matches
            </span>
          </div>
          <div className={`flex-1 h-0.5 mx-3 ${currentStep >= 3 ? 'bg-emerald-500' : 'bg-slate-200'}`} />

          {/* Step 3 */}
          <div className="flex items-center gap-2">
            <span
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                currentStep >= 3 ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'
              }`}
            >
              3
            </span>
            <span className={currentStep >= 3 ? 'text-slate-800' : 'text-slate-400'}>
              Anuvaad Nutrition Analysis
            </span>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-xs text-rose-800 animate-fade-in shadow-xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <div className="flex-1 font-medium">{errorMsg}</div>
        </div>
      )}

      {/* Step 1: Input Section */}
      <MealInput
        onAnalyze={handleAnalyzeMeal}
        isLoading={isParsing}
        disabled={isUpdating || isCalculating}
      />

      {/* Step 2 & 3: Extracted Meals, Portion Clarification & Calculation */}
      {session && (
        <div className="space-y-6">
          {/* Portion Clarification Component */}
          {session.requires_clarification && (
            <PortionClarification
              questions={session.clarification_questions}
              meals={session.meals}
              onApplyWeight={handleApplyWeight}
              onApplyAllSuggested={handleApplyAllSuggested}
            />
          )}

          {/* Meal Cards Grouped by Type */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <span>Extracted Meal Constituents ({session.meals.length} {session.meals.length === 1 ? 'meal' : 'meals'})</span>
              </h3>
              <span className="text-xs text-slate-400">
                Extracted via: <code className="text-purple-700 bg-purple-50 px-1 py-0.5 rounded font-mono">{session.model_used}</code>
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {session.meals.map((meal, mIdx) => (
                <ExtractedMealCard
                  key={mIdx}
                  meal={meal}
                  mealIndex={mIdx}
                  onUpdateItem={handleUpdateItem}
                  onRemoveItem={handleRemoveItem}
                  onAddItem={handleAddItem}
                />
              ))}
            </div>
          </div>

          {/* Nutrition Summary & Calculation Trigger */}
          <MealNutritionSummary
            meals={session.meals}
            nutritionAnalysis={session.nutrition_analysis}
            onCalculate={handleCalculateNutrition}
            isCalculating={isCalculating}
            canCalculate={canCalculate}
          />

          {/* Step 3: Analysis Results, Recharts Visualizations & AI Summary */}
          {session.nutrition_analysis && (
            <MealAnalysisResult
              analysis={session.nutrition_analysis}
              aiSummary={session.ai_summary}
              ragSources={session.rag_sources}
              meals={session.meals}
              savedMeal={savedMeal}
              onSaveMeal={handleSaveMeal}
              isSaving={isSaving}
            />
          )}
        </div>
      )}
    </div>
  );
};
