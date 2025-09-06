'use client'

/**
 * Configuration utility for the SimBioSys Lab web application
 * Loads environment variables with reasonable defaults
 */

// API URLs
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
export const UPLOAD_ENDPOINT = `${API_URL}/upload`

// File Upload Limits
export const MAX_FILES = parseInt(process.env.NEXT_PUBLIC_MAX_FILES || '10', 10)
export const MAX_FILE_SIZE_MB = parseInt(process.env.NEXT_PUBLIC_MAX_FILE_SIZE_MB || '16', 10)
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

// Accepted File Types
export const ACCEPTED_FILE_TYPES = [
  '.pdb',     // Protein Data Bank files
  '.ali',     // Alignment files
  '.dat',     // Data files (including glyc.dat, input.dat)
  '.zip',     // Archive files
  '.tar',     // TAR archives
  '.gz',      // GZIP files
  '.tgz',     // Compressed TAR files
  '.cif',     // Crystallographic Information File
  '.fasta',   // FASTA sequence files
  '.seq'      // Sequence files
]

// Required file patterns - at least one of these must be present to proceed
export const REQUIRED_FILE_PATTERNS = [
  { pattern: /\.pdb$/i, description: 'PDB file' },
  { pattern: /\.ali$/i, description: 'ALI file' },
  { pattern: /glyc\.dat$/i, description: 'glyc.dat' },
  { pattern: /input\.dat$/i, description: 'input.dat' }
]

// Individual file type checkers
export const hasRequiredPdbFiles = (files: File[]): boolean => {
  return files.some(file => /\.pdb$/i.test(file.name))
}

export const hasRequiredAliFiles = (files: File[]): boolean => {
  return files.some(file => /\.ali$/i.test(file.name))
}

export const hasGlycDatFile = (files: File[]): boolean => {
  return files.some(file => /glyc\.dat$/i.test(file.name))
}

export const hasInputDatFile = (files: File[]): boolean => {
  return files.some(file => /input\.dat$/i.test(file.name))
}

// New strict validation - requires ALL four file types
export const hasAllRequiredFiles = (files: File[]): boolean => {
  return hasRequiredPdbFiles(files) && 
         hasRequiredAliFiles(files) && 
         hasGlycDatFile(files) && 
         hasInputDatFile(files)
}

// Get missing requirements for UI display
export const getMissingRequirements = (files: File[]): string[] => {
  const missing: string[] = []
  
  if (!hasRequiredPdbFiles(files)) {
    missing.push('At least one .pdb file')
  }
  if (!hasRequiredAliFiles(files)) {
    missing.push('At least one .ali file')
  }
  if (!hasGlycDatFile(files)) {
    missing.push('glyc.dat file')
  }
  if (!hasInputDatFile(files)) {
    missing.push('input.dat file')
  }
  
  return missing
}

// Get file requirement status for UI
export const getFileRequirementStatus = (files: File[]) => {
  return {
    pdb: hasRequiredPdbFiles(files),
    ali: hasRequiredAliFiles(files),
    glyc: hasGlycDatFile(files),
    input: hasInputDatFile(files)
  }
}

// Backward compatibility - keep the old function but mark as deprecated
// @deprecated Use hasAllRequiredFiles for stricter validation
export const hasRequiredFiles = (files: File[]): boolean => {
  return hasAllRequiredFiles(files)
}

// UI Constants
export const SUBMISSION_SUCCESS_DISPLAY_TIME_MS = 5000
export const SUBMISSION_ERROR_DISPLAY_TIME_MS = 5000

// Default parameters
export const DEFAULT_RUN_COUNT = 1
