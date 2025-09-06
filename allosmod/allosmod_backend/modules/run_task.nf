process RUN_TASK {
  label 'gpu'
  tag { "${folder.getName()}[#${run_id}]" }

  input:
  tuple val(folder), val(run_id), path(patched_qsub)

  output:
  tuple val(folder), val(run_id)

  script:
  """
  LOG_DIR="${params.log_root}/${params.user_id}"
  mkdir -p "\${LOG_DIR}"

  export SGE_TASK_ID=\$(( ${run_id} + 1 ))

  cd "${folder}"

  bash "${patched_qsub}" \
    >  "\${LOG_DIR}/qsub_${folder.getName()}_${run_id}.out" \
    2> "\${LOG_DIR}/qsub_${folder.getName()}_${run_id}.err"

  echo "${folder} ${run_id}"
  """
}
