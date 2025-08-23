// app/layout.tsx

import "./globals.css"
import { Suspense } from "react";

import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { AnalysisNavigationProvider } from "@/components/analysis-navigation-context"
import Providers from "@/components/Providers";
import ConditionalHeader from "../components/ConditionalHeader";

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Elevv | The AI that gets your resume",
  description:
    "Elevv's AI analyzes your resume against any job description to give you a detailed match score and actionable feedback. Land your dream job, faster.",
  generator: "v0.dev",
  icons: {
    icon: [
      { url: "/logos/Group4.svg" }
    ],
    apple: "/logos/apple-touch-icon.png",
  },
  manifest: "/logos/site.webmanifest",
}

function Loading() {
  return (
    <div className="min-h-screen bg-[#f9fafb] text-black flex items-center justify-center">
      Loading…
    </div>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className}`}>
        <Providers>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
            <AnalysisNavigationProvider>
              <ConditionalHeader />
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
