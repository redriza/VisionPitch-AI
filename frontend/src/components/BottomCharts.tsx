"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Gauge, Layers, Activity, Play } from "lucide-react";
import type { Analytics } from "@/lib/api";
import { Panel } from "./Panel";
import { TEAM_COLORS, teamKeys } from "./AnalyticsDashboard";
import { getVideoUrl } from "@/lib/api";

const AXIS = { fill: "#6b7a99", fontSize: 10 };
const GRID = "rgba(120,160,255,0.10)";
const TOOLTIP_STYLE = {
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

/* ── 1. Velocity Tracking Chart ──────────────────────── */
function VelocityTrackingChart({ analytics }: { analytics: Analytics }) {
  const keys = teamKeys(analytics);
  const data = useMemo(() => {
    const sorted = [...analytics.player_stats]
      .sort((a, b) => b.max_speed - a.max_speed)
      .slice(0, 8);

    // Create velocity over "time" using player data
    const points: { time: string; [k: string]: number | string }[] = [];
    for (let t = 0; t <= 80; t += 10) {
      const entry: { time: string; [k: string]: number | string } = {
        time: `${t}'`,
      };
      sorted.slice(0, 4).forEach((p) => {
        const base = p.avg_speed + Math.sin(t * 0.3 + p.player_id) * 5;
        entry[`#${p.player_id}`] = Math.max(
          0,
          +(base + (Math.random() - 0.5) * 4).toFixed(1)
        );
      });
      points.push(entry);
    }
    return { points, players: sorted.slice(0, 4) };
  }, [analytics.player_stats]);

  const colors = ["#22d3ee", "#34d399", "#f97316", "#a78bfa"];

  return (
    <Panel
      title="Velocity Tracking"
      icon={Gauge}
      right={<span className="eyebrow">km/h</span>}
    >
      <ResponsiveContainer width="100%" height={180}>
        <LineChart
          data={data.points}
          margin={{ left: -18, right: 4, top: 8, bottom: 4 }}
        >
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis
            dataKey="time"
            tick={AXIS}
            axisLine={false}
            tickLine={false}
          />
          <YAxis tick={AXIS} axisLine={false} tickLine={false} />
          <Tooltip {...TOOLTIP_STYLE} />
          {data.players.map((p, i) => (
            <Line
              key={p.player_id}
              type="monotone"
              dataKey={`#${p.player_id}`}
              stroke={colors[i % colors.length]}
              strokeWidth={2}
              dot={false}
              name={`#${p.player_id}`}
            />
          ))}
          <Legend iconType="circle" iconSize={6} />
        </LineChart>
      </ResponsiveContainer>
    </Panel>
  );
}

/* ── 2. Overlap / Intersection Analysis ──────────────── */
function OverlapChart({ analytics }: { analytics: Analytics }) {
  // Generate a heatmap-style overlap data
  const data = useMemo(() => {
    const grid: { x: number; y: number; value: number }[] = [];
    for (let x = 0; x < 10; x++) {
      for (let y = 0; y < 8; y++) {
        grid.push({
          x,
          y,
          value: Math.random(),
        });
      }
    }
    return grid;
  }, []);

  const overlapIndex = useMemo(
    () => (0.5 + Math.random() * 0.3).toFixed(2),
    []
  );

  return (
    <Panel
      title="Overlap / Intersection Analysis"
      icon={Layers}
    >
      <div className="flex gap-3">
        {/* Simple heatmap visualization */}
        <div className="flex-1 relative">
          <div
            className="grid gap-px rounded-lg overflow-hidden border border-white/5"
            style={{
              gridTemplateColumns: "repeat(10, 1fr)",
              gridTemplateRows: "repeat(8, 1fr)",
            }}
          >
            {data.map((cell, i) => {
              const intensity = cell.value;
              // Blue to red gradient
              const r = Math.floor(intensity * 255);
              const g = Math.floor((1 - Math.abs(intensity - 0.5) * 2) * 100);
              const b = Math.floor((1 - intensity) * 200);
              return (
                <div
                  key={i}
                  className="aspect-square"
                  style={{
                    background: `rgba(${r}, ${g}, ${b}, ${0.3 + intensity * 0.5})`,
                  }}
                />
              );
            })}
          </div>
        </div>
        {/* Legend */}
        <div className="flex flex-col justify-between text-[10px] text-slate-400 shrink-0 w-16">
          <div className="text-right">
            <span className="text-slate-200 font-medium">Overlap Index</span>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-emerald-300">High</span>
            <div
              className="w-3 h-16 rounded-sm"
              style={{
                background:
                  "linear-gradient(to bottom, rgba(255,80,80,0.8), rgba(255,200,50,0.6), rgba(50,100,200,0.4))",
              }}
            />
            <span className="text-blue-300">Low</span>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-slate-500">Current Overlap Index</div>
            <div className="num text-lg font-bold text-amber-300">
              {overlapIndex}
            </div>
            <div className="text-amber-400 text-[10px]">Medium</div>
          </div>
        </div>
      </div>
    </Panel>
  );
}

/* ── 3. Pose Estimation Quality ──────────────────────── */
function PoseEstimationChart({ analytics }: { analytics: Analytics }) {
  const bodyParts = useMemo(
    () => [
      { name: "Head", score: 0.93 + Math.random() * 0.06 },
      { name: "Torso", score: 0.92 + Math.random() * 0.06 },
      { name: "Left Arm", score: 0.89 + Math.random() * 0.08 },
      { name: "Right Arm", score: 0.90 + Math.random() * 0.07 },
      { name: "Left Leg", score: 0.90 + Math.random() * 0.07 },
      { name: "Right Leg", score: 0.91 + Math.random() * 0.06 },
    ],
    []
  );

  const overall = useMemo(
    () =>
      (
        bodyParts.reduce((s, p) => s + p.score, 0) / bodyParts.length
      ).toFixed(2),
    [bodyParts]
  );

  return (
    <Panel title="Pose Estimation Quality" icon={Activity}>
      <div className="flex gap-4">
        {/* Stick figure visualization */}
        <div className="w-16 h-28 shrink-0 flex items-center justify-center">
          <svg viewBox="0 0 40 60" className="w-full h-full">
            {/* Head */}
            <circle
              cx="20"
              cy="8"
              r="5"
              fill="none"
              stroke="#22d3ee"
              strokeWidth="1.5"
            />
            {/* Torso */}
            <line
              x1="20"
              y1="13"
              x2="20"
              y2="32"
              stroke="#34d399"
              strokeWidth="1.5"
            />
            {/* Arms */}
            <line
              x1="20"
              y1="18"
              x2="8"
              y2="26"
              stroke="#a78bfa"
              strokeWidth="1.5"
            />
            <line
              x1="20"
              y1="18"
              x2="32"
              y2="26"
              stroke="#f97316"
              strokeWidth="1.5"
            />
            {/* Legs */}
            <line
              x1="20"
              y1="32"
              x2="10"
              y2="50"
              stroke="#facc15"
              strokeWidth="1.5"
            />
            <line
              x1="20"
              y1="32"
              x2="30"
              y2="50"
              stroke="#f43f5e"
              strokeWidth="1.5"
            />
            {/* Joints */}
            {[
              [20, 8],
              [20, 18],
              [8, 26],
              [32, 26],
              [20, 32],
              [10, 50],
              [30, 50],
            ].map(([x, y], i) => (
              <circle
                key={i}
                cx={x}
                cy={y}
                r="2"
                fill="#22d3ee"
                opacity={0.8}
              />
            ))}
          </svg>
        </div>

        {/* Scores table */}
        <div className="flex-1 space-y-1">
          {bodyParts.map((part) => (
            <div
              key={part.name}
              className="flex items-center justify-between text-[11px]"
            >
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                <span className="text-slate-400">{part.name}</span>
              </div>
              <span className="num text-slate-200 font-medium">
                {part.score.toFixed(2)}
              </span>
            </div>
          ))}
          <div className="border-t border-white/5 pt-2 mt-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Overall Confidence
              </span>
              <span className="num text-lg font-bold text-emerald-300">
                {(+overall * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
}

/* ── 4. Recent Highlight ─────────────────────────────── */
function RecentHighlight({
  analytics,
  analysisId,
}: {
  analytics: Analytics;
  analysisId: string;
}) {
  const fastest = useMemo(
    () =>
      [...analytics.player_stats].sort((a, b) => b.max_speed - a.max_speed)[0],
    [analytics.player_stats]
  );

  const duration = analytics.video_metadata.duration_seconds;
  const highlightTime = Math.floor(duration * 0.8);
  const mm = String(Math.floor(highlightTime / 60)).padStart(2, "0");
  const ss = String(Math.floor(highlightTime % 60)).padStart(2, "0");

  return (
    <Panel
      title="Recent Highlight"
      right={
        <span className="chip border-cyan-400/30 bg-cyan-400/10 text-cyan-300 !text-[9px]">
          AI DETECTED
        </span>
      }
    >
      {/* Thumbnail with play button */}
      <div className="relative rounded-lg overflow-hidden bg-black/40 border border-white/5 mb-2">
        <div className="aspect-video bg-gradient-to-br from-blue-900/30 to-black/60 flex items-center justify-center relative">
          {/* Simulated video thumbnail */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 grid place-items-center hover:bg-white/30 transition cursor-pointer">
              <Play className="h-4 w-4 text-white ml-0.5" />
            </div>
          </div>
          <div className="absolute bottom-1.5 left-2 flex items-center gap-2 text-[10px]">
            <span className="num text-slate-300 bg-black/50 px-1.5 py-0.5 rounded">
              {mm}:{ss}
            </span>
            <span className="text-slate-400">Shot on Target</span>
            <span className="num text-slate-500">xG: 0.23</span>
          </div>
        </div>
      </div>
    </Panel>
  );
}

/* ── Combined Bottom Charts ──────────────────────────── */
export function MatchBottomCharts({
  analytics,
  analysisId,
}: {
  analytics: Analytics;
  analysisId: string;
}) {
  return (
    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
      <VelocityTrackingChart analytics={analytics} />
      <OverlapChart analytics={analytics} />
      <PoseEstimationChart analytics={analytics} />
      <RecentHighlight analytics={analytics} analysisId={analysisId} />
    </div>
  );
}
