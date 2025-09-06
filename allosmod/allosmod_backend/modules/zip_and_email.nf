process ZIP_AND_EMAIL {
  label 'cpu'
  tag "zip-and-email"

  input:
  val all_folders

  output:
  val(true)

  script:
  """
  LOG_DIR="${params.log_root}/${params.user_id}"
  mkdir -p "\${LOG_DIR}"

  source /scratch/rajagopalmohanraj.n/simbiosys_web/bin/activate
  conda activate /work/SimBioSys/share/software/allosmod-lib/

  python3 /scratch/rajagopalmohanraj.n/web_server/zip_and_send_email.py \
      "${params.base_folder}" "${params.email}" "${params.name}" "${params.user_id}" \
      >  "\${LOG_DIR}/zip_and_send_email.out" \
      2> "\${LOG_DIR}/zip_and_send_email.err"

  echo "done"
  """
}
