"use client";

import {
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Users, Gauge, TrendingUp, Activity } from "lucide-react";
import { Analytics, PlayerStat } from "@/lib/api";
import { useState, useMemo } from "react";
import { Panel } from "./Panel";

// Reference palette: Team 1 = blue, Team 2 = orange
export const TEAM_COLORS = ["#3b82f6", "#f97316"];
export const CHART_COLORS = {
  players: "#22d3ee",
  ball: "#facc15",
  referees: "#a78bfa",
  avg: "#22d3ee",
  max: "#34d399",
};

const AXIS = { fill: "#6b7a99", fontSize: 10 };
const GRID = "rgba(120,160,255,0.10)";
const TOOLTIP = {
  contentStyle: {
    background: "rgba(8,14,28,0.95)",
    border: "1px solid rgba(34,211,238,0.3)",
    borderRadius: 10,
    fontSize: 12,
    boxShadow: "0 10px 30px -10px rgba(0,0,0,.8)",
  },
  itemStyle: { color: "#cbd5e8" },
  labelStyle: { color: "#8fa3c7", marginBottom: 4 },
} as const;

export function teamKeys(a: Analytics) {
  return Object.keys(a.team_possession);
}
export function teamColorFor(keys: string[], team: number | string) {
  const idx = keys.findIndex((k) => k.replace("team_", "") === String(team));
  return TEAM_COLORS[(idx < 0 ? 0 : idx) % TEAM_COLORS.length];
}
export function fmtTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ── Charts ──────────────────────────────────────────────────────────────

