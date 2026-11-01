import React, { useState } from 'react';
import {
  Sparkles,
  ArrowRight,
  Loader2,
  Utensils,
  Lightbulb,
  Cpu,
  Flame,
  CheckCircle2
} from 'lucide-react';

interface MealInputProps {
  onAnalyze: (message: string) => Promise<void>;
  isLoading: boolean;
  disabled?: boolean;
}

const EXAMPLE_PROMPTS = [
  {
    label: 'Idli & Sambar Breakfast',
    text: 'I had 2 idlis with one bowl of sambar for breakfast.'
  },
  {
    label: 'Multi-Meal Roti & Dal',
    text: 'For breakfast I had 2 aloo parathas with curd. For lunch I ate 2 chapatis, one bowl of dal and rice.'
  },
  {
    label: 'High Protein Paneer',
    text: 'Ate 150g boiled rice with 100g paneer curry and a bowl of cucumber salad for dinner.'
  },
  {
    label: 'Evening Tea & Snack',
    text: 'Had one bowl of vegetable poha with a cup of garam chai for evening snack.'
  }
];

export const MealInput: React.FC<MealInputProps> = ({
  onAnalyze,
  isLoading,
  disabled = false
}) => {
  const [inputMessage, setInputMessage] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputMessage.trim();
    if (!trimmed) {
      setValidationError('Please describe your meal before analyzing.');
      return;
    }
    if (trimmed.length < 3) {
      setValidationError('Please enter a more detailed meal description (at least 3 characters).');
      return;
    }
    setValidationError(null);
    onAnalyze(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden transition-all duration-200 hover:border-emerald-200">
      {/* Top Banner / Feature Intro */}
      <div className="p-6 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-600 text-white shadow-xs">
              <Sparkles className="w-4 h-4" />
            </span>
            <h3 className="text-base font-bold text-slate-800">
              Natural Language Meal Description
            </h3>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-100 text-purple-800 border border-purple-200/60">
              <Cpu className="w-3 h-3" />
              Qwen2.5-0.5B LoRA
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Describe what you ate in everyday Indian English. The fine-tuned LoRA model identifies
            dishes, counts, and missing portions, then looks up verified Anuvaad nutrition in MongoDB.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 bg-white/80 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-slate-200/60 self-start md:self-auto shrink-0">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Zero Hallucinated Calories</span>
        </div>
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div className="relative">
          <textarea
            value={inputMessage}
            onChange={(e) => {
              setInputMessage(e.target.value);
              if (validationError) setValidationError(null);
            }}
            onKeyDown={handleKeyDown}
            disabled={isLoading || disabled}
            rows={4}
            placeholder="e.g. I had 2 idlis with one bowl of sambar for breakfast. For lunch I ate 2 chapatis, one bowl of dal and rice."
            className="w-full text-sm text-slate-800 placeholder-slate-400 p-4 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all resize-y min-h-[110px]"
          />
          <div className="text-[11px] text-slate-400 mt-1 flex justify-between items-center">
            <span>Supports multiple meals, Indian food names (chapatis, dal, poha), and informal counts.</span>
            <span className="hidden sm:inline font-mono text-[10px]">Press Ctrl + Enter to analyze</span>
          </div>
        </div>

        {validationError && (
          <div className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 px-3.5 py-2 rounded-lg flex items-center gap-2">
            <span>{validationError}</span>
          </div>
        )}

        {/* Quick Example Prompts */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
            <span>Try sample meals:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_PROMPTS.map((ex, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setInputMessage(ex.text);
                  setValidationError(null);
                }}
                disabled={isLoading}
                className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-200 border border-slate-200/80 text-slate-700 transition-all text-left"
              >
                <span className="font-semibold text-slate-800">{ex.label}:</span>{' '}
                <span className="text-slate-500 line-clamp-1 text-[11px]">"{ex.text}"</span>
              </button>
            ))}
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isLoading || disabled}
            className="inline-flex items-center gap-2.5 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold text-sm shadow-md shadow-emerald-600/20 disabled:opacity-60 disabled:cursor-not-allowed transition-all transform active:scale-98"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Running LoRA Model Extraction...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Analyze Meal</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
