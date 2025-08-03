import Link from "next/link"
import { Brain, Chrome, BarChart3 } from "lucide-react"

import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-black text-white">
      {/* Header Navigation */}
      <header className="sticky top-0 z-50 w-full bg-black/95 backdrop-blur supports-[backdrop-filter]:bg-black/60 border-b border-gray-800">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl text-white">
            <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center">
              <Brain className="h-5 w-5 text-black" />
            </div>
            ELEVV
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
              Features
            </Link>
            <Link href="#how-it-works" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
              How It Works
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
        <section className="container mx-auto px-4 py-8 md:py-16 lg:py-24 relative">
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
                  Get an expert AI analysis of your resume against any job. We show you exactly how to tailor your
                  application to land your dream role.
                </p>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link href="/signup">
                  <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white text-lg px-8 py-6">
                    Get Elevv Free
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
                  <div className="text-gray-400 text-sm font-medium tracking-wide uppercase">Chrome Extension</div>
                  <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                    Analyze jobs directly from any career site.
                  </h2>
                </div>

                <p className="text-xl text-gray-300 leading-relaxed max-w-2xl">
                  Install the Elevv Chrome extension to get instant resume analysis on LinkedIn, Indeed, Glassdoor, and
                  20+ other job sites. See your match score, identify missing keywords, and get strategic
                  recommendations without ever leaving the page. Transform your job search with AI-powered insights at
                  every click.
                </p>

                <div className="pt-4">
                  <Link href="/chrome-extension">
                    <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white text-lg px-8 py-6">
                      Add to Chrome
                    </Button>
                  </Link>
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
                  <div className="text-gray-400 text-sm font-medium tracking-wide uppercase">AI Resume Analysis</div>
                  <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                    Get expert-level insights for every application.
                  </h2>
                </div>

                <p className="text-xl text-gray-300 leading-relaxed max-w-2xl">
                  Upload your resume and any job description to receive detailed analysis, match scoring, and strategic
                  recommendations from our multi-agent AI system. Our AI thinks like a hiring manager with decades of
                  experience, identifying exactly what you need to stand out and land interviews.
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
              Ready to engineer your career success?
            </h2>
            <p className="text-lg text-gray-300 font-medium">
              Finally, an AI that thinks strategically about your future
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
      <footer className="bg-black border-t border-gray-800">
        <div className="container mx-auto px-4 py-12 md:py-16">
          <div className="flex items-center gap-2 justify-start py-8">
            <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center">
              <Brain className="h-5 w-5 text-black" />
            </div>
            <span className="font-bold text-xl text-white">ELEVV</span>
          </div>
          <div className="border-t border-gray-800 mb-8"></div>
          <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
            <div>
              <h3 className="font-medium text-sm mb-3 text-white">Product</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="#analysis" className="text-gray-400 hover:text-white transition-colors">
                    AI Analysis
                  </Link>
                </li>
                <li>
                  <Link href="#pricing" className="text-gray-400 hover:text-white transition-colors">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="#api" className="text-gray-400 hover:text-white transition-colors">
                    API Access
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-sm mb-3 text-white">Company</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="#about" className="text-gray-400 hover:text-white transition-colors">
                    About Us
                  </Link>
                </li>
                <li>
                  <Link href="#careers" className="text-gray-400 hover:text-white transition-colors">
                    Careers
                  </Link>
                </li>
                <li>
                  <Link href="#contact" className="text-gray-400 hover:text-white transition-colors">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-sm mb-3 text-white">Resources</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="#blog" className="text-gray-400 hover:text-white transition-colors">
                    Career Blog
                  </Link>
                </li>
                <li>
                  <Link href="#guides" className="text-gray-400 hover:text-white transition-colors">
                    Resume Guides
                  </Link>
                </li>
                <li>
                  <Link href="#success" className="text-gray-400 hover:text-white transition-colors">
                    Success Stories
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-sm mb-3 text-white">Support</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="#help" className="text-gray-400 hover:text-white transition-colors">
                    Help Center
                  </Link>
                </li>
                <li>
                  <Link href="#community" className="text-gray-400 hover:text-white transition-colors">
                    Community
                  </Link>
                </li>
                <li>
                  <Link href="#status" className="text-gray-400 hover:text-white transition-colors">
                    System Status
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-6 border-t border-gray-800 text-center text-sm text-gray-400">
            &copy; {new Date().getFullYear()} Elevv. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}