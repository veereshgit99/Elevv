"use client"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Brain,
  BarChart3,
  User,
  Settings,
  LogOut,
  ChevronDown,
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
} from "lucide-react"
import { useAnalysisNavigation } from "@/components/analysis-navigation-context"

export default function AnalysisResultsPage() {
  const router = useRouter()
  const { lastAnalysisPage } = useAnalysisNavigation()

  // Sample analysis data - in real app, this would come from the backend
  const analysisData = {
    overallScore: 75,
    jobTitle: "Senior Software Engineer",
    companyName: "Google",
    strengthSummary:
      "Your technical background in full-stack development and experience with microservices architecture align well with this role. Your proven track record of optimizing system performance and working with cloud technologies demonstrates the core competencies Google is seeking. However, there are opportunities to better highlight your leadership experience and specific expertise with Google's preferred tech stack.",
    topStrengths: [
      "Strong full-stack development experience with modern frameworks",
      "Proven track record of system optimization and performance improvements",
      "Experience with microservices architecture and cloud platforms",
      "Demonstrated ability to work in agile development environments",
      "Quantifiable achievements in reducing processing time and costs",
    ],
    criticalGaps: [
      "Limited mention of leadership or mentoring experience",
      "Missing specific experience with Google Cloud Platform (GCP)",
      "No mention of machine learning or AI experience",
      "Lack of open-source contributions or community involvement",
      "Missing experience with large-scale distributed systems",
    ],
    experienceMatches: [
      {
        userExperience:
          "Built a purchase order microservice for SAP ERP to automate manual workflows, reducing processing time by 90% for 5K+ monthly orders",
        jobResponsibility:
          "Design and implement scalable microservices architecture to support high-volume transaction processing",
        reasoning:
          "Your experience building microservices that handle high-volume transactions (5K+ monthly orders) directly aligns with the requirement for scalable architecture. The 90% processing time reduction demonstrates your ability to optimize system performance.",
      },
      {
        userExperience:
          "Optimized API response time by 30% using Redis caching, improving overall user engagement by 20%",
        jobResponsibility:
          "Optimize application performance and implement caching strategies for improved user experience",
        reasoning:
          "Your hands-on experience with Redis caching and measurable performance improvements (30% faster response time, 20% better engagement) perfectly matches the performance optimization requirements.",
      },
      {
        userExperience:
          "Migrated legacy applications to SAP Cloud, cutting infrastructure costs by 20% and improving scalability",
        jobResponsibility: "Lead cloud migration initiatives and modernize legacy systems",
        reasoning:
          "Your cloud migration experience, including cost reduction (20%) and scalability improvements, demonstrates the technical leadership and modernization skills required for this role.",
      },
    ],
  }

  const handleSignOut = () => {
    router.push("/")
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600"
    if (score >= 60) return "text-yellow-600"
    return "text-red-600"
  }

  const getScoreGradient = (score: number) => {
    if (score >= 80) return "from-green-400 to-green-600"
    if (score >= 60) return "from-yellow-400 to-orange-500"
    return "from-red-400 to-red-600"
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
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Navigation */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push("/dashboard")}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 p-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Analysis</span>
          </Button>
        </div>

        {/* Job Info Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Analysis Results: {analysisData.jobTitle}</h1>
          <p className="text-gray-600">at {analysisData.companyName}</p>
        </div>

        {/* 1. At-a-Glance Summary Section */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-8 mb-8 border border-blue-100">
          <div className="flex flex-col lg:flex-row items-center lg:items-start gap-8">
            {/* Score Gauge */}
            <div className="flex-shrink-0">
              <div className="relative w-48 h-48">
                {/* Background Circle */}
                <svg className="w-48 h-48 transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    className="text-gray-200"
                  />
                  {/* Progress Circle */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="url(#gradient)"
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={`${2 * Math.PI * 40}`}
                    strokeDashoffset={`${2 * Math.PI * 40 * (1 - analysisData.overallScore / 100)}`}
                    className="transition-all duration-1000 ease-out"
                    strokeLinecap="round"
                  />
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" className="stop-color-yellow-400" />
                      <stop offset="100%" className="stop-color-orange-500" />
                    </linearGradient>
                  </defs>
                </svg>
                {/* Score Text */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className={`text-4xl font-bold ${getScoreColor(analysisData.overallScore)}`}>
                      {analysisData.overallScore}%
                    </div>
                    <div className="text-sm text-gray-600 font-medium">Match Score</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Summary Content */}
            <div className="flex-1 text-center lg:text-left">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">A Good Match, with Room to Improve</h2>
              <p className="text-lg text-gray-700 leading-relaxed mb-6">{analysisData.strengthSummary}</p>
              <div className="flex justify-center lg:justify-start">
                <Button
                  size="lg"
                  className="bg-[#FF5722] hover:bg-[#E64A19] text-white px-8 py-3 text-lg font-semibold"
                  onClick={() => router.push("/enhancements")}
                >
                  Tailor Your Resume
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Detailed Breakdown Section */}
        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          {/* Top Strengths */}
          <Card className="h-fit">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center space-x-2 text-xl">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <span>Your Top Strengths</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {analysisData.topStrengths.map((strength, index) => (
                  <li key={index} className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-black rounded-full mt-2 flex-shrink-0"></div>
                    <span className="text-gray-700 leading-relaxed">{strength}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Critical Gaps */}
          <Card className="h-fit">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center space-x-2 text-xl">
                <AlertTriangle className="w-6 h-6 text-yellow-600" />
                <span>Critical Gaps to Address</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {analysisData.criticalGaps.map((gap, index) => (
                  <li key={index} className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-black rounded-full mt-2 flex-shrink-0"></div>
                    <span className="text-gray-700 leading-relaxed">{gap}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* 3. Deep Dive: Experience Match Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">How Your Experience Compares</h2>
          <div className="space-y-6">
            {analysisData.experienceMatches.map((match, index) => (
              <Card key={index} className="border-l-4 border-l-blue-500">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {/* Your Experience */}
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Your Experience</h3>
                      <p className="text-gray-700 bg-blue-50 p-4 rounded-lg border border-blue-100">
                        {match.userExperience}
                      </p>
                    </div>

                    {/* Matched Job Responsibility */}
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Matched to Job Responsibility</h3>
                      <p className="text-gray-700 bg-green-50 p-4 rounded-lg border border-green-100">
                        {match.jobResponsibility}
                      </p>
                    </div>

                    {/* AI Reasoning */}
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Reasoning</h3>
                      <p className="text-gray-600 italic bg-gray-50 p-4 rounded-lg border border-gray-100">
                        {match.reasoning}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="bg-gradient-to-r from-slate-50 to-gray-100 rounded-2xl p-8 text-center">
          <h3 className="text-2xl font-bold mb-4 text-gray-900">Ready to Optimize Your Resume?</h3>
          <p className="text-lg mb-6 text-gray-700">
            Use these insights to tailor your resume and increase your chances of landing this role.
          </p>
          <Button
            size="lg"
            className="bg-[#FF5722] hover:bg-[#E64A19] text-white px-8 py-3 text-lg font-semibold"
            onClick={() => router.push("/enhancements")}
          >
            Start Tailoring Now
          </Button>
        </div>
      </main>
    </div>
  )
}
