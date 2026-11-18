# VisionPitch AI ⚽

**AI-powered football match analysis platform.** Upload a match video and get back an annotated video (players, referees and ball tracked frame by frame) together with structured analytics: team ball possession, per-player speed and distance, possession timeline and detection statistics, all viewable in a modern web dashboard.

---

## Table of Contents

1. [Features](#features)
2. [System Architecture](#system-architecture)
3. [Tech Stack](#tech-stack)
4. [Models and Algorithms](#models-and-algorithms)
5. [Project Structure](#project-structure)
6. [The AI Pipeline (stage by stage)](#the-ai-pipeline-stage-by-stage)
7. [Backend API](#backend-api)
8. [Database Schema](#database-schema)
9. [Frontend](#frontend)
10. [Installation and Setup](#installation-and-setup)
11. [Usage](#usage)
12. [Analytics Output Format](#analytics-output-format)
13. [Known Limitations](#known-limitations)
14. [Future Work](#future-work)
15. [Credits](#credits)

---

## Features

- **Object detection**: players, goalkeepers, referees and the ball using a custom-trained YOLO model.
- **Multi-object tracking**: persistent player IDs across frames using ByteTrack.
- **Team classification**: unsupervised, kit-colour based, using K-Means clustering (no labelled team data needed).
- **Ball possession**: per-frame nearest-player assignment and cumulative team possession percentage.
- **Camera-motion compensation**: Lucas-Kanade optical flow removes the effect of the panning camera.
- **Real-world measurements**: perspective transformation converts pixel positions to metres, giving speed (km/h) and distance covered (m) per player.
- **Ball interpolation**: missing ball detections are filled in with pandas interpolation.
- **Annotated output video**: ellipses under players, ID tags, ball-holder marker, possession overlay, speed and distance labels.
- **Web dashboard**: drag-and-drop upload, live processing progress, video player with HTTP Range streaming, charts and player tables.
- **Persistent history**: every analysis is stored in SQLite and can be reopened or deleted.

---

## System Architecture

```
┌────────────────────────┐   HTTP / JSON    ┌──────────────────────────────┐
│  Frontend (Next.js)    │ ───────────────► │  Backend (FastAPI)           │
│  React 19 + Tailwind   │ ◄─────────────── │  api/routes.py               │
│  Recharts dashboards   │   video (Range)  │                              │
│  localhost:3000        │                  │  ThreadPoolExecutor (1 job)  │
└────────────────────────┘                  │        │                     │
                                            │        ▼                     │
                                            │  ai_engine/pipeline.py       │
                                            │  FootballAnalysisPipeline    │
                                            │        │ imports             │
                                            │        ▼                     │
                                            │  football_analysis-main/     │
                                            │  (CV modules)                │
                                            │                              │
                                            │  SQLite (aiosqlite)          │
                                            │  uploads/  outputs/          │
                                            │  localhost:8000              │
                                            └──────────────────────────────┘
```

**Request flow**

1. The user drops a video on the dashboard. `POST /api/upload` saves it to `backend/uploads/` and inserts a row with status `pending`.
2. The job is submitted to a single-worker thread pool, so the event loop is never blocked by heavy CV work.
3. The pipeline reports progress through a callback, which writes `status`, `progress` and `stage` to SQLite.
4. The frontend polls every 3 seconds and renders the progress bar.
5. On completion, the annotated video path and the analytics JSON are stored. The dashboard fetches them and shows the video and charts.

---

## Tech Stack

### Backend / AI

| Component | Purpose |
|---|---|
| Python 3.10+ | Language |
| FastAPI + Uvicorn | REST API server |
| aiosqlite (SQLite) | Async persistence of analyses |
| python-multipart, aiofiles | File upload handling |
| Pydantic v2 | Data validation (FastAPI dependency) |
| Ultralytics (YOLO) | Object detection |
| Supervision `0.21.0` (pinned) | ByteTrack tracker and detection container |
| PyTorch + TorchVision | Deep learning backend (CUDA used automatically if available) |
| OpenCV (headless) | Video I/O, optical flow, perspective transform, drawing |
| NumPy, Pandas | Array maths, ball interpolation |
| scikit-learn | K-Means clustering for team colours |
| PyAV *(optional)* or FFmpeg | Re-encode output to browser-compatible H.264 |

### Frontend

| Component | Purpose |
|---|---|
| Next.js 16 (App Router) | Framework, routing, dev proxy |
| React 19 | UI |
| TypeScript 5 | Type safety |
| Tailwind CSS 4 | Styling |
| Recharts 3 | Charts |
| lucide-react | Icons |

---

## Models and Algorithms

| Task | Model / Algorithm | Details |
|---|---|---|
| Detection | **YOLO** (Ultralytics), custom weights `best.pt` | Fine-tuned from `yolov5x.pt`, 100 epochs, image size 640, on the Roboflow *football-players-detection* dataset. Classes: `player`, `goalkeeper`, `referee`, `ball`. Inference at `conf=0.1`, batches of 20 frames. |
| Tracking | **ByteTrack** (via `supervision`) | `track_activation_threshold=0.25`, `lost_track_buffer=30`, `minimum_matching_threshold=0.8`, `frame_rate=25`. Goalkeepers are merged into the `player` class before tracking. |
| Team classification | **K-Means** (scikit-learn), two stages | (1) Per player, cluster the pixels of the upper half of the bounding box into 2 groups and discard the background cluster (found from the 4 corner pixels). (2) Cluster all player shirt colours into 2 teams. Each track ID is classified once and cached. |
| Camera motion | **Lucas-Kanade optical flow** (`cv2.calcOpticalFlowPyrLK`) | Shi-Tomasi corners (`goodFeaturesToTrack`) from masked static regions of the frame, largest displacement taken as camera motion (threshold: 5 px). |
| Pixel → metres | **Perspective (homography) transform** | 4 manually chosen pixel vertices are mapped to a 23.32 m × 68 m rectangle with `cv2.getPerspectiveTransform`. |
| Speed / distance | Geometry | Distance between positions 5 frames apart (metres), divided by elapsed time, converted to km/h. Distance is accumulated per player. |
| Ball possession | Nearest-foot heuristic | Ball is assigned to the player whose bottom-left or bottom-right bbox corner is nearest and within 70 px. If nobody qualifies, the previous possession is carried forward. |
| Ball gaps | Linear interpolation (pandas) + back-fill | Fills frames where the ball was not detected. |

> **Model weights are not included in the repository.** See [Installation](#installation-and-setup).

---

## Project Structure

```
VisionPitch-AI/
├── backend/
│   ├── main.py                    # FastAPI app: lifespan, CORS, static /outputs mount
│   ├── requirements.txt
│   ├── api/
│   │   └── routes.py              # upload, list, detail, video stream, delete, health
│   ├── db/
│   │   └── database.py            # SQLite CRUD (aiosqlite)
│   ├── ai_engine/
│   │   └── pipeline.py            # FootballAnalysisPipeline (orchestrates all CV stages)
│   └── models/                    # ← place best.pt here (git-ignored / not shipped)
│
├── football_analysis-main/        # Core computer-vision modules
│   ├── main.py                    # Standalone CLI version of the pipeline
│   ├── yolo_inference.py          # Quick YOLO prediction test
│   ├── trackers/tracker.py        # YOLO detection + ByteTrack + drawing
│   ├── team_assigner/             # K-Means team colour classification
│   ├── player_ball_assigner/      # Ball → nearest player
│   ├── camera_movement_estimator/ # Optical-flow camera motion
│   ├── view_transformer/          # Pixel → metre perspective transform
│   ├── speed_and_distance_estimator/
│   ├── utils/                     # bbox helpers, read_video / save_video
│   ├── training/football_training_yolo_v5.ipynb   # YOLO training notebook
│   ├── development_and_analysis/color_assignement.ipynb
│   ├── stubs/                     # cached tracks / camera movement (.pkl)
│   ├── input_videos/  models/  output_videos/
│
└── frontend/
    ├── package.json  next.config.ts  tsconfig.json
    └── src/
        ├── app/
        │   ├── layout.tsx
        │   ├── page.tsx               # Dashboard (upload + analyses list)
        │   ├── globals.css
        │   └── analysis/[id]/page.tsx # Analysis detail page (polling, video, charts)
        ├── components/
        │   ├── VideoUpload.tsx        # Drag & drop upload with progress
        │   ├── AnalysisList.tsx       # Cards, status chips, delete, auto-poll
        │   ├── MatchVideoPlayer.tsx   # <video> player + HUD overlays
        │   ├── AnalyticsDashboard.tsx # Velocity, possession, detection charts, player table
        │   ├── BottomCharts.tsx       # Extra panels under the video
        │   ├── Rails.tsx              # Left / right side panels
        │   ├── Shell.tsx              # Header, logo, backend status indicator
        │   ├── Panel.tsx              # Panel / Kpi / StatRow primitives
        │   └── ProgressBar.tsx
        └── lib/api.ts                 # Typed API client
```

---

## The AI Pipeline (stage by stage)

Implemented in `backend/ai_engine/pipeline.py` (`FootballAnalysisPipeline.process_video`). Progress percentages are what the UI shows.

| # | Stage | Progress | What happens |
|---|---|---|---|
| 1 | Read video | 5% | `read_video` loads all frames with OpenCV; FPS and resolution are read. |
| 2 | Detect and track | 15% | YOLO detects objects in batches; ByteTrack assigns IDs; foot position (bottom-centre of the bbox) is stored for people, centre for the ball. |
| 3 | Camera movement | 35% | Optical flow estimates the camera shift per frame; positions are adjusted (`position_adjusted`). |
| 4 | View transform | 45% | Adjusted positions are mapped to metres (`position_transformed`); points outside the calibrated region become `None`. |
| 5 | Ball interpolation | 50% | Gaps in the ball track are filled. |
| 6 | Speed and distance | 55% | Every 5 frames: distance, speed (km/h) and running total per player. |
| 7 | Team assignment | 60% | K-Means on shirt colours from the best frame (most players visible); each track ID gets a team (1 or 2). |
| 8 | Ball possession | 70% | Closest player to the ball (< 70 px) gets `has_ball`; per-frame team control list is built. |
| 9 | Render video | 80% | Annotations drawn frame by frame and written directly to MP4; re-encoded to H.264 if needed for browser playback. |
| 10 | Analytics | 95% | Aggregates JSON (possession, per-player stats, timelines). Short-lived tracks (< ~1 s visible) are discarded as ID-switch "ghosts". |

---

## Backend API

Base URL: `http://localhost:8000`. Interactive docs: `http://localhost:8000/docs`.

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/upload` | Upload a video (`mp4, avi, mov, mkv, wmv, flv, webm`). Starts analysis, returns `{id, filename, status, message}`. |
| `GET` | `/api/analyses` | List all analyses (newest first) with parsed analytics. |
| `GET` | `/api/analyses/{id}` | Details, status, progress and analytics of one analysis. |
| `GET` | `/api/analyses/{id}/video` | Stream the annotated video. Supports HTTP `Range` (206 Partial Content) so the browser can seek. |
| `DELETE` | `/api/analyses/{id}` | Delete the DB row and the uploaded/output files. |
| `GET` | `/api/health` | Health check; reports whether `models/best.pt` exists. |

Design notes:

- Heavy processing runs in a `ThreadPoolExecutor(max_workers=1)`, so jobs are processed **one at a time** (a simple queue that protects GPU/RAM).
- The pipeline object is a **lazy singleton**, so the model is loaded once on the first job.
- A job ID is the first 8 characters of a UUID4.

---

## Database Schema

SQLite file `backend/db/football_analysis.db`, table `analyses`:

| Column | Type | Meaning |
|---|---|---|
| `id` | TEXT (PK) | Job ID |
| `filename` | TEXT | Original file name |
| `status` | TEXT | `pending` → `processing` → `completed` / `failed` |
| `progress` | INTEGER | 0–100 |
| `stage` | TEXT | Human-readable current stage |
| `created_at`, `completed_at` | TEXT | ISO-8601 UTC timestamps |
| `error_message` | TEXT | Exception + traceback if failed |
| `video_path`, `output_video_path` | TEXT | Input and annotated video paths |
| `analytics_json` | TEXT | Full analytics, stored as a JSON string |

---

## Frontend

- **Dashboard (`/`)**: upload zone, KPI cards (total / completed / in progress / players tracked), analyses grid, recent-activity feed, pipeline overview.
- **Analysis page (`/analysis/[id]`)**: polls the API every 3 s while the job is running, then shows the annotated video player, team possession, player tables and charts (Recharts area, line, bar and pie charts).
- `lib/api.ts` holds the TypeScript interfaces that mirror the backend JSON and all fetch/XHR calls. Upload uses `XMLHttpRequest` so real upload progress can be shown.
- `next.config.ts` rewrites `/api/*` to `http://localhost:8000/api/*`, so video requests (including Range requests) avoid CORS problems.

---

## Installation and Setup

### Prerequisites

- Python 3.10 or newer
- Node.js 20 or newer and npm
- (Recommended) An NVIDIA GPU with CUDA for fast inference. CPU works but is slow.
- (Recommended) FFmpeg on PATH, or `pip install av`, for browser-playable output video

### 1. Clone

```bash
git clone <your-repo-url>
cd VisionPitch-AI
```

### 2. Get the YOLO weights

Download the trained model (`best.pt`) from the link in `football_analysis-main/README.md`, or train your own using `football_analysis-main/training/football_training_yolo_v5.ipynb` (you need your own Roboflow API key).

Place it at:

```
backend/models/best.pt
```

(The `football_analysis-main/models/` folder is used only by the standalone script.)

### 3. Backend

```bash
cd backend
python -m venv venv
# Windows: venv\Scripts\activate      Linux/macOS: source venv/bin/activate
pip install -r requirements.txt
pip install av        # optional: H.264 re-encoding for browsers
python main.py        # starts on http://localhost:8000
```

Verify at `http://localhost:8000/api/health` (should report `"model_loaded": true`).

### 4. Frontend

```bash
cd frontend
npm install
npm run dev           # http://localhost:3000
```

### 5. Standalone CLI (optional, no web app)

```bash
cd football_analysis-main
# put a video in input_videos/ and best.pt in models/
python main.py        # writes output_videos/output_video.avi
```

---

## Usage

1. Open `http://localhost:3000`.
2. Drag and drop (or browse for) a football match video.
3. Watch the progress bar as each pipeline stage completes.
4. Click the finished analysis to view the annotated video and analytics.
5. Download the annotated video or delete the analysis when done.

---

## Analytics Output Format

```json
{
  "video_metadata": { "total_frames": 750, "fps": 25.0, "duration_seconds": 30.0,
                      "resolution": { "width": 1920, "height": 1080 } },
  "team_possession": { "team_1": { "frames": 410, "percentage": 54.7 },
                       "team_2": { "frames": 340, "percentage": 45.3 } },
  "player_stats": [
    { "player_id": 7, "team": 1, "team_color": "#3a5fcd",
      "max_speed": 28.4, "avg_speed": 11.2, "total_distance": 96.3,
      "frames_with_ball": 42, "frames_visible": 700, "ball_possession_pct": 6.0 }
  ],
  "possession_timeline": [ { "time_seconds": 0.0, "team": 1 } ],
  "detection_timeline":  [ { "time_seconds": 0.0, "players": 14, "ball": 1, "referees": 1 } ],
  "summary": { "total_players_detected": 14, "total_teams": 2 }
}
```

(Example values are illustrative.)

---

## Known Limitations

- **Fixed camera calibration.** The perspective-transform corner points and the optical-flow feature mask are hard-coded for the sample broadcast video. Other camera angles need re-calibration, otherwise speed and distance are not meaningful.
- **Camera compensation is approximate.** The per-frame camera shift is subtracted from positions directly rather than accumulated into a global motion.
- **Two teams only.** Referees are detected by the YOLO class; the team classifier assumes exactly two kit colours.
- **Possession is a heuristic.** Proximity of the ball to a player's feet is used; there is no pass or tackle detection.
- **Memory.** All video frames are loaded into RAM, so long or high-resolution videos need a lot of memory.
- **Overlay layout** (possession box position) assumes a 1920×1080 frame.
- **Some dashboard panels are illustrative.** Panels such as the velocity-over-time chart, overlap heatmap, pose quality and highlight card use placeholder/derived values and are not produced by the CV pipeline.
- **No authentication**, wildcard CORS and a single-worker queue: suitable for local or demo use, not production.

---

## Future Work

- Automatic pitch keypoint detection for calibration-free homography
- Pass, shot and event detection; heatmaps; formation analysis
- Re-identification to reduce ID switches after occlusion
- Streaming/chunked video processing to reduce memory
- Authentication, job queue (Celery/Redis) and cloud deployment

---

## Credits

- Computer-vision core adapted from an open-source football analysis tutorial project (YOLO + ByteTrack + K-Means + optical flow).
- Dataset: Roboflow *football-players-detection*.
- Built with Ultralytics YOLO, Supervision, OpenCV, FastAPI, Next.js and Recharts.
