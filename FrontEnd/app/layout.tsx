import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { AnalysisNavigationProvider } from "@/components/analysis-navigation-context"

// --- NEW: Import your new Providers component ---
import Providers from "@/components/Providers";

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Elevv Career AI - Stop Guessing. Get Hired.",
  description:
    "Elevv's AI analyzes your resume against any job description to give you a detailed match score and actionable feedback. Land your dream job, faster.",
  generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
            <AnalysisNavigationProvider>{children}</AnalysisNavigationProvider>
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  )
}
