"use client";

import { useState, useCallback, useMemo } from "react";
import {
  Crosshair,
  Route,
  Shirt,
  BarChart3,
  Film,
  CheckCircle2,
  Loader2,
  XCircle,
  Users,
  Radio,
} from "lucide-react";
import VideoUpload from "@/components/VideoUpload";
import AnalysisList, { STATUS_CONFIG } from "@/components/AnalysisList";
import AppHeader from "@/components/Shell";
import { Panel, Kpi } from "@/components/Panel";
import type { Analysis } from "@/lib/api";

const LAYERS = [
  {
    icon: Crosshair,
    title: "Detection",
    sub: "Players, ball & referees",
    tags: ["Players", "Ball", "Referees"],
  },
  {
    icon: Route,
    title: "Tracking",
    sub: "Persistent IDs across frames",
    tags: ["Trails", "Speed", "Distance"],
  },
  {
    icon: Shirt,
    title: "Team Classification",
    sub: "Kit-colour clustering",
    tags: ["Team 1", "Team 2"],
  },
  {
    icon: BarChart3,
    title: "Match Analytics",
    sub: "Possession & performance",
    tags: ["Possession", "Top speed", "Ball %"],
  },
];

function timeAgo(iso: string) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function HomePage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);

  const handleUploadComplete = useCallback(() => setRefreshKey((k) => k + 1), []);
  const handleData = useCallback((a: Analysis[]) => setAnalyses(a), []);

  const stats = useMemo(() => {
    const done = analyses.filter((a) => a.status === "completed");
    return {
      total: analyses.length,
      completed: done.length,
      active: analyses.filter((a) => a.status === "processing" || a.status === "pending").length,
      failed: analyses.filter((a) => a.status === "failed").length,
      players: done.reduce((n, a) => n + (a.analytics?.summary.total_players_detected ?? 0), 0),
    };
  }, [analyses]);

  const recent = useMemo(
    () =>
      [...analyses]
        .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
        .slice(0, 7),
    [analyses]
  );

  return (
    <main className="min-h-screen">
      <AppHeader active="dashboard" />

      <div className="mx-auto grid max-w-[1680px] gap-4 px-4 py-5 sm:px-6 xl:grid-cols-[270px_minmax(0,1fr)_310px]">
        {/* ── Left: solution layers ──────────────────────── */}
        <aside className="order-2 space-y-3 xl:order-1">
          <p className="eyebrow px-1">Analysis pipeline</p>
          {LAYERS.map((l, i) => (
            <Panel
              key={l.title}
              title={l.title}
              badge={<span className="layer-badge">{i + 1}</span>}
              right={<l.icon className="h-4 w-4 text-slate-500" />}
            >
              <p className="text-xs text-slate-400">{l.sub}</p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {l.tags.map((t) => (
                  <span key={t} className="rounded-md border border-cyan-400/20 bg-cyan-400/[0.06] px-2 py-0.5 text-[10px] text-cyan-200/90">
                    {t}
                  </span>
                ))}
              </div>
            </Panel>
          ))}
        </aside>

        {/* ── Centre: upload + analyses ──────────────────── */}
        <div className="order-1 min-w-0 space-y-5 xl:order-2">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Match intelligence, <span className="bg-gradient-to-r from-cyan-300 to-emerald-300 bg-clip-text text-transparent">frame by frame.</span>
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm text-slate-400">
              Upload match footage to detect and track every player, classify teams and generate possession, speed and distance analytics.
            </p>
          </div>

          <VideoUpload onUploadComplete={handleUploadComplete} />

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Kpi icon={Film} label="Analyses" value={stats.total} sub="in library" />
            <Kpi icon={CheckCircle2} label="Completed" value={stats.completed} sub="ready to view" accent="#34d399" />
            <Kpi icon={Loader2} label="In progress" value={stats.active} sub="auto-refreshing" accent="#38bdf8" />
            <Kpi icon={Users} label="Players tracked" value={stats.players} sub="across completed" accent="#a78bfa" />
          </div>

          <section>
            <div className="mb-3 flex items-center gap-3">
              <h2 className="panel-title !text-[12px]">Analyses</h2>
              <span className="h-px flex-1 bg-gradient-to-r from-[var(--line-strong)] to-transparent" />
            </div>
            <AnalysisList refreshKey={refreshKey} onData={handleData} />
          </section>
        </div>

        {/* ── Right: activity ─────────────────────────────── */}
        <aside className="order-3 space-y-4">
          <Panel
            title="Recent activity"
            icon={Radio}
            right={
              stats.active > 0 ? (
                <span className="chip border-sky-400/30 bg-sky-400/10 text-sky-300">
                  <span className="pulse-dot" /> LIVE
                </span>
              ) : undefined
            }
          >
            {recent.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-500">No activity yet</p>
            ) : (
              <ul className="space-y-0.5">
                {recent.map((a) => {
                  const cfg = STATUS_CONFIG[a.status];
                  return (
                    <li key={a.id}>
                      <a
                        href={`/analysis/${a.id}`}
                        className="flex items-start gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-white/[0.04]"
                      >
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ background: cfg.color, boxShadow: `0 0 8px ${cfg.color}` }} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium text-slate-200">{a.filename}</p>
                          <p className="text-[11px] text-slate-500">
                            <span style={{ color: cfg.color }}>{cfg.label}</span>
                            {a.status === "processing" && ` · ${a.progress}%`}
                          </p>
                        </div>
                        <span className="num shrink-0 text-[10px] text-slate-600">{timeAgo(a.created_at)}</span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

          <Panel title="Pipeline health">
            <div className="space-y-2.5">
              {(["completed", "processing", "failed"] as const).map((k) => {
                const cfg = STATUS_CONFIG[k];
                const n = k === "processing" ? stats.active : stats[k];
                const pct = stats.total ? (n / stats.total) * 100 : 0;
                return (
                  <div key={k}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-slate-400">
                        {k === "failed" ? <XCircle className="h-3 w-3" style={{ color: cfg.color }} /> : <cfg.icon className="h-3 w-3" style={{ color: cfg.color }} />}
                        {cfg.label}
                      </span>
                      <span className="num text-slate-200">{n}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: cfg.color, boxShadow: `0 0 10px ${cfg.color}88` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>
        </aside>
      </div>
    </main>
  );
}
