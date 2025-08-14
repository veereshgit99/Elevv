"use client"

import { useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Chrome, BarChart3, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import Logo from "@/components/Logo"
import Footer from "@/components/Footer"

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "authenticated" && session) {
      router.push("/dashboard")
    }
  }, [session, status, router])

  if (status === "authenticated") {
    return <div className="min-h-screen bg-white"></div>
  }

  return (
    <div className="flex min-h-screen flex-col bg-white text-gray-900">
      {/* Header Navigation */}
      <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur pb-16 md:pb-24">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Logo variant="light" size="md" showText={true} className="font-bold text-xl" />
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/features" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
              Features
            </Link>
            <Link href="https://chromewebstore.google.com/category/extensions" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
              Add to Chrome
            </Link>
            <div className="flex items-center gap-2 ml-4">
              <Link href="/login">
                <Button variant="ghost" size="sm">Log In</Button>
              </Link>
              <Link href="/signup">
                <Button size="sm" className="bg-gray-900 hover:bg-gray-800">
                  Sign Up Free <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section (Notion-Inspired) */}
        <section className="container mx-auto px-4 pt-24 pb-16 text-center">
          <div className="max-w-3xl mx-auto mb-8">
            <h1 className="font-bold leading-tight text-white">
              <div className="flex flex-col items-center">
                <div className="text-lg md:text-xl lg:text-4xl font-bold leading-tight text-gray-900">
                  The AI That Understands a Resume Is
                </div>
                <div className="text-4xl md:text-5xl lg:text-5xl font-bold leading-tight text-gray-900 whitespace-nowrap -ml-6 md:-ml-2">
                  MORE THAN JUST KEYWORDS
                </div>
              </div>
            </h1>
            <p className="mt-6 text-lg font-bold text-gray-600 leading-relaxed">
              The AI that gets your resume
            </p>
            <div className="mt-8">
              <Link href="/signup">
                <Button size="lg" className="bg-blue-500 hover:bg-blue-600 h-12 px-8 text-base">
                  Get Elevv For Free
                </Button>
              </Link>
              <div className="mb-8" />
            </div>
          </div>
        </section>

        {/* --- RESTYLED FEATURE SECTIONS --- */}

        {/* AI Analysis Feature Section */}
        <section id="add-to-chrome" className="py-16 md:py-24 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div className="space-y-6">
                <div className="text-black-600 text-sm font-medium tracking-wide">AI Analysis</div>
                <h2 className="text-3xl lg:text-4xl font-bold leading-tight">
                  In-depth analysis and tailored feedback.
                </h2>
                <p className="text-lg text-gray-600 leading-relaxed">
                  Your resume isn’t just scanned — it’s understood. Our multi-agent AI breaks down the role, pinpoints your match score, and gives clear, tailored actions to help you stand out.
                </p>
              </div>
              <div className="relative">
                {/* This is the new, corrected code */}
                <div className="relative rounded-xl overflow-hidden shadow-xl border border-gray-200">
                  <div className="aspect-[4/3] bg-white">
                    <img
                      src="/Images/Analysis.png"
                      alt="Screenshot of Elevv's AI Analysis"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Chrome Extension Feature Section */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div className="relative order-2 lg:order-1">
                {/* This is the new, corrected code */}
                <div className="relative rounded-xl overflow-hidden shadow-xl border border-gray-200">
                  <div className="aspect-[4/3] bg-white">
                    <img
                      src="/Images/OneClickAnalysis.png"
                      alt="Screenshot of Elevv's extension"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-6 order-1 lg:order-2">
                <div className="text-black-600 text-sm font-medium tracking-wide">One-click Analysis</div>
                <h2 className="text-3xl lg:text-4xl font-bold leading-tight">
                  Insights at the speed of a click.
                </h2>
                <p className="text-lg text-gray-600 leading-relaxed">
                  Our extension instantly reads the job description, compares it with your resume, and delivers clear, targeted suggestions right when you need them.
                </p>
                <div className="mt-4">
                  <a
                    href="https://chrome.google.com/webstore/category/extensions"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button size="lg" className="bg-blue-500 hover:bg-blue-600 text-white">
                      Add to Chrome
                    </Button>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Bridging Gaps Section */}
        <section id="add-to-chrome" className="py-16 md:py-24 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div className="space-y-6">
                <div className="text-black-600 text-sm font-medium tracking-wide">Bridging the Gaps</div>
                <h2 className="text-3xl lg:text-4xl font-bold leading-tight">
                  Filling the gaps that matter.
                </h2>
                <p className="text-lg text-gray-600 leading-relaxed">
                  Missing a skill? Get tailored project ideas to close the gap and showcase your initiative.
                </p>
              </div>
              <div className="relative">
                {/* This is the new, corrected code */}
                <div className="relative rounded-xl overflow-hidden shadow-xl border border-gray-200">
                  <div className="aspect-[4/3] bg-white">
                    <img
                      src="/Images/BridgingGaps.png"
                      alt="Screenshot of Elevv's Bridging the Gaps"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="container mx-auto px-4 py-16 text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Beat the Odds. Skip the Line.
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Your shortcut from applying to interviewing
            </p>
            <div className="mt-8">
              <Link href="/signup">
                <Button size="lg" className="bg-blue-500 hover:bg-blue-600 h-12 px-8 text-base">
                  Start Your Free Analysis
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}