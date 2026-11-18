"use client";

import { useState } from "react";
import { AlertTriangle, RefreshCw, Download, ScanEye } from "lucide-react";
import { Analysis, getVideoUrl } from "@/lib/api";
import { TEAM_COLORS, teamKeys } from "./AnalyticsDashboard";

interface MatchVideoPlayerProps {
  analysis: Analysis;
}

export function MatchVideoPlayer({ analysis }: MatchVideoPlayerProps) {
  const [videoError, setVideoError] = useState<string | null>(null);
  const [videoKey, setVideoKey] = useState(0);
  const a = analysis.analytics;
  const keys = a ? teamKeys(a) : [];

  const handleVideoError = () =>
    setVideoError(
      "Failed to load or play the video. The video format may not be supported by your browser."
    );
  const retryVideo = () => {
    setVideoError(null);
    setVideoKey((k) => k + 1);
  };

  return (
    <section className="panel overflow-hidden">
      <div className="relative bg-black">
        {videoError ? (
          <div className="flex flex-col items-center justify-center px-4 py-20 text-center">
            <AlertTriangle className="mb-3 h-10 w-10 text-amber-400" />
            <p className="mb-1 text-slate-200">Video playback error</p>
            <p className="mb-4 max-w-md text-sm text-slate-500">
              {videoError}
            </p>
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
              className="block max-h-[60vh] w-full"
              onError={handleVideoError}
            >
              <source src={getVideoUrl(analysis.id)} type="video/mp4" />
              Your browser does not support the video tag.
            </video>

            {/* HUD: AI Tracking overlay */}
            <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2 rounded-lg border border-emerald-400/30 bg-black/60 px-2.5 py-1.5 text-xs backdrop-blur-md">
              <ScanEye className="h-3.5 w-3.5 text-emerald-300" />
              <span className="text-slate-300">AI Tracking:</span>
              <span className="font-semibold text-emerald-300">ON</span>
            </div>

            {/* HUD: Resolution + FPS */}
            {a && (
              <div className="num pointer-events-none absolute right-3 top-3 rounded-lg border border-cyan-400/25 bg-black/60 px-2.5 py-1.5 text-[11px] text-cyan-200 backdrop-blur-md">
                {a.video_metadata.resolution.width}×
                {a.video_metadata.resolution.height} · {a.video_metadata.fps}{" "}
                FPS
              </div>
            )}

            {/* HUD: Field Calibration label */}
            <div className="pointer-events-none absolute left-3 bottom-14 text-[11px] text-slate-300 bg-black/40 px-2 py-1 rounded backdrop-blur-sm">
              <div className="flex items-center gap-1.5">
                <svg
                  viewBox="0 0 12 12"
                  className="h-3 w-3 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <line x1="6" y1="0" x2="6" y2="12" />
                  <line x1="0" y1="6" x2="12" y2="6" />
                </svg>
                Field Calibration
              </div>
              <div className="mt-0.5 text-[10px] text-slate-500">
                105m x 68m
              </div>
            </div>

            {/* HUD corner brackets */}
            <div className="hud-corners" />
          </>
        )}
      </div>

      {/* Legend bar */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-[var(--line)] bg-black/20 px-3 py-2.5 text-[11px] text-slate-300">
        {keys.map((k, i) => {
          const num = k.replace("team_", "");
          return (
            <span key={k} className="flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-sm"
                style={{
                  background: TEAM_COLORS[i % 2],
                  boxShadow: `0 0 8px ${TEAM_COLORS[i % 2]}`,
                }}
              />
              {i === 0 ? "City United" : "River Town"}
            </span>
          );
        })}
        {keys.length === 0 && (
          <>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-blue-500 shadow-[0_0_8px_#3b82f6]" />
              City United
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-orange-500 shadow-[0_0_8px_#f97316]" />
              River Town
            </span>
          </>
        )}
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
          Ball
        </span>
        <span className="flex items-center gap-1.5">
          <svg viewBox="0 0 20 6" className="h-1.5 w-4">
            <line
              x1="0"
              y1="3"
              x2="20"
              y2="3"
              stroke="#22d3ee"
              strokeWidth="2"
              strokeDasharray="3,3"
            />
          </svg>
          Pass
        </span>
        <span className="flex items-center gap-1.5">
          <svg viewBox="0 0 20 6" className="h-1.5 w-4">
            <line
              x1="0"
              y1="3"
              x2="14"
              y2="3"
              stroke="#34d399"
              strokeWidth="2"
            />
            <polygon points="14,0 20,3 14,6" fill="#34d399" />
          </svg>
          Shot
        </span>
        <span className="flex items-center gap-1.5">
          <svg viewBox="0 0 20 6" className="h-1.5 w-4">
            <path
              d="M0 3 Q5 0 10 3 T20 3"
              fill="none"
              stroke="#a78bfa"
              strokeWidth="1.5"
            />
          </svg>
          Player Trail
        </span>
        <span className="flex items-center gap-1.5">
          <svg viewBox="0 0 20 6" className="h-1.5 w-4">
            <line
              x1="0"
              y1="3"
              x2="20"
              y2="3"
              stroke="#f43f5e"
              strokeWidth="2"
            />
            <circle cx="4" cy="3" r="2" fill="#f43f5e" />
          </svg>
          Defensive Line
        </span>
        <a
          href={getVideoUrl(analysis.id)}
          download={`analysis_${analysis.id}.mp4`}
          className="btn ml-auto !px-2.5 !py-1 !text-[11px]"
        >
          <Download className="h-3 w-3" />
          Download
        </a>
      </div>
    </section>
  );
}
