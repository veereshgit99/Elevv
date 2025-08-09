"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useSession, signOut } from "next-auth/react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Upload, BarChart3, User, Settings, LogOut, Brain, ChevronDown, Clock, FileText, Zap, Target, Building } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAnalysisNavigation } from "@/components/analysis-navigation-context"
import { fetchUserProfile, fetchResumes } from "@/utils/api"

// Add these imports
import { ResumeUpload } from "@/components/resume-upload"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { analyzeJobApplication } from '@/utils/analysis-api'
import { storeAnalysisResults } from '@/utils/analysis-storage'

// Define types for better TypeScript support
interface UserProfile {
  user_id: string
  email: string
  name: string
}
interface Resume {
  resume_id: string
  file_name: string  // This is what's in your database
  s3_path: string
  created_at: string
  mime_type: string
  status: string
  is_primary: boolean
}

// Fixed floating label input
function FloatingInput({
  id,
  type = "text",
  value,
  onChange,
  label,
  autoComplete,
  placeholder,
}: {
  id: string
  type?: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  label: string
  autoComplete?: string
  placeholder?: string
}) {
  return (
    <div className="relative">
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        placeholder=""
        style={{ backgroundColor: 'white !important' }}
        className="peer w-full h-12 rounded-2xl border border-gray-300 bg-white px-4 text-[15px] text-gray-900 shadow-sm transition-all outline-none
                   focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30
                   [&:-webkit-autofill]:!bg-white [&:-webkit-autofill]:shadow-[0_0_0_1000px_white_inset]
                   [&:-webkit-autofill:hover]:!bg-white [&:-webkit-autofill:hover]:shadow-[0_0_0_1000px_white_inset]
                   [&:-webkit-autofill:focus]:!bg-white [&:-webkit-autofill:focus]:shadow-[0_0_0_1000px_white_inset]"
      />
      <label
        htmlFor={id}
        className={`pointer-events-none absolute left-3 px-1 text-[15px] transition-all bg-white
                   ${value ? "top-0 -translate-y-1/2 text-xs text-gray-500" : "top-1/2 -translate-y-1/2 text-gray-500"}
                   peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-xs peer-focus:text-blue-600`}
      >
        {label}
      </label>
    </div>
  )
}

