import React from 'react';
import { useSecurity } from '../../context/SecurityContext';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useSecurity();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const getBorderColor = () => {
          if (toast.type === 'danger') return 'border-rose-500/50 bg-slate-900/95 text-rose-200';
          if (toast.type === 'warning') return 'border-amber-500/50 bg-slate-900/95 text-amber-200';
          if (toast.type === 'success') return 'border-emerald-500/50 bg-slate-900/95 text-emerald-200';
          return 'border-sky-500/50 bg-slate-900/95 text-sky-200';
        };

        const getIcon = () => {
          if (toast.type === 'danger' || toast.type === 'warning') {
            return <AlertTriangle className="w-4 h-4 shrink-0" />;
          }
          if (toast.type === 'success') {
            return <CheckCircle2 className="w-4 h-4 shrink-0" />;
          }
          return <Info className="w-4 h-4 shrink-0" />;
        };

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto p-3 rounded-lg border shadow-xl flex items-start justify-between gap-3 backdrop-blur-md transition-all ${getBorderColor()}`}
          >
            <div className="flex items-start gap-2.5">
              <div className="mt-0.5">{getIcon()}</div>
              <div>
                <h4 className="text-xs font-semibold tracking-wide uppercase">{toast.title}</h4>
                <p className="text-xs text-slate-300 mt-0.5 line-clamp-2">{toast.message}</p>
                <span className="text-[10px] text-slate-500 font-mono mt-1 block">{toast.timestamp}</span>
              </div>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
