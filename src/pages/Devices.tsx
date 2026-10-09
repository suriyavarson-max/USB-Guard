import React, { useState } from 'react';
import { useSecurity } from '../context/SecurityContext';
import { api } from '../services/api';
import { USBDevice } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { RiskBadge } from '../components/common/RiskBadge';
import { PlatformIcon } from '../components/common/PlatformIcon';
import {
  Usb,
  Search,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Info,
  Calendar,
  Layers,
  SlidersHorizontal,
} from 'lucide-react';

export const Devices: React.FC = () => {
  const { devices, refreshData } = useSecurity();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedDevice, setSelectedDevice] = useState<USBDevice | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const filtered = devices.filter((d) => {
    const matchesStatus = statusFilter === 'ALL' || d.status === statusFilter;
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      d.device_name.toLowerCase().includes(q) ||
      d.device_identifier.toLowerCase().includes(q) ||
      d.vendor_id.toLowerCase().includes(q) ||
      d.product_id.toLowerCase().includes(q) ||
      (d.serial_number && d.serial_number.toLowerCase().includes(q));
    return matchesStatus && matchesSearch;
  });

  const handleAuthorize = async (id: number) => {
    setActionLoading(id);
    try {
      await api.authorizeDevice(id);
      await refreshData();
      if (selectedDevice?.id === id) {
        const updated = await api.getDevice(id);
        setSelectedDevice(updated);
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleBlock = async (id: number) => {
    setActionLoading(id);
    try {
      await api.blockDevice(id);
      await refreshData();
      if (selectedDevice?.id === id) {
        const updated = await api.getDevice(id);
        setSelectedDevice(updated);
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnblock = async (id: number) => {
    setActionLoading(id);
    try {
      await api.unblockDevice(id);
      await refreshData();
      if (selectedDevice?.id === id) {
        const updated = await api.getDevice(id);
        setSelectedDevice(updated);
      }
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Usb className="w-5 h-5 text-emerald-400" />
            <span>USB Device Registry & Authorization</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage device authorization policies, hardware identity confidence, and blocklists.
          </p>
        </div>

        {/* Filter Segmented Control */}
        <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-md">
          {['ALL', 'AUTHORIZED', 'UNAUTHORIZED', 'BLOCKED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 text-xs font-mono font-medium rounded transition-colors ${
                statusFilter === st
                  ? 'bg-slate-800 text-emerald-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by device name, identifier, VID, PID, or hardware serial number..."
          className="w-full bg-slate-900/60 border border-slate-800 rounded-md pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
        />
      </div>

      {/* Main Grid: Devices Table + Detail Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Table Column */}
        <div className={`overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/40 ${selectedDevice ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 font-mono text-[11px]">
                <th className="py-2.5 px-3 font-medium">DEVICE & IDENTITY</th>
                <th className="py-2.5 px-3 font-medium">OS PLATFORM</th>
                <th className="py-2.5 px-3 font-medium">VID / PID</th>
                <th className="py-2.5 px-3 font-medium">CONFIDENCE</th>
                <th className="py-2.5 px-3 font-medium">POLICY STATUS</th>
                <th className="py-2.5 px-3 font-medium">THREAT RISK</th>
                <th className="py-2.5 px-3 font-medium text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500">
                    No devices matched the selected filter or query.
                  </td>
                </tr>
              ) : (
                filtered.map((dev) => (
                  <tr
                    key={dev.id}
                    onClick={() => setSelectedDevice(dev)}
                    className={`hover:bg-slate-800/30 cursor-pointer transition-colors ${
                      selectedDevice?.id === dev.id ? 'bg-slate-800/50' : ''
                    }`}
                  >
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            dev.active_connection ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
                          }`}
                          title={dev.active_connection ? 'Active physical connection' : 'Disconnected'}
                        />
                        <div>
                          <div className="font-semibold text-slate-200">{dev.device_name}</div>
                          <div className="text-[11px] text-slate-500 font-mono truncate max-w-xs">
                            {dev.device_identifier}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5 font-mono text-slate-300">
                        <PlatformIcon platform={dev.platform} />
                        <span className="capitalize">{dev.platform}</span>
                      </div>
                    </td>

                    <td className="py-3 px-3 font-mono text-slate-300 text-[11px]">
                      {dev.vendor_id}:{dev.product_id}
                    </td>

                    <td className="py-3 px-3">
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                          dev.identity_confidence === 'HIGH'
                            ? 'text-emerald-300 bg-emerald-950/30 border-emerald-800'
                            : dev.identity_confidence === 'MEDIUM'
                            ? 'text-yellow-300 bg-yellow-950/30 border-yellow-800'
                            : 'text-slate-400 bg-slate-900 border-slate-700'
                        }`}
                        title={
                          dev.identity_confidence === 'HIGH'
                            ? 'Unique serial number + valid vendor/product signatures'
                            : 'Generic fallback identity'
                        }
                      >
                        {dev.identity_confidence}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <StatusBadge status={dev.status} />
                    </td>

                    <td className="py-3 px-3">
                      <RiskBadge score={dev.risk_score} level={dev.risk_level} />
                    </td>

                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        {dev.status !== 'AUTHORIZED' && (
                          <button
                            onClick={() => handleAuthorize(dev.id)}
                            disabled={actionLoading === dev.id}
                            className="px-2 py-1 rounded text-[11px] font-semibold bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-500/30 transition-all cursor-pointer"
                          >
                            Authorize
                          </button>
                        )}
                        {dev.status !== 'BLOCKED' ? (
                          <button
                            onClick={() => handleBlock(dev.id)}
                            disabled={actionLoading === dev.id}
                            className="px-2 py-1 rounded text-[11px] font-semibold bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30 transition-all cursor-pointer"
                          >
                            Block
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUnblock(dev.id)}
                            disabled={actionLoading === dev.id}
                            className="px-2 py-1 rounded text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all cursor-pointer"
                          >
                            Unblock
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Selected Device Inspector Panel */}
        {selectedDevice && (
          <div className="p-4 rounded-lg border border-slate-800 bg-slate-900/60 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-500">Hardware Profile</span>
                <h3 className="text-base font-bold text-slate-100">{selectedDevice.device_name}</h3>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">{selectedDevice.device_identifier}</p>
              </div>
              <button
                onClick={() => setSelectedDevice(null)}
                className="text-xs text-slate-500 hover:text-slate-300"
              >
                Close
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800/80 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Policy Authorization:</span>
                  <StatusBadge status={selectedDevice.status} />
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Threat Risk Score:</span>
                  <RiskBadge score={selectedDevice.risk_score} level={selectedDevice.risk_level} />
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Identity Confidence:</span>
                  <span className="font-mono text-slate-200">{selectedDevice.identity_confidence}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Physical Connection:</span>
                  <span className={`font-mono ${selectedDevice.active_connection ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {selectedDevice.active_connection ? 'ATTACHED' : 'DETACHED'}
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800/80 space-y-1.5 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Vendor ID:</span>
                  <span className="text-slate-200">0x{selectedDevice.vendor_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Product ID:</span>
                  <span className="text-slate-200">0x{selectedDevice.product_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Serial Number:</span>
                  <span className="text-slate-200 truncate max-w-[160px]">{selectedDevice.serial_number || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Manufacturer:</span>
                  <span className="text-slate-200">{selectedDevice.manufacturer}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Device Class:</span>
                  <span className="text-slate-200">{selectedDevice.device_type}</span>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800">
                <span className="block">First Seen: {new Date(selectedDevice.first_seen).toLocaleString()}</span>
                <span className="block mt-0.5">Last Seen: {new Date(selectedDevice.last_seen).toLocaleString()}</span>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="pt-2 flex items-center gap-2">
              {selectedDevice.status !== 'AUTHORIZED' && (
                <button
                  onClick={() => handleAuthorize(selectedDevice.id)}
                  disabled={actionLoading === selectedDevice.id}
                  className="flex-1 py-1.5 rounded text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer"
                >
                  Authorize Device
                </button>
              )}
              {selectedDevice.status !== 'BLOCKED' ? (
                <button
                  onClick={() => handleBlock(selectedDevice.id)}
                  disabled={actionLoading === selectedDevice.id}
                  className="flex-1 py-1.5 rounded text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition-colors cursor-pointer"
                >
                  Block Device
                </button>
              ) : (
                <button
                  onClick={() => handleUnblock(selectedDevice.id)}
                  disabled={actionLoading === selectedDevice.id}
                  className="flex-1 py-1.5 rounded text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
                >
                  Unblock Device
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
