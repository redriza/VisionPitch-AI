"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Clock, Loader2, CheckCircle2, XCircle, Film, Users, Timer, ArrowUpRight } from "lucide-react";
import { Analysis, getAnalyses, deleteAnalysis } from "@/lib/api";
import ProgressBar from "./ProgressBar";

interface AnalysisListProps {
  refreshKey?: number;
  onData?: (analyses: Analysis[]) => void;
}

export const STATUS_CONFIG = {
  pending: { label: "Pending", color: "#facc15", icon: Clock },
  processing: { label: "Processing", color: "#38bdf8", icon: Loader2 },
  completed: { label: "Completed", color: "#34d399", icon: CheckCircle2 },
  failed: { label: "Failed", color: "#f43f5e", icon: XCircle },
} as const;

export default function AnalysisList({ refreshKey, onData }: AnalysisListProps) {
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchAnalyses = useCallback(async () => {
    try {
      const data = await getAnalyses();
      setAnalyses(data);
      onData?.(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [onData]);

  useEffect(() => {
    fetchAnalyses();
  }, [fetchAnalyses, refreshKey]);

  // Auto-poll while any analysis is in-progress
  useEffect(() => {
    const hasActive = analyses.some((a) => a.status === "pending" || a.status === "processing");
    if (!hasActive) return;

    const interval = setInterval(fetchAnalyses, 3000);
    return () => clearInterval(interval);
  }, [analyses, fetchAnalyses]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Delete this analysis? This cannot be undone.")) return;
    try {
      await deleteAnalysis(id);
      setAnalyses((prev) => {
        const next = prev.filter((a) => a.id !== id);
        onData?.(next);
        return next;
      });
    } catch {
      // silent
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  if (loading) {
    return (
      <div className="panel flex items-center justify-center py-20 text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-cyan-300" />
        Loading analyses…
      </div>
    );
  }

  if (analyses.length === 0) {
    return (
      <div className="panel py-16 text-center">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-white/10 bg-white/[0.03]">
          <Film className="h-7 w-7 text-slate-500" />
        </div>
        <p className="text-lg text-slate-300">No analyses yet</p>
        <p className="mt-1 text-sm text-slate-500">Upload a football match video to get started</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
      {analyses.map((analysis) => {
        const cfg = STATUS_CONFIG[analysis.status];
        const Icon = cfg.icon;
        return (
          <div
            key={analysis.id}
            onClick={() => router.push(`/analysis/${analysis.id}`)}
            className="panel panel-hover group relative cursor-pointer overflow-hidden p-5"
          >
            <span
              className="absolute inset-y-0 left-0 w-[3px]"
              style={{ background: cfg.color, boxShadow: `0 0 16px ${cfg.color}` }}
            />
            <div className="mb-3 flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-semibold text-slate-100">{analysis.filename}</h3>
                <p className="mt-0.5 text-xs text-slate-500">{formatDate(analysis.created_at)}</p>
              </div>
              <button
                onClick={(e) => handleDelete(e, analysis.id)}
                className="rounded-lg p-1.5 text-slate-500 opacity-0 transition-all hover:bg-rose-500/15 hover:text-rose-400 group-hover:opacity-100"
                title="Delete analysis"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-3 flex items-center gap-2">
              <span
                className="chip"
                style={{ color: cfg.color, background: `${cfg.color}18`, borderColor: `${cfg.color}40` }}
              >
                <Icon className={`h-3 w-3 ${analysis.status === "processing" ? "animate-spin" : ""}`} />
                {cfg.label}
              </span>
              <span className="num text-[11px] text-slate-600">#{analysis.id}</span>
            </div>

            {(analysis.status === "processing" || analysis.status === "pending") && (
              <ProgressBar progress={analysis.progress} stage={analysis.stage} className="mt-2" />
            )}

            {analysis.status === "completed" && analysis.analytics && (
              <div className="mt-2 flex items-center gap-4 text-xs text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-cyan-300" />
                  <span className="num text-slate-200">{analysis.analytics.summary.total_players_detected}</span> players
                </span>
                <span className="flex items-center gap-1.5">
                  <Timer className="h-3.5 w-3.5 text-cyan-300" />
                  <span className="num text-slate-200">
                    {analysis.analytics.video_metadata.duration_seconds.toFixed(1)}s
                  </span>
                </span>
                <ArrowUpRight className="ml-auto h-4 w-4 text-slate-600 transition-colors group-hover:text-cyan-300" />
              </div>
            )}

            {analysis.status === "failed" && analysis.error_message && (
              <p className="mt-2 truncate text-xs text-rose-400/80">{analysis.error_message.split("\n")[0]}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
