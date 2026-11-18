"""
SQLite database layer for football analysis.
Uses aiosqlite for async operations.
"""

import aiosqlite
import os
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, List, Dict, Any

DB_PATH = str(Path(__file__).resolve().parent / "football_analysis.db")


async def init_db():
    """Create the analyses table if it doesn't exist."""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS analyses (
                id TEXT PRIMARY KEY,
                filename TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'pending',
                progress INTEGER NOT NULL DEFAULT 0,
                stage TEXT DEFAULT '',
                created_at TEXT NOT NULL,
                completed_at TEXT,
                error_message TEXT,
                video_path TEXT,
                output_video_path TEXT,
                analytics_json TEXT
            )
        """)
        await db.commit()


async def create_analysis(id: str, filename: str, video_path: str) -> Dict[str, Any]:
    """Insert a new analysis record."""
    created_at = datetime.now(timezone.utc).isoformat()
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """INSERT INTO analyses (id, filename, status, progress, stage, created_at, video_path)
               VALUES (?, ?, 'pending', 0, 'Queued', ?, ?)""",
            (id, filename, created_at, video_path),
        )
        await db.commit()
    return {
        "id": id,
        "filename": filename,
        "status": "pending",
        "progress": 0,
        "stage": "Queued",
        "created_at": created_at,
    }


async def update_analysis_status(id: str, status: str, progress: int, stage: str):
    """Update the status, progress, and stage of an analysis."""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """UPDATE analyses SET status = ?, progress = ?, stage = ? WHERE id = ?""",
            (status, progress, stage, id),
        )
        await db.commit()


async def complete_analysis(id: str, output_video_path: str, analytics_json: str):
    """Mark an analysis as completed with results."""
    completed_at = datetime.now(timezone.utc).isoformat()
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """UPDATE analyses 
               SET status = 'completed', progress = 100, stage = 'Complete',
                   completed_at = ?, output_video_path = ?, analytics_json = ?
               WHERE id = ?""",
            (completed_at, output_video_path, analytics_json, id),
        )
        await db.commit()


async def fail_analysis(id: str, error_message: str):
    """Mark an analysis as failed."""
    completed_at = datetime.now(timezone.utc).isoformat()
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """UPDATE analyses 
               SET status = 'failed', stage = 'Failed',
                   completed_at = ?, error_message = ?
               WHERE id = ?""",
            (completed_at, error_message, id),
        )
        await db.commit()


async def get_analysis(id: str) -> Optional[Dict[str, Any]]:
    """Get a single analysis by ID."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM analyses WHERE id = ?", (id,)) as cursor:
            row = await cursor.fetchone()
            if row is None:
                return None
            return dict(row)


async def get_all_analyses() -> List[Dict[str, Any]]:
    """Get all analyses sorted by creation date (newest first)."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM analyses ORDER BY created_at DESC") as cursor:
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]


async def delete_analysis(id: str) -> bool:
    """Delete an analysis record. Returns True if a row was deleted."""
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute("DELETE FROM analyses WHERE id = ?", (id,))
        await db.commit()
        return cursor.rowcount > 0
