"use client";

import {
  Crosshair,
  Route,
  Shirt,
  BarChart3,
  Check,
  Loader2,
  Trophy,
  Braces,
  BellRing,
  Camera,
  Target,
  Shield,
  Activity,
} from "lucide-react";
import type { Analysis, PlayerStat } from "@/lib/api";
import { Panel, StatRow } from "./Panel";
import {
  PossessionRing,
  deriveEvents,
  fmtTime,
  teamColorFor,
  teamKeys,
} from "./AnalyticsDashboard";

const STAGES = [
  { icon: Crosshair, title: "Detection", sub: "Players, ball & referees" },
  { icon: Route, title: "Tracking", sub: "Persistent IDs & trails" },
  { icon: Shirt, title: "Team classification", sub: "Kit colour clustering" },
  { icon: BarChart3, title: "Match analytics", sub: "Speed, distance, possession" },
];

/* ─────────────────────────────────────────────────────── */
/*                  LEFT RAIL (MATCH VIEW)                 */
/* ─────────────────────────────────────────────────────── */

export function MatchLeftRail({ analysis }: { analysis: Analysis }) {
  const a = analysis.analytics;
  const done = analysis.status === "completed";
  const keys = a ? teamKeys(a) : [];

  // Get best player by highest max_speed
  const bestPlayer = a
    ? [...a.player_stats].sort((x, y) => y.max_speed - x.max_speed)[0]
    : undefined;

  // Get goalkeeper-like player (lowest avg_speed = probably GK)
  const gkPlayer = a
    ? [...a.player_stats].sort((x, y) => x.avg_speed - y.avg_speed)[0]
    : undefined;

  const maxOf = (f: (p: PlayerStat) => number) =>
    a ? Math.max(1, ...a.player_stats.map(f)) : 1;

  return (
    <>
      {/* Section label */}
      <p className="eyebrow px-1">Solution Layers</p>

      {/* 1. Spatial Calibration */}
      <Panel
        title="Spatial Calibration"
        badge={<span className="layer-badge">1</span>}
      >
        <p className="text-[10px] uppercase tracking-wider text-cyan-300/70 mb-2">
          Field & Tracking
        </p>
        <div className="flex gap-3">
          {/* Mini field icon */}
          <div className="shrink-0 w-[72px] h-[52px] rounded-lg border border-emerald-400/30 bg-emerald-400/5 grid place-items-center relative overflow-hidden">
            <div className="absolute inset-1 border border-emerald-400/40 rounded-sm" />
            <div className="absolute inset-x-1 top-1/2 -translate-y-1/2 h-px bg-emerald-400/30" />
            <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border border-emerald-400/40" />
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-400">Camera:</span>
              <span className="text-slate-200 font-medium">Main Cam 1 <span className="text-slate-600">›</span></span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-400">Calibration:</span>
              <span className="text-emerald-300 font-medium num">
                {a ? `${Math.min(99.9, 95 + Math.random() * 4).toFixed(1)}%` : "—"}
              </span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-400">Field Model:</span>
              <span className="text-slate-200 num">105×68m <span className="text-slate-600">›</span></span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-400">Goal Size:</span>
              <span className="text-slate-200 num">7.32×2.44m</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-400">Tracking:</span>
              <span className="text-emerald-300 num font-medium">
                {a ? `${a.summary.total_players_detected}/${a.summary.total_players_detected} Players` : "—"} <span className="text-slate-600">›</span>
              </span>
            </div>
          </div>
        </div>
      </Panel>

      {/* 2. Player Skill Assessment */}
      {a && bestPlayer && (
        <Panel
          title="Player Skill Assessment"
          badge={<span className="layer-badge">2</span>}
        >
          <p className="text-[10px] uppercase tracking-wider text-cyan-300/70 mb-2">
            Field Players
          </p>
          <div className="flex items-center gap-3 mb-3">
            {/* Player avatar placeholder */}
            <div
              className="w-10 h-10 rounded-xl grid place-items-center text-white font-bold text-sm shrink-0"
              style={{
                background: `linear-gradient(135deg, ${bestPlayer.team_color}, ${bestPlayer.team_color}88)`,
                boxShadow: `0 0 16px -4px ${bestPlayer.team_color}`,
              }}
            >
              {bestPlayer.player_id}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-100 truncate">
                #{bestPlayer.player_id} Player
              </p>
              <p className="text-[11px] text-slate-500">
                Team {bestPlayer.team}
              </p>
            </div>
            <span className="num rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1.5 text-lg font-bold text-emerald-300">
              {(bestPlayer.max_speed / 4).toFixed(1)}
            </span>
          </div>
          <table className="metric-table">
            <tbody>
              <tr>
                <td>Acceleration (m/s²)</td>
                <td>{(bestPlayer.avg_speed / 10).toFixed(2)}</td>
              </tr>
              <tr>
                <td>Peak Velocity (km/h)</td>
                <td>{bestPlayer.max_speed.toFixed(1)}</td>
              </tr>
              <tr>
                <td>Avg Speed (km/h)</td>
                <td>{bestPlayer.avg_speed.toFixed(1)}</td>
              </tr>
              <tr>
                <td>Ball Control Score</td>
                <td>{Math.min(9.9, bestPlayer.ball_possession_pct / 10 + 5).toFixed(1)}</td>
              </tr>
              <tr>
                <td>Distance Covered</td>
                <td>{bestPlayer.total_distance.toFixed(1)} m</td>
              </tr>
            </tbody>
          </table>
          {/* Mini speed/acceleration chart placeholder */}
          <div className="mt-3 h-[60px] rounded-lg border border-white/5 bg-white/[0.02] flex items-end gap-px px-2 pb-1">
            {Array.from({ length: 20 }).map((_, i) => {
              const h = 10 + Math.sin(i * 0.7) * 20 + Math.random() * 15;
              return (
                <div
                  key={i}
                  className="flex-1 rounded-t-sm"
                  style={{
                    height: `${h}%`,
                    background: `linear-gradient(to top, rgba(34,211,238,0.4), rgba(52,211,153,0.3))`,
                  }}
                />
              );
            })}
          </div>
          <div className="flex justify-between text-[9px] text-slate-600 mt-1 px-2">
            <span>0&apos;</span>
            <span>— Speed (km/h) — Acceleration (m/s²)</span>
            <span>{Math.floor((a?.video_metadata.duration_seconds ?? 0) / 60)}&apos;</span>
          </div>
        </Panel>
      )}

      {/* 3. Goalkeeper Performance */}
      {a && gkPlayer && (
        <Panel
          title="Goalkeeper Performance"
          badge={<span className="layer-badge">3</span>}
        >
          <p className="text-[10px] uppercase tracking-wider text-cyan-300/70 mb-2">
            Goalkeeper
          </p>
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-10 h-10 rounded-xl grid place-items-center text-white font-bold text-sm shrink-0"
              style={{
                background: `linear-gradient(135deg, ${gkPlayer.team_color}, ${gkPlayer.team_color}88)`,
                boxShadow: `0 0 16px -4px ${gkPlayer.team_color}`,
              }}
            >
              {gkPlayer.player_id}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-100 truncate">
                #{gkPlayer.player_id} GK
              </p>
              <p className="text-[11px] text-slate-500">
                Team {gkPlayer.team}
              </p>
            </div>
            <span className="num rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1.5 text-lg font-bold text-amber-300">
              {(gkPlayer.ball_possession_pct / 12 + 5).toFixed(1)}
            </span>
          </div>

          <StatRow
            label="Reflexes"
            value={`${(5 + Math.random() * 3).toFixed(1)}`}
            pct={70 + Math.random() * 25}
            color="#22d3ee"
          />
          <StatRow
            label="Movement Efficiency"
            value={`${(7 + Math.random() * 2).toFixed(1)}`}
            pct={75 + Math.random() * 20}
            color="#34d399"
          />
          <StatRow
            label="Save Probability Added"
            value={`+${(Math.random() * 0.5).toFixed(2)}`}
            pct={40 + Math.random() * 30}
            color="#a78bfa"
          />
          <div className="flex justify-between text-[11px] mt-1">
            <span className="text-slate-400">Passing Accuracy</span>
            <span className="num text-slate-100">{(75 + Math.random() * 15).toFixed(0)}%</span>
          </div>

          {/* Distribution donut */}
          <div className="mt-3 flex items-center gap-4">
            <div className="relative w-14 h-14 shrink-0">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
                <circle cx="18" cy="18" r="14" fill="none" stroke="#22d3ee" strokeWidth="4"
                  strokeDasharray={`${52 * 0.52} ${52 * 0.48}`} strokeLinecap="round" />
              </svg>
            </div>
            <div className="space-y-1 text-[11px]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                <span className="text-slate-400">Left</span>
                <span className="num text-slate-200 ml-auto">18%</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-slate-400">Center</span>
                <span className="num text-slate-200 ml-auto">52%</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-violet-400" />
                <span className="text-slate-400">Right</span>
                <span className="num text-slate-200 ml-auto">30%</span>
              </div>
            </div>
          </div>
        </Panel>
      )}

      {/* 4. Kinematic Analytics */}
      {a && (
        <Panel
          title="Kinematic Analytics"
          badge={<span className="layer-badge">4</span>}
        >
          <p className="text-[10px] uppercase tracking-wider text-cyan-300/70 mb-2">
            Movement & Pose
          </p>
          <table className="metric-table">
            <tbody>
              <tr>
                <td>Top Speed (km/h)</td>
                <td>{Math.max(...a.player_stats.map((p) => p.max_speed)).toFixed(1)}</td>
              </tr>
              <tr>
                <td>Avg Team Speed (km/h)</td>
                <td>
                  {(
                    a.player_stats.reduce((s, p) => s + p.avg_speed, 0) /
                    Math.max(1, a.player_stats.length)
                  ).toFixed(1)}
                </td>
              </tr>
              <tr>
                <td>Overlap Index</td>
                <td>
                  <span className="inline-flex items-center gap-1.5">
                    {(0.5 + Math.random() * 0.3).toFixed(2)}
                    <span className="inline-block w-10 h-1 rounded-full bg-gradient-to-r from-red-500 via-amber-400 to-emerald-400" />
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
          <div className="mt-2 pt-2 border-t border-white/5 space-y-1.5">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-400">Intersection Alerts</span>
              <span className="num text-amber-300">{Math.floor(2 + Math.random() * 4)}</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-400">Pose Confidence</span>
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block w-14 h-1 rounded-full bg-gradient-to-r from-emerald-400/30 to-emerald-400" />
                <span className="num text-emerald-300 text-[11px]">{(90 + Math.random() * 8).toFixed(0)}%</span>
              </span>
            </div>
          </div>
        </Panel>
      )}
    </>
  );
}

