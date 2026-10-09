import React from 'react';
import { useSecurity } from '../context/SecurityContext';
import { StatusBadge } from '../components/common/StatusBadge';
import { RiskBadge } from '../components/common/RiskBadge';
import { PlatformIcon } from '../components/common/PlatformIcon';
import {
  Usb,
  HardDrive,
  AlertTriangle,
  FileText,
  ShieldCheck,
  ShieldAlert,
  Activity,
  CheckCircle2,
  Clock,
  ArrowRight,
} from 'lucide-react';

interface DashboardProps {
  onNavigate: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { summary, platformStatus, devices, volumes, activeAlerts, recentEvents } = useSecurity();

  const connectedDevs = devices.filter((d) => d.active_connection);

  return (
    <div className="space-y-6">
      {/* Top Banner / Platform Summary Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Host OS Card */}
        <div className="lg:col-span-2 p-5 rounded-lg border border-slate-800 bg-slate-900/60 backdrop-blur-sm relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded bg-slate-800 border border-slate-700">
                <PlatformIcon platform={summary?.platform || 'linux'} className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-emerald-400 tracking-wider font-semibold">
                  Host Platform Monitor
                </span>
                <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <span>Operating System:</span>
                  <span className="text-emerald-300 font-mono">{summary?.platform || 'Detecting...'}</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Adapter: <span className="text-slate-200 font-mono">{summary?.provider_name || 'Cross-Platform Adapter'}</span>
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-medium rounded bg-emerald-950/40 text-emerald-400 border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {summary?.provider_status || 'ACTIVE'}
              </span>
              <span className="text-[10px] text-slate-400 font-mono block mt-1">
                Mode: {summary?.monitoring_mode || 'NATIVE'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-800/80 text-xs">
            <div>
              <span className="text-slate-500 block text-[11px]">Hardware Monitoring</span>
              <span className="font-semibold text-emerald-400 font-mono flex items-center gap-1 mt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> ACTIVE
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Removable File Monitor</span>
              <span className="font-semibold text-emerald-400 font-mono flex items-center gap-1 mt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> ACTIVE
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">SHA-256 Hashing Engine</span>
              <span className="font-semibold text-emerald-400 font-mono flex items-center gap-1 mt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> 64KB STREAM
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Audit Hash Chaining</span>
              <span className="font-semibold text-emerald-400 font-mono flex items-center gap-1 mt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> TAMPER-EVIDENT
              </span>
            </div>
          </div>
        </div>

        {/* Risk Gauge Card */}
        <div className="p-5 rounded-lg border border-slate-800 bg-slate-900/60 backdrop-blur-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Fleet Threat Posture
            </span>
            <Activity className="w-4 h-4 text-slate-400" />
          </div>

          <div className="my-3 flex items-baseline gap-3">
            <div className="text-4xl font-extrabold font-mono text-slate-100">
              {summary?.average_risk_score ?? 0}
              <span className="text-sm text-slate-500 font-normal"> / 100</span>
            </div>
            <div>
              <RiskBadge
                score={summary?.average_risk_score ?? 0}
                level={
                  (summary?.average_risk_score ?? 0) >= 75
                    ? 'CRITICAL'
                    : (summary?.average_risk_score ?? 0) >= 50
                    ? 'HIGH'
                    : (summary?.average_risk_score ?? 0) >= 25
                    ? 'MEDIUM'
                    : 'LOW'
                }
                showScore={false}
              />
            </div>
          </div>

          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                (summary?.average_risk_score ?? 0) >= 75
                  ? 'bg-rose-500'
                  : (summary?.average_risk_score ?? 0) >= 50
                  ? 'bg-amber-500'
                  : (summary?.average_risk_score ?? 0) >= 25
                  ? 'bg-yellow-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, summary?.average_risk_score ?? 0)}%` }}
            />
          </div>

          <div className="text-[11px] text-slate-400 mt-2 flex items-center justify-between">
            <span>Critical Alerts: {summary?.critical_alerts ?? 0}</span>
            <span>Audit: {summary?.audit_integrity_status || 'VALID'}</span>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Connected USBs */}
        <div
          onClick={() => onNavigate('devices')}
          className="p-4 rounded-lg border border-slate-800 bg-slate-900/40 hover:bg-slate-900/70 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Connected Devices</span>
            <Usb className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-slate-100">
            {summary?.connected_devices ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5">
            <span className="text-emerald-400 font-semibold">{summary?.authorized_devices ?? 0} auth</span>
            <span>·</span>
            <span className="text-amber-400 font-semibold">{summary?.unauthorized_devices ?? 0} unauth</span>
            <span>·</span>
            <span className="text-rose-400 font-semibold">{summary?.blocked_devices ?? 0} block</span>
          </div>
        </div>

        {/* Mounted Volumes */}
        <div
          onClick={() => onNavigate('volumes')}
          className="p-4 rounded-lg border border-slate-800 bg-slate-900/40 hover:bg-slate-900/70 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Storage Volumes</span>
            <HardDrive className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-slate-100">
            {summary?.mounted_volumes ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Removable media partitions mounted
          </div>
        </div>

        {/* Active Alerts */}
        <div
          onClick={() => onNavigate('alerts')}
          className="p-4 rounded-lg border border-slate-800 bg-slate-900/40 hover:bg-slate-900/70 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Security Alerts</span>
            <AlertTriangle className="w-4 h-4 text-rose-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-slate-100">
            {summary?.total_alerts ?? 0}
          </div>
          <div className="text-[11px] text-rose-400/90 mt-1">
            {summary?.critical_alerts ?? 0} critical incidents logged
          </div>
        </div>

        {/* File Events */}
        <div
          onClick={() => onNavigate('files')}
          className="p-4 rounded-lg border border-slate-800 bg-slate-900/40 hover:bg-slate-900/70 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Removable File Events</span>
            <FileText className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-slate-100">
            {summary?.total_file_events_today ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            SHA-256 integrity monitored
          </div>
        </div>
      </div>

      {/* Split Section: Active Devices vs Recent Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Connected USB Devices Table */}
        <div className="p-4 rounded-lg border border-slate-800 bg-slate-900/40">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Usb className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-slate-200">Attached USB Peripherals</h3>
            </div>
            <button
              onClick={() => onNavigate('devices')}
              className="text-xs text-slate-400 hover:text-emerald-400 flex items-center gap-1 transition-colors"
            >
              <span>View all ({devices.length})</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-2">
            {connectedDevs.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                No active USB devices currently attached to physical ports.
              </div>
            ) : (
              connectedDevs.map((dev) => (
                <div
                  key={dev.id}
                  className="p-3 rounded border border-slate-800/80 bg-slate-950/40 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded bg-slate-900 border border-slate-800">
                      <PlatformIcon platform={dev.platform} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-200 leading-snug">{dev.device_name}</h4>
                      <p className="text-[11px] font-mono text-slate-400">
                        VID: {dev.vendor_id} · PID: {dev.product_id} · {dev.serial_number || 'No Serial'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <StatusBadge status={dev.status} />
                    <RiskBadge score={dev.risk_score} level={dev.risk_level} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Priority Security Alerts */}
        <div className="p-4 rounded-lg border border-slate-800 bg-slate-900/40">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-semibold text-slate-200">Incident Detection Queue</h3>
            </div>
            <button
              onClick={() => onNavigate('alerts')}
              className="text-xs text-slate-400 hover:text-rose-400 flex items-center gap-1 transition-colors"
            >
              <span>View all ({activeAlerts.length})</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-2">
            {activeAlerts.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto mb-1.5 opacity-60" />
                No unacknowledged security alerts detected.
              </div>
            ) : (
              activeAlerts.slice(0, 4).map((alt) => (
                <div
                  key={alt.id}
                  className="p-3 rounded border border-slate-800/80 bg-slate-950/40 flex items-start justify-between text-xs gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-mono uppercase px-1.5 py-0.2 rounded font-bold ${
                          alt.severity === 'CRITICAL'
                            ? 'text-rose-300 bg-rose-950/60 border border-rose-800'
                            : 'text-amber-300 bg-amber-950/60 border border-amber-800'
                        }`}
                      >
                        {alt.severity}
                      </span>
                      <h4 className="font-semibold text-slate-200">{alt.title}</h4>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">{alt.description}</p>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono shrink-0">
                    {new Date(alt.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Removable File Activity */}
      <div className="p-4 rounded-lg border border-slate-800 bg-slate-900/40">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-semibold text-slate-200">
              Live File Activity & SHA-256 Integrity Stream
            </h3>
          </div>
          <button
            onClick={() => onNavigate('files')}
            className="text-xs text-slate-400 hover:text-purple-400 flex items-center gap-1 transition-colors"
          >
            <span>Full Activity Log</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px]">
                <th className="pb-2 font-medium">TIMESTAMP</th>
                <th className="pb-2 font-medium">EVENT</th>
                <th className="pb-2 font-medium">RELATIVE PATH</th>
                <th className="pb-2 font-medium">SHA-256 DIGEST</th>
                <th className="pb-2 font-medium">INTEGRITY CHECK</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
              {recentEvents.slice(0, 5).map((f) => (
                <tr key={f.id} className="hover:bg-slate-800/20">
                  <td className="py-2.5 text-slate-400">
                    {new Date(f.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="py-2.5">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                        f.event_type === 'CREATED'
                          ? 'text-emerald-400 bg-emerald-950/40'
                          : f.event_type === 'MODIFIED'
                          ? 'text-sky-400 bg-sky-950/40'
                          : 'text-rose-400 bg-rose-950/40'
                      }`}
                    >
                      {f.event_type}
                    </span>
                  </td>
                  <td className="py-2.5 text-slate-200 font-sans text-xs">
                    {f.relative_path}
                  </td>
                  <td className="py-2.5 text-slate-400 truncate max-w-xs" title={f.sha256_hash || ''}>
                    {f.sha256_hash ? `${f.sha256_hash.substring(0, 16)}...` : 'N/A'}
                  </td>
                  <td className="py-2.5">
                    <StatusBadge status={f.integrity_status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
