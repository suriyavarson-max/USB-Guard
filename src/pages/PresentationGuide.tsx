import React, { useState } from 'react';
import {
  GraduationCap,
  BookOpen,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Shield,
  Layers,
  Cpu,
  Lock,
  FileCheck,
} from 'lucide-react';

export const PresentationGuide: React.FC = () => {
  const [activeSlide, setActiveSlide] = useState(0);

  const slides = [
    {
      title: 'Slide 1: Project Title & Introduction (0:00 - 0:30)',
      kicker: 'CAT Level 5 Cybersecurity Project',
      content: (
        <div className="space-y-4 text-xs leading-relaxed">
          <p className="text-slate-200 text-sm font-semibold">
            "Respected examiners, good morning. Today, I present our Level 5 cybersecurity project: The USB Device Security Monitoring and Threat Detection System."
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            <div className="p-3 rounded bg-slate-950 border border-slate-800">
              <span className="font-semibold text-emerald-400 block mb-1">Target Environments</span>
              <p className="text-slate-400 text-[11px]">
                Windows 10/11, Linux (Ubuntu/Debian), macOS (Sonoma/Sequoia). Unified defensive security posture with local-first processing.
              </p>
            </div>
            <div className="p-3 rounded bg-slate-950 border border-slate-800">
              <span className="font-semibold text-cyan-400 block mb-1">Primary Problem Vector</span>
              <p className="text-slate-400 text-[11px]">
                Unauthorized flash storage exfiltration, keystroke injection (Rubber Ducky), and air-gap bridging via untrusted portable drives.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Slide 2: Existing Systems vs Proposed System (0:30 - 1:15)',
      kicker: 'Problem Statement & Architectural Gaps',
      content: (
        <div className="space-y-3 text-xs leading-relaxed">
          <p className="text-slate-300">
            "Conventional antivirus systems monitor running processes, but they lack fine-grained USB device authorization, multi-OS visibility, and cryptographic file integrity tracking on removable media."
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-[11px] border border-slate-800">
              <thead className="bg-slate-950 text-slate-400">
                <tr>
                  <th className="p-2 border-b border-slate-800">Feature</th>
                  <th className="p-2 border-b border-slate-800 text-rose-400">Existing OS Logs</th>
                  <th className="p-2 border-b border-slate-800 text-emerald-400">Our Platform</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                <tr>
                  <td className="p-2 font-sans font-medium">Cross-Platform Support</td>
                  <td className="p-2 text-rose-400">OS Lock-in (Win only / udev only)</td>
                  <td className="p-2 text-emerald-400 font-semibold">Unified PAL (Win + Linux + Mac)</td>
                </tr>
                <tr>
                  <td className="p-2 font-sans font-medium">Storage Mount Decoupling</td>
                  <td className="p-2 text-rose-400">All peripherals treated as storage</td>
                  <td className="p-2 text-emerald-400 font-semibold">Decoupled Hardware vs Mount vs Files</td>
                </tr>
                <tr>
                  <td className="p-2 font-sans font-medium">File Integrity</td>
                  <td className="p-2 text-rose-400">None / simple timestamps</td>
                  <td className="p-2 text-emerald-400 font-semibold">Streaming SHA-256 Baseline Hashing</td>
                </tr>
                <tr>
                  <td className="p-2 font-sans font-medium">Audit Ledger</td>
                  <td className="p-2 text-rose-400">Plaintext files (easily wiped)</td>
                  <td className="p-2 text-emerald-400 font-semibold">Tamper-Evident SHA-256 Hash Chain</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ),
    },
    {
      title: 'Slide 3: Platform Abstraction Layer Architecture (1:15 - 2:00)',
      kicker: 'Design Pattern & Zero OS Bleed',
      content: (
        <div className="space-y-3 text-xs leading-relaxed">
          <p className="text-slate-300">
            "Our solution uses an Operating System Adapter Architecture. The common core relies on abstract interfaces (USBDeviceProvider and VolumeProvider), while Windows, Linux, and macOS have dedicated native adapters with zero cross-platform library pollution."
          </p>
          <div className="p-3 bg-slate-950 rounded border border-slate-800 font-mono text-[11px] text-slate-300">
            <pre className="text-emerald-400">
{`                    COMMON APPLICATION CORE
                              |
              +---------------+---------------+
              |               |               |
              v               v               v
           Windows          Linux           macOS
           Adapter          Adapter         Adapter
              |               |               |
              v               v               v
        Native OS APIs    udev / Linux    IOKit / macOS
                          device APIs      frameworks`}
            </pre>
          </div>
        </div>
      ),
    },
    {
      title: 'Slide 4: Defensive Innovations (2:00 - 3:00)',
      kicker: 'Confidence, Baseline Hashing, & Hash Chaining',
      content: (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded bg-slate-950 border border-slate-800 space-y-1">
            <span className="font-bold text-emerald-400 block">1. Identity Confidence</span>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              We score hardware serial stability and vendor signatures: HIGH (Serial + VID/PID + hardware path), MEDIUM, or LOW.
            </p>
          </div>
          <div className="p-3 rounded bg-slate-950 border border-slate-800 space-y-1">
            <span className="font-bold text-cyan-400 block">2. SHA-256 Baselines</span>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Files on removable media are hashed in 64KB streaming chunks. Unexpected checksum drift triggers an instant integrity alert.
            </p>
          </div>
          <div className="p-3 rounded bg-slate-950 border border-slate-800 space-y-1">
            <span className="font-bold text-purple-400 block">3. Audit Hash Chaining</span>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              H_i = SHA-256(H_(i-1) || Event || Payload). Any database record modification severs the chain and flags the tampered row.
            </p>
          </div>
        </div>
      ),
    },
    {
      title: 'Slide 5: Live Demonstration & Viva Walkthrough (3:00 - 4:15)',
      kicker: 'Interactive Demonstration Flow',
      content: (
        <div className="space-y-3 text-xs leading-relaxed">
          <p className="text-slate-300">
            "Examiners can observe the entire defensive lifecycle in our live dashboard:"
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-[11px]">
            <div className="p-2 rounded bg-slate-950 border border-slate-800 text-slate-300">
              1. Host OS Auto-Detection
            </div>
            <div className="p-2 rounded bg-slate-950 border border-slate-800 text-slate-300">
              2. USB Plug Event Detected
            </div>
            <div className="p-2 rounded bg-slate-950 border border-slate-800 text-slate-300">
              3. Policy Authorization Check
            </div>
            <div className="p-2 rounded bg-slate-950 border border-slate-800 text-slate-300">
              4. Volume Partition Mount
            </div>
            <div className="p-2 rounded bg-slate-950 border border-slate-800 text-slate-300">
              5. Streaming 64KB Hashing
            </div>
            <div className="p-2 rounded bg-slate-950 border border-slate-800 text-slate-300">
              6. Tamper Discrepancy Alert
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Slide 6: Advantages, Limitations & Conclusion (4:15 - 5:00)',
      kicker: 'Evaluation & Future Scope',
      content: (
        <div className="space-y-3 text-xs leading-relaxed">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 rounded bg-slate-950 border border-emerald-900/40">
              <span className="font-bold text-emerald-400 block mb-1">Key Advantages</span>
              <ul className="list-disc list-inside text-slate-300 text-[11px] space-y-1">
                <li>Local-first; zero telemetry or cloud lock-in</li>
                <li>Operates under least-privilege (no sudo/admin required)</li>
                <li>Mathematical tamper-evidence on all audit logs</li>
              </ul>
            </div>
            <div className="p-3 rounded bg-slate-950 border border-slate-800">
              <span className="font-bold text-amber-400 block mb-1">Limitations & Scope</span>
              <ul className="list-disc list-inside text-slate-400 text-[11px] space-y-1">
                <li>Hardware serial depends on manufacturer implementation</li>
                <li>Future scope: ML-based payload anomaly detection and fleet SIEM integration</li>
              </ul>
            </div>
          </div>
          <p className="text-slate-200 font-semibold pt-1">
            "Thank you. The platform is running live and ready for examiner questions."
          </p>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-emerald-400" />
            <span>College CAT Level 5 Defense & Presentation Guide</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            5-minute viva presentation slides and project defense script embedded right into the platform.
          </p>
        </div>

        {/* Slide Controls */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-400">
            Slide {activeSlide + 1} of {slides.length}
          </span>
          <button
            onClick={() => setActiveSlide((prev) => Math.max(0, prev - 1))}
            disabled={activeSlide === 0}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveSlide((prev) => Math.min(slides.length - 1, prev + 1))}
            disabled={activeSlide === slides.length - 1}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Active Presentation Slide Card */}
      <div className="p-6 rounded-lg border border-slate-800 bg-slate-900/60 shadow-xl space-y-4 min-h-[300px]">
        <div className="border-b border-slate-800 pb-3">
          <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-semibold">
            {slides[activeSlide].kicker}
          </span>
          <h3 className="text-base font-bold text-slate-100 mt-1">
            {slides[activeSlide].title}
          </h3>
        </div>

        {slides[activeSlide].content}
      </div>

      {/* Slide Navigation Thumbnails */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
        {slides.map((s, idx) => (
          <button
            key={idx}
            onClick={() => setActiveSlide(idx)}
            className={`p-2.5 rounded border text-left text-[11px] transition-all cursor-pointer ${
              activeSlide === idx
                ? 'border-emerald-500/50 bg-emerald-950/20 text-emerald-200'
                : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="font-mono text-[10px] opacity-70">Slide {idx + 1}</div>
            <div className="truncate font-semibold mt-0.5">{s.title.split(':')[0]}</div>
          </button>
        ))}
      </div>
    </div>
  );
};
