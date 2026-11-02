import React, { useState } from 'react';
import {
  ArrowUpDown,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  Info,
  ShieldCheck,
  Bookmark
} from 'lucide-react';
import { OriginalFoodSummary, AlternativeCandidate } from '../../types';

interface NutritionComparisonProps {
  originalFood: OriginalFoodSummary;
  selectedAlternative: AlternativeCandidate;
  quantityG: number;
  onSaveComparison?: () => void;
  isSaved?: boolean;
}

export const NutritionComparison: React.FC<NutritionComparisonProps> = ({
  originalFood,
  selectedAlternative,
  quantityG,
  onSaveComparison,
  isSaved
}) => {
  const [showMicros, setShowMicros] = useState(false);

  const macroKeys = [
    { key: 'energy_kcal', label: 'Energy / Calories', unit: 'kcal', preferLower: true },
    { key: 'protein_g', label: 'Protein', unit: 'g', preferLower: false },
    { key: 'carb_g', label: 'Carbohydrates', unit: 'g', preferLower: true },
    { key: 'fat_g', label: 'Total Fat', unit: 'g', preferLower: true },
    { key: 'fibre_g', label: 'Dietary Fibre', unit: 'g', preferLower: false },
    { key: 'freesugar_g', label: 'Free Sugar', unit: 'g', preferLower: true }
  ];

  const microKeys = [
    { key: 'calcium_mg', label: 'Calcium', unit: 'mg', preferLower: false },
    { key: 'iron_mg', label: 'Iron', unit: 'mg', preferLower: false },
    { key: 'potassium_mg', label: 'Potassium', unit: 'mg', preferLower: false },
    { key: 'sodium_mg', label: 'Sodium', unit: 'mg', preferLower: true },
    { key: 'vitc_mg', label: 'Vitamin C', unit: 'mg', preferLower: false },
    { key: 'zinc_mg', label: 'Zinc', unit: 'mg', preferLower: false },
    { key: 'folate_ug', label: 'Folate', unit: 'µg', preferLower: false }
  ];

  const renderRow = (item: { key: string; label: string; unit: string; preferLower: boolean }) => {
    const origVal = originalFood.nutrients[item.key];
    const altVal = selectedAlternative.nutrients[item.key];

    let diffText = '—';
    let diffClass = 'text-slate-400 bg-slate-100';
    let icon = null;

    if (origVal !== null && origVal !== undefined && altVal !== null && altVal !== undefined) {
      const diff = round(altVal - origVal, 2);
      const diffPct = origVal > 0.001 ? Math.round((diff / origVal) * 100) : null;

      if (Math.abs(diff) < 0.05) {
        diffText = 'Similar (±0)';
        diffClass = 'text-slate-600 bg-slate-100';
        icon = <Minus className="w-3 h-3" />;
      } else if (diff > 0) {
        const isFavorable = !item.preferLower;
        diffText = `+${diff} ${item.unit} (${diffPct ? `+${diffPct}%` : ''})`;
        diffClass = isFavorable ? 'text-emerald-800 bg-emerald-100' : 'text-amber-800 bg-amber-100';
        icon = <TrendingUp className="w-3 h-3" />;
      } else {
        const isFavorable = item.preferLower;
        diffText = `${diff} ${item.unit} (${diffPct ? `${diffPct}%` : ''})`;
        diffClass = isFavorable ? 'text-emerald-800 bg-emerald-100' : 'text-slate-600 bg-slate-100';
        icon = <TrendingDown className="w-3 h-3" />;
      }
    }

    return (
      <tr key={item.key} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
        <td className="py-3 px-4 text-xs font-semibold text-slate-800">
          <div>{item.label}</div>
          <div className="text-[10px] text-slate-400 font-normal">Unit: {item.unit}</div>
        </td>
        <td className="py-3 px-4 text-xs text-right font-mono font-medium text-slate-700">
          {origVal !== null && origVal !== undefined ? `${round(origVal, 1)} ${item.unit}` : (
            <span className="text-slate-400 italic font-sans text-[11px]">Unrecorded</span>
          )}
        </td>
        <td className="py-3 px-4 text-xs text-right font-mono font-bold text-slate-900 bg-emerald-50/20">
          {altVal !== null && altVal !== undefined ? `${round(altVal, 1)} ${item.unit}` : (
            <span className="text-slate-400 italic font-sans text-[11px]">Unrecorded</span>
          )}
        </td>
        <td className="py-3 px-4 text-right">
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${diffClass}`}>
            {icon}
            <span>{diffText}</span>
          </span>
        </td>
      </tr>
    );
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Table Header */}
      <div className="p-6 sm:p-7 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/40">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center">
              3
            </span>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">Side-by-Side Nutrition Comparison</h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Both profiles strictly evaluated for <strong>{quantityG}g</strong> based on verified Anuvaad data.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onSaveComparison && (
            <button
              type="button"
              onClick={onSaveComparison}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                isSaved
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs'
              }`}
            >
              <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-emerald-700' : ''}`} />
              <span>{isSaved ? 'Comparison Saved' : 'Save Comparison'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowMicros(!showMicros)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            {showMicros ? 'Hide Micronutrients' : 'View Micronutrients'}
          </button>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100/70 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              <th className="py-3 px-4">Nutrient Metric</th>
              <th className="py-3 px-4 text-right">
                <div>Original: {originalFood.food_name}</div>
                <div className="text-[10px] text-slate-400 font-normal">({quantityG}g)</div>
              </th>
              <th className="py-3 px-4 text-right bg-emerald-50/50 text-emerald-900">
                <div>Alternative: {selectedAlternative.food_name}</div>
                <div className="text-[10px] text-emerald-700 font-normal">({quantityG}g)</div>
              </th>
              <th className="py-3 px-4 text-right">Difference (Delta)</th>
            </tr>
          </thead>
          <tbody>
            {macroKeys.map(renderRow)}
            {showMicros && (
              <>
                <tr className="bg-slate-50 border-y border-slate-200">
                  <td colSpan={4} className="py-2 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Vitamins & Essential Minerals
                  </td>
                </tr>
                {microKeys.map(renderRow)}
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Info */}
      <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Calculations: <strong>Nutrient consumed = (Nutrient per 100g × {quantityG}g) / 100</strong></span>
        </span>
        <span className="text-[10px] text-slate-400">Missing baseline fields preserved as unrecorded</span>
      </div>
    </div>
  );
};

function round(val: number, decimals: number): number {
  const p = Math.pow(10, decimals);
  return Math.round(val * p) / p;
}
