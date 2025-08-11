"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft } from 'lucide-react'
import { Button } from "@/components/ui/button"
import Logo from "@/components/Logo"
import { forgotPassword } from "@/utils/api"

// Reusable ChatGPT-like floating label input
function FloatingInput({
    id,
    type = "text",
    value,
    onChange,
    label,
    autoComplete,
}: {
    id: string
    type?: string
    value: string
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
    label: string
    autoComplete?: string
}) {
    return (
        <div className="relative">
            <input
                id={id}
                type={type}
                value={value}
                onChange={onChange}
                autoComplete={autoComplete}
                placeholder=" "
                className="peer w-full h-12 rounded-2xl border border-gray-300 bg-white px-4 text-[15px] text-gray-900 shadow-sm transition-all outline-none
                   focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
            />
            <label
                htmlFor={id}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 px-1 text-[15px] text-gray-500 transition-all
                   bg-white
                   peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-xs peer-focus:text-blue-600
                   peer-[&:not(:placeholder-shown)]:top-0 peer-[&:not(:placeholder-shown)]:-translate-y-1/2 peer-[&:not(:placeholder-shown)]:text-xs peer-[&:not(:placeholder-shown)]:text-gray-500"
            >
                {label}
            </label>
        </div>
    )
}

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState("")
    const router = useRouter()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!email) return

        setIsSubmitting(true)
        setError("")

        try {
            await forgotPassword(email)
            // On success, redirect to reset password page
            router.push(`/reset-password?email=${encodeURIComponent(email)}`)
        } catch (error: any) {
            setError(error.message || 'Something went wrong. Please try again.')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="min-h-screen bg-white">
            {/* Header Navigation */}
            <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b border-gray-200">
                <div className="container mx-auto flex h-16 items-center justify-between px-4">
                    <Logo variant="light" size="md" showText={true} className="font-bold text-xl" />
                </div>
            </header>

            {/* Main */}
            <div className="flex items-center justify-center min-h-screen px-4">
                <div className="w-full max-w-md">
                    <div className="space-y-6">
                        {/* Back Link */}
                        <Link
                            href="/login"
                            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 text-sm font-medium"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Back to login
                        </Link>

                        <div className="space-y-4">
                            <h1 className="text-3xl font-medium text-gray-900">Reset your password</h1>
                            <p className="text-gray-600 text-base leading-relaxed">
                                Enter your email address and we'll send you a temporary code to reset your password.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <FloatingInput
                                id="email"
                                type="email"
                                label="Email address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                autoComplete="email"
                            />

                            {/* Error message */}
                            {error && (
                                <div className="text-sm text-red-600 text-center bg-red-50 border border-red-200 rounded-md p-3">
                                    {error}
                                </div>
                            )}

                            <Button
                                type="submit"
                                disabled={!email || isSubmitting}
                                className="w-full h-12 rounded-xl bg-gray-900 hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? "Sending code..." : "Send code"}
                            </Button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    )
}
