import React, { useState } from 'react';
import { useSecurity } from '../context/SecurityContext';
import { StatusBadge } from '../components/common/StatusBadge';
import { FileCode2, Copy, Check, Filter, ShieldCheck, AlertCircle } from 'lucide-react';

export const FileActivity: React.FC = () => {
  const { recentEvents } = useSecurity();
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('ALL');

  const filteredEvents = recentEvents.filter((ev) => {
    if (filterType === 'ALL') return true;
    return ev.event_type === filterType;
  });

  const handleCopy = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const formatSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <FileCode2 className="w-5 h-5 text-purple-400" />
            <span>Removable Storage File Integrity Monitor</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time file monitoring on removable media with streaming SHA-256 cryptographic verification.
          </p>
        </div>

        {/* Filter Segmented Control */}
        <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-md">
          {['ALL', 'CREATED', 'MODIFIED', 'DELETED', 'RENAMED'].map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-2.5 py-1 text-xs font-mono font-medium rounded transition-colors ${
                filterType === t
                  ? 'bg-slate-800 text-purple-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Security Privacy Notice */}
      <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/60 text-xs text-slate-400 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            <strong>Defensive Privacy Assurance:</strong> File contents are never uploaded or retained in plaintext.
            Only relative paths and mathematical 256-bit cryptographic fingerprints are stored.
          </span>
        </div>
        <span className="text-[11px] font-mono text-slate-500 hidden md:inline">
          64KB Streaming Chunks
        </span>
      </div>

      {/* Events Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/40">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 font-mono text-[11px]">
              <th className="py-2.5 px-3 font-medium">TIMESTAMP</th>
              <th className="py-2.5 px-3 font-medium">EVENT TYPE</th>
              <th className="py-2.5 px-3 font-medium">RELATIVE VOLUME PATH</th>
              <th className="py-2.5 px-3 font-medium">SIZE</th>
              <th className="py-2.5 px-3 font-medium">SHA-256 CHECKSUM</th>
              <th className="py-2.5 px-3 font-medium">BASELINE STATUS</th>
              <th className="py-2.5 px-3 font-medium text-right">ORIGIN</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
            {filteredEvents.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-slate-500 font-sans text-xs">
                  No file operations recorded under the selected filter.
                </td>
              </tr>
            ) : (
              filteredEvents.map((fe) => (
                <tr key={fe.id} className="hover:bg-slate-800/30">
                  <td className="py-3 px-3 text-slate-400">
                    {new Date(fe.timestamp).toLocaleTimeString()}
                  </td>

                  <td className="py-3 px-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        fe.event_type === 'CREATED'
                          ? 'text-emerald-300 bg-emerald-950/60 border border-emerald-800/60'
                          : fe.event_type === 'MODIFIED'
                          ? 'text-sky-300 bg-sky-950/60 border border-sky-800/60'
                          : fe.event_type === 'DELETED'
                          ? 'text-rose-300 bg-rose-950/60 border border-rose-800/60'
                          : 'text-amber-300 bg-amber-950/60 border border-amber-800/60'
                      }`}
                    >
                      {fe.event_type}
                    </span>
                  </td>

                  <td className="py-3 px-3 font-sans text-xs text-slate-200">
                    <div className="font-medium">{fe.relative_path}</div>
                    <span className="text-[10px] text-slate-500 font-mono">
                      Root: {fe.volume_mount_point || 'Removable Media'}
                    </span>
                  </td>

                  <td className="py-3 px-3 text-slate-300">
                    {formatSize(fe.size_bytes)}
                  </td>

                  <td className="py-3 px-3">
                    {fe.sha256_hash ? (
                      <div className="flex items-center gap-1.5 group">
                        <span className="text-slate-300 truncate max-w-[180px]" title={fe.sha256_hash}>
                          {fe.sha256_hash.substring(0, 16)}...
                        </span>
                        <button
                          onClick={() => handleCopy(fe.sha256_hash!)}
                          title="Copy SHA-256 digest"
                          className="p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition-colors"
                        >
                          {copiedHash === fe.sha256_hash ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    ) : (
                      <span className="text-slate-500">N/A ({fe.hash_status})</span>
                    )}
                  </td>

                  <td className="py-3 px-3">
                    <StatusBadge status={fe.integrity_status} />
                  </td>

                  <td className="py-3 px-3 text-right">
                    {fe.is_demo ? (
                      <span className="px-1.5 py-0.5 rounded bg-purple-950/60 text-purple-300 border border-purple-800 text-[10px] font-semibold">
                        DEMO EVENT
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px]">
                        PHYSICAL OS
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
