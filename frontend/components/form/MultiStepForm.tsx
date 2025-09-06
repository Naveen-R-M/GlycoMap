"use client"

import React, { forwardRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import StepIndicator from "./StepIndicator"
import StepOne from "./StepOne"
import StepTwo from "./StepTwo"
import { useFormState } from "@/hooks/useFormState"
import { useSubmissionStatus } from "@/hooks/useSubmissionStatus"
import { SubmissionService } from "@/services/submissionService"
import { hasAllRequiredFiles, getMissingRequirements } from "@/app/config"

interface MultiStepFormProps {
  showForm: boolean
  onSubmitSuccess: (jobIds: string[]) => void
  onSubmitError: (error: string) => void
}

const MultiStepForm = forwardRef<HTMLDivElement, MultiStepFormProps>(
  ({ showForm, onSubmitSuccess, onSubmitError }, ref) => {
    const {
      currentStep,
      files,
      numberOfRuns,
      formData,
      setFiles,
      setNumberOfRuns,
      setFormData,
      nextStep,
      prevStep,
      resetForm,
      canProceedToNextStep,
      canSubmit,
    } = useFormState()

    const { isSubmitting, isSubmitted, setIsSubmitting } = useSubmissionStatus()

    const handleSubmit = async () => {
      setIsSubmitting(true)
      
      try {
        const response = await SubmissionService.submit({
          files,
          numberOfRuns,
          formData,
        })
        
        setIsSubmitting(false)
        onSubmitSuccess(response.job_ids)
        
        // Reset form after success
        setTimeout(() => {
          resetForm()
          window.scrollTo({ top: 0, behavior: "smooth" })
        }, 5000)
      } catch (error: any) {
        console.error('Error submitting form:', error)
        setIsSubmitting(false)
        onSubmitError(error.message || 'An unknown error occurred')
      }
    }

    return (
      <section ref={ref} className="relative min-h-screen bg-white">
        <div className="container mx-auto px-6 py-16">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={showForm ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
            transition={{ duration: 0.8 }}
            className="w-full max-w-4xl mx-auto"
          >
            <Card className="bg-white/80 backdrop-blur-sm border border-[#1A1A1A]/10 rounded-2xl shadow-xl">
              <CardContent className="p-8">
                {/* Step Indicator */}
                <StepIndicator currentStep={currentStep} />

                {/* Form Content */}
                <AnimatePresence mode="wait">
                  {currentStep === 1 && (
                    <StepOne
                      files={files}
                      numberOfRuns={numberOfRuns}
                      onFilesChange={setFiles}
                      onNumberOfRunsChange={setNumberOfRuns}
                    />
                  )}
                  {currentStep === 2 && (
                    <StepTwo
                      formData={formData}
                      onFormDataChange={setFormData}
                    />
                  )}
                </AnimatePresence>

                {/* Navigation Buttons */}
                <div className="flex justify-between mt-12">
                  <Button
                    variant="outline"
                    onClick={prevStep}
                    disabled={currentStep === 1}
                    className="bg-[#1A1A1A]/10 border border-[#1A1A1A]/20 text-[#1A1A1A] hover:bg-[#1A1A1A]/20 disabled:opacity-50 px-6 py-3"
                  >
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Previous
                  </Button>

                  {currentStep < 2 ? (
                    <Button
                      onClick={nextStep}
                      disabled={!canProceedToNextStep()}
                      className="bg-[#1A1A1A] text-white hover:bg-[#1A1A1A]/90 px-6 py-3 disabled:opacity-50"
                      title={
                        files.length === 0 
                          ? "Please upload at least one file" 
                          : !hasAllRequiredFiles(files)
                          ? `Missing required files: ${getMissingRequirements(files).join(', ')}`
                          : ""
                      }
                    >
                      Next
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  ) : (
                    <Button
                      onClick={handleSubmit}
                      disabled={isSubmitting || !canSubmit()}
                      className="px-12 py-4 bg-[#1A1A1A] hover:bg-[#1A1A1A]/90 text-white rounded-lg font-medium transition-all duration-300 shadow-lg disabled:opacity-50"
                      title={!canSubmit() ? "Please fill in all required fields with valid information (Full Name, valid Email, and Organization)" : ""}
                    >
                      {isSubmitting ? "Submitting..." : isSubmitted ? "Form Successfully Submitted!" : "Submit"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>
    )
  }
)

MultiStepForm.displayName = "MultiStepForm"

export default MultiStepForm
