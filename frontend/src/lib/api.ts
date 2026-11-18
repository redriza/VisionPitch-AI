const API_BASE = "http://localhost:8000";

// Use relative URL for browser-initiated requests (video, etc.)
// so they go through Next.js rewrites and avoid CORS issues
const RELATIVE_API_BASE = "";

// ── Types ───────────────────────────────────────────────────────────────

export interface VideoMetadata {
  total_frames: number;
  fps: number;
  duration_seconds: number;
  resolution: { width: number; height: number };
}

export interface TeamPossession {
  frames: number;
  percentage: number;
}

export interface PlayerStat {
  player_id: number;
  team: number;
  team_color: string;
  max_speed: number;
  total_distance: number;
  avg_speed: number;
  frames_with_ball: number;
  frames_visible: number;
  ball_possession_pct: number;
}

export interface PossessionTimelineEntry {
  time_seconds: number;
  team: number;
}

export interface DetectionTimelineEntry {
  time_seconds: number;
  players: number;
  ball: number;
  referees: number;
}

export interface AnalyticsSummary {
  total_players_detected: number;
  total_teams: number;
}

export interface Analytics {
  video_metadata: VideoMetadata;
  team_possession: Record<string, TeamPossession>;
  player_stats: PlayerStat[];
  possession_timeline: PossessionTimelineEntry[];
  detection_timeline: DetectionTimelineEntry[];
  summary: AnalyticsSummary;
}

export interface Analysis {
  id: string;
  filename: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  stage: string;
  created_at: string;
  completed_at: string | null;
  error_message: string | null;
  video_path: string;
  output_video_path: string | null;
  analytics: Analytics | null;
}

export interface UploadResponse {
  id: string;
  filename: string;
  status: string;
  message: string;
}

// ── API Functions ───────────────────────────────────────────────────────

export async function uploadVideo(
  file: File,
  onProgress?: (pct: number) => void
): Promise<UploadResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append("file", file);

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        try {
          const err = JSON.parse(xhr.responseText);
          reject(new Error(err.detail || `Upload failed (${xhr.status})`));
        } catch {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      }
    });

    xhr.addEventListener("error", () => reject(new Error("Network error during upload")));
    xhr.addEventListener("abort", () => reject(new Error("Upload aborted")));

    xhr.open("POST", `${API_BASE}/api/upload`);
    xhr.send(formData);
  });
}

export async function getAnalyses(): Promise<Analysis[]> {
  const res = await fetch(`${API_BASE}/api/analyses`);
  if (!res.ok) throw new Error("Failed to fetch analyses");
  const data = await res.json();
  return data.analyses;
}

export async function getAnalysis(id: string): Promise<Analysis> {
  const res = await fetch(`${API_BASE}/api/analyses/${id}`);
  if (!res.ok) throw new Error("Analysis not found");
  return res.json();
}

export async function deleteAnalysis(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/analyses/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete analysis");
}

export function getVideoUrl(id: string): string {
  // Use relative URL so the request goes through Next.js rewrite proxy,
  // avoiding CORS issues with video streaming / Range requests
  return `${RELATIVE_API_BASE}/api/analyses/${id}/video`;
}
