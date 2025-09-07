# Allosmod Nextflow Pipeline (DSL2)

A modular Nextflow + SLURM pipeline that runs Allosmod workloads per user. It mirrors the original bash-array logic and keeps the CLI minimal: you only pass a `params.json`.

## Overview

For each project under a user's input folder the pipeline:

- Reads `NRUNS` from `input.dat`
- Runs Allosmod setup once per folder
- Patches `qsub.sh` (ensures `#!/bin/bash`, injects a SLURM-friendly shim, rewrites `TASK=(0..NRUNS-1)`).
- Fans out N runs: for each `run_id`, exports `SGE_TASK_ID=run_id+1` and executes the patched script
- After all runs for that folder: runs `process_uploads.py`
- After all folders finish: runs `zip_and_send_email.py`
- Writes logs to a per-user log directory

## Requirements

- Nextflow (DSL2) and Java 11+
- A SLURM cluster
- Allosmod module available on the cluster (loaded by `nextflow.config`)
- Read/write access to the configured `SCRATCH_ROOT`

## Project layout

nf-project/
- `main.nf`
- `nextflow.config`
- `modules/`
  - `setup_allosmod.nf`
  - `patch_qsub.nf`
  - `run_task.nf`
  - `process_uploads.nf`
  - `zip_and_email.nf`

(In this repo the pipeline lives under `allosmod/allosmod_backend/`.)

## Configuration (what `nextflow.config` does)

`nextflow.config` configures:

- SLURM executor and per-process resources (example: `run_task` may use `--gres=gpu:v100-sxm2:1`, `cpus=12`, `mem=128 GB`, `time=8h`)
- Makes the module system available and loads Allosmod:
  - `source /etc/profile.d/modules.sh` (if present)
  - `module use ~/modulefiles/`
  - `module load ~/modulefiles/allosmod/1.0`
- Derives runtime roots from `SCRATCH_ROOT` (overridable by an env var). Example fragment:

```groovy
def SCRATCH_ROOT = System.getenv('SCRATCH_ROOT') ?: '/scratch/rajagopalmohanraj.n'

env {
  SCRATCH_ROOT = SCRATCH_ROOT
  INPUTS_ROOT  = "${SCRATCH_ROOT}/GlycoMap/allosmod/allosmod_inputs"
  LOG_ROOT     = "${SCRATCH_ROOT}/GlycoMap/allosmod/allosmod_backend/logs"
}

params.outdir = params.outdir ?: 'results'
workDir       = "${params.workdir ?: 'work'}"
```

## Runtime parameters (`params.json`)

Provide a minimal JSON with user metadata (no comments). Example:

```json
{
  "user_id": "8f643255-8e1b-4d3a-b48d-e49f7cc6a3e8",
  "email": "user@example.edu",
  "name": "Full Name",
  "organization": "",
  "description": ""
}
```

Do not include `base_folder`, `log_root`, `outdir`, or `workdir` in `params.json`; the pipeline derives those values from `SCRATCH_ROOT` and config defaults.

## How to run

Bash / POSIX:

```bash
# (optional) set scratch root for this run
export SCRATCH_ROOT=/scratch/yourname

nextflow run main.nf -params-file params.json
```

PowerShell (when invoking Nextflow from a compatible environment / WSL; set in target environment if needed):

```powershell
$env:SCRATCH_ROOT = "/scratch/yourname"
nextflow run main.nf -params-file params.json
```

Notes:
- No `-profile` or extra flags are required by default.
- `SCRATCH_ROOT` is optional; if not set the default in `nextflow.config` is used.

## Paths (derived from config)

- Inputs discovered: `${INPUTS_ROOT}/${user_id}/*`  
  e.g. `/scratch/.../allosmod_inputs/<user_id>/<project>/`
- Logs (per user): `${LOG_ROOT}/${user_id}`  
  e.g. `/scratch/.../allosmod_backend/logs/<user_id>/`  
  Typical log files:
  - `qsub_<folder>_<run_id>.out|err`
  - `process_uploads_<folder>.out|err`
  - `zip_and_send_email.out|err`
- Work directory: `work/` (configurable)
- Final results: `results/` (or value of `params.outdir`)

## Module overview

- `setup_allosmod.nf` — Allosmod setup once per folder (CPU)
- `patch_qsub.nf` — Ensure `#!/bin/bash`, inject SLURM shim, rewrite `TASK=(0..NRUNS-1)` (CPU)
- `run_task.nf` — Run each `run_id` with `SGE_TASK_ID=run_id+1` (GPU; heavy resources)
- `process_uploads.nf` — Per-folder post step calling `process_uploads.py` (CPU)
- `zip_and_email.nf` — Final once-only `zip_and_send_email.py` (CPU)

## Design rationale

- Using `SCRATCH_ROOT` → `INPUTS_ROOT` / `LOG_ROOT` lets you move between scratch areas easily.
- Task scripts use `${LOG_ROOT}` so logs are collocated and predictable.
- Keeping `params.json` minimal simplifies the user-facing CLI.

## Troubleshooting & notes

- Confirm the Allosmod module path/version in `nextflow.config` matches your cluster.
- Ensure `SCRATCH_ROOT` points to a path with read/write access for the pipeline user.
- Adjust SLURM resource requests in `nextflow.config` to fit your cluster (GPU names, memory, partitions).
