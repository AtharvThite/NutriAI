import React, { useState } from 'react';
import {
  Brain,
  Sparkles,
  BookOpen,
  ShieldCheck,
  AlertCircle,
  FileText,
  CheckCircle2,
  Activity,
  HeartPulse,
  Info,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ExplainAlternativeResponse } from '../../types';

interface AlternativeExplanationProps {
  explanationData: ExplainAlternativeResponse | null;
  isLoading: boolean;
  onRefresh?: () => void;
}

export const AlternativeExplanation: React.FC<AlternativeExplanationProps> = ({
  explanationData,
  isLoading,
  onRefresh
}) => {
  const [showSources, setShowSources] = useState(false);

  if (isLoading) {
    return (
      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm text-center">
        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-200 animate-pulse">
          <Brain className="w-6 h-6 animate-bounce" />
        </div>
        <h4 className="text-base font-bold text-slate-800">Retrieving Clinical Nutrition Evidence...</h4>
        <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
          Querying Qdrant vector database across verified Indian nutrition documents and synthesizing MongoDB values.
        </p>
        <div className="mt-5 w-48 h-1.5 bg-slate-100 rounded-full mx-auto overflow-hidden">
          <div className="w-full h-full bg-emerald-500 rounded-full animate-pulse" />
        </div>
      </div>
    );
  }

  if (!explanationData) {
    return null;
  }

  const {
    original_food_name,
    alternative_food_name,
    objective,
    explanation,
    sources,
    is_fallback,
    comparison_highlights
  } = explanationData;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Top Banner */}
      <div className="p-6 sm:p-7 border-b border-slate-100 bg-gradient-to-r from-emerald-50/70 via-white to-teal-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center">
              4
            </span>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">RAG Clinical Nutrition Explanation</h3>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase tracking-widest flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              <span>Grounded</span>
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Comparing <strong className="text-slate-800">{alternative_food_name}</strong> vs <strong className="text-slate-800">{original_food_name}</strong> for <span className="capitalize text-emerald-700 font-semibold">{objective.replace('_', ' ')}</span>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1 rounded-xl bg-white border border-slate-200 text-xs text-slate-600 font-medium flex items-center gap-1.5 shadow-2xs">
            <Activity className="w-4 h-4 text-emerald-600" />
            <span>MongoDB Ground Truth Verified</span>
          </div>
        </div>
      </div>

      <div className="p-6 sm:p-7 space-y-6">
        {/* Comparison Highlights Chips */}
        {comparison_highlights && comparison_highlights.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {comparison_highlights.map((item, i) => (
              <div
                key={i}
                className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-900 text-xs font-semibold border border-emerald-200 flex items-center gap-1.5 shadow-2xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        )}

        {/* Enhanced Formatted Markdown Explanation with Explicit Styling Components */}
        <div className="markdown-content text-slate-800 space-y-4">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => (
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 mt-5 mb-2.5 pb-2 border-b border-emerald-100 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                  <span>{children}</span>
                </h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-base sm:text-lg font-bold text-slate-900 mt-4 mb-2 pb-1 border-b border-slate-100 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-teal-500 inline-block" />
                  <span>{children}</span>
                </h2>
              ),
              h3: ({ children }) => (
                <div className="mt-5 mb-2 pt-2 border-t border-slate-100 first:border-0 first:pt-0">
                  <h3 className="text-xs sm:text-sm font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-2 bg-emerald-50/80 border border-emerald-200/70 px-3 py-1.5 rounded-xl w-fit shadow-2xs">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{children}</span>
                  </h3>
                </div>
              ),
              h4: ({ children }) => (
                <h4 className="text-xs sm:text-sm font-semibold text-slate-800 mt-3 mb-1">
                  {children}
                </h4>
              ),
              p: ({ children }) => (
                <p className="text-xs sm:text-sm leading-relaxed text-slate-700 mb-2.5">
                  {children}
                </p>
              ),
              ul: ({ children }) => (
                <ul className="space-y-2 my-2.5 pl-1 sm:pl-2">
                  {children}
                </ul>
              ),
              ol: ({ children }) => (
                <ol className="space-y-2 my-2.5 pl-4 list-decimal text-xs sm:text-sm text-slate-700">
                  {children}
                </ol>
              ),
              li: ({ children }) => (
                <li className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700 leading-relaxed bg-slate-50/80 hover:bg-emerald-50/50 p-2.5 rounded-xl border border-slate-100 transition-colors">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  <span className="flex-1">{children}</span>
                </li>
              ),
              strong: ({ children }) => (
                <strong className="font-semibold text-slate-900 bg-slate-100/90 text-emerald-950 px-1.5 py-0.5 rounded text-[12px] sm:text-[13px] border border-slate-200/70 inline-block my-0.5 shadow-2xs">
                  {children}
                </strong>
              ),
              blockquote: ({ children }) => (
                <blockquote className="my-3.5 pl-3.5 py-2.5 pr-4 border-l-4 border-emerald-500 bg-gradient-to-r from-emerald-50/70 via-slate-50/50 to-transparent rounded-r-2xl text-xs sm:text-sm text-slate-700 italic shadow-2xs">
                  {children}
                </blockquote>
              ),
              table: ({ children }) => (
                <div className="overflow-x-auto my-3 rounded-2xl border border-slate-200 shadow-2xs">
                  <table className="w-full text-xs text-left divide-y divide-slate-200 bg-white">
                    {children}
                  </table>
                </div>
              ),
              thead: ({ children }) => (
                <thead className="bg-slate-50 text-slate-800 font-bold text-xs uppercase tracking-wider">
                  {children}
                </thead>
              ),
              tbody: ({ children }) => (
                <tbody className="divide-y divide-slate-100 bg-white">
                  {children}
                </tbody>
              ),
              tr: ({ children }) => (
                <tr className="hover:bg-slate-50/70 transition-colors">
                  {children}
                </tr>
              ),
              th: ({ children }) => (
                <th className="px-3.5 py-2.5 text-slate-800 font-bold text-xs">
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="px-3.5 py-2 text-slate-700 text-xs">
                  {children}
                </td>
              ),
              code: ({ children }) => (
                <code className="px-1.5 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-emerald-700 font-mono text-[11px]">
                  {children}
                </code>
              ),
              hr: () => (
                <hr className="my-4 border-slate-200" />
              )
            }}
          >
            {explanation}
          </ReactMarkdown>
        </div>

        {/* Collapsible Source Attribution Section */}
        {sources && sources.length > 0 && (
          <div className="pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowSources(!showSources)}
              className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100/90 border border-slate-200/90 transition-all text-left cursor-pointer group shadow-2xs"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                  <BookOpen className="w-3.5 h-3.5 text-emerald-700" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 group-hover:text-emerald-800 transition-colors flex items-center gap-1.5">
                    <span>Retrieved Knowledge Base Sources</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold">
                      {sources.length}
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Clinical context retrieved from Qdrant vector store
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 text-xs font-semibold text-slate-500 group-hover:text-emerald-700 transition-colors">
                <span>{showSources ? 'Hide' : 'View Sources'}</span>
                {showSources ? (
                  <ChevronUp className="w-4 h-4 text-slate-400 group-hover:text-emerald-700 transition-transform" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-emerald-700 transition-transform" />
                )}
              </div>
            </button>

            {/* Collapsible Dropdown Content */}
            {showSources && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 animate-fade-in">
                {sources.map((src, i) => (
                  <div
                    key={i}
                    className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs hover:border-emerald-200 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-emerald-600" />
                        {src.title}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                        {src.document_id}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug italic">
                      "{src.snippet}"
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Fallback Notice */}
        {is_fallback && (
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong>Note on Reference Sources:</strong> The vector store is using synthesized Anuvaad reference guidelines. Evidence-based citations were compiled from standardized Indian nutritional science.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
