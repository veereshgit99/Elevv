"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { usePathname } from "next/navigation"

type AnalysisPage = "/dashboard" | "/analysis-results" | "/enhancements"

interface AnalysisNavigationContextType {
  lastAnalysisPage: AnalysisPage
  setLastAnalysisPage: (page: AnalysisPage) => void
}

const AnalysisNavigationContext = createContext<AnalysisNavigationContextType | undefined>(undefined)

export function AnalysisNavigationProvider({ children }: { children: ReactNode }) {
  const [lastAnalysisPage, setLastAnalysisPage] = useState<AnalysisPage>("/dashboard")
  const pathname = usePathname()

  useEffect(() => {
    // Update last analysis page when user visits any analysis-related page
    if (pathname === "/dashboard" || pathname === "/analysis-results" || pathname === "/enhancements") {
      setLastAnalysisPage(pathname as AnalysisPage)
    }
  }, [pathname])

  return (
    <AnalysisNavigationContext.Provider value={{ lastAnalysisPage, setLastAnalysisPage }}>
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
