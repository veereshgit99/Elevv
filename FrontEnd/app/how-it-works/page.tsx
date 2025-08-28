"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import Logo from "@/components/Logo"

export default function HowItWorksPage() {
    return (
        <div className="min-h-screen bg-white text-gray-800">
            {/* Header */}
            <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b border-gray-200">
                <div className="container mx-auto flex h-16 items-center justify-between px-4">
                    <Logo variant="light" size="md" showText={true} className="font-bold text-xl" />
                    <div className="flex items-center gap-4">
                        <Link href="/login">
                            <Button variant="ghost">Log In</Button>
                        </Link>
                        <Link href="/signup">
                            <Button className="bg-gray-900 hover:bg-gray-800">Sign Up</Button>
                        </Link>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="container mx-auto px-4">
                {/* Intro Section */}
                <section className="text-center py-16 sm:py-24">
                    <h1 className="text-4xl sm:text-5xl font-bold text-gray-900">How Elevv Works</h1>
                    <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
                        Your resume → job match in just a few clicks.
                    </p>

                    {/* Demo Video */}
                    <div className="mt-10 w-full max-w-4xl mx-auto rounded-lg overflow-hidden border-2 border-gray-200 shadow-md">
                        <video
                            width="100%"
                            height="auto"
                            playsInline
                            autoPlay
                            loop
                            muted
                            preload="metadata"
                        >
                            <source src="/elevv_extension_blurred.mp4" type="video/mp4" />
                            Your browser does not support the video tag.
                        </video>
                    </div>
                    <p className="mt-2 text-sm text-gray-500">Demo: Elevv chrome extension in action — from scanning a job posting to getting your match score and tailored resume suggestions.</p>
                </section>

                <hr className="border-gray-200" />

                {/* Steps */}
                <section className="py-16 sm:py-24 space-y-12 max-w-3xl mx-auto">
                    {/* Step 1 */}
                    <div>
                        <span className="inline-block px-3 py-1 text-sm font-semibold text-blue-600 bg-blue-100 rounded-full mb-4">
                            Step 1
                        </span>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Create your Elevv account</h2>
                        <p className="text-lg text-gray-600">
                            Sign up for a free Elevv account and upload your resume. This becomes your base for every job analysis.
                        </p>
                    </div>

                    {/* Step 2 */}
                    <div>
                        <span className="inline-block px-3 py-1 text-sm font-semibold text-blue-600 bg-blue-100 rounded-full mb-4">
                            Step 2
                        </span>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Pick a Job</h2>
                        <p className="text-lg text-gray-600 mb-4">
                            Found a role you like? You can use Elevv in two ways:
                        </p>
                        <ul className="list-disc list-inside text-lg text-gray-600 space-y-2">
                            <li>
                                On <strong>LinkedIn/Indeed</strong>, open the Elevv extension — it will
                                auto-scan the job posting.
                            </li>
                            <li>
                                On the <strong> elevv website</strong>, simply paste the job details into the
                                dashboard.
                            </li>
                        </ul>
                    </div>


                    {/* Step 3 */}
                    <div>
                        <span className="inline-block px-3 py-1 text-sm font-semibold text-blue-600 bg-blue-100 rounded-full mb-4">
                            Step 3
                        </span>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">See Your Match</h2>
                        <p className="text-lg text-gray-600">
                            With one click, Elevv compares your resume to the job. You’ll see a clear match score, your top strengths, and any gaps that need attention.
                        </p>
                    </div>

                    {/* Step 4 */}
                    <div>
                        <span className="inline-block px-3 py-1 text-sm font-semibold text-blue-600 bg-blue-100 rounded-full mb-4">
                            Step 4
                        </span>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Tailor & Apply</h2>
                        <p className="text-lg text-gray-600">
                            Click <strong>“Tailor Your Resume”</strong> to get AI-powered suggestions: reword bullet points, add missing skills, and highlight achievements.
                            <i><strong> Apply with confidence!</strong></i>
                        </p>
                    </div>
                </section>

                {/* Final CTA */}
                <section className="text-center py-16 sm:py-24">
                    <h2 className="text-3xl font-bold text-gray-900 mb-4">Ready to Stand Out?</h2>
                    <p className="text-gray-600 mb-8">Your shortcut from applying to interviewing.</p>
                    <Link href="/signup">
                        <Button size="lg" className="bg-blue-500 hover:bg-blue-600 h-12 px-8 text-base">
                            Start your free analysis
                        </Button>
                    </Link>
                </section>
            </main>
        </div>
    )
}
