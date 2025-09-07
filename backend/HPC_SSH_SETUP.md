## HPC + SSH Setup

This document describes how to configure SSH key-based login from your local machine to the HPC login node, and how to configure the backend to use that connection to launch Nextflow remotely.

### Goal

Log in from your machine to the HPC login node with SSH keys (no passwords) and let the backend use that connection to upload, stage, and run Nextflow on the HPC.

---

### Prerequisites

- A POSIX-style shell (macOS / WSL / Linux). Windows users can use WSL or Git Bash. Plain PowerShell works for SSH commands if OpenSSH is installed.
- SSH client tools: ssh, ssh-keygen, ssh-copy-id (or manual copy of the public key).
- An account on the HPC (example host below: `login.explorer.northeastern.edu`).

---

### 1. Create and install an SSH key on your local machine

Recommended: create an ed25519 key with a passphrase.

```bash
# Create a key (recommended: with passphrase)
ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519 -C "your_username"

# Copy the public key to the HPC (you'll enter your HPC password once)
ssh-copy-id -i ~/.ssh/id_ed25519.pub your_username@login.explorer.northeastern.edu

# Quick test: should print the remote hostname and username
ssh -i ~/.ssh/id_ed25519 your_username@login.explorer.northeastern.edu 'hostname; whoami'
```

Optional: add a local SSH shortcut in `~/.ssh/config` to simplify commands:

```text
# ~/.ssh/config
Host hpc
  HostName login.explorer.northeastern.edu
  User your_username
  IdentityFile ~/.ssh/id_ed25519
  IdentitiesOnly yes
```

Then you can run: `ssh hpc 'hostname; whoami'` for the same test.

#### File permissions

Make sure SSH file permissions are strict on your local machine:

```bash
chmod 700 ~/.ssh
chmod 600 ~/.ssh/id_ed25519 ~/.ssh/config
chmod 644 ~/.ssh/id_ed25519.pub
```

---

### 2. On the HPC (first login)

On the HPC, ensure `~/.ssh` exists and `authorized_keys` permissions are strict:

```bash
mkdir -p ~/.ssh
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

If your site uses 2FA or disables password logins, follow your HPC's documentation; you might need to add the key through a web portal or an identity management system.

To avoid host key prompts from automated processes, add the host fingerprint to your `known_hosts` (run from your local machine):

```bash
# Add the login host fingerprint to your local known_hosts
ssh-keyscan -p 22 login.explorer.northeastern.edu >> ~/.ssh/known_hosts
chmod 644 ~/.ssh/known_hosts
```

---

### 3. Backend environment variables

The backend reads a `.env` (or environment variables) to connect to the HPC and run Nextflow. Example values (update to match your account and scratch paths):

```env
# HPC SSH
HPC_HOST=login.explorer.northeastern.edu
HPC_PORT=22
HPC_USER=your_username
HPC_SSH_KEY=/home/you/.ssh/id_ed25519
HPC_KNOWN_HOSTS=/home/you/.ssh/known_hosts

# HPC paths (adjust to your scratch/workspace)
HPC_SCRATCH_ROOT=/scratch/your_username
HPC_NEXTFLOW_PROJECT_DIR=/scratch/your_username/nf-project
HPC_NEXTFLOW_ENTRY=main.nf
HPC_NEXTFLOW_EXTRA_ARGS=-profile slurm

# (Optional) If your HPC requires module initialization
HPC_MODULE_INIT=/etc/profile.d/modules.sh
HPC_MODULES=module use ~/modulefiles && module load ~/modulefiles/allosmod/1.0
```

Notes:

- `HPC_SSH_KEY` should point to the private key path on the machine that runs the backend. Do NOT commit private keys to source control.
- `HPC_KNOWN_HOSTS` should point to a known_hosts file that includes the HPC fingerprint (see `ssh-keyscan` above).

---

### 4. Quick sanity checks

From your local machine (or the host running the backend):

```bash
# Basic connectivity check
ssh hpc 'echo OK'    # should print: OK

# Check Nextflow is available on the remote environment
ssh hpc 'nextflow -version'   # should print the nextflow version
```