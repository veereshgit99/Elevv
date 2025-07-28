"use client"

import { useState, useEffect } from "react"
import { useSession, signOut } from "next-auth/react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import {
  Brain,
  BarChart3,
  User,
  Settings,
  LogOut,
  ChevronDown,
  TrendingUp,
  Clock,
  FileText,
  Zap,
  Target,
  Building,
  ArrowRight,
} from "lucide-react"
import { useAnalysisNavigation } from "@/components/analysis-navigation-context"
import { fetchUserProfile, fetchResumes } from "@/utils/api"

// Add these imports
import { ResumeUpload } from "@/components/resume-upload"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

// Define types for better TypeScript support
interface UserProfile {
  user_id: string
  email: string
  name: string
}

interface Resume {
  resume_id: string
  name: string
  created_at: string
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

  // Sample recent analyses (will be replaced with real data later)
  const recentAnalyses = [
    {
      id: 1,
      jobTitle: "Senior Software Engineer",
      company: "Google",
      score: 87,
      date: "2 days ago",
      status: "completed",
    },
    {
      id: 2,
      jobTitle: "Frontend Developer",
      company: "Meta",
      score: 92,
      date: "1 week ago",
      status: "completed",
    },
    {
      id: 3,
      jobTitle: "Full Stack Developer",
      company: "Netflix",
      score: 78,
      date: "2 weeks ago",
      status: "completed",
    },
  ]


  // Fetch user data when session is available
  useEffect(() => {
    const fetchData = async () => {
      if (status === "authenticated" && session) {
        setIsLoadingData(true)
        setError(null)

        try {
          // Fetch user profile
          const profileData = await fetchUserProfile()
          setUserProfile(profileData)
          console.log("User profile fetched:", profileData)

          // Fetch user resumes
          const resumesData = await fetchResumes()
          setUserResumes(resumesData)
          console.log("User resumes fetched:", resumesData)

        } catch (error) {
          console.error("Failed to fetch dashboard data:", error)
          setError("Failed to load user data. Please try refreshing the page.")
        } finally {
          setIsLoadingData(false)
        }
      } else if (status === "unauthenticated") {
        router.push('/login')
      }
    }

    if (status !== "loading") {
      fetchData()
    }
  }, [status, session, router])

  const handleAnalyze = async () => {
    setIsAnalyzing(true)

    // Simulate analysis time
    await new Promise((resolve) => setTimeout(resolve, 2000))

    console.log("Starting analysis with:", {
      jobTitle,
      companyName,
      jobDescription,
      selectedResume,
    })

    router.push("/analysis-results")
  }