// Fixed floating label textarea
function FloatingTextarea({
  id,
  value,
  onChange,
  label,
  placeholder,
  rows = 6,
}: {
  id: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  label: string
  placeholder?: string
  rows?: number
}) {
  return (
    <div className="relative">
      <textarea
        id={id}
        value={value}
        onChange={onChange}
        placeholder=""
        rows={rows}
        className="peer w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-[15px] text-gray-900 shadow-sm transition-all outline-none resize-none
                   focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
      />
      <label
        htmlFor={id}
        className={`pointer-events-none absolute left-3 px-1 text-[15px] transition-all bg-white
                   ${value ? "top-0 -translate-y-1/2 text-xs text-gray-500" : "top-3 text-gray-500"}
                   peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-xs peer-focus:text-blue-600`}
      >
        {label}
      </label>
    </div>
  )
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const [jobTitle, setJobTitle] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [jobDescription, setJobDescription] = useState("")
  const [selectedResume, setSelectedResume] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const router = useRouter()
  const { lastAnalysisPage } = useAnalysisNavigation()

  // State for user data fetched from the backend
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [userResumes, setUserResumes] = useState<Resume[]>([])
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Add this with your other state declarations
  const [showUploadModal, setShowUploadModal] = useState(false)

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login")
    }
  }, [status, router])

  // In dashboard/page.tsx
  useEffect(() => {
    const fetchData = async () => {
      // Make sure we have both authenticated status AND the token
      if (status === "authenticated" && session?.accessToken) {
        setIsLoadingData(true)
        setError(null)

        try {
          // Use the token directly from the session
          const token = session.accessToken as string

          // Use the newer functions that accept token
          const profileData = await fetchUserProfile(token)
          setUserProfile(profileData)

          const resumesData = await fetchResumes(token)
          setUserResumes(resumesData)

          const primaryResume = resumesData.find((r: Resume) => r.is_primary)
          if (primaryResume) {
            setSelectedResume(primaryResume.resume_id)
          }
        } catch (error) {
          console.error("Failed to fetch dashboard data:", error)
          setError("Failed to load user data. Please try refreshing the page.")
        } finally {
          setIsLoadingData(false)
        }
      }
    }

    fetchData()
  }, [status, session]) // Depend on both status and session

  const handleAnalyze = async () => {
    if (!jobTitle || !companyName || !jobDescription || !selectedResume) {
      setError('Please fill in all required fields')
      return
    }

    setIsAnalyzing(true)
    setError('')

    try {
      // Call the analysis API
      const analysisData = await analyzeJobApplication({
        job_title: jobTitle,
        company_name: companyName,
        job_description_text: jobDescription,
        resume_id: selectedResume,
        job_url: undefined, // Add if you have a URL field
      })

      // Store the results
      storeAnalysisResults(analysisData)

      // Log for debugging
      console.log('Analysis completed:', {
        matchPercentage: analysisData.overall_match_percentage,
        resumeId: analysisData.resume_id,
        gaps: analysisData.relationship_map.relationship_map.identified_gaps_in_resume.length,
        matchedSkills: analysisData.relationship_map.relationship_map.matched_skills.length
      })

      // Navigate to results page - don't reset isAnalyzing here to prevent button flash
      router.push('/analysis-results')

    } catch (error) {
      console.error('Analysis failed:', error)
      setError(error instanceof Error ? error.message : 'Analysis failed. Please try again.')
      setIsAnalyzing(false) // Only reset on error
    }
  }

  const handleSignOut = () => {
    signOut({ callbackUrl: '/' })
  }

  const characterCount = jobDescription.length
  const maxCharacters = 5000

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

  if (status === "loading" || isLoadingData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-black sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center gap-8">
                <Link href="/dashboard" className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                    <span className="text-black font-bold text-sm">E</span>
                  </div>
                  <span className="text-2xl font-semibold text-white">Elevv</span>
                </Link>
                <nav className="hidden md:flex items-center gap-8">
                  <Link href="/dashboard" className="text-sm font-medium text-white border-b-2 border-white pb-1">Analysis</Link>
                  <Link href="/profile" className="text-sm font-medium text-gray-300 hover:text-white">Profile</Link>
                </nav>
              </div>
              <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse"></div>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="mb-8">
              <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
              <div className="h-5 bg-gray-200 rounded w-96"></div>
            </div>
            <Card className="shadow-sm border-gray-200">
              <CardHeader className="pb-6">
                <div className="h-6 bg-gray-200 rounded w-48 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-80"></div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="h-12 bg-gray-200 rounded-2xl"></div>
                <div className="h-12 bg-gray-200 rounded-2xl"></div>
                <div className="h-32 bg-gray-200 rounded-2xl"></div>
                <div className="h-12 bg-gray-200 rounded-2xl"></div>
                <div className="h-24 bg-gray-200 rounded-2xl"></div>
                <div className="h-12 bg-gray-200 rounded-2xl"></div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {status === "unauthenticated" ? (
        <div /> // Safe placeholder while redirecting
      ) : (
        <>
          {/* Black Header */}
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
                        <User className="mr-2 h-4 w-4" />
                        <span>Profile</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
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
          <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Welcome Section */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Welcome, {userProfile?.name?.split(' ')[0] || 'there'}! 👋
              </h1>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                {error}
              </div>
            )}

            {/* Simple notice when no resumes are uploaded */}
            {userResumes.length === 0 && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <FileText className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  <p className="text-sm text-blue-800">
                    Please upload your resume to get started with job analysis.
                  </p>
                </div>
              </div>
            )}

            {/* Analysis Form */}
            <Card className="shadow-sm border-gray-200">
              <CardHeader className="pb-6 text-center">
                <CardTitle className="text-xl font-semibold text-gray-900">Start a New Analysis</CardTitle>
                <CardDescription className="text-gray-600">
                  Get detailed analysis of your resume against any job description
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Job Title */}
                <FloatingInput
                  id="job-title"
                  label="Job Title"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="e.g. Senior Software Engineer"
                />

                {/* Company Name */}
                <FloatingInput
                  id="company-name"
                  label="Company Name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Google, Microsoft, Airbnb"
                />

                {/* Job Description */}
                <FloatingTextarea
                  id="job-description"
                  label="Job Description"
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Paste the full job description here..."
                />

                {/* Character count */}
                <div className="text-right">
                  <span className={`text-xs ${characterCount > maxCharacters * 0.9 ? "text-red-500" : "text-gray-500"}`}>
                    {characterCount}/{maxCharacters}
                  </span>
                </div>

                {/* Resume Selection */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-700">Analyze using this resume:</label>
                  {userResumes.length > 0 ? (
                    <Select value={selectedResume} onValueChange={setSelectedResume}>
                      <SelectTrigger className="h-12 rounded-2xl border-gray-300 focus:border-blue-500 focus:ring-blue-500/30">
                        <SelectValue placeholder="Select a resume">
                          {selectedResume && userResumes.find(r => r.resume_id === selectedResume)?.file_name}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {userResumes.map((resume) => (
                          <SelectItem key={resume.resume_id} value={resume.resume_id}>
                            <div className="flex items-center space-x-2">
                              <FileText className="w-4 h-4 text-gray-400" />
                              <span>{resume.file_name || 'Unnamed Resume'}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                      <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600 mb-2">No resumes uploaded yet</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-blue-600 border-blue-600 hover:bg-blue-600 hover:text-white"
                        onClick={() => setShowUploadModal(true)}
                      >
                        Upload Resume
                      </Button>
                    </div>
                  )}
                </div>

                {/* Analyze Button - Blue */}
                <Button
                  onClick={handleAnalyze}
                  disabled={!jobTitle || !companyName || !jobDescription.trim() || !selectedResume || isAnalyzing}
                  className={`w-full h-12 rounded-2xl text-white font-medium transition-all ${isAnalyzing
                    ? 'bg-blue-600 cursor-not-allowed'
                    : !jobTitle || !companyName || !jobDescription.trim() || !selectedResume
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                >
                  {isAnalyzing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <BarChart3 className="mr-2 h-5 w-5" />
                      Analyze Now
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Upload Resume Modal */}
            <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Upload Your Resume</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                  <ResumeUpload
                    onUploadSuccess={async () => {
                      setShowUploadModal(false)
                      // Refresh the resumes list with token
                      if (session?.accessToken) {
                        try {
                          const resumesData = await fetchResumes(session.accessToken as string)
                          setUserResumes(resumesData)
                        } catch (error) {
                          console.error("Failed to refresh resumes:", error)
                        }
                      }
                    }}
                    onUploadError={(error) => {
                      console.error("Upload error:", error)
                      // You could show a toast notification here
                    }}
                  />
                </div>
              </DialogContent>
            </Dialog>
          </main>
        </>
      )}
    </div>
  )
}
