import React, { useState } from 'react';
import {
  HelpCircle,
  Scale,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Info
} from 'lucide-react';
import { ExtractedMeal, ClarificationQuestion, ExtractedFoodItem } from '../../types';

interface PortionClarificationProps {
  questions: ClarificationQuestion[];
  meals: ExtractedMeal[];
  onApplyWeight: (foodName: string, grams: number) => void;
  onApplyAllSuggested: () => void;
}

export const PortionClarification: React.FC<PortionClarificationProps> = ({
  questions,
  meals,
  onApplyWeight,
  onApplyAllSuggested
}) => {
  const [customWeights, setCustomWeights] = useState<Record<string, string>>({});

  // Collect items that still have portion_known === false
  const pendingItems: Array<{ mealIdx: number; itemIdx: number; item: ExtractedFoodItem }> = [];
  meals.forEach((m, mIdx) => {
    m.items.forEach((it, itIdx) => {
      if (!it.portion_known || it.quantity_g == null || it.quantity_g <= 0) {
        pendingItems.push({ mealIdx: mIdx, itemIdx: itIdx, item: it });
      }
    });
  });

  if (pendingItems.length === 0) {
    return (
      <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 flex items-center justify-between gap-3 text-xs text-emerald-900 animate-fade-in">
        <div className="flex items-center gap-2 font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>All meal portions have verified gram weights. Meal is ready for deterministic nutrition analysis!</span>
        </div>
      </div>
    );
  }

  // Get quick preset chips based on food type
  const getQuickPresets = (foodName: string, suggestedG: number | null | undefined): number[] => {
    const fn = foodName.toLowerCase();
    if (fn.includes('idli')) return [50, 80, 100, 120];
    if (fn.includes('roti') || fn.includes('chapati') || fn.includes('phulka')) return [35, 70, 100, 140];
    if (fn.includes('paratha') || fn.includes('parantha')) return [80, 160, 200];
    if (fn.includes('dal') || fn.includes('sambar') || fn.includes('curry')) return [100, 150, 200, 250];
    if (fn.includes('rice') || fn.includes('chawal')) return [100, 150, 200, 250];
    if (fn.includes('curd') || fn.includes('dahi')) return [80, 100, 150];
    if (fn.includes('tea') || fn.includes('chai') || fn.includes('coffee')) return [120, 150, 200];
    if (suggestedG && suggestedG > 0) {
      return [
        Math.round(suggestedG * 0.75),
        Math.round(suggestedG),
        Math.round(suggestedG * 1.5)
      ];
    }
    return [50, 100, 150, 200];
  };

  const handleCustomSubmit = (foodName: string) => {
    const val = parseFloat(customWeights[foodName] || '0');
    if (val > 0) {
      onApplyWeight(foodName, val);
      setCustomWeights(prev => ({ ...prev, [foodName]: '' }));
    }
  };

  return (
    <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-5 space-y-4 shadow-xs animate-fade-in">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-200/60 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-lg bg-amber-600 text-white shadow-xs">
              <Scale className="w-3.5 h-3.5" />
            </span>
            <h4 className="text-sm font-bold text-amber-950">
              Portion Weight Clarification ({pendingItems.length} {pendingItems.length === 1 ? 'item' : 'items'} awaiting grams)
            </h4>
          </div>
          <p className="text-xs text-amber-900/80 mt-1 max-w-xl">
            To prevent arbitrary calorie guessing, NutriAI requires verified gram weights. Select a suggested
            standard Indian portion or type your measured grams.
          </p>
        </div>

        <button
          type="button"
          onClick={onApplyAllSuggested}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition-all flex items-center gap-1.5 self-start sm:self-auto shrink-0"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Apply Standard Weights</span>
        </button>
      </div>

      {/* Clarification Cards for each pending food item */}
      <div className="space-y-3">
        {pendingItems.map(({ item }, idx) => {
          // Find matching question if present
          const qObj = questions.find(
            q => q.food_name.toLowerCase() === item.food_name.toLowerCase()
          );
          const suggested = qObj?.suggested_weight_g ?? (item.quantity ? item.quantity * 50 : 100);
          const presets = getQuickPresets(item.food_name, suggested);

          return (
            <div
              key={idx}
              className="bg-white border border-amber-200/90 rounded-xl p-3.5 space-y-2.5 transition-all shadow-xs"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-800 text-sm">{item.food_name}</span>
                    <span className="text-xs text-slate-500">
                      ({item.quantity ?? 1} {item.unit || 'portion'})
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {qObj?.question || `What is the approximate weight of '${item.food_name}' in grams?`}
                  </p>
                </div>

                {suggested && (
                  <span className="text-[11px] font-semibold text-amber-800 bg-amber-100/70 border border-amber-200 px-2.5 py-0.5 rounded-full shrink-0">
                    Typical ~{suggested}g
                  </span>
                )}
              </div>

              {/* Quick Select Preset Buttons + Direct Input */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Presets:
                </span>
                {presets.map((grams) => (
                  <button
                    key={grams}
                    type="button"
                    onClick={() => onApplyWeight(item.food_name, grams)}
                    className="text-xs px-2.5 py-1 rounded-md font-semibold bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-700 border border-slate-200 transition-all"
                  >
                    {grams}g
                  </button>
                ))}

                {/* Direct Gram Input */}
                <div className="flex items-center gap-1.5 ml-auto">
                  <div className="relative w-28">
                    <input
                      type="number"
                      step="any"
                      min="1"
                      placeholder="Custom g"
                      value={customWeights[item.food_name] || ''}
                      onChange={(e) =>
                        setCustomWeights({
                          ...customWeights,
                          [item.food_name]: e.target.value
                        })
                      }
                      onKeyDown={(e) => e.key === 'Enter' && handleCustomSubmit(item.food_name)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-xs text-slate-800 pr-6 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">
                      g
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCustomSubmit(item.food_name)}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold transition-all flex items-center gap-1"
                  >
                    <span>Set</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
