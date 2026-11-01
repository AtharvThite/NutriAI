import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Database,
  BookOpen,
  Cpu,
  Clock,
  ArrowRight,
  UtensilsCrossed,
  MessageSquareText,
  FlaskConical,
  CheckCircle2,
  AlertCircle,
  Flame,
  Activity
} from 'lucide-react';
import { api } from '../services/api';
import { SystemHealth, ExperimentSummary, Meal } from '../types';

export const Dashboard: React.FC = () => {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [summary, setSummary] = useState<ExperimentSummary | null>(null);
  const [recentMeals, setRecentMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        const [healthRes, summaryRes, mealsRes] = await Promise.all([
          api.getHealth().catch(() => null),
          api.getExperimentSummary().catch(() => null),
          api.getMeals(5).catch(() => [])
        ]);
        setHealth(healthRes);
        setSummary(summaryRes);
        setRecentMeals(mealsRes);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Welcome Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-600 p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/30 text-emerald-100 border border-emerald-400/20 backdrop-blur-xs">
            Academic Full-Stack AI/ML Platform
          </span>
          <h2 className="text-3xl font-extrabold mt-3 tracking-tight">
            NutriAI – AI-Powered Indian Food Nutrition Checker
          </h2>
          <p className="mt-2 text-emerald-50 text-sm leading-relaxed">
            Deterministic nutritional calculations powered by the <strong>Anuvaad INDB 2024.11</strong> database,
            combined with <strong>RAG</strong> on 20 educational documents, <strong>LoRA fine-tuning</strong>, and <strong>4-bit NF4 quantization</strong>.
          </p>
        </div>
      </div>

      {/* Live System Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* MongoDB Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Food Database
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Database className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-slate-800">
              {summary?.foods_indexed ? summary.foods_indexed.toLocaleString() : '1,014'}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-emerald-600 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Anuvaad Verified Foods</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
            MongoDB: {health?.database?.mongodb_connected ? 'Connected on port 27017' : 'Offline'}
          </div>
        </div>

        {/* RAG Engine Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              RAG Knowledge Base
            </span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-slate-800">
              20 Documents
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-teal-600 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>104 Chunks (MiniLM-L6-v2)</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
            Status: {health?.rag?.ready ? 'Retriever Ready' : 'Initializing...'}
          </div>
        </div>

        {/* Model & Device Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Base LLM Model
            </span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center text-sky-600">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-sm font-bold text-slate-800 truncate">
              Qwen2.5-0.5B-Instruct
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-sky-600 font-medium">
              <Activity className="w-3.5 h-3.5" />
              <span>Execution: {health?.hardware?.device || 'CPU'}</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
            CUDA: {health?.hardware?.cuda_available ? 'Available' : 'CPU Mode Active'}
          </div>
        </div>

        {/* Experiments Status Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              ML Experiments
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
              <FlaskConical className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-slate-800">
              LoRA & 4-bit
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-purple-600 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Benchmarks Completed</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
            LoRA: {summary?.lora_status || 'Evaluated'} | 4-bit: {summary?.quantization_status || 'Evaluated'}
          </div>
        </div>
      </div>

      {/* Primary Workflow Navigation Cards */}
      <div>
        <h3 className="text-base font-bold text-slate-800 mb-4 tracking-tight">
          Explore NutriAI Modules
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Nutrition Checker */}
          <Link
            to="/nutrition-checker"
            className="group bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:border-emerald-500 hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <UtensilsCrossed className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-slate-800 group-hover:text-emerald-600 transition-colors">
                Nutrition Checker
              </h4>
              <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                Build custom Indian meals, specify gram portions, calculate exact calories, macros, and full 39-nutrient profiles deterministically.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-1 text-sm font-semibold text-emerald-600 group-hover:translate-x-1 transition-transform">
              <span>Open Checker</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>

          {/* Card 2: AI Nutrition Chat */}
          <Link
            to="/chat"
            className="group bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:border-teal-500 hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <MessageSquareText className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-slate-800 group-hover:text-teal-600 transition-colors">
                AI Nutrition Chat
              </h4>
              <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                Ask nutrition questions with RAG grounding from 20 documents, retrieve clinical sources, and clarify meal portion sizes without hallucinations.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-1 text-sm font-semibold text-teal-600 group-hover:translate-x-1 transition-transform">
              <span>Start Conversation</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>

          {/* Card 3: ML Experiments */}
          <Link
            to="/experiments"
            className="group bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:border-purple-500 hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <FlaskConical className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-slate-800 group-hover:text-purple-600 transition-colors">
                ML Experiment Dashboard
              </h4>
              <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                View real benchmark data for LoRA fine-tuning (Rank 4 vs 8 vs 16), 4-bit NF4 double quantization memory/latency, and RAG retrieval MRR.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-1 text-sm font-semibold text-purple-600 group-hover:translate-x-1 transition-transform">
              <span>View Benchmark Data</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>
        </div>
      </div>

      {/* Recent Meal History */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-600" />
            <h3 className="text-base font-bold text-slate-800">Recent Meals Logged</h3>
          </div>
          <Link to="/nutrition-checker" className="text-xs font-semibold text-emerald-600 hover:underline">
            View All in Checker &rarr;
          </Link>
        </div>

        {loading ? (
          <div className="py-8 text-center text-sm text-slate-400">Loading recent meals...</div>
        ) : recentMeals.length === 0 ? (
          <div className="py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-sm text-slate-500">
            No meals logged yet. Go to the <Link to="/nutrition-checker" className="text-emerald-600 font-semibold underline">Nutrition Checker</Link> to build and save your first meal!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-slate-400 uppercase bg-slate-50/70 border-b border-slate-100">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Meal Name</th>
                  <th className="py-2.5 px-3 font-semibold">Items</th>
                  <th className="py-2.5 px-3 font-semibold">Weight</th>
                  <th className="py-2.5 px-3 font-semibold">Calories</th>
                  <th className="py-2.5 px-3 font-semibold">Macros (C / P / F)</th>
                  <th className="py-2.5 px-3 font-semibold">Logged At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentMeals.map((meal) => (
                  <tr key={meal.meal_id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-3 font-semibold text-slate-800">{meal.meal_name}</td>
                    <td className="py-3 px-3 text-slate-600 text-xs">
                      {meal.items.map((i) => `${i.food_name} (${i.quantity_g}g)`).join(', ')}
                    </td>
                    <td className="py-3 px-3 text-slate-600 font-mono text-xs">{meal.total_weight_g}g</td>
                    <td className="py-3 px-3 font-bold text-emerald-600">
                      {meal.total_nutrients?.energy_kcal ? `${Math.round(meal.total_nutrients.energy_kcal)} kcal` : 'N/A'}
                    </td>
                    <td className="py-3 px-3 text-xs text-slate-600">
                      {meal.macronutrient_ratios?.carb_energy_pct}% / {meal.macronutrient_ratios?.protein_energy_pct}% / {meal.macronutrient_ratios?.fat_energy_pct}%
                    </td>
                    <td className="py-3 px-3 text-xs text-slate-400">
                      {new Date(meal.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
