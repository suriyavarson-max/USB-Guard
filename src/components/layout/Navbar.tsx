import React from 'react';
import { useSecurity } from '../../context/SecurityContext';
import { useAuth } from '../../context/AuthContext';
import { PlatformIcon } from '../common/PlatformIcon';
import { ShieldCheck, ShieldAlert, Radio, LogOut, GraduationCap, RefreshCw } from 'lucide-react';

interface NavbarProps {
  onOpenDemo: () => void;
  onOpenGuide: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenDemo, onOpenGuide }) => {
  const { summary, platformStatus, sseConnected, refreshData, isLoading } = useSecurity();
  const { user, logout } = useAuth();

  return (
    <header className="h-14 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md px-4 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded bg-gradient-to-br from-emerald-600 to-cyan-700 flex items-center justify-center shadow-lg shadow-emerald-950/50">
          <ShieldCheck className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold text-slate-100 tracking-tight">
              USB Security Monitor & Threat Detection
            </h1>
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
              CAT-5 Project
            </span>
          </div>
          <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <span>Defensive Endpoint Security</span>
            <span>·</span>
            <span>Windows / Linux / macOS</span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Real-time SSE Pulse */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-xs font-mono">
          <span className={`w-2 h-2 rounded-full ${sseConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
          <span className="text-slate-300 text-[11px]">
            {sseConnected ? 'LIVE FEED' : 'POLLING'}
          </span>
        </div>

        {/* Detected OS Status */}
        {platformStatus && (
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-xs">
            <PlatformIcon platform={platformStatus.platform} />
            <span className="text-slate-300 font-medium text-[11px]">{platformStatus.platform}</span>
            <span className="text-slate-500 font-mono text-[10px]">({platformStatus.monitoring_mode})</span>
          </div>
        )}

        {/* Quick Refresh */}
        <button
          onClick={() => refreshData()}
          disabled={isLoading}
          title="Refresh telemetry"
          className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
        </button>

        {/* Viva / CAT-5 Presentation Guide Button */}
        <button
          onClick={onOpenGuide}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/20 transition-all cursor-pointer"
        >
          <GraduationCap className="w-3.5 h-3.5 text-emerald-400" />
          <span>CAT-5 Guide</span>
        </button>

        {/* Live Simulation Lab Button */}
        <button
          onClick={onOpenDemo}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-cyan-950/40 hover:bg-cyan-900/50 text-cyan-300 border border-cyan-500/30 transition-all cursor-pointer"
        >
          <Radio className="w-3.5 h-3.5 text-cyan-400" />
          <span>Simulation Lab</span>
        </button>

        {/* Admin User / Logout */}
        {user && (
          <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
            <div className="text-right hidden md:block">
              <span className="text-xs font-semibold text-slate-200 block leading-tight">{user.username}</span>
              <span className="text-[10px] text-slate-500 font-mono uppercase block">{user.role}</span>
            </div>
            <button
              onClick={() => logout()}
              title="Logout"
              className="p-1.5 rounded hover:bg-rose-950/30 text-slate-400 hover:text-rose-400 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
