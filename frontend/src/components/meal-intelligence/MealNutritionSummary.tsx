import React from 'react';
import {
  Flame,
  Dumbbell,
  Wheat,
  Droplet,
  Salad,
  Sparkles,
  Calculator,
  Loader2,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { ExtractedMeal, NutritionAnalysis } from '../../types';

interface MealNutritionSummaryProps {
  meals: ExtractedMeal[];
  nutritionAnalysis?: NutritionAnalysis | null;
  onCalculate: () => Promise<void>;
  isCalculating: boolean;
  canCalculate: boolean;
}

export const MealNutritionSummary: React.FC<MealNutritionSummaryProps> = ({
  meals,
  nutritionAnalysis,
  onCalculate,
  isCalculating,
  canCalculate
}) => {
  const totalItems = meals.reduce((sum, m) => sum + m.items.length, 0);
  const itemsWithGrams = meals.reduce(
    (sum, m) => sum + m.items.filter(it => it.portion_known && it.quantity_g && it.quantity_g > 0).length,
    0
  );
  const missingCount = totalItems - itemsWithGrams;

  const totalCalories = nutritionAnalysis?.total_nutrients?.energy_kcal;
  const totalProtein = nutritionAnalysis?.total_nutrients?.protein_g;
  const totalCarbs = nutritionAnalysis?.total_nutrients?.carb_g;
  const totalFat = nutritionAnalysis?.total_nutrients?.fat_g;
  const totalFibre = nutritionAnalysis?.total_nutrients?.fibre_g;
  const ratios = nutritionAnalysis?.macronutrient_ratios;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-5 transition-all">
      {/* Top Banner: Calculation Readiness */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-600 text-white shadow-xs">
              <Calculator className="w-4 h-4" />
            </span>
            <h3 className="text-base font-bold text-slate-800">
              Deterministic Nutrition Calculator
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Formula: <code className="text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded font-mono">N = (N_100g × Weight_g) / 100</code>.
            NutriAI strictly preserves verified laboratory data from Anuvaad without LLM approximation.
          </p>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCalculate}
            disabled={!canCalculate || isCalculating}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold text-sm shadow-md shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 transform active:scale-98"
          >
            {isCalculating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Calculating Actual Nutrition...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Calculate Meal Nutrition</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Status Alert if items are missing grams */}
      {!canCalculate && missingCount > 0 && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2.5 text-xs text-amber-900 animate-fade-in">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>{missingCount} {missingCount === 1 ? 'item requires' : 'items require'} portion weight in grams</strong> before calculation.
            Please review the clarification prompts above or enter measured grams.
          </span>
        </div>
      )}

      {/* KPI Cards (When calculated) */}
      {nutritionAnalysis && (
        <div className="space-y-4 pt-1 animate-fade-in">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {/* Calories */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50/40 border border-amber-200/80 rounded-xl p-3.5 text-center shadow-xs">
              <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-amber-800 uppercase tracking-wider">
                <Flame className="w-3.5 h-3.5 text-amber-600" />
                <span>Calories</span>
              </div>
              <div className="text-xl font-extrabold text-amber-950 mt-1">
                {totalCalories ? roundNumber(totalCalories, 1) : 'N/A'}
              </div>
              <div className="text-[10px] text-amber-800/70">kcal consumed</div>
            </div>

            {/* Protein */}
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50/40 border border-emerald-200/80 rounded-xl p-3.5 text-center shadow-xs">
              <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">
                <Dumbbell className="w-3.5 h-3.5 text-emerald-600" />
                <span>Protein</span>
              </div>
              <div className="text-xl font-extrabold text-emerald-950 mt-1">
                {totalProtein ? `${roundNumber(totalProtein, 1)}g` : 'N/A'}
              </div>
              <div className="text-[10px] text-emerald-800/70">
                {ratios ? `${ratios.protein_energy_pct}% energy` : 'grams'}
              </div>
            </div>

            {/* Carbs */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50/40 border border-blue-200/80 rounded-xl p-3.5 text-center shadow-xs">
              <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-blue-800 uppercase tracking-wider">
                <Wheat className="w-3.5 h-3.5 text-blue-600" />
                <span>Carbs</span>
              </div>
              <div className="text-xl font-extrabold text-blue-950 mt-1">
                {totalCarbs ? `${roundNumber(totalCarbs, 1)}g` : 'N/A'}
              </div>
              <div className="text-[10px] text-blue-800/70">
                {ratios ? `${ratios.carb_energy_pct}% energy` : 'grams'}
              </div>
            </div>

            {/* Fat */}
            <div className="bg-gradient-to-br from-rose-50 to-pink-50/40 border border-rose-200/80 rounded-xl p-3.5 text-center shadow-xs">
              <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-rose-800 uppercase tracking-wider">
                <Droplet className="w-3.5 h-3.5 text-rose-600" />
                <span>Fat</span>
              </div>
              <div className="text-xl font-extrabold text-rose-950 mt-1">
                {totalFat ? `${roundNumber(totalFat, 1)}g` : 'N/A'}
              </div>
              <div className="text-[10px] text-rose-800/70">
                {ratios ? `${ratios.fat_energy_pct}% energy` : 'grams'}
              </div>
            </div>

            {/* Fibre */}
            <div className="bg-gradient-to-br from-teal-50 to-emerald-50/40 border border-teal-200/80 rounded-xl p-3.5 text-center shadow-xs col-span-2 sm:col-span-1">
              <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-teal-800 uppercase tracking-wider">
                <Salad className="w-3.5 h-3.5 text-teal-600" />
                <span>Dietary Fibre</span>
              </div>
              <div className="text-xl font-extrabold text-teal-950 mt-1">
                {totalFibre !== null && totalFibre !== undefined ? `${roundNumber(totalFibre, 1)}g` : 'N/A'}
              </div>
              <div className="text-[10px] text-teal-800/70">grams</div>
            </div>
          </div>

          {/* Macronutrient Caloric Ratio Distribution Bar */}
          {ratios && (
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-2">
              <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
                <span>Macronutrient Caloric Ratio</span>
                <span className="text-[11px] text-slate-400 font-normal">Based on Atwater Factors (4-4-9 kcal/g)</span>
              </div>
              <div className="w-full h-3 rounded-full overflow-hidden flex bg-slate-200">
                <div
                  style={{ width: `${ratios.carb_energy_pct}%` }}
                  className="bg-blue-500 transition-all"
                  title={`Carbs: ${ratios.carb_energy_pct}%`}
                />
                <div
                  style={{ width: `${ratios.protein_energy_pct}%` }}
                  className="bg-emerald-500 transition-all"
                  title={`Protein: ${ratios.protein_energy_pct}%`}
                />
                <div
                  style={{ width: `${ratios.fat_energy_pct}%` }}
                  className="bg-rose-500 transition-all"
                  title={`Fat: ${ratios.fat_energy_pct}%`}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-600 pt-0.5">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  Carbohydrates: <strong>{ratios.carb_energy_pct}%</strong>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Protein: <strong>{ratios.protein_energy_pct}%</strong>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  Healthy Fats: <strong>{ratios.fat_energy_pct}%</strong>
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

function roundNumber(val: number, decimals = 1): number {
  const f = Math.pow(10, decimals);
  return Math.round(val * f) / f;
}
