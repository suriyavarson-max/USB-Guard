import React from 'react';
import { useSecurity } from '../context/SecurityContext';
import { HardDrive, CheckCircle2, ShieldCheck, Database, FolderCheck } from 'lucide-react';

export const Volumes: React.FC = () => {
  const { volumes } = useSecurity();

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 GB';
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(1)} GB`;
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          <HardDrive className="w-5 h-5 text-cyan-400" />
          <span>Removable USB Storage Volumes</span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Decoupled filesystem partitions mounted to host OS. File activity monitoring operates exclusively on these volumes.
        </p>
      </div>

      {/* Architectural Explainer Callout */}
      <div className="p-3.5 rounded-lg border border-cyan-900/40 bg-cyan-950/20 text-xs text-cyan-200 flex items-start gap-3">
        <FolderCheck className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold block text-cyan-100">
            Defensive Architecture Note: Peripherals vs Storage Volumes
          </span>
          <p className="text-[11px] text-cyan-300/80 mt-0.5 leading-relaxed">
            Many USB peripherals (such as smart cards, keyboards, and network adapters) never expose filesystems.
            Our platform intentionally decouples <strong>hardware presence</strong> from <strong>storage mounts</strong>.
            Only partitions with detected filesystems trigger real-time SHA-256 file integrity observation.
          </p>
        </div>
      </div>

      {/* Volumes Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/40">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 font-mono text-[11px]">
              <th className="py-2.5 px-3 font-medium">VOLUME LABEL & ID</th>
              <th className="py-2.5 px-3 font-medium">ASSOCIATED DEVICE</th>
              <th className="py-2.5 px-3 font-medium">MOUNT POINT</th>
              <th className="py-2.5 px-3 font-medium">FILESYSTEM</th>
              <th className="py-2.5 px-3 font-medium">STORAGE CAPACITY & USAGE</th>
              <th className="py-2.5 px-3 font-medium">ACCESS PERMISSION</th>
              <th className="py-2.5 px-3 font-medium">STATUS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
            {volumes.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-slate-500 font-sans text-xs">
                  No removable storage volumes currently mounted.
                </td>
              </tr>
            ) : (
              volumes.map((vol) => {
                const used = Math.max(0, vol.capacity_bytes - vol.free_bytes);
                const percent = vol.capacity_bytes > 0 ? Math.round((used / vol.capacity_bytes) * 100) : 0;
                return (
                  <tr key={vol.id} className="hover:bg-slate-800/30">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <HardDrive className="w-4 h-4 text-cyan-400 shrink-0" />
                        <div>
                          <span className="font-semibold text-slate-200 block font-sans text-xs">
                            {vol.volume_label}
                          </span>
                          <span className="text-[10px] text-slate-500">{vol.volume_identifier}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3 font-sans text-slate-300 text-xs">
                      {vol.device_name || 'Generic Storage Peripheral'}
                    </td>

                    <td className="py-3 px-3 text-emerald-400 font-bold">
                      {vol.mount_point}
                    </td>

                    <td className="py-3 px-3">
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[10px]">
                        {vol.filesystem}
                      </span>
                    </td>

                    <td className="py-3 px-3 w-48 font-sans">
                      <div className="flex justify-between text-[10px] text-slate-400 mb-1 font-mono">
                        <span>{formatBytes(used)} used</span>
                        <span>{formatBytes(vol.capacity_bytes)}</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-full bg-cyan-500 transition-all"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </td>

                    <td className="py-3 px-3 font-sans">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${vol.read_only ? 'text-amber-300 bg-amber-950/40' : 'text-slate-300'}`}>
                        {vol.read_only ? 'READ ONLY' : 'READ / WRITE'}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-mono font-medium rounded border ${vol.is_active ? 'text-emerald-400 border-emerald-500/30 bg-emerald-950/20' : 'text-slate-500 border-slate-800 bg-slate-900'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${vol.is_active ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                        <span>{vol.is_active ? 'MOUNTED' : 'UNMOUNTED'}</span>
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
