import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Leaf,
  Mail,
  Lock,
  User as UserIcon,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Flame,
  Utensils
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AuthPageProps {
  initialMode?: 'signin' | 'signup';
}

export const AuthPage: React.FC<AuthPageProps> = ({ initialMode = 'signin' }) => {
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const { login, signup, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // If already logged in, show quick prompt or redirect
  const from = (location.state as any)?.from?.pathname || '/dashboard';

  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [dietaryPreference, setDietaryPreference] = useState('Vegetarian');
  const [dailyCalorieTarget, setDailyCalorieTarget] = useState(2000);
  const [showPassword, setShowPassword] = useState(false);

  // Status state
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already authenticated, redirect
  React.useEffect(() => {
    if (isAuthenticated && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      if (mode === 'signin') {
        if (!email.trim() || !password.trim()) {
          setErrorMsg('Please enter both email and password.');
          setIsSubmitting(false);
          return;
        }
        await login({ email: email.trim(), password });
        navigate(from, { replace: true });
      } else {
        if (!fullName.trim() || !email.trim() || !password.trim()) {
          setErrorMsg('Please fill in all required fields.');
          setIsSubmitting(false);
          return;
        }
        if (password.length < 6) {
          setErrorMsg('Password must be at least 6 characters long.');
          setIsSubmitting(false);
          return;
        }
        await signup({
          email: email.trim(),
          password,
          full_name: fullName.trim(),
          dietary_preference: dietaryPreference,
          daily_calorie_target: dailyCalorieTarget
        });
        navigate(from, { replace: true });
      }
    } catch (err: any) {
      console.error('Authentication error:', err);
      const detail = err.response?.data?.detail || err.message || 'Authentication failed. Please try again.';
      setErrorMsg(detail);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoFill = () => {
    setErrorMsg(null);
    if (mode === 'signin') {
      setEmail('demo@nutriai.com');
      setPassword('nutriai123');
    } else {
      setFullName('Aditi Sharma');
      setEmail(`aditi.${Math.floor(Math.random() * 900 + 100)}@nutriai.com`);
      setPassword('nutriai123');
      setDietaryPreference('Vegetarian');
      setDailyCalorieTarget(1950);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-teal-50/20 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Glow Blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-200/30 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-200/20 rounded-full blur-3xl pointer-events-none translate-x-1/2 translate-y-1/2" />

      {/* Header / Brand */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10 px-4">
        <Link to="/" className="inline-flex items-center gap-2.5 mb-4 group">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-600/20 group-hover:scale-105 transition-transform">
            <Leaf className="w-6 h-6" />
          </div>
          <span className="text-2xl font-black text-slate-900 tracking-tight">Nutri<span className="text-emerald-600">AI</span></span>
        </Link>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          {mode === 'signin' ? 'Welcome back' : 'Create your account'}
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          {mode === 'signin'
            ? 'Access your Indian food nutrition intelligence & meal history'
            : 'Join NutriAI for precision Anuvaad composition & LoRA meal parsing'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-xl shadow-slate-200/80 rounded-3xl border border-slate-200">
          {/* Mode Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-2xl mb-6">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setErrorMsg(null);
              }}
              className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-all cursor-pointer ${
                mode === 'signin'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setErrorMsg(null);
              }}
              className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-all cursor-pointer ${
                mode === 'signup'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5 animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
              <div className="flex-1 font-medium">{errorMsg}</div>
            </div>
          )}

          {/* Form */}
          <form className="space-y-4" onSubmit={handleSubmit}>
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Aditi Sharma"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {mode === 'signup' && (
                <p className="mt-1 text-[11px] text-slate-400">Must be at least 6 characters</p>
              )}
            </div>

            {mode === 'signup' && (
              <>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Dietary Diet
                    </label>
                    <div className="relative">
                      <select
                        value={dietaryPreference}
                        onChange={(e) => setDietaryPreference(e.target.value)}
                        className="w-full pl-3 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 appearance-none transition-all cursor-pointer"
                      >
                        <option value="Vegetarian">Vegetarian</option>
                        <option value="Non-Vegetarian">Non-Vegetarian</option>
                        <option value="Vegan">Vegan</option>
                        <option value="Jain">Jain</option>
                        <option value="Eggetarian">Eggetarian</option>
                      </select>
                      <Utensils className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3.5 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Daily Calories
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1000"
                        max="5000"
                        step="50"
                        value={dailyCalorieTarget}
                        onChange={(e) => setDailyCalorieTarget(Number(e.target.value))}
                        className="w-full pl-8 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                      />
                      <Flame className="w-3.5 h-3.5 text-amber-500 absolute left-3 top-3.5 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-3 px-4 rounded-xl font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 shadow-lg shadow-emerald-600/20 transition-all transform active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>{mode === 'signin' ? 'Sign In to NutriAI' : 'Create Free Account'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Pre-fill */}
          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">Want to test quickly?</span>
            <button
              type="button"
              onClick={handleDemoFill}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors border border-emerald-200/60"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              Fill Demo Info
            </button>
          </div>
        </div>

        {/* Back Link */}
        <div className="mt-6 text-center">
          <Link
            to="/"
            className="text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors inline-flex items-center gap-1.5"
          >
            ← Return to Landing Page
          </Link>
        </div>
      </div>
    </div>
  );
};
