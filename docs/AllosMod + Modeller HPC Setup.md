# AllosMod + Modeller HPC Setup Guide

**Environment**: SimBioSys HPC Cluster  
**Audience**: Developers & HPC Users  
**Objective**: Enable `module load allosmod` → immediate access to AllosMod + Modeller with Slurm array job generation

## Overview

This guide establishes a production-ready environment where users can run a complete AllosMod workflow in just four commands:

```bash
module load allosmod
allosmod setup              # generates Slurm-ready qsub.sh
sbatch -a 1-N qsub.sh      # runs array job (N = NRUNS from input.dat)
```

## Directory Structure

```
/projects/SimBioSys/share/software/
├── allosmod-env/                      # Shared micromamba/conda environment
│   ├── bin/                           # Symlinks to CLIs (including allosmod)
│   └── opt/allosmod/
│       ├── bin/                       # Wrapper scripts (main allosmod CLI)
│       ├── python/allosmod/           # Python package with setup.py
│       └── data/                      # Runtime data (qsub.sh.in, restyp.dat, *.lib)
├── allosmod-new/src/allosmod-lib/     # Git repository (source staging area)
├── modeller-10.7/                     # Modeller installation
└── modulefiles/
    ├── modeller/10.7                  # Modeller module
    └── allosmod/1.0                   # AllosMod module (auto-loads Modeller)
```

## Prerequisites

- Access to SimBioSys HPC cluster
- Micromamba or conda installed
- Valid Modeller license key from Salilab
- Git access to AllosMod repository

### Installing Micromamba (Recommended)

```bash
# Quick installation
curl -Ls https://micro.mamba.pm/api/micromamba/linux-64/latest | tar -xvj bin/micromamba
sudo mv bin/micromamba /usr/local/bin/
rm -rf bin/

# Or user installation
bash <(curl -L micro.mamba.pm/install.sh)
export PATH="$HOME/.local/bin:$PATH"
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
```

## Step 1: Install Modeller 10.7

### 1.1 Download and Extract

```bash
cd /tmp
# Download modeller-10.7.tar.gz from your licensed Salilab account
gunzip modeller-10.7.tar.gz
tar -xvf modeller-10.7.tar
cd modeller-10.7
```

### 1.2 Run Installation

```bash
./Install
```

**Installation Prompts:**
- **Architecture**: `2` (x86_64 Opteron/EM64T)
- **Install prefix**: `/projects/SimBioSys/share/software/modeller-10.7`
- **License key**: Enter your Salilab license key

### 1.3 Verify Installation

```bash
# Test Modeller binary
/projects/SimBioSys/share/software/modeller-10.7/bin/mod10.7 -v

# Test Python import
/projects/SimBioSys/share/software/modeller-10.7/bin/modpy.sh python3 \
  -c "import modeller; print('Modeller', modeller.__version__)"
```

## Step 2: Create Shared AllosMod Environment

### 2.1 Create Environment

Use either micromamba (recommended) or conda:

```bash
# With micromamba (faster)
micromamba create -y -p /projects/SimBioSys/share/software/allosmod-env python=3.12 pip

# Or with conda
conda create -y -p /projects/SimBioSys/share/software/allosmod-env python=3.12 pip
```

### 2.2 Create Directory Structure

```bash
ENV="/projects/SimBioSys/share/software/allosmod-env"
mkdir -p "$ENV/opt/allosmod/"{bin,python,docs,data}
```

## Step 3: Deploy AllosMod Source

### 3.1 Clone AllosMod Repository

```bash
ROOT="/projects/SimBioSys/share/software"
mkdir -p "$ROOT/allosmod-new/src"
cd "$ROOT/allosmod-new/src"
git clone --recurse-submodules <GIT_URL> allosmod-lib

# Example:
# git clone --recurse-submodules https://github.com/salilab/allosmod.git allosmod-lib
```

### 3.2 Deploy Python Package

