"use client";

interface ProgressBarProps {
  progress: number;
  stage?: string;
  className?: string;
}

export default function ProgressBar({ progress, stage, className = "" }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, progress));
  return (
    <div className={className}>
      <div className="mb-1.5 flex items-center justify-between">
        {stage && <span className="max-w-[70%] truncate text-xs text-slate-400">{stage}</span>}
        <span className="num ml-auto text-xs font-medium text-cyan-300">{pct}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="relative h-full rounded-full bg-gradient-to-r from-cyan-500 via-sky-400 to-emerald-400 transition-all duration-500 ease-out shadow-[0_0_14px_rgba(34,211,238,0.55)]"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
