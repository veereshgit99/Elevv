// app/layout.tsx

// --- NEW: Import Suspense from React ---
import { Suspense } from "react";

import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { AnalysisNavigationProvider } from "@/components/analysis-navigation-context"
import Providers from "@/components/Providers";
import ConditionalHeader from "../components/ConditionalHeader";

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Elevv - Your Career. Elevated",
  description:
    "Elevv's AI analyzes your resume against any job description to give you a detailed match score and actionable feedback. Land your dream job, faster.",
  generator: 'v0.dev'
}

// --- NEW: A simple loading component for the fallback ---
function Loading() {
  // You can add any loading UI here, like a spinner
  return <div>Loading page...</div>;
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className}`}>
        <Providers>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
            <AnalysisNavigationProvider>
              <ConditionalHeader />
              {/* --- MODIFIED: Wrap children in Suspense --- */}
              <Suspense fallback={<Loading />}>
                {children}
              </Suspense>
            </AnalysisNavigationProvider>
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  )
}