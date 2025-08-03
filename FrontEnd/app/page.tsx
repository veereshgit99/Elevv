import Image from "next/image"
import Link from "next/link"
import { Brain, Target, TrendingUp, Users } from "lucide-react"

import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header Navigation */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl text-black">
            <div className="h-8 w-8 rounded bg-[#FF5722] flex items-center justify-center">
              <Brain className="h-5 w-5 text-white" />
            </div>
            Elevv
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-sm font-medium hover:text-[#FF5722] transition-colors">
              Features
            </Link>
            <Link href="#how-it-works" className="text-sm font-medium hover:text-[#FF5722] transition-colors">
              How It Works
            </Link>
            <Link href="/login">
              <Button
                variant="outline"
                size="sm"
                className="ml-4 border-[#FF5722] text-[#FF5722] hover:bg-[#FF5722] hover:text-white bg-transparent"
              >
                Log In
              </Button>
            </Link>
            <Link href="/signup">
              <Button size="sm" className="bg-[#FF5722] hover:bg-[#E64A19]">
                Sign Up
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="container py-16 md:py-24 lg:py-32">
          <div className="mx-auto max-w-4xl text-center space-y-8">
            <div className="space-y-4">
              <h1 className="text-center">
                <div className="text-2xl md:text-3xl lg:text-4xl font-semibold text-muted-foreground mb-2">
                  The AI That Understands a Resume Is
                </div>
                <div className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl lg:text-6xl">
                  MORE THAN JUST KEYWORDS
                </div>
              </h1>
              <p className="mx-auto max-w-3xl text-sm text-muted-foreground md:text-base leading-relaxed">
                Get an expert AI analysis of your resume against any job. We show you exactly how to tailor your
                application to land your dream role.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/signup">
                <Button size="lg" className="bg-[#FF5722] hover:bg-[#E64A19] text-lg px-8 py-6">
                  Get Your Free Analysis
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="bg-muted/30 py-16 md:py-24">
          <div className="container">
            <div className="mx-auto max-w-2xl text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
                Strategic intelligence for your job search
              </h2>
              <p className="text-lg text-muted-foreground">
                Our AI goes beyond simple keyword matching - get a deep analysis and strategic feedback to re-engineer
                your resume for success.
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              <div className="text-center space-y-4">
                <div className="mx-auto h-16 w-16 rounded-full bg-[#FF5722]/10 flex items-center justify-center">
                  <Target className="h-8 w-8 text-[#FF5722]" />
                </div>
                <h3 className="text-xl font-semibold">🎯 Precision Match Score</h3>
                <p className="text-muted-foreground text-sm">
                  Get a detailed breakdown of how well your resume aligns with specific job requirements, not just
                  keyword matching.
                </p>
              </div>

              <div className="text-center space-y-4">
                <div className="mx-auto h-16 w-16 rounded-full bg-[#FF5722]/10 flex items-center justify-center">
                  <Brain className="h-8 w-8 text-[#FF5722]" />
                </div>
                <h3 className="text-xl font-semibold">🧠 Expert AI Analysis</h3>
                <p className="text-muted-foreground text-sm">
                  Multi-agent AI system analyzes your resume like a seasoned hiring manager with years of experience.
                </p>
              </div>

              <div className="text-center space-y-4">
                <div className="mx-auto h-16 w-16 rounded-full bg-[#FF5722]/10 flex items-center justify-center">
                  <TrendingUp className="h-8 w-8 text-[#FF5722]" />
                </div>
                <h3 className="text-xl font-semibold">📈 Strategic Recommendations</h3>
                <p className="text-muted-foreground text-sm">
                  Receive actionable, specific suggestions to enhance your resume and increase your chances of getting
                  hired.
                </p>
              </div>

              <div className="text-center space-y-4">
                <div className="mx-auto h-16 w-16 rounded-full bg-[#FF5722]/10 flex items-center justify-center">
                  <Users className="h-8 w-8 text-[#FF5722]" />
                </div>
                <h3 className="text-xl font-semibold">👥 Hiring Manager Insights</h3>
                <p className="text-muted-foreground text-sm">
                  Understand what recruiters are really looking for and how to position yourself as the ideal candidate.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Product Demo Section */}
        <section className="container py-16 md:py-24">
          <div className="mx-auto max-w-6xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">See Elevv in action</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Upload your resume and a job description to get instant, expert-level analysis and strategic
                recommendations.
              </p>
            </div>

            <div className="relative mx-auto max-w-5xl">
              <div className="rounded-2xl border bg-background shadow-2xl overflow-hidden">
                <div className="bg-muted/50 px-6 py-4 border-b flex items-center gap-2">
                  <div className="flex gap-2">
                    <div className="h-3 w-3 rounded-full bg-red-400"></div>
                    <div className="h-3 w-3 rounded-full bg-yellow-400"></div>
                    <div className="h-3 w-3 rounded-full bg-green-400"></div>
                  </div>
                  <div className="flex-1 text-center text-sm text-muted-foreground">
                    Elevv Career Analysis Dashboard
                  </div>
                </div>
                <div className="aspect-video">
                  <Image
                    src="/placeholder.svg?height=600&width=1000"
                    alt="Elevv Analysis Dashboard"
                    width={1000}
                    height={600}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Chrome Extension Section */}
        <section className="container py-16 md:py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Works on</span>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                    <span className="text-xs">LinkedIn</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-4 rounded-full bg-green-500"></div>
                    <span className="text-xs">Indeed</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-4 rounded-full bg-purple-500"></div>
                    <span className="text-xs">Glassdoor</span>
                  </div>
                  <span className="text-xs">+19 more</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-[#FF5722]">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                </svg>
                <span className="font-medium">Chrome Extension</span>
              </div>

              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Analyze jobs directly from any career site
              </h2>

              <p className="text-lg text-muted-foreground">
                Install the Elevv Chrome extension to get instant resume analysis on LinkedIn, Indeed, and other job
                sites. See your match score without leaving the page.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/signup">
                  <Button size="lg" className="bg-[#FF5722] hover:bg-[#E64A19]">
                    Add to Chrome
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="lg"
                  className="border-[#FF5722] text-[#FF5722] hover:bg-[#FF5722] hover:text-white bg-transparent"
                >
                  Learn More
                </Button>
              </div>
            </div>

            <div className="relative">
              <div className="rounded-2xl border bg-background shadow-xl overflow-hidden">
                <div className="bg-muted/50 px-4 py-3 border-b flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-red-400"></div>
                    <div className="h-3 w-3 rounded-full bg-yellow-400"></div>
                    <div className="h-3 w-3 rounded-full bg-green-400"></div>
                  </div>
                  <div className="flex-1 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Image src="/placeholder.svg?height=16&width=16" alt="Elevv" width={16} height={16} />
                      <span className="text-sm text-muted-foreground">Elevv Analysis</span>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Image src="/placeholder.svg?height=24&width=24" alt="Airbnb" width={24} height={24} />
                    <span className="font-medium">Software Engineer</span>
                    <div className="ml-auto flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Match Score</span>
                      <div className="bg-[#FF5722] text-white px-2 py-1 rounded text-sm font-medium">87%</div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-[#FF5722]"></div>
                      <div className="flex-1 bg-[#FF5722]/20 rounded-full h-2">
                        <div className="bg-[#FF5722] h-2 rounded-full" style={{ width: "75%" }}></div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-[#FF5722]"></div>
                      <div className="flex-1 bg-[#FF5722]/20 rounded-full h-2">
                        <div className="bg-[#FF5722] h-2 rounded-full" style={{ width: "90%" }}></div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-[#FF5722]"></div>
                      <div className="flex-1 bg-[#FF5722]/20 rounded-full h-2">
                        <div className="bg-[#FF5722] h-2 rounded-full" style={{ width: "60%" }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* AI Resume Analysis Section */}
        <section className="bg-muted/30 py-16 md:py-24">
          <div className="container">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <div className="flex items-center gap-2 text-[#FF5722]">
                  <Brain className="w-5 h-5" />
                  <span className="font-medium">AI Resume Analysis</span>
                </div>

                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  Get expert-level insights for every application
                </h2>

                <p className="text-lg text-muted-foreground">
                  Upload your resume and any job description to get detailed analysis, match scoring, and strategic
                  recommendations from our multi-agent AI system.
                </p>

                <Link href="/signup">
                  <Button size="lg" className="bg-[#FF5722] hover:bg-[#E64A19]">
                    Get Free Analysis
                  </Button>
                </Link>
              </div>

              <div className="relative">
                <div className="absolute top-4 right-4 flex gap-2 text-sm">
                  <div className="flex items-center gap-2 bg-background rounded-full px-3 py-1 shadow-sm">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span>Analyze Resume</span>
                  </div>
                  <div className="flex items-center gap-2 bg-background rounded-full px-3 py-1 shadow-sm">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <span>Identify Keywords</span>
                  </div>
                  <div className="flex items-center gap-2 bg-background rounded-full px-3 py-1 shadow-sm">
                    <div className="w-2 h-2 rounded-full bg-[#FF5722]"></div>
                    <span>Strategic Insights</span>
                  </div>
                </div>

                <div className="rounded-2xl border bg-background shadow-xl overflow-hidden">
                  <div className="bg-muted/50 px-4 py-3 border-b flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <div className="h-3 w-3 rounded-full bg-red-400"></div>
                      <div className="h-3 w-3 rounded-full bg-yellow-400"></div>
                      <div className="h-3 w-3 rounded-full bg-green-400"></div>
                    </div>
                    <div className="flex-1 text-center">
                      <span className="text-sm text-muted-foreground">Elevv Analysis Dashboard</span>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <Image src="/placeholder.svg?height=24&width=24" alt="Airbnb" width={24} height={24} />
                      <span className="font-medium">Software Engineer</span>
                      <div className="ml-auto">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Overall Match</span>
                          <div className="bg-[#FF5722] text-white px-3 py-1 rounded-full text-sm font-medium">87%</div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded bg-[#FF5722]"></div>
                          <div className="flex-1 bg-[#FF5722]/20 rounded h-2">
                            <div className="bg-[#FF5722] h-2 rounded" style={{ width: "85%" }}></div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded bg-[#FF5722]"></div>
                          <div className="flex-1 bg-[#FF5722]/20 rounded h-2">
                            <div className="bg-[#FF5722] h-2 rounded" style={{ width: "70%" }}></div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded bg-[#FF5722]"></div>
                          <div className="flex-1 bg-[#FF5722]/20 rounded h-2">
                            <div className="bg-[#FF5722] h-2 rounded" style={{ width: "90%" }}></div>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded bg-[#FF5722]"></div>
                          <div className="flex-1 bg-[#FF5722]/20 rounded h-2">
                            <div className="bg-[#FF5722] h-2 rounded" style={{ width: "60%" }}></div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded bg-[#FF5722]"></div>
                          <div className="flex-1 bg-[#FF5722]/20 rounded h-2">
                            <div className="bg-[#FF5722] h-2 rounded" style={{ width: "95%" }}></div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded bg-[#FF5722]"></div>
                          <div className="flex-1 bg-[#FF5722]/20 rounded h-2">
                            <div className="bg-[#FF5722] h-2 rounded" style={{ width: "75%" }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Comparison Section */}
        {/* Final CTA Section */}
        <section className="container py-16 md:py-24">
          <div className="mx-auto max-w-2xl text-center space-y-8">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Ready to get strategic about your job search?
            </h2>
            <p className="text-lg text-[#FF5722] font-medium">Finally, an AI that thinks like a Human</p>
            <div className="space-y-4">
              <Link href="/signup">
                <Button size="lg" className="bg-[#FF5722] hover:bg-[#E64A19] text-lg px-8 py-6">
                  Start Your Free Analysis
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-200">
        <div className="container py-12 md:py-16">
          <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
            <div>
              <div className="flex items-center gap-2 font-bold text-xl text-white mb-4">
                <div className="h-8 w-8 rounded bg-[#FF5722] flex items-center justify-center">
                  <Brain className="h-5 w-5 text-white" />
                </div>
                Elevv
              </div>
              <p className="text-sm text-slate-400">
                Your personal career strategist powered by AI. Get expert-level insights to land your dream job.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-sm mb-3 text-white">Product</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="#analysis" className="text-slate-400 hover:text-white transition-colors">
                    AI Analysis
                  </Link>
                </li>
                <li>
                  <Link href="#pricing" className="text-slate-400 hover:text-white transition-colors">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="#api" className="text-slate-400 hover:text-white transition-colors">
                    API Access
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-sm mb-3 text-white">Company</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="#about" className="text-slate-400 hover:text-white transition-colors">
                    About Us
                  </Link>
                </li>
                <li>
                  <Link href="#careers" className="text-slate-400 hover:text-white transition-colors">
                    Careers
                  </Link>
                </li>
                <li>
                  <Link href="#contact" className="text-slate-400 hover:text-white transition-colors">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-sm mb-3 text-white">Resources</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="#blog" className="text-slate-400 hover:text-white transition-colors">
                    Career Blog
                  </Link>
                </li>
                <li>
                  <Link href="#guides" className="text-slate-400 hover:text-white transition-colors">
                    Resume Guides
                  </Link>
                </li>
                <li>
                  <Link href="#success" className="text-slate-400 hover:text-white transition-colors">
                    Success Stories
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-6 border-t border-slate-800 text-center text-sm text-slate-400">
            &copy; {new Date().getFullYear()} Elevv. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
