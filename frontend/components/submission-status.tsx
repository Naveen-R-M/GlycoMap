'use client'

import { CheckCircle, AlertCircle } from 'lucide-react'

interface SubmissionStatusProps {
  isSubmitted: boolean
  isError: boolean
  errorMessage?: string
  jobIds?: string[]
}

export function SubmissionStatus({ 
  isSubmitted, 
  isError, 
  errorMessage, 
  jobIds 
}: SubmissionStatusProps) {
  if (!isSubmitted && !isError) return null

  if (isError) {
    return (
      <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/70">
        <div className="bg-white/95 backdrop-blur-md text-[#1A1A1A] p-8 rounded-xl max-w-md w-full shadow-xl border border-red-400/30">
          <div className="flex items-center mb-4">
          <AlertCircle className="text-red-500 mr-3 h-8 w-8" />
          <h3 className="text-xl font-medium">Submission Failed</h3>
          </div>
          <p className="mb-6 text-[#1A1A1A]/80">{errorMessage || "There was an error submitting your request. Please try again later."}</p>
          <div className="text-sm text-[#1A1A1A]/60 mt-4">
          The form will reset automatically in a few seconds.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50">
      <div className="bg-white/95 backdrop-blur-md text-[#1A1A1A] p-8 rounded-xl max-w-md w-full shadow-xl border border-green-400/30">
        <div className="flex items-center mb-4">
          <CheckCircle className="text-green-600 mr-3 h-8 w-8" />
          <h3 className="text-xl font-medium">Submission Successful</h3>
        </div>
        <p className="mb-6 text-[#1A1A1A]/80">Your files have been uploaded and processing has begun. You&apos;ll receive an email once processing is complete.</p>
        
        {jobIds && jobIds.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium mb-2 text-[#1A1A1A]/70">Job IDs:</h4>
            <div className="bg-[#F5F4F9] p-3 rounded text-xs font-mono overflow-x-auto border border-[#1A1A1A]/10">
              {jobIds.map((id, index) => (
                <div key={index} className="mb-1">{id}</div>
              ))}
            </div>
          </div>
        )}
        
        <div className="text-sm text-[#1A1A1A]/60 mt-4">
          This message will close automatically in a few seconds.
        </div>
      </div>
    </div>
  )
}
