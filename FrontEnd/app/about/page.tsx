"use client"

import Link from "next/link"
import { Heart, Target, Lightbulb } from "lucide-react"
import { Button } from "@/components/ui/button"
import Logo from "@/components/Logo"

// A reusable component for each of your company's values
function ValueCard({
    icon: Icon,
    title,
    description,
}: {
    icon: React.ElementType
    title: string
    description: string
}) {
    return (
        <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4">
                <Icon className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
            <p className="text-gray-600">{description}</p>
        </div>
    )
}

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-white text-gray-800">
            {/* Header (Simplified to match your Features page) */}
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
                        We're on a mission to level the playing field in the job market.
                    </h1>
                    <p className="mt-6 text-lg text-gray-600 max-w-2xl mx-auto">
                        Elevv was built on a simple truth: talented candidates often get overlooked because their resumes don’t speak the right language. We’re here to change that, giving every job seeker the tools to stand out and get noticed.
                    </p>
                </section>

                {/* Founder Section */}
                <section className="mb-16 sm:mb-24">
                    <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12 bg-gray-50 p-8 rounded-2xl border border-gray-100">
                        <div className="flex-shrink-0">
                            <img
                                src="/VeereshKoliwad.JPG"
                                alt="Veeresh Koliwad"
                                className="w-48 h-48 rounded-full object-cover shadow-lg border border-gray-200"
                            />
                        </div>
                        <div className="text-center md:text-left">
                            <h2 className="text-3xl font-bold text-gray-900">Meet the Founder</h2>
                            <p className="mt-4 text-lg text-gray-600">
                                Hi, I’m Veeresh Koliwad, creator of Elevv. As a software engineer, I experienced firsthand how frustrating it is to get past automated screening systems. I built Elevv to change that, giving job seekers an AI-powered career coach that delivers targeted insights to transform a good resume into one that wins interviews.
                            </p>
                            <a href="https://www.linkedin.com/in/veereshkoliwad/" target="_blank" rel="noopener noreferrer" className="text-blue-600 font-medium mt-4 inline-block hover:underline">
                                Connect on LinkedIn
                            </a>
                        </div>
                    </div>
                </section>

                {/* Our Values Section */}
                <section className="mb-16 sm:mb-24">
                    <div className="text-center max-w-3xl mx-auto mb-12">
                        <h2 className="text-3xl font-bold text-gray-900">Our Values</h2>
                    </div>
                    <div className="grid md:grid-cols-3 gap-12">
                        <ValueCard
                            icon={Heart}
                            title="User-Centric"
                            description="We put job seekers first, building tools that are intuitive, effective, and truly empowering."
                        />
                        <ValueCard
                            icon={Target}
                            title="Data-Driven Precision"
                            description="Our insights aren’t guesswork, they’re powered by advanced AI, delivering objective, data-driven feedback you can trust."
                        />
                        <ValueCard
                            icon={Lightbulb}
                            title="Constant Innovation"
                            description="The job market never stops evolving, and neither do we. We’re constantly refining our features to keep you ahead."
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