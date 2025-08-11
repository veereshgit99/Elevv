"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Logo from "@/components/Logo"
import { User, MessageSquare, LogOut } from "lucide-react"
import { useAnalysisNavigation } from "@/components/analysis-navigation-context"
import FeedbackModal from "@/components/FeedbackModal"
import { useState, useEffect } from "react"
import { fetchUserProfile } from "@/utils/api"

interface UserProfile {
    user_id: string
    email: string
    name: string
}

export default function AppHeader() {
    const pathname = usePathname()
    const { data: session } = useSession()
    const { lastAnalysisPage } = useAnalysisNavigation()
    const [showFeedbackModal, setShowFeedbackModal] = useState(false)
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null)

    useEffect(() => {
        const loadProfile = async () => {
            if (session?.accessToken) {
                try {
                    const profile = await fetchUserProfile(session.accessToken as string)
                    setUserProfile(profile)
                } catch (error) {
                    console.error("Failed to fetch user profile for header:", error)
                }
            }
        }
        loadProfile()
    }, [session])

    const getUserFullName = () => userProfile?.name || session?.user?.name || "User"
    const getUserEmail = () => userProfile?.email || session?.user?.email || ""

    const handleSignOut = () => {
        signOut({ callbackUrl: "/" })
    }

    const navLinks = [
        { href: lastAnalysisPage, label: "Analysis" },
        { href: "/profile", label: "Profile" },
    ]

    return (
        <header className="bg-black sticky top-0 z-50 backdrop-blur-sm bg-black/95 border-b border-gray-800">
            <div className="container mx-auto px-4">
                <div className="flex justify-between items-center h-16">
                    <div className="flex items-center gap-8">
                        <Logo variant="dark" />
                        <nav className="hidden md:flex items-center gap-8">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className={`text-sm font-medium ${pathname.startsWith(link.href)
                                        ? "text-white border-b-2 border-white pb-1"
                                        : "text-gray-300 hover:text-white"
                                        }`}
                                >
                                    {link.label}
                                </Link>
                            ))}
                        </nav>
                    </div>

                    <div className="flex items-center">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors">
                                    <User className="h-5 w-5 text-black" />
                                </div>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <div className="px-3 py-2">
                                    <p className="text-sm font-medium text-gray-900">{getUserFullName()}</p>
                                    <p className="text-xs text-gray-500">{getUserEmail()}</p>
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
            </div>
            <FeedbackModal
                isOpen={showFeedbackModal}
                onOpenChange={setShowFeedbackModal}
            />
        </header>
    )
}