```bash
SRC="/projects/SimBioSys/share/software/allosmod-new/src/allosmod-lib"
ENV="/projects/SimBioSys/share/software/allosmod-env"

# Find and copy the allosmod Python package
PKG_DIR=$(find "$SRC" -type f -name "__init__.py" -path "*/allosmod/__init__.py" -printf '%h\n' | head -n1)
if [[ -z "$PKG_DIR" ]]; then
  echo "ERROR: Couldn't find allosmod package under $SRC" >&2
  exit 2
fi

rsync -avP "$PKG_DIR/" "$ENV/opt/allosmod/python/allosmod/"
```

### 3.3 Deploy Runtime Data Files

**Critical Step**: AllosMod jobs require data files like `qsub.sh.in`, `restyp.dat`, and `*.lib` files:

```bash
mkdir -p "$ENV/opt/allosmod/data"

# Copy from common locations
rsync -avP "$SRC/data/" "$ENV/opt/allosmod/data/" 2>/dev/null || true
rsync -avP "$SRC/share/data/allosmod/" "$ENV/opt/allosmod/data/" 2>/dev/null || true

# Find and copy essential data files
find "$SRC" -maxdepth 4 -type f \
  \( -name 'qsub.sh.in' -o -name '*.lib' -o -name '*.dat' -o -name '*.ini' \) \
  -exec cp -f {} "$ENV/opt/allosmod/data/" \;

# Ensure proper permissions
chmod -R a+rX "$ENV/opt/allosmod/data"
```

**Required Files:**
- `$ENV/opt/allosmod/data/qsub.sh.in` (Slurm job template)
- `$ENV/opt/allosmod/data/restyp.dat` (Residue types)
- `$ENV/opt/allosmod/data/top_all_glyco.lib` (Topology library)

### 3.4 Install AllosMod Wrapper

This robust wrapper handles all subcommands and integrates with Modeller:

```bash
cat > "$ENV/opt/allosmod/bin/allosmod" <<'SH'
#!/usr/bin/env bash
set -euo pipefail

# Ensure Modeller's shim is available
if ! command -v modpy.sh >/dev/null 2>&1; then
  export PATH="/projects/SimBioSys/share/software/modeller-10.7/bin:$PATH"
fi

ALENV="${ALLOSMOD_ENV:-/projects/SimBioSys/share/software/allosmod-env}"
ALPKG="$ALENV/opt/allosmod/python/allosmod"
ALDATA="$ALENV/opt/allosmod/data"

usage() {
  cat <<EOF
AllosMod CLI - Allosteric protein modeling pipeline

Usage:
  allosmod setup                 # Generate qsub.sh in current directory
  allosmod <subcommand> [...]    # Run AllosMod subcommands

Examples:
  allosmod setup                 # Prepare Slurm batch script
  allosmod help                  # Show help information
  
Required files in working directory for setup:
  - input.dat (with NRUNS parameter)
  - align.ali (alignment file)
  - list (structure list)
  - lig.pdb (optional ligand file)
EOF
}

[[ $# -ge 1 ]] || { usage; exit 2; }
subcmd="$1"; shift || true

# Prefer direct file path execution (avoids shadowing by local files)
if [[ -f "$ALPKG/${subcmd}.py" ]]; then
  exec modpy.sh python3 "$ALPKG/${subcmd}.py" "$@"
fi

# Fallback to module execution
if [[ "$subcmd" == "setup" ]]; then
  exec modpy.sh python3 -m allosmod.setup "$@"
else
  exec modpy.sh python3 -m "allosmod.${subcmd}" "$@"
fi
SH

chmod +x "$ENV/opt/allosmod/bin/allosmod"
ln -sf "$ENV/opt/allosmod/bin/allosmod" "$ENV/bin/allosmod"
```

## Step 4: Configure Environment Modules

### 4.1 Create Modulefiles Directory

```bash
mkdir -p /projects/SimBioSys/share/software/modulefiles/{modeller,allosmod}
```

### 4.2 Modeller Module

Create `/projects/SimBioSys/share/software/modulefiles/modeller/10.7`:

