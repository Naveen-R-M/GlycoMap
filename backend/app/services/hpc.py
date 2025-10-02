import os, posixpath, time, json
from typing import Optional, List, Tuple
import paramiko

from ..config import settings


def _connect():
    """Establish SSH connection to HPC"""
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
        pkey=pkey,
        password=getattr(settings, "HPC_PASSWORD", None),
        look_for_keys=True,
        allow_agent=True,
        timeout=20,
    )
    sftp = ssh.open_sftp()
    return ssh, sftp


def _run_remote(ssh: paramiko.SSHClient, cmd: str, env: Optional[dict] = None) -> Tuple[int, str, str]:
    """Execute a command on remote HPC via SSH"""
    export = ""
    if env:
        export = " ".join([f"{k}='{v}'" for k, v in env.items()])
        export = f"export {export} && "
    
    stdin, stdout, stderr = ssh.exec_command(export + cmd)
    out = stdout.read().decode()
    err = stderr.read().decode()
    code = stdout.channel.recv_exit_status()
    return code, out, err


def _put_file(sftp: paramiko.SFTPClient, local: str, remote: str) -> None:
    """Upload a file via SFTP"""
    sftp.put(local, remote)


def setup_hpc_directories(ssh: paramiko.SSHClient, req_user_id: str) -> dict:
    """
    Navigate to GlycoMap-Engine and create directory structure:
    - inputs/
    - outputs/
    - logs/
    - inputs/{user_id}/
    
    Returns dict with paths
    """
    cmd = f"""
        set -e
        cd {settings.HPC_BASE_DIR} || {{ echo "Directory {settings.HPC_BASE_DIR} does not exist" >&2; exit 1; }}
        mkdir -p inputs outputs logs
        mkdir -p inputs/{req_user_id}
        pwd
    """.strip()
    
    code, out, err = _run_remote(ssh, cmd)
    if code != 0:
        raise RuntimeError(f"Failed to setup HPC directories: {err}")
    
    base_path = out.strip()
    
    return {
        "base_dir": base_path,
        "inputs_dir": posixpath.join(base_path, "inputs"),
        "outputs_dir": posixpath.join(base_path, "outputs"),
        "logs_dir": posixpath.join(base_path, "logs"),
        "user_inputs_dir": posixpath.join(base_path, "inputs", req_user_id)
    }


def get_next_folder_index(ssh: paramiko.SSHClient, user_inputs_dir: str) -> int:
    """
    Find the next available folder_i index in user's inputs directory
    """
    cmd = f"""
        if [ -d "{user_inputs_dir}" ]; then
            cd {user_inputs_dir}
            ls -1d folder_* 2>/dev/null | sed 's/folder_//' | sort -n | tail -1
        fi
    """.strip()
    
    code, out, err = _run_remote(ssh, cmd)
    
    if code != 0 or not out.strip():
        return 1  # Start with folder_1
    
    try:
        last_index = int(out.strip())
        return last_index + 1
    except (ValueError, AttributeError):
        return 1


def upload_and_stage_files(
    ssh: paramiko.SSHClient,
    sftp: paramiko.SFTPClient,
    local_files: List[str],
    user_inputs_dir: str,
    folder_index: int,
    req_user_id: str,
    email: str,
    name: str,
    organization: str,
    description: str,
    number_of_runs: int,
    gef_probe_radius: int
) -> str:
    """
    Upload files to HPC and organize them in folder_i structure.
    Creates input.dat if not present, updates if present.
    Creates metadata.json with user information.
    
    Returns the folder path.
    """
    folder_name = f"folder_{folder_index}"
    folder_path = posixpath.join(user_inputs_dir, folder_name)
    
    # Create the folder
    cmd = f'mkdir -p "{folder_path}"'
    code, out, err = _run_remote(ssh, cmd)
    if code != 0:
        raise RuntimeError(f"Failed to create folder {folder_name}: {err}")
    
    # Upload each file
    uploaded_files = []
    for local_file in local_files:
        filename = os.path.basename(local_file)
        remote_file = posixpath.join(folder_path, filename)
        
        try:
            _put_file(sftp, local_file, remote_file)
            uploaded_files.append(filename)
        except Exception as e:
            raise RuntimeError(f"Failed to upload {filename}: {e}")
    
    # Create/update input.dat with parameters
    input_dat_path = posixpath.join(folder_path, "input.dat")
    
    # Check if input.dat was uploaded
    has_input_dat = "input.dat" in uploaded_files
    
    if has_input_dat:
        # Update existing input.dat
        update_cmd = f"""
            cd {folder_path}
            INPUT_DAT="input.dat"
            
            # Update or add NRUNS
            if grep -q '^NRUNS=' "$INPUT_DAT"; then
                sed -i 's/^NRUNS=.*/NRUNS={number_of_runs}/' "$INPUT_DAT"
            else
                echo 'NRUNS={number_of_runs}' >> "$INPUT_DAT"
            fi
            
            # Update or add GEF_PROBE_RADIUS
            if grep -q '^GEF_PROBE_RADIUS=' "$INPUT_DAT"; then
                sed -i 's/^GEF_PROBE_RADIUS=.*/GEF_PROBE_RADIUS={gef_probe_radius}/' "$INPUT_DAT"
            else
                echo 'GEF_PROBE_RADIUS={gef_probe_radius}' >> "$INPUT_DAT"
            fi
        """.strip()
        
        code, out, err = _run_remote(ssh, update_cmd)
        if code != 0:
            raise RuntimeError(f"Failed to update input.dat: {err}")
    else:
        # Create new input.dat
        create_cmd = f"""
            cat > {input_dat_path} <<'EOF'
NRUNS={number_of_runs}
GEF_PROBE_RADIUS={gef_probe_radius}
DEVIATION=4.0
COARSE=false
SAMPLING=simulation
TEMPERATURE=300.0
EOF
        """.strip()
        
        code, out, err = _run_remote(ssh, create_cmd)
        if code != 0:
            raise RuntimeError(f"Failed to create input.dat: {err}")
    
    # Create metadata.json with user information
    metadata = {
        "user_id": req_user_id,
        "email": email,
        "name": name,
        "organization": organization,
        "description": description,
        "number_of_runs": number_of_runs,
        "gef_probe_radius": gef_probe_radius,
        "uploaded_files": uploaded_files,
        "timestamp": int(time.time()),
        "folder": folder_name
    }
    
    metadata_json = json.dumps(metadata, indent=2)
    metadata_path = posixpath.join(folder_path, "metadata.json")
    
    # Write metadata.json via SFTP
    with sftp.file(metadata_path, "w") as f:
        f.write(metadata_json)
    
    return folder_path


