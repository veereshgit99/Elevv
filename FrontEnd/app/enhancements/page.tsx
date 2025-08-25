"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import Logo from "@/components/Logo";
import {
  BarChart3,
  User,
  MessageSquare,
  LogOut,
  ChevronDown,
  ArrowLeft,
  Copy,
  Check,
  AlertCircle,
  Download,
  CheckCircle2
} from "lucide-react"
import { useSession, signOut } from "next-auth/react"
import FeedbackModal from "@/components/FeedbackModal"

interface EnhancementSuggestion {
  type: 'add' | 'rephrase' | 'quantify' | 'highlight' | 'remove' | 'style_adjust'
  target_section: string
  original_text_snippet: string
  suggested_text: string
  reasoning: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  quantification_prompt?: string
}

interface OptimizationResponse {
  enhancement_suggestions: EnhancementSuggestion[]
  overall_feedback: string
  match_after_enhancement: number // Estimated match score after implementing suggestions
  llm_model_used: string
}

// User Profile Interface
import { fetchUserProfile } from "@/utils/api"
interface UserProfile {
  user_id: string
  email: string
  name: string
}

export default function EnhancementsPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [copiedText, setCopiedText] = useState<string | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [enhancementData, setEnhancementData] = useState<OptimizationResponse | null>(null)
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login")
    }
  }, [status, router])

  useEffect(() => {
    const fetchData = async () => {
      // Make sure we have both authenticated status AND the token
      if (status === "authenticated" && session?.accessToken) {
        setIsLoadingData(true)
        setError(null)

        try {
          // Use the token directly from the session
          const token = session.accessToken as string

          // Fetch user profile with token
          const profileData = await fetchUserProfile(token)
          setUserProfile(profileData)

        } catch (error) {
          setError("Failed to load user data. Please try refreshing the page.")
        } finally {
          setIsLoadingData(false)
        }
      }
    }

    fetchData()

    const loadEnhancements = async () => {
      try {
        // Check if we already have enhancement data in session storage
        const storedEnhancements = sessionStorage.getItem('enhancement_results')
        if (storedEnhancements) {
          setEnhancementData(JSON.parse(storedEnhancements))
          setIsLoading(false)
          return
        }

        // If no stored enhancements, redirect to analysis results
        router.push('/analysis-results')

      } catch (err) {
        setError('Failed to load enhancement suggestions.')
        setIsLoading(false)
      }
    }

    loadEnhancements()
  }, [status, session, router]) // Depend on both status and session

  const handleSignOut = () => {
    signOut({ callbackUrl: '/' })
  }

  const handleCopyText = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedText(`${index}`)
      setTimeout(() => setCopiedText(null), 2000)
    } catch (err) {
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical":
        return "bg-red-100 text-red-800 border-red-200"
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-200"
      case "medium":
        return "bg-blue-100 text-blue-800 border-blue-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getPriorityLabel = (priority: string) => {
    return priority.charAt(0).toUpperCase() + priority.slice(1) + " Priority"
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'add':
        return 'Add New Content'
      case 'rephrase':
        return 'Rephrase Existing'
      case 'quantify':
        return 'Add Metrics'
      default:
        return 'Modify'
    }
  }

  // Get user initials for avatar
  const getUserInitials = () => {
    // Prioritize DB data
    const name = userProfile?.name || session?.user?.name || ''

    if (name) {
      return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }
    return 'U'
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#22c55e' // green
    if (score >= 60) return '#f59e0b' // amber
    return '#ef4444' // red
  }

  // Loading state for authentication
  // Loading state for enhancement data
  if (isLoading || isLoadingData) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Main Content Skeleton */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Back Navigation Skeleton */}
          <div className="mb-6">
            <div className="h-4 w-40 bg-gray-200 rounded animate-pulse"></div>
          </div>

          {/* Page Header Skeleton */}
          <div className="mb-8">
            <div className="h-8 w-80 bg-gray-200 rounded animate-pulse mb-2"></div>
          </div>

          {/* Strategic Summary Skeleton */}
          <div className="bg-gradient-to-r from-slate-50 to-gray-100 rounded-2xl p-6 border border-gray-200 mb-8">
            <div className="flex items-start space-x-6">
              {/* Score Circle Skeleton */}
              <div className="relative">
                <div className="w-32 h-32 bg-gray-200 rounded-full animate-pulse"></div>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="w-12 h-8 bg-gray-300 rounded animate-pulse mb-1"></div>
                  <div className="w-16 h-4 bg-gray-300 rounded animate-pulse"></div>
                </div>
              </div>
              {/* Summary Text Skeleton */}
              <div className="flex-1 space-y-3">
                <div className="h-6 w-48 bg-gray-200 rounded animate-pulse"></div>
                <div className="space-y-2">
                  <div className="h-4 w-full bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 w-5/6 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 w-2/3 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (error || !enhancementData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">{error || 'Failed to load enhancements'}</p>
          <Button onClick={() => router.push('/analysis-results')} className="mt-4">
            Back to Results
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {status === "unauthenticated" ? (
        <div /> // Safe placeholder while redirecting
      ) : (
        <>
          {/* Main Content */}
          <main className="max-w-7xl mx-auto px-4 py-8">
            {/* Back Navigation */}
            <div className="mb-6">
              <Button
                variant="ghost"
                onClick={() => {
                  // Set a flag to indicate navigation came from enhancements page with timestamp
                  sessionStorage.setItem('navigated_from_enhancements', 'true')
                  sessionStorage.setItem('navigation_timestamp', Date.now().toString())
                  router.push("/analysis-results")
                }}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 p-0"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Analysis Results</span>
              </Button>
            </div>

            {/* Page Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Resume Enhancement Suggestions</h1>
            </div>

            {/* Strategic Summary at Top */}
            <div className="bg-gradient-to-r from-slate-50 to-gray-100 rounded-2xl p-6 border border-gray-200 mb-8">
              <div className="flex items-start space-x-6">

                {/* Score Circle with Label Below */}
                <div className="flex flex-col items-center">
                  <div className="relative">
                    <svg className="w-32 h-32 transform -rotate-90">
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="#e5e7eb"
                        strokeWidth="12"
                        fill="none"
                      />
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="#3B82F6"
                        strokeWidth="12"
                        fill="none"
                        strokeDasharray={`${(enhancementData.match_after_enhancement / 100) * 352} 352`}
                        className="transition-all duration-1000"
                      />
                    </svg>
                    {/* Only the percentage inside the circle */}
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                      <span className="text-3xl font-bold text-gray-900">
                        {enhancementData.match_after_enhancement}%
                      </span>
                    </div>
                  </div>
                  {/* Label below the circle */}
                  <div className="mt-3 text-center">
                    <span className="text-sm font-medium text-gray-700">Projected Match Score</span>
                  </div>
                </div>

                {/* Summary Text */}
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Strategic Summary</h2>
                  <p className="text-base text-gray-700 leading-relaxed">{enhancementData.overall_feedback}</p>
                </div>
              </div>
            </div>

            {/* Suggestion Cards */}
            <div className="space-y-6 mb-8">
              {enhancementData.enhancement_suggestions.map((suggestion, index) => (
                <Card
                  key={index}
                  className="border border-gray-200 shadow-sm"
                >
                  <CardContent className="p-6">
                    {/* Priority Tag and Target Section */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <Badge className={`${getPriorityColor(suggestion.priority)} font-medium`}>
                          {getPriorityLabel(suggestion.priority)}
                        </Badge>
                        <Badge variant="outline" className="text-gray-600">
                          {getTypeLabel(suggestion.type)}
                        </Badge>
                      </div>
                      <span className="text-sm font-medium text-gray-600">In your {suggestion.target_section}</span>
                    </div>

                    {/* Before and After Text */}
                    <div className="space-y-4">
                      {/* Original Text (if exists) */}
                      {suggestion.original_text_snippet && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                          <h4 className="text-sm font-semibold text-red-800 mb-1">Current Text:</h4>
                          <p className="text-sm text-red-700">{suggestion.original_text_snippet}</p>
                        </div>
                      )}

                      {/* Suggested Text */}
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="text-sm font-semibold text-green-800 mb-1">
                              {suggestion.type === "add" ? "Add This Text:" : "Suggested Improvement:"}
                            </h4>
                            <p className="text-sm text-green-700">{suggestion.suggested_text}</p>
                          </div>
                          <button
                            onClick={() => handleCopyText(suggestion.suggested_text, index)}
                            className="ml-2 flex items-center space-x-1 text-green-700 hover:text-green-800 transition-colors"
                            title="Copy to clipboard"
                          >
                            {copiedText === `${index}` ? (
                              <Check className="w-4 h-4" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Reasoning */}
                    <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-blue-800 mb-2">Why This Matters:</h4>
                      <p className="text-sm text-blue-700">{suggestion.reasoning}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center space-x-4 mt-8">
              <Button
                onClick={() => router.push("/dashboard")}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 text-base"
              >
                Start New Analysis
              </Button>
            </div>

            {/* Feedback Modal */}
            <FeedbackModal
              isOpen={showFeedbackModal}
              onOpenChange={setShowFeedbackModal}
            />
          </main>
        </>
      )}
    </div>
  )
}