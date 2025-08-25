"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Logo from "@/components/Logo"
import { User, MessageSquare, LogOut, Trash2 } from "lucide-react"
import { useAnalysisNavigation } from "@/components/analysis-navigation-context"
import FeedbackModal from "@/components/FeedbackModal"
import { useState, useEffect } from "react"
import { fetchUserProfile } from "@/utils/api"
import { authenticatedFetch } from "@/utils/api"

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface UserProfile {
    user_id: string
    email: string
    name: string
}

const FILES_API_URL = process.env.NEXT_PUBLIC_FILES_API_URL;

export default function AppHeader() {
    const pathname = usePathname()
    const { data: session } = useSession()
    const { lastAnalysisPage } = useAnalysisNavigation()
    const [showFeedbackModal, setShowFeedbackModal] = useState(false)
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
    const router = useRouter()
    const [isDeletingAccount, setIsDeletingAccount] = useState(false);

    useEffect(() => {
        const loadProfile = async () => {
            if (session?.accessToken) {
                try {
                    const profile = await fetchUserProfile(session.accessToken as string)
                    setUserProfile(profile)
                } catch (error) {
                }
            }
        }
        loadProfile()
    }, [session])

    const getUserFullName = () => userProfile?.name || session?.user?.name || "User"
    const getUserEmail = () => userProfile?.email || session?.user?.email || ""

    const handleSignOut = () => {
        signOut({ callbackUrl: "/login" })
    }

    const handleDeleteAccount = async () => {
        try {

            setIsDeletingAccount(true);

            const backendUrl = FILES_API_URL;
            const response = await authenticatedFetch(`${backendUrl}/users/me`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || "Failed to delete account.");
            }

            // Sign out locally, then push to login with a banner flag
            await signOut({ redirect: false });
            await new Promise((r) => setTimeout(r, 100));
            router.replace("/login?deleted=1");
        } catch (error) {
            alert("Failed to delete account. Please try again.");
            setIsDeletingAccount(false);
        }
    };

    const navLinks = [
        { href: lastAnalysisPage, label: "Analysis" },
        { href: "/profile", label: "Profile" },
    ]

    return (
        <header className="bg-black sticky top-0 z-50 backdrop-blur-sm bg-black/95 border-b border-gray-800">
            <div className="container mx-auto px-4">
                <div className="flex justify-between items-center h-16">
                    <div className="flex items-center gap-8">
                        <Logo variant="dark" href="/dashboard" />
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

                                {/* --- THIS IS THE NEW CONDITIONAL LOGIC --- */}
                                {/* Only show this section if the user is on the profile page */}
                                {pathname === "/profile" && (
                                    <>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <DropdownMenuItem
                                                    onSelect={(e) => e.preventDefault()}
                                                    className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                                >
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    <span>Delete account</span>
                                                </DropdownMenuItem>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        This action cannot be undone. This will permanently delete your
                                                        account and remove all of your data.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction
                                                        // Make sure you have the handleDeleteAccount function in this file
                                                        onClick={handleDeleteAccount}

                                                        className="bg-red-600 hover:bg-red-700"
                                                    >
                                                        Delete my account
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </>
                                )}
                                {/* --- END OF NEW LOGIC --- */}

                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </div>
            <FeedbackModal
                isOpen={showFeedbackModal}
                onOpenChange={setShowFeedbackModal}
            />

            {isDeletingAccount && (
                <div className="min-h-screen bg-gray-50">
                    <div className="container mx-auto px-4 py-8">
                        <div className="flex gap-8">
                            {/* Skeleton for sidebar */}
                            <div className="w-72 flex-shrink-0">
                                <Card className="p-6">
                                    <div className="animate-pulse">
                                        <div className="w-24 h-24 bg-gray-200 rounded-full mx-auto mb-4"></div>
                                        <div className="h-3 bg-gray-200 rounded w-2/3 mx-auto"></div>

                                        {/* Navigation skeleton */}
                                        <div className="space-y-2 mt-8">
                                            <div className="h-12 bg-gray-200 rounded animate-pulse"></div>
                                            <div className="h-12 bg-gray-200 rounded animate-pulse"></div>
                                            <div className="h-12 bg-gray-200 rounded animate-pulse"></div>
                                        </div>
                                    </div>
                                </Card>
                            </div>

                            {/* Skeleton for main content */}
                            <div className="flex-1">

                                {/* Content skeleton */}
                                <Card>
                                    <CardContent className="p-6">
                                        <div className="animate-pulse space-y-4">
                                            <div className="h-6 bg-gray-200 rounded w-1/4"></div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="h-10 bg-gray-200 rounded"></div>
                                                <div className="h-10 bg-gray-200 rounded"></div>
                                            </div>
                                            <div className="h-10 bg-gray-200 rounded"></div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="h-10 bg-gray-200 rounded"></div>
                                                <div className="h-10 bg-gray-200 rounded"></div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </header>
    )
}