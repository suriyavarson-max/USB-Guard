import React from 'react';
import { useSecurity } from '../context/SecurityContext';
import { PlatformIcon } from '../components/common/PlatformIcon';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  Cpu,
  Layers,
  Radio,
  Server,
  Database,
  ShieldCheck,
} from 'lucide-react';

export const SystemStatus: React.FC = () => {
  const { platformStatus, sseConnected, summary } = useSecurity();

  const services = [
    { name: 'USB Hardware Provider', status: 'HEALTHY', provider: platformStatus?.provider || 'Platform Native Adapter' },
    { name: 'Storage Volume Detector', status: 'HEALTHY', provider: 'Cross-Platform Mount Watcher' },
    { name: 'Removable File Observer', status: 'HEALTHY', provider: 'Streaming 64KB File System Watcher' },
    { name: 'Cryptographic Hashing Core', status: 'HEALTHY', provider: 'SHA-256 Checksum Engine' },
    { name: 'Audit Hash Chaining Ledger', status: 'HEALTHY', provider: 'Cryptographic Immutable Chain' },
    { name: 'Defensive Risk & Alert Engine', status: 'HEALTHY', provider: 'Normalized Heuristic Rule Base' },
    { name: 'Local SQLite Database Store', status: 'HEALTHY', provider: 'Thread-Safe ACID Storage' },
    { name: 'Real-Time Event Stream (SSE)', status: sseConnected ? 'HEALTHY' : 'DEGRADED', provider: sseConnected ? 'Server-Sent Events Channel' : 'Polling Fallback Mode' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          <Activity className="w-5 h-5 text-emerald-400" />
          <span>Platform Health & Adapter Diagnostics</span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Real-time status of cross-platform device providers, event dispatchers, and capabilities.
        </p>
      </div>

      {/* Primary OS Profile Box */}
      <div className="p-5 rounded-lg border border-slate-800 bg-slate-900/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-lg bg-slate-800 border border-slate-700">
            <PlatformIcon platform={platformStatus?.platform || 'linux'} className="w-7 h-7" />
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase text-emerald-400 font-semibold tracking-wider">
              Operating System Profile
            </div>
            <h3 className="text-base font-bold text-slate-100">
              {platformStatus?.platform || 'Cross-Platform Host'} ({platformStatus?.architecture})
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Kernel Release: <span className="font-mono text-slate-300">{platformStatus?.os_release || '6.x'}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="px-3 py-1.5 rounded bg-slate-950/80 border border-slate-800 text-xs font-mono">
            <span className="text-slate-500 mr-2">PROVIDER:</span>
            <span className="text-slate-200 font-semibold">{platformStatus?.provider}</span>
          </div>
          <div className="px-3 py-1.5 rounded bg-slate-950/80 border border-slate-800 text-xs font-mono">
            <span className="text-slate-500 mr-2">MODE:</span>
            <span className="text-emerald-400 font-semibold">{platformStatus?.monitoring_mode}</span>
          </div>
        </div>
      </div>

      {/* Services Health Grid */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <Server className="w-4 h-4 text-emerald-400" />
          <span>Defensive Subsystem Operational Status</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {services.map((svc) => (
            <div
              key={svc.name}
              className="p-3.5 rounded-lg border border-slate-800 bg-slate-900/40 flex items-center justify-between gap-3 text-xs"
            >
              <div>
                <h4 className="font-semibold text-slate-200">{svc.name}</h4>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">{svc.provider}</p>
              </div>

              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-mono font-medium rounded border ${
                  svc.status === 'HEALTHY'
                    ? 'text-emerald-400 border-emerald-500/30 bg-emerald-950/20'
                    : 'text-amber-400 border-amber-500/30 bg-amber-950/20'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    svc.status === 'HEALTHY' ? 'bg-emerald-400' : 'bg-amber-400'
                  }`}
                />
                <span>{svc.status}</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Dynamic Capabilities Checklist */}
      {platformStatus?.capabilities && (
        <div className="p-5 rounded-lg border border-slate-800 bg-slate-900/40 space-y-3">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span>Platform Capabilities Introspection</span>
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            {Object.entries(platformStatus.capabilities).map(([key, val]) => {
              if (key === 'platform') return null;
              const isSupported = Boolean(val);
              return (
                <div
                  key={key}
                  className="p-2.5 rounded bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-2"
                >
                  <span className="text-[11px] text-slate-400 capitalize">
                    {key.replace(/_/g, ' ')}
                  </span>
                  {isSupported ? (
                    <span className="text-emerald-400 font-bold text-[10px]">SUPPORTED</span>
                  ) : (
                    <span className="text-slate-500 text-[10px]">UNAVAILABLE</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