```tcl
#%Module1.0
## Modeller 10.7 - Comparative protein structure modeling

proc ModulesHelp { } {
    puts stderr "Modeller 10.7: Comparative protein structure modeling package"
    puts stderr ""
    puts stderr "Provides modpy.sh wrapper for Python integration and mod10.7 binary"
    puts stderr "Documentation: https://salilab.org/modeller/"
}

module-whatis "Modeller 10.7 - Comparative protein structure modeling"

set modeller_root /projects/SimBioSys/share/software/modeller-10.7

# Add Modeller binaries to PATH
prepend-path PATH $modeller_root/bin

# Set Modeller home directory
setenv MODELLER_HOME $modeller_root

# Prevent conflicts with other Modeller versions
conflict modeller

# Load message
if { [module-info mode load] } {
    puts stderr "Modeller 10.7 loaded successfully"
}
```

### 4.3 AllosMod Module

Create `/projects/SimBioSys/share/software/modulefiles/allosmod/1.0`:

```tcl
#%Module1.0
## AllosMod 1.0 - Allosteric modeling pipeline with automatic Modeller integration

proc ModulesHelp { } {
    puts stderr "AllosMod 1.0: Allosteric protein modeling pipeline"
    puts stderr ""
    puts stderr "This module provides:"
    puts stderr "  ✓ AllosMod command-line interface"
    puts stderr "  ✓ Python libraries for allosteric modeling"
    puts stderr "  ✓ Automatic Modeller 10.7 dependency loading"
    puts stderr "  ✓ Slurm job generation and management"
    puts stderr ""
    puts stderr "Quick Start:"
    puts stderr "  module load allosmod"
    puts stderr "  cd <project_directory>  # with input.dat, align.ali, list"
    puts stderr "  allosmod setup          # generates qsub.sh"
    puts stderr "  sbatch -a 1-N qsub.sh   # run array job (N=NRUNS)"
    puts stderr ""
    puts stderr "Documentation: https://github.com/salilab/allosmod"
}

module-whatis "AllosMod 1.0 - Allosteric modeling with Slurm integration"

# Environment paths
set alenv    /projects/SimBioSys/share/software/allosmod-env
set albin    $alenv/bin
set alpy     $alenv/opt/allosmod/python
set aldata   $alenv/opt/allosmod/data

# Auto-load Modeller dependency
if { [info procs depends-on] != "" } {
    depends-on modeller/10.7
} else {
    if { ![is-loaded modeller/10.7] } {
        module load modeller/10.7
    }
}

# Environment configuration
prepend-path PATH       $albin
prepend-path PYTHONPATH $alpy

# AllosMod-specific environment variables
setenv ALLOSMOD_ENV    $alenv
setenv ALLOSMOD_DATA   $aldata
setenv ALLOSMOD_PYTHON $alpy

# Prevent conflicts with other AllosMod versions
conflict allosmod

# Status messages
if { [module-info mode load] } {
    puts stderr "✓ AllosMod 1.0 loaded (includes Modeller 10.7)"
    puts stderr "Ready to run: allosmod setup"
}

if { [module-info mode unload] } {
    puts stderr "AllosMod 1.0 unloaded"
}
```

## Step 5: Usage Examples

### 5.1 Interactive Session

```bash
# Load the module
module use /projects/SimBioSys/share/software/modulefiles
module load allosmod

# Verify installation
allosmod --help
modpy.sh python3 -c "import modeller; print('Modeller', modeller.__version__)"
python3 -c "import allosmod; print('AllosMod loaded from:', allosmod.__file__)"
```

### 5.2 Standard AllosMod Workflow

**Required Files in Working Directory:**
- `input.dat` (contains NRUNS parameter)
- `align.ali` (sequence alignment)
- `list` (structure list)
- `lig.pdb` (optional ligand file)

**Four-Step Process:**

