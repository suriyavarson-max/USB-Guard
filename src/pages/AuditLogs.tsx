import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { AuditLog, AuditIntegrityResult } from '../types';
import { ScrollText, ShieldCheck, ShieldAlert, RefreshCw, CheckCircle2, AlertOctagon, Link2 } from 'lucide-react';

export const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [integrityResult, setIntegrityResult] = useState<AuditIntegrityResult | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await api.getAuditLogs({ limit: 100 });
      setLogs(data);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyIntegrity = async () => {
    setVerifying(true);
    try {
      const result = await api.verifyAuditIntegrity();
      setIntegrityResult(result);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <ScrollText className="w-5 h-5 text-emerald-400" />
            <span>Cryptographic Audit Ledger & Hash Chaining</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Tamper-evident audit trail linking each security event to the preceding block via SHA-256 digest chains.
          </p>
        </div>

        {/* Verify Integrity Button */}
        <button
          onClick={handleVerifyIntegrity}
          disabled={verifying}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-lg shadow-emerald-950/50 cursor-pointer"
        >
          <ShieldCheck className={`w-4 h-4 ${verifying ? 'animate-spin' : ''}`} />
          <span>{verifying ? 'Recalculating Chain...' : 'Verify Ledger Integrity'}</span>
        </button>
      </div>

      {/* Verification Status Banner */}
      {integrityResult && (
        <div
          className={`p-4 rounded-lg border text-xs transition-all ${
            integrityResult.is_valid
              ? 'border-emerald-800 bg-emerald-950/20 text-emerald-200'
              : 'border-rose-800 bg-rose-950/20 text-rose-200'
          }`}
        >
          <div className="flex items-start gap-3">
            {integrityResult.is_valid ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            )}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-wide">
                  AUDIT LEDGER INTEGRITY: {integrityResult.status}
                </span>
                <span className="text-[11px] font-mono opacity-80">
                  ({integrityResult.verified_records} / {integrityResult.total_records} records verified)
                </span>
              </div>
              <p className="text-slate-300">{integrityResult.message}</p>
              <div className="text-[10px] font-mono text-slate-400 pt-1">
                Latest Cryptographic Block Hash: <span className="text-slate-200">{integrityResult.latest_hash}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hash Chain Principle Box */}
      <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/40 text-xs text-slate-400 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            <strong>Cryptographic Principle:</strong> Each entry's <code className="text-emerald-400">record_hash</code> is computed over{' '}
            <code className="text-slate-300">previous_hash + timestamp + event + actor + payload</code>. If an attacker rewrites a database record, the chain breaks at that index.
          </span>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/40">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 font-mono text-[11px]">
              <th className="py-2.5 px-3 font-medium"># ID</th>
              <th className="py-2.5 px-3 font-medium">TIMESTAMP</th>
              <th className="py-2.5 px-3 font-medium">PLATFORM</th>
              <th className="py-2.5 px-3 font-medium">EVENT TYPE</th>
              <th className="py-2.5 px-3 font-medium">ACTOR</th>
              <th className="py-2.5 px-3 font-medium">EVENT DESCRIPTION</th>
              <th className="py-2.5 px-3 font-medium">RECORD HASH CHAIN (SHA-256)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-slate-500 font-sans text-xs">
                  Audit log records empty.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  className="hover:bg-slate-800/30 cursor-pointer"
                >
                  <td className="py-3 px-3 text-slate-500">#{log.id}</td>
                  <td className="py-3 px-3 text-slate-400">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="py-3 px-3 uppercase text-slate-300">
                    {log.platform}
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700 font-semibold text-[10px]">
                      {log.event_type}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-400">{log.actor}</td>
                  <td className="py-3 px-3 text-slate-200 font-sans text-xs max-w-sm">
                    {log.description}
                  </td>
                  <td className="py-3 px-3 text-slate-400 text-[10px]">
                    <div className="flex flex-col">
                      <span className="text-emerald-400/90" title={`Record Hash: ${log.record_hash}`}>
                        REC: {log.record_hash.substring(0, 16)}...
                      </span>
                      <span className="text-slate-500" title={`Previous Hash: ${log.previous_hash}`}>
                        PRV: {log.previous_hash.substring(0, 16)}...
                      </span>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Detail Modal for Selected Log */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg max-w-lg w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ScrollText className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-100">
                  Audit Record #{selectedLog.id} Cryptographic Details
                </h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-white text-xs"
              >
                Close
              </button>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div>
                <span className="text-slate-500 block text-[10px]">EVENT TYPE</span>
                <span className="text-slate-200 font-semibold">{selectedLog.event_type}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">DESCRIPTION</span>
                <span className="text-slate-200 font-sans">{selectedLog.description}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">PREVIOUS BLOCK HASH (H_(i-1))</span>
                <span className="text-slate-400 break-all bg-slate-950 p-1.5 rounded block text-[11px]">
                  {selectedLog.previous_hash}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">CURRENT BLOCK HASH (H_i)</span>
                <span className="text-emerald-400 break-all bg-slate-950 p-1.5 rounded block text-[11px]">
                  {selectedLog.record_hash}
                </span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
