#!/usr/bin/env bash
# nf_run.sh — clean Nextflow launcher for Slurm HPC
# - Loads a consistent JDK (default OpenJDK/22.0.2)
# - Loads Nextflow module
# - Clears conflicting JAVA_* / LD_LIBRARY_PATH
# - Silences tput warnings
# - Shows versions and either runs "hello" or any Nextflow args you pass
set -euo pipefail

# --- Config (override by exporting before calling) ---
JDK_MODULE="${JDK_MODULE:-OpenJDK/22.0.2}"
NEXTFLOW_MODULE="${NEXTFLOW_MODULE:-nextflow}"

# --- Ensure 'module' command exists in non-interactive shells ---
if ! command -v module >/dev/null 2>&1; then
  if [ -f /etc/profile.d/modules.sh ]; then
    # shellcheck disable=SC1091
    . /etc/profile.d/modules.sh
  elif [ -f /usr/share/Modules/init/bash ]; then
    # shellcheck disable=SC1091
    . /usr/share/Modules/init/bash
  fi
fi

# --- Load modules cleanly ---
echo "Loading Java module: ${JDK_MODULE}"
if ! module load "${JDK_MODULE}"; then
  echo "ERROR: Failed to load Java module: ${JDK_MODULE}"
  echo "Available modules:"
  module avail 2>&1 | head -10
  exit 1
fi

echo "Loading Nextflow module: ${NEXTFLOW_MODULE}"
if ! module load "${NEXTFLOW_MODULE}"; then
  echo "ERROR: Failed to load Nextflow module: ${NEXTFLOW_MODULE}"
  echo "Searching for available Nextflow modules:"
  module avail 2>&1 | grep -i nextflow || echo "No Nextflow modules found"
  echo "Trying alternative Nextflow module names..."
  
  # Try common alternative names
  for alt_name in "Nextflow" "nextflow/latest" "Nextflow/22.04.0" "nextflow/22.04.0"; do
    echo "Trying: $alt_name"
    if module load "$alt_name" 2>/dev/null; then
      echo "SUCCESS: Loaded $alt_name"
      NEXTFLOW_MODULE="$alt_name"
      break
    fi
  done
  
  # Final check
  if ! command -v nextflow >/dev/null 2>&1; then
    echo "FATAL: Could not load any Nextflow module"
    exit 1
  fi
fi

# --- Prevent mixed JDK native libs ---
unset LD_LIBRARY_PATH || true
unset NXF_JAVA_HOME || true
unset JAVA_HOME || true

# --- Quiet cosmetic tput warnings (terminfo) ---
export TERM="${TERM:-dumb}"

# --- Diags ---
echo "== Module list ======================================================"
module list 2>&1 || true
echo "====================================================================="
echo "== Java ============================================================="
command -v java || { echo "java not found"; exit 1; }
java -version
echo "====================================================================="
echo "== Nextflow ========================================================="
command -v nextflow || { echo "nextflow not found in PATH"; exit 1; }
nextflow -version
echo "====================================================================="

# --- Run Nextflow ---
if [ "$#" -gt 0 ]; then
  echo "Running: nextflow $*"
  nextflow "$@"
else
  echo "No arguments provided; running demo workflow:"
  echo "  nextflow run hello -with-report"
  nextflow run hello -with-report
fi