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
import {
  Brain,
  BarChart3,
  User,
  Settings,
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
import { getStoredAnalysisResults } from "@/utils/analysis-storage"

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
  llm_model_used: string
}

export default function EnhancementsPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [copiedText, setCopiedText] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [enhancementData, setEnhancementData] = useState<OptimizationResponse | null>(null)

  useEffect(() => {
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
        console.error('Failed to load enhancements:', err)
        setError('Failed to load enhancement suggestions.')
        setIsLoading(false)
      }
    }

    loadEnhancements()
  }, [router])

  const handleSignOut = () => {
    signOut({ callbackUrl: '/' })
  }

  const handleCopyText = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedText(`${index}`)
      setTimeout(() => setCopiedText(null), 2000)
    } catch (err) {
      console.error("Failed to copy text: ", err)
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

  const getUserInitials = () => {
    if (session?.user?.name) {
      return session.user.name
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#FF5722] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Generating enhancement suggestions...</p>
        </div>
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
      {/* Header */}
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
                <Link
                  href="/dashboard"
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
                    <p className="text-sm font-medium text-gray-900">{session?.user?.name || 'User'}</p>
                    <p className="text-xs text-gray-500">{session?.user?.email}</p>
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Navigation */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push("/analysis-results")}
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

            {/* Score Circle */}
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
                  stroke={getScoreColor(85)}
                  strokeWidth="12"
                  fill="none"
                  strokeDasharray={`${(85 / 100) * 352} 352`}
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-gray-900">{85}%</span>
                <span className="text-sm text-gray-600">Match Score</span>
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
          <Button variant="outline" onClick={() => router.push("/analysis-results")} className="px-6 py-3 text-base">
            Back to Analysis
          </Button>
          <Button
            onClick={() => router.push("/dashboard")}
            className="bg-[#FF5722] hover:bg-[#E64A19] text-white px-6 py-3 text-base"
          >
            Start New Analysis
          </Button>
        </div>
      </main>
    </div>
  )
}