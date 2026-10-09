import React from 'react';
import { Monitor, Terminal, Apple } from 'lucide-react';

interface PlatformIconProps {
  platform: string;
  className?: string;
}

export const PlatformIcon: React.FC<PlatformIconProps> = ({ platform, className = 'w-4 h-4' }) => {
  const p = platform.toLowerCase();
  if (p.includes('win')) {
    return <Monitor className={`${className} text-sky-400`} />;
  }
  if (p.includes('mac') || p.includes('darwin')) {
    return <Apple className={`${className} text-purple-400`} />;
  }
  return <Terminal className={`${className} text-emerald-400`} />;
};
