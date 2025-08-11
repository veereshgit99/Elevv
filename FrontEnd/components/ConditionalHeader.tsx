"use client"

import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import AppHeader from "@/components/ui/AppHeader"
import Logo from "@/components/Logo";

export default function ConditionalHeader() {
    const pathname = usePathname()
    const { status } = useSession()

    // Define routes that should show the header
    const appRoutes = ["/dashboard", "/profile", "/analysis-results", "/enhancements"]

    // Show header if on an app route (regardless of auth status)
    const shouldShowHeader = appRoutes.some(route => pathname.startsWith(route))

    if (shouldShowHeader && status === "loading") {
        // Skeleton header bar with real logo, nav, and avatar icon
        return (
            <header className="bg-black sticky top-0 z-50 backdrop-blur-sm bg-black/95 border-b border-gray-800 animate-pulse">
                <div className="container mx-auto px-4">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center gap-8">
                            {/* Actual Logo */}
                            <Logo variant="dark" />
                            {/* Actual Navigation */}
                            <nav className="hidden md:flex items-center gap-8">
                                <span className="text-sm font-medium text-white opacity-70">Analysis</span>
                                <span className="text-sm font-medium text-white opacity-70">Profile</span>
                            </nav>
                        </div>
                        <div className="flex items-center">
                            {/* Actual Avatar Icon */}
                            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M6 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" /></svg>
                            </div>
                        </div>
                    </div>
                </div>
            </header>
        )
    }

    return shouldShowHeader ? <AppHeader /> : null
}
