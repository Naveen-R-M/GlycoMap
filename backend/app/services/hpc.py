import os, posixpath, time, json, pathlib
from typing import Optional, List, Tuple
import paramiko

from ..config import settings

def _connect() -> Tuple[paramiko.SSHClient, paramiko.SFTPClient]:
    ssh = paramiko.SSHClient()
    # Trust-on-first-use; for strict security, load known_hosts and refuse unknown
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    if settings.HPC_KNOWN_HOSTS and os.path.exists(settings.HPC_KNOWN_HOSTS):
        ssh.load_host_keys(settings.HPC_KNOWN_HOSTS)

    pkey = None
    if settings.HPC_SSH_KEY and os.path.exists(settings.HPC_SSH_KEY):
        try:
            pkey = paramiko.Ed25519Key.from_private_key_file(settings.HPC_SSH_KEY)
        except Exception:
            pkey = paramiko.RSAKey.from_private_key_file(settings.HPC_SSH_KEY)

    ssh.connect(
        hostname=settings.HPC_HOST,
        port=settings.HPC_PORT,
        username=settings.HPC_USER,
        pkey=pkey,
        look_for_keys=False,
        allow_agent=True,
        timeout=20,
    )
    sftp = ssh.open_sftp()
    return ssh, sftp

def _sftp_mkdirs(sftp: paramiko.SFTPClient, remote_dir: str) -> None:
    # Make dirs recursively on remote (POSIX paths)
    parts = remote_dir.strip("/").split("/")
    cur = ""
    for p in parts:
        cur = f"{cur}/{p}" if cur else f"/{p}"
        try:
            sftp.stat(cur)
        except IOError:
            sftp.mkdir(cur)

def _run_remote(ssh: paramiko.SSHClient, cmd: str, env: Optional[dict] = None) -> Tuple[int,str,str]:
    # Prefix env exports
    export = ""
    if env:
        export = " ".join([f"{k}='{v}'" for k,v in env.items()])
        export = f"export {export} && "
    stdin, stdout, stderr = ssh.exec_command(export + cmd)
    out = stdout.read().decode()
    err = stderr.read().decode()
    code = stdout.channel.recv_exit_status()
    return code, out, err

def _put_file(sftp: paramiko.SFTPClient, local: str, remote: str) -> None:
    _sftp_mkdirs(sftp, posixpath.dirname(remote))
    sftp.put(local, remote)

def stage_archive_to_inputs(
    ssh: paramiko.SSHClient,
    sftp: paramiko.SFTPClient,
    local_path: str,
    req_user_id: str,
    number_of_runs: int
) -> str:
    """
    Upload the user’s archive/file to a staging area on HPC,
    then extract/place it under HPC_INPUTS_ROOT/<user_id>/<project>.
    Returns the final project folder path on HPC.
    """
    filename = os.path.basename(local_path)
    stamp = str(int(time.time()))
    remote_stage = posixpath.join(settings.HPC_LOGS_DIR, req_user_id, "staging", stamp)
    remote_archive = posixpath.join(remote_stage, filename)
    _sftp_mkdirs(sftp, remote_stage)
    _put_file(sftp, local_path, remote_archive)

    project_stem = os.path.splitext(filename)[0]
    extract_dir = posixpath.join(remote_stage, project_stem)
    inputs_root  = posixpath.join(settings.HPC_INPUTS_ROOT, req_user_id)
    final_target = posixpath.join(inputs_root, project_stem)

    # Build a remote bash to extract and ensure input.dat with NRUNS
    remote_script = f"""
        set -euo pipefail
        [ -f "{settings.HPC_MODULE_INIT or ''}" ] && source "{settings.HPC_MODULE_INIT}" || true
        {settings.HPC_MODULES or ''}

        mkdir -p "{extract_dir}" "{inputs_root}"
        case "{filename}" in
          *.zip) unzip -o "{remote_archive}" -d "{extract_dir}" ;;
          *.tar|*.tgz|*.gz) tar -xf "{remote_archive}" -C "{extract_dir}" ;;
          *) mkdir -p "{extract_dir}/input" && cp "{remote_archive}" "{extract_dir}/input/" ;;
        esac

        # ensure input.dat has NRUNS
        INPUT_DAT="{extract_dir}/input.dat"
        if [ -f "$INPUT_DAT" ]; then
          if grep -q '^NRUNS=' "$INPUT_DAT"; then
            sed -i 's/^NRUNS=.*/NRUNS={number_of_runs}/' "$INPUT_DAT"
          else
            echo 'NRUNS={number_of_runs}' >> "$INPUT_DAT"
          fi
        else
          cat > "$INPUT_DAT" <<EOF
NRUNS={number_of_runs}
DEVIATION=4.0
COARSE=false
SAMPLING=simulation
TEMPERATURE=300.0
EOF
        fi

        # Move into inputs root (overwrite if exists)
        rm -rf "{final_target}"
        mkdir -p "{inputs_root}"
        mv "{extract_dir}" "{final_target}"
        echo "{final_target}"
    """.strip()

    code, out, err = _run_remote(ssh, remote_script)
    if code != 0:
        raise RuntimeError(f"Remote staging failed:\n{err}")
    return out.strip()

