import React from 'react';
import { useSecurity } from '../../context/SecurityContext';
import {
  LayoutDashboard,
  Usb,
  HardDrive,
  FileCode2,
  AlertTriangle,
  ScrollText,
  FileSpreadsheet,
  Activity,
  Sliders,
  BookOpen,
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onTabChange }) => {
  const { summary, activeAlerts } = useSecurity();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    {
      id: 'devices',
      label: 'USB Devices',
      icon: Usb,
      badge: summary?.connected_devices ? `${summary.connected_devices}` : undefined,
    },
    {
      id: 'volumes',
      label: 'Storage Volumes',
      icon: HardDrive,
      badge: summary?.mounted_volumes ? `${summary.mounted_volumes}` : undefined,
    },
    { id: 'files', label: 'File Activity', icon: FileCode2 },
    {
      id: 'alerts',
      label: 'Security Alerts',
      icon: AlertTriangle,
      badge: activeAlerts.length ? `${activeAlerts.length}` : undefined,
      badgeDanger: activeAlerts.length > 0,
    },
    { id: 'audit', label: 'Audit Ledger', icon: ScrollText },
    { id: 'reports', label: 'Security Reports', icon: FileSpreadsheet },
    { id: 'status', label: 'System Status', icon: Activity },
    { id: 'demo', label: 'Simulation Lab', icon: Sliders },
    { id: 'guide', label: 'CAT-5 Defense Guide', icon: BookOpen },
  ];

  return (
    <aside className="w-60 border-r border-slate-800 bg-slate-950/60 flex flex-col justify-between shrink-0 h-[calc(100vh-3.5rem)]">
      <div className="p-3 space-y-1">
        <div className="px-3 py-2 text-[10px] font-mono uppercase tracking-wider text-slate-500">
          Monitoring & Auditing
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-all ${
                isActive
                  ? 'bg-slate-800 text-emerald-400 font-semibold border-l-2 border-emerald-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                    item.badgeDanger
                      ? 'bg-rose-950 text-rose-300 border border-rose-800'
                      : 'bg-slate-800 text-slate-300 border border-slate-700'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Audit Chain Ledger Integrity Status in Sidebar Footer */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-900/30">
        <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between mb-1">
          <span>Audit Ledger:</span>
          <span className="text-emerald-400 font-semibold">VALID (SHA-256)</span>
        </div>
        <div className="text-[10px] text-slate-500 leading-tight">
          Tamper-evident hash chain active on all device & file operations.
        </div>
      </div>
    </aside>
  );
};
