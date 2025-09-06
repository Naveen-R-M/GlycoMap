nextflow.enable.dsl = 2

// ---- Params (defaults + CLI override)
params.base_folder = params.base_folder ?: System.getenv('BASE_FOLDER')
params.user_id     = params.user_id     ?: 'unknown'
params.email       = params.email       ?: 'user@example.com'
params.name        = params.name        ?: 'User'
params.log_root    = params.log_root    ?: "./logs"
params.outdir      = params.outdir      ?: "results"

if( !params.base_folder )
  exit 1, "ERROR: --base_folder not set"

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
      def m = (inputDat.text =~ /(?m)^NRUNS=(\d+)/)
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

  // Optional: final message
  workflow.onComplete {
    println ""
    println "✅ Pipeline complete."
    println "  Logs: ${params.log_root}/${params.user_id}"
    println "  Results: ${params.outdir}"
  }
}
