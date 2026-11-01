import React, { useState } from 'react';
import {
  Trash2,
  Check,
  Search,
  Scale,
  Database,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  Sparkles,
  Edit2
} from 'lucide-react';
import { ExtractedFoodItem, MealMatchCandidate } from '../../types';
import { api } from '../../services/api';

interface FoodItemEditorProps {
  item: ExtractedFoodItem;
  itemIndex: number;
  mealIndex: number;
  onUpdateItem: (mealIndex: number, itemIndex: number, updated: ExtractedFoodItem) => void;
  onRemoveItem: (mealIndex: number, itemIndex: number) => void;
}

export const FoodItemEditor: React.FC<FoodItemEditorProps> = ({
  item,
  itemIndex,
  mealIndex,
  onUpdateItem,
  onRemoveItem
}) => {
  const [isSearchingMatch, setIsSearchingMatch] = useState(false);
  const [searchQuery, setSearchQuery] = useState(item.food_name);
  const [candidates, setCandidates] = useState<MealMatchCandidate[]>(item.match_candidates || []);
  const [isSearchingApi, setIsSearchingApi] = useState(false);
  const [showMatchPicker, setShowMatchPicker] = useState(false);

  const handleNameChange = (newName: string) => {
    onUpdateItem(mealIndex, itemIndex, {
      ...item,
      food_name: newName
    });
  };

  const handleQtyChange = (newQty: number | null) => {
    onUpdateItem(mealIndex, itemIndex, {
      ...item,
      quantity: newQty
    });
  };

  const handleUnitChange = (newUnit: string) => {
    const isGram = ['g', 'gram', 'grams', 'gm'].includes(newUnit.toLowerCase());
    onUpdateItem(mealIndex, itemIndex, {
      ...item,
      unit: newUnit,
      quantity_g: isGram && item.quantity ? Number(item.quantity) : item.quantity_g,
      portion_known: isGram && !!item.quantity
    });
  };

  const handleWeightGChange = (newWeightG: number | null) => {
    onUpdateItem(mealIndex, itemIndex, {
      ...item,
      quantity_g: newWeightG,
      portion_known: newWeightG !== null && newWeightG > 0
    });
  };

  const handleSelectCandidate = (candidate: MealMatchCandidate) => {
    onUpdateItem(mealIndex, itemIndex, {
      ...item,
      matched_food_code: candidate.food_code,
      matched_food_name: candidate.food_name,
      match_status: 'matched'
    });
    setShowMatchPicker(false);
  };

  const handleSearchAnuvaad = async () => {
    if (!searchQuery.trim()) return;
    try {
      setIsSearchingApi(true);
      const matches = await api.matchFoods(searchQuery.trim(), 8);
      setCandidates(matches);
    } catch (err) {
      console.error('Failed to search Anuvaad foods:', err);
    } finally {
      setIsSearchingApi(false);
    }
  };

  return (
    <div className="bg-slate-50/70 hover:bg-slate-50 border border-slate-200/90 rounded-xl p-3.5 transition-all space-y-3">
      {/* Top Row: Food Name, Status Badges, Remove Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <input
            type="text"
            value={item.food_name}
            onChange={(e) => handleNameChange(e.target.value)}
            className="font-semibold text-slate-800 text-sm bg-transparent border-b border-transparent hover:border-slate-300 focus:border-emerald-500 focus:bg-white focus:outline-hidden px-1.5 py-0.5 rounded transition-all flex-1 min-w-0"
            title="Click to edit food name"
          />

          {/* Portion Status Badge */}
          {item.portion_known ? (
            <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
              <Check className="w-2.5 h-2.5" />
              Weight Set
            </span>
          ) : (
            <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
              <Scale className="w-2.5 h-2.5" />
              Awaiting Weight
            </span>
          )}

          {/* Match Status Badge */}
          {item.match_status === 'matched' && item.matched_food_code && (
            <span className="shrink-0 hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
              <Database className="w-2.5 h-2.5" />
              Anuvaad Verified
            </span>
          )}
          {item.match_status === 'ambiguous' && (
            <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
              <HelpCircle className="w-2.5 h-2.5" />
              Pick Variant
            </span>
          )}
          {item.match_status === 'not_found' && (
            <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
              <AlertCircle className="w-2.5 h-2.5" />
              Not in Anuvaad
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => onRemoveItem(mealIndex, itemIndex)}
          className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition-all self-end sm:self-auto"
          title="Remove food item"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Middle Row: Quantity, Unit, Weight Inputs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
        <div>
          <label className="block text-[11px] font-medium text-slate-500 mb-1">Quantity</label>
          <input
            type="number"
            step="any"
            min="0"
            value={item.quantity ?? ''}
            onChange={(e) => handleQtyChange(e.target.value ? parseFloat(e.target.value) : null)}
            placeholder="e.g. 2"
            className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-slate-500 mb-1">Unit</label>
          <select
            value={item.unit || 'pieces'}
            onChange={(e) => handleUnitChange(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
          >
            <option value="pieces">pieces</option>
            <option value="bowl">bowl (katori)</option>
            <option value="cup">cup</option>
            <option value="plate">plate</option>
            <option value="grams">grams (g)</option>
            <option value="ml">ml</option>
            <option value="serving">serving</option>
            <option value="glass">glass</option>
            <option value="spoon">tablespoon</option>
          </select>
        </div>

        <div className="col-span-2">
          <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Scale className="w-3 h-3 text-emerald-600" />
              Weight in Grams (required)
            </span>
            {item.quantity_g ? (
              <span className="text-[10px] text-emerald-600 font-bold">{item.quantity_g}g</span>
            ) : (
              <span className="text-[10px] text-amber-600 font-semibold">Required</span>
            )}
          </label>
          <div className="relative">
            <input
              type="number"
              step="any"
              min="1"
              value={item.quantity_g ?? ''}
              onChange={(e) => handleWeightGChange(e.target.value ? parseFloat(e.target.value) : null)}
              placeholder="e.g. 100"
              className={`w-full bg-white border rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-hidden focus:ring-1 ${
                item.portion_known
                  ? 'border-emerald-300 focus:ring-emerald-500'
                  : 'border-amber-300 bg-amber-50/30 focus:ring-amber-500'
              }`}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-semibold">
              grams
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Row: Matched Anuvaad Record & Selector */}
      <div className="pt-1 border-t border-slate-200/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-slate-600 min-w-0">
            <Database className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="text-slate-400">Database Record:</span>
            {item.matched_food_name ? (
              <span className="font-semibold text-slate-800 truncate" title={item.matched_food_name}>
                {item.matched_food_name}{' '}
                <span className="text-[10px] font-mono text-slate-400">({item.matched_food_code})</span>
              </span>
            ) : (
              <span className="text-amber-600 font-medium">No record linked</span>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowMatchPicker(!showMatchPicker)}
            className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-md transition-all self-start sm:self-auto flex items-center gap-1"
          >
            <span>{showMatchPicker ? 'Close Picker' : 'Change Record'}</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${showMatchPicker ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Dropdown / Modal of Match Candidates */}
        {showMatchPicker && (
          <div className="mt-3 p-3 bg-white border border-slate-200 rounded-xl shadow-xs space-y-3 animate-fade-in">
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchAnuvaad()}
                placeholder="Search Anuvaad Indian Foods..."
                className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={handleSearchAnuvaad}
                disabled={isSearchingApi}
                className="px-3 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-semibold hover:bg-slate-900 transition-all flex items-center gap-1"
              >
                <Search className="w-3 h-3" />
                <span>Search</span>
              </button>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1.5 divide-y divide-slate-100">
              {candidates.length === 0 ? (
                <div className="py-4 text-center text-xs text-slate-400">
                  No matching Anuvaad foods found. Try searching for a generic Indian name (e.g. roti, dal, rice).
                </div>
              ) : (
                candidates.map((cand) => {
                  const isSelected = item.matched_food_code === cand.food_code;
                  return (
                    <div
                      key={cand.food_code}
                      onClick={() => handleSelectCandidate(cand)}
                      className={`p-2 rounded-lg cursor-pointer transition-all flex items-center justify-between text-xs ${
                        isSelected
                          ? 'bg-emerald-50 text-emerald-900 font-semibold border border-emerald-200'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="truncate font-medium">{cand.food_name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {cand.food_code} • {cand.energy_kcal ?? 'N/A'} kcal/100g • {cand.protein_g ?? 'N/A'}g protein
                        </div>
                      </div>
                      {isSelected ? (
                        <span className="text-[10px] text-emerald-600 font-bold shrink-0">Selected</span>
                      ) : (
                        <button
                          type="button"
                          className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 hover:bg-emerald-600 hover:text-white transition-all shrink-0"
                        >
                          Select
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