def call_pipeline_script(
    ssh: paramiko.SSHClient,
    user_inputs_dir: str,
    req_user_id: str,
    email: str,
    name: str
) -> dict:
    """
    Call pipeline.sh script with required parameters:
    ./pipeline.sh '<inputs_path>' '<user_id>' '<email>' '<name>'
    
    Example:
    ./pipeline.sh '/scratch/rajagopalmohanraj.n/GlycoMap-Engine/inputs/test-user/' 
                  'test-user' 
                  'rajagopalmohanraj.n@northeastern.edu' 
                  'Naveen Rajagopal Mohanraj'
    
    Returns dict with execution details
    """
    # Ensure user_inputs_dir ends with /
    if not user_inputs_dir.endswith('/'):
        user_inputs_dir += '/'
    
    # Build the pipeline command
    cmd = f"""
        set -e
        cd {settings.HPC_BASE_DIR}
        chmod +x {settings.HPC_PIPELINE_SCRIPT} 2>/dev/null || true
        ./{settings.HPC_PIPELINE_SCRIPT} '{user_inputs_dir}' '{req_user_id}' '{email}' '{name}'
    """.strip()
    
    # Execute the pipeline script
    code, out, err = _run_remote(ssh, cmd)
    
    if code != 0:
        raise RuntimeError(f"Pipeline script failed with exit code {code}:\nSTDOUT: {out}\nSTDERR: {err}")
    
    return {
        "exit_code": code,
        "stdout": out.strip(),
        "stderr": err.strip(),
        "command": f"./pipeline.sh '{user_inputs_dir}' '{req_user_id}' '{email}' '{name}'"
    }


def stage_files_and_start_nf(
    local_files: List[str],
    number_of_runs: int,
    gef_probe_radius: int,
    req_user_id: str,
    email: str,
    name: str,
    organization: str,
    description: str,
) -> dict:
    """
    Main orchestration function:
    1. Connect to HPC
    2. Navigate to GlycoMap-Engine and setup directory structure
    3. Create inputs/, outputs/, logs/ directories
    4. Upload files to inputs/{user_id}/folder_i/
    5. Create/update input.dat with NRUNS and GEF_PROBE_RADIUS
    6. Create metadata.json with user information
    7. Call pipeline.sh script
    8. Return job metadata
    """
    ssh, sftp = _connect()
    try:
        # Step 1: Setup base directory structure in GlycoMap-Engine
        paths = setup_hpc_directories(ssh, req_user_id)
        
        # Step 2: Get next folder index for this user
        folder_index = get_next_folder_index(ssh, paths["user_inputs_dir"])
        
        # Step 3: Upload and stage files in folder_i
        folder_path = upload_and_stage_files(
            ssh=ssh,
            sftp=sftp,
            local_files=local_files,
            user_inputs_dir=paths["user_inputs_dir"],
            folder_index=folder_index,
            req_user_id=req_user_id,
            email=email,
            name=name,
            organization=organization,
            description=description,
            number_of_runs=number_of_runs,
            gef_probe_radius=gef_probe_radius
        )
        
        # Step 4: Call pipeline.sh script
        pipeline_result = call_pipeline_script(
            ssh=ssh,
            user_inputs_dir=paths["user_inputs_dir"],
            req_user_id=req_user_id,
            email=email,
            name=name
        )
        
        # Build response metadata
        ts = int(time.time())
        meta = {
            "run_name": f"glycomap-{req_user_id[:8]}-{ts}",
            "pid": str(ts),  # Using timestamp as job ID
            "folder_path": folder_path,
            "folder_index": folder_index,
            "hpc_paths": paths,
            "pipeline": pipeline_result,
            "user_inputs_dir": paths["user_inputs_dir"],
            "params": {
                "number_of_runs": number_of_runs,
                "gef_probe_radius": gef_probe_radius,
                "email": email,
                "name": name,
                "organization": organization,
                "description": description
            }
        }
        
        return meta
        
    finally:
        try:
            sftp.close()
        except Exception:
            pass
        ssh.close()
