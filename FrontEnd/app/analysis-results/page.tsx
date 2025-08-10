"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Brain,
  BarChart3,
  User,
  MessageSquare,
  LogOut,
  ChevronDown,
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  Zap,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { getStoredAnalysisResults } from '@/utils/analysis-storage'
import { AnalysisResponse } from '@/utils/analysis-api'
import { useSession, signOut } from 'next-auth/react'
import { optimizeResume } from "@/utils/analysis-api"
import { fetchUserProfile } from "@/utils/api"
import FeedbackModal from "@/components/FeedbackModal"
interface UserProfile {
  user_id: string
  email: string
  name: string
}

export default function AnalysisResultsPage() {
  const { data: session, status } = useSession()
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const router = useRouter()
  const [analysisData, setAnalysisData] = useState<AnalysisResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasExistingEnhancements, setHasExistingEnhancements] = useState(false)

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
          console.log("User profile fetched:", profileData)

        } catch (error) {
          console.error("Failed to fetch dashboard data:", error)
          setError("Failed to load user data. Please try refreshing the page.")
        } finally {
          setIsLoadingData(false)
        }
      }
    }

    fetchData()

    const loadAnalysisData = async () => {
      const data = getStoredAnalysisResults()
      if (!data) {
        // If no data, redirect back to dashboard
        router.push('/dashboard')
        return
      }
      setAnalysisData(data)
      setIsLoading(false)

      // Check if we have existing enhancements and came from enhancements page
      const existingEnhancements = sessionStorage.getItem('enhancement_results')
      const navigatedFromEnhancements = sessionStorage.getItem('navigated_from_enhancements')
      const navigationTimestamp = sessionStorage.getItem('navigation_timestamp')

      // Only show "View Enhancements" if:
      // 1. We have existing enhancement data
      // 2. Navigation came from enhancements page
      // 3. Navigation happened recently (within 5 minutes to prevent stale data)
      if (existingEnhancements && navigatedFromEnhancements === 'true' && navigationTimestamp) {
        const timeDiff = Date.now() - parseInt(navigationTimestamp)
        const fiveMinutes = 5 * 60 * 1000 // 5 minutes in milliseconds

        if (timeDiff < fiveMinutes) {
          setHasExistingEnhancements(true)
        }

        // Clear the navigation flags so they don't persist for future visits
        sessionStorage.removeItem('navigated_from_enhancements')
        sessionStorage.removeItem('navigation_timestamp')
      }
    }

    loadAnalysisData()
  }, [status, session, router]) // Depend on both status and session

  const handleSignOut = () => {
    signOut({ callbackUrl: '/' })
  }

  const handleTailorResume = async () => {
    setIsAnalyzing(true) // Add this state to your component

    try {
      if (!analysisData) {
        console.error('No analysis data available')
        return
      }
      const optimizationResult = await optimizeResume(analysisData)
      // Store in session storage
      sessionStorage.setItem('enhancement_results', JSON.stringify(optimizationResult))
      router.push('/enhancements')
    } catch (error) {
      console.error('Failed to generate enhancements:', error)
      // Show error message
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleViewEnhancements = () => {
    // Navigate to enhancements page without making API call
    router.push('/enhancements')
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

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Strong Match'
    if (score >= 60) return 'Good Match'
    if (score >= 40) return 'Fair Match'
    return 'Needs Improvement'
  }

  if (isLoading || isLoadingData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-black sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center gap-8">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                    <span className="text-black font-bold text-sm">E</span>
                  </div>
                  <span className="text-2xl font-semibold text-white">Elevv</span>
                </div>
                <nav className="hidden md:flex items-center gap-8">
                  <Link href="/dashboard" className="text-sm font-medium text-white border-b-2 border-white pb-1">
                    Analysis
                  </Link>
                  <Link href="/profile" className="text-sm font-medium text-gray-300 hover:text-white">
                    Profile
                  </Link>
                </nav>
              </div>
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Skeleton */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Back Button Skeleton */}
          <div className="mb-6">
            <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
          </div>

          {/* Page Title Skeleton */}
          <div className="mb-8">
            <div className="h-8 w-96 bg-gray-200 rounded animate-pulse mb-2"></div>
            <div className="h-6 w-40 bg-gray-200 rounded animate-pulse"></div>
          </div>

          {/* Match Summary Card Skeleton */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 mb-8">
            <div className="flex items-start space-x-8">
              {/* Score Circle Skeleton */}
              <div className="relative">
                <div className="w-32 h-32 bg-gray-200 rounded-full animate-pulse"></div>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="w-12 h-8 bg-gray-300 rounded animate-pulse mb-1"></div>
                  <div className="w-16 h-4 bg-gray-300 rounded animate-pulse"></div>
                </div>
              </div>
              {/* Summary Text Skeleton */}
              <div className="flex-1">
                <div className="h-7 w-80 bg-gray-200 rounded animate-pulse mb-3"></div>
                <div className="space-y-2 mb-6">
                  <div className="h-4 w-full bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 w-5/6 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse"></div>
                </div>
                <div className="h-10 w-40 bg-blue-600 opacity-30 rounded animate-pulse"></div>
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (!analysisData) {
    return null
  }

  const matchPercentage = analysisData.overall_match_percentage
  const strengthSummary = analysisData.job_match_analysis.match_analysis.strength_summary
  const strongPoints = analysisData.relationship_map.relationship_map.strong_points_in_resume
  const gaps = analysisData.relationship_map.relationship_map.identified_gaps_in_resume
  const matchedSkills = analysisData.relationship_map.relationship_map.matched_skills
  const matched_experience_to_responsibilities = analysisData.relationship_map.relationship_map.matched_experience_to_responsibilities
  const matchedExperiences = analysisData.relationship_map.relationship_map.matched_experience_to_responsibilities

  // Get job title and company from the request data stored in session
  const jobTitle = analysisData.job_title
  const company = analysisData.company_name || 'Company'

  return (
    <div className="min-h-screen bg-gray-50">
      {status === "unauthenticated" ? (
        <div /> // Safe placeholder while redirecting
      ) : (
        <>
          {/* Header */}
          <header className="bg-black">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                {/* Left side - Logo and Navigation */}
                <div className="flex items-center gap-8">
                  {/* Logo */}
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                      <span className="text-black font-bold text-sm">E</span>
                    </div>
                    <span className="text-2xl font-semibold text-white">Elevv</span>
                  </div>

                  {/* Navigation */}
                  <nav className="hidden md:flex items-center gap-8">
                    <Link href="/dashboard" className="text-sm font-medium text-white border-b-2 border-white pb-1">
                      Analysis
                    </Link>
                    <Link href="/profile" className="text-sm font-medium text-gray-300 hover:text-white">
                      Profile
                    </Link>
                  </nav>
                </div>

                {/* User Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors">
                      <User className="h-5 w-5 text-black" />
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <div className="px-3 py-2">
                      <p className="text-sm font-medium text-gray-900">{userProfile?.name || 'User'}</p>
                      <p className="text-xs text-gray-500">{userProfile?.email}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/profile" className="flex items-center space-x-2 cursor-pointer">
                        <User className="w-4 h-4" />
                        <span>Profile</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setShowFeedbackModal(true)}
                      className="flex items-center space-x-2 cursor-pointer"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>Feedback</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Back Button */}
            <Link href="/dashboard">
              <Button variant="ghost" className="mb-6 pl-0">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Analysis
              </Button>
            </Link>

            {/* Page Title */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">
                Analysis Results: {jobTitle}
              </h1>
              <p className="text-lg text-gray-600 mt-1">at {company}</p>
            </div>

            {/* Match Summary Card */}
            <Card className="mb-8">
              <CardContent className="p-8">
                <div className="flex items-start space-x-8">
                  {/* Score Circle */}
                  <div className="flex flex-col items-center"> {/* Add flex-col and items-center */}
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
                          stroke="#2563eb"
                          strokeWidth="12"
                          fill="none"
                          strokeDasharray={`${(matchPercentage / 100) * 352} 352`}
                          className="transition-all duration-1000"
                        />
                      </svg>

                      {/* Only the percentage inside the circle */}
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                        <span className="text-3xl font-bold text-gray-900">
                          {matchPercentage}%
                        </span>
                      </div>
                    </div>

                    {/* Label below the circle */}
                    <div className="mt-3 text-center">
                      <span className="text-sm font-medium text-gray-700">Match Score</span>
                    </div>
                  </div>

                  {/* Summary Text */}
                  <div className="flex-1">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-3">
                      {getScoreLabel(matchPercentage)}, with Room to Improve
                    </h2>
                    <p className="text-gray-600 leading-relaxed mb-6">
                      {strengthSummary}
                    </p>
                    <Button
                      onClick={hasExistingEnhancements ? handleViewEnhancements : handleTailorResume}
                      disabled={isAnalyzing}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {isAnalyzing ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          Generating...
                        </>
                      ) : hasExistingEnhancements ? (
                        <>
                          <Zap className="w-4 h-4 mr-2" />
                          View Enhancements
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4 mr-2" />
                          Tailor Your Resume
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Strengths and Gaps */}
            <div className="grid md:grid-cols-2 gap-8 mb-8">
              {/* Strengths */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span>Your Top Strengths</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {strongPoints.map((point, index) => (
                      <li key={index} className="flex items-start space-x-3">
                        <div className="w-1.5 h-1.5 bg-black rounded-full mt-2 flex-shrink-0"></div>
                        <span className="text-gray-700">{point}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Gaps */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                    <span>Critical Gaps to Address</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {gaps && gaps.length > 0 ? (
                    <ul className="space-y-3">
                      {gaps.slice(0, 5).map((gap, index) => (
                        <li key={index} className="flex items-start space-x-3">
                          <div className="w-1.5 h-1.5 bg-black rounded-full mt-2 flex-shrink-0"></div>
                          <span className="text-gray-700">
                            {gap.jd_requirement}
                            {gap.type === 'experience_gap' && (
                              <span className="text-xs text-amber-600 ml-2">(Experience)</span>
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="flex items-center space-x-3 text-gray-600 py-4">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span>No critical gaps identified. Your profile aligns well with the job requirements!</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Experience Comparison */}
            <Card>
              <CardHeader>
                <CardTitle>How Your Experience Compares</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Show matched skills with high confidence */}
                {matched_experience_to_responsibilities
                  .slice(0, 3)
                  .map((match, index) => (
                    <div key={index} className="border rounded-lg p-6 space-y-4">
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-medium text-gray-600 mb-1">Your Experience</p>
                          <p className="text-gray-900 bg-blue-50 p-3 rounded">
                            {match.resume_experience_summary} experience
                            {/* Find related achievement if available */}
                            {strongPoints.find(point => point.toLowerCase().includes(match.resume_experience_summary.toLowerCase())) &&
                              ` - ${strongPoints.find(point => point.toLowerCase().includes(match.resume_experience_summary.toLowerCase()))}`
                            }
                          </p>
                        </div>

                        <div>
                          <p className="text-sm font-medium text-gray-600 mb-1">Matched to Job Responsibility</p>
                          <p className="text-gray-900 bg-green-50 p-3 rounded">
                            {match.jd_responsibility}
                          </p>
                        </div>

                        <div>
                          <p className="text-sm font-medium text-gray-600 mb-1">Reasoning</p>
                          <p className="text-gray-700 text-sm italic">
                            {match.reasoning}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
              </CardContent>
            </Card>

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