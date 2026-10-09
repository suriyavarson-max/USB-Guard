import React from 'react';
import { RiskLevel } from '../../types';

interface RiskBadgeProps {
  score: number;
  level: RiskLevel;
  showScore?: boolean;
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ score, level, showScore = true }) => {
  const getStyle = () => {
    switch (level) {
      case 'CRITICAL':
        return 'text-rose-400 border-rose-500/30 bg-rose-950/20';
      case 'HIGH':
        return 'text-amber-400 border-amber-500/30 bg-amber-950/20';
      case 'MEDIUM':
        return 'text-yellow-400 border-yellow-500/30 bg-yellow-950/20';
      case 'LOW':
      default:
        return 'text-emerald-400 border-emerald-500/30 bg-emerald-950/20';
    }
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-mono border rounded ${getStyle()}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      <span className="font-semibold">{level}</span>
      {showScore && <span className="opacity-80">({score}/100)</span>}
    </span>
  );
};
