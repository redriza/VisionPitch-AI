"""
FastAPI routes for the football analysis API.
"""

import os
import uuid
import json
import asyncio
import traceback
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from typing import Optional

from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks, Request
from fastapi.responses import FileResponse, StreamingResponse

from db import (
    create_analysis,
    update_analysis_status,
    complete_analysis,
    fail_analysis,
    get_analysis,
    get_all_analyses,
    delete_analysis,
)

router = APIRouter()

BACKEND_DIR = Path(__file__).resolve().parent.parent
UPLOADS_DIR = BACKEND_DIR / "uploads"
OUTPUTS_DIR = BACKEND_DIR / "outputs"
MODELS_DIR = BACKEND_DIR / "models"

# Thread pool for CPU-bound AI processing
_executor = ThreadPoolExecutor(max_workers=1)

# Lazy singleton for the pipeline
_pipeline = None


def _get_pipeline():
    """Get or create the AI pipeline singleton."""
    global _pipeline
    if _pipeline is None:
        from ai_engine import FootballAnalysisPipeline
        model_path = str(MODELS_DIR / "best.pt")
        _pipeline = FootballAnalysisPipeline(model_path=model_path)
    return _pipeline


def _run_analysis_sync(job_id: str, video_path: str, output_dir: str):
    """
    Synchronous function that runs the full analysis pipeline.
    Called in a thread to avoid blocking the event loop.
    """
    import asyncio

    # Create a new event loop for this thread to run async DB updates
    loop = asyncio.new_event_loop()

    def progress_callback(stage: str, pct: int):
        """Update the database with current progress."""
        try:
            loop.run_until_complete(
                update_analysis_status(job_id, "processing", pct, stage)
            )
        except Exception:
            pass  # Don't let DB errors kill the pipeline

    try:
        # Mark as processing
        loop.run_until_complete(
            update_analysis_status(job_id, "processing", 0, "Starting")
        )

        pipeline = _get_pipeline()
        result = pipeline.process_video(
            input_video_path=video_path,
            output_dir=output_dir,
            job_id=job_id,
            progress_callback=progress_callback,
        )

        # Mark as completed
        analytics_json = json.dumps(result["analytics"], default=str)
        loop.run_until_complete(
            complete_analysis(job_id, result["output_video_path"], analytics_json)
        )

    except Exception as e:
        error_msg = f"{type(e).__name__}: {str(e)}\n{traceback.format_exc()}"
        try:
            loop.run_until_complete(fail_analysis(job_id, error_msg))
        except Exception:
            pass
    finally:
        loop.close()


@router.post("/api/upload")
async def upload_video(file: UploadFile = File(...)):
    """Upload a video file and start analysis."""
    # Validate file type
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    allowed_extensions = {".mp4", ".avi", ".mov", ".mkv", ".wmv", ".flv", ".webm"}
    ext = Path(file.filename).suffix.lower()
    if ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {ext}. Allowed: {', '.join(allowed_extensions)}",
        )

    # Generate unique ID and save file
    job_id = str(uuid.uuid4())[:8]
    safe_filename = f"{job_id}_{file.filename}"
    video_path = str(UPLOADS_DIR / safe_filename)

    os.makedirs(str(UPLOADS_DIR), exist_ok=True)
    with open(video_path, "wb") as f:
        content = await file.read()
        f.write(content)

    # Create DB record
    analysis = await create_analysis(job_id, file.filename, video_path)

    # Start background processing in thread pool
    output_dir = str(OUTPUTS_DIR / job_id)
    os.makedirs(output_dir, exist_ok=True)

    _executor.submit(_run_analysis_sync, job_id, video_path, output_dir)

    return {
        "id": job_id,
        "filename": file.filename,
        "status": "pending",
        "message": "Video uploaded successfully. Analysis started.",
    }


