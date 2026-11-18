"""
Football Analysis AI Pipeline.

Wraps the existing football_analysis-main code into a reusable pipeline
that can be called from the FastAPI backend.
"""

import os
import sys
import cv2
import json
import uuid
import numpy as np
import traceback
from pathlib import Path
from typing import Dict, Any, Optional, Callable

# Add the original project to the Python path
ORIGINAL_PROJECT_DIR = str(Path(__file__).resolve().parent.parent.parent / "football_analysis-main")
if ORIGINAL_PROJECT_DIR not in sys.path:
    sys.path.insert(0, ORIGINAL_PROJECT_DIR)

from utils import read_video, save_video
from trackers import Tracker
from team_assigner import TeamAssigner
from player_ball_assigner import PlayerBallAssigner
from camera_movement_estimator import CameraMovementEstimator
from view_transformer import ViewTransformer
from speed_and_distance_estimator import SpeedAndDistance_Estimator


class FootballAnalysisPipeline:
    """
    End-to-end football analysis pipeline.
    
    Processes a video through detection, tracking, team assignment,
    camera movement estimation, speed/distance calculation, and
    ball possession estimation. Outputs an annotated video and
    structured JSON analytics.
    """

    def __init__(self, model_path: str = None):
        if model_path is None:
            model_path = str(Path(__file__).resolve().parent.parent / "models" / "best.pt")
        
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model weights not found at: {model_path}")
        
        self.model_path = model_path
        self.tracker = None  # Lazy-loaded

    def _ensure_tracker(self):
        """Lazy-load the tracker/model to avoid loading at import time."""
        if self.tracker is None:
            self.tracker = Tracker(self.model_path)

    def process_video(
        self,
        input_video_path: str,
        output_dir: str,
        job_id: str,
        progress_callback: Optional[Callable[[str, int], None]] = None,
    ) -> Dict[str, Any]:
        """
        Run the full analysis pipeline on a video.

        Args:
            input_video_path: Path to the input video file.
            output_dir: Directory to write output files.
            job_id: Unique job identifier.
            progress_callback: Optional callback(stage_name, percent).

        Returns:
            Dictionary with paths to outputs and analytics data.
        """
        self._ensure_tracker()

        def _progress(stage: str, pct: int):
            if progress_callback:
                progress_callback(stage, pct)

        os.makedirs(output_dir, exist_ok=True)

        # ── Stage 1: Read video ─────────────────────────────────────────
        _progress("Reading video", 5)
        video_frames = read_video(input_video_path)
        total_frames = len(video_frames)
        if total_frames == 0:
            raise ValueError("No frames could be read from the video.")

        # Get video metadata
        cap = cv2.VideoCapture(input_video_path)
        fps = cap.get(cv2.CAP_PROP_FPS) or 24
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        cap.release()

        # ── Stage 2: Object detection & tracking ────────────────────────
        _progress("Detecting and tracking objects", 15)
        tracks = self.tracker.get_object_tracks(
            video_frames,
            read_from_stub=False,
            stub_path=None,
        )
        self.tracker.add_position_to_tracks(tracks)

        # ── Stage 3: Camera movement estimation ─────────────────────────
        _progress("Estimating camera movement", 35)
        camera_movement_estimator = CameraMovementEstimator(video_frames[0])
        camera_movement_per_frame = camera_movement_estimator.get_camera_movement(
            video_frames,
            read_from_stub=False,
            stub_path=None,
        )
        camera_movement_estimator.add_adjust_positions_to_tracks(tracks, camera_movement_per_frame)

        # ── Stage 4: View transformation ────────────────────────────────
        _progress("Applying view transformation", 45)
        view_transformer = ViewTransformer()
        view_transformer.add_transformed_position_to_tracks(tracks)

        # ── Stage 5: Ball interpolation ─────────────────────────────────
        _progress("Interpolating ball positions", 50)
        tracks["ball"] = self.tracker.interpolate_ball_positions(tracks["ball"])

        # ── Stage 6: Speed & distance estimation ────────────────────────
        _progress("Calculating speed and distance", 55)
        speed_and_distance_estimator = SpeedAndDistance_Estimator()
        speed_and_distance_estimator.add_speed_and_distance_to_tracks(tracks)

        # ── Stage 7: Team assignment ────────────────────────────────────
        _progress("Assigning teams", 60)
        team_assigner = TeamAssigner()

        # Find a frame with at least 2 players for reliable team color clustering
        best_frame_idx = 0
        best_player_count = len(tracks["players"][0]) if tracks["players"] else 0
        for fi, pt in enumerate(tracks["players"]):
            if len(pt) >= 2:
                if len(pt) > best_player_count:
                    best_player_count = len(pt)
                    best_frame_idx = fi
                if best_player_count >= 4:
                    break  # Good enough

        team_assigner.assign_team_color(video_frames[best_frame_idx], tracks["players"][best_frame_idx])

        for frame_num, player_track in enumerate(tracks["players"]):
            for player_id, track in player_track.items():
                team = team_assigner.get_player_team(
                    video_frames[frame_num], track["bbox"], player_id
                )
                tracks["players"][frame_num][player_id]["team"] = team
                tracks["players"][frame_num][player_id]["team_color"] = team_assigner.team_colors[team]

        # ── Stage 8: Ball possession ────────────────────────────────────
        _progress("Calculating ball possession", 70)
        player_assigner = PlayerBallAssigner()
        team_ball_control = []
        for frame_num, player_track in enumerate(tracks["players"]):
            ball_data = tracks["ball"][frame_num].get(1, {})
            ball_bbox = ball_data.get("bbox", None)

            assigned_player = -1
            if ball_bbox and player_track:
                assigned_player = player_assigner.assign_ball_to_player(player_track, ball_bbox)

            if assigned_player != -1:
                tracks["players"][frame_num][assigned_player]["has_ball"] = True
                team_ball_control.append(tracks["players"][frame_num][assigned_player]["team"])
            else:
                if team_ball_control:
                    team_ball_control.append(team_ball_control[-1])
                else:
                    team_ball_control.append(1)
        team_ball_control_np = np.array(team_ball_control)

        # ── Stage 9: Draw annotations & save video (frame-by-frame) ────
        _progress("Generating annotated video", 80)
        mp4_path = os.path.join(output_dir, f"{job_id}_output.mp4")
        self._draw_and_save_video(
            video_frames, tracks, team_ball_control_np,
            camera_movement_per_frame, camera_movement_estimator,
            speed_and_distance_estimator, mp4_path, fps, width, height,
        )

        # Free original frames from memory
        del video_frames

        _progress("Video saved", 90)

        # ── Stage 10: Extract analytics ─────────────────────────────────
        _progress("Extracting analytics", 95)
        analytics = self._extract_analytics(
            tracks, team_ball_control, total_frames, fps, width, height
        )

        # Save analytics JSON
        analytics_path = os.path.join(output_dir, f"{job_id}_analytics.json")
        with open(analytics_path, "w") as f:
            json.dump(analytics, f, indent=2, default=str)

        _progress("Complete", 100)

        return {
            "output_video_path": mp4_path,
            "analytics_path": analytics_path,
            "analytics": analytics,
        }

    def _draw_and_save_video(
        self,
        video_frames,
        tracks,
        team_ball_control,
        camera_movement_per_frame,
        camera_movement_estimator,
        speed_and_distance_estimator,
        mp4_path,
        fps,
        width,
        height,
    ):
        """Draw annotations on frames and save directly to MP4 (frame-by-frame to save memory)."""
        # Set up the video writer
        h, w = height, width
        codecs_to_try = ["avc1", "H264", "X264", "mp4v"]
        out = None
        for codec in codecs_to_try:
            fourcc = cv2.VideoWriter_fourcc(*codec)
            out = cv2.VideoWriter(mp4_path, fourcc, fps, (w, h))
            if out.isOpened():
                break
            out = None

        if out is None:
            fourcc = cv2.VideoWriter_fourcc(*"mp4v")
            out = cv2.VideoWriter(mp4_path, fourcc, fps, (w, h))

        if not out.isOpened():
            return

        # Iterate through the tracker's draw_annotations generator one frame at a time
        for frame_num, frame in enumerate(self.tracker.draw_annotations(video_frames, tracks, team_ball_control)):
            # Overlay camera movement info
            try:
                frame = camera_movement_estimator.draw_camera_movement(
                    frame, frame_num, camera_movement_per_frame
                )
            except Exception:
                pass  # Camera movement overlay is optional

            # Overlay speed and distance info
            try:
                speed_and_distance_estimator.draw_speed_and_distance(frame, frame_num, tracks)
            except Exception:
                pass  # Speed overlay is optional

            out.write(frame)

        out.release()

        # Re-encode for browser compatibility if needed
        self._ensure_browser_compatible(mp4_path, fps, w, h)

    def _ensure_browser_compatible(self, mp4_path, fps, w, h):
        """
        Check if the written MP4 uses a browser-compatible codec (H.264).
        If not, re-encode it from disk using ffmpeg/pyav (no frames in memory).
        """
        try:
            # Quick check: read back the fourcc to see if it's H.264
            cap = cv2.VideoCapture(mp4_path)
            fourcc_int = int(cap.get(cv2.CAP_PROP_FOURCC))
            cap.release()
            codec_tag = (
                chr(fourcc_int & 0xFF)
                + chr((fourcc_int >> 8) & 0xFF)
                + chr((fourcc_int >> 16) & 0xFF)
                + chr((fourcc_int >> 24) & 0xFF)
            ).strip('\x00').lower()

            # H.264 tags: 'avc1', 'h264', 'x264'
            if codec_tag in ("avc1", "h264", "x264"):
                return  # Already browser-compatible

            # Try re-encoding with pyav (reads from file, no frame list needed)
            try:
                import av
                tmp_path = mp4_path + ".tmp.mp4"
                in_container = av.open(mp4_path)
                out_container = av.open(tmp_path, mode="w", options={"movflags": "faststart"})
                in_stream = in_container.streams.video[0]
                out_stream = out_container.add_stream("h264", rate=fps)
                out_stream.width = in_stream.width
                out_stream.height = in_stream.height
                out_stream.pix_fmt = "yuv420p"
                for packet in in_container.demux(in_stream):
                    for frame in packet.decode():
                        for p in out_stream.encode(frame):
                            out_container.mux(p)
                for p in out_stream.encode():
                    out_container.mux(p)
                out_container.close()
                in_container.close()
                os.replace(tmp_path, mp4_path)
                return
            except ImportError:
                pass  # pyav not available, try ffmpeg subprocess

            # Fallback: subprocess ffmpeg
            import subprocess, shutil
            ffmpeg_path = shutil.which("ffmpeg")
            if ffmpeg_path:
                tmp_path = mp4_path + ".tmp.mp4"
                subprocess.run(
                    [ffmpeg_path, "-y", "-i", mp4_path,
                     "-c:v", "libx264", "-preset", "fast",
                     "-crf", "23", "-pix_fmt", "yuv420p",
                     "-movflags", "+faststart", tmp_path],
                    check=True, capture_output=True,
                )
                os.replace(tmp_path, mp4_path)
            else:
                import logging
                logging.warning(
                    "ffmpeg not found on PATH. Output video may not play in browsers "
                    "(encoded with mp4v instead of H.264). Install 'av' package "
                    "or install ffmpeg to fix this."
                )
        except Exception as e:
            import logging
            logging.error(f"Failed to re-encode video to H.264: {e}")

    def _convert_avi_to_mp4(self, avi_path: str, mp4_path: str, fps: float):
        """Convert AVI to MP4 using OpenCV for browser compatibility."""
        cap = cv2.VideoCapture(avi_path)
        if not cap.isOpened():
            # If conversion fails, just rename
            os.rename(avi_path, mp4_path)
            return

        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

        # Try mp4v codec first, fall back to others
        for codec in ["mp4v", "avc1", "XVID"]:
            fourcc = cv2.VideoWriter_fourcc(*codec)
            out = cv2.VideoWriter(mp4_path, fourcc, fps, (width, height))
            if out.isOpened():
                break
        
        if not out.isOpened():
            cap.release()
            # Fallback: just copy the avi
            import shutil
            shutil.copy2(avi_path, mp4_path)
            return

        while True:
            ret, frame = cap.read()
            if not ret:
                break
            out.write(frame)

        cap.release()
        out.release()

        # Remove the intermediate AVI
        try:
            os.remove(avi_path)
        except OSError:
            pass

    def _extract_analytics(
        self,
        tracks: Dict,
        team_ball_control: list,
        total_frames: int,
        fps: float,
        width: int,
        height: int,
    ) -> Dict[str, Any]:
        """Extract structured analytics data from the processed tracks."""
        
        # Minimum number of frames a player must be visible to be counted.
        # Tracks shorter than this are considered ID-switch ghosts from the
        # tracker losing and re-acquiring the same person.
        min_visible_frames = max(int(fps), 25)  # At least ~1 second of visibility

        # ── Video metadata ──
        duration_seconds = total_frames / fps if fps > 0 else 0

        # ── Team possession ──
        team_ball_arr = np.array(team_ball_control)
        unique_teams = np.unique(team_ball_arr)
        possession = {}
        for team_id in unique_teams:
            count = int(np.sum(team_ball_arr == team_id))
            pct = round(count / len(team_ball_arr) * 100, 1) if len(team_ball_arr) > 0 else 0
            possession[f"team_{int(team_id)}"] = {
                "frames": count,
                "percentage": pct,
            }

        # ── Player statistics ──
        player_stats = {}
        # Collect data from last frame of tracks for cumulative stats
        for frame_num, player_track in enumerate(tracks["players"]):
            for player_id, track in player_track.items():
                pid = str(player_id)
                if pid not in player_stats:
                    player_stats[pid] = {
                        "player_id": int(player_id),
                        "team": track.get("team", 0),
                        "team_color": self._color_to_hex(track.get("team_color", (0, 0, 0))),
                        "max_speed": 0,
                        "total_distance": 0,
                        "avg_speed": 0,
                        "frames_with_ball": 0,
                        "frames_visible": 0,
                        "speeds": [],
                    }
                player_stats[pid]["frames_visible"] += 1
                if track.get("has_ball", False):
                    player_stats[pid]["frames_with_ball"] += 1
                speed = track.get("speed", 0)
                if speed and speed > 0:
                    player_stats[pid]["speeds"].append(speed)
                    if speed > player_stats[pid]["max_speed"]:
                        player_stats[pid]["max_speed"] = round(speed, 2)
                distance = track.get("distance", 0)
                if distance and distance > player_stats[pid]["total_distance"]:
                    player_stats[pid]["total_distance"] = round(distance, 2)

        # Calculate averages, clean up, and filter out ghost tracks
        ghost_pids = []
        for pid in player_stats:
            speeds = player_stats[pid].pop("speeds")
            if speeds:
                player_stats[pid]["avg_speed"] = round(float(np.mean(speeds)), 2)
            player_stats[pid]["ball_possession_pct"] = round(
                player_stats[pid]["frames_with_ball"] / max(player_stats[pid]["frames_visible"], 1) * 100, 1
            )
            # Mark short-lived tracks as ghosts
            if player_stats[pid]["frames_visible"] < min_visible_frames:
                ghost_pids.append(pid)

        # Remove ghost/duplicate player tracks
        for pid in ghost_pids:
            del player_stats[pid]

        # ── Possession timeline (sampled every second) ──
        possession_timeline = []
        sample_interval = max(1, int(fps))
        for i in range(0, len(team_ball_control), sample_interval):
            window = team_ball_control[max(0, i - sample_interval):i + 1]
            if window:
                team_counts = {}
                for t in window:
                    team_counts[t] = team_counts.get(t, 0) + 1
                dominant = max(team_counts, key=team_counts.get)
                possession_timeline.append({
                    "time_seconds": round(i / fps, 1) if fps > 0 else 0,
                    "team": int(dominant),
                })

        # ── Detection counts per frame (sampled) ──
        detection_timeline = []
        for i in range(0, total_frames, sample_interval):
            if i < len(tracks["players"]):
                num_players = len(tracks["players"][i])
                num_balls = len(tracks["ball"][i]) if i < len(tracks["ball"]) else 0
                num_referees = len(tracks.get("referees", [{}] * total_frames)[i]) if "referees" in tracks and i < len(tracks["referees"]) else 0
                detection_timeline.append({
                    "time_seconds": round(i / fps, 1) if fps > 0 else 0,
                    "players": num_players,
                    "ball": num_balls,
                    "referees": num_referees,
                })

        return {
            "video_metadata": {
                "total_frames": total_frames,
                "fps": round(fps, 2),
                "duration_seconds": round(duration_seconds, 2),
                "resolution": {"width": width, "height": height},
            },
            "team_possession": possession,
            "player_stats": list(player_stats.values()),
            "possession_timeline": possession_timeline,
            "detection_timeline": detection_timeline,
            "summary": {
                "total_players_detected": len(player_stats),
                "total_teams": len(unique_teams),
            },
        }

    @staticmethod
    def _color_to_hex(color) -> str:
        """Convert BGR/RGB tuple to hex string."""
        if isinstance(color, (list, tuple, np.ndarray)) and len(color) >= 3:
            r, g, b = int(color[0]), int(color[1]), int(color[2])
            return f"#{r:02x}{g:02x}{b:02x}"
        return "#000000"
