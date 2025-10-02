from __future__ import annotations
import os
import posixpath
from pydantic import BaseModel
from dotenv import load_dotenv
from typing import Optional, List

load_dotenv()

class Settings(BaseModel):

    # Logging
    LOG_FILE: str = os.getenv("LOG_FILE", "app.log")
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    LOG_FORMAT: str = os.getenv("LOG_FORMAT", "%(asctime)s - User ID: %(user_id)s - %(levelname)s - %(message)s")

    # Local Paths
    UPLOAD_FOLDER: str = os.path.abspath(os.getenv("UPLOAD_FOLDER", "uploads"))

    # HPC SSH Configuration
    HPC_HOST: str = os.getenv("HPC_HOST", "explorer.northeastern.edu")
    HPC_PORT: int = int(os.getenv("HPC_PORT", 22))
    HPC_USER: str = os.getenv("HPC_USER", "")
    HPC_SSH_KEY: str = os.getenv("HPC_SSH_KEY", "")
    HPC_PASSWORD: str = os.getenv("HPC_PASSWORD", "")
    HPC_SSH_PASSPHRASE: Optional[str] = os.getenv("HPC_SSH_PASSPHRASE")
    HPC_KNOWN_HOSTS: Optional[str] = os.getenv("HPC_KNOWN_HOSTS")

    # HPC GlycoMap-Engine Configuration
    HPC_BASE_DIR: str = os.getenv("HPC_BASE_DIR", "/scratch/rajagopalmohanraj.n/GlycoMap-Engine")
    HPC_PIPELINE_SCRIPT: str = os.getenv("HPC_PIPELINE_SCRIPT", "pipeline.sh")

    @property
    def HPC_INPUTS_DIR(self) -> str:
        """HPC inputs directory path"""
        return posixpath.join(self.HPC_BASE_DIR, "inputs")
    
    @property
    def HPC_OUTPUTS_DIR(self) -> str:
        """HPC outputs directory path"""
        return posixpath.join(self.HPC_BASE_DIR, "outputs")
    
    @property
    def HPC_LOGS_DIR(self) -> str:
        """HPC logs directory path"""
        return posixpath.join(self.HPC_BASE_DIR, "logs")
    
    @property
    def HPC_PIPELINE_PATH(self) -> str:
        """Full path to pipeline.sh script"""
        return posixpath.join(self.HPC_BASE_DIR, self.HPC_PIPELINE_SCRIPT)

    # Email Configuration
    SMTP_SERVER: Optional[str] = os.getenv("SMTP_SERVER")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", 587))
    SMTP_USER: Optional[str] = os.getenv("SMTP_USER")
    SMTP_PASSWORD: Optional[str] = os.getenv("SMTP_PASSWORD")
    EMAIL_FROM: Optional[str] = os.getenv("EMAIL_FROM")
    EMAIL_SUBJECT: str = os.getenv("EMAIL_SUBJECT", "Your job has been processed")

    # Frontend URL
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")

    # CORS
    CORS_ORIGINS: List[str] = [o.strip() for o in os.getenv("CORS_ORIGINS", "*").split(",")]

settings = Settings()