"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Brain } from "lucide-react"

import { Button } from "@/components/ui/button"

const FILES_API_URL = process.env.NEXT_PUBLIC_FILES_API_URL

// Reusable ChatGPT-like floating label input
function FloatingInput({
  id,
  type = "text",
  value,
  onChange,
  label,
  autoComplete,
  maxLength,
}: {
  id: string
  type?: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  label: string
  autoComplete?: string
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
        className="peer w-full h-12 rounded-2xl border border-gray-300 bg-white px-4 text-[15px] text-gray-900 shadow-sm transition-all outline-none
                   focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
      />
      {/* Label chip with bg-white so the border line does NOT cut through the text */}
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

export default function VerifyPage() {
  const [code, setCode] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [resendCooldown, setResendCooldown] = useState(0)
  const [isResending, setIsResending] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  // Get email from URL params or localStorage (you can adjust this based on your implementation)
  const [email, setEmail] = useState("")

  useEffect(() => {
    // You can get email from URL params or localStorage
    // For now, using a placeholder - adjust based on your backend integration
    const emailParam = searchParams.get("email")
    if (emailParam) {
      setEmail(emailParam)
    } else {
      // Fallback to localStorage or redirect back to signup
      const storedEmail = localStorage.getItem("pendingVerificationEmail")
      if (storedEmail) {
        setEmail(storedEmail)
      } else {
        router.push("/signup")
      }
    }
  }, [router, searchParams])

  // Countdown timer for resend button
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCooldown])

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()

    if (code.length !== 6) {
      setError("Please enter the complete 6-digit code")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      const response = await fetch(`${FILES_API_URL}/auth/confirm-signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email,
          confirmation_code: code,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Invalid verification code.");
      }

      // On successful verification, redirect to the login page
      router.push("/login");

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  const handleResendCode = async () => {
    if (resendCooldown > 0) return

    setIsResending(true)

    try {
      // Replace this with your actual API call
      const response = await fetch("/api/resend-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      })

      if (response.ok) {
        setResendCooldown(60) // 60 second cooldown
        setError("")
        // Clear current code
        setCode("")
      } else {
        setError("Failed to resend code. Please try again.")
      }
    } catch (error) {
      setError("Something went wrong. Please try again.")
    } finally {
      setIsResending(false)
    }
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
            <div className="text-center space-y-4">
              <h1 className="text-3xl font-medium text-gray-900">Check your inbox</h1>
              <p className="text-gray-600 text-base leading-relaxed">
                Enter the verification code we just sent to{" "}
                <span className="font-medium text-gray-900">{email || 'your email'}</span>.
              </p>
            </div>

            <form onSubmit={handleVerify} className="space-y-6">
              {/* Verification Code Input */}
              <FloatingInput
                id="code"
                type="text"
                label="Code"
                value={code}
                onChange={(e) => {
                  // Only allow numbers and limit length
                  const value = e.target.value.replace(/\D/g, '').slice(0, 6)
                  setCode(value)
                  setError("")
                }}
                autoComplete="one-time-code"
                maxLength={6}
              />

              {/* Error Message */}
              {error && (
                <div className="text-sm text-red-600 text-center bg-red-50 border border-red-200 rounded-md p-3">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={code.length < 6 || isLoading}
                className="w-full h-12 rounded-2xl bg-gray-900 hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-medium"
              >
                {isLoading ? "Verifying..." : "Continue"}
              </Button>
            </form>

            {/* Resend Email */}
            <div className="text-center">
              <button
                onClick={handleResendCode}
                disabled={isResending || resendCooldown > 0}
                className="text-gray-600 hover:text-gray-800 font-medium disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                {isResending
                  ? "Sending..."
                  : resendCooldown > 0
                    ? `Resend email (${resendCooldown}s)`
                    : "Resend email"
                }
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}
