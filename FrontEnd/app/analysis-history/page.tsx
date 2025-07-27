"use client"

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
import { Brain, BarChart3, User, Settings, LogOut, ChevronDown, ArrowLeft, Building, Calendar } from "lucide-react"
import { useAnalysisNavigation } from "@/components/analysis-navigation-context"

export default function AnalysisHistoryPage() {
    const router = useRouter()
    const { lastAnalysisPage } = useAnalysisNavigation()

    // Extended sample analysis history
    const analysisHistory = [
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
        {
            id: 4,
            jobTitle: "Software Development Engineer",
            company: "Amazon",
            score: 85,
            date: "3 weeks ago",
            status: "completed",
        },
        {
            id: 5,
            jobTitle: "Backend Engineer",
            company: "Spotify",
            score: 91,
            date: "1 month ago",
            status: "completed",
        },
        {
            id: 6,
            jobTitle: "DevOps Engineer",
            company: "Uber",
            score: 73,
            date: "1 month ago",
            status: "completed",
        },
        {
            id: 7,
            jobTitle: "Machine Learning Engineer",
            company: "OpenAI",
            score: 68,
            date: "2 months ago",
            status: "completed",
        },
        {
            id: 8,
            jobTitle: "Product Engineer",
            company: "Stripe",
            score: 89,
            date: "2 months ago",
            status: "completed",
        },
        {
            id: 9,
            jobTitle: "Senior Frontend Developer",
            company: "Airbnb",
            score: 94,
            date: "3 months ago",
            status: "completed",
        },
        {
            id: 10,
            jobTitle: "Software Engineer",
            company: "Microsoft",
            score: 82,
            date: "3 months ago",
            status: "completed",
        },
        {
            id: 11,
            jobTitle: "Cloud Engineer",
            company: "Salesforce",
            score: 76,
            date: "4 months ago",
            status: "completed",
        },
        {
            id: 12,
            jobTitle: "Data Engineer",
            company: "Snowflake",
            score: 71,
            date: "4 months ago",
            status: "completed",
        },
    ]

    const handleSignOut = () => {
        router.push("/")
    }

    const getScoreColor = (score: number) => {
        if (score >= 85) return "bg-green-100 text-green-800 border-green-200"
        if (score >= 65) return "bg-yellow-100 text-yellow-800 border-yellow-200"
        return "bg-red-100 text-red-800 border-red-200"
    }

    const getScoreBadgeSize = (score: number) => {
        return "text-lg font-bold px-3 py-1"
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
                        <span>Back to Dashboard</span>
                    </Button>
                </div>

                {/* Page Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">Analysis History</h1>
                            <p className="text-gray-600">View all your past resume analyses and track your progress</p>
                        </div>
                        <div className="flex items-center space-x-4">
                            {/* Summary Stats */}
                            <div className="flex items-center space-x-6 bg-white rounded-lg border px-6 py-3">
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-gray-900">{analysisHistory.length}</div>
                                    <div className="text-xs text-gray-600">Total Analyses</div>
                                </div>
                                <div className="w-px h-8 bg-gray-200"></div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-green-600">
                                        {Math.round(analysisHistory.reduce((acc, item) => acc + item.score, 0) / analysisHistory.length)}%
                                    </div>
                                    <div className="text-xs text-gray-600">Average Score</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Analysis List */}
                <div className="space-y-4">
                    {analysisHistory.map((analysis) => (
                        <Card key={analysis.id} className="border border-gray-200 shadow-sm">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    {/* Left side - Job info */}
                                    <div className="flex-1">
                                        <h3 className="text-xl font-bold text-gray-900 mb-2">{analysis.jobTitle}</h3>
                                        <div className="flex items-center space-x-3 text-gray-600">
                                            <div className="flex items-center space-x-1">
                                                <Building className="w-4 h-4" />
                                                <span className="font-medium">{analysis.company}</span>
                                            </div>
                                            <span className="text-gray-400">•</span>
                                            <div className="flex items-center space-x-1">
                                                <Calendar className="w-4 h-4" />
                                                <span>{analysis.date}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right side - Score badge */}
                                    <div className="flex items-center space-x-4">
                                        <Badge
                                            className={`${getScoreColor(analysis.score)} ${getScoreBadgeSize(
                                                analysis.score,
                                            )} border font-bold`}
                                        >
                                            {analysis.score}%
                                        </Badge>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Empty state (if no analyses) */}
                {analysisHistory.length === 0 && (
                    <div className="text-center py-12">
                        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <BarChart3 className="w-12 h-12 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No analyses yet</h3>
                        <p className="text-gray-600 mb-6">Start your first resume analysis to see your history here.</p>
                        <Button onClick={() => router.push("/dashboard")} className="bg-[#FF5722] hover:bg-[#E64A19] text-white">
                            Start New Analysis
                        </Button>
                    </div>
                )}
            </main>
        </div>
    )
}
