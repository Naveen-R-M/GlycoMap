import { useState, useCallback } from 'react'
import { FormData } from '@/components/form/StepTwo'
import { DEFAULT_GEF_PROBE_RADIUS, DEFAULT_RUN_COUNT, hasAllRequiredFiles } from '@/app/config'

export const useFormState = () => {
  const [currentStep, setCurrentStep] = useState(1)
  const [files, setFiles] = useState<File[]>([])
  const [numberOfRuns, setNumberOfRuns] = useState(DEFAULT_RUN_COUNT)
  const [GEFProbeRadius, setGEFProbeRadius] = useState(DEFAULT_GEF_PROBE_RADIUS)
  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    email: '',
    organization: '',
    description: '',
  })

  const resetForm = useCallback(() => {
    setCurrentStep(1)
    setFiles([])
    setNumberOfRuns(DEFAULT_RUN_COUNT)
    setGEFProbeRadius(DEFAULT_GEF_PROBE_RADIUS)
    setFormData({
      fullName: '',
      email: '',
      organization: '',
      description: '',
    })
  }, [])

  const nextStep = useCallback(() => {
    setCurrentStep(prev => Math.min(prev + 1, 2))
  }, [])

  const prevStep = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }, [])

  const canProceedToNextStep = useCallback(() => {
    if (currentStep === 1) {
      // Must have at least one file AND all four required file types
      return files.length > 0 && hasAllRequiredFiles(files)
    }
    return true
  }, [currentStep, files])

  const canSubmit = useCallback(() => {
    // Basic email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    
    return formData.fullName.trim() !== '' && 
           formData.email.trim() !== '' && 
           emailRegex.test(formData.email) &&
           formData.organization.trim() !== ''
  }, [formData])

  return {
    // State
    currentStep,
    files,
    numberOfRuns,
    GEFProbeRadius,
    formData,
    
    // Setters
    setFiles,
    setNumberOfRuns,
    setGEFProbeRadius,
    setFormData,
    
    // Actions
    nextStep,
    prevStep,
    resetForm,
    
    // Validators
    canProceedToNextStep,
    canSubmit,
  }
}
