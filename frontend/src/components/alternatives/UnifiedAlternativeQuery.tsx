import React, { useState, useEffect, useRef } from 'react';
import {
  Brain,
  Sparkles,
  Send,
  Scale,
  Utensils,
  Search,
  X,
  Dumbbell,
  Flame,
  Leaf,
  Percent,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  Edit2
} from 'lucide-react';
import { api } from '../../services/api';
import {
  OriginalFoodSummary,
  AlternativeFoodSearchItem,
  NaturalLanguageIntentResponse
} from '../../types';

interface UnifiedAlternativeQueryProps {
  selectedFood: OriginalFoodSummary | null;
  onSelectFood: (food: AlternativeFoodSearchItem) => void;
  quantityG: number;
  onChangeQuantity: (qty: number) => void;
  objective: string;
  onChangeObjective: (obj: string) => void;
  dietaryPreference: string;
  onChangeDietaryPreference: (diet: string) => void;
  categoryFilter: string | null;
  onChangeCategoryFilter: (cat: string | null) => void;
  onApplyAIInterpretation?: (res: NaturalLanguageIntentResponse) => void;
  isLoading?: boolean;
}

export const UnifiedAlternativeQuery: React.FC<UnifiedAlternativeQueryProps> = ({
  selectedFood,
  onSelectFood,
  quantityG,
  onChangeQuantity,
  objective,
  onChangeObjective,
  dietaryPreference,
  onChangeDietaryPreference,
  categoryFilter,
  onChangeCategoryFilter,
  onApplyAIInterpretation,
  isLoading
}) => {
  const [queryText, setQueryText] = useState('');
  const [isInterpreting, setIsInterpreting] = useState(false);
  const [lastInterpretation, setLastInterpretation] = useState<NaturalLanguageIntentResponse | null>(null);

  // Manual Food Switcher State
  const [isChangingFood, setIsChangingFood] = useState(false);
  const [foodSearchQuery, setFoodSearchQuery] = useState('');
  const [foodSearchResults, setFoodSearchResults] = useState<AlternativeFoodSearchItem[]>([]);
  const [isSearchingFood, setIsSearchingFood] = useState(false);
  const foodSearchRef = useRef<HTMLDivElement>(null);

  // Debounced search for manual food picker
  useEffect(() => {
    if (!foodSearchQuery.trim() || foodSearchQuery.trim().length < 2) {
      setFoodSearchResults([]);
      setIsSearchingFood(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingFood(true);
      try {
        const results = await api.searchAlternatives(foodSearchQuery.trim(), 8);
        setFoodSearchResults(results);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearchingFood(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [foodSearchQuery]);

  // Click outside to close manual food switcher
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (foodSearchRef.current && !foodSearchRef.current.contains(e.target as Node)) {
        setIsChangingFood(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNaturalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!queryText.trim()) return;

    setIsInterpreting(true);
    try {
      const res = await api.parseAlternativeIntent(queryText.trim());
      setLastInterpretation(res);

      if (res.objective) {
        onChangeObjective(res.objective);
      }
      if (res.dietary_preference) {
        onChangeDietaryPreference(res.dietary_preference);
      }
      if (onApplyAIInterpretation) {
        onApplyAIInterpretation(res);
      }
    } catch (err) {
      console.error('Error parsing natural language intent:', err);
    } finally {
      setIsInterpreting(false);
    }
  };

  const handleSelectManualFood = (item: AlternativeFoodSearchItem) => {
    onSelectFood(item);
    setIsChangingFood(false);
    setFoodSearchQuery('');
  };

  // Helper for displaying current goal metadata
  const getGoalMeta = (obj: string) => {
    switch (obj) {
      case 'higher_protein':
        return { label: 'Higher Protein', icon: Dumbbell, color: 'text-blue-700 bg-blue-50 border-blue-200' };
      case 'lower_calorie':
        return { label: 'Lower Calorie', icon: Flame, color: 'text-amber-700 bg-amber-50 border-amber-200' };
      case 'higher_fibre':
        return { label: 'Higher Fibre', icon: Leaf, color: 'text-teal-700 bg-teal-50 border-teal-200' };
      case 'lower_carb':
        return { label: 'Lower Carbohydrates', icon: Percent, color: 'text-cyan-700 bg-cyan-50 border-cyan-200' };
      case 'similar':
      default:
        return { label: 'Nutritionally Similar', icon: Scale, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    }
  };

  const activeMeta = getGoalMeta(objective);
  const ActiveIcon = activeMeta.icon;

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center">
              1
            </span>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">
              AI Food & Goal Query
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
              <Brain className="w-3 h-3 text-emerald-600" />
              <span>Qwen LoRA</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Type your request in plain English. NutriAI extracts the food being replaced, your nutritional goal, and dietary restrictions in a single step.
          </p>
        </div>

        <div className="text-xs text-slate-400 flex items-center gap-1.5 self-start sm:self-center">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          <span>Unified Intent & Food Resolution</span>
        </div>
      </div>

      {/* Hero Natural Language Query Bar */}
      <form onSubmit={handleNaturalSubmit} className="relative">
        <div className="relative flex flex-col sm:flex-row items-stretch gap-2.5 p-2 rounded-2xl bg-slate-50/90 border border-slate-200 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:bg-white transition-all shadow-2xs">
          <div className="flex items-center gap-3 flex-1 px-3 py-1">
            <Brain className="w-5 h-5 text-emerald-600 shrink-0" />
            <input
              type="text"
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              placeholder="e.g. Find higher protein veg alternative for chicken, or lower calorie options for paneer..."
              className="w-full bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={isInterpreting || !queryText.trim()}
            className="px-6 py-3 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50 shrink-0"
          >
            {isInterpreting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Interpreting...</span>
              </>
            ) : (
              <>
                <span>Find Alternatives</span>
                <Send className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </form>

      {/* Unified Baseline Food & Active Strategy Bar */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-50/60 via-slate-50/50 to-teal-50/30 border border-emerald-100/90 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Baseline Food Details & Quick Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3.5 flex-1 relative" ref={foodSearchRef}>
          <div className="w-10 h-10 rounded-2xl bg-white border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0 shadow-2xs">
            <Utensils className="w-5 h-5" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-500 font-medium">Replacing Baseline:</span>
              <span className="text-sm font-extrabold text-slate-900 truncate">
                {selectedFood?.food_name || 'Select a food'}
              </span>
              {selectedFood && (
                <span className="font-mono text-[10px] bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-500">
                  {selectedFood.food_code}
                </span>
              )}
              {selectedFood && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {selectedFood.dietary_type}
                </span>
              )}
              <button
                type="button"
                onClick={() => setIsChangingFood(!isChangingFood)}
                className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 hover:underline flex items-center gap-0.5 cursor-pointer ml-1"
              >
                <span>[Change]</span>
                <ChevronDown className="w-3 h-3" />
              </button>
            </div>

            {/* Baseline Macronutrient Chips */}
            {selectedFood && (
              <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500 flex-wrap">
                <span>{selectedFood.nutrients.energy_kcal ?? 'N/A'} kcal</span>
                <span>•</span>
                <span>{selectedFood.nutrients.protein_g ?? 'N/A'}g protein</span>
                <span>•</span>
                <span>{selectedFood.nutrients.carb_g ?? 'N/A'}g carbs</span>
                <span>•</span>
                <span>{selectedFood.nutrients.fat_g ?? 'N/A'}g fat</span>
              </div>
            )}
          </div>

          {/* Quick Change Food Popover */}
          {isChangingFood && (
            <div className="absolute top-full left-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl border border-slate-200 shadow-xl p-3 z-30 space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  value={foodSearchQuery}
                  onChange={(e) => setFoodSearchQuery(e.target.value)}
                  placeholder="Type an Indian food (e.g. Boiled rice, Paneer)..."
                  autoFocus
                  className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                {foodSearchQuery && (
                  <button
                    onClick={() => setFoodSearchQuery('')}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {isSearchingFood ? (
                <div className="p-3 text-center text-xs text-slate-400">Searching Anuvaad registry...</div>
              ) : foodSearchResults.length > 0 ? (
                <div className="max-h-48 overflow-y-auto divide-y divide-slate-100">
                  {foodSearchResults.map((item) => (
                    <button
                      key={item.food_code}
                      type="button"
                      onClick={() => handleSelectManualFood(item)}
                      className="w-full p-2 text-left hover:bg-emerald-50/60 rounded-lg transition-colors flex items-center justify-between cursor-pointer"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="text-xs font-semibold text-slate-800 truncate">{item.food_name}</div>
                        <div className="text-[10px] text-slate-400">{item.category} • {item.dietary_type}</div>
                      </div>
                      <span className="text-[11px] font-bold text-emerald-700">{item.energy_kcal} kcal</span>
                    </button>
                  ))}
                </div>
              ) : foodSearchQuery.length >= 2 ? (
                <div className="p-2 text-center text-xs text-slate-400">No matching foods found.</div>
              ) : (
                <div className="p-2 text-center text-[11px] text-slate-400">Type 2+ characters to search 1,014 Anuvaad foods</div>
              )}
            </div>
          )}
        </div>

        {/* Right: Portion Control & Active Strategy Badges */}
        <div className="flex items-center gap-3 flex-wrap lg:justify-end">
          {/* Portion Grams */}
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
            <Scale className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs font-medium text-slate-600">Portion:</span>
            <input
              type="number"
              min="10"
              max="2000"
              step="10"
              value={quantityG}
              onChange={(e) => onChangeQuantity(Math.max(10, Number(e.target.value) || 100))}
              className="w-14 px-1.5 py-0.5 bg-slate-50 border border-slate-200 rounded text-xs font-bold text-slate-800 text-center focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <span className="text-xs text-slate-500 font-medium">g</span>
          </div>

          {/* Strategy Badge */}
          <div className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 shadow-2xs ${activeMeta.color}`}>
            <ActiveIcon className="w-3.5 h-3.5" />
            <span>{activeMeta.label}</span>
          </div>

          {/* Dietary Restriction Badge */}
          {dietaryPreference !== 'all' && (
            <div className="px-2.5 py-1.5 rounded-xl bg-emerald-100 text-emerald-900 border border-emerald-200 text-xs font-bold flex items-center gap-1 shadow-2xs">
              <span>🌱 {dietaryPreference}</span>
            </div>
          )}
        </div>
      </div>

      {/* AI Interpretation Alert if Clarification was Required */}
      {lastInterpretation && lastInterpretation.requires_clarification && lastInterpretation.clarification_message && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2 animate-fade-in">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong>AI Note:</strong> {lastInterpretation.clarification_message}
          </div>
        </div>
      )}
    </div>
  );
};