```bash
# 1. Load environment
module use /projects/SimBioSys/share/software/modulefiles
module load allosmod

# 2. Generate Slurm script (in project directory)
cd /path/to/your/project
allosmod setup

# 3. Submit array job (N = NRUNS from input.dat)
sbatch -a 1-N qsub.sh

# 4. Monitor job progress
squeue -u $USER
```

### 5.3 Example Batch Script Template

For reference, `allosmod setup` generates a `qsub.sh` similar to:

```bash
#!/bin/bash
#SBATCH --job-name=allosmod
#SBATCH --partition=compute
#SBATCH --time=24:00:00
#SBATCH --cpus-per-task=1
#SBATCH --mem=4G
#SBATCH --array=1-100  # Adjust based on NRUNS
#SBATCH --output=allosmod_%A_%a.out
#SBATCH --error=allosmod_%A_%a.err

set -euo pipefail

# Load AllosMod environment
module use /projects/SimBioSys/share/software/modulefiles
module load allosmod

# Set up Modeller environment for plain Python scripts
export MODELLER_HOME=/projects/SimBioSys/share/software/modeller-10.7
export PATH="$MODELLER_HOME/bin:$PATH"
export PYTHONPATH="$MODELLER_HOME/modlib:$MODELLER_HOME/lib/x86_64-intel8/python3.3:$PYTHONPATH"
export LD_LIBRARY_PATH="$MODELLER_HOME/lib/x86_64-intel8:${LD_LIBRARY_PATH:-}"

# Run AllosMod task for this array index
cd case_${SLURM_ARRAY_TASK_ID}
# ... (AllosMod-specific commands)
```

## Step 6: Maintenance & Updates

### 6.1 Update AllosMod Code

```bash
SRC="/projects/SimBioSys/share/software/allosmod-new/src/allosmod-lib"
ENV="/projects/SimBioSys/share/software/allosmod-env"

# Update repository
cd "$SRC"
git fetch origin
git pull --rebase

# Redeploy Python package
PKG_DIR=$(find "$SRC" -type f -name "__init__.py" -path "*/allosmod/__init__.py" -printf '%h\n' | head -n1)
if [[ -n "$PKG_DIR" ]]; then
    echo "Updating AllosMod Python package..."
    rsync -avP --delete "$PKG_DIR/" "$ENV/opt/allosmod/python/allosmod/"
fi

# Redeploy data files
echo "Updating runtime data files..."
rsync -avP "$SRC/data/" "$ENV/opt/allosmod/data/" 2>/dev/null || true
rsync -avP "$SRC/share/data/allosmod/" "$ENV/opt/allosmod/data/" 2>/dev/null || true

# Update essential files
find "$SRC" -maxdepth 4 -type f \
  \( -name 'qsub.sh.in' -o -name '*.lib' -o -name '*.dat' -o -name '*.ini' \) \
  -exec cp -f {} "$ENV/opt/allosmod/data/" \;

echo "✅ AllosMod update complete"
```

### 6.2 Environment Health Check

Create `check_allosmod_env.sh`:

```bash
#!/bin/bash
set -euo pipefail

echo "=== AllosMod Environment Health Check ==="

ENV="/projects/SimBioSys/share/software/allosmod-env"
MODELLER="/projects/SimBioSys/share/software/modeller-10.7"

# Check directories
[[ -d "$ENV" ]] || { echo "❌ AllosMod env missing: $ENV"; exit 1; }
[[ -d "$MODELLER" ]] || { echo "❌ Modeller missing: $MODELLER"; exit 1; }

# Check critical data files
critical_files=(
    "$ENV/opt/allosmod/data/qsub.sh.in"
    "$ENV/opt/allosmod/data/restyp.dat"
    "$ENV/opt/allosmod/data/top_all_glyco.lib"
)

for file in "${critical_files[@]}"; do
    [[ -f "$file" ]] || { echo "❌ Missing critical file: $file"; exit 1; }
done

# Test module loading
module use /projects/SimBioSys/share/software/modulefiles
if module load allosmod 2>/dev/null; then
    echo "✅ Module loading successful"
else
    echo "❌ Module loading failed"; exit 1
fi

# Test commands
if command -v allosmod >/dev/null; then
    echo "✅ AllosMod CLI available"
else
    echo "❌ AllosMod CLI not found"; exit 1
fi

# Test Modeller integration
if modpy.sh python3 -c "import modeller" 2>/dev/null; then
    echo "✅ Modeller integration working"
else
    echo "❌ Modeller integration failed"; exit 1
fi

# Test Python package
if python3 -c "import allosmod" 2>/dev/null; then
    echo "✅ AllosMod Python package accessible"
else
    echo "❌ AllosMod Python package not found"; exit 1
fi

echo "✅ All health checks passed!"
```

