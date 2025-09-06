process PATCH_QSUB {
  label 'cpu'
  tag { folder.getName() }

  input:
  tuple val(folder), val(nruns)

  output:
  tuple val(folder), path('qsub_patched.sh')

  when:
  file("${folder}/qsub.sh").exists()

  script:
  """
  cp "${folder}/qsub.sh" qsub_patched.sh

  # Ensure shebang
  sed -i -e '1{/^#!\\/bin\\/bash/!s|^|#!/bin/bash\\n|}' qsub_patched.sh

  # Inject small header/shim
  cat > header.tmp <<'HDR'
#SBATCH --job-name=qsub
: "\${SLURM_ARRAY_TASK_ID:=1}"
: "\${SGE_TASK_ID:=${SLURM_ARRAY_TASK_ID}}"
HDR
  awk 'NR==1{print; system("cat header.tmp"); next}1' qsub_patched.sh > qsub_patched.sh.tmp
  mv qsub_patched.sh.tmp qsub_patched.sh

  # Replace TASK block with 0..nruns-1
  {
    echo 'TASK=('
    for i in \$(seq 0 \$(( ${nruns} - 1 ))); do
      echo "  \$i"
    done
    echo ')'
  } > TASK_BLOCK

  if grep -q '^TASK=(' qsub_patched.sh; then
    sed -i '/^TASK=(/,/^)/d' qsub_patched.sh
  fi
  cat TASK_BLOCK >> qsub_patched.sh

  chmod +x qsub_patched.sh
  """
}
