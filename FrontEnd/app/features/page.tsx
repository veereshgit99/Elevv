"use client"

import Link from "next/link"
import { BarChart3, Target, Bot, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import Logo from "@/components/Logo"

// A reusable component for each feature block
function FeatureCard({
    icon: Icon,
    title,
    description,
}: {
    icon: React.ElementType
    title: string
    description: string
}) {
    return (
        <div className="h-full flex flex-col items-center text-center p-8 bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-6">
                <Icon className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3 whitespace-nowrap">{title}</h3>
            <p className="text-gray-600 leading-relaxed">{description}</p>
        </div>
    )
}

export default function FeaturesPage() {
    return (
        <div className="min-h-screen bg-white text-gray-800">
            {/* Header Navigation (Consistent with Login Page) */}
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
            <main className="container mx-auto px-4 py-16 sm:py-24">
                {/* Main Headline Section */}
                <section className="text-center max-w-3xl mx-auto mb-16 sm:mb-24">
                    <h1 className="text-4xl sm:text-5xl md:text-5xl font-bold text-gray-900 leading-tight">
                        The Power Behind Your Application
                    </h1>
                    <p className="mt-6 text-lg text-gray-600 max-w-2xl mx-auto">
                        Elevv goes beyond simple keyword matching to provide a true, contextual understanding of your resume against any job, giving you the clarity and tools to stand out.
                    </p>
                </section>

                {/* Features Grid */}
                <section className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                    <div className="h-full">
                        <FeatureCard
                            icon={Bot}
                            title="In-Depth AI Analysis"
                            description="Our multi-agent AI reads your resume and the job description like a recruiter, delivering a clear match score so you know exactly where you stand."
                        />
                    </div>
                    <div className="h-full">
                        <FeatureCard
                            icon={BarChart3}
                            title="Contextual Enhancements"
                            description="Go beyond rephrasing. Get contextual edits, quantified impact, and tailored project ideas that fill skill gaps and align your resume with recruiter expectations."
                        />
                    </div>
                    <div className="h-full">
                        <FeatureCard
                            icon={Target}
                            title="ATS-Friendly Resumes"
                            description="Turn feedback into action. Instantly generate and download a polished, ATS-ready resume that stands out in both automated systems and recruiter reviews."
                        />
                    </div>
                    <div className="h-full">
                        <FeatureCard
                            icon={Zap}
                            title="Seamless Integration"
                            description="Analyze jobs directly from LinkedIn and Indeed with our Chrome extension. Get insights without ever leaving the page or breaking your workflow."
                        />
                    </div>
                </section>

                {/* Final Call to Action */}
                <section className="text-center mt-16 sm:mt-24">
                    <h2 className="text-3xl font-bold text-gray-900 mb-4">Built to help you stand out</h2>
                    <p className="text-gray-600 mb-8">The AI that gets your resume</p>
                    <Link href="/signup">
                        <Button size="lg" className="bg-blue-500 hover:bg-blue-600 h-12 px-8 text-base">
                            Create Your Free Account
                        </Button>
                    </Link>
                </section>
            </main>
        </div>
    )
}