"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

interface AnalysisNavigationContextType {
  currentStep: number
  setCurrentStep: (step: number) => void
  completedSteps: number[]
  markStepCompleted: (step: number) => void
}

const AnalysisNavigationContext = createContext<AnalysisNavigationContextType | undefined>(undefined)

export function AnalysisNavigationProvider({ children }: { children: ReactNode }) {
  const [currentStep, setCurrentStep] = useState(1)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])

  const markStepCompleted = (step: number) => {
    setCompletedSteps((prev) => [...new Set([...prev, step])])
  }

  return (
    <AnalysisNavigationContext.Provider
      value={{
        currentStep,
        setCurrentStep,
        completedSteps,
        markStepCompleted,
      }}
    >
      {children}
    </AnalysisNavigationContext.Provider>
  )
}

export function useAnalysisNavigation() {
  const context = useContext(AnalysisNavigationContext)
  if (context === undefined) {
    throw new Error("useAnalysisNavigation must be used within an AnalysisNavigationProvider")
  }
  return context
}
