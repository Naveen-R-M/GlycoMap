process PROCESS_UPLOADS {
  label 'cpu'
  tag { folder.getName() }

  input:
  val folder

  output:
  val(folder)

  script:
  """
  LOG_DIR="${params.log_root}/${params.user_id}"
  mkdir -p "\${LOG_DIR}"

  # Prefer containers or one environment tool; if both are mandatory, ensure they coexist.
  source /scratch/rajagopalmohanraj.n/simbiosys_web/bin/activate
  conda activate /work/SimBioSys/share/software/allosmod-lib/

  python3 /scratch/rajagopalmohanraj.n/web_server/process_uploads.py \
      "${folder}" "${params.email}" "${params.name}" "${params.user_id}" \
      >  "\${LOG_DIR}/process_uploads_$(basename "${folder}").out" \
      2> "\${LOG_DIR}/process_uploads_$(basename "${folder}").err"

  echo "${folder}"
  """
}
