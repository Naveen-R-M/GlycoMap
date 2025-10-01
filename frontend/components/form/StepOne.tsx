"use client"

import React from "react"
import { motion } from "framer-motion"
import { Upload, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import FilePreview from "@/components/file-preview"
import { MAX_FILES, REQUIRED_FILE_PATTERNS, hasAllRequiredFiles, getMissingRequirements, getFileRequirementStatus } from "@/app/config"
import { validateFiles, getFileValidationMessage, isPDBFile } from "@/utils/fileValidation"

interface StepOneProps {
  files: File[]
  numberOfRuns: number
  GEFProbeRadius: number
  onFilesChange: (files: File[]) => void
  onNumberOfRunsChange: (runs: number) => void
  onGEFProbeRadiusChange: (runs: number) => void
}

export default function StepOne({
  files,
  numberOfRuns,
  GEFProbeRadius,
  onFilesChange,
  onNumberOfRunsChange,
  onGEFProbeRadiusChange
}: StepOneProps) {

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || [])

    // Validate files
    const { validFiles, invalidTypeFiles, oversizedFiles } = validateFiles(selectedFiles)

    // Calculate how many files can be added
    const availableSlots = MAX_FILES - files.length
    const filesToAdd = validFiles.slice(0, availableSlots)
    const exceedsMaxCount = validFiles.length - filesToAdd.length

    // Show validation messages if needed
    const validationMessage = getFileValidationMessage(
      invalidTypeFiles.length,
      oversizedFiles.length,
      exceedsMaxCount
    )

    if (validationMessage) {
      alert(validationMessage)
    }

    // Add the valid files
    if (filesToAdd.length > 0) {
      onFilesChange([...files, ...filesToAdd])
    }
  }

  const removeFile = (index: number) => {
    onFilesChange(files.filter((_, i) => i !== index))
  }

  // Filter PDB files for preview
  const pdbFiles = files.filter(f => isPDBFile(f.name))

  return (
    <motion.div
      key="step1"
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -300, opacity: 0 }}
      className="space-y-8"
    >
      <div className="text-center mb-8">
        <h2 className="text-3xl md:text-4xl font-light text-[#1A1A1A] mb-4">
          Upload Files & Configure
        </h2>
        <p className="text-[#1A1A1A]/70">
          Upload your research files and configure analysis parameters
        </p>
        <p className="text-sm text-[#1A1A1A]/50 mt-2">
          Required: At least one .pdb file, at least one .ali file, glyc.dat, and input.dat
        </p>
      </div>

      {/* File Upload */}
      <div className="space-y-4">
        <Label className="text-[#1A1A1A] text-lg">
          Upload Files (Max {MAX_FILES})
          <span className="ml-2 text-xs font-normal text-[#1A1A1A]/60">
            Accepted: .pdb, .ali, .dat, .zip, .tar, .gz, .tgz, .cif, .fasta, .seq
          </span>
        </Label>
        <div className="border-2 border-dashed border-[#1A1A1A]/20 rounded-xl p-8 text-center hover:border-[#1A1A1A]/40 transition-colors bg-[#F5F4F9]/30">
          <Upload className="w-12 h-12 text-[#1A1A1A]/40 mx-auto mb-4" />
          <p className="text-[#1A1A1A]/70 mb-4 text-lg">
            Drag and drop files here or use the buttons below
          </p>

          <div className="flex flex-wrap justify-center gap-2">
            <Button
              variant="outline"
              onClick={() => document.getElementById("folder-upload")?.click()}
              disabled={files.length >= MAX_FILES}
              className="bg-[#1A1A1A]/10 border border-[#1A1A1A]/20 text-[#1A1A1A] hover:bg-[#1A1A1A]/20 px-4 py-2"
            >
              Choose Folder
            </Button>
            <Button
              variant="outline"
              onClick={() => document.getElementById("pdb-upload")?.click()}
              disabled={files.length >= MAX_FILES}
              className="bg-[#8B7DFF]/20 border border-[#8B7DFF]/40 text-[#1A1A1A] hover:bg-[#8B7DFF]/30 px-4 py-2"
            >
              PDB Files Only
            </Button>
          </div>

          {/* File inputs */}
          <Input
            type="file"
            // @ts-ignore
            webkitdirectory=""
            directory=""
            onChange={handleFileUpload}
            className="hidden"
            id="folder-upload"
            disabled={files.length >= MAX_FILES}
          />
          <Input
            type="file"
            multiple
            onChange={handleFileUpload}
            className="hidden"
            id="pdb-upload"
            disabled={files.length >= MAX_FILES}
            accept=".pdb"
          />
        </div>

        {/* File List */}
        {files.length > 0 && (
          <>
            <div className="space-y-2 max-h-40 overflow-y-auto mt-4">
              {files.map((file, index) => {
                const isRequired = REQUIRED_FILE_PATTERNS.some(({ pattern }) => pattern.test(file.name))
                const isPDB = isPDBFile(file.name)

                return (
                  <div key={index} className="flex items-center justify-between bg-white/80 rounded-lg p-3 border border-[#1A1A1A]/10">
                    <div className="flex items-center">
                      <span className={`inline-block w-2 h-2 rounded-full mr-2 ${isRequired ? 'bg-green-500' : 'bg-gray-400'
                        }`}></span>
                      <span className="text-[#1A1A1A] text-sm truncate">
                        {file.name}
                        {isRequired && (
                          <span className="ml-2 text-xs text-green-600 font-medium">
                            (Required file)
                          </span>
                        )}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      className="text-[#1A1A1A]/60 hover:text-[#1A1A1A] hover:bg-[#1A1A1A]/10 h-8 w-8 p-0 rounded-full"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )
              })}
            </div>

            {/* Enhanced Required files status */}
            <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <h4 className="text-sm font-medium text-[#1A1A1A] mb-3">File Requirements Status:</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(() => {
                  const status = getFileRequirementStatus(files)
                  return [
                    { key: 'pdb', label: 'At least one .pdb file', met: status.pdb },
                    { key: 'ali', label: 'At least one .ali file', met: status.ali },
                    { key: 'glyc', label: 'glyc.dat file', met: status.glyc },
                    { key: 'input', label: 'input.dat file', met: status.input }
                  ].map(({ key, label, met }) => (
                    <div key={key} className="flex items-center gap-2">
                      <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-medium text-white ${met ? 'bg-green-500' : 'bg-red-500'
                        }`}>
                        {met ? '✓' : '✗'}
                      </span>
                      <span className={`text-xs ${met ? 'text-green-700' : 'text-red-700'
                        }`}>
                        {label}
                      </span>
                    </div>
                  ))
                })()}
              </div>
              {!hasAllRequiredFiles(files) && (
                <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-xs text-yellow-800">
                    ⚠️ Missing: {getMissingRequirements(files).join(', ')}
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {/* File Previews - Only shown for PDB files */}
        {pdbFiles.length > 0 && (
          <div className="mt-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-[#1A1A1A] text-lg font-medium">File Previews</h3>
              <div className="text-xs text-[#1A1A1A]/70">
                {pdbFiles.length} PDB file(s)
              </div>
            </div>
            <div className="space-y-4 max-h-[800px] overflow-y-auto pr-2">
              {pdbFiles.map((file, index) => (
                <FilePreview
                  key={index}
                  file={file}
                  index={index}
                  totalFiles={pdbFiles.length}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Number of Runs */}
      <div className="space-y-3">
        <Label className="text-[#1A1A1A] text-lg">Number of Runs (1-1000)</Label>
        <Input
          type="number"
          min="1"
          max="1000"
          value={numberOfRuns === 0 ? '' : numberOfRuns}
          onChange={(e) => {
            const value = e.target.value
            if (value === '') {
              onNumberOfRunsChange(0)
            } else {
              const numValue = Number.parseInt(value)
              if (!isNaN(numValue)) {
                onNumberOfRunsChange(Math.max(1, Math.min(1000, numValue)))
              }
            }
          }}
          onBlur={(e) => {
            // When user leaves the field, ensure it has a valid value
            if (numberOfRuns === 0 || numberOfRuns < 1) {
              onNumberOfRunsChange(1)
            }
          }}
          className="bg-white/70 border-[#1A1A1A]/20 text-[#1A1A1A] placeholder-[#1A1A1A]/50 text-lg p-4 focus:border-[#8B7DFF] focus:ring-[#8B7DFF]/20"
        />
      </div>

      {/* GEF Probe Radius */}
      <div className="space-y-3">
        <Label className="text-[#1A1A1A] text-lg">GEF Probe Radius</Label>
        <div className="relative inline-block w-full">
          <Input
            type="number"
            min="1"
            max="10"
            value={GEFProbeRadius === 0 ? '' : GEFProbeRadius}
            onChange={(e) => {
              const value = e.target.value
              if (value === '') {
                onGEFProbeRadiusChange(0)
              } else {
                const numValue = Number.parseInt(value)
                if (!isNaN(numValue)) {
                  onGEFProbeRadiusChange(Math.max(1, Math.min(10, numValue)))
                }
              }
            }}
            onBlur={(e) => {
              // When user leaves the field, ensure it has a valid value
              if (GEFProbeRadius === 0 || GEFProbeRadius < 1) {
                onGEFProbeRadiusChange(3)
              }
            }}
            className="bg-white/70 border-[#1A1A1A]/20 text-[#1A1A1A] placeholder-[#1A1A1A]/50 text-lg p-4 focus:border-[#8B7DFF] focus:ring-[#8B7DFF]/20"
          />
          <span className="absolute left-[2.1rem] top-1/2 -translate-y-1/2 text-[#1A1A1A]/60 text-md pointer-events-none">
            Å
          </span>
        </div>
        <p className="text-sm text-[#1A1A1A]/60">
          The recommended value for GEF Probe Radius is 3 Å, read more about it from the article &nbsp;
          <a
            href="https://www.nature.com/articles/s41565-025-01966-5"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#8B7DFF] hover:text-[#8B7DFF]/80"
          >
            here
          </a>
        </p>
      </div>
    </motion.div>
  )
}
