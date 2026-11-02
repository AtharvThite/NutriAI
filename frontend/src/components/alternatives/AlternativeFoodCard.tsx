import React from 'react';
import {
  Sparkles,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Check,
  Bookmark,
  MessageSquareQuote,
  ShieldCheck,
  ExternalLink
} from 'lucide-react';
import { AlternativeCandidate } from '../../types';

interface AlternativeFoodCardProps {
  alternative: AlternativeCandidate;
  isSelected: boolean;
  onSelect: (alt: AlternativeCandidate) => void;
  onExplain: (alt: AlternativeCandidate) => void;
  onSave?: (alt: AlternativeCandidate) => void;
  isSaved?: boolean;
}

export const AlternativeFoodCard: React.FC<AlternativeFoodCardProps> = ({
  alternative,
  isSelected,
  onSelect,
  onExplain,
  onSave,
  isSaved
}) => {
  const {
    food_code,
    food_name,
    category,
    dietary_type,
    quantity_g,
    nutrients,
    score,
    rank,
    match_reason,
    key_differences
  } = alternative;

  return (
    <div
      className={`bg-white rounded-3xl p-5 sm:p-6 border transition-all relative flex flex-col justify-between ${
        isSelected
          ? 'border-emerald-500 shadow-md ring-2 ring-emerald-500/20 bg-emerald-50/20'
          : 'border-slate-200 shadow-xs hover:border-slate-300 hover:shadow-md'
      }`}
    >
      <div>
        {/* Top Header: Rank, Match Score, Save */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-slate-900 text-white text-xs font-black flex items-center justify-center">
              #{rank}
            </span>
            <div className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200/80 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-600" />
              <span>{Math.round(score)}% Match</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {onSave && (
              <button
                type="button"
                onClick={() => onSave(alternative)}
                title={isSaved ? 'Saved' : 'Save Comparison'}
                className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
                  isSaved
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : 'bg-slate-50 text-slate-400 hover:text-slate-700 hover:bg-slate-100 border-slate-200'
                }`}
              >
                <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-emerald-700' : ''}`} />
              </button>
            )}
          </div>
        </div>

        {/* Food Name & Badges */}
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
              {food_code}
            </span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60 uppercase">
              {dietary_type}
            </span>
            <span className="text-[11px] text-slate-400 truncate">{category}</span>
          </div>

          <h4 className="text-base font-extrabold text-slate-900 leading-tight">
            {food_name}
          </h4>
        </div>

        {/* Match Reason Banner */}
        {match_reason && (
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700 mb-3.5 leading-snug font-medium">
            {match_reason}
          </div>
        )}

        {/* Scaled Macro Grid */}
        <div className="grid grid-cols-4 gap-2 mb-3.5">
          <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 text-center">
            <div className="text-[9px] font-bold text-slate-400 uppercase">Energy</div>
            <div className="text-xs font-black text-slate-800 mt-0.5">
              {nutrients.energy_kcal !== null ? `${Math.round(nutrients.energy_kcal)}` : 'N/A'}{' '}
              <span className="text-[9px] font-normal text-slate-400">kcal</span>
            </div>
          </div>
          <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 text-center">
            <div className="text-[9px] font-bold text-slate-400 uppercase">Protein</div>
            <div className="text-xs font-black text-emerald-700 mt-0.5">
              {nutrients.protein_g !== null ? `${nutrients.protein_g}g` : 'N/A'}
            </div>
          </div>
          <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 text-center">
            <div className="text-[9px] font-bold text-slate-400 uppercase">Carbs</div>
            <div className="text-xs font-black text-cyan-700 mt-0.5">
              {nutrients.carb_g !== null ? `${nutrients.carb_g}g` : 'N/A'}
            </div>
          </div>
          <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 text-center">
            <div className="text-[9px] font-bold text-slate-400 uppercase">Fibre</div>
            <div className="text-xs font-black text-teal-700 mt-0.5">
              {nutrients.fibre_g !== null ? `${nutrients.fibre_g}g` : 'N/A'}
            </div>
          </div>
        </div>

        {/* Key Differences Pills */}
        {key_differences && key_differences.length > 0 && (
          <div className="space-y-1 mb-4">
            {key_differences.slice(0, 2).map((diff, i) => (
              <div
                key={i}
                className="text-[11px] text-slate-600 flex items-center gap-1.5"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="truncate">{diff}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
        <button
          type="button"
          onClick={() => onSelect(alternative)}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            isSelected
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          {isSelected ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>Comparing</span>
            </>
          ) : (
            <>
              <span>Compare</span>
              <ArrowRight className="w-3 h-3" />
            </>
          )}
        </button>

        <button
          type="button"
          onClick={() => onExplain(alternative)}
          title="Explain with RAG & Clinical Evidence"
          className="py-2 px-3 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/80 transition-colors flex items-center gap-1 cursor-pointer"
        >
          <MessageSquareQuote className="w-3.5 h-3.5 text-emerald-600" />
          <span>Explain</span>
        </button>
      </div>
    </div>
  );
};
