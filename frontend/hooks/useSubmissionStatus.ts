import { useState, useCallback } from 'react'

const STATUS_DISPLAY_DURATION = 5000 // 5 seconds

export const useSubmissionStatus = () => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [jobIds, setJobIds] = useState<string[]>([])

  const setSuccessStatus = useCallback((newJobIds: string[]) => {
    setJobIds(newJobIds)
    setIsSubmitted(true)
    setSubmitError(false)
    setErrorMessage('')
    
    // Auto-clear after duration
    setTimeout(() => {
      setIsSubmitted(false)
      setJobIds([])
    }, STATUS_DISPLAY_DURATION)
  }, [])

  const setErrorStatus = useCallback((error: string) => {
    setSubmitError(true)
    setErrorMessage(error)
    setIsSubmitted(false)
    setJobIds([])
    
    // Auto-clear after duration
    setTimeout(() => {
      setSubmitError(false)
      setErrorMessage('')
    }, STATUS_DISPLAY_DURATION)
  }, [])

  const clearStatus = useCallback(() => {
    setIsSubmitting(false)
    setIsSubmitted(false)
    setSubmitError(false)
    setErrorMessage('')
    setJobIds([])
  }, [])

  return {
    // States
    isSubmitting,
    isSubmitted,
    submitError,
    errorMessage,
    jobIds,
    
    // Actions
    setIsSubmitting,
    setSuccessStatus,
    setErrorStatus,
    clearStatus,
  }
}
