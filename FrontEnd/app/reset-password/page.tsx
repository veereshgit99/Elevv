"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Eye, EyeOff, Brain } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { confirmForgotPassword } from "@/utils/api"

// Reusable ChatGPT-like floating label input
function FloatingInput({
    id,
    type = "text",
    value,
    onChange,
    label,
    autoComplete,
    rightIcon,
    maxLength,
}: {
    id: string
    type?: string
    value: string
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
    label: string
    autoComplete?: string
    rightIcon?: React.ReactNode
    maxLength?: number
}) {
    return (
        <div className="relative">
            <input
                id={id}
                type={type}
                value={value}
                onChange={onChange}
                autoComplete={autoComplete}
                maxLength={maxLength}
                placeholder=" "
                className="peer w-full h-12 rounded-2xl border border-gray-300 bg-white px-4 pr-11 text-[15px] text-gray-900 shadow-sm transition-all outline-none
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
            {rightIcon && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">{rightIcon}</div>
            )}
        </div>
    )
}

export default function ResetPasswordPage() {
    const [code, setCode] = useState("")
    const [newPassword, setNewPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [showNewPassword, setShowNewPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isSuccess, setIsSuccess] = useState(false)
    const [error, setError] = useState("")
    const router = useRouter()
    const searchParams = useSearchParams()

    // Get email from URL params
    const email = searchParams.get('email') || ''

    const passwordValid = useMemo(() => {
        const len = newPassword.length >= 8
        const num = /\d/.test(newPassword)
        const special = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword)
        const upper = /[A-Z]/.test(newPassword)
        const lower = /[a-z]/.test(newPassword)
        return len && num && special && upper && lower
    }, [newPassword])

    const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!code || !passwordValid || !passwordsMatch) return

        setIsSubmitting(true)
        setError("")

        try {
            await confirmForgotPassword(email, code, newPassword)
            setIsSuccess(true)
            // Redirect to login after success
            setTimeout(() => {
                router.push('/login')
            }, 3000)
        } catch (error: any) {
            setError(error.message || 'Failed to reset password. Please try again.')
        } finally {
            setIsSubmitting(false)
        }
    }

    if (isSuccess) {
        return (
            <div className="min-h-screen bg-white">
                {/* Header with Logo */}
                <div className="absolute top-6 left-6">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center">
                            <Brain className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <span className="text-2xl font-semibold text-gray-900">Elevv</span>
                            <div className="text-xs text-gray-500 -mt-1">Your Career. Elevated</div>
                        </div>
                    </div>
                </div>

                {/* Success Message */}
                <div className="flex items-center justify-center min-h-screen px-4">
                    <div className="w-full max-w-md text-center space-y-6">
                        <div className="space-y-4">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h1 className="text-3xl font-medium text-gray-900">Password reset successful</h1>
                            <p className="text-gray-600 text-base leading-relaxed">
                                Your password has been successfully reset. You can now sign in with your new password.
                            </p>
                            <p className="text-sm text-gray-500">
                                Redirecting you to login...
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-white">
            {/* Header with Logo */}
            <div className="absolute top-6 left-6">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center">
                        <Brain className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <span className="text-2xl font-semibold text-gray-900">Elevv</span>
                        <div className="text-xs text-gray-500 -mt-1">Your Career. Elevated</div>
                    </div>
                </div>
            </div>

            {/* Main */}
            <div className="flex items-center justify-center min-h-screen px-4">
                <div className="w-full max-w-md">
                    <div className="space-y-6">
                        {/* Back Link */}
                        <Link
                            href="/forgot-password"
                            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 text-sm font-medium"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Back
                        </Link>

                        <div className="space-y-4">
                            <h1 className="text-3xl font-medium text-gray-900">Set new password</h1>
                            <p className="text-gray-600 text-base leading-relaxed">
                                Enter the verification code sent to{" "}
                                <span className="font-medium text-gray-900">{email}</span>{" "}
                                and create a new password.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Verification Code */}
                            <FloatingInput
                                id="code"
                                type="text"
                                label="Verification code"
                                value={code}
                                onChange={(e) => {
                                    // Only allow numbers and limit length
                                    const value = e.target.value.replace(/\D/g, '').slice(0, 6)
                                    setCode(value)
                                }}
                                autoComplete="one-time-code"
                                maxLength={6}
                            />

                            {/* New Password */}
                            <FloatingInput
                                id="newPassword"
                                type={showNewPassword ? "text" : "password"}
                                label="New password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                autoComplete="new-password"
                                rightIcon={
                                    <button
                                        type="button"
                                        onClick={() => setShowNewPassword((s) => !s)}
                                        className="p-1 rounded-full hover:bg-gray-100"
                                        aria-label="Toggle password visibility"
                                    >
                                        {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                    </button>
                                }
                            />

                            {/* Confirm Password */}
                            <FloatingInput
                                id="confirmPassword"
                                type={showConfirmPassword ? "text" : "password"}
                                label="Confirm new password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                autoComplete="new-password"
                                rightIcon={
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword((s) => !s)}
                                        className="p-1 rounded-full hover:bg-gray-100"
                                        aria-label="Toggle password visibility"
                                    >
                                        {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                    </button>
                                }
                            />

                            {/* Password validation messages */}
                            {newPassword.length > 0 && !passwordValid && (
                                <p className="text-[12px] text-red-600">
                                    Use 8+ characters with at least 1 number, 1 special character, 1 uppercase and 1 lowercase letter.
                                </p>
                            )}

                            {confirmPassword.length > 0 && !passwordsMatch && (
                                <p className="text-[12px] text-red-600">
                                    Passwords do not match.
                                </p>
                            )}

                            {/* Error message */}
                            {error && (
                                <div className="text-sm text-red-600 text-center bg-red-50 border border-red-200 rounded-md p-3">
                                    {error}
                                </div>
                            )}

                            <Button
                                type="submit"
                                disabled={!code || !passwordValid || !passwordsMatch || isSubmitting}
                                className="w-full h-12 rounded-xl bg-gray-900 hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed mt-6"
                            >
                                {isSubmitting ? "Resetting password..." : "Reset password"}
                            </Button>
                        </form>

                        {/* Login Link */}
                        <div className="text-center">
                            <span className="text-gray-600">Remember your password? </span>
                            <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                                Sign in
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
