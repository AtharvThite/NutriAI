import React, { useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  Bookmark,
  CheckCircle2,
  BookOpen,
  Sparkles,
  ExternalLink,
  Save,
  Loader2,
  Table as TableIcon,
  BarChart2,
  PieChart as PieIcon,
  Award,
  ChevronDown,
  Info
} from 'lucide-react';
import {
  NutritionAnalysis,
  RAGSourceRef,
  ExtractedMeal,
  Meal
} from '../../types';
import { MarkdownContent } from '../chat/MarkdownContent';

interface MealAnalysisResultProps {
  analysis: NutritionAnalysis;
  aiSummary?: string | null;
  ragSources: RAGSourceRef[];
  meals: ExtractedMeal[];
  savedMeal?: Meal | null;
  onSaveMeal: (customName: string) => Promise<void>;
  isSaving: boolean;
}

const MACRO_COLORS = ['#3b82f6', '#10b981', '#f43f5e']; // Carbs (Blue), Protein (Green), Fat (Rose)
const FOOD_COLORS = ['#059669', '#0284c7', '#d97706', '#7c3aed', '#db2777', '#475569'];

export const MealAnalysisResult: React.FC<MealAnalysisResultProps> = ({
  analysis,
  aiSummary,
  ragSources,
  meals,
  savedMeal,
  onSaveMeal,
  isSaving
}) => {
  const [mealNameInput, setMealNameInput] = useState('');
  const [activeVizTab, setActiveVizTab] = useState<'macros' | 'calories' | 'nutrients'>('macros');
  const [expandedSourceId, setExpandedSourceId] = useState<string | null>(null);

  // Macro Pie Chart Data
  const ratios = analysis.macronutrient_ratios;
  const macroPieData = [
    { name: 'Carbohydrates', value: ratios.carb_energy_pct, grams: analysis.total_nutrients.carb_g || 0 },
    { name: 'Protein', value: ratios.protein_energy_pct, grams: analysis.total_nutrients.protein_g || 0 },
    { name: 'Fat', value: ratios.fat_energy_pct, grams: analysis.total_nutrients.fat_g || 0 }
  ];

  // Food-wise Calorie Bar Chart Data
  const foodCalorieData = analysis.items_breakdown.map((item, idx) => ({
    name: item.food_name.length > 18 ? item.food_name.slice(0, 16) + '...' : item.food_name,
    fullName: item.food_name,
    calories: item.nutrients.energy_kcal ? Math.round(item.nutrients.energy_kcal) : 0,
    protein: item.nutrients.protein_g ? Math.round(item.nutrients.protein_g * 10) / 10 : 0,
    carbs: item.nutrients.carb_g ? Math.round(item.nutrients.carb_g * 10) / 10 : 0,
    fat: item.nutrients.fat_g ? Math.round(item.nutrients.fat_g * 10) / 10 : 0,
    quantity_g: item.quantity_g
  }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const defaultTitle = meals
      .map(m => m.meal_type.charAt(0).toUpperCase() + m.meal_type.slice(1))
      .filter(t => t !== 'Unspecified')
      .join(' & ') || 'AI Analyzed Indian Meal';

    const finalName = mealNameInput.trim() || defaultTitle;
    await onSaveMeal(finalName);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. Food-Wise Breakdown Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-600 text-white shadow-xs">
              <TableIcon className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                Food-wise Nutrient Breakdown
              </h3>
              <p className="text-xs text-slate-500">
                Calculated deterministically from Anuvaad laboratory records ({analysis.total_weight_g}g total consumed weight)
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 self-start sm:self-auto">
            {analysis.items_breakdown.length} verified constituents
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-400 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Food Item</th>
                <th className="py-3 px-3">Anuvaad Code</th>
                <th className="py-3 px-3 text-right">Weight (g)</th>
                <th className="py-3 px-3 text-right">Calories</th>
                <th className="py-3 px-3 text-right">Protein</th>
                <th className="py-3 px-3 text-right">Carbs</th>
                <th className="py-3 px-3 text-right">Fat</th>
                <th className="py-3 px-4 text-right">Fibre</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {analysis.items_breakdown.map((item, idx) => {
                const nuts = item.nutrients;
                return (
                  <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {item.food_name}
                    </td>
                    <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">
                      {item.food_code}
                    </td>
                    <td className="py-3 px-3 text-right font-medium text-slate-700">
                      {item.quantity_g}g
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-amber-700">
                      {nuts.energy_kcal !== null && nuts.energy_kcal !== undefined
                        ? Math.round(nuts.energy_kcal * 10) / 10
                        : '—'}
                    </td>
                    <td className="py-3 px-3 text-right text-emerald-700 font-medium">
                      {nuts.protein_g !== null && nuts.protein_g !== undefined
                        ? `${Math.round(nuts.protein_g * 10) / 10}g`
                        : '—'}
                    </td>
                    <td className="py-3 px-3 text-right text-blue-700 font-medium">
                      {nuts.carb_g !== null && nuts.carb_g !== undefined
                        ? `${Math.round(nuts.carb_g * 10) / 10}g`
                        : '—'}
                    </td>
                    <td className="py-3 px-3 text-right text-rose-700 font-medium">
                      {nuts.fat_g !== null && nuts.fat_g !== undefined
                        ? `${Math.round(nuts.fat_g * 10) / 10}g`
                        : '—'}
                    </td>
                    <td className="py-3 px-4 text-right text-teal-700 font-medium">
                      {nuts.fibre_g !== null && nuts.fibre_g !== undefined
                        ? `${Math.round(nuts.fibre_g * 10) / 10}g`
                        : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* Totals Footer */}
            <tfoot className="bg-slate-50 font-bold text-slate-800 border-t border-slate-200">
              <tr>
                <td className="py-3 px-4">Total Consumed</td>
                <td className="py-3 px-3 text-slate-400">—</td>
                <td className="py-3 px-3 text-right">{analysis.total_weight_g}g</td>
                <td className="py-3 px-3 text-right text-amber-800">
                  {analysis.total_nutrients.energy_kcal
                    ? Math.round(analysis.total_nutrients.energy_kcal * 10) / 10
                    : 'N/A'} kcal
                </td>
                <td className="py-3 px-3 text-right text-emerald-800">
                  {analysis.total_nutrients.protein_g
                    ? `${Math.round(analysis.total_nutrients.protein_g * 10) / 10}g`
                    : 'N/A'}
                </td>
                <td className="py-3 px-3 text-right text-blue-800">
                  {analysis.total_nutrients.carb_g
                    ? `${Math.round(analysis.total_nutrients.carb_g * 10) / 10}g`
                    : 'N/A'}
                </td>
                <td className="py-3 px-3 text-right text-rose-800">
                  {analysis.total_nutrients.fat_g
                    ? `${Math.round(analysis.total_nutrients.fat_g * 10) / 10}g`
                    : 'N/A'}
                </td>
                <td className="py-3 px-4 text-right text-teal-800">
                  {analysis.total_nutrients.fibre_g
                    ? `${Math.round(analysis.total_nutrients.fibre_g * 10) / 10}g`
                    : 'N/A'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* 2. Visualizations (Recharts) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-600 text-white shadow-xs">
              <BarChart2 className="w-4 h-4" />
            </span>
            <h3 className="text-base font-bold text-slate-800">
              Visual Nutrition Distribution
            </h3>
          </div>

          {/* Chart View Switcher */}
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold self-start sm:self-auto">
            <button
              onClick={() => setActiveVizTab('macros')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeVizTab === 'macros'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <PieIcon className="w-3.5 h-3.5" />
              <span>Macro Ratios</span>
            </button>
            <button
              onClick={() => setActiveVizTab('calories')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeVizTab === 'calories'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Calorie Contribution</span>
            </button>
            <button
              onClick={() => setActiveVizTab('nutrients')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeVizTab === 'nutrients'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Macro Comparison</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Macronutrient Pie / Donut Chart */}
        {activeVizTab === 'macros' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={macroPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={95}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {macroPieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={MACRO_COLORS[index % MACRO_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any, name: any, entry: any) => [
                      `${val}% (${entry.payload.grams}g)`,
                      name
                    ]}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-3 p-4 bg-slate-50/70 rounded-xl border border-slate-200/60 text-xs">
              <h4 className="font-bold text-slate-800">Caloric Energy Breakdown</h4>
              <p className="text-slate-500 leading-relaxed">
                Calculated according to verified Atwater conversion factors: 4 kcal per gram of protein and carbohydrates, and 9 kcal per gram of dietary fat.
              </p>
              <div className="space-y-2 pt-1 font-medium">
                <div className="flex justify-between items-center text-blue-900">
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    Carbohydrates:
                  </span>
                  <strong>{ratios.carb_energy_pct}% ({analysis.total_nutrients.carb_g || 0}g)</strong>
                </div>
                <div className="flex justify-between items-center text-emerald-900">
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    Protein:
                  </span>
                  <strong>{ratios.protein_energy_pct}% ({analysis.total_nutrients.protein_g || 0}g)</strong>
                </div>
                <div className="flex justify-between items-center text-rose-900">
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    Fats:
                  </span>
                  <strong>{ratios.fat_energy_pct}% ({analysis.total_nutrients.fat_g || 0}g)</strong>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Caloric Contribution by Food Item Bar Chart */}
        {activeVizTab === 'calories' && (
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-500">
              Calorie Contribution by Dish (kcal)
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={foodCalorieData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(val: any, name: any, entry: any) => [
                      `${val} kcal (${entry.payload.quantity_g}g consumed)`,
                      entry.payload.fullName
                    ]}
                  />
                  <Bar dataKey="calories" fill="#d97706" radius={[6, 6, 0, 0]} name="Calories (kcal)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Tab 3: Macronutrients by Item Comparison */}
        {activeVizTab === 'nutrients' && (
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-500">
              Grams of Protein, Carbs, and Fat per Dish
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={foodCalorieData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="protein" fill="#10b981" radius={[4, 4, 0, 0]} name="Protein (g)" />
                  <Bar dataKey="carbs" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Carbs (g)" />
                  <Bar dataKey="fat" fill="#f43f5e" radius={[4, 4, 0, 0]} name="Fat (g)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* 3. AI Meal Summary + Educational RAG Knowledge */}
      <div className="bg-gradient-to-br from-purple-50/50 via-white to-slate-50 border border-purple-200/70 rounded-2xl p-6 space-y-4 shadow-xs">
        <div className="flex items-center gap-2 border-b border-purple-100 pb-3">
          <span className="p-1.5 rounded-lg bg-purple-600 text-white shadow-xs">
            <Sparkles className="w-4 h-4" />
          </span>
          <div>
            <h3 className="text-base font-bold text-purple-950">
              AI Clinical Assessment & Macronutrient Summary
            </h3>
            <p className="text-xs text-purple-900/70">
              Evidence-based observations synthesized using fine-tuned Qwen2.5-0.5B LoRA and verified Anuvaad database
            </p>
          </div>
        </div>

        {aiSummary ? (
          <div className="bg-white/95 p-5 rounded-xl border border-purple-100/80 shadow-xs overflow-hidden">
            <MarkdownContent content={aiSummary} />
          </div>
        ) : (
          <div className="py-4 text-xs text-slate-400">
            AI explanation will be generated upon calculation.
          </div>
        )}

        {/* Retrieved RAG Source Attribution */}
        {ragSources && ragSources.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-purple-100">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
              <BookOpen className="w-3.5 h-3.5 text-purple-600" />
              <span>Grounding Sources (from NutriAI Clinical Knowledge Base):</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {ragSources.map((src) => {
                const isExpanded = expandedSourceId === src.document_id;
                return (
                  <div
                    key={src.document_id}
                    onClick={() => setExpandedSourceId(isExpanded ? null : src.document_id)}
                    className="p-3 bg-white border border-purple-200/60 hover:border-purple-300 rounded-xl cursor-pointer transition-all text-xs space-y-1.5 shadow-2xs"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-semibold text-purple-950 line-clamp-1">
                        {src.title}
                      </span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
                      />
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      ID: {src.document_id}
                    </div>
                    {isExpanded && src.snippet && (
                      <p className="text-[11px] text-slate-600 pt-1 border-t border-slate-100 leading-relaxed animate-fade-in">
                        {src.snippet}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 4. Save Confirmed Meal to MongoDB */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h4 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Save className="w-4 h-4 text-emerald-600" />
              <span>Save Meal to Nutrition History</span>
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Permanently save this confirmed meal and its calculated macros to the MongoDB <code className="text-emerald-700">meals</code> collection.
            </p>
          </div>

          {savedMeal ? (
            <div className="flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Saved as '{savedMeal.meal_name}' ({savedMeal.meal_id})</span>
            </div>
          ) : (
            <form onSubmit={handleSave} className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="text"
                value={mealNameInput}
                onChange={(e) => setMealNameInput(e.target.value)}
                placeholder="e.g. Traditional Breakfast"
                disabled={isSaving}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 min-w-[200px]"
              />
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-xs transition-all flex items-center gap-1.5 shrink-0 disabled:opacity-60"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Bookmark className="w-3.5 h-3.5" />
                    <span>Save to MongoDB</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
