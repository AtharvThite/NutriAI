import React from 'react';
import { Bookmark, ArrowRight, Trash2, Calendar, Scale, ExternalLink } from 'lucide-react';
import { SavedComparisonItem } from '../../types';

interface SavedAlternativesProps {
  savedList: SavedComparisonItem[];
  onSelectSaved: (item: SavedComparisonItem) => void;
  onDeleteSaved: (comparisonId: string) => void;
  isLoading?: boolean;
}

export const SavedAlternatives: React.FC<SavedAlternativesProps> = ({
  savedList,
  onSelectSaved,
  onDeleteSaved,
  isLoading
}) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm text-center">
        <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <span className="text-xs text-slate-500">Loading saved comparisons...</span>
      </div>
    );
  }

  if (savedList.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-7 border border-slate-200 shadow-sm text-center">
        <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
          <Bookmark className="w-5 h-5" />
        </div>
        <h4 className="text-sm font-bold text-slate-700">No Saved Alternatives Yet</h4>
        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
          Save interesting comparisons using the bookmark button to revisit and compare anytime.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Bookmark className="w-4 h-4 text-emerald-600 fill-emerald-600" />
          <h3 className="text-base font-bold text-slate-900">Saved Comparisons ({savedList.length})</h3>
        </div>
        <span className="text-xs text-slate-400">Click to reopen anytime</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {savedList.map((item) => (
          <div
            key={item.comparison_id}
            className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-emerald-300 hover:shadow-sm transition-all group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                  {item.objective.replace('_', ' ')}
                </span>
                <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                  <Scale className="w-3 h-3 text-slate-400" />
                  {item.quantity_g}g
                </span>
              </div>

              {/* Foods comparison title */}
              <div className="mb-2">
                <div className="text-xs font-semibold text-slate-500 line-through truncate">
                  {item.original_food_name}
                </div>
                <div className="text-sm font-black text-slate-900 flex items-center gap-1 truncate mt-0.5">
                  <ArrowRight className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">{item.alternative_food_name}</span>
                </div>
              </div>

              {/* Quick macros snapshot */}
              {(item.original_calories !== null || item.alternative_calories !== null) && (
                <div className="text-[11px] text-slate-600 bg-white p-2 rounded-xl border border-slate-200/60 mb-3 flex items-center justify-between font-mono">
                  <span>
                    Orig: <strong>{item.original_calories ? Math.round(item.original_calories) : '—'}</strong> kcal
                  </span>
                  <span>→</span>
                  <span className="text-emerald-700 font-bold">
                    Alt: <strong>{item.alternative_calories ? Math.round(item.alternative_calories) : '—'}</strong> kcal
                  </span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
              <button
                type="button"
                onClick={() => onSelectSaved(item)}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
              >
                <span>Reopen</span>
                <ExternalLink className="w-3 h-3" />
              </button>

              <button
                type="button"
                onClick={() => onDeleteSaved(item.comparison_id)}
                title="Remove saved comparison"
                className="p-1 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
