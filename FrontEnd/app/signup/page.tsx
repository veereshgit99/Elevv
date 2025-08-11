"use client"

import type React from "react"

import { useEffect, useState, useMemo } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Eye, EyeOff } from "lucide-react"

import { Button } from "@/components/ui/button"
import Logo from "@/components/Logo"

// Import the signIn function at the top
import { signIn } from "next-auth/react";

const FILES_API_URL = process.env.NEXT_PUBLIC_FILES_API_URL;

// Reusable ChatGPT-like floating label input
function FloatingInput({
  id,
  type = "text",
  value,
  onChange,
  onBlur,
  label,
  autoComplete,
  rightIcon,
  hasError = false,
}: {
  id: string
  type?: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onBlur?: () => void
  label: string
  autoComplete?: string
  rightIcon?: React.ReactNode
  hasError?: boolean
}) {
  return (
    <div className="relative">
      <input
        id={id}
        type={type === "email" ? "text" : type} // Use text instead of email to prevent browser validation
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        autoComplete={autoComplete}
        placeholder=" "
        className={`peer w-full h-12 rounded-2xl border bg-white px-4 pr-11 text-[15px] text-gray-900 shadow-sm transition-all outline-none
                   ${hasError
            ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/30'
            : 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30'
          }`}
      />
      {/* Label chip with bg-white so the border line does NOT cut through the text */}
      <label
        htmlFor={id}
        className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 px-1 text-[15px] transition-all
                   bg-white
                   ${hasError
            ? 'text-red-500 peer-focus:text-red-500 peer-[&:not(:placeholder-shown)]:text-red-500'
            : 'text-gray-500 peer-focus:text-blue-600 peer-[&:not(:placeholder-shown)]:text-gray-500'
          }
                   peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-xs
                   peer-[&:not(:placeholder-shown)]:top-0 peer-[&:not(:placeholder-shown)]:-translate-y-1/2 peer-[&:not(:placeholder-shown)]:text-xs`}
      >
        {label}
      </label>
      {rightIcon && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">{rightIcon}</div>
      )}
    </div>
  )
}

export default function SignUpPage() {
  const { data: session, status } = useSession()
  const [showPassword, setShowPassword] = useState(false)
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [emailError, setEmailError] = useState("")
  const [emailTouched, setEmailTouched] = useState(false)
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const searchParams = useSearchParams();

  useEffect(() => {
    // If user is authenticated, redirect to dashboard
    if (status === "authenticated" && session) {
      router.replace("/dashboard")
    }
  }, [session, status, router])

  useEffect(() => {
    // This hook will run when the page loads
    // It checks the URL for an 'error' parameter and sets it as the error message
    const urlError = searchParams.get('error');
    if (urlError) {
      setError(urlError);
    }
  }, [searchParams]);

  // Email validation function
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  // Handle email change with validation
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setEmail(value)

    // Clear any existing error when user starts typing
    if (emailError) {
      setEmailError("")
    }

    // Validate email if user has started typing and then stopped
    if (emailTouched && value.length > 0 && !validateEmail(value)) {
      setEmailError("Email is not valid.")
    }
  }

  // Handle email blur (when user leaves the field)
  const handleEmailBlur = () => {
    setEmailTouched(true)
    if (email.length > 0 && !validateEmail(email)) {
      setEmailError("Email is not valid.")
    }
  }

  const passwordValid = useMemo(() => {
    const len = password.length >= 8
    const num = /\d/.test(password)
    const special = /[!@#$%^&*(),.?":{}|<>]/.test(password)
    const upper = /[A-Z]/.test(password)
    const lower = /[a-z]/.test(password)
    return len && num && special && upper && lower
  }, [password])

  // --- API Integration ---
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate email before submitting
    if (!validateEmail(email)) {
      setEmailError("Email is not valid.");
      setEmailTouched(true);
      return;
    }

    if (!passwordValid) return;
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(`${FILES_API_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          email: email,
          password: password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to create account.');
      }

      // If signup is successful, redirect to the verification page
      router.push(`/verify?email=${email}`);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Show minimal placeholder while redirecting authenticated users
  if (status === "authenticated") {
    return <div className="min-h-screen bg-white"></div>
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
            <div className="text-center">
              <h1 className="text-3xl font-medium text-gray-900">Create an account</h1>
            </div>

            <form onSubmit={handleSignUp} className="space-y-4">
              {/* First/Last side-by-side on ≥sm */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FloatingInput
                  id="firstName"
                  label="First name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  autoComplete="given-name"
                />
                <FloatingInput
                  id="lastName"
                  label="Last name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  autoComplete="family-name"
                />
              </div>

              {/* Email below */}
              <div>
                <FloatingInput
                  id="email"
                  type="email"
                  label="Email address"
                  value={email}
                  onChange={handleEmailChange}
                  onBlur={handleEmailBlur}
                  autoComplete="email"
                  hasError={!!emailError}
                />
                {emailError && (
                  <div className="flex items-center gap-1 mt-1 ml-1">
                    <div className="w-3 h-3 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-bold">!</span>
                    </div>
                    <p className="text-[12px] text-red-600">{emailError}</p>
                  </div>
                )}
              </div>

              {/* Password below */}
              <FloatingInput
                id="password"
                type={showPassword ? "text" : "password"}
                label="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="p-1 rounded-full hover:bg-gray-100"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                }
              />

              {/* Single-line password note (only when invalid and user typed something) */}
              {password.length > 0 && !passwordValid && (
                <p className="text-[12px] text-red-600">
                  Use 8+ characters with at least 1 number, 1 special character, 1 uppercase and 1 lowercase letter.
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
                disabled={!firstName || !lastName || !email || !validateEmail(email) || !passwordValid || isLoading}
                className="w-full h-12 rounded-xl bg-gray-900 hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed"
              >
                {isLoading ? "Creating Account..." : "Create account"}
              </Button>
            </form>

            {/* Login link */}
            <div className="text-center">
              <span className="text-gray-600">Already have an account? </span>
              <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                Log in
              </Link>
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center">
                <span className="px-3 bg-white text-xs text-gray-500">OR</span>
              </div>
            </div>

            {/* Socials (kept minimal) */}
            <div className="space-y-3">
              <Button
                onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
                variant="outline"
                className="w-full h-12 rounded-2xl border border-gray-300 hover:bg-gray-50 text-gray-700"
              >
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </Button>

              <Button
                onClick={() => signIn("linkedin", { callbackUrl: "/dashboard" })}
                variant="outline"
                className="w-full h-12 rounded-2xl border border-gray-300 hover:bg-gray-50 text-gray-700"
              >
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <path
                    fill="#0A66C2"
                    d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"
                  />
                </svg>
                Continue with LinkedIn
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
