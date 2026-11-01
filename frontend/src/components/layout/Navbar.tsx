import React from 'react';
import { Activity, ShieldCheck, Cpu } from 'lucide-react';
import { SystemHealth } from '../../types';

interface NavbarProps {
  title: string;
  subtitle?: string;
  health: SystemHealth | null;
}

export const Navbar: React.FC<NavbarProps> = ({ title, subtitle, health }) => {
  return (
    <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-10">
      <div>
        <h1 className="text-xl font-bold text-slate-800 tracking-tight">{title}</h1>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-4">
        {/* Device Mode Badge */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 text-xs font-medium text-slate-700">
          <Cpu className="w-3.5 h-3.5 text-slate-500" />
          <span>Device: {health?.hardware?.device || 'CPU'}</span>
        </div>

        {/* System Health Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200">
          <Activity className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
          <span>API: {health?.status === 'healthy' ? 'Online' : 'Connected'}</span>
        </div>
      </div>
    </header>
  );
};
