import React, { useState, useEffect, useRef } from 'react';
import { Search, Utensils, X, Check, Flame, ChevronRight, Scale, Info } from 'lucide-react';
import { AlternativeFoodSearchItem, OriginalFoodSummary } from '../../types';
import { api } from '../../services/api';

interface FoodSearchSelectorProps {
  selectedFood: OriginalFoodSummary | null;
  onSelectFood: (food: AlternativeFoodSearchItem) => void;
  quantityG: number;
  onChangeQuantity: (qty: number) => void;
  isLoading?: boolean;
}

export const FoodSearchSelector: React.FC<FoodSearchSelectorProps> = ({
  selectedFood,
  onSelectFood,
  quantityG,
  onChangeQuantity,
  isLoading
}) => {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<AlternativeFoodSearchItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounced search
  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await api.searchAlternatives(query.trim(), 12);
        setSearchResults(results);
        setShowDropdown(true);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (item: AlternativeFoodSearchItem) => {
    onSelectFood(item);
    setShowDropdown(false);
    setQuery('');
  };

  const quickPortions = [50, 100, 150, 200, 250];

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center">
              1
            </span>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">Select Original Food</h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Search from 1,014 Anuvaad Indian food records or choose a staple to find alternatives.
          </p>
        </div>

        {/* Portion Gram Input */}
        <div className="flex items-center gap-2.5 bg-slate-50 p-1.5 px-3 rounded-2xl border border-slate-200">
          <Scale className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-600">Portion:</span>
          <input
            type="number"
            min="10"
            max="2000"
            step="10"
            value={quantityG}
            onChange={(e) => onChangeQuantity(Math.max(10, Number(e.target.value) || 100))}
            className="w-16 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 text-center focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <span className="text-xs font-medium text-slate-500">grams</span>
        </div>
      </div>

      {/* Autocomplete Search Input */}
      <div className="relative mb-5" ref={dropdownRef}>
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3.5 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            placeholder="Type an Indian food (e.g. Boiled rice, Wheat roti, Paneer, Dal tadka)..."
            className="w-full pl-11 pr-10 py-3 bg-slate-50/70 border border-slate-200 rounded-2xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all shadow-2xs"
          />
          {query && (
            <button
              onClick={() => {
                setQuery('');
                setSearchResults([]);
              }}
              className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Dropdown Menu */}
        {showDropdown && (query.trim().length >= 2 || isSearching) && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-slate-200 shadow-xl max-h-72 overflow-y-auto z-30 divide-y divide-slate-100">
            {isSearching ? (
              <div className="p-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                <span>Searching Anuvaad food registry...</span>
              </div>
            ) : searchResults.length > 0 ? (
              searchResults.map((item) => (
                <button
                  key={item.food_code}
                  type="button"
                  onClick={() => handleSelect(item)}
                  className="w-full p-3.5 text-left hover:bg-emerald-50/60 transition-colors flex items-center justify-between group cursor-pointer"
                >
                  <div className="min-w-0 pr-3">
                    <div className="text-sm font-semibold text-slate-800 group-hover:text-emerald-800 truncate">
                      {item.food_name}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                      <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-semibold">
                        {item.food_code}
                      </span>
                      <span>•</span>
                      <span>{item.category}</span>
                      <span>•</span>
                      <span className="font-medium text-emerald-700">{item.dietary_type}</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-xs font-bold text-slate-700">
                      {item.energy_kcal ? `${Math.round(item.energy_kcal)} kcal` : 'N/A'}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {item.protein_g ? `${item.protein_g}g pro` : ''}
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div className="p-4 text-center text-xs text-slate-400">
                No Indian foods matching "{query}" found in Anuvaad database.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick Suggestions Chips */}
      {!selectedFood && (
        <div className="mb-2 flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-semibold text-slate-400 mr-1">Popular Indian Staples:</span>
          {['Boiled rice', 'Wheat roti', 'Paneer', 'Dal tadka', 'Idli', 'Upma'].map((name) => (
            <button
              key={name}
              type="button"
              onClick={async () => {
                setQuery(name);
                const res = await api.searchAlternatives(name, 5);
                if (res.length > 0) handleSelect(res[0]);
              }}
              className="px-2.5 py-1 rounded-xl text-xs font-medium bg-slate-100 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors border border-slate-200/80 cursor-pointer"
            >
              {name}
            </button>
          ))}
        </div>
      )}

      {/* Selected Food Card */}
      {selectedFood && (
        <div className="bg-gradient-to-br from-emerald-50/50 via-white to-teal-50/30 rounded-2xl p-4 sm:p-5 border border-emerald-200 shadow-xs animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-emerald-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                  {selectedFood.food_code}
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white border border-emerald-200 text-emerald-700 uppercase">
                  {selectedFood.dietary_type}
                </span>
                <span className="text-xs text-slate-500 font-medium">{selectedFood.category}</span>
              </div>
              <h4 className="text-base font-extrabold text-slate-900 mt-1">
                {selectedFood.food_name}
              </h4>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-slate-500 font-medium mr-1">Quick Portions:</span>
              {quickPortions.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => onChangeQuantity(p)}
                  className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    quantityG === p
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {p}g
                </button>
              ))}
            </div>
          </div>

          {/* Scaled Macro Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mt-3.5">
            <div className="p-2.5 bg-white rounded-xl border border-slate-200/90 text-center">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Calories</div>
              <div className="text-sm font-black text-amber-700 mt-0.5">
                {selectedFood.nutrients.energy_kcal !== null && selectedFood.nutrients.energy_kcal !== undefined
                  ? `${Math.round(selectedFood.nutrients.energy_kcal)}`
                  : 'N/A'}{' '}
                <span className="text-[10px] font-normal text-slate-400">kcal</span>
              </div>
            </div>

            <div className="p-2.5 bg-white rounded-xl border border-slate-200/90 text-center">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Protein</div>
              <div className="text-sm font-black text-emerald-700 mt-0.5">
                {selectedFood.nutrients.protein_g !== null && selectedFood.nutrients.protein_g !== undefined
                  ? `${selectedFood.nutrients.protein_g}g`
                  : 'N/A'}
              </div>
            </div>

            <div className="p-2.5 bg-white rounded-xl border border-slate-200/90 text-center">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Carbs</div>
              <div className="text-sm font-black text-cyan-700 mt-0.5">
                {selectedFood.nutrients.carb_g !== null && selectedFood.nutrients.carb_g !== undefined
                  ? `${selectedFood.nutrients.carb_g}g`
                  : 'N/A'}
              </div>
            </div>

            <div className="p-2.5 bg-white rounded-xl border border-slate-200/90 text-center">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Fat</div>
              <div className="text-sm font-black text-rose-700 mt-0.5">
                {selectedFood.nutrients.fat_g !== null && selectedFood.nutrients.fat_g !== undefined
                  ? `${selectedFood.nutrients.fat_g}g`
                  : 'N/A'}
              </div>
            </div>

            <div className="p-2.5 bg-white rounded-xl border border-slate-200/90 text-center col-span-2 sm:col-span-1">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fibre</div>
              <div className="text-sm font-black text-teal-700 mt-0.5">
                {selectedFood.nutrients.fibre_g !== null && selectedFood.nutrients.fibre_g !== undefined
                  ? `${selectedFood.nutrients.fibre_g}g`
                  : 'N/A'}
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
            <span>
              Values strictly scaled for <strong>{quantityG}g</strong> (from verified {selectedFood.nutrition_basis} Anuvaad baseline).
            </span>
            <span className="font-mono text-[10px] text-slate-400">ICMR-NIN IFCT 2017</span>
          </div>
        </div>
      )}
    </div>
  );
};
