import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Leaf,
  Utensils,
  Brain,
  MessageSquare,
  ArrowRight,
  ArrowLeftRight,
  Sparkles,
  ShieldCheck,
  LogOut,
  ChevronRight,
  HeartPulse,
  Flame,
  CheckCircle2,
  Layers,
  Search
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LandingPage: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-600/20 group-hover:scale-105 transition-transform">
              <Leaf className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-2xl tracking-tight text-slate-900">
                  Nutri<span className="text-emerald-600">AI</span>
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase tracking-widest">
                  v1.0
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">Indian Food Nutrition & ML Intelligence</p>
            </div>
          </Link>

          {/* Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
            <a href="#features" className="hover:text-emerald-600 transition-colors">Features</a>
            <a href="#demo" className="hover:text-emerald-600 transition-colors">Live Demo</a>
            <a href="#how-it-works" className="hover:text-emerald-600 transition-colors">How It Works</a>
            <Link to="/alternatives" className="hover:text-emerald-600 transition-colors">Smart Alternatives</Link>
            <Link to="/experiments" className="hover:text-emerald-600 transition-colors">Benchmarks</Link>
          </nav>

          {/* Auth CTA */}
          <div className="flex items-center gap-3">
            {isAuthenticated && user ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-xs font-bold text-slate-900">{user.full_name}</span>
                  <span className="text-[11px] text-emerald-600 font-medium">{user.dietary_preference} • {user.daily_calorie_target} kcal</span>
                </div>
                <Link
                  to="/dashboard"
                  className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/20 flex items-center gap-1.5"
                >
                  <span>Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <button
                  onClick={handleLogout}
                  title="Sign Out"
                  className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors border border-slate-200 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 sm:gap-3">
                <Link
                  to="/login"
                  className="px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transform hover:scale-102"
                >
                  <span>Get Started Free</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28 bg-gradient-to-b from-white via-emerald-50/20 to-slate-50">
        {/* Subtle decorative background blur shapes */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-emerald-200/25 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] bg-teal-200/20 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-100/80 border border-emerald-200 text-emerald-800 text-xs font-semibold mb-6 animate-fade-in shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>ICMR-NIN IFCT 2017 & Anuvaad Composition Engine</span>
          </div>

          {/* Heading */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-slate-900 tracking-tight leading-[1.1] max-w-5xl mx-auto">
            AI-Powered <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700">Indian Food Nutrition</span> Checker & Intelligence
          </h1>

          {/* Subtitle */}
          <p className="mt-6 text-base sm:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            Deterministic macro & micronutrient calculation for over 1,000 authentic Indian foods, powered by a fine-tuned LoRA model for conversational meal parsing and verified RAG citations.
          </p>

          {/* Dual Action CTAs */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              to={isAuthenticated ? "/dashboard" : "/signup"}
              className="px-7 py-3.5 rounded-2xl text-base font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-xl shadow-emerald-600/25 flex items-center gap-2 transform hover:-translate-y-0.5"
            >
              <span>{isAuthenticated ? "Launch Dashboard" : "Start Checking Nutrition"}</span>
              <ArrowRight className="w-5 h-5" />
            </Link>

            <Link
              to="/meal-intelligence"
              className="px-6 py-3.5 rounded-2xl text-base font-semibold bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 transition-all flex items-center gap-2 shadow-xs hover:border-emerald-300"
            >
              <Brain className="w-5 h-5 text-emerald-600" />
              <span>Explore AI Meal Parser</span>
            </Link>
          </div>

          {/* Key Stats Strip */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto text-left">
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600">1,014+</div>
              <div className="text-xs text-slate-500 mt-1 font-medium">Verified Indian Foods (Anuvaad & IFCT 2017)</div>
            </div>
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-2xl sm:text-3xl font-extrabold text-teal-600">100%</div>
              <div className="text-xs text-slate-500 mt-1 font-medium">Deterministic Macro Math (0% Hallucination)</div>
            </div>
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-2xl sm:text-3xl font-extrabold text-cyan-600">LoRA PEFT</div>
              <div className="text-xs text-slate-500 mt-1 font-medium">Custom Fine-Tuned Indian Recipe Model</div>
            </div>
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-2xl sm:text-3xl font-extrabold text-amber-600">RAG Cited</div>
              <div className="text-xs text-slate-500 mt-1 font-medium">Vector Knowledge Base with Source Attribution</div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Teaser Card Section */}
      <section id="demo" className="py-20 bg-white border-y border-slate-200 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              Interactive Demonstration
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mt-3">
              See NutriAI Intelligence in Action
            </h2>
            <p className="text-sm text-slate-600 mt-2">
              From informal Indian meal descriptions to lab-grade nutritional breakdowns with macro ratios.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center max-w-5xl mx-auto">
            {/* Input Side */}
            <div className="lg:col-span-5 bg-slate-50 rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <Brain className="w-4 h-4 text-emerald-600" />
                  Natural Language Meal Input
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                  LoRA Parsed
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-white border border-slate-200 text-slate-800 text-sm italic font-mono shadow-2xs">
                "Had 2 butter rotis with 150g paneer butter masala, one bowl dal tadka (100g), and a small salad."
              </div>

              <div className="space-y-2 text-xs">
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Detected Food Items:</div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
                  <span className="font-medium text-slate-800">Wheat Roti (Butter)</span>
                  <span className="font-mono text-emerald-700 font-semibold">2 pcs (70g)</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
                  <span className="font-medium text-slate-800">Paneer Butter Masala</span>
                  <span className="font-mono text-emerald-700 font-semibold">150g</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
                  <span className="font-medium text-slate-800">Dal Tadka (Yellow Lentils)</span>
                  <span className="font-mono text-emerald-700 font-semibold">100g</span>
                </div>
              </div>
            </div>

            {/* Output Analytics Card */}
            <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-emerald-300 shadow-xl shadow-emerald-600/5">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Precision Nutrition Results</span>
                  <h3 className="text-xl font-bold text-slate-900">Calculated Meal Profile</h3>
                </div>
                <div className="px-3 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  IFCT 2017 Verified
                </div>
              </div>

              {/* Macro Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200">
                  <div className="text-[11px] text-amber-800 font-semibold uppercase">Total Energy</div>
                  <div className="text-xl font-black text-amber-900 mt-1">584 <span className="text-xs font-normal text-amber-700">kcal</span></div>
                </div>
                <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200">
                  <div className="text-[11px] text-emerald-800 font-semibold uppercase">Protein</div>
                  <div className="text-xl font-black text-emerald-900 mt-1">22.4 <span className="text-xs font-normal text-emerald-700">g</span></div>
                </div>
                <div className="p-3.5 rounded-2xl bg-cyan-50/80 border border-cyan-200">
                  <div className="text-[11px] text-cyan-800 font-semibold uppercase">Carbohydrates</div>
                  <div className="text-xl font-black text-cyan-900 mt-1">64.2 <span className="text-xs font-normal text-cyan-700">g</span></div>
                </div>
                <div className="p-3.5 rounded-2xl bg-rose-50/80 border border-rose-200">
                  <div className="text-[11px] text-rose-800 font-semibold uppercase">Fats</div>
                  <div className="text-xl font-black text-rose-900 mt-1">26.8 <span className="text-xs font-normal text-rose-700">g</span></div>
                </div>
              </div>

              {/* Micronutrients Row */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 mb-6">
                <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <HeartPulse className="w-3.5 h-3.5 text-rose-500" />
                  Key Micronutrients Extracted
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500">Dietary Fibre:</span> <strong className="text-slate-800 font-bold"> 8.5g</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Calcium:</span> <strong className="text-slate-800 font-bold"> 312mg</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Iron:</span> <strong className="text-slate-800 font-bold"> 4.1mg</strong>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Ready to test your own meals?</span>
                <Link
                  to="/nutrition-checker"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
                >
                  <span>Open Meal Builder</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section id="features" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            NutriAI Core Capabilities
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight mt-3">
            Engineered for Authentic Indian Nutrition
          </h2>
          <p className="text-slate-600 text-sm sm:text-base mt-4 leading-relaxed">
            Standard Western nutrition apps fail when confronted with complex regional Indian recipes, cooking oils, and thali combinations. NutriAI was built specifically to solve this.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1 */}
          <div className="p-7 rounded-3xl bg-white border border-slate-200 hover:border-emerald-400 hover:shadow-xl hover:shadow-emerald-600/5 transition-all group flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mb-5 group-hover:scale-110 transition-transform">
                <Utensils className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Macro Calculator</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Build Indian meals with gram-level precision. Get instant energy, protein, carbohydrate, fat, and dietary fibre metrics with 0% AI estimation error.
              </p>
            </div>
            <Link to="/nutrition-checker" className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 mt-5 group-hover:translate-x-1 transition-transform">
              Explore Foods <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Card 2 */}
          <div className="p-7 rounded-3xl bg-white border border-slate-200 hover:border-emerald-400 hover:shadow-xl hover:shadow-emerald-600/5 transition-all group flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mb-5 group-hover:scale-110 transition-transform">
                <ArrowLeftRight className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Smart Food Alternatives</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Discover nutritionally comparable substitutes ranked by higher protein, lower calories, or fibre, with side-by-side comparison tables.
              </p>
            </div>
            <Link to="/alternatives" className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 mt-5 group-hover:translate-x-1 transition-transform">
              Find Alternatives <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Card 3 */}
          <div className="p-7 rounded-3xl bg-white border border-slate-200 hover:border-teal-400 hover:shadow-xl hover:shadow-teal-600/5 transition-all group flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600 mb-5 group-hover:scale-110 transition-transform">
                <Brain className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">LoRA Meal Intelligence</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Fine-tuned adapter understands Indian colloquialisms like "katori", "phulka", "chammach ghee", and regional preparation styles.
              </p>
            </div>
            <Link to="/meal-intelligence" className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-600 mt-5 group-hover:translate-x-1 transition-transform">
              Test Meal Parser <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Card 4 */}
          <div className="p-7 rounded-3xl bg-white border border-slate-200 hover:border-cyan-400 hover:shadow-xl hover:shadow-cyan-600/5 transition-all group flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-cyan-50 border border-cyan-200 flex items-center justify-center text-cyan-600 mb-5 group-hover:scale-110 transition-transform">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">RAG Nutrition Chat</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Vector search across Indian medical and nutritional guidelines via Qdrant & LangChain. Transparent document citations for every recommendation.
              </p>
            </div>
            <Link to="/chat" className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-600 mt-5 group-hover:translate-x-1 transition-transform">
              Ask AI Assistant <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 bg-slate-100/70 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              Simple 3-Step Flow
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-3">How NutriAI Works</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 font-extrabold text-lg flex items-center justify-center mx-auto mb-4 border border-emerald-200">
                1
              </div>
              <h4 className="text-lg font-bold text-slate-900 mb-2">Input Your Meal</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Describe in plain English or Hinglish, or pick directly from the verified 1,014 Indian food registry.
              </p>
            </div>

            <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 font-extrabold text-lg flex items-center justify-center mx-auto mb-4 border border-teal-200">
                2
              </div>
              <h4 className="text-lg font-bold text-slate-900 mb-2">Composition Mapping</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Our LoRA parser standardizes colloquial quantities and links each item to verified ICMR-NIN food codes.
              </p>
            </div>

            <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-cyan-50 text-cyan-700 font-extrabold text-lg flex items-center justify-center mx-auto mb-4 border border-cyan-200">
                3
              </div>
              <h4 className="text-lg font-bold text-slate-900 mb-2">Actionable Health Insights</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Review complete macro ratios, micronutrients, and consult the RAG chatbot for dietary adjustments.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Banner */}
      <section className="py-20 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white text-center relative overflow-hidden shadow-2xl shadow-emerald-700/20">
          <div className="relative z-10 max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Start Tracking Your Indian Diet with Precision
            </h2>
            <p className="text-sm text-emerald-50 mt-3 mb-8">
              Sign up in seconds to save custom meals, personalize daily calorie targets, and unlock fine-tuned AI intelligence.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link
                to={isAuthenticated ? "/dashboard" : "/signup"}
                className="px-8 py-3.5 rounded-xl font-bold text-emerald-950 bg-white hover:bg-emerald-50 transition-colors shadow-lg flex items-center gap-2"
              >
                <span>{isAuthenticated ? "Launch Dashboard" : "Create Free Account"}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              {!isAuthenticated && (
                <Link
                  to="/login"
                  className="px-6 py-3.5 rounded-xl font-semibold text-white bg-emerald-800/60 hover:bg-emerald-800 transition-colors border border-emerald-400/40"
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-10 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Leaf className="w-4 h-4 text-emerald-600" />
            <span className="font-bold text-slate-800">NutriAI Platform</span>
            <span>• Full-Stack Indian Food Nutrition Checker</span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/nutrition-checker" className="hover:text-slate-800">Foods</Link>
            <Link to="/meal-intelligence" className="hover:text-slate-800">Meal Intelligence</Link>
            <Link to="/chat" className="hover:text-slate-800">Chatbot</Link>
            <Link to="/experiments" className="hover:text-slate-800">Experiments</Link>
          </div>
          <div>
            © {new Date().getFullYear()} NutriAI. Built with PyTorch, FastAPI, MongoDB & React.
          </div>
        </div>
      </footer>
    </div>
  );
};
