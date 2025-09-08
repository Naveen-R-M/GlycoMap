import os
import time
import uuid
from typing import List
from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, UploadFile, HTTPException
from app.config import settings
from app.logging_config import setup_logging
from app.services.storage import ensure_directory_structure
from app.services.process import save_uploads, process_uploaded_file, run_nextflow
from app.models.schemas import UploadResponse
from app.deps import bind_user_id
from app.context import user_id_var
from typing import List, Optional
from app.services.hpc import stage_files_and_start_nf

logger = setup_logging()
router = APIRouter()

@router.post("/upload", response_model=UploadResponse)
async def upload(
    background: BackgroundTasks,
    email: str = Form(...),
    name: str = Form(...),
    organization: str = Form(""),
    description: str = Form(""),
    numberOfRuns: int = Form(1),
    user_id: Optional[str] = Form(None),
    files: List[UploadFile] = File(..., alias="files"),
    _ = Depends(bind_user_id),
):
    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded")
    if len(files) > 10:
        raise HTTPException(status_code=400, detail="Too many files; max 10")

    ensure_directory_structure()

    req_user_id = user_id or str(uuid.uuid4())
    user_id_var.set(req_user_id)

    timestamp = time.strftime("%Y%m%d%H%M%S")
    safe_name = "".join(c for c in name if c.isalnum() or c in ("-", "_", ".")).rstrip()
    user_dir_name = f"{timestamp}_{safe_name}_{req_user_id[:8]}"
    user_dir = os.path.join(settings.UPLOAD_FOLDER, user_dir_name)
    os.makedirs(user_dir, exist_ok=True)

    # Save metadata
    with open(os.path.join(user_dir, "user_info.txt"), "w") as f:
        f.write(
                f"Name: {name}" \
                f"Email: {email}" \
                f"Organization: {organization}" \
            )
        f.write(
            f"Description: {description}" \
            f"Number of Runs: {numberOfRuns}" \
        )
        f.write(
            f"User ID: {req_user_id}" \
            f"Timestamp: {timestamp}" \
        )

    # Save files to staging
    saved_files = save_uploads(user_dir, files)

    local_paths = [os.path.join(user_dir, f) for f in saved_files]
    try:
        run_meta = stage_files_and_start_nf(
            local_files=local_paths,
            number_of_runs=numberOfRuns,
            req_user_id=req_user_id,
            email=email,
            name=name,
            organization=organization,
            description=description,
        )
    except Exception as e:
        logger.exception(f"HPC submit failed: {e}")
        raise HTTPException(status_code=500, detail=f"HPC submit failed: {e}")

    return UploadResponse(
        status="success",
        message="Files uploaded and remote Nextflow run started",
        email=email,
        name=name,
        files=saved_files,
        job_ids=[str(run_meta["pid"])],
        user_id=req_user_id,
    )