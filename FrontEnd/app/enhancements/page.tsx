"use client"

import { useState } from "react"
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
import { Brain, BarChart3, User, Settings, LogOut, ChevronDown, ArrowLeft, Copy, Check } from "lucide-react"
import { useAnalysisNavigation } from "@/components/analysis-navigation-context"

export default function EnhancementsPage() {
  const router = useRouter()
  const [copiedText, setCopiedText] = useState<string | null>(null)
  const { lastAnalysisPage } = useAnalysisNavigation()

  // Sample enhancement suggestions data - in real app, this would come from the backend
  const enhancementData = {
    jobTitle: "Senior Software Engineer",
    companyName: "Google",
    enhancement_suggestions: [
      {
        id: 1,
        priority: "critical",
        target_section: "Professional Summary",
        type: "modify",
        original_text_snippet: "Experienced software developer with expertise in full-stack development.",
        suggested_text:
          "Senior Software Engineer with 5+ years of expertise in full-stack development and proven experience building scalable microservices for enterprise applications serving 10K+ users.",
        reasoning:
          "Adding specific years of experience, seniority level, and quantifiable impact metrics makes your summary more compelling and aligns with Google's preference for measurable achievements.",
      },
      {
        id: 2,
        priority: "high",
        target_section: "Experience Section",
        type: "add",
        original_text_snippet: "",
        suggested_text:
          "Led cross-functional team of 4 engineers in architecting cloud-native solutions, resulting in 40% improvement in system reliability and 25% reduction in deployment time.",
        reasoning:
          "Google values leadership experience and cloud expertise. This addition demonstrates both technical leadership and measurable business impact, which are key differentiators for senior roles.",
      },
      {
        id: 3,
        priority: "high",
        target_section: "Technical Skills",
        type: "modify",
        original_text_snippet: "Experience with cloud platforms and microservices",
        suggested_text:
          "Expert-level proficiency in Google Cloud Platform (GCP), Kubernetes, Docker, and microservices architecture with hands-on experience in Cloud Run, BigQuery, and Pub/Sub",
        reasoning:
          "Specifically mentioning GCP and Google's preferred technologies shows direct alignment with their tech stack. The detailed technology list demonstrates depth of knowledge rather than generic cloud experience.",
      },
      {
        id: 4,
        priority: "medium",
        target_section: "Experience Section",
        type: "modify",
        original_text_snippet: "Collaborated with cross-functional teams to deliver enterprise-grade solutions",
        suggested_text:
          "Collaborated with product managers, designers, and data scientists across 3 time zones to deliver enterprise-grade solutions, improving cross-team communication efficiency by 30%",
        reasoning:
          "Google operates globally and values collaboration across diverse teams. Adding specific details about cross-timezone work and quantified improvements in team efficiency demonstrates relevant soft skills.",
      },
      {
        id: 5,
        priority: "medium",
        target_section: "Projects Section",
        type: "add",
        original_text_snippet: "",
        suggested_text:
          "Open Source Contributions: Active contributor to Kubernetes ecosystem with 15+ merged PRs and maintainer of a popular DevOps automation tool with 500+ GitHub stars.",
        reasoning:
          "Google highly values open source contributions and community involvement. This addition shows your commitment to the broader tech community and demonstrates expertise in technologies Google uses internally.",
      },
      {
        id: 6,
        priority: "critical",
        target_section: "Experience Section",
        type: "modify",
        original_text_snippet: "Optimized API response time by 30% using Redis caching",
        suggested_text:
          "Architected and implemented distributed caching strategy using Redis and Memcached, optimizing API response time by 30% and reducing database load by 50% for high-traffic endpoints serving 1M+ daily requests",
        reasoning:
          "Google processes massive scale. Expanding this achievement to show distributed systems thinking, multiple technologies, and specific scale metrics (1M+ requests) demonstrates the kind of high-scale problem-solving Google needs.",
      },
    ],
    overall_feedback:
      "Your resume shows strong technical foundation, but to stand out for Google's Senior Software Engineer role, focus on demonstrating scale, leadership, and specific Google technologies. The suggested enhancements emphasize quantifiable impact, distributed systems experience, and alignment with Google's engineering culture. Implementing these changes will position you as a candidate who can handle Google's technical challenges and contribute to their collaborative, data-driven environment.",
  }

  const handleSignOut = () => {
    router.push("/")
  }

  const handleCopyText = async (text: string, id: number) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedText(`${id}`)
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
                      VK
                    </div>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-3 py-2">
                    <p className="text-sm font-medium text-gray-900">Veeresh Koliwad</p>
                    <p className="text-xs text-gray-500">veeresh.koliwad@email.com</p>
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
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

        {/* Suggestion Cards */}
        <div className="space-y-6 mb-8">
          {enhancementData.enhancement_suggestions.map((suggestion) => (
            <Card key={suggestion.id} className="border border-gray-200 shadow-sm">
              <CardContent className="p-6">
                {/* Priority Tag and Target Section */}
                <div className="flex items-center justify-between mb-4">
                  <Badge className={`${getPriorityColor(suggestion.priority)} font-medium`}>
                    {getPriorityLabel(suggestion.priority)}
                  </Badge>
                  <span className="text-sm font-medium text-gray-600">In your {suggestion.target_section}</span>
                </div>

                {/* Before and After Text */}
                <div className="space-y-4">
                  {/* Original Text (if exists) */}
                  {suggestion.original_text_snippet && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-start space-x-2">
                        <div>
                          <h4 className="text-sm font-semibold text-red-800 mb-1">Current Text:</h4>
                          <p className="text-sm text-red-700">{suggestion.original_text_snippet}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Suggested Text */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-start space-x-2">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-sm font-semibold text-green-800">
                            {suggestion.type === "add" ? "Add This Text:" : "Suggested Improvement:"}
                          </h4>
                          <button
                            onClick={() => handleCopyText(suggestion.suggested_text, suggestion.id)}
                            className="flex items-center space-x-1 text-green-700 hover:text-green-800 transition-colors"
                            title="Copy to clipboard"
                          >
                            {copiedText === `${suggestion.id}` ? (
                              <Check className="w-4 h-4" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                        <p className="text-sm text-green-700">{suggestion.suggested_text}</p>
                      </div>
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

        {/* Overall Feedback */}
        <div className="bg-gradient-to-r from-slate-50 to-gray-100 rounded-2xl p-8 border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Strategic Summary</h2>
          <p className="text-lg text-gray-700 leading-relaxed">{enhancementData.overall_feedback}</p>
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
