"use client"

import React from "react"

interface StepIndicatorProps {
  currentStep: number
}

export default function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center mb-8">
      <div className="flex items-center space-x-4">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
            currentStep >= 1 ? "bg-[#1A1A1A] text-white" : "bg-[#1A1A1A]/20 text-[#1A1A1A]/60"
          }`}
        >
          1
        </div>
        <div className={`w-16 h-0.5 transition-colors ${currentStep >= 2 ? "bg-[#1A1A1A]" : "bg-[#1A1A1A]/20"}`} />
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
            currentStep >= 2 ? "bg-[#1A1A1A] text-white" : "bg-[#1A1A1A]/20 text-[#1A1A1A]/60"
          }`}
        >
          2
        </div>
      </div>
    </div>
  )
}
