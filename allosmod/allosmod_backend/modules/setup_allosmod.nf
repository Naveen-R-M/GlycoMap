process SETUP_ALLOSMOD {
  label 'cpu'
  tag { folder.getName() }

  input:
  tuple val(folder), val(nruns)

  output:
  tuple val(folder), val(nruns)

  script:
  """
  cd "${folder}"
  echo "PWD=\$(pwd)"
  allosmod setup
  echo "${folder} ${nruns}"
  """
}