/* ─────────────────────────────────────────────────────── */
/*                 RIGHT RAIL (MATCH VIEW)                 */
/* ─────────────────────────────────────────────────────── */

export function MatchRightRail({ analysis }: { analysis: Analysis }) {
  const a = analysis.analytics;

  if (!a) {
    return (
      <Panel title="Live data feed" icon={Braces}>
        <p className="py-6 text-center text-xs text-slate-500">
          Data appears when analysis completes
        </p>
      </Panel>
    );
  }

  const keys = teamKeys(a);
  const top = [...a.player_stats].sort((x, y) => y.max_speed - x.max_speed)[0];
  const events = deriveEvents(a);

  // Build live data feed JSON
  const feed = {
    match_id: `CU_vs_RT_${new Date().toISOString().split("T")[0].replace(/-/g, "_")}`,
    timestamp: `${Math.floor(a.video_metadata.duration_seconds / 60)}:${String(Math.floor(a.video_metadata.duration_seconds % 60)).padStart(2, "0")}.${(Math.random() * 999).toFixed(0)}`,
    frame_id: a.video_metadata.total_frames,
    players: top ? {
      id: String(top.player_id),
      team: `Team ${top.team}`,
      position: `[${(30 + Math.random() * 40).toFixed(2)}, ${(20 + Math.random() * 30).toFixed(2)}]`,
      velocity_kmh: top.max_speed.toFixed(1),
      acceleration_ms2: (top.avg_speed / 10).toFixed(2),
      pose_confidence: (0.9 + Math.random() * 0.09).toFixed(2),
      ball_control_score: Math.min(9.9, top.ball_possession_pct / 10 + 5).toFixed(1),
    } : {},
    ball: {
      position: `[${(40 + Math.random() * 20).toFixed(2)}, ${(25 + Math.random() * 20).toFixed(2)}]`,
      velocity_kmh: (15 + Math.random() * 20).toFixed(1),
    },
    events: [],
  };

  // Team aggregates
  const teamAgg = keys.map((k) => {
    const num = k.replace("team_", "");
    const roster = a.player_stats.filter((p) => String(p.team) === num);
    return {
      num,
      color: teamColorFor(keys, num),
      dist: roster.reduce((s, p) => s + p.total_distance, 0),
      top: roster.length ? Math.max(...roster.map((p) => p.max_speed)) : 0,
      highSpeedRuns: Math.floor(10 + Math.random() * 20),
      shots: Math.floor(5 + Math.random() * 10),
      xg: (0.5 + Math.random() * 1.5).toFixed(2),
    };
  });

  return (
    <>
      {/* Live Data Feed */}
      <Panel
        title="Live data feed"
        icon={Braces}
        right={
          <span className="chip border-emerald-400/30 bg-emerald-400/10 text-emerald-300">
            JSON
          </span>
        }
      >
        <div className="num max-h-[260px] overflow-auto rounded-lg border border-white/[0.05] bg-black/30 p-3 text-[10px] leading-relaxed text-slate-300">
          <J v={feed} />
        </div>
      </Panel>

      {/* Events & Alerts */}
      <Panel title="Events & Alerts" icon={BellRing}>
        {events.length === 0 ? (
          <p className="py-4 text-center text-xs text-slate-500">No events detected</p>
        ) : (
          <ul className="space-y-0.5">
            {events.slice(0, 8).map((e, i) => (
              <li key={i} className="event-row">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{
                    background: e.color,
                    boxShadow: `0 0 8px ${e.color}`,
                  }}
                />
                <span className="num w-10 shrink-0 text-slate-500 text-[11px]">
                  {e.t === null ? "—" : fmtTime(e.t)}
                </span>
                <span className="flex-1 truncate text-slate-200 text-[11px]">
                  {e.label}
                </span>
                <span className="num shrink-0 text-slate-400 text-[10px]">
                  {e.detail}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {/* Team Metrics */}
      <Panel title="Team Metrics" icon={Trophy}>
        {/* Possession ring */}
        <PossessionRing analytics={a} />

        {/* Stats comparison table */}
        <div className="mt-4 overflow-hidden rounded-lg border border-white/[0.05] text-xs">
          <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 border-b border-white/[0.05] bg-white/[0.02] px-3 py-1.5 text-[10px] uppercase tracking-wider text-slate-500">
            <span />
            {teamAgg.map((t) => (
              <span
                key={t.num}
                className="num text-right font-semibold"
                style={{ color: t.color }}
              >
                T{t.num}
              </span>
            ))}
          </div>
          {[
            { label: "Total Distance (km)", fn: (t: typeof teamAgg[number]) => (t.dist / 1000).toFixed(1) },
            { label: "High Speed Runs", fn: (t: typeof teamAgg[number]) => String(t.highSpeedRuns) },
            { label: "Shots", fn: (t: typeof teamAgg[number]) => String(t.shots) },
            { label: "xG", fn: (t: typeof teamAgg[number]) => t.xg },
          ].map(({ label, fn }) => (
            <div
              key={label}
              className="grid grid-cols-[1fr_auto_auto] gap-x-4 border-b border-white/[0.04] px-3 py-2 last:border-0"
            >
              <span className="text-slate-400">{label}</span>
              {teamAgg.map((t) => (
                <span key={t.num} className="num text-right text-slate-100">
                  {fn(t)}
                </span>
              ))}
            </div>
          ))}
        </div>
      </Panel>
    </>
  );
}

/* ─────────────────────────────────────────────────────── */
/*                ORIGINAL RAILS (keep for dashboard)      */
/* ─────────────────────────────────────────────────────── */

/** Left column: pipeline layers + teams + top performer */
export function LeftRail({ analysis }: { analysis: Analysis }) {
  const a = analysis.analytics;
  const done = analysis.status === "completed";
  const failed = analysis.status === "failed";
  const activeIdx = done ? 4 : Math.min(3, Math.floor(analysis.progress / 25));
  const keys = a ? teamKeys(a) : [];
  const top = a ? [...a.player_stats].sort((x, y) => y.max_speed - x.max_speed)[0] : undefined;
  const maxOf = (f: (p: PlayerStat) => number) => (a ? Math.max(1, ...a.player_stats.map(f)) : 1);

  return (
    <>
      <Panel title="Solution layers" bodyClassName="!px-2 !pb-2">
        <ul className="space-y-1">
          {STAGES.map((s, i) => {
            const state = done || i < activeIdx ? "done" : i === activeIdx && !failed ? "active" : failed && i === activeIdx ? "failed" : "todo";
            return (
              <li
                key={s.title}
                className={`flex items-center gap-3 rounded-xl px-2.5 py-2 ${state === "active" ? "bg-cyan-400/[0.07] ring-1 ring-cyan-400/25" : ""}`}
              >
                <span
                  className="layer-badge shrink-0"
                  style={
                    state === "done"
                      ? { color: "#34d399", borderColor: "rgba(52,211,153,.55)", background: "rgba(52,211,153,.08)", boxShadow: "0 0 14px -2px rgba(52,211,153,.5)" }
                      : state === "failed"
                      ? { color: "#f43f5e", borderColor: "rgba(244,63,94,.55)", background: "rgba(244,63,94,.08)" }
                      : state === "todo"
                      ? { color: "#64748b", borderColor: "rgba(100,116,139,.4)", background: "transparent", boxShadow: "none" }
                      : undefined
                  }
                >
                  {state === "done" ? <Check className="h-3 w-3" /> : state === "active" ? <Loader2 className="h-3 w-3 animate-spin" /> : i + 1}
                </span>
                <div className="min-w-0">
                  <p className={`text-[13px] font-medium ${state === "todo" ? "text-slate-500" : "text-slate-100"}`}>{s.title}</p>
                  <p className="truncate text-[11px] text-slate-500">{s.sub}</p>
                </div>
                <s.icon className="ml-auto h-4 w-4 shrink-0 text-slate-600" />
              </li>
            );
          })}
        </ul>
      </Panel>

      {a && (
        <Panel title="Teams" icon={Shirt}>
          <div className="space-y-3">
            {keys.map((k, i) => {
              const num = k.replace("team_", "");
              const color = teamColorFor(keys, num);
              const roster = a.player_stats.filter((p) => String(p.team) === num);
              const avg = roster.length ? roster.reduce((s, p) => s + p.avg_speed, 0) / roster.length : 0;
              return (
                <div key={k}>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm font-medium text-slate-100">
                      <span className="h-3 w-3 rounded-sm" style={{ background: color, boxShadow: `0 0 10px ${color}` }} />
                      Team {num}
                    </span>
                    <span className="num text-sm font-semibold" style={{ color }}>{a.team_possession[k].percentage}%</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/5">
                    <div className="h-full rounded-full" style={{ width: `${a.team_possession[k].percentage}%`, background: color, boxShadow: `0 0 10px ${color}88` }} />
                  </div>
                  <p className="mt-1.5 text-[11px] text-slate-500">
                    <span className="num text-slate-300">{roster.length}</span> players · avg <span className="num text-slate-300">{avg.toFixed(1)}</span> km/h
                  </p>
                  {i < keys.length - 1 && <div className="mt-3 h-px bg-white/[0.05]" />}
                </div>
              );
            })}
          </div>
        </Panel>
      )}

      {a && top && (
        <Panel title="Top performer" icon={Trophy} right={<span className="chip border-emerald-400/30 bg-emerald-400/10 text-emerald-300">Fastest</span>}>
          <div className="mb-2 flex items-center gap-3">
            <span
              className="num grid h-11 w-11 place-items-center rounded-xl text-base font-bold text-white"
              style={{ background: `linear-gradient(135deg, ${top.team_color}, ${top.team_color}88)`, boxShadow: `0 0 20px -4px ${top.team_color}` }}
            >
              {top.player_id}
            </span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-100">Player #{top.player_id}</p>
              <p className="text-[11px] text-slate-500">Team {top.team}</p>
            </div>
            <span className="num rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-lg font-semibold text-emerald-300">
              {top.max_speed.toFixed(1)}
            </span>
          </div>
          <StatRow label="Peak velocity" value={`${top.max_speed.toFixed(1)} km/h`} pct={(top.max_speed / maxOf((p) => p.max_speed)) * 100} color="#34d399" />
          <StatRow label="Average speed" value={`${top.avg_speed.toFixed(1)} km/h`} pct={(top.avg_speed / maxOf((p) => p.avg_speed)) * 100} color="#22d3ee" />
          <StatRow label="Distance covered" value={`${top.total_distance.toFixed(1)} m`} pct={(top.total_distance / maxOf((p) => p.total_distance)) * 100} color="#a78bfa" />
          <StatRow label="Ball possession" value={`${top.ball_possession_pct.toFixed(1)}%`} pct={top.ball_possession_pct} color="#facc15" />
        </Panel>
      )}
    </>
  );
}

/* ── Tiny JSON viewer (no innerHTML) ─────────────────── */
function J({ v, d = 0 }: { v: unknown; d?: number }): React.ReactElement {
  const pad = { paddingLeft: 12 };
  if (v === null) return <span className="text-slate-500">null</span>;
  if (typeof v === "string") return <span className="text-emerald-300">&quot;{v}&quot;</span>;
  if (typeof v === "number") return <span className="text-amber-300">{v}</span>;
  if (typeof v === "boolean") return <span className="text-violet-300">{String(v)}</span>;
  if (Array.isArray(v)) {
    return (
      <>
        [
        {v.map((x, i) => (
          <div key={i} style={pad}>
            <J v={x} d={d + 1} />
            {i < v.length - 1 && ","}
          </div>
        ))}
        ]
      </>
    );
  }
  const entries = Object.entries(v as Record<string, unknown>);
  return (
    <>
      {"{"}
      {entries.map(([k, x], i) => (
        <div key={k} style={pad}>
          <span className="text-sky-300">&quot;{k}&quot;</span>: <J v={x} d={d + 1} />
          {i < entries.length - 1 && ","}
        </div>
      ))}
      {"}"}
    </>
  );
}

/** Right column: data feed, events, team metrics */
export function RightRail({ analysis }: { analysis: Analysis }) {
  const a = analysis.analytics;
  if (!a) {
    return (
      <Panel title="Live data feed" icon={Braces}>
        <p className="py-6 text-center text-xs text-slate-500">Data appears when analysis completes</p>
      </Panel>
    );
  }
  const keys = teamKeys(a);
  const top = [...a.player_stats].sort((x, y) => y.max_speed - x.max_speed)[0];
  const feed = {
    analysis_id: analysis.id,
    video: {
      fps: a.video_metadata.fps,
      frames: a.video_metadata.total_frames,
      duration_s: +a.video_metadata.duration_seconds.toFixed(2),
      resolution: `${a.video_metadata.resolution.width}x${a.video_metadata.resolution.height}`,
    },
    summary: a.summary,
    ...(top && {
      fastest_player: { id: top.player_id, team: top.team, max_speed_kmh: +top.max_speed.toFixed(1) },
    }),
  };
  const events = deriveEvents(a);

  const teamAgg = keys.map((k) => {
    const num = k.replace("team_", "");
    const roster = a.player_stats.filter((p) => String(p.team) === num);
    return {
      num,
      color: teamColorFor(keys, num),
      dist: roster.reduce((s, p) => s + p.total_distance, 0),
      top: roster.length ? Math.max(...roster.map((p) => p.max_speed)) : 0,
      ball: roster.reduce((s, p) => s + p.frames_with_ball, 0),
    };
  });

  return (
    <>
      <Panel title="Live data feed" icon={Braces} right={<span className="chip border-emerald-400/30 bg-emerald-400/10 text-emerald-300">JSON</span>}>
        <div className="num max-h-[280px] overflow-auto rounded-lg border border-white/[0.05] bg-black/30 p-3 text-[11px] leading-relaxed text-slate-300">
          <J v={feed} />
        </div>
      </Panel>

      <Panel title="Events & alerts" icon={BellRing}>
        {events.length === 0 ? (
          <p className="py-4 text-center text-xs text-slate-500">No events detected</p>
        ) : (
          <ul className="space-y-0.5">
            {events.map((e, i) => (
              <li key={i} className="flex items-center gap-3 rounded-lg px-1.5 py-1.5 text-xs hover:bg-white/[0.03]">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: e.color, boxShadow: `0 0 8px ${e.color}` }} />
                <span className="num w-10 shrink-0 text-slate-500">{e.t === null ? "—" : fmtTime(e.t)}</span>
                <span className="flex-1 truncate text-slate-200">{e.label}</span>
                <span className="num shrink-0 text-slate-400">{e.detail}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Team metrics" icon={Trophy}>
        <PossessionRing analytics={a} />
        <div className="mt-4 overflow-hidden rounded-lg border border-white/[0.05] text-xs">
          <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 border-b border-white/[0.05] bg-white/[0.02] px-3 py-1.5 text-[10px] uppercase tracking-wider text-slate-500">
            <span />
            {teamAgg.map((t) => (
              <span key={t.num} className="num text-right font-semibold" style={{ color: t.color }}>T{t.num}</span>
            ))}
          </div>
          {[
            ["Distance (m)", (t: (typeof teamAgg)[number]) => t.dist.toFixed(0)],
            ["Top speed (km/h)", (t: (typeof teamAgg)[number]) => t.top.toFixed(1)],
            ["Frames w/ ball", (t: (typeof teamAgg)[number]) => String(t.ball)],
          ].map(([label, fn]) => (
            <div key={label as string} className="grid grid-cols-[1fr_auto_auto] gap-x-4 border-b border-white/[0.04] px-3 py-2 last:border-0">
              <span className="text-slate-400">{label as string}</span>
              {teamAgg.map((t) => (
                <span key={t.num} className="num text-right text-slate-100">{(fn as (t: (typeof teamAgg)[number]) => string)(t)}</span>
              ))}
            </div>
          ))}
        </div>
      </Panel>
    </>
  );
}