  const handleSignOut = () => {
    signOut({ callbackUrl: '/' })
  }

  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-green-600 bg-green-50 border-green-200"
    if (score >= 70) return "text-yellow-600 bg-yellow-50 border-yellow-200"
    return "text-red-600 bg-red-50 border-red-200"
  }

  const characterCount = jobDescription.length
  const maxCharacters = 5000

  // Get user initials for avatar
  const getUserInitials = () => {
    if (userProfile?.name) {
      return userProfile.name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }
    return 'U'
  }

  // In your dashboard page component, update the loading check:

  if (status === "loading" || isLoadingData) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Keep the actual header for consistency */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-10">
                <Link href="/" className="flex items-center gap-2 font-bold text-xl text-black">
                  <div className="h-8 w-8 rounded bg-[#FF5722] flex items-center justify-center">
                    <Brain className="h-5 w-5 text-white" />
                  </div>
                  LexIQ
                </Link>
                <nav className="flex items-center space-x-8">
                  <div className="flex items-center space-x-2 text-base font-semibold text-black relative pb-4 border-b-2 border-[#FF5722]">
                    <BarChart3 className="w-5 h-5" />
                    <span>Analysis</span>
                  </div>
                  <div className="flex items-center space-x-2 text-base font-medium text-gray-600 pb-4">
                    <User className="w-5 h-5" />
                    <span>Profile</span>
                  </div>
                </nav>
              </div>
              <div className="flex items-center">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Skeleton */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left Column Skeleton */}
            <div className="lg:col-span-1 space-y-6">
              {/* Welcome Card Skeleton */}
              <Card className="bg-gradient-to-br from-gray-100 to-gray-200">
                <CardContent className="p-6">
                  <div className="animate-pulse">
                    <div className="h-6 bg-white/30 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-white/20 rounded w-full"></div>
                  </div>
                </CardContent>
              </Card>

              {/* Stats Cards Skeleton */}
              <div className="grid grid-cols-2 gap-4">
                {[1, 2].map((i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3 animate-pulse">
                        <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
                        <div>
                          <div className="h-8 w-8 bg-gray-200 rounded mb-1"></div>
                          <div className="h-3 w-16 bg-gray-200 rounded"></div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {/* Recent Analyses Skeleton */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="h-5 w-32 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg border animate-pulse">
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="flex items-center space-x-2">
                          <div className="h-3 bg-gray-200 rounded w-20"></div>
                          <div className="h-3 bg-gray-200 rounded w-16"></div>
                        </div>
                      </div>
                      <div className="h-6 w-12 bg-gray-200 rounded-full"></div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Analysis Form Skeleton */}
            <div className="lg:col-span-2">
              <Card className="shadow-lg">
                <CardHeader className="text-center pb-6 bg-gradient-to-r from-gray-50 to-blue-50 rounded-t-lg">
                  <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-3/4 mx-auto mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-full max-w-md mx-auto"></div>
                  </div>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                  {/* Form Fields Skeleton */}
                  {[1, 2].map((i) => (
                    <div key={i} className="space-y-2 animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                      <div className="h-10 bg-gray-200 rounded w-full"></div>
                    </div>
                  ))}

                  {/* Job Description Skeleton */}
                  <div className="space-y-2 animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-32 bg-gray-200 rounded w-full"></div>
                  </div>

                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Persistent Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Left side - Logo and Navigation */}
            <div className="flex items-center space-x-10">
              {/* Logo */}
              <Link href="/" className="flex items-center gap-2 font-bold text-xl text-black">
                <div className="h-8 w-8 rounded bg-[#FF5722] flex items-center justify-center">
                  <Brain className="h-5 w-5 text-white" />
                </div>
                LexIQ
              </Link>

              {/* Primary Navigation */}
              <nav className="flex items-center space-x-8">
                <Link
                  href={lastAnalysisPage}
                  className="flex items-center space-x-2 text-base font-semibold text-black relative pb-4 border-b-2 border-[#FF5722] transition-colors"
                >
                  <BarChart3 className="w-5 h-5" />
                  <span>Analysis</span>
                </Link>
                <Link
                  href="/profile"
                  className="flex items-center space-x-2 text-base font-medium text-gray-600 hover:text-gray-900 transition-colors pb-4"
                >
                  <User className="w-5 h-5" />
                  <span>Profile</span>
                </Link>
              </nav>
            </div>

            {/* Right side - User Menu */}
            <div className="flex items-center">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center space-x-2 hover:bg-gray-50 rounded-lg px-2 py-1 transition-colors">
                    <div className="w-8 h-8 bg-[#FF5722] rounded-full flex items-center justify-center text-white font-medium">
                      {getUserInitials()}
                    </div>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-3 py-2">
                    <p className="text-sm font-medium text-gray-900">{userProfile?.name || 'User'}</p>
                    <p className="text-xs text-gray-500">{userProfile?.email || session?.user?.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="flex items-center space-x-2 cursor-pointer">
                      <User className="w-4 h-4" />
                      <span>Profile</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="flex items-center space-x-2 cursor-pointer">
                    <Settings className="w-4 h-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="flex items-center space-x-2 cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Stats and Recent Analyses */}
          <div className="lg:col-span-1 space-y-6">
            {/* Welcome Card */}
            <Card className="bg-gradient-to-br from-[#FF5722] to-[#E64A19] text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold mb-2">
                      Welcome, {userProfile?.name?.split(' ')[0] || 'there'}!
                    </h2>
                    <p className="text-orange-100 text-sm">Ready to land your dream role?</p>
                  </div>
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <Zap className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <BarChart3 className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">12</p>
                      <p className="text-xs text-gray-600">Analyses</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">85%</p>
                      <p className="text-xs text-gray-600">Avg Score</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Analyses */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold">Recent Analyses</CardTitle>
                  <Link href="/analysis-history">
                    <Button variant="ghost" size="sm" className="text-[#FF5722] hover:text-[#E64A19]">
                      View All
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentAnalyses.map((analysis) => (
                  <div key={analysis.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm text-gray-900">{analysis.jobTitle}</h4>
                      <div className="flex items-center space-x-2 mt-1">
                        <Building className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-600">{analysis.company}</span>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-600">{analysis.date}</span>
                      </div>
                    </div>
                    <Badge className={`text-xs font-medium border ${getScoreColor(analysis.score)}`}>
                      {analysis.score}%
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Analysis Form */}
          <div className="lg:col-span-2">
            <Card className="shadow-lg">
              <CardHeader className="text-center pb-6 bg-gradient-to-r from-gray-50 to-blue-50 rounded-t-lg">
                <CardTitle className="text-2xl font-bold text-gray-900 mb-2">Start a New Analysis</CardTitle>
                <p className="text-gray-600">Get detailed analysis of your resume against any job description</p>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                {/* Job Title */}
                <div className="space-y-2">
                  <Label htmlFor="jobTitle" className="text-sm font-medium text-gray-700 flex items-center">
                    <Target className="w-4 h-4 mr-2 text-[#FF5722]" />
                    Job Title
                  </Label>
                  <Input
                    id="jobTitle"
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="e.g. Senior Software Engineer"
                    className="w-full transition-all duration-200 focus:ring-2 focus:ring-[#FF5722] focus:border-[#FF5722]"
                  />
                </div>

                {/* Company Name */}
                <div className="space-y-2">
                  <Label htmlFor="companyName" className="text-sm font-medium text-gray-700 flex items-center">
                    <Building className="w-4 h-4 mr-2 text-[#FF5722]" />
                    Company Name
                  </Label>
                  <Input
                    id="companyName"
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Google, Microsoft, Airbnb"
                    className="w-full transition-all duration-200 focus:ring-2 focus:ring-[#FF5722] focus:border-[#FF5722]"
                  />
                </div>

                {/* Job Description */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="jobDescription" className="text-sm font-medium text-gray-700 flex items-center">
                      <FileText className="w-4 h-4 mr-2 text-[#FF5722]" />
                      Job Description
                    </Label>
                    <span
                      className={`text-xs ${characterCount > maxCharacters * 0.9 ? "text-red-500" : "text-gray-500"}`}
                    >
                      {characterCount}/{maxCharacters}
                    </span>
                  </div>
                  <div className="relative">
                    <Textarea
                      id="jobDescription"
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                      placeholder="Paste the full job description here..."
                      className="w-full min-h-[200px] resize-none transition-all duration-200 focus:ring-2 focus:ring-[#FF5722] focus:border-[#FF5722]"
                      rows={8}
                      maxLength={maxCharacters}
                    />
                  </div>
                </div>

                {/* Resume Selector */}
                <div className="space-y-2">
                  <Label htmlFor="resumeSelect" className="text-sm font-medium text-gray-700 flex items-center">
                    <FileText className="w-4 h-4 mr-2 text-[#FF5722]" />
                    Analyze using this resume:
                  </Label>
                  {userResumes.length > 0 ? (
                    <Select value={selectedResume} onValueChange={setSelectedResume}>
                      <SelectTrigger className="w-full transition-all duration-200 focus:ring-2 focus:ring-[#FF5722] focus:border-[#FF5722]">
                        <SelectValue placeholder="Select a resume to analyze" />
                      </SelectTrigger>
                      <SelectContent>
                        {userResumes.map((resume) => (
                          <SelectItem key={resume.resume_id} value={resume.resume_id}>
                            <div className="flex items-center space-x-2">
                              <FileText className="w-4 h-4 text-gray-400" />
                              <span>{resume.name}</span>
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
                        className="text-[#FF5722] border-[#FF5722] hover:bg-[#FF5722] hover:text-white"
                        onClick={() => setShowUploadModal(true)}
                      >
                        Upload Resume
                      </Button>
                    </div>
                  )}
                </div>

                {/* Analyze Button */}
                <div className="pt-4">
                  <Button
                    onClick={handleAnalyze}
                    className="w-full bg-gradient-to-r from-[#FF5722] to-[#E64A19] hover:from-[#E64A19] hover:to-[#D84315] text-white font-medium py-4 text-base transition-all duration-200 transform hover:scale-[1.02] disabled:transform-none"
                    disabled={!jobTitle || !companyName || !jobDescription || !selectedResume || isAnalyzing}
                  >
                    {isAnalyzing ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Analyzing...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <Zap className="w-5 h-5" />
                        <span>Analyze Now</span>
                      </div>
                    )}
                  </Button>
                </div>
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
                          // Refresh the resumes list
                          try {
                            const resumesData = await fetchResumes()
                            setUserResumes(resumesData)
                          } catch (error) {
                            console.error("Failed to refresh resumes:", error)
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

                {/* Additional Info */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Clock className="w-3 h-3 text-white" />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-blue-900 mb-1">Analysis takes ~20 seconds</h4>
                      <p className="text-xs text-blue-700">
                        Our AI will analyze your resume against the job requirements and provide detailed insights.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}