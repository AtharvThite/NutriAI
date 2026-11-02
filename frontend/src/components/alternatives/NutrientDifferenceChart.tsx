import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { OriginalFoodSummary, AlternativeCandidate } from '../../types';

interface NutrientDifferenceChartProps {
  originalFood: OriginalFoodSummary;
  selectedAlternative: AlternativeCandidate;
  quantityG: number;
}

export const NutrientDifferenceChart: React.FC<NutrientDifferenceChartProps> = ({
  originalFood,
  selectedAlternative,
  quantityG
}) => {
  const chartData = [
    {
      nutrient: 'Calories (÷10)',
      original: originalFood.nutrients.energy_kcal ? Math.round(originalFood.nutrients.energy_kcal / 10) : 0,
      alternative: selectedAlternative.nutrients.energy_kcal ? Math.round(selectedAlternative.nutrients.energy_kcal / 10) : 0,
      rawOrig: originalFood.nutrients.energy_kcal ? `${Math.round(originalFood.nutrients.energy_kcal)} kcal` : 'N/A',
      rawAlt: selectedAlternative.nutrients.energy_kcal ? `${Math.round(selectedAlternative.nutrients.energy_kcal)} kcal` : 'N/A'
    },
    {
      nutrient: 'Protein (g)',
      original: originalFood.nutrients.protein_g ? round(originalFood.nutrients.protein_g, 1) : 0,
      alternative: selectedAlternative.nutrients.protein_g ? round(selectedAlternative.nutrients.protein_g, 1) : 0,
      rawOrig: originalFood.nutrients.protein_g ? `${originalFood.nutrients.protein_g}g` : 'N/A',
      rawAlt: selectedAlternative.nutrients.protein_g ? `${selectedAlternative.nutrients.protein_g}g` : 'N/A'
    },
    {
      nutrient: 'Carbs (g)',
      original: originalFood.nutrients.carb_g ? round(originalFood.nutrients.carb_g, 1) : 0,
      alternative: selectedAlternative.nutrients.carb_g ? round(selectedAlternative.nutrients.carb_g, 1) : 0,
      rawOrig: originalFood.nutrients.carb_g ? `${originalFood.nutrients.carb_g}g` : 'N/A',
      rawAlt: selectedAlternative.nutrients.carb_g ? `${selectedAlternative.nutrients.carb_g}g` : 'N/A'
    },
    {
      nutrient: 'Total Fat (g)',
      original: originalFood.nutrients.fat_g ? round(originalFood.nutrients.fat_g, 1) : 0,
      alternative: selectedAlternative.nutrients.fat_g ? round(selectedAlternative.nutrients.fat_g, 1) : 0,
      rawOrig: originalFood.nutrients.fat_g ? `${originalFood.nutrients.fat_g}g` : 'N/A',
      rawAlt: selectedAlternative.nutrients.fat_g ? `${selectedAlternative.nutrients.fat_g}g` : 'N/A'
    },
    {
      nutrient: 'Fibre (g)',
      original: originalFood.nutrients.fibre_g ? round(originalFood.nutrients.fibre_g, 1) : 0,
      alternative: selectedAlternative.nutrients.fibre_g ? round(selectedAlternative.nutrients.fibre_g, 1) : 0,
      rawOrig: originalFood.nutrients.fibre_g ? `${originalFood.nutrients.fibre_g}g` : 'N/A',
      rawAlt: selectedAlternative.nutrients.fibre_g ? `${selectedAlternative.nutrients.fibre_g}g` : 'N/A'
    }
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      return (
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xl text-xs space-y-1">
          <div className="font-bold text-slate-800">{label}</div>
          <div className="flex items-center justify-between gap-4 text-slate-600">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-slate-400" />
              <span>{originalFood.food_name}:</span>
            </span>
            <strong className="text-slate-800 font-mono">{dataPoint.rawOrig}</strong>
          </div>
          <div className="flex items-center justify-between gap-4 text-emerald-700">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-600" />
              <span>{selectedAlternative.food_name}:</span>
            </span>
            <strong className="text-emerald-900 font-mono">{dataPoint.rawAlt}</strong>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h4 className="text-base font-bold text-slate-900 tracking-tight">Macronutrient Profile Distribution</h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Normalized comparison for {quantityG}g portion weight.
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-slate-400" />
            <span className="text-slate-600 truncate max-w-[120px]">{originalFood.food_name}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-600" />
            <span className="text-emerald-800 font-bold truncate max-w-[120px]">{selectedAlternative.food_name}</span>
          </div>
        </div>
      </div>

      <div className="h-64 sm:h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="nutrient" stroke="#64748b" fontSize={11} tickLine={false} />
            <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="original" name={originalFood.food_name} fill="#94a3b8" radius={[6, 6, 0, 0]} />
            <Bar dataKey="alternative" name={selectedAlternative.food_name} fill="#059669" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

function round(val: number, decimals: number): number {
  const p = Math.pow(10, decimals);
  return Math.round(val * p) / p;
}
