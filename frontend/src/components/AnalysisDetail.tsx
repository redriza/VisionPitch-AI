"use client";

import { useState } from "react";
import { Analysis, getVideoUrl } from "@/lib/api";
import ProgressBar from "./ProgressBar";
import { DetectionTimeline, PlayerTable, PossessionTimeline, TEAM_COLORS, VelocityChart, teamKeys } from "./AnalyticsDashboard";
import { LeftRail, RightRail } from "./Rails";
import { Kpi, Panel } from "./Panel";
import { STATUS_CONFIG } from "./AnalysisList";
import { AlertTriangle, RefreshCw, Users, Timer, Monitor, Gauge, Download, ScanEye } from "lucide-react";

interface AnalysisDetailProps {
  analysis: Analysis;
}

export default function AnalysisDetail({ analysis }: AnalysisDetailProps) {
  const cfg = STATUS_CONFIG[analysis.status];
  const Icon = cfg.icon;
  const [videoError, setVideoError] = useState<string | null>(null);
  const [videoKey, setVideoKey] = useState(0);
  const a = analysis.analytics;
  const inProgress = analysis.status === "processing" || analysis.status === "pending";

  const handleVideoError = () =>
    setVideoError("Failed to load or play the video. The video format may not be supported by your browser.");
  const retryVideo = () => {
    setVideoError(null);
    setVideoKey((k) => k + 1);
  };

  const keys = a ? teamKeys(a) : [];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[272px_minmax(0,1fr)_316px]">
        {/* ── Left rail ───────────────────────────────────── */}
        <aside className="order-2 space-y-4 xl:order-1">
          <LeftRail analysis={analysis} />
        </aside>

        {/* ── Centre ──────────────────────────────────────── */}
        <div className="order-1 min-w-0 space-y-4 xl:order-2">
          {/* KPI strip */}
          {a && (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Kpi icon={Users} label="Players detected" value={a.summary.total_players_detected} sub={`${a.summary.total_teams} teams`} />
              <Kpi icon={Timer} label="Duration" value={`${a.video_metadata.duration_seconds.toFixed(1)}s`} sub={`${a.video_metadata.total_frames} frames`} accent="#a78bfa" />
              <Kpi icon={Monitor} label="Resolution" value={`${a.video_metadata.resolution.width}×${a.video_metadata.resolution.height}`} sub={`${a.video_metadata.fps} FPS`} accent="#38bdf8" />
              <Kpi
                icon={Gauge}
                label="Top speed"
                value={a.player_stats.length ? `${Math.max(...a.player_stats.map((p) => p.max_speed)).toFixed(1)}` : "—"}
                sub="km/h · fastest player"
                accent="#34d399"
              />
            </div>
          )}

          {/* Status / progress */}
          {(inProgress || analysis.status === "failed") && (
            <Panel className="relative overflow-hidden" bodyClassName="!pt-5">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: `${cfg.color}1a`, color: cfg.color }}>
                  <Icon className={`h-5 w-5 ${analysis.status === "processing" ? "animate-spin" : ""}`} />
                </span>
                <div>
                  <p className="font-semibold" style={{ color: cfg.color }}>{cfg.label}</p>
                  {analysis.stage && <p className="text-xs text-slate-400">{analysis.stage}</p>}
                </div>
              </div>
              {inProgress && <ProgressBar progress={analysis.progress} stage={analysis.stage} className="mt-5" />}
              {analysis.status === "failed" && analysis.error_message && (
                <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/[0.07] p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium text-rose-400">
                    <AlertTriangle className="h-4 w-4" />
                    Error details
                  </div>
                  <pre className="num max-h-48 overflow-auto whitespace-pre-wrap text-xs text-rose-300/80">{analysis.error_message}</pre>
                </div>
              )}
            </Panel>
          )}

          {/* Annotated video with HUD */}
          {analysis.status === "completed" && (
            <section className="panel overflow-hidden">
              <div className="relative bg-black">
                {videoError ? (
                  <div className="flex flex-col items-center justify-center px-4 py-20 text-center">
                    <AlertTriangle className="mb-3 h-10 w-10 text-amber-400" />
                    <p className="mb-1 text-slate-200">Video playback error</p>
                    <p className="mb-4 max-w-md text-sm text-slate-500">{videoError}</p>
                    <button onClick={retryVideo} className="btn">
                      <RefreshCw className="h-4 w-4" />
                      Retry
                    </button>
                    <a
                      href={getVideoUrl(analysis.id)}
                      download={`analysis_${analysis.id}.mp4`}
                      className="mt-3 text-sm text-cyan-300 underline underline-offset-4 hover:text-cyan-200"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Download video instead
                    </a>
                  </div>
                ) : (
                  <>
                    <video
                      key={videoKey}
                      controls
                      preload="metadata"
                      playsInline
                      className="block max-h-[68vh] w-full"
                      onError={handleVideoError}
                    >
                      <source src={getVideoUrl(analysis.id)} type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                    {/* HUD overlay (non-interactive so native controls keep working) */}
                    <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2 rounded-lg border border-emerald-400/30 bg-black/60 px-2.5 py-1.5 text-xs backdrop-blur-md">
                      <ScanEye className="h-3.5 w-3.5 text-emerald-300" />
                      <span className="text-slate-300">AI Tracking:</span>
                      <span className="font-semibold text-emerald-300">ON</span>
                    </div>
                    {a && (
                      <div className="num pointer-events-none absolute right-3 top-3 rounded-lg border border-cyan-400/25 bg-black/60 px-2.5 py-1.5 text-[11px] text-cyan-200 backdrop-blur-md">
                        {a.video_metadata.resolution.width}×{a.video_metadata.resolution.height} · {a.video_metadata.fps} FPS
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Legend / toolbar */}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[var(--line)] bg-black/20 px-4 py-3 text-xs text-slate-300">
                {keys.map((k, i) => (
                  <span key={k} className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ background: TEAM_COLORS[i % 2], boxShadow: `0 0 8px ${TEAM_COLORS[i % 2]}` }} />
                    Team {k.replace("team_", "")}
                  </span>
                ))}
                <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-amber-300" />Ball</span>
                <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-violet-400" />Referee</span>
                <a href={getVideoUrl(analysis.id)} download={`analysis_${analysis.id}.mp4`} className="btn ml-auto !px-3 !py-1.5 !text-xs">
                  <Download className="h-3.5 w-3.5" />
                  Download
                </a>
              </div>
            </section>
          )}

          {/* Chart row */}
          {analysis.status === "completed" && a && (
            <div className="grid gap-4 md:grid-cols-2">
              <VelocityChart players={a.player_stats} />
              <PossessionTimeline analytics={a} />
              <div className="md:col-span-2">
                <DetectionTimeline analytics={a} />
              </div>
            </div>
          )}
        </div>

        {/* ── Right rail ──────────────────────────────────── */}
        <aside className="order-3 space-y-4">
          <RightRail analysis={analysis} />
        </aside>
      </div>

      {analysis.status === "completed" && a && <PlayerTable players={a.player_stats} />}
    </div>
  );
}
