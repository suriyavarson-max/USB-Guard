import React from 'react';
import { DeviceStatus, IntegrityStatus } from '../../types';

interface StatusBadgeProps {
  status: DeviceStatus | IntegrityStatus | string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const normalized = status.toUpperCase();

  const getStyle = () => {
    switch (normalized) {
      case 'AUTHORIZED':
      case 'INTEGRITY_OK':
      case 'VALID':
      case 'RESOLVED':
        return 'text-emerald-400 border-emerald-500/30 bg-emerald-950/20';
      case 'UNAUTHORIZED':
      case 'ACKNOWLEDGED':
      case 'NEW':
        return 'text-amber-400 border-amber-500/30 bg-amber-950/20';
      case 'BLOCKED':
      case 'INTEGRITY_CHANGED':
      case 'COMPROMISED':
        return 'text-rose-400 border-rose-500/30 bg-rose-950/30';
      default:
        return 'text-slate-400 border-slate-700 bg-slate-800/40';
    }
  };

  const getLabel = () => {
    switch (normalized) {
      case 'INTEGRITY_OK':
        return 'VERIFIED OK';
      case 'INTEGRITY_CHANGED':
        return 'INTEGRITY COMPROMISED';
      case 'UNVERIFIED':
        return 'NOT BASELINED';
      default:
        return normalized;
    }
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-mono font-medium border rounded ${getStyle()}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      <span>{getLabel()}</span>
    </span>
  );
};
