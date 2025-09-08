import os, posixpath, time, json, pathlib
from typing import Optional, List, Tuple
import paramiko

from ..config import settings

def _connect():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    # Normalize key path (Windows-friendly)
    key_path = os.path.expanduser(getattr(settings, "HPC_SSH_KEY", "") or "")
    if os.name == "nt":
        key_path = os.path.normpath(key_path)

    pkey = None
    passphrase = getattr(settings, "HPC_SSH_PASSPHRASE", None)

    if key_path and os.path.exists(key_path):
        try:
            pkey = paramiko.Ed25519Key.from_private_key_file(key_path, password=passphrase)
        except paramiko.PasswordRequiredException:
            raise RuntimeError("Key is passphrase-protected: set HPC_SSH_PASSPHRASE or use ssh-agent (ssh-add).")
        except paramiko.SSHException:
            pkey = paramiko.RSAKey.from_private_key_file(key_path, password=passphrase)

    ssh.connect(
        hostname=settings.HPC_HOST,
        port=settings.HPC_PORT,
        username=settings.HPC_USER,
        pkey=pkey,                         # ok if None
        password=getattr(settings, "HPC_PASSWORD", None),  # optional fallback if allowed
        look_for_keys=True,                # try ~/.ssh and agent keys too
        allow_agent=True,
        timeout=20,
    )
    sftp = ssh.open_sftp()
    return ssh, sftp


def _sftp_mkdirs(sftp: paramiko.SFTPClient, remote_dir: str) -> None:
    """Make directories recursively via SFTP with SSH fallback."""
    # First, try the SFTP approach
    parts = remote_dir.strip("/").split("/")
    cur = ""
    sftp_success = True
    
    for p in parts:
        cur = f"{cur}/{p}" if cur else f"/{p}"
        try:
            sftp.stat(cur)
        except IOError:
            try:
                sftp.mkdir(cur)
            except IOError:
                sftp_success = False
                break
    
    # If SFTP failed, use SSH as fallback (more reliable for complex paths)
    if not sftp_success:
        try:
            # Get SSH client from the SFTP transport
            ssh_client = paramiko.SSHClient()
            ssh_client._transport = sftp.get_channel().get_transport()
            
            # Use mkdir -p which is more reliable
            stdin, stdout, stderr = ssh_client.exec_command(f'mkdir -p "{remote_dir}"')
            exit_code = stdout.channel.recv_exit_status()
            
            if exit_code != 0:
                error_msg = stderr.read().decode().strip()
                raise RuntimeError(f"SSH mkdir failed: {error_msg}")
                
        except Exception as e:
            raise RuntimeError(f"Both SFTP and SSH directory creation failed: {e}")

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
    # Just put the file - we'll ensure parent directories exist beforehand
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
    
    # Create staging directory using SSH (more reliable)
    cmd = f'mkdir -p "{remote_stage}"'
    code, out, err = _run_remote(ssh, cmd)
    if code != 0:
        raise RuntimeError(f"Failed to create staging directory: {err}")
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
    
    # Create nextflow logs directory using SSH (more reliable)
    cmd = f'mkdir -p "{nf_logs_user}"'
    code, out, err = _run_remote(ssh, cmd)
    if code != 0:
        raise RuntimeError(f"Failed to create nextflow logs directory: {err}")
    with sftp.file(params_path, "w") as f:
        f.write(json.dumps(params_payload))

    # build remote command - use nf_run.sh script instead of direct nextflow
    extra = settings.HPC_NEXTFLOW_EXTRA_ARGS.strip()
    nf_script = posixpath.join(settings.HPC_SCRATCH_ROOT, "nf_run.sh")
    cmd = f"""
        set -euo pipefail
        export SCRATCH_ROOT="{settings.HPC_SCRATCH_ROOT}"
        cd "{settings.HPC_NEXTFLOW_PROJECT_DIR}"
        nohup {nf_script} run "{settings.HPC_NEXTFLOW_ENTRY}" \
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
        # ensure base dirs exist using SSH command (more reliable)
        logs_dir = posixpath.join(settings.HPC_LOGS_DIR, req_user_id)
        inputs_dir = posixpath.join(settings.HPC_INPUTS_ROOT, req_user_id)
        
        # Use SSH command for reliable directory creation
        cmd = f'mkdir -p "{logs_dir}" "{inputs_dir}"'
        code, out, err = _run_remote(ssh, cmd)
        if code != 0:
            raise RuntimeError(f"Failed to create directories: {err}")
        
        # Verify directories are writable
        test_cmd = f'test -w "{logs_dir}" && test -w "{inputs_dir}" && echo "OK"'
        code, out, err = _run_remote(ssh, test_cmd)
        if code != 0 or "OK" not in out:
            raise RuntimeError(f"Directories not writable: {err}")

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
