import React, { useState } from 'react';
import { useSecurity } from '../context/SecurityContext';
import { api } from '../services/api';
import { PlatformIcon } from '../components/common/PlatformIcon';
import {
  Sliders,
  Play,
  RotateCcw,
  Usb,
  HardDrive,
  FileCode2,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

export const DemoLab: React.FC = () => {
  const { demoOS, setDemoOS, refreshData } = useSecurity();
  const [running, setRunning] = useState(false);
  const [activeStep, setActiveStep] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<any>(null);

  const triggerEvent = async (eventType: string, extra: any = {}) => {
    setActiveStep(eventType);
    try {
      const res = await api.triggerDemoEvent({
        demo_os: demoOS,
        event_type: eventType,
        ...extra,
      });
      setLastResult(res);
      await refreshData();
    } finally {
      setActiveStep(null);
    }
  };

  const runFullVivaDemo = async () => {
    setRunning(true);
    try {
      // Step 1: Connect Unauthorized USB Flash Drive
      setActiveStep('STEP 1: Unauthorized USB Insertion');
      await api.triggerDemoEvent({
        demo_os: demoOS,
        event_type: 'UNAUTHORIZED_DEVICE',
        device_name: `Viva Demo Portable Flash Drive (${demoOS.toUpperCase()})`,
        vendor_id: '0951',
        product_id: '1666',
        serial_number: `DEMO-VIVA-${Date.now().toString().slice(-4)}`,
        is_authorized: false,
      });
      await refreshData();
      await new Promise((r) => setTimeout(r, 1200));

      // Step 2: Mount Storage Volume
      setActiveStep('STEP 2: Removable Storage Volume Mount');
      await api.triggerDemoEvent({
        demo_os: demoOS,
        event_type: 'VOLUME_MOUNTED',
      });
      await refreshData();
      await new Promise((r) => setTimeout(r, 1200));

      // Step 3: Create Monitored Research File
      setActiveStep('STEP 3: File Created & Baseline Hashed');
      await api.triggerDemoEvent({
        demo_os: demoOS,
        event_type: 'FILE_CREATED',
        relative_path: 'Intel/classified_project_spec.docx',
      });
      await refreshData();
      await new Promise((r) => setTimeout(r, 1200));

      // Step 4: Simulate Malicious Integrity Tampering / Hash Changed
      setActiveStep('STEP 4: File Tampered & SHA-256 Checksum Discrepancy');
      await api.triggerDemoEvent({
        demo_os: demoOS,
        event_type: 'HASH_CHANGED',
        relative_path: 'Intel/classified_project_spec.docx',
      });
      await refreshData();
      await new Promise((r) => setTimeout(r, 1200));

      // Step 5: High Risk Alert Triggered
      setActiveStep('STEP 5: Defensive Risk Engine Scoring & Critical Alert');
      await refreshData();
    } finally {
      setRunning(false);
      setActiveStep(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <span>Cross-Platform Simulation Lab (Demo Mode)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Demonstrate real-time defensive security behavior across Windows, Linux, and macOS without requiring physical hardware.
          </p>
        </div>

        {/* Demo OS Switcher */}
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1 rounded-md">
          <span className="text-[11px] font-mono text-slate-400 px-2">SIMULATE OS:</span>
          {(['linux', 'windows', 'macos'] as const).map((osName) => (
            <button
              key={osName}
              onClick={() => setDemoOS(osName)}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-mono font-medium rounded transition-all cursor-pointer ${
                demoOS === osName
                  ? 'bg-slate-800 text-cyan-300 font-bold border border-cyan-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <PlatformIcon platform={osName} />
              <span className="capitalize">{osName}</span>
            </button>
          ))}
        </div>
      </div>

      {/* College Viva Showcase Banner */}
      <div className="p-5 rounded-lg border border-cyan-800/50 bg-gradient-to-r from-cyan-950/30 via-slate-900/60 to-purple-950/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-900 text-cyan-200 border border-cyan-700">
              ONE-CLICK VIVA DEFENSE
            </span>
            <h3 className="text-sm font-bold text-slate-100">
              Run Complete CAT-5 Demonstration Scenario ({demoOS.toUpperCase()})
            </h3>
          </div>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
            Executes the full live defense flow: <strong>Unauthorized USB Insertion</strong> →{' '}
            <strong>Storage Volume Mount</strong> → <strong>Baseline Hashing</strong> →{' '}
            <strong>SHA-256 Tamper Discrepancy Detection</strong> → <strong>Critical Alert Generation</strong> →{' '}
            <strong>Cryptographic Audit Ledger Verification</strong>.
          </p>
        </div>

        <button
          onClick={runFullVivaDemo}
          disabled={running}
          className="flex items-center gap-2 px-4 py-2.5 rounded-md text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-all shadow-lg shadow-cyan-950/50 shrink-0 cursor-pointer"
        >
          <Play className={`w-4 h-4 fill-current ${running ? 'animate-pulse' : ''}`} />
          <span>{running ? activeStep : 'Launch Automated Viva Demo'}</span>
        </button>
      </div>

      {/* Manual Interactive Event Triggers Grid */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <span>Individual Event Injection Controls</span>
          <span className="text-[11px] font-mono text-slate-500 font-normal">
            (Tagged with is_demo = true)
          </span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Card 1: Hardware Connections */}
          <div className="p-4 rounded-lg border border-slate-800 bg-slate-900/40 space-y-3">
            <div className="flex items-center gap-2 text-slate-200">
              <Usb className="w-4 h-4 text-emerald-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider">USB Hardware Level</h4>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => triggerEvent('USB_CONNECTED', { is_authorized: true })}
                disabled={running}
                className="w-full text-left p-2.5 rounded bg-slate-950 border border-slate-800 hover:border-emerald-500/40 text-xs transition-colors cursor-pointer"
              >
                <div className="font-semibold text-emerald-300">Insert Authorized USB</div>
                <div className="text-[10px] text-slate-400">Low risk (score 0), approved in policy registry.</div>
              </button>

              <button
                onClick={() => triggerEvent('UNAUTHORIZED_DEVICE', { is_authorized: false })}
                disabled={running}
                className="w-full text-left p-2.5 rounded bg-slate-950 border border-slate-800 hover:border-amber-500/40 text-xs transition-colors cursor-pointer"
              >
                <div className="font-semibold text-amber-300">Insert Unauthorized USB</div>
                <div className="text-[10px] text-slate-400">High risk (score 50), triggers policy alert.</div>
              </button>

              <button
                onClick={() => triggerEvent('BLOCKED_DEVICE')}
                disabled={running}
                className="w-full text-left p-2.5 rounded bg-slate-950 border border-slate-800 hover:border-rose-500/40 text-xs transition-colors cursor-pointer"
              >
                <div className="font-semibold text-rose-300">Insert Blocklisted Device</div>
                <div className="text-[10px] text-slate-400">Critical risk (score 70+), instant red alert.</div>
              </button>

              <button
                onClick={() => triggerEvent('USB_REMOVED')}
                disabled={running}
                className="w-full text-left p-2.5 rounded bg-slate-950 border border-slate-800 hover:border-slate-700 text-xs transition-colors cursor-pointer"
              >
                <div className="font-semibold text-slate-300">Disconnect USB Peripheral</div>
                <div className="text-[10px] text-slate-400">Simulates physical detachment from port.</div>
              </button>
            </div>
          </div>

          {/* Card 2: Volume Mount Operations */}
          <div className="p-4 rounded-lg border border-slate-800 bg-slate-900/40 space-y-3">
            <div className="flex items-center gap-2 text-slate-200">
              <HardDrive className="w-4 h-4 text-cyan-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider">Volume Mounting</h4>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => triggerEvent('VOLUME_MOUNTED')}
                disabled={running}
                className="w-full text-left p-2.5 rounded bg-slate-950 border border-slate-800 hover:border-cyan-500/40 text-xs transition-colors cursor-pointer"
              >
                <div className="font-semibold text-cyan-300">Mount Storage Volume</div>
                <div className="text-[10px] text-slate-400">
                  {demoOS === 'windows' ? 'E:\\' : demoOS === 'macos' ? '/Volumes/SECURE_USB' : '/media/user/USB'}
                </div>
              </button>

              <div className="p-3 rounded bg-slate-950/60 border border-slate-800/80 text-[11px] text-slate-400 leading-relaxed">
                Demonstrates that a USB hardware insertion does not automatically expose a filesystem until an OS partition mount succeeds.
              </div>
            </div>
          </div>

          {/* Card 3: File Events & Integrity Tampering */}
          <div className="p-4 rounded-lg border border-slate-800 bg-slate-900/40 space-y-3">
            <div className="flex items-center gap-2 text-slate-200">
              <FileCode2 className="w-4 h-4 text-purple-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider">File Integrity & Hash</h4>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => triggerEvent('FILE_CREATED')}
                disabled={running}
                className="w-full text-left p-2.5 rounded bg-slate-950 border border-slate-800 hover:border-purple-500/40 text-xs transition-colors cursor-pointer"
              >
                <div className="font-semibold text-purple-300">Create Monitored File</div>
                <div className="text-[10px] text-slate-400">Computes initial SHA-256 cryptographic baseline.</div>
              </button>

              <button
                onClick={() => triggerEvent('HASH_CHANGED')}
                disabled={running}
                className="w-full text-left p-2.5 rounded bg-slate-950 border border-rose-900/50 bg-rose-950/10 hover:border-rose-500/60 text-xs transition-colors cursor-pointer"
              >
                <div className="font-semibold text-rose-300">Trigger SHA-256 Tamper Alert</div>
                <div className="text-[10px] text-slate-400">
                  Simulates unverified payload overwrite (Integrity Changed).
                </div>
              </button>

              <button
                onClick={() => triggerEvent('FILE_DELETED')}
                disabled={running}
                className="w-full text-left p-2.5 rounded bg-slate-950 border border-slate-800 hover:border-slate-700 text-xs transition-colors cursor-pointer"
              >
                <div className="font-semibold text-slate-300">Delete Removable File</div>
                <div className="text-[10px] text-slate-400">Audits file removal event.</div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Result Inspector Output */}
      {lastResult && (
        <div className="p-4 rounded-lg border border-slate-800 bg-slate-900/80 font-mono text-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span>SIMULATION ENGINE OUTPUT:</span>
            <span className="text-emerald-400 font-bold">STATUS: {lastResult.status}</span>
          </div>
          <pre className="text-slate-300 overflow-x-auto p-2 bg-slate-950 rounded border border-slate-800 text-[11px]">
            {JSON.stringify(lastResult, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};
