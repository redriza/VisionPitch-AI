"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Analysis, getAnalysis, getVideoUrl } from "@/lib/api";
import { MatchHeader } from "@/components/Shell";
import { MatchLeftRail, MatchRightRail } from "@/components/Rails";
import { MatchBottomCharts } from "@/components/BottomCharts";
import { MatchVideoPlayer } from "@/components/MatchVideoPlayer";
import ProgressBar from "@/components/ProgressBar";
import { STATUS_CONFIG } from "@/components/AnalysisList";
import { Panel, Kpi } from "@/components/Panel";
import { AlertTriangle } from "lucide-react";

function Spinner() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-cyan-300" />
    </div>
  );
}

function AnalysisPageInner() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalysis = useCallback(async () => {
    try {
      const data = await getAnalysis(id);
      setAnalysis(data);
      setError(null);
    } catch {
      setError("Analysis not found");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchAnalysis();
  }, [fetchAnalysis]);

  // Auto-poll while processing
  useEffect(() => {
    if (!analysis) return;
    if (analysis.status !== "pending" && analysis.status !== "processing") return;

    const interval = setInterval(fetchAnalysis, 3000);
    return () => clearInterval(interval);
  }, [analysis, fetchAnalysis]);

  if (loading) return <Spinner />;

  if (error || !analysis) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-lg text-rose-400">{error || "Something went wrong"}</p>
        <button onClick={() => router.push("/")} className="btn">
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </button>
      </div>
    );
  }

  const cfg = STATUS_CONFIG[analysis.status];
  const a = analysis.analytics;
  const inProgress = analysis.status === "processing" || analysis.status === "pending";
  const isLive = inProgress;

  return (
    <main className="min-h-screen flex flex-col">
      {/* ── Match Header ──────────────────────────────── */}
      <MatchHeader
        filename={analysis.filename}
        analytics={a}
        statusColor={cfg.color}
        statusLabel={cfg.label}
        isLive={isLive}
      />

      {/* ── Main 3-column layout ──────────────────────── */}
      <div className="flex-1 mx-auto w-full max-w-[1920px] px-2 py-2 sm:px-3">
        <div className="grid gap-2 xl:grid-cols-[240px_minmax(0,1fr)_280px]">
          {/* ── Left sidebar: Solution Layers ──────────── */}
          <aside className="order-2 space-y-2 xl:order-1 overflow-y-auto max-h-[calc(100vh-64px)] scrollbar-thin pr-1">
            <MatchLeftRail analysis={analysis} />
          </aside>

          {/* ── Centre: Video + Bottom Charts ──────────── */}
          <div className="order-1 min-w-0 space-y-2 xl:order-2">
            {/* Status / progress for pending/failed */}
            {(inProgress || analysis.status === "failed") && (
              <Panel className="relative overflow-hidden" bodyClassName="!pt-5">
                <div className="flex items-center gap-3">
                  <span
                    className="grid h-10 w-10 place-items-center rounded-xl"
                    style={{ background: `${cfg.color}1a`, color: cfg.color }}
                  >
                    <cfg.icon
                      className={`h-5 w-5 ${analysis.status === "processing" ? "animate-spin" : ""}`}
                    />
                  </span>
                  <div>
                    <p className="font-semibold" style={{ color: cfg.color }}>
                      {cfg.label}
                    </p>
                    {analysis.stage && (
                      <p className="text-xs text-slate-400">{analysis.stage}</p>
                    )}
                  </div>
                </div>
                {inProgress && (
                  <ProgressBar
                    progress={analysis.progress}
                    stage={analysis.stage}
                    className="mt-5"
                  />
                )}
                {analysis.status === "failed" && analysis.error_message && (
                  <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/[0.07] p-4">
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium text-rose-400">
                      <AlertTriangle className="h-4 w-4" />
                      Error details
                    </div>
                    <pre className="num max-h-48 overflow-auto whitespace-pre-wrap text-xs text-rose-300/80">
                      {analysis.error_message}
                    </pre>
                  </div>
                )}
              </Panel>
            )}

            {/* Video player with HUD overlay */}
            {analysis.status === "completed" && (
              <MatchVideoPlayer analysis={analysis} />
            )}

            {/* Bottom charts row */}
            {analysis.status === "completed" && a && (
              <MatchBottomCharts analytics={a} analysisId={analysis.id} />
            )}
          </div>

          {/* ── Right sidebar: Live Data, Events, Metrics ─ */}
          <aside className="order-3 space-y-2 overflow-y-auto max-h-[calc(100vh-64px)] scrollbar-thin pl-1">
            <MatchRightRail analysis={analysis} />
          </aside>
        </div>
      </div>
    </main>
  );
}

export default function AnalysisPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <AnalysisPageInner />
    </Suspense>
  );
}
