import React, { useState } from 'react';
import {
  Sparkles,
  Dumbbell,
  Flame,
  Leaf,
  Scale,
  Percent,
  Brain,
  Send,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Tag
} from 'lucide-react';
import { api } from '../../services/api';
import { NaturalLanguageIntentResponse } from '../../types';

interface AlternativeObjectiveSelectorProps {
  objective: string;
  onChangeObjective: (obj: string) => void;
  dietaryPreference: string;
  onChangeDietaryPreference: (diet: string) => void;
  categoryFilter: string | null;
  onChangeCategoryFilter: (cat: string | null) => void;
  onApplyAIInterpretation?: (res: NaturalLanguageIntentResponse) => void;
}

export const AlternativeObjectiveSelector: React.FC<AlternativeObjectiveSelectorProps> = ({
  objective,
  onChangeObjective,
  dietaryPreference,
  onChangeDietaryPreference,
  categoryFilter,
  onChangeCategoryFilter,
  onApplyAIInterpretation
}) => {
  const [naturalQuery, setNaturalQuery] = useState('');
  const [isInterpreting, setIsInterpreting] = useState(false);
  const [lastInterpretation, setLastInterpretation] = useState<NaturalLanguageIntentResponse | null>(null);

  const executeNaturalLanguageQuery = async (queryText: string) => {
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
      console.error('Failed to interpret natural language request:', err);
    } finally {
      setIsInterpreting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeNaturalLanguageQuery(naturalQuery);
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
    <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center">
              2
            </span>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">
              Natural Language Goal Query
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
              <Brain className="w-3 h-3 text-emerald-600" />
              <span>Qwen LoRA</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Type your nutritional goals, dietary preferences, or macro targets in plain English. The fine-tuned LoRA model extracts your exact intent to configure recommendation criteria.
          </p>
        </div>

        <div className="text-xs text-slate-400 flex items-center gap-1.5 self-start sm:self-center">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          <span>Semantic Intent Extraction</span>
        </div>
      </div>

      {/* Hero Natural Language Search Form */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative flex flex-col sm:flex-row items-stretch gap-2.5 p-1.5 rounded-2xl bg-slate-50/80 border border-slate-200 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:bg-white transition-all shadow-2xs">
          <div className="flex items-center gap-3 flex-1 px-3 py-1">
            <Brain className="w-5 h-5 text-emerald-600 shrink-0" />
            <input
              type="text"
              value={naturalQuery}
              onChange={(e) => setNaturalQuery(e.target.value)}
              placeholder="e.g. Find a high-protein vegetarian alternative to this food, or suggest low-calorie options..."
              className="w-full bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={isInterpreting || !naturalQuery.trim()}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50 shrink-0"
          >
            {isInterpreting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Interpreting...</span>
              </>
            ) : (
              <>
                <span>Apply Query</span>
                <Send className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </form>

      {/* Interpretation Feedback Banner if AI returned clarification or details */}
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
