"""
Football Analysis Web Application - FastAPI Backend
"""

import os
import sys
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# Ensure backend directory is on the path
BACKEND_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BACKEND_DIR))

from db import init_db
from api.routes import router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle: initialize DB on startup."""
    await init_db()
    # Create required directories
    os.makedirs(str(BACKEND_DIR / "uploads"), exist_ok=True)
    os.makedirs(str(BACKEND_DIR / "outputs"), exist_ok=True)
    yield


app = FastAPI(
    title="Football Analysis API",
    description="AI-Powered Football Player Detection, Tracking & Analytics Platform",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Range", "Accept-Ranges", "Content-Length", "Content-Disposition"],
)

# Include API routes
app.include_router(router)

# Mount static files for output videos
outputs_dir = str(BACKEND_DIR / "outputs")
os.makedirs(outputs_dir, exist_ok=True)
app.mount("/outputs", StaticFiles(directory=outputs_dir), name="outputs")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=False,
        log_level="info",
    )
