import React from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  UtensilsCrossed,
  MessageSquareText,
  FlaskConical,
  Sparkles,
  Database,
  Leaf,
  ChefHat,
  ArrowLeftRight,
  LogOut,
  LogIn
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  systemHealth?: {
    database: { mongodb_connected: boolean };
    rag: { ready: boolean };
  } | null;
}

export const Sidebar: React.FC<SidebarProps> = ({ systemHealth }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navItems = [
    {
      to: '/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      description: 'System metrics & overview'
    },
    {
      to: '/nutrition-checker',
      label: 'Nutrition Checker',
      icon: UtensilsCrossed,
      description: 'Indian food meal builder'
    },
    {
      to: '/meal-intelligence',
      label: 'AI Meal Intelligence',
      icon: ChefHat,
      description: 'LoRA natural language meal parser'
    },
    {
      to: '/chat',
      label: 'AI Nutrition Chat',
      icon: MessageSquareText,
      description: 'RAG & composition assistant'
    },
    {
      to: '/alternatives',
      label: 'Smart Alternatives',
      icon: ArrowLeftRight,
      description: 'Nutritional substitute finder & comparison'
    },
    {
      to: '/experiments',
      label: 'ML Experiments',
      icon: FlaskConical,
      description: 'LoRA, QLoRA & Quantization'
    }
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0 select-none">
      {/* Brand Header */}
      <Link to="/dashboard" className="p-5 border-b border-slate-100 flex items-center gap-3 hover:bg-slate-50/50 transition-colors">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
          <Leaf className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-lg tracking-tight text-slate-800">NutriAI</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 uppercase tracking-wider">
              v1.0
            </span>
          </div>
          <p className="text-xs text-slate-400">Indian Food Nutrition & ML</p>
        </div>
      </Link>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
        <div className="px-3 py-1.5 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
          Application
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive
                  ? 'bg-emerald-50 text-emerald-700 shadow-xs border border-emerald-200/60 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="truncate">{item.label}</div>
              </div>
            </NavLink>
          );
        })}
      </nav>

      {/* Live Service Status Footer */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/50 space-y-2">
        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-emerald-600" />
            Service Status
          </span>
          <span className={`w-1.5 h-1.5 rounded-full ${systemHealth?.database?.mongodb_connected ? 'bg-emerald-500' : 'bg-amber-400'}`} />
        </div>
        <div className="space-y-1 text-[11px] text-slate-500">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Database className="w-3 h-3 text-slate-400" />
              MongoDB
            </span>
            <span className="font-mono text-[10px] text-slate-600">1,014 Foods</span>
          </div>
        </div>

        {/* User Status Card */}
        {isAuthenticated && user ? (
          <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                {user.full_name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-800 truncate">{user.full_name}</div>
                <div className="text-[10px] text-slate-400 truncate">{user.email}</div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="pt-2 border-t border-slate-200/60">
            <Link
              to="/login"
              className="w-full py-1.5 px-3 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1.5 shadow-xs"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In / Sign Up</span>
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
};
