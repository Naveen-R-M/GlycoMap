nextflow.enable.dsl = 2

// ---- Require essentials
if( !params.user_id )  exit 1, "ERROR: --user_id is required (provided via -params-file)"
if( !params.email )    exit 1, "ERROR: --email is required (provided via -params-file)"
if( !params.name )     exit 1, "ERROR: --name is required (provided via -params-file)"

// Derive from INPUTS_ROOT (set in nextflow.config env {})
params.base_folder = "${System.getenv('INPUTS_ROOT')}/${params.user_id}"

// Optional fields
params.organization = params.organization ?: ''
params.description  = params.description  ?: ''

// ---- Include processes/subworkflows from modules
include { SETUP_ALLOSMOD      } from './modules/setup_allosmod.nf'
include { PATCH_QSUB          } from './modules/patch_qsub.nf'
include { RUN_TASK            } from './modules/run_task.nf'
include { PROCESS_UPLOADS     } from './modules/process_uploads.nf'
include { ZIP_AND_EMAIL       } from './modules/zip_and_email.nf'

// ---- Channels local to main (discovery + planning)
// 1) Discover folders
Channel
  .fromPath("${params.base_folder}/*", type: 'dir')
  .set { FOLDERS }

// 2) (folder, nruns)
FOLDERS
  .map { folder ->
    def inputDat = file("${folder}/input.dat")
    def nruns = 0
    if( inputDat.exists() ) {
      def m = (inputDat.text =~ /(?m)^\s*NRUNS\s*=\s*(\d+)/)
      if( m.find() ) nruns = m.group(1) as int
    }
    tuple(folder, nruns)
  }
  .filter { it[1] > 0 }
  .set { FOLDER_NR }

// ---- Orchestration
workflow {
  // A) Setup once per folder
  READY_FOLDERS = SETUP_ALLOSMOD( FOLDER_NR )  // emits (folder, nruns)

  // B) Patch qsub per folder
  PATCHED = PATCH_QSUB( READY_FOLDERS )        // emits (folder, patched_qsub)

  // C) Expand to per-run tuples and join with script
  RUNS = FOLDER_NR
    .flatMap { folder, nruns -> (0..<nruns).collect { rid -> tuple(folder, rid) } }

  RUN_INPUTS = RUNS
    .join(PATCHED, by: 0)
    .map { left, right ->
      def (folder, run_id) = left
      def (_f, patched)    = right
      tuple(folder, run_id, patched)
    }

  // D) Execute runs (GPU)
  RUN_DONE = RUN_TASK( RUN_INPUTS )            // emits (folder, run_id)

  // E) After all runs in a folder → post step
  FOLDERS_FINISHED = RUN_DONE
    .groupTuple(by: 0)
    .map { folder, _ -> folder }

  UP_DONE = PROCESS_UPLOADS( FOLDERS_FINISHED ) // emits folder

  // F) Once all folders are done → final zip+email
  ALL_DONE = UP_DONE.collect()
  ZIP_AND_EMAIL( ALL_DONE )

}

// Optional: final message
workflow.onComplete {
  println ""
  println "✅ Pipeline complete."
  println "  Logs: ${System.getenv('LOG_ROOT')}/${params.user_id}"
  println "  Results: ${params.outdir}"
}