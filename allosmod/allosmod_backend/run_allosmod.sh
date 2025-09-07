#!/bin/bash
#SBATCH --nodes=1
#SBATCH --cpus-per-task=12
#SBATCH --ntasks-per-node=1
#SBATCH --partition=gpu
#SBATCH --gres=gpu:v100-sxm2:1
#SBATCH --mem=128G
#SBATCH --time=08:00:00

# Ensure the second argument (User ID) is provided
if [ -z "$2" ]; then
    echo "Error: Missing User ID argument."
    exit 1
fi

# Define and create log directory
LOG_DIR="/scratch/rajagopalmohanraj.n/allosmod_inputs/logs/$2"
mkdir -p "$LOG_DIR"

# Redirect output and error manually
exec > >(tee -a "$LOG_DIR/allosmod-gpu.out") 2> >(tee -a "$LOG_DIR/allosmod-gpu.err" >&2)

set -e  # Exit on error

export PATH=/work/SimBioSys/share/software/allosmod-lib/bin:$PATH
export PYTHONPATH=/work/SimBioSys/share/software/allosmod-lib/python:$PYTHONPATH
export ALLSMOD_DATA=/work/SimBioSys/share/software/allosmod-lib/share/data/allosmod

# Load the Allosmod module
cd ~/modulefiles/
module use ~/modulefiles/
module load ~/modulefiles/allosmod/1.0

# Check for required arguments
if [[ $# -ne 4 ]]; then
    echo "Usage: $0 <FOLDER_PATH> <USER_ID> <EMAIL> <NAME>"
    exit 1
fi

FOLDER_PATH="$1"
USER_ID="$2"
EMAIL="$3"
NAME="$4"

# Ensure the input folder exists
if [[ ! -d "$FOLDER_PATH" ]]; then
    echo "Error: Directory '$FOLDER_PATH' not found!"
    exit 1
fi

echo "Starting job for USER_ID: $USER_ID, EMAIL: $EMAIL, NAME: $NAME, FOLDER_PATH: $FOLDER_PATH"

job_ids=()

# Loop through each subfolder in the FOLDER_PATH
for folder in "$FOLDER_PATH"/*; do
    if [[ ! -d "$folder" ]]; then
        echo "Skipping: $folder is not a directory"
        continue
    fi

    input_dat="$folder/input.dat"
    echo "Processing folder: $folder"
    echo "Input dat file: $input_dat"

    if [[ ! -f "$input_dat" ]]; then
        echo "No input.dat found in $folder"
        continue
    fi

    echo "Processing: $input_dat"
    n_runs=$(awk -F '=' '/^NRUNS=/ {print $2}' "$input_dat")
    echo "Number of Runs: $n_runs"

    # Run Allosmod setup
    echo "Setting up Allosmod in $folder"
    cd "$folder"
    echo "PWD: $(pwd)"
    allosmod setup

    # Update qsub.sh script
    qsub_script="$folder/qsub.sh"
    if [[ ! -f "$qsub_script" ]]; then
        echo "Error: qsub.sh not found in $folder"
        continue
    fi

    echo "Updating qsub.sh in $folder/qsub.sh"

    sed -i -e '1{/^#!\/bin\/bash/!s|^|#!/bin/bash\n|}' \
           -e '2i#SBATCH --job-name=qsub-'"$(basename "$folder")"'\n# Convert SLURM_ARRAY_TASK_ID to SGE_TASK_ID for compatibility\nSGE_TASK_ID=$SLURM_ARRAY_TASK_ID\n' \
           -e '/^TASK=(/c\TASK=( null \\' "$qsub_script"

    # Append sequence of numbers to `qsub.sh`
    seq 0 48 | sed 's/$/ \\/' >> "$qsub_script"

    # Submit SLURM job array for processing
    echo "Submitting job array for $qsub_script"
    jobid_array=$(sbatch --parsable -a 1-"$n_runs" --output="$LOG_DIR/qsub_%A_%a.out" --error="$LOG_DIR/qsub_%A_%a.err" "$qsub_script")
    echo "Job array ID: $jobid_array"
    job_ids+=("$jobid_array")

    # Submit Python job for processing uploads
    echo "Submitting Python job for process_uploads.py"
    python_job=$(sbatch --parsable --dependency=afterany:$jobid_array <<EOF
#!/bin/bash
#SBATCH --nodes=1
#SBATCH --cpus-per-task=1
#SBATCH --mem=4G
#SBATCH --time=01:00:00
#SBATCH --output=$LOG_DIR/process_uploads_%j.out
#SBATCH --error=$LOG_DIR/process_uploads_%j.err

source /scratch/rajagopalmohanraj.n/simbiosys_web/bin/activate
conda activate /work/SimBioSys/share/software/allosmod-lib/

python3 /scratch/rajagopalmohanraj.n/web_server/process_uploads.py "$folder" "$EMAIL" "$NAME" "$USER_ID"
EOF
)
    echo "Python job submitted with ID: $python_job"
    job_ids+=("$python_job")

done

# Wait for all jobs to finish before proceeding
if [[ ${#job_ids[@]} -gt 0 ]]; then
    dependency_list=$(IFS=,; echo "${job_ids[*]}")
    echo "Submitting zip_and_send_email.py job after all previous jobs complete."

    zip_email_job=$(sbatch --parsable --dependency=afterany:$dependency_list <<EOF
#!/bin/bash
#SBATCH --nodes=1
#SBATCH --cpus-per-task=1
#SBATCH --mem=4G
#SBATCH --time=01:00:00
#SBATCH --output=$LOG_DIR/zip_and_send_email_%j.out
#SBATCH --error=$LOG_DIR/zip_and_send_email_%j.err

source /scratch/rajagopalmohanraj.n/simbiosys_web/bin/activate
conda activate /work/SimBioSys/share/software/allosmod-lib/

python3 /scratch/rajagopalmohanraj.n/web_server/zip_and_send_email.py "$FOLDER_PATH" "$EMAIL" "$NAME" "$USER_ID"
EOF
    )
    echo "Final email job submitted with ID: $zip_email_job"
else
    echo "No jobs were submitted, skipping final email job."
fi
