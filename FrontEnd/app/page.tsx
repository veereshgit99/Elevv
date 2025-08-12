"use client"

import { useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Chrome, BarChart3 } from "lucide-react"

import { Button } from "@/components/ui/button"
import Logo from "@/components/Logo"
import Footer from "@/components/Footer"; // Import the new component

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    // If user is authenticated, redirect to dashboard
    if (status === "authenticated" && session) {
      router.push("/dashboard")
    }
  }, [session, status, router])

  // Show minimal placeholder while redirecting authenticated users
  if (status === "authenticated") {
    return <div className="min-h-screen bg-black"></div> // Match the landing page background
  }

  return (
    <div className="flex min-h-screen flex-col bg-black text-white">
      {/* Header Navigation */}
      <header className="sticky top-0 z-50 w-full bg-black/95 backdrop-blur supports-[backdrop-filter]:bg-black/60 border-b border-gray-800">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Logo variant="dark" size="md" showText={true} className="font-bold text-xl" />
          <nav className="hidden md:flex items-center gap-8">
            <Link href="/features" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
              Features
            </Link>
            <Link href="#add-to-chrome" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
              Add to Chrome
            </Link>
            <Link href="/login">
              <Button
                variant="outline"
                size="sm"
                className="ml-4 border-gray-600 text-gray-300 hover:bg-white hover:text-black bg-transparent"
              >
                Log In
              </Button>
            </Link>
            <Link href="/signup">
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                SignUp
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section with Overlapping Video */}
        <section className="container mx-auto px-4 py-8 md:py-16 lg:py-24 relative bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-900 to-black">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center min-h-[70vh]">
            {/* Left Side - Text Content */}
            <div className="space-y-8 relative z-20 lg:ml-8 lg:-mt-16">

              {/* Headlines */}
              <div className="space-y-4">
                <h1 className="font-bold leading-tight text-white">
                  <div className="text-lg md:text-xl lg:text-2xl text-gray-200 mb-2">
                    The AI That Understands a Resume Is
                  </div>
                  <div className="text-2xl md:text-3xl lg:text-4xl">
                    <div>MORE THAN JUST</div>
                    <div>KEYWORDS</div>
                  </div>
                </h1>

                <p className="text-sm md:text-base text-gray-200 max-w-xl leading-relaxed">
                  Get an in-depth analysis of your resume against any job. We show you exactly how to tailor your
                  resume to land your dream role.
                </p>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link href="/signup">
                  <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white text-lg px-8 py-6">
                    Get Elevv For Free
                  </Button>
                </Link>
              </div>
            </div>

            {/* Right Side - Overlapping Video Card */}
            <div className="relative lg:absolute lg:right-8 lg:top-[45%] lg:-translate-y-1/2 lg:w-[65vw] lg:max-w-5xl z-10">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-br from-gray-900 to-black">
                {/* Video */}
                <div className="relative aspect-video">
                  <video className="w-full h-full object-cover" autoPlay muted loop playsInline>
                    <source
                      src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
                      type="video/mp4"
                    />
                    {/* Fallback gradient background */}
                    <div className="w-full h-full bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900"></div>
                  </video>

                  {/* Subtle overlay for better text contrast if needed */}
                  <div className="absolute inset-0 bg-black/10"></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Chrome Extension Feature Section */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div className="space-y-8 relative z-20">
                <div className="space-y-2">
                  <div className="text-gray-400 text-sm font-medium tracking-wide">AI Analysis</div>
                  <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold leading-tight">
                    Detailed Analysis and Tailored Resumes for Every Application
                  </h2>
                </div>

                <p className="text-lg text-gray-400 leading-relaxed max-w-2xl">
                  Our AI fine-tunes your resume with precision. Spotting strengths, closing gaps, and turning every application into a stronger bet.
                </p>

                <div className="pt-4">
                </div>
              </div>

              <div className="relative">
                <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                  <div className="aspect-video bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 p-8 flex items-center justify-center">
                    <div className="w-full max-w-md bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                      <div className="flex items-center gap-3 mb-4">
                        <Chrome className="h-6 w-6 text-blue-400" />
                        <span className="text-white font-semibold">Elevv Analysis</span>
                        <div className="ml-auto bg-green-500 text-white px-2 py-1 rounded text-sm font-medium">87%</div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm text-gray-300">
                          <span>Skills Match</span>
                          <span>92%</span>
                        </div>
                        <div className="w-full bg-white/20 rounded-full h-2">
                          <div className="bg-blue-400 h-2 rounded-full" style={{ width: "92%" }}></div>
                        </div>
                        <div className="flex items-center justify-between text-sm text-gray-300">
                          <span>Experience</span>
                          <span>85%</span>
                        </div>
                        <div className="w-full bg-white/20 rounded-full h-2">
                          <div className="bg-purple-400 h-2 rounded-full" style={{ width: "85%" }}></div>
                        </div>
                        <div className="flex items-center justify-between text-sm text-gray-300">
                          <span>Keywords</span>
                          <span>78%</span>
                        </div>
                        <div className="w-full bg-white/20 rounded-full h-2">
                          <div className="bg-orange-400 h-2 rounded-full" style={{ width: "78%" }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* AI Analysis Feature Section */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div className="relative order-2 lg:order-1">
                <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                  <div className="aspect-video bg-gradient-to-br from-emerald-900 via-teal-900 to-cyan-900 p-8 flex items-center justify-center">
                    <div className="w-full max-w-lg bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                      <div className="flex items-center gap-3 mb-6">
                        <BarChart3 className="h-6 w-6 text-emerald-400" />
                        <span className="text-white font-semibold">AI Analysis Report</span>
                      </div>
                      <div className="space-y-4">
                        <div className="bg-white/10 rounded-lg p-3">
                          <div className="text-emerald-400 text-sm font-medium mb-1">✓ Strengths Identified</div>
                          <div className="text-gray-300 text-xs">
                            Strong technical background, leadership experience
                          </div>
                        </div>
                        <div className="bg-white/10 rounded-lg p-3">
                          <div className="text-yellow-400 text-sm font-medium mb-1">⚠ Areas to Improve</div>
                          <div className="text-gray-300 text-xs">Add cloud computing skills, quantify achievements</div>
                        </div>
                        <div className="bg-white/10 rounded-lg p-3">
                          <div className="text-blue-400 text-sm font-medium mb-1">💡 Strategic Recommendations</div>
                          <div className="text-gray-300 text-xs">
                            Highlight specific metrics, include relevant certifications
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-8 order-1 lg:order-2">
                <div className="space-y-2">
                  <div className="text-gray-400 text-sm font-medium tracking-wide">One-click Analysis</div>
                  <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold leading-tight">
                    Insights at the Speed of a Click
                  </h2>
                </div>

                <p className="text-lg text-gray-400 leading-relaxed max-w-2xl">
                  Our AI instantly parses the job description, compares it with your resume, and delivers clear, targeted suggestions right when you need them.
                </p>

                <div className="pt-4">
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="container mx-auto px-4 py-16 md:py-24 lg:py-32 relative">
          <div className="mx-auto max-w-2xl text-center space-y-8">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-white">
              Beat the Odds. Skip the Line.
            </h2>
            <p className="text-lg text-gray-450 font-medium">
              Your shortcut from applying to interviewing
            </p>
            <div className="space-y-4">
              <Link href="/signup">
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white text-lg px-8 py-6">
                  Start Your Free Analysis
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  )
}