import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  UtensilsCrossed,
  MessageSquareText,
  FlaskConical,
  Sparkles,
  Database,
  Leaf
} from 'lucide-react';

interface SidebarProps {
  systemHealth?: {
    database: { mongodb_connected: boolean };
    rag: { ready: boolean };
  } | null;
}

export const Sidebar: React.FC<SidebarProps> = ({ systemHealth }) => {
  const navItems = [
    {
      to: '/',
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
      to: '/chat',
      label: 'AI Nutrition Chat',
      icon: MessageSquareText,
      description: 'RAG & composition assistant'
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
      <div className="p-5 border-b border-slate-100 flex items-center gap-3">
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
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
        <div className="px-3 py-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
          Application
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
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
      <div className="p-4 border-t border-slate-100 bg-slate-50/60">
        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-emerald-600" />
          Service Status
        </div>
        <div className="space-y-1.5 text-xs text-slate-600">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-slate-400" />
              MongoDB (1,014 Foods)
            </span>
            <span className={`w-2 h-2 rounded-full ${systemHealth?.database?.mongodb_connected ? 'bg-emerald-500' : 'bg-amber-400 animate-pulse'}`} />
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-slate-400" />
              RAG Knowledge Engine
            </span>
            <span className={`w-2 h-2 rounded-full ${systemHealth?.rag?.ready ? 'bg-emerald-500' : 'bg-blue-400'}`} />
          </div>
        </div>
      </div>
    </aside>
  );
};
