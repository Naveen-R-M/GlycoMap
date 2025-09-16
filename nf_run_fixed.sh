#!/usr/bin/env bash
# nf_run_fixed.sh - Fixed version that handles Java library conflicts
set -euo pipefail

# --- Config ---
JDK_MODULE="${JDK_MODULE:-OpenJDK/22.0.2}"
NEXTFLOW_MODULE="${NEXTFLOW_MODULE:-nextflow}"

# --- Initialize module system ---
if ! command -v module >/dev/null 2>&1; then
  if [ -f /etc/profile.d/modules.sh ]; then
    . /etc/profile.d/modules.sh
  elif [ -f /usr/share/Modules/init/bash ]; then
    . /usr/share/Modules/init/bash
  fi
fi

# --- Clean environment to prevent Java conflicts ---
echo "Cleaning Java environment..."
unset JAVA_HOME || true
unset LD_LIBRARY_PATH || true
unset NXF_JAVA_HOME || true
unset CLASSPATH || true

# --- Purge all modules first ---
module purge 2>/dev/null || true

# --- Load modules in correct order ---
echo "Loading Java module: ${JDK_MODULE}"
module load "${JDK_MODULE}"

echo "Loading Nextflow module: ${NEXTFLOW_MODULE}"  
module load "${NEXTFLOW_MODULE}"

# --- Verify Java is working ---
echo "Java version check:"
java -version

# --- Verify Nextflow is working ---
echo "Testing Nextflow:"
if nextflow -version >/dev/null 2>&1; then
    echo "✅ Nextflow is working correctly"
    nextflow -version | head -5
else
    echo "❌ Nextflow test failed - attempting manual Java setup"
    
    # Manual Java environment setup as fallback
    JAVA_HOME="/shared/EL9/explorer/OpenJDK/22.0.2/jdk-22.0.2"
    export JAVA_HOME
    export PATH="$JAVA_HOME/bin:$PATH"
    
    echo "Manual Java setup:"
    echo "JAVA_HOME: $JAVA_HOME"
    java -version
    
    # Test Nextflow again
    if nextflow -version >/dev/null 2>&1; then
        echo "✅ Manual Java setup successful"
    else
        echo "❌ FATAL: Cannot fix Java/Nextflow compatibility"
        exit 1
    fi
fi

# --- Set environment for Nextflow execution ---
export TERM="${TERM:-xterm-256color}"
export NXF_ANSI_LOG=true
export NXF_ANSI_SUMMARY=true

# --- Module verification ---
echo "== Module list ======================================================"
module list 2>&1 || true
echo "====================================================================="
echo "== Final Java ======================================================"
java -version
echo "====================================================================="
echo "== Final Nextflow =================================================="
nextflow -version
echo "====================================================================="

# --- Run Nextflow ---
if [ "$#" -gt 0 ]; then
    echo "Running: nextflow $*"
    nextflow "$@"
else
    echo "No arguments provided; running version check"
    nextflow -version
fi