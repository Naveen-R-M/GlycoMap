"use client"

import React, { useState, useRef, useEffect } from "react"
import Header from "@/components/layout/Header"
import Footer from "@/components/layout/Footer"
import HeroSection from "@/components/hero/HeroSection"
import MultiStepForm from "@/components/form/MultiStepForm"
import { SubmissionStatus } from "@/components/submission-status"

export default function CicadaSimBioSysInterface() {
  const [showForm, setShowForm] = useState(false)
  const [submitError, setSubmitError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [jobIds, setJobIds] = useState<string[]>([])
  const [isSubmitted, setIsSubmitted] = useState(false)
  const formSectionRef = useRef<HTMLDivElement>(null)

  // Scroll detection for form visibility
  useEffect(() => {
    const handleScroll = () => {
      if (formSectionRef.current) {
        const rect = formSectionRef.current.getBoundingClientRect()
        const isVisible = rect.top < window.innerHeight && rect.bottom > 0
        setShowForm(isVisible)
      }
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const scrollToForm = () => {
    formSectionRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const handleSubmitSuccess = (newJobIds: string[]) => {
    setJobIds(newJobIds)
    setIsSubmitted(true)
    setSubmitError(false)
    
    // Clear success message after delay
    setTimeout(() => {
      setIsSubmitted(false)
      setJobIds([])
    }, 5000)
  }

  const handleSubmitError = (error: string) => {
    setSubmitError(true)
    setErrorMessage(error)
    
    // Clear error after delay
    setTimeout(() => {
      setSubmitError(false)
      setErrorMessage('')
    }, 5000)
  }

  return (
    <div className="relative min-h-screen text-[#1A1A1A] font-sans">
      {/* Floating Header - Outside normal document flow */}
      <Header onScrollToForm={scrollToForm} />

      {/* Main Content Container - Starts at viewport top */}
      <main className="relative">
        {/* Hero Section with 3D Scene */}
        <HeroSection onScrollToForm={scrollToForm} />

        {/* Multi-Step Form Section */}
        <MultiStepForm 
          ref={formSectionRef}
          showForm={showForm}
          onSubmitSuccess={handleSubmitSuccess}
          onSubmitError={handleSubmitError}
        />

        {/* Status Messages */}
        <SubmissionStatus 
          isSubmitted={isSubmitted} 
          isError={submitError} 
          errorMessage={errorMessage} 
          jobIds={jobIds} 
        />

        {/* Footer Section */}
        <Footer />
      </main>
    </div>
  )
}