## Troubleshooting Guide

### Common Issues and Solutions

**1. Unknown subcommand error**
```bash
# Problem: allosmod xyz fails
# Solution: Check if subcommand file exists
ls $ALLOSMOD_ENV/opt/allosmod/python/allosmod/xyz.py
```

**2. `__path__` attribute not found on 'allosmod'**
```bash
# Problem: Local allosmod.py file shadowing package
# Solution: Wrapper uses file-path execution to avoid this
# Remove any local allosmod.py files in working directory
rm allosmod.py  # if present
```

**3. ModuleNotFoundError: modeller**
```bash
# Problem: Plain python can't find modeller
# Solution: Ensure MODELLER_HOME is set and paths are correct
module load allosmod
echo $MODELLER_HOME
```

**4. Missing data file errors**
```bash
# Problem: restyp.dat, *.lib files not found
# Solution: Copy to data directory
cp missing_file.dat $ALLOSMOD_ENV/opt/allosmod/data/
```

**5. qsub.sh generation problems**
```bash
# Problem: Malformed Slurm script
# Solution: Check input files and regenerate
allosmod setup --force  # if supported
```

**6. Module not found**
```bash
# Problem: module load allosmod fails
# Solution: Ensure module path is added
module use /projects/SimBioSys/share/software/modulefiles
module avail  # Should show allosmod/1.0
```

### Diagnostic Commands

```bash
# Check module availability
module use /projects/SimBioSys/share/software/modulefiles
module avail allosmod

# Verify environment variables after loading
module load allosmod
env | grep ALLOSMOD

# Test AllosMod components
allosmod --help
python3 -c "import allosmod; print(allosmod.__file__)"
ls $ALLOSMOD_DATA

# Check Modeller integration
modpy.sh python3 -c "import modeller; print(modeller.__version__)"
```

## Performance & Best Practices

### Why This Setup Works

- **Micromamba**: 10x faster environment operations than conda
- **Module System**: Clean dependency management and environment isolation
- **Centralized Data**: Single source of truth for runtime files
- **Robust Wrapper**: Handles edge cases and integrates seamlessly with Modeller
- **Array Jobs**: Efficient parallel execution on HPC clusters

### Resource Optimization

- **Shared Environment**: Reduces storage footprint across users
- **Lazy Loading**: Modules load only when needed
- **Efficient Deployment**: rsync for fast updates with minimal downtime
- **Memory Management**: Optimized for HPC cluster constraints

---

## Quick Reference

### User Workflow (Four Commands)
```bash
module use /projects/SimBioSys/share/software/modulefiles
module load allosmod
allosmod setup              # In directory with input.dat, align.ali, list
sbatch -a 1-N qsub.sh      # N = NRUNS from input.dat
```

### Admin Maintenance
```bash
# Update AllosMod
cd /projects/SimBioSys/share/software/allosmod-new/src/allosmod-lib
git pull --rebase
# Run deployment script (Step 6.1)

# Health check
./check_allosmod_env.sh
```

### Directory Quick Access
```bash
ENV="/projects/SimBioSys/share/software/allosmod-env"
SRC="/projects/SimBioSys/share/software/allosmod-new/src/allosmod-lib"
MODULES="/projects/SimBioSys/share/software/modulefiles"
```

This setup ensures that AllosMod "just works" for all users with minimal configuration while maintaining flexibility for administrators to update and maintain the system efficiently.