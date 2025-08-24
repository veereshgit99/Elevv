"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useSession, signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Eye, EyeOff } from "lucide-react"

import { Button } from "@/components/ui/button"
import Logo from "@/components/Logo"

// Reusable ChatGPT-like floating label input
function FloatingInput({
  id,
  type = "text",
  value,
  onChange,
  label,
  autoComplete,
  rightIcon,
}: {
  id: string
  type?: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  label: string
  autoComplete?: string
  rightIcon?: React.ReactNode
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
        className="peer w-full h-12 rounded-2xl border border-gray-300 bg-white px-4 pr-11 text-[15px] text-gray-900 shadow-sm transition-all outline-none
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
      {rightIcon && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">{rightIcon}</div>
      )}
    </div>
  )
}

export default function LoginPage() {
  const { data: session, status } = useSession()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const router = useRouter()
  const searchParams = useSearchParams();
  const [showConfirmed, setShowConfirmed] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);

  useEffect(() => {
    if (searchParams.get("confirmed") === "1") {
      setShowConfirmed(true);

      // Clear query param
      const url = new URL(window.location.href);
      url.searchParams.delete("confirmed");
      window.history.replaceState({}, "", url.toString());

      // Auto-hide
      const t = setTimeout(() => setShowConfirmed(false), 4000);
      return () => clearTimeout(t);
    }
  }, [searchParams]);

  useEffect(() => {
    if (searchParams.get("deleted") === "1") {
      setShowDeleted(true);

      const url = new URL(window.location.href);
      url.searchParams.delete("deleted");
      window.history.replaceState({}, "", url.toString());

      const t = setTimeout(() => setShowDeleted(false), 4000);
      return () => clearTimeout(t);
    }
  }, [searchParams]);

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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // --- UPDATED: Use the signIn function from next-auth ---
      const result = await signIn('credentials', {
        redirect: false, // Important: prevent automatic redirect
        email: email,
        password: password,
      });

      if (result?.error) {
        // Handle specific error for unconfirmed account
        if (result.error === "ACCOUNT_NOT_VERIFIED") {
          setError("Your account is not verified. Please check your email for a verification code.");
          // Redirect to verify page after a delay
          setTimeout(() => {
            router.push(`/verify?email=${email}`);
          }, 3000);
        } else {
          // If the 'authorize' function in the backend threw an error
          setError(result.error);
        }
        setIsLoading(false);
      } else if (result?.ok) {
        // If the sign-in was successful, redirect to the dashboard
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError('An unexpected error occurred.');
      setIsLoading(false);
    }
  };

  // Show minimal placeholder while redirecting authenticated users
  if (status === "authenticated") {
    return <div className="min-h-screen bg-white"></div>
  }

  return (
    <div className="bg-white min-h-screen overflow-hidden">
      {/* Header Navigation */}
      <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Logo variant="light" size="md" showText={true} className="font-bold text-xl" />
        </div>
      </header>

      {/* ✅ Success message after account confirmation */}
      {showConfirmed && (
        <div className="px-4 py-3 text-sm text-black-800 text-center">
          Your account has been confirmed. Please sign in.
        </div>
      )}

      {showDeleted && (
        <div className="px-4 py-3 text-sm text-black-800 text-center">
          Your account was deleted. You can sign up again anytime.
        </div>
      )}


      {/* Main */}
      <div className="flex items-start justify-center min-h-[80vh] px-4 pt-16">
        <div className="w-full max-w-md">
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-3xl font-medium text-gray-900">Welcome back</h1>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              {/* Email */}
              <FloatingInput
                id="email"
                type="email"
                label="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />

              {/* Password */}
              <FloatingInput
                id="password"
                type={showPassword ? "text" : "password"}
                label="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
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

              {/* Error message */}
              {error && (
                <div className="text-sm text-red-600 text-center bg-red-50 border border-red-200 rounded-md p-3">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={!email || !password || isLoading}
                className="w-full h-12 rounded-xl bg-gray-900 hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed"
              >
                {isLoading ? "Signing in..." : "Continue"}
              </Button>
            </form>

            {/* Forgot password */}
            <div className="text-center">
              <Link href="/forgot-password" className="text-blue-600 hover:text-blue-700 text-sm">
                Forgot password?
              </Link>
            </div>

            {/* Signup link */}
            <div className="text-center">
              <span className="text-gray-600">Don't have an account? </span>
              <Link href="/signup" className="text-blue-600 hover:text-blue-700 font-medium">
                Sign up
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

            {/* Social logins */}
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
      {/* Footer: Terms and Privacy */}
      <footer className="w-full flex justify-center items-center py-12 bg-white">
        <div className="flex gap-1 text-xs text-gray-600">
          <Link href="/terms" className="hover:underline">Terms of Use</Link>
          <span className="mx-0">|</span>
          <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
        </div>
      </footer>
    </div>
  )
}