@router.get("/api/analyses")
async def list_analyses():
    """List all analyses."""
    analyses = await get_all_analyses()
    # Parse analytics_json for each completed analysis
    for a in analyses:
        if a.get("analytics_json"):
            try:
                a["analytics"] = json.loads(a["analytics_json"])
            except (json.JSONDecodeError, TypeError):
                a["analytics"] = None
            del a["analytics_json"]
        else:
            a["analytics"] = None
            if "analytics_json" in a:
                del a["analytics_json"]
    return {"analyses": analyses}


@router.get("/api/analyses/{analysis_id}")
async def get_analysis_detail(analysis_id: str):
    """Get details of a specific analysis."""
    analysis = await get_analysis(analysis_id)
    if analysis is None:
        raise HTTPException(status_code=404, detail="Analysis not found")

    # Parse analytics JSON
    if analysis.get("analytics_json"):
        try:
            analysis["analytics"] = json.loads(analysis["analytics_json"])
        except (json.JSONDecodeError, TypeError):
            analysis["analytics"] = None
        del analysis["analytics_json"]
    else:
        analysis["analytics"] = None
        if "analytics_json" in analysis:
            del analysis["analytics_json"]

    return analysis


@router.get("/api/analyses/{analysis_id}/video")
async def get_analysis_video(analysis_id: str, request: Request):
    """Stream the output video for a completed analysis with Range support."""
    analysis = await get_analysis(analysis_id)
    if analysis is None:
        raise HTTPException(status_code=404, detail="Analysis not found")

    if analysis["status"] != "completed":
        raise HTTPException(status_code=400, detail="Analysis not yet completed")

    video_path = analysis.get("output_video_path")
    if not video_path or not os.path.exists(video_path):
        raise HTTPException(status_code=404, detail="Output video not found")

    file_size = os.path.getsize(video_path)
    range_header = request.headers.get("range")

    if range_header:
        # Parse range header: "bytes=start-end"
        range_spec = range_header.strip().lower().replace("bytes=", "")
        parts = range_spec.split("-")
        start = int(parts[0]) if parts[0] else 0
        end = int(parts[1]) if len(parts) > 1 and parts[1] else file_size - 1
        end = min(end, file_size - 1)
        content_length = end - start + 1

        def iter_file():
            with open(video_path, "rb") as f:
                f.seek(start)
                remaining = content_length
                while remaining > 0:
                    chunk_size = min(8192, remaining)
                    data = f.read(chunk_size)
                    if not data:
                        break
                    remaining -= len(data)
                    yield data

        return StreamingResponse(
            iter_file(),
            status_code=206,
            media_type="video/mp4",
            headers={
                "Content-Range": f"bytes {start}-{end}/{file_size}",
                "Accept-Ranges": "bytes",
                "Content-Length": str(content_length),
                "Content-Disposition": f'inline; filename="analysis_{analysis_id}.mp4"',
            },
        )
    else:
        # No range requested — return full file with Accept-Ranges header
        return FileResponse(
            video_path,
            media_type="video/mp4",
            filename=f"analysis_{analysis_id}.mp4",
            headers={"Accept-Ranges": "bytes"},
        )


@router.delete("/api/analyses/{analysis_id}")
async def delete_analysis_endpoint(analysis_id: str):
    """Delete an analysis and its associated files."""
    analysis = await get_analysis(analysis_id)
    if analysis is None:
        raise HTTPException(status_code=404, detail="Analysis not found")

    # Clean up files
    video_path = analysis.get("video_path")
    if video_path and os.path.exists(video_path):
        try:
            os.remove(video_path)
        except OSError:
            pass

    output_dir = str(OUTPUTS_DIR / analysis_id)
    if os.path.exists(output_dir):
        import shutil
        try:
            shutil.rmtree(output_dir)
        except OSError:
            pass

    await delete_analysis(analysis_id)
    return {"message": "Analysis deleted successfully"}


@router.get("/api/health")
async def health_check():
    """Health check endpoint."""
    model_exists = os.path.exists(str(MODELS_DIR / "best.pt"))
    return {
        "status": "healthy",
        "model_loaded": model_exists,
        "model_path": str(MODELS_DIR / "best.pt"),
    }
