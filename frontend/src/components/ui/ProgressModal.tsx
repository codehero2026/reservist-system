// src/components/ui/ProgressModal.tsx
import { useEffect, useRef, useCallback, useState } from "react";
import { CheckCircle, XCircle } from "lucide-react";

// ── SVG ring constants ────────────────────────────────────────────────────
const R = 54;
const CX = 64;
const CIRCUMFERENCE = 2 * Math.PI * R; // ≈ 339.3

// ── Hook ─────────────────────────────────────────────────────────────────
type ProgressStatus = "idle" | "running" | "complete" | "error";

export function useSimulatedProgress(durationMs = 15000) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<ProgressStatus>("idle");
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  const cancel = () => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
  };

  const start = useCallback(() => {
    cancel();
    setProgress(0);
    setStatus("running");
    startRef.current = performance.now();

    const tick = () => {
      const elapsed = performance.now() - (startRef.current ?? 0);
      const t = Math.min(elapsed / durationMs, 1);
      // cubic ease-out — slows down as it approaches 85%
      const eased = 1 - Math.pow(1 - t, 3);
      setProgress(eased * 85);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [durationMs]);

  const finish = useCallback(() => {
    cancel();
    setProgress(100);
    setStatus("complete");
  }, []);

  const error = useCallback(() => {
    cancel();
    setStatus("error");
  }, []);

  const reset = useCallback(() => {
    cancel();
    setProgress(0);
    setStatus("idle");
  }, []);

  useEffect(() => () => cancel(), []);

  return { progress, status, start, finish, error, reset };
}

// ── Component ─────────────────────────────────────────────────────────────
interface ProgressModalProps {
  open: boolean;
  progress: number;           // 0–100
  status: "running" | "complete" | "error";
  label?: string;
  sublabel?: string;
  onDone?: () => void;        // called when user dismisses after complete/error
}

export function ProgressModal({
  open,
  progress,
  status,
  label = "Processing…",
  sublabel,
  onDone,
}: ProgressModalProps) {
  // Auto-dismiss after complete
  useEffect(() => {
    if (status !== "complete") return;
    const t = setTimeout(() => onDone?.(), 1800);
    return () => clearTimeout(t);
  }, [status, onDone]);

  if (!open) return null;

  const offset = CIRCUMFERENCE * (1 - progress / 100);

  const ringColor =
    status === "complete" ? "#22c55e" :
    status === "error"    ? "#ef4444" :
    "#3b82f6";

  const pct = Math.round(progress);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop — non-dismissable while running */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={status !== "running" ? onDone : undefined}
      />

      {/* Card */}
      <div className="relative z-10 flex flex-col items-center gap-5 bg-[rgb(var(--card-bg))] border border-white/10 rounded-2xl shadow-2xl px-10 py-8 min-w-[260px]">

        {/* SVG ring */}
        <div className="relative w-32 h-32">
          <svg width="128" height="128" className="-rotate-90">
            {/* Track */}
            <circle
              cx={CX} cy={CX} r={R}
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              className="text-white/10"
            />
            {/* Progress arc */}
            <circle
              cx={CX} cy={CX} r={R}
              fill="none"
              stroke={ringColor}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={offset}
              style={{ transition: "stroke-dashoffset 0.4s ease, stroke 0.4s ease" }}
            />
          </svg>

          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {status === "complete" ? (
              <CheckCircle size={32} className="text-green-400" />
            ) : status === "error" ? (
              <XCircle size={32} className="text-red-400" />
            ) : (
              <span className="text-2xl font-bold text-white tabular-nums">{pct}%</span>
            )}
          </div>
        </div>

        {/* Labels */}
        <div className="text-center space-y-1">
          <p className="text-sm font-bold text-ink">
            {status === "complete" ? "Complete!" :
             status === "error"    ? "Failed" :
             label}
          </p>
          {sublabel && (
            <p className="text-xs text-ink3 truncate max-w-[200px]">{sublabel}</p>
          )}
          {status === "running" && (
            <p className="text-2xs text-ink3">Please wait, do not close this page</p>
          )}
        </div>

        {/* Dismiss button — only when not running */}
        {status !== "running" && (
          <button
            onClick={onDone}
            className="h-8 px-5 rounded-xl bg-[rgb(var(--page-bg))] border border-[rgb(var(--border))] text-xs font-semibold text-ink hover:bg-[rgb(var(--border))] transition-colors"
          >
            {status === "complete" ? "Done" : "Dismiss"}
          </button>
        )}
      </div>
    </div>
  );
}
