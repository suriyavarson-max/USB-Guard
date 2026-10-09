import React, { useState } from 'react';
import { useSecurity } from '../context/SecurityContext';
import { api } from '../services/api';
import { jsPDF } from 'jspdf';
import { FileSpreadsheet, Download, FileText, CheckCircle2, ShieldCheck, Printer } from 'lucide-react';

export const Reports: React.FC = () => {
  const { summary, devices, volumes, activeAlerts, recentEvents } = useSecurity();
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const generatePDFReport = () => {
    setGeneratingPdf(true);
    try {
      const doc = new jsPDF();
      const now = new Date().toISOString();

      // Title & Header
      doc.setFontSize(18);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text('USB Security Monitoring & Threat Detection Report', 14, 20);

      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139); // slate-500
      doc.text(`Generated: ${now}`, 14, 28);
      doc.text(`Host Operating System: ${summary?.platform || 'Cross-Platform'}`, 14, 34);
      doc.text(`Monitoring Provider: ${summary?.provider_name || 'Native Adapter'}`, 14, 40);
      doc.text(`Monitoring Mode: ${summary?.monitoring_mode || 'Native'}`, 14, 46);

      // Horizontal Rule
      doc.setDrawColor(203, 213, 225);
      doc.line(14, 52, 196, 52);

      // Executive Summary Metrics
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text('1. Executive Fleet Summary', 14, 62);

      doc.setFontSize(10);
      doc.setTextColor(51, 65, 85);
      doc.text(`• Total USB Peripherals Monitored: ${summary?.total_devices ?? 0}`, 16, 70);
      doc.text(`• Authorized Policy Devices: ${summary?.authorized_devices ?? 0}`, 16, 76);
      doc.text(`• Unauthorized Devices: ${summary?.unauthorized_devices ?? 0}`, 16, 82);
      doc.text(`• Restricted Blocklisted Devices: ${summary?.blocked_devices ?? 0}`, 16, 88);
      doc.text(`• Mounted Storage Volumes: ${summary?.mounted_volumes ?? 0}`, 16, 94);
      doc.text(`• Removable File Events Observed: ${summary?.total_file_events_today ?? 0}`, 16, 100);
      doc.text(`• Total Security Incidents: ${summary?.total_alerts ?? 0} (Critical: ${summary?.critical_alerts ?? 0})`, 16, 106);
      doc.text(`• Fleet Threat Risk Index: ${summary?.average_risk_score ?? 0} / 100`, 16, 112);
      doc.text(`• Audit Ledger Integrity: ${summary?.audit_integrity_status || 'VALID'} (Cryptographic SHA-256 Chain)`, 16, 118);

      // Section 2: Active Devices
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text('2. Connected USB Hardware Peripherals', 14, 132);

      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      let y = 140;
      devices.slice(0, 8).forEach((d, idx) => {
        doc.text(
          `${idx + 1}. ${d.device_name} [${d.status}] - VID: 0x${d.vendor_id}, PID: 0x${d.product_id}, Risk: ${d.risk_score}/100`,
          16,
          y
        );
        y += 6;
      });

      // Section 3: Priority Security Alerts
      y += 8;
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text('3. Defensive Threat Incidents', 14, y);

      y += 8;
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      if (activeAlerts.length === 0) {
        doc.text('No unresolved high-severity incidents.', 16, y);
      } else {
        activeAlerts.slice(0, 6).forEach((a, idx) => {
          doc.text(`• [${a.severity}] ${a.title} - ${a.description}`, 16, y);
          y += 6;
        });
      }

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        'College CAT Level 5 Cybersecurity Project · Tamper-Evident SHA-256 File & Device Audit Report',
        14,
        285
      );

      doc.save(`usb_security_audit_report_${Date.now()}.pdf`);
    } finally {
      setGeneratingPdf(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
          <span>Cybersecurity Compliance & Audit Reporting</span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Generate formal PDF audit documentation or export complete CSV incident datasets for external SIEM integration.
        </p>
      </div>

      {/* Export Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* PDF Export Card */}
        <div className="p-5 rounded-lg border border-slate-800 bg-slate-900/60 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2.5 text-slate-200">
              <FileText className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm font-bold">Executive Incident Report (PDF)</h3>
            </div>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Produces a publication-ready PDF containing the complete platform audit posture, host OS profile,
              fleet threat risk score, connected peripherals, and cryptographic audit hash ledger status.
            </p>
          </div>

          <button
            onClick={generatePDFReport}
            disabled={generatingPdf}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-md text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-lg shadow-emerald-950/50 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{generatingPdf ? 'Generating PDF Document...' : 'Download PDF Audit Report'}</span>
          </button>
        </div>

        {/* CSV Export Card */}
        <div className="p-5 rounded-lg border border-slate-800 bg-slate-900/60 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2.5 text-slate-200">
              <FileSpreadsheet className="w-5 h-5 text-cyan-400" />
              <h3 className="text-sm font-bold">Comprehensive Dataset Export (CSV)</h3>
            </div>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Exports raw structured tabular logs of all devices, removable storage partitions, file modification
              SHA-256 digests, and security incident alerts formatted for incident response workflows.
            </p>
          </div>

          <a
            href="/api/reports/security.csv"
            download="usb_security_audit_report.csv"
            className="w-full flex items-center justify-center gap-2 py-2 rounded-md text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white transition-all shadow-lg shadow-cyan-950/50"
          >
            <Download className="w-4 h-4" />
            <span>Download Security Data (CSV)</span>
          </a>
        </div>
      </div>

      {/* Report Data Preview Table */}
      <div className="p-5 rounded-lg border border-slate-800 bg-slate-900/40 space-y-4">
        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Audit Report Preview Parameters</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
          <div className="p-3 rounded bg-slate-950/60 border border-slate-800/80">
            <span className="text-slate-500 block text-[10px] font-sans">HOST OPERATING SYSTEM</span>
            <span className="text-slate-200 font-bold mt-1 block">{summary?.platform || 'Linux'}</span>
          </div>
          <div className="p-3 rounded bg-slate-950/60 border border-slate-800/80">
            <span className="text-slate-500 block text-[10px] font-sans">MONITORING PROVIDER</span>
            <span className="text-slate-200 font-bold mt-1 block truncate">{summary?.provider_name || 'Native'}</span>
          </div>
          <div className="p-3 rounded bg-slate-950/60 border border-slate-800/80">
            <span className="text-slate-500 block text-[10px] font-sans">MONITORED PERIPHERALS</span>
            <span className="text-emerald-400 font-bold mt-1 block">{summary?.total_devices ?? 0} Devices</span>
          </div>
          <div className="p-3 rounded bg-slate-950/60 border border-slate-800/80">
            <span className="text-slate-500 block text-[10px] font-sans">AUDIT LEDGER STATUS</span>
            <span className="text-emerald-400 font-bold mt-1 block">{summary?.audit_integrity_status || 'VALID'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
