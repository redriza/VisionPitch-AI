"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  MonitorPlay,
  ChevronLeft,
  Users,
  BarChart3,
  FileText,
  Settings,
} from "lucide-react";
import { getAnalyses } from "@/lib/api";

export function Logo({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden>
      <defs>
        <linearGradient id="lg" x1="4" y1="2" x2="36" y2="38" gradientUnits="userSpaceOnUse">
          <stop stopColor="#22d3ee" />
          <stop offset="1" stopColor="#3b82f6" />
        </linearGradient>
      </defs>
      <path d="M20 2 36 11v18L20 38 4 29V11L20 2Z" stroke="url(#lg)" strokeWidth="2" fill="rgba(34,211,238,0.07)" />
      <path d="M20 12 28 16.5v7L20 28l-8-4.5v-7L20 12Z" stroke="url(#lg)" strokeWidth="1.6" />
      <circle cx="20" cy="20" r="2.6" fill="#22d3ee" />
    </svg>
  );
}

type Health = "checking" | "ok" | "down";

function SystemStatus() {
  const [health, setHealth] = useState<Health>("checking");

  useEffect(() => {
    let alive = true;
    const ping = async () => {
      try {
        await getAnalyses();
        if (alive) setHealth("ok");
      } catch {
        if (alive) setHealth("down");
      }
    };
    ping();
    const t = setInterval(ping, 15000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const map = {
    checking: { text: "Checking…", sub: "Contacting backend", color: "#facc15" },
    ok: { text: "System Status", sub: "All Systems Operational", color: "#34d399" },
    down: { text: "System Status", sub: "Backend unreachable", color: "#f43f5e" },
  }[health];

  return (
    <div
      className="hidden sm:flex items-center gap-3 rounded-xl px-3.5 py-2"
      style={{ border: `1px solid ${map.color}40`, background: `${map.color}12` }}
    >
      <span className="pulse-dot" style={{ color: map.color }} />
      <div className="leading-tight">
        <p className="text-[10px] uppercase tracking-wider text-slate-400">{map.text}</p>
        <p className="text-xs font-medium" style={{ color: map.color }}>
          {map.sub}
        </p>
      </div>
    </div>
  );
}

/* ── Match View Header ────────────────────────────────── */
export function MatchHeader({
  filename,
  analytics,
  statusColor,
  statusLabel,
  isLive,
}: {
  filename: string;
  analytics: {
    team_possession: Record<string, { percentage: number }>;
    summary: { total_players_detected: number; total_teams: number };
    video_metadata: { duration_seconds: number; fps: number };
  } | null;
  statusColor: string;
  statusLabel: string;
  isLive: boolean;
}) {
  const keys = analytics ? Object.keys(analytics.team_possession) : [];
  const team1 = keys[0] ? `Team ${keys[0].replace("team_", "")}` : "Team A";
  const team2 = keys[1] ? `Team ${keys[1].replace("team_", "")}` : "Team B";

  // Derive a "score" from ball possession frames — purely illustrative
  const p1 = analytics?.team_possession[keys[0]]?.percentage ?? 50;
  const p2 = analytics?.team_possession[keys[1]]?.percentage ?? 50;
  const score1 = Math.round(p1 / 25);
  const score2 = Math.round(p2 / 25);

  const duration = analytics?.video_metadata.duration_seconds ?? 0;
  const mm = String(Math.floor(duration / 60)).padStart(2, "0");
  const ss = String(Math.floor(duration % 60)).padStart(2, "0");

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--line)] bg-[#060b16]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1920px] items-center gap-2 px-3 py-2.5 sm:px-5">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <Logo size={30} />
          <div className="leading-tight hidden md:block">
            <p className="text-[14px] font-bold tracking-[0.08em] text-white">
              VISION<span className="text-cyan-300">PITCH</span> AI
            </p>
            <p className="text-[8px] uppercase tracking-[0.22em] text-slate-500">
              Intelligent Sports Analytics
            </p>
          </div>
        </Link>

        {/* Live badge + Score */}
        <div className="flex items-center gap-3 ml-4 sm:ml-8">
          {isLive && (
            <span className="chip border-red-500/40 bg-red-500/15 text-red-400 !font-bold !text-[10px]">
              <span className="pulse-dot" />
              LIVE
            </span>
          )}
          <span className="num text-xs text-slate-400">{mm}:{ss}</span>
        </div>

        {/* Teams + Score */}
        <div className="flex items-center gap-3 mx-auto">
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-sm font-semibold text-slate-100">{team1}</span>
            <span className="h-6 w-6 rounded-full bg-blue-500/30 border border-blue-500/50 grid place-items-center">
              <span className="text-[10px] font-bold text-blue-300">
                {team1.charAt(team1.length - 1)}
              </span>
            </span>
          </div>

          <div className="score-badge px-3">
            {score1} - {score2}
          </div>

          <div className="flex items-center gap-2">
            <span className="h-6 w-6 rounded-full bg-orange-500/30 border border-orange-500/50 grid place-items-center">
              <span className="text-[10px] font-bold text-orange-300">
                {team2.charAt(team2.length - 1)}
              </span>
            </span>
            <span className="hidden sm:inline text-sm font-semibold text-slate-100">{team2}</span>
          </div>
        </div>

        {/* Nav tabs */}
        <nav className="hidden lg:flex items-center gap-1">
          {[
            { icon: LayoutDashboard, label: "Dashboard", href: "/" },
            { icon: MonitorPlay, label: "Match View", active: true },
            { icon: Users, label: "Players" },
            { icon: BarChart3, label: "Analytics" },
            { icon: FileText, label: "Reports" },
            { icon: Settings, label: "Settings" },
          ].map((t) => (
            <span
              key={t.label}
              className={`relative flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium transition-colors cursor-pointer ${
                t.active ? "text-cyan-300" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
              {t.active && (
                <span className="absolute inset-x-2 -bottom-[11px] h-[2px] rounded bg-cyan-400 shadow-[0_0_12px_#22d3ee]" />
              )}
            </span>
          ))}
        </nav>

        <SystemStatus />
      </div>
    </header>
  );
}

/* ── Dashboard Header (original) ──────────────────────── */
export default function AppHeader({
  active,
  center,
}: {
  active: "dashboard" | "match";
  center?: React.ReactNode;
}) {
  const tab = (isActive: boolean) =>
    `relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
      isActive ? "text-cyan-300" : "text-slate-400 hover:text-slate-200"
    }`;

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--line)] bg-[#060b16]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1680px] items-center gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-3 shrink-0">
          <Logo />
          <div className="leading-tight">
            <p className="text-[15px] font-bold tracking-[0.08em] text-white">
              VISION<span className="text-cyan-300">PITCH</span> AI
            </p>
            <p className="text-[9px] uppercase tracking-[0.22em] text-slate-500">Intelligent Sports Analytics</p>
          </div>
        </Link>

        {center && <div className="hidden lg:flex min-w-0 flex-1 items-center justify-center">{center}</div>}

        <nav className="ml-auto flex items-center">
          <Link href="/" className={tab(active === "dashboard")}>
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
            {active === "dashboard" && (
              <span className="absolute inset-x-3 -bottom-[13px] h-[2px] rounded bg-cyan-400 shadow-[0_0_12px_#22d3ee]" />
            )}
          </Link>
          <span className={`${tab(active === "match")} cursor-default`}>
            <MonitorPlay className="h-4 w-4" />
            <span className="hidden sm:inline">Match View</span>
            {active === "match" && (
              <span className="absolute inset-x-3 -bottom-[13px] h-[2px] rounded bg-cyan-400 shadow-[0_0_12px_#22d3ee]" />
            )}
          </span>
        </nav>

        <SystemStatus />
      </div>
    </header>
  );
}

export function BackLink() {
  return (
    <Link href="/" className="btn !px-2.5 !py-1.5" title="Back to dashboard">
      <ChevronLeft className="h-4 w-4" />
      <span className="hidden sm:inline text-xs">Back</span>
    </Link>
  );
}
