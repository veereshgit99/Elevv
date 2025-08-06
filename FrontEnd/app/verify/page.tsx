"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Brain, ArrowLeft, Mail } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const FILES_API_URL = process.env.NEXT_PUBLIC_FILES_API_URL

export default function VerifyPage() {
  const [code, setCode] = useState(["", "", "", "", "", ""])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [resendCooldown, setResendCooldown] = useState(0)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const router = useRouter()

  // Get email from URL params or localStorage (you can adjust this based on your implementation)
  const [email, setEmail] = useState("")

  useEffect(() => {
    // You can get email from URL params or localStorage
    // For now, using a placeholder - adjust based on your backend integration
    const urlParams = new URLSearchParams(window.location.search)
    const emailParam = urlParams.get("email")
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
  }, [router])

  // Countdown timer for resend button
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCooldown])

  const handleInputChange = (index: number, value: string) => {
    if (value.length > 1) return // Only allow single digit

    const newCode = [...code]
    newCode[index] = value
    setCode(newCode)
    setError("")

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData("text").slice(0, 6)
    const newCode = [...code]

    for (let i = 0; i < pastedData.length && i < 6; i++) {
      if (/^\d$/.test(pastedData[i])) {
        newCode[i] = pastedData[i]
      }
    }

    setCode(newCode)
    setError("")

    // Focus the next empty input or the last input
    const nextEmptyIndex = newCode.findIndex((digit) => digit === "")
    if (nextEmptyIndex !== -1) {
      inputRefs.current[nextEmptyIndex]?.focus()
    } else {
      inputRefs.current[5]?.focus()
    }
  }

  const handleVerify = async () => {
    const verificationCode = code.join("")

    if (verificationCode.length !== 6) {
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
          confirmation_code: verificationCode,
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
        setCode(["", "", "", "", "", ""])
        inputRefs.current[0]?.focus()
      } else {
        setError("Failed to resend code. Please try again.")
      }
    } catch (error) {
      setError("Something went wrong. Please try again.")
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-50 to-blue-50 p-12 flex-col justify-center">
        <div className="max-w-md">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-12 w-12 rounded bg-[#FF5722] flex items-center justify-center">
              <Brain className="h-7 w-7 text-white" />
            </div>
            <span className="text-2xl font-bold text-black">Elevv</span>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-4">Check Your Email</h1>

          <p className="text-lg text-gray-600 mb-8">
            We've sent a 6-digit verification code to your email address. Enter it below to complete your account setup.
          </p>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-[#FF5722]"></div>
              <span className="text-gray-700">Secure account verification</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-[#FF5722]"></div>
              <span className="text-gray-700">Code expires in 10 minutes</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-[#FF5722]"></div>
              <span className="text-gray-700">Check your spam folder if needed</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Verification Form */}
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <div className="h-8 w-8 rounded bg-[#FF5722] flex items-center justify-center">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-black">Elevv</span>
          </div>

          {/* Back Button */}
          <div className="mb-6">
            <Link
              href="/signup"
              className="flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Sign Up
            </Link>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Verify Your Email</h2>
            {email && (
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-8">
                <Mail className="w-4 h-4" />
                <span>Code sent to {email}</span>
              </div>
            )}
          </div>

          <div className="space-y-6">
            {/* Verification Code Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-4">Enter 6-digit verification code</label>
              <div className="flex gap-3 justify-center">
                {code.map((digit, index) => (
                  <Input
                    key={index}
                    ref={(el) => { inputRefs.current[index] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleInputChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={index === 0 ? handlePaste : undefined}
                    className="w-12 h-12 text-center text-lg font-semibold border-2 focus:border-[#FF5722] focus:ring-[#FF5722]"
                    disabled={isLoading}
                  />
                ))}
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="text-sm text-red-600 text-center bg-red-50 border border-red-200 rounded-md p-3">
                {error}
              </div>
            )}

            {/* Verify Button */}
            <Button
              onClick={handleVerify}
              disabled={isLoading || code.join("").length !== 6}
              className="w-full bg-[#FF5722] hover:bg-[#E64A19] text-white h-11 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Verifying..." : "Verify Code"}
            </Button>

            {/* Resend Code */}
            <div className="text-center">
              <span className="text-sm text-gray-600">Didn't receive the code? </span>
              <button
                onClick={handleResendCode}
                disabled={resendCooldown > 0}
                className="text-sm font-medium text-[#FF5722] hover:text-[#E64A19] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Code"}
              </button>
            </div>

            {/* Help Text */}
            <div className="text-center text-xs text-gray-500">
              <p>Having trouble? Check your spam folder or contact support.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