/** "Velocity tracking" — avg vs peak speed for the fastest players */
export function VelocityChart({ players }: { players: PlayerStat[] }) {
  const data = useMemo(
    () =>
      [...players]
        .sort((a, b) => b.max_speed - a.max_speed)
        .slice(0, 10)
        .map((p) => ({ name: `#${p.player_id}`, Peak: +p.max_speed.toFixed(1), Average: +p.avg_speed.toFixed(1) })),
    [players]
  );
  return (
    <Panel title="Velocity tracking" icon={Gauge} right={<span className="eyebrow">km/h · top 10</span>}>
      <ResponsiveContainer width="100%" height={210}>
        <BarChart data={data} barGap={2} margin={{ left: -18, right: 4, top: 8 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="name" tick={AXIS} axisLine={false} tickLine={false} />
          <YAxis tick={AXIS} axisLine={false} tickLine={false} />
          <Tooltip {...TOOLTIP} cursor={{ fill: "rgba(34,211,238,0.06)" }} />
          <Bar dataKey="Peak" fill={CHART_COLORS.max} radius={[4, 4, 0, 0]} maxBarSize={14} />
          <Bar dataKey="Average" fill={CHART_COLORS.avg} radius={[4, 4, 0, 0]} maxBarSize={14} />
          <Legend iconType="circle" iconSize={7} />
        </BarChart>
      </ResponsiveContainer>
    </Panel>
  );
}

export function PossessionTimeline({ analytics }: { analytics: Analytics }) {
  const keys = teamKeys(analytics);
  const data = useMemo(
    () =>
      analytics.possession_timeline.map((pt) => {
        const entry: Record<string, number> = { time: pt.time_seconds };
        keys.forEach((t) => {
          entry[`Team ${t.replace("team_", "")}`] = pt.team === parseInt(t.replace("team_", "")) ? 1 : 0;
        });
        return entry;
      }),
    [analytics.possession_timeline, keys]
  );
  return (
    <Panel title="Possession timeline" icon={TrendingUp} right={<span className="eyebrow">seconds</span>}>
      <ResponsiveContainer width="100%" height={210}>
        <AreaChart data={data} margin={{ left: -18, right: 4, top: 8 }}>
          <defs>
            {keys.map((t, i) => (
              <linearGradient key={t} id={`pg-${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={TEAM_COLORS[i % 2]} stopOpacity={0.75} />
                <stop offset="100%" stopColor={TEAM_COLORS[i % 2]} stopOpacity={0.15} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="time" tick={AXIS} axisLine={false} tickLine={false} />
          <YAxis hide />
          <Tooltip {...TOOLTIP} />
          {keys.map((t, i) => (
            <Area
              key={t}
              type="stepAfter"
              dataKey={`Team ${t.replace("team_", "")}`}
              stackId="1"
              fill={`url(#pg-${i})`}
              stroke={TEAM_COLORS[i % 2]}
              strokeWidth={1.5}
            />
          ))}
          <Legend iconType="circle" iconSize={7} />
        </AreaChart>
      </ResponsiveContainer>
    </Panel>
  );
}

export function DetectionTimeline({ analytics }: { analytics: Analytics }) {
  return (
    <Panel title="Detection timeline" icon={Users} right={<span className="eyebrow">objects / frame</span>}>
      <ResponsiveContainer width="100%" height={210}>
        <LineChart data={analytics.detection_timeline} margin={{ left: -18, right: 4, top: 8 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="time_seconds" tick={AXIS} axisLine={false} tickLine={false} />
          <YAxis tick={AXIS} axisLine={false} tickLine={false} />
          <Tooltip {...TOOLTIP} />
          <Line type="monotone" dataKey="players" stroke={CHART_COLORS.players} strokeWidth={2} dot={false} name="Players" />
          <Line type="monotone" dataKey="ball" stroke={CHART_COLORS.ball} strokeWidth={2} dot={false} name="Ball" />
          <Line type="monotone" dataKey="referees" stroke={CHART_COLORS.referees} strokeWidth={2} dot={false} name="Referees" />
          <Legend iconType="circle" iconSize={7} />
        </LineChart>
      </ResponsiveContainer>
    </Panel>
  );
}

/** Donut with possession % in the centre — mirrors "Team metrics" ring */
export function PossessionRing({ analytics }: { analytics: Analytics }) {
  const keys = teamKeys(analytics);
  const data = keys.map((k, i) => ({
    name: `Team ${k.replace("team_", "")}`,
    value: analytics.team_possession[k].percentage,
    fill: TEAM_COLORS[i % 2],
  }));
  const lead = data.reduce((a, b) => (b.value > a.value ? b : a), data[0] ?? { name: "—", value: 0, fill: "#22d3ee" });
  return (
    <div className="flex items-center gap-4">
      <div className="relative h-[112px] w-[112px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius={38} outerRadius={54} paddingAngle={3} stroke="none" startAngle={90} endAngle={-270}>
              {data.map((d, i) => (
                <Cell key={i} fill={d.fill} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="eyebrow !text-[8px]">Possession</p>
            <p className="num text-lg font-semibold text-white">{Math.round(lead.value)}%</p>
          </div>
        </div>
      </div>
      <div className="flex-1 space-y-2">
        {data.map((d) => (
          <div key={d.name} className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2 text-slate-300">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: d.fill, boxShadow: `0 0 8px ${d.fill}` }} />
              {d.name}
            </span>
            <span className="num font-medium" style={{ color: d.fill }}>
              {d.value}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Player table ────────────────────────────────────────────────────────
type SortKey = "player_id" | "team" | "max_speed" | "avg_speed" | "total_distance" | "ball_possession_pct";

export function PlayerTable({ players }: { players: PlayerStat[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("player_id");
  const [sortAsc, setSortAsc] = useState(true);

  const sorted = useMemo(
    () =>
      [...players].sort((a, b) => {
        const aVal = a[sortKey];
        const bVal = b[sortKey];
        return sortAsc ? (aVal > bVal ? 1 : -1) : aVal < bVal ? 1 : -1;
      }),
    [players, sortKey, sortAsc]
  );
  const maxSpeed = Math.max(1, ...players.map((p) => p.max_speed));

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const Th = ({ k, children, right }: { k: SortKey; children: React.ReactNode; right?: boolean }) => (
    <th
      onClick={() => handleSort(k)}
      className={`cursor-pointer select-none px-3 py-3 font-semibold transition-colors hover:text-cyan-300 ${right ? "text-right" : "text-left"} ${
        sortKey === k ? "text-cyan-300" : ""
      }`}
    >
      {children}
      {sortKey === k && (sortAsc ? " ↑" : " ↓")}
    </th>
  );

  return (
    <Panel title="Player statistics" icon={Activity} right={<span className="eyebrow">{players.length} players · click a column to sort</span>} bodyClassName="overflow-x-auto !px-0">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--line)] text-[10px] uppercase tracking-[0.12em] text-slate-500">
            <Th k="player_id">Player</Th>
            <Th k="team">Team</Th>
            <Th k="max_speed" right>Max speed</Th>
            <Th k="avg_speed" right>Avg speed</Th>
            <Th k="total_distance" right>Distance</Th>
            <Th k="ball_possession_pct" right>Ball %</Th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((p) => (
            <tr key={p.player_id} className="border-b border-white/[0.04] transition-colors hover:bg-cyan-400/[0.04]">
              <td className="num px-3 py-2.5 font-medium text-slate-100">#{p.player_id}</td>
              <td className="px-3 py-2.5">
                <span className="inline-flex items-center gap-2 text-slate-300">
                  <span className="h-3 w-3 rounded-full border border-white/20" style={{ backgroundColor: p.team_color }} />
                  Team {p.team}
                </span>
              </td>
              <td className="px-3 py-2.5 text-right">
                <div className="flex items-center justify-end gap-2.5">
                  <div className="hidden h-1 w-16 overflow-hidden rounded-full bg-white/5 sm:block">
                    <div className="h-full rounded-full bg-emerald-400" style={{ width: `${(p.max_speed / maxSpeed) * 100}%` }} />
                  </div>
                  <span className="num text-slate-200">{p.max_speed.toFixed(1)} <span className="text-slate-500">km/h</span></span>
                </div>
              </td>
              <td className="num px-3 py-2.5 text-right text-slate-300">{p.avg_speed.toFixed(1)} <span className="text-slate-500">km/h</span></td>
              <td className="num px-3 py-2.5 text-right text-slate-300">{p.total_distance.toFixed(1)} <span className="text-slate-500">m</span></td>
              <td className="num px-3 py-2.5 text-right text-slate-300">{p.ball_possession_pct.toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
      {sorted.length === 0 && <p className="py-8 text-center text-slate-500">No player data available</p>}
    </Panel>
  );
}

// ── Derived events for the right-hand "Events & alerts" panel ───────────
export interface MatchEvent {
  t: number | null;
  label: string;
  detail: string;
  color: string;
}

export function deriveEvents(a: Analytics): MatchEvent[] {
  const keys = teamKeys(a);
  const ev: MatchEvent[] = [];
  let prev: number | null = null;
  for (const pt of a.possession_timeline) {
    if (prev !== null && pt.team !== prev) {
      ev.push({
        t: pt.time_seconds,
        label: "Possession change",
        detail: `Team ${pt.team}`,
        color: teamColorFor(keys, pt.team),
      });
    }
    prev = pt.team;
  }
  const fastest = [...a.player_stats].sort((x, y) => y.max_speed - x.max_speed)[0];
  const out = ev.slice(-8).reverse();
  if (fastest) {
    out.push({ t: null, label: "High speed run", detail: `#${fastest.player_id} · ${fastest.max_speed.toFixed(1)} km/h`, color: "#34d399" });
  }
  const peak = [...a.detection_timeline].sort((x, y) => y.players - x.players)[0];
  if (peak) {
    out.push({ t: peak.time_seconds, label: "Peak detections", detail: `${peak.players} players`, color: "#22d3ee" });
  }
  return out;
}
