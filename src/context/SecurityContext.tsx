import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  DashboardSummary,
  PlatformStatus,
  Alert,
  USBDevice,
  USBVolume,
  FileEvent,
} from '../types';
import { api } from '../services/api';

interface NotificationToast {
  id: string;
  type: 'info' | 'warning' | 'danger' | 'success';
  title: string;
  message: string;
  timestamp: string;
}

interface SecurityContextType {
  summary: DashboardSummary | null;
  platformStatus: PlatformStatus | null;
  activeAlerts: Alert[];
  recentEvents: FileEvent[];
  devices: USBDevice[];
  volumes: USBVolume[];
  toasts: NotificationToast[];
  removeToast: (id: string) => void;
  refreshData: () => Promise<void>;
  isLoading: boolean;
  sseConnected: boolean;
  demoOS: string;
  setDemoOS: (os: string) => void;
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

export const SecurityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [platformStatus, setPlatformStatus] = useState<PlatformStatus | null>(null);
  const [activeAlerts, setActiveAlerts] = useState<Alert[]>([]);
  const [recentEvents, setRecentEvents] = useState<FileEvent[]>([]);
  const [devices, setDevices] = useState<USBDevice[]>([]);
  const [volumes, setVolumes] = useState<USBVolume[]>([]);
  const [toasts, setToasts] = useState<NotificationToast[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sseConnected, setSseConnected] = useState(false);
  const [demoOS, setDemoOS] = useState<string>('linux');

  const addToast = (type: NotificationToast['type'], title: string, message: string) => {
    const newToast: NotificationToast = {
      id: Math.random().toString(36).substring(2, 9),
      type,
      title,
      message,
      timestamp: new Date().toLocaleTimeString(),
    };
    setToasts((prev) => [newToast, ...prev].slice(0, 5));
    setTimeout(() => {
      removeToast(newToast.id);
    }, 6000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const refreshData = useCallback(async () => {
    try {
      const [sum, status, alts, devs, vols, files] = await Promise.all([
        api.getDashboardSummary(),
        api.getPlatformStatus(),
        api.getAlerts({ status: 'NEW' }),
        api.getDevices(),
        api.getVolumes(),
        api.getFileEvents({ limit: 15 }),
      ]);
      setSummary(sum);
      setPlatformStatus(status);
      setActiveAlerts(alts);
      setDevices(devs);
      setVolumes(vols);
      setRecentEvents(files);
      if (status?.platform_family) {
        setDemoOS(status.platform_family);
      }
    } catch (e) {
      console.error('Error refreshing security status:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();

    // Setup SSE connection
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/events/stream');
      eventSource.onopen = () => {
        setSseConnected(true);
      };

      eventSource.addEventListener('update', (e: MessageEvent) => {
        try {
          const parsed = JSON.parse(e.data);
          refreshData();

          if (parsed.type === 'ALERT_CREATED') {
            addToast('danger', 'Security Incident Alert', parsed.data.title);
          } else if (parsed.type === 'DEVICE_CONNECTED') {
            addToast('warning', 'USB Connection Detected', parsed.data.device_name || 'Hardware peripheral connected');
          } else if (parsed.type === 'DEVICE_REMOVED') {
            addToast('info', 'USB Hardware Disconnected', parsed.data.device_name || 'Device detached');
          } else if (parsed.type === 'FILE_EVENT' && parsed.data.integrity_status === 'INTEGRITY_CHANGED') {
            addToast('danger', 'File Integrity Drift Detected', `SHA-256 baseline discrepancy: ${parsed.data.relative_path}`);
          }
        } catch (err) {
          console.error('SSE parse error', err);
        }
      });

      eventSource.onerror = () => {
        setSseConnected(false);
      };
    } catch (err) {
      setSseConnected(false);
    }

    // Polling backup (every 5 seconds)
    const interval = setInterval(refreshData, 5000);

    return () => {
      clearInterval(interval);
      if (eventSource) eventSource.close();
    };
  }, [refreshData]);

  return (
    <SecurityContext.Provider
      value={{
        summary,
        platformStatus,
        activeAlerts,
        recentEvents,
        devices,
        volumes,
        toasts,
        removeToast,
        refreshData,
        isLoading,
        sseConnected,
        demoOS,
        setDemoOS,
      }}
    >
      {children}
    </SecurityContext.Provider>
  );
};

export const useSecurity = () => {
  const context = useContext(SecurityContext);
  if (!context) throw new Error('useSecurity must be used within SecurityProvider');
  return context;
};
