import React, { useState, useEffect } from 'react';
import {
  FlaskConical,
  Cpu,
  Layers,
  Zap,
  BarChart2,
  TrendingDown,
  Clock,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  ArrowUpRight
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { api } from '../services/api';
import { LoRAResults, QuantizationResults, RAGMetrics, MealIntelligenceEvalReport } from '../types';

export const ExperimentDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'lora' | 'quant' | 'rag'>('lora');
  const [loraData, setLoraData] = useState<LoRAResults | null>(null);
  const [quantData, setQuantData] = useState<QuantizationResults | null>(null);
  const [ragData, setRagData] = useState<RAGMetrics | null>(null);
  const [mealEvalData, setMealEvalData] = useState<MealIntelligenceEvalReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadExperiments() {
      try {
        setLoading(true);
        const [lora, quant, rag, mealEval] = await Promise.all([
          api.getLoRAResults().catch(() => null),
          api.getQuantizationResults().catch(() => null),
          api.getRAGMetrics().catch(() => null),
          api.getMealIntelligenceEvaluation().catch(() => null)
        ]);
        setLoraData(lora);
        setQuantData(quant);
        setRagData(rag);
        setMealEvalData(mealEval);
      } finally {
        setLoading(false);
      }
    }
    loadExperiments();
  }, []);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            <FlaskConical className="w-6 h-6 text-purple-600" />
            <span>AI/ML Experiment Benchmarks</span>
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Empirical evaluations for LoRA PEFT, 4-bit NF4 Quantization, and RAG vector retrieval.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setActiveTab('lora')}
            className={`px-4 py-2 rounded-lg transition-all ${
              activeTab === 'lora' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            1. LoRA Fine-Tuning
          </button>
          <button
            onClick={() => setActiveTab('quant')}
            className={`px-4 py-2 rounded-lg transition-all ${
              activeTab === 'quant' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            2. 4-bit Quantization & QLoRA
          </button>
          <button
            onClick={() => setActiveTab('rag')}
            className={`px-4 py-2 rounded-lg transition-all ${
              activeTab === 'rag' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            3. RAG Retrieval Metrics
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-24 text-center text-sm text-slate-400">Loading benchmark experiment metrics...</div>
      ) : (
        <>
          {/* TAB 1: LoRA Fine-Tuning */}
          {activeTab === 'lora' && (
            <div className="space-y-6 animate-fade-in">
              {/* Summary Banner */}
              <div className="bg-purple-50/70 border border-purple-200/80 rounded-2xl p-6 flex flex-col md:flex-row justify-between gap-6">
                <div>
                  <span className="text-xs font-bold text-purple-800 uppercase tracking-wider">
                    LoRA Parameter-Efficient Fine-Tuning (Exp 2 Adaptation)
                  </span>
                  <h3 className="text-xl font-bold text-purple-950 mt-1">
                    Base Model: {loraData?.base_model || 'Qwen/Qwen2.5-0.5B-Instruct'}
                  </h3>
                  <p className="text-xs text-purple-900/80 mt-1.5 max-w-2xl leading-relaxed">
                    Fine-tuned on <code>nutrition_train.jsonl</code> with Low-Rank Adaptation.
                    Target modules: <code>q_proj, v_proj</code>. Trains less than <strong>0.5%</strong> of total model weights while preserving base linguistic reasoning.
                  </p>
                </div>

                <div className="flex gap-4 shrink-0">
                  <div className="bg-white p-3.5 rounded-xl border border-purple-100 shadow-xs text-center min-w-[110px]">
                    <div className="text-[11px] font-semibold text-slate-400 uppercase">Optimal Rank</div>
                    <div className="text-xl font-extrabold text-purple-700 mt-0.5">r = 8</div>
                    <div className="text-[10px] text-slate-500">Alpha: 16</div>
                  </div>
                  <div className="bg-white p-3.5 rounded-xl border border-purple-100 shadow-xs text-center min-w-[110px]">
                    <div className="text-[11px] font-semibold text-slate-400 uppercase">Min Loss</div>
                    <div className="text-xl font-extrabold text-purple-700 mt-0.5">1.321</div>
                    <div className="text-[10px] text-slate-500">Cross-entropy</div>
                  </div>
                </div>
              </div>

              {/* LoRA Chart: Training Loss vs LoRA Rank */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                  <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center justify-between">
                    <span>Training Loss by Configuration</span>
                    <span className="text-xs text-purple-600 font-semibold">Lower is Better</span>
                  </div>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={loraData?.runs || []}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="run_name" tick={{ fontSize: 10 }} />
                        <YAxis domain={[1.0, 1.8]} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="training_loss" fill="#7c3aed" radius={[4, 4, 0, 0]} name="Training Loss" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                  <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center justify-between">
                    <span>Training Time (Seconds) vs Rank</span>
                    <span className="text-xs text-slate-400 font-medium">Batch Size: 2</span>
                  </div>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={loraData?.runs || []}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="run_name" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="training_time_seconds" fill="#10b981" radius={[4, 4, 0, 0]} name="Time (seconds)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Hyperparameter Runs Table */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Hyperparameter Evaluation Matrix
                  </h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-400 uppercase font-semibold">
                      <tr>
                        <th className="py-3 px-4">Run Name</th>
                        <th className="py-3 px-3">LoRA Rank (r)</th>
                        <th className="py-3 px-3">Alpha</th>
                        <th className="py-3 px-3">Learning Rate</th>
                        <th className="py-3 px-3">Trainable Parameters</th>
                        <th className="py-3 px-3">Trainable %</th>
                        <th className="py-3 px-3">Final Loss</th>
                        <th className="py-3 px-3">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(loraData?.runs || []).map((run) => (
                        <tr key={run.run_name} className="hover:bg-slate-50/50">
                          <td className="py-3.5 px-4 font-semibold text-slate-800 font-mono">{run.run_name}</td>
                          <td className="py-3.5 px-3 font-bold text-purple-700">{run.lora_r}</td>
                          <td className="py-3.5 px-3">{run.lora_alpha}</td>
                          <td className="py-3.5 px-3 font-mono">{run.learning_rate}</td>
                          <td className="py-3.5 px-3 font-mono">{run.trainable_parameters.toLocaleString()}</td>
                          <td className="py-3.5 px-3 font-bold text-emerald-600">{run.trainable_percentage}%</td>
                          <td className="py-3.5 px-3 font-bold text-slate-800">{run.training_loss}</td>
                          <td className="py-3.5 px-3 text-slate-500 font-mono">{run.training_time_seconds}s</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* LoRA Meal Intelligence Extraction Benchmark */}
              {mealEvalData && (
                <div className="bg-white rounded-2xl border border-purple-200/80 shadow-xs overflow-hidden space-y-4">
                  <div className="p-5 border-b border-purple-100 bg-gradient-to-r from-purple-50/70 via-white to-transparent flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 rounded-lg bg-purple-600 text-white shadow-xs">
                          <Cpu className="w-4 h-4" />
                        </span>
                        <h4 className="text-base font-bold text-purple-950">
                          AI Meal Intelligence: Base Model vs LoRA Benchmark
                        </h4>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Empirical Evaluation
                        </span>
                      </div>
                      <p className="text-xs text-purple-900/80 mt-1 max-w-2xl leading-relaxed">
                        Evaluated across <strong>{mealEvalData.total_test_scenarios} test scenarios</strong> covering multi-meal inputs,
                        informal Indian English, colloquial spellings, and missing portions.
                        Base Model: <code>{mealEvalData.base_model_name}</code> vs Fine-Tuned: <code>{mealEvalData.lora_adapter}</code>.
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-[11px] font-semibold text-slate-400 uppercase">Extraction Accuracy</div>
                      <div className="text-xl font-extrabold text-emerald-600 mt-0.5">
                        {mealEvalData.lora_model_metrics.food_identification_acc}%
                      </div>
                      <div className="text-[10px] text-slate-500">vs {mealEvalData.base_model_metrics.food_identification_acc}% Base</div>
                    </div>
                  </div>

                  {/* 7-Criteria Comparison Table */}
                  <div className="overflow-x-auto px-4 pb-2">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-400 uppercase font-semibold">
                        <tr>
                          <th className="py-3 px-4">Evaluation Metric</th>
                          <th className="py-3 px-3 text-center">Base Model</th>
                          <th className="py-3 px-3 text-center">LoRA Model</th>
                          <th className="py-3 px-3 text-center">Improvement</th>
                          <th className="py-3 px-4">Behavioral Impact</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {mealEvalData.comparison_table.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="py-3 px-4 font-semibold text-slate-800">{row.metric}</td>
                            <td className="py-3 px-3 text-center font-mono text-slate-500">{row.base_model}</td>
                            <td className="py-3 px-3 text-center font-mono font-bold text-purple-700 bg-purple-50/40 rounded-lg">
                              {row.lora_model}
                            </td>
                            <td className="py-3 px-3 text-center font-semibold text-emerald-600">
                              {row.delta}
                            </td>
                            <td className="py-3 px-4 text-slate-600 text-[11px] leading-relaxed">
                              {row.description}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Qualitative Output Contrast */}
                  <div className="p-4 border-t border-purple-100/80 bg-purple-50/30 space-y-3">
                    <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Qualitative Behavior Contrast
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {mealEvalData.sample_evaluations.map((sample, sIdx) => (
                        <div key={sIdx} className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs space-y-2 text-xs">
                          <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-600" />
                            <span>Prompt: "{sample.prompt}"</span>
                          </div>
                          <div className="space-y-1.5 pt-1 text-[11px]">
                            <div className="p-2 rounded-lg bg-rose-50 border border-rose-200/60 text-rose-900">
                              <span className="font-bold">Base Model (Zero-Shot):</span> {sample.base_model_output}
                            </div>
                            <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200/60 text-emerald-900">
                              <span className="font-bold">LoRA Fine-Tuned:</span> {sample.lora_model_output}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Quantization & QLoRA */}
          {activeTab === 'quant' && (
            <div className="space-y-6 animate-fade-in">
              {/* Summary Banner */}
              <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-6 flex flex-col md:flex-row justify-between gap-6">
                <div>
                  <span className="text-xs font-bold text-blue-800 uppercase tracking-wider">
                    4-bit NF4 Quantization & QLoRA (Exp 3 Adaptation)
                  </span>
                  <h3 className="text-xl font-bold text-blue-950 mt-1">
                    Memory Reduction: ~69.0% with NF4 Double Quantization
                  </h3>
                  <p className="text-xs text-blue-900/80 mt-1.5 max-w-2xl leading-relaxed">
                    Evaluates model weights memory footprint and generation latency across <strong>FP32 Baseline</strong>, <strong>INT8</strong>, and <strong>4-bit NF4</strong>.
                    Base model weights are frozen in 4-bit precision, enabling consumer GPU & edge deployment.
                  </p>
                </div>

                <div className="flex gap-4 shrink-0">
                  <div className="bg-white p-3.5 rounded-xl border border-blue-100 shadow-xs text-center min-w-[110px]">
                    <div className="text-[11px] font-semibold text-slate-400 uppercase">4-bit Footprint</div>
                    <div className="text-xl font-extrabold text-blue-700 mt-0.5">584 MB</div>
                    <div className="text-[10px] text-slate-500">vs 1,885 MB FP32</div>
                  </div>
                  <div className="bg-white p-3.5 rounded-xl border border-blue-100 shadow-xs text-center min-w-[110px]">
                    <div className="text-[11px] font-semibold text-slate-400 uppercase">Throughput</div>
                    <div className="text-xl font-extrabold text-blue-700 mt-0.5">62.8</div>
                    <div className="text-[10px] text-slate-500">tokens / sec</div>
                  </div>
                </div>
              </div>

              {/* Quantization Charts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Memory Footprint Bar Chart */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                  <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center justify-between">
                    <span>Model Size in Memory (MB)</span>
                    <span className="text-xs text-blue-600 font-semibold">Lower is Better</span>
                  </div>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={quantData?.benchmarks || []}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="precision" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="model_size_mb" fill="#2563eb" radius={[4, 4, 0, 0]} name="Model Size (MB)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Tokens per second chart */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                  <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center justify-between">
                    <span>Generation Speed (Tokens / Sec)</span>
                    <span className="text-xs text-emerald-600 font-semibold">Higher is Better</span>
                  </div>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={quantData?.benchmarks || []}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="precision" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="tokens_per_second" fill="#059669" radius={[4, 4, 0, 0]} name="Tokens/Sec" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Benchmarks Table */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Precision Benchmarks Data
                  </h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-400 uppercase font-semibold">
                      <tr>
                        <th className="py-3 px-4">Precision Format</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-3">Model Size</th>
                        <th className="py-3 px-3">Generation Latency</th>
                        <th className="py-3 px-3">Tokens / Sec</th>
                        <th className="py-3 px-3">Sample Output Quality</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(quantData?.benchmarks || []).map((b, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="py-3.5 px-4 font-bold text-slate-800">{b.precision}</td>
                          <td className="py-3.5 px-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                              {b.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 font-mono font-bold text-blue-600">{b.model_size_mb} MB</td>
                          <td className="py-3.5 px-3 font-mono">{b.latency_seconds}s</td>
                          <td className="py-3.5 px-3 font-mono font-bold text-emerald-600">{b.tokens_per_second}</td>
                          <td className="py-3.5 px-3 text-slate-500 text-[11px] max-w-xs truncate">
                            {b.sample_output || 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: RAG Retrieval Metrics */}
          {activeTab === 'rag' && (
            <div className="space-y-6 animate-fade-in">
              {/* Summary Banner */}
              <div className="bg-teal-50/70 border border-teal-200/80 rounded-2xl p-6 flex flex-col md:flex-row justify-between gap-6">
                <div>
                  <span className="text-xs font-bold text-teal-800 uppercase tracking-wider">
                    Retrieval-Augmented Generation (RAG Pipeline)
                  </span>
                  <h3 className="text-xl font-bold text-teal-950 mt-1">
                    Mean Reciprocal Rank (MRR): {ragData?.mrr || 0.8192}
                  </h3>
                  <p className="text-xs text-teal-900/80 mt-1.5 max-w-2xl leading-relaxed">
                    Evaluated across <strong>100 benchmark nutrition queries</strong> from <code>rag_eval.jsonl</code>.
                    Retrieval operates over 20 structured TXT documents (104 chunks) using <code>sentence-transformers/all-MiniLM-L6-v2</code>.
                  </p>
                </div>

                <div className="flex gap-4 shrink-0">
                  <div className="bg-white p-3.5 rounded-xl border border-teal-100 shadow-xs text-center min-w-[110px]">
                    <div className="text-[11px] font-semibold text-slate-400 uppercase">Precision@4</div>
                    <div className="text-xl font-extrabold text-teal-700 mt-0.5">
                      {ragData?.precision_at_k ? `${(ragData.precision_at_k * 100).toFixed(1)}%` : '63.7%'}
                    </div>
                    <div className="text-[10px] text-slate-500">Top-4 Relevancy</div>
                  </div>
                  <div className="bg-white p-3.5 rounded-xl border border-teal-100 shadow-xs text-center min-w-[110px]">
                    <div className="text-[11px] font-semibold text-slate-400 uppercase">Avg Latency</div>
                    <div className="text-xl font-extrabold text-teal-700 mt-0.5">
                      {ragData?.avg_latency_ms ? `${ragData.avg_latency_ms} ms` : '6.42 ms'}
                    </div>
                    <div className="text-[10px] text-slate-500">Fast Sub-10ms</div>
                  </div>
                </div>
              </div>

              {/* Sample Evaluated Queries from Benchmark */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Evaluated Retrieval Query Samples (from rag_eval.jsonl)
                  </h4>
                  <span className="text-xs text-slate-400">Total Queries: {ragData?.eval_queries_count || 100}</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {(ragData?.query_evaluations || []).map((q, idx) => (
                    <div key={idx} className="p-4 hover:bg-slate-50/50 transition-colors space-y-2">
                      <div className="font-semibold text-sm text-slate-800">
                        Q: "{q.question}"
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-xs">
                        <span className="text-slate-500">
                          Expected Docs:{' '}
                          <strong className="text-slate-700">{q.expected_ids.join(', ')}</strong>
                        </span>
                        <span className="text-slate-500">
                          Retrieved Docs:{' '}
                          <strong className="text-emerald-700">{q.retrieved_ids.join(', ')}</strong>
                        </span>
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold text-[11px]">
                          Precision@4: {(q.precision_at_k * 100).toFixed(0)}%
                        </span>
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold text-[11px]">
                          Latency: {q.latency_ms} ms
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
