import os
import shutil
import time
import json
from typing import List
from fastapi import UploadFile
from ..config import settings
from ..utils.shell import run

# === SLURM helper (legacy pattern, optional) ===

def is_job_running(job: str) -> bool:
    try:
        out = run(f"squeue | grep {job}", shell=True)
        return len(out) > 0
    except Exception:
        return False

# === File staging ===

def save_uploads(user_dir: str, files: List[UploadFile]) -> List[str]:
    saved: List[str] = []
    os.makedirs(user_dir, exist_ok=True)
    for file in files:
        filename = os.path.basename(file.filename)
        dest = os.path.join(user_dir, filename)
        with open(dest, "wb") as fh:
            fh.write(file.file.read())
        saved.append(filename)
    return saved


def ensure_input_dat(extract_dir: str, number_of_runs: int) -> None:
    path = os.path.join(extract_dir, "input.dat")
    if os.path.exists(path):
        with open(path, "r") as f:
            lines = f.readlines()
        updated = False
        for i, line in enumerate(lines):
            if line.strip().startswith("NRUNS="):
                lines[i] = f"NRUNS={number_of_runs}"
                updated = True
                break
        if not updated:
            lines.append(f"NRUNS={number_of_runs}")
        with open(path, "w") as f:
            f.writelines(lines)
    else:
        with open(path, "w") as f:
            f.write(f"NRUNS={number_of_runs}")
            f.write(
                "DEVIATION=4.0" \
                "COARSE=false" \
                "SAMPLING=simulation" \
                "TEMPERATURE=300.0" \
            )


def extract_or_stage(file_path: str, extract_dir: str, number_of_runs: int) -> None:
    os.makedirs(extract_dir, exist_ok=True)
    ext = os.path.splitext(file_path)[1].lower()
    if ext == ".zip":
        run(["unzip", "-o", file_path, "-d", extract_dir])
    elif ext in [".tar", ".gz", ".tgz"]:
        run(["tar", "-xf", file_path, "-C", extract_dir])
    else:
        os.makedirs(os.path.join(extract_dir, "input"), exist_ok=True)
        shutil.copy(file_path, os.path.join(extract_dir, "input"))
    ensure_input_dat(extract_dir, number_of_runs)


# === Placement into Nextflow inputs root ===

def place_into_inputs_root(extract_dir: str, req_user_id: str) -> str:
    user_inputs_dir = os.path.join(settings.INPUTS_ROOT, req_user_id)
    os.makedirs(user_inputs_dir, exist_ok=True)
    project_name = os.path.basename(extract_dir.rstrip(os.sep))
    target = os.path.join(user_inputs_dir, project_name)
    if os.path.exists(target):
        shutil.rmtree(target)
    shutil.move(extract_dir, target)
    return target


# === Nextflow kickoff ===

def run_nextflow(req_user_id: str, email: str, name: str, organization: str = "", description: str = "") -> dict:
    os.makedirs(settings.LOGS_DIR, exist_ok=True)
    nf_logs_user = os.path.join(settings.LOGS_DIR, req_user_id, "nextflow")
    os.makedirs(nf_logs_user, exist_ok=True)

    # Write per-run params.json
    params_path = os.path.join(nf_logs_user, f"params-{int(time.time())}.json")
    params_payload = {"user_id": req_user_id, "email": email, "name": name,
                      "organization": organization, "description": description}
    with open(params_path, "w") as f:
        json.dump(params_payload, f)

    run_name = f"allosmod-{req_user_id[:8]}-{int(time.time())}"
    report = os.path.join(nf_logs_user, f"{run_name}-report.html")
    trace  = os.path.join(nf_logs_user, f"{run_name}-trace.txt")
    timeline = os.path.join(nf_logs_user, f"{run_name}-timeline.html")

    extra = settings.NEXTFLOW_EXTRA_ARGS.strip()
    cmd = (
        f"{settings.NEXTFLOW_BIN} run {settings.NEXTFLOW_ENTRY} "
        f"-params-file {params_path} -name {run_name} "
        f"-with-report {report} -with-trace {trace} -with-timeline {timeline} "
        f"{extra}"
    ).strip()

    env = os.environ.copy()
    env["SCRATCH_ROOT"] = settings.SCRATCH_ROOT

    import subprocess
    proc = subprocess.Popen(cmd, cwd=settings.NEXTFLOW_PROJECT_DIR, shell=True, env=env)
    return {"run_name": run_name, "pid": proc.pid, "params_file": params_path,
            "report": report, "trace": trace, "timeline": timeline}


# === High-level per-file staging ===

def process_uploaded_file(saved_file_path: str, number_of_runs: int, user_dir: str, req_user_id: str) -> str:
    file_stem = os.path.splitext(os.path.basename(saved_file_path))[0]
    extract_dir = os.path.join(user_dir, file_stem)
    extract_or_stage(saved_file_path, extract_dir, number_of_runs)
    placed = place_into_inputs_root(extract_dir, req_user_id)
    return placed