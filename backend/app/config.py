from __future__ import annotations  # optional but harmless
import os
from pydantic import BaseModel
from dotenv import load_dotenv
from typing import Optional, List   # <-- add this

load_dotenv()

class Settings(BaseModel):
    # Logging
    LOG_FILE: str = os.getenv("LOG_FILE", "app.log")
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    LOG_FORMAT: str = os.getenv("LOG_FORMAT", "%(asctime)s - User ID: %(user_id)s - %(levelname)s - %(message)s")

    # Paths
    UPLOAD_FOLDER: str = os.path.abspath(os.getenv("UPLOAD_FOLDER", "../../allosmod_inputs/uploads"))
    SCRATCH_ROOT: str = os.getenv("SCRATCH_ROOT", "/scratch/rajagopalmohanraj.n")

    # Derived paths
    INPUTS_ROOT: str = os.path.join(SCRATCH_ROOT, "GlycoMap/allosmod/allosmod_inputs")
    LOGS_DIR: str = os.path.join(SCRATCH_ROOT, "GlycoMap/allosmod/allosmod_backend/logs")

    # Nextflow
    NEXTFLOW_BIN: str = os.getenv("NEXTFLOW_BIN", "nextflow")
    NEXTFLOW_PROJECT_DIR: str = os.path.abspath(os.getenv("NEXTFLOW_PROJECT_DIR", "."))
    NEXTFLOW_ENTRY: str = os.getenv("NEXTFLOW_ENTRY", "main.nf")
    NEXTFLOW_EXTRA_ARGS: str = os.getenv("NEXTFLOW_EXTRA_ARGS", "")

    # External tools
    ALLOSMOD_SCRIPT_PATH: str = os.path.abspath(os.getenv("ALLOSMOD_SCRIPT_PATH", "../../allosmod_inputs/run_allosmod_lib.sh"))

    # File.io
    FILEIO_API_URL: str = os.getenv("FILEIO_API_URL", "https://file.io/")

    # Email
    SMTP_SERVER: Optional[str] = os.getenv("SMTP_SERVER")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", 587))
    SMTP_USER: Optional[str] = os.getenv("SMTP_USER")
    SMTP_PASSWORD: Optional[str] = os.getenv("SMTP_PASSWORD")
    EMAIL_FROM: Optional[str] = os.getenv("EMAIL_FROM")
    EMAIL_SUBJECT: str = os.getenv("EMAIL_SUBJECT", "Your job has been processed")

    # Frontend URL
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")

    # CORS (List[str] instead of list[str])
    CORS_ORIGINS: List[str] = [o.strip() for o in os.getenv("CORS_ORIGINS", "*").split(",")]
