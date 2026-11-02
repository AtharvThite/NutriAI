import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, Cpu, LogOut, LogIn } from 'lucide-react';
import { SystemHealth } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface NavbarProps {
  title: string;
  subtitle?: string;
  health: SystemHealth | null;
}

export const Navbar: React.FC<NavbarProps> = ({ title, subtitle, health }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 sm:px-8 flex items-center justify-between sticky top-0 z-10">
      <div>
        <h1 className="text-xl font-bold text-slate-800 tracking-tight">{title}</h1>
        {subtitle && <p className="text-xs text-slate-500 hidden sm:block">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        {/* Device Mode Badge */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 text-xs font-medium text-slate-700">
          <Cpu className="w-3.5 h-3.5 text-slate-500" />
          <span>Device: {health?.hardware?.device || 'CPU'}</span>
        </div>

        {/* System Health Badge */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200">
          <Activity className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
          <span>API: {health?.status === 'healthy' ? 'Online' : 'Connected'}</span>
        </div>

        {/* User Auth Section */}
        {isAuthenticated && user ? (
          <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                {user.full_name.charAt(0).toUpperCase()}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-bold text-slate-800 truncate max-w-[120px]">{user.full_name}</div>
                <div className="text-[10px] text-emerald-600 font-medium leading-none">{user.dietary_preference}</div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <Link
              to="/login"
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-1.5"
            >
              <LogIn className="w-3.5 h-3.5 text-slate-500" />
              <span>Sign In</span>
            </Link>
            <Link
              to="/signup"
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-xs"
            >
              Sign Up
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};
