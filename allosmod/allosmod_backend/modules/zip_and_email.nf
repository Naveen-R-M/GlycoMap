process ZIP_AND_EMAIL {
  label 'cpu'
  tag "zip-and-email"

  input:
  val all_folders

  when:
  all_folders && all_folders.size() > 0

  output:
  val(true)

  script:
  """
  LOG_DIR="${LOG_ROOT}/${params.user_id}"
  mkdir -p "\${LOG_DIR}"

  source /scratch/rajagopalmohanraj.n/simbiosys_web/bin/activate
  conda activate /work/SimBioSys/share/software/allosmod-lib/

  python3 /scratch/rajagopalmohanraj.n/GlycoMap/backend/zip_and_send_email.py \
      "${params.base_folder}" "${params.email}" "${params.name}" "${params.user_id}" \
      >  "\${LOG_DIR}/zip_and_send_email.out" \
      2> "\${LOG_DIR}/zip_and_send_email.err"

  echo "done"
  """
}