def submit_nextflow(
    ssh: paramiko.SSHClient,
    req_user_id: str,
    email: str,
    name: str,
    organization: str = "",
    description: str = ""
) -> dict:
    """
    Writes params.json on HPC and starts nextflow in background (nohup).
    Returns run metadata (run_name, pid, report/trace/timeline paths).
    """
    ts = int(time.time())
    run_name = f"allosmod-{req_user_id[:8]}-{ts}"
    nf_logs_user = posixpath.join(settings.HPC_LOGS_DIR, req_user_id, "nextflow")
    params_path  = posixpath.join(nf_logs_user, f"params-{ts}.json")
    report       = posixpath.join(nf_logs_user, f"{run_name}-report.html")
    trace        = posixpath.join(nf_logs_user, f"{run_name}-trace.txt")
    timeline     = posixpath.join(nf_logs_user, f"{run_name}-timeline.html")
    stdout_log   = posixpath.join(nf_logs_user, f"{run_name}.out")

    # write params.json via SFTP
    params_payload = {
        "user_id": req_user_id,
        "email": email,
        "name": name,
        "organization": organization,
        "description": description
    }
    sftp = ssh.open_sftp()
    _sftp_mkdirs(sftp, nf_logs_user)
    with sftp.file(params_path, "w") as f:
        f.write(json.dumps(params_payload))

    # build remote command
    extra = settings.HPC_NEXTFLOW_EXTRA_ARGS.strip()
    cmd = f"""
        set -euo pipefail
        [ -f "{settings.HPC_MODULE_INIT or ''}" ] && source "{settings.HPC_MODULE_INIT}" || true
        {settings.HPC_MODULES or ''}

        export SCRATCH_ROOT="{settings.HPC_SCRATCH_ROOT}"
        cd "{settings.HPC_NEXTFLOW_PROJECT_DIR}"
        nohup {settings.NEXTFLOW_BIN} run "{settings.HPC_NEXTFLOW_ENTRY}" \
          -params-file "{params_path}" -name "{run_name}" \
          -with-report "{report}" -with-trace "{trace}" -with-timeline "{timeline}" \
          {extra} > "{stdout_log}" 2>&1 & echo $!
    """.strip()

    code, out, err = _run_remote(ssh, cmd)
    if code != 0 or not out.strip():
        raise RuntimeError(f"Failed to start Nextflow:\n{err}")
    pid = out.strip()
    return {
        "run_name": run_name,
        "pid": pid,
        "params_file": params_path,
        "report": report,
        "trace": trace,
        "timeline": timeline,
        "stdout": stdout_log,
    }

def stage_files_and_start_nf(
    local_files: List[str],
    number_of_runs: int,
    req_user_id: str,
    email: str,
    name: str,
    organization: str,
    description: str,
) -> dict:
    ssh, sftp = _connect()
    try:
        # ensure base dirs exist
        _sftp_mkdirs(sftp, posixpath.join(settings.HPC_LOGS_DIR, req_user_id))
        _sftp_mkdirs(sftp, posixpath.join(settings.HPC_INPUTS_ROOT, req_user_id))

        # stage each file (upload→extract→place)
        placed = []
        for lf in local_files:
            p = stage_archive_to_inputs(ssh, sftp, lf, req_user_id, number_of_runs)
            placed.append(p)

        # kick off one Nextflow run (discovers all placed folders)
        meta = submit_nextflow(
            ssh, req_user_id=req_user_id, email=email, name=name,
            organization=organization, description=description
        )
        meta["placed_projects"] = placed
        return meta
    finally:
        try:
            sftp.close()
        except Exception:
            pass
        ssh.close()
