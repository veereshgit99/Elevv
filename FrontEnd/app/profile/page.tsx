"use client"

import { useState, useEffect, useRef } from "react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { deleteResume, updateResumePrimary, fetchAnalyses, updateUserProfile, updateResume, fetchUserProfile, fetchResumes } from "@/utils/api"
import { ResumeSkeleton } from "@/components/resume-skeleton"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import {
  FileText,
  User,
  Plus,
  Eye,
  MoreHorizontal,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Building,
  Trash2,
  Star,
  Download,
  Edit,
  Info,
  BarChart3,
  MessageSquare,
  LogOut,
  ChevronDown,
  X,
  GraduationCap,
  Briefcase,
} from "lucide-react"
import { useAnalysisNavigation } from "@/components/analysis-navigation-context"

// Add this import with your other imports
import { signOut, useSession } from "next-auth/react"
import { ResumeUpload } from "@/components/resume-upload"
import FeedbackModal from "@/components/FeedbackModal"

// Add this at the top of your profile page component, after imports
interface UserProfile {
  user_id: string
  email: string
  name: string
  phone?: string
  location?: string
  linkedin?: string
  website?: string
}

type EditSection = "personal" | "education" | "work-experience" | null

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const [activeSection, setActiveSection] = useState("personal")
  const [activeTab, setActiveTab] = useState("profile")
  const [primaryResumeId, setPrimaryResumeId] = useState("resume-1")
  const [editingResume, setEditingResume] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ name: "", jobTitle: "" })
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingSection, setEditingSection] = useState<EditSection>(null)
  const router = useRouter()
  const { lastAnalysisPage } = useAnalysisNavigation()

  const personalRef = useRef<HTMLDivElement>(null)
  const educationRef = useRef<HTMLDivElement>(null)
  const workExperienceRef = useRef<HTMLDivElement>(null)


  // Add this with your other state declarations (around line 35-40)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)

  // Add user profile state
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)
  const [isLoadingUserData, setIsLoadingUserData] = useState(true)

  // Update personal data to be dynamic
  const [personalData, setPersonalData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    location: "",
    linkedin: "",
    website: "",
  })

  // Add analysis history state with your other state declarations
  const [analysisHistory, setAnalysisHistory] = useState<any[]>([])
  const [isLoadingAnalyses, setIsLoadingAnalyses] = useState(false)

  // Resume form data
  const [resumes, setResumes] = useState<any[]>([])
  const [isLoadingResumes, setIsLoadingResumes] = useState(false)
  const [isRefreshingResumes, setIsRefreshingResumes] = useState(false) // For upload refresh

  // Education form data
  const [educationData, setEducationData] = useState<any[]>([])

  // Work experience form data
  const [workData, setWorkData] = useState<any[]>([])

  // Update your useEffect or wherever you fetch data
  useEffect(() => {
    const handleScroll = () => {
      const sections = [
        { id: 'personal', ref: personalRef },
        { id: 'education', ref: educationRef },
        { id: 'work-experience', ref: workExperienceRef }
      ]

      const scrollPosition = window.scrollY + 200 // Offset for sticky header

      for (let i = sections.length - 1; i >= 0; i--) {
        const section = sections[i]
        if (section.ref.current) {
          const offsetTop = section.ref.current.offsetTop
          if (scrollPosition >= offsetTop) {
            setActiveSection(section.id)
            break
          }
        }
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Update the useEffect for loading data
  useEffect(() => {
    const loadProfileData = async () => {
      if (status === "loading") return

      if (status === "unauthenticated") {
        router.replace('/login')
        return
      }

      // Make sure we have the access token
      if (!session?.accessToken) {
        console.error('No access token available')
        return
      }

      setIsLoadingProfile(true)
      setIsLoadingUserData(true)
      setIsLoadingResumes(true)

      try {
        // Use the token directly from the session
        const token = session.accessToken as string

        // Fetch user profile and resumes with token
        const [profileData, resumesData] = await Promise.all([
          fetchUserProfile(token),
          fetchResumes(token)
        ])

        // Set user profile data
        if (profileData) {
          setUserProfile(profileData)

          // Parse the name from DB
          const nameParts = (profileData.name || '').split(' ')
          setPersonalData({
            firstName: nameParts[0] || '',
            lastName: nameParts.slice(1).join(' ') || '',
            email: profileData.email || '',
            phone: profileData.phone || '',
            location: profileData.location || '',
            linkedin: profileData.linkedin || '',
            website: profileData.website || ''
          })
        } else {
          // Fallback to session data
          const [firstName, ...lastNameParts] = (session.user?.name || '').split(' ')
          setPersonalData(prev => ({
            ...prev,
            firstName: firstName || '',
            lastName: lastNameParts.join(' ') || '',
            email: session.user?.email || '',
          }))
        }

        // Fix the date formatting
        const transformedResumes = resumesData.map((resume: any, index: number) => ({
          id: resume.resume_id,
          name: resume.name || resume.file_name,
          jobTitle: resume.job_title || "Software Engineer", // Use stored job title
          created: formatDate(resume.created_at), // Fix the date
          isPrimary: resume.is_primary || false // First resume is primary
        }))
        setResumes(transformedResumes)

      } catch (error) {
        console.error("Failed to load profile data:", error)

        // Fallback to session data if API fails
        if (session.user) {
          const [firstName, ...lastNameParts] = (session.user.name || '').split(' ')
          setPersonalData(prev => ({
            ...prev,
            firstName: firstName || '',
            lastName: lastNameParts.join(' ') || '',
            email: session.user.email || '',
          }))
        }
      } finally {
        setIsLoadingProfile(false)
        setIsLoadingUserData(false)
        setIsLoadingResumes(false)
      }
    }

    loadProfileData()
  }, [status, session, router])

  // Fetch analysis history
  useEffect(() => {
    const loadAnalyses = async () => {
      if (activeTab === "analysis-history" && session?.accessToken) {
        setIsLoadingAnalyses(true)
        try {
          // Use the token directly from the session
          const token = session.accessToken as string
          const analyses = await fetchAnalyses(token)

          // Transform the data to match your UI needs
          const transformedAnalyses = analyses
            .filter((analysis: any) => analysis.match_after_enhancement) // Only show enhanced analyses
            .map((analysis: any) => ({
              id: analysis.analysis_id,
              jobTitle: analysis.job_title,
              company: analysis.company_name,
              matchScore: analysis.match_after_enhancement,
              date: getRelativeTime(analysis.enhancement_generated_at || analysis.created_at),
              status: analysis.status || 'completed'
            }))
            .sort((a: any, b: any) => {
              // Sort by date, most recent first
              const dateA = new Date(a.enhancement_generated_at || a.created_at)
              const dateB = new Date(b.enhancement_generated_at || b.created_at)
              return dateB.getTime() - dateA.getTime()
            })

          setAnalysisHistory(transformedAnalyses)
        } catch (error) {
          console.error("Failed to load analyses:", error)
        } finally {
          setIsLoadingAnalyses(false)
        }
      }
    }

    loadAnalyses()
  }, [activeTab, session])


  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength) + "...";
  };

  // Add this helper function
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) {
        return 'Recently uploaded'
      }
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    } catch {
      return 'Recently uploaded'
    }
  }

  // Helper function to format relative time
  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMs = now.getTime() - date.getTime()
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24)) + 1 // +1 to include today

    if (diffInDays === 0) return 'Today'
    if (diffInDays === 1) return '1 day ago'
    if (diffInDays < 7) return `${diffInDays} days ago`
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`
    return `${Math.floor(diffInDays / 30)} months ago`
  }

  // Helper functions for user data
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

  // Update handleDeleteResume to show loading
  const handleDeleteResume = async (resumeId: string) => {
    const resume = resumes.find(r => r.id === resumeId)
    if (resume?.isPrimary) {
      alert("Cannot delete primary resume. Please select another resume as primary first.")
      return
    }

    if (!session?.accessToken) {
      console.error('No access token available')
      return
    }

    setIsRefreshingResumes(true) // Show loading

    try {
      const token = session.accessToken as string
      await deleteResume(token, resumeId)
      // Refresh resumes list
      const resumesData = await fetchResumes(token)
      const transformedResumes = resumesData.map((resume: any, index: number) => ({
        id: resume.resume_id,
        name: resume.name || resume.file_name,
        jobTitle: resume.job_title || "Software Engineer",
        created: formatDate(resume.created_at),
        isPrimary: resume.is_primary || false
      }))
      setResumes(transformedResumes)
    } catch (error) {
      console.error("Failed to delete resume:", error)
    } finally {
      setIsRefreshingResumes(false) // Hide loading
    }
  }

  // Update handleMakePrimary to show loading
  const handleMakePrimary = async (resumeId: string) => {
    if (!session?.accessToken) {
      console.error('No access token available')
      return
    }

    setIsRefreshingResumes(true) // Show loading

    try {
      const token = session.accessToken as string
      await updateResumePrimary(token, resumeId)
      // Update local state
      setResumes(resumes.map(resume => ({
        ...resume,
        isPrimary: resume.id === resumeId
      })))
    } catch (error) {
      console.error("Failed to update primary resume:", error)
    } finally {
      setIsRefreshingResumes(false) // Hide loading
    }
  }

  const handleEditResume = (resumeId: string) => {
    const resume = resumes.find((r) => r.id === resumeId)
    if (resume) {
      setEditForm({ name: resume.name, jobTitle: resume.jobTitle })
      setEditingResume(resumeId)
      setIsEditModalOpen(true)
    }
  }

  // Update handleSaveEdit to show loading
  const handleSaveEdit = async () => {
    if (editingResume && editForm.name.trim() && editForm.jobTitle.trim()) {
      if (!session?.accessToken) {
        console.error('No access token available')
        return
      }

      setIsRefreshingResumes(true) // Show loading

      try {
        const token = session.accessToken as string
        await updateResume(token, editingResume, editForm.name, editForm.jobTitle)

        // Update local state
        setResumes(
          resumes.map((resume) =>
            resume.id === editingResume
              ? { ...resume, name: editForm.name, jobTitle: editForm.jobTitle }
              : resume
          )
        )

        // Reset form and close modal
        setEditingResume(null)
        setEditForm({ name: "", jobTitle: "" })
        setIsEditModalOpen(false)

      } catch (error) {
        console.error("Failed to update resume:", error)
      } finally {
        setIsRefreshingResumes(false) // Hide loading
      }
    }
  }

  const handleCancelEdit = () => {
    setEditingResume(null)
    setEditForm({ name: "", jobTitle: "" })
    setIsEditModalOpen(false)
  }

  const getUserFullName = () => {
    return userProfile?.name || session?.user?.name || 'User'
  }

  const getUserEmail = () => {
    return userProfile?.email || session?.user?.email || ''
  }

  const handleSignOut = () => {
    signOut({ callbackUrl: '/' })
  }

  const handleEditSection = (section: EditSection) => {
    setEditingSection(section)
  }

  const handleSaveSection = async () => {
    if (editingSection === "personal") {
      try {
        if (!session?.accessToken) {
          console.error('No access token available')
          return
        }

        const token = session.accessToken as string
        const updatedProfile = await updateUserProfile(token, personalData)

        // Now TypeScript knows the type of 'prev'
        setUserProfile(prev => ({
          ...prev,
          ...updatedProfile,
          name: `${personalData.firstName} ${personalData.lastName}`.trim()
        }))

        setEditingSection(null)
      } catch (error) {
        console.error("Failed to update profile:", error)
      }
    }

    setEditingSection(null)
  }

  const handleCancelSection = () => {
    setEditingSection(null)
  }

  const renderEditPanel = () => {
    if (!editingSection) return null

    return (
      <div className="fixed inset-0 z-50 overflow-hidden">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black bg-opacity-50" onClick={handleCancelSection} />

        {/* Slide-out panel */}
        <div className="absolute right-0 top-0 h-full w-1/2 bg-white shadow-xl transform transition-transform duration-300 ease-in-out">
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold capitalize">Edit {editingSection?.replace("-", " ")}</h2>
              <button onClick={handleCancelSection} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {editingSection === "personal" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="editFirstName">First Name</Label>
                      <Input
                        id="editFirstName"
                        value={personalData.firstName}
                        onChange={(e) => setPersonalData({ ...personalData, firstName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="editLastName">Last Name</Label>
                      <Input
                        id="editLastName"
                        value={personalData.lastName}
                        onChange={(e) => setPersonalData({ ...personalData, lastName: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="editEmail">Email Address</Label>
                    <Input
                      id="editEmail"
                      type="email"
                      value={personalData.email}
                      onChange={(e) => setPersonalData({ ...personalData, email: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="editPhone">Phone Number</Label>
                      <Input
                        id="editPhone"
                        value={personalData.phone}
                        onChange={(e) => setPersonalData({ ...personalData, phone: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="editLocation">Location</Label>
                      <Input
                        id="editLocation"
                        value={personalData.location}
                        onChange={(e) => setPersonalData({ ...personalData, location: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="editLinkedin">LinkedIn Profile</Label>
                      <Input
                        id="editLinkedin"
                        value={personalData.linkedin}
                        onChange={(e) => setPersonalData({ ...personalData, linkedin: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="editWebsite">Personal Website</Label>
                      <Input
                        id="editWebsite"
                        value={personalData.website}
                        onChange={(e) => setPersonalData({ ...personalData, website: e.target.value })}
                        placeholder="https://your-website.com"
                      />
                    </div>
                  </div>
                </div>
              )}

              {editingSection === "education" && (
                <div className="space-y-6">
                  {educationData.map((edu, index) => (
                    <div key={edu.id} className="border rounded-lg p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium">Education {index + 1}</h3>
                        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 bg-transparent">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Institution</Label>
                          <Input
                            value={edu.institution}
                            onChange={(e) => {
                              const updated = educationData.map((item) =>
                                item.id === edu.id ? { ...item, institution: e.target.value } : item,
                              )
                              setEducationData(updated)
                            }}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Degree</Label>
                          <Input
                            value={edu.degree}
                            onChange={(e) => {
                              const updated = educationData.map((item) =>
                                item.id === edu.id ? { ...item, degree: e.target.value } : item,
                              )
                              setEducationData(updated)
                            }}
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label>Start Year</Label>
                            <Input
                              value={edu.startYear}
                              onChange={(e) => {
                                const updated = educationData.map((item) =>
                                  item.id === edu.id ? { ...item, startYear: e.target.value } : item,
                                )
                                setEducationData(updated)
                              }}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>End Year</Label>
                            <Input
                              value={edu.endYear}
                              onChange={(e) => {
                                const updated = educationData.map((item) =>
                                  item.id === edu.id ? { ...item, endYear: e.target.value } : item,
                                )
                                setEducationData(updated)
                              }}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Location</Label>
                            <Input
                              value={edu.location}
                              onChange={(e) => {
                                const updated = educationData.map((item) =>
                                  item.id === edu.id ? { ...item, location: e.target.value } : item,
                                )
                                setEducationData(updated)
                              }}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Description</Label>
                          <Textarea
                            value={edu.description}
                            onChange={(e) => {
                              const updated = educationData.map((item) =>
                                item.id === edu.id ? { ...item, description: e.target.value } : item,
                              )
                              setEducationData(updated)
                            }}
                            rows={3}
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  <Button variant="outline" className="w-full bg-transparent">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Education
                  </Button>
                </div>
              )}

              {editingSection === "work-experience" && (
                <div className="space-y-6">
                  {workData.map((work, index) => (
                    <div key={work.id} className="border rounded-lg p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium">Experience {index + 1}</h3>
                        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 bg-transparent">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Job Title</Label>
                            <Input
                              value={work.title}
                              onChange={(e) => {
                                const updated = workData.map((item) =>
                                  item.id === work.id ? { ...item, title: e.target.value } : item,
                                )
                                setWorkData(updated)
                              }}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Company</Label>
                            <Input
                              value={work.company}
                              onChange={(e) => {
                                const updated = workData.map((item) =>
                                  item.id === work.id ? { ...item, company: e.target.value } : item,
                                )
                                setWorkData(updated)
                              }}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-4 gap-4">
                          <div className="space-y-2">
                            <Label>Start Date</Label>
                            <Input
                              value={work.startDate}
                              onChange={(e) => {
                                const updated = workData.map((item) =>
                                  item.id === work.id ? { ...item, startDate: e.target.value } : item,
                                )
                                setWorkData(updated)
                              }}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>End Date</Label>
                            <Input
                              value={work.endDate}
                              onChange={(e) => {
                                const updated = workData.map((item) =>
                                  item.id === work.id ? { ...item, endDate: e.target.value } : item,
                                )
                                setWorkData(updated)
                              }}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Location</Label>
                            <Input
                              value={work.location}
                              onChange={(e) => {
                                const updated = workData.map((item) =>
                                  item.id === work.id ? { ...item, location: e.target.value } : item,
                                )
                                setWorkData(updated)
                              }}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Type</Label>
                            <Input
                              value={work.type}
                              onChange={(e) => {
                                const updated = workData.map((item) =>
                                  item.id === work.id ? { ...item, type: e.target.value } : item,
                                )
                                setWorkData(updated)
                              }}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Description</Label>
                          <Textarea
                            value={work.description}
                            onChange={(e) => {
                              const updated = workData.map((item) =>
                                item.id === work.id ? { ...item, description: e.target.value } : item,
                              )
                              setWorkData(updated)
                            }}
                            rows={6}
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  <Button variant="outline" className="w-full bg-transparent">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Experience
                  </Button>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end space-x-3 p-6 border-t bg-gray-50">
              <Button variant="outline" onClick={handleCancelSection}>
                Cancel
              </Button>
              <Button onClick={handleSaveSection} className="bg-black hover:bg-gray-800 text-white">
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Update the loading condition
  if (status === "loading" || isLoadingProfile || isLoadingUserData) {
    return (
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
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {status === "unauthenticated" ? (
        <div /> // Safe placeholder while redirecting
      ) : (
        <>
          <div className="container mx-auto px-4 py-8">
            <div className="flex gap-8">

              {/* Left Sidebar - Now Sticky */}
              <div className="w-72 flex-shrink-0">
                <div className="sticky top-24">
                  <Card className="p-6">

                    {/* User Avatar and Info */}
                    <div className="text-center mb-8">
                      <div className="w-24 h-24 bg-white rounded-full border border-gray-200 flex items-center justify-center text-black text-3xl font-bold mx-auto mb-4">
                        {getUserInitials()}
                      </div>
                      <h2 className="text-xl font-bold text-gray-900 mb-2">{getUserFullName()}</h2>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="space-y-2">
                      <button
                        onClick={() => setActiveTab("profile")}
                        className={`w-full flex items-center space-x-3 p-3 rounded-lg text-left transition-colors ${activeTab === "profile" ? "bg-blue-500 text-white" : "text-gray-600 hover:bg-gray-100"}`}
                      >
                        <User className="w-5 h-5" />
                        <span className="font-medium">Profile</span>
                      </button>

                      <button
                        onClick={() => setActiveTab("resume")}
                        className={`w-full flex items-center space-x-3 p-3 rounded-lg text-left transition-colors ${activeTab === "resume" ? "bg-blue-500 text-white" : "text-gray-600 hover:bg-gray-100"}`}
                      >
                        <FileText className="w-5 h-5" />
                        <span className="font-medium">Resume</span>
                      </button>
                      <button
                        onClick={() => setActiveTab("analysis-history")}
                        className={`w-full flex items-center space-x-3 p-3 rounded-lg text-left transition-colors ${activeTab === "analysis-history" ? "bg-blue-500 text-white" : "text-gray-600 hover:bg-gray-100"}`}
                      >
                        <BarChart3 className="w-5 h-5" />
                        <span className="font-medium">Analysis History</span>
                      </button>
                    </div>
                  </Card>
                </div>
              </div>

              {/* Main Content */}
              <div className="flex-1">
                {activeTab === "profile" && (
                  <div className="space-y-6">

                    {/* Commented menu bar - uncomment when Education and Work Experience sections are ready */}
                    {/* <div className="sticky top-16 z-40 bg-white/95 backdrop-blur-sm rounded-lg border border-gray-200 p-4 shadow-sm mb-6">
                  <nav className="flex space-x-8">
                    <button
                      onClick={() => scrollToSection("personal")}
                      className={`pb-2 text-sm font-medium transition-colors relative ${activeSection === "personal" ? "text-black" : "text-gray-600 hover:text-gray-900"
                        }`}
                    >
                      Personal
                      {activeSection === "personal" && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black"></div>
                      )}
                    </button>
                    <button
                      onClick={() => scrollToSection("education")}
                      className={`pb-2 text-sm font-medium transition-colors relative ${activeSection === "education" ? "text-black" : "text-gray-600 hover:text-gray-900"
                        }`}
                    >
                      Education
                      {activeSection === "education" && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black"></div>
                      )}
                    </button>
                    <button
                      onClick={() => scrollToSection("work-experience")}
                      className={`pb-2 text-sm font-medium transition-colors relative ${activeSection === "work-experience" ? "text-black" : "text-gray-600 hover:text-gray-900"
                        }`}
                    >
                      Work Experience
                      {activeSection === "work-experience" && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black"></div>
                      )}
                    </button>
                  </nav>
                </div> */}

                    {/* Personal Section - Compact Layout */}
                    <div ref={personalRef} className="scroll-mt-32">
                      <Card>
                        <CardHeader className="pb-4 flex flex-row items-center justify-between">
                          <CardTitle className="text-xl font-bold">Personal</CardTitle>
                          <Button variant="outline" size="sm" onClick={() => handleEditSection("personal")} className="p-2">
                            <Edit className="w-4 h-4" />
                          </Button>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <Label className="text-sm">First Name</Label>
                              <div className="h-9 px-3 py-2 border rounded-2xl bg-gray-50 text-sm">
                                {personalData.firstName}
                              </div>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-sm">Last Name</Label>
                              <div className="h-9 px-3 py-2 border rounded-2xl bg-gray-50 text-sm">
                                {personalData.lastName}
                              </div>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-sm">Email Address</Label>
                            <div className="h-9 px-3 py-2 border rounded-2xl bg-gray-50 text-sm flex items-center">
                              <Mail className="h-4 w-4 text-gray-400 mr-2" />
                              {personalData.email}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <Label className="text-sm">Phone Number</Label>
                              <div className="h-9 px-3 py-2 border rounded-2xl bg-gray-50 text-sm flex items-center">
                                <Phone className="h-4 w-4 text-gray-400 mr-2" />
                                {personalData.phone}
                              </div>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-sm">Location</Label>
                              <div className="h-9 px-3 py-2 border rounded-2xl bg-gray-50 text-sm flex items-center">
                                <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                                {personalData.location}
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <Label className="text-sm">LinkedIn Profile</Label>
                              <div className="h-9 px-3 py-2 border rounded-2xl bg-gray-50 text-sm">
                                {personalData.linkedin}
                              </div>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-sm">Personal Website</Label>
                              <div className="h-9 px-3 py-2 border rounded-2xl bg-gray-50 text-sm">
                                {personalData.website || "Not provided"}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Commented out Education Section - can uncomment later */}
                    {/* <div ref={educationRef} className="scroll-mt-32">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className="text-xl font-bold">Education</CardTitle>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditSection("education")}
                        className="p-2"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {educationData.map((edu) => (
                        <div key={edu.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start space-x-4">
                            <div className="w-12 h-12 bg-[#FF5722]/10 rounded-lg flex items-center justify-center">
                              <GraduationCap className="w-6 h-6 text-[#FF5722]" />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900">{edu.institution}</h3>
                              <p className="text-gray-900 text-sm">{edu.degree}</p>
                              <div className="flex items-center space-x-4 text-sm text-gray-600 mt-2">
                                <div className="flex items-center space-x-1">
                                  <Calendar className="w-4 h-4" />
                                  <span>
                                    {edu.startYear} - {edu.endYear}
                                  </span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <MapPin className="w-4 h-4" />
                                  <span>{edu.location}</span>
                                </div>
                              </div>
                              <p className="text-sm text-gray-700 mt-2">{edu.description}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div> */}

                    {/* Commented out Work Experience Section - can uncomment later */}
                    {/* <div ref={workExperienceRef} className="scroll-mt-32">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className="text-xl font-bold">Work Experience</CardTitle>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditSection("work-experience")}
                        className="p-2"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {workData.map((work) => (
                        <div key={work.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start space-x-4">
                            <div className="w-12 h-12 bg-[#FF5722]/10 rounded-lg flex items-center justify-center">
                              <Briefcase className="w-6 h-6 text-[#FF5722]" />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900">{work.title}</h3>
                              <p className="text-gray-900 text-sm">{work.company}</p>
                              <div className="flex items-center space-x-4 text-sm text-gray-600 mt-2">
                                <div className="flex items-center space-x-1">
                                  <Calendar className="w-4 h-4" />
                                  <span>
                                    {work.startDate} - {work.endDate}
                                  </span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <MapPin className="w-4 h-4" />
                                  <span>{work.location}</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <Building className="w-4 h-4" />
                                  <span>{work.type}</span>
                                </div>
                              </div>

                              <div className="mt-4 space-y-2 text-sm text-gray-700">
                                {work.description.split("\n\n").map((paragraph, index) => (
                                  <div key={index} className="flex items-start space-x-2">
                                    <div className="w-1.5 h-1.5 bg-[#FF5722] rounded-full mt-2 flex-shrink-0"></div>
                                    <span>{paragraph}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div> */}
                  </div>
                )}

                {activeTab === "resume" && (
                  <div className="space-y-6">
                    {/* Resume Header */}
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-2xl font-bold">RESUME</CardTitle>
                            <p className="text-gray-600 mt-1">
                              Manage your resume versions and optimize for different roles
                            </p>
                          </div>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div>
                                  <Button
                                    onClick={() => setShowUploadModal(true)}
                                    disabled={resumes.length >= 5}
                                    className={`w-full border text-white ${resumes.length >= 5
                                      ? 'bg-gray-400 border-gray-400 cursor-not-allowed'
                                      : 'bg-black border-black hover:bg-gray-800'
                                      }`}
                                  >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Resume
                                  </Button>
                                </div>
                              </TooltipTrigger>
                              {resumes.length >= 5 && (
                                <TooltipContent>
                                  <div className="flex items-center space-x-2">
                                    <Info className="w-4 h-4 flex-shrink-0" />
                                    <p>You have used all 5 resume slots. Delete a resume before uploading a new one.</p>
                                  </div>
                                </TooltipContent>
                              )}
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </CardHeader>
                    </Card>



                    {/* --- UPDATED: Conditional Rendering --- */}
                    {/* If resumes are loading or refreshing, show the skeleton */}
                    {isLoadingResumes || isRefreshingResumes ? (
                      <ResumeSkeleton />
                    ) : resumes.length === 0 ? (
                      /* Empty State */
                      <Card>
                        <CardContent className="p-12 text-center">
                          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FileText className="w-8 h-8 text-gray-400" />
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">No resumes uploaded yet</h3>
                          <p className="text-gray-600 mb-6">
                            Upload your first resume to get started with AI-powered job matching
                          </p>
                        </CardContent>
                      </Card>
                    ) : (
                      // Otherwise, show the actual resume table
                      <Card>
                        <CardContent className="p-0">
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead className="bg-gray-50 border-b">
                                <tr>
                                  <th className="text-left p-4 font-medium text-gray-900">Resume</th>
                                  <th className="text-center p-4 font-medium text-gray-900">Job Title</th>
                                  <th className="text-left p-4 font-medium text-gray-900">Created</th>
                                  <th className="w-20 p-4"></th>
                                </tr>
                                <tr>
                                  <td colSpan={4} className="px-4 py-2 bg-blue-50 border-b">
                                    <div className="flex items-center space-x-2 text-sm text-blue-800">
                                      <Info className="w-4 h-4 flex-shrink-0" />
                                      <span>You can upload and manage a maximum of 5 resumes.</span>
                                    </div>
                                  </td>
                                </tr>
                              </thead>
                              <tbody>
                                {resumes.map((resume) => (
                                  <tr key={resume.id} className="border-b hover:bg-gray-50">
                                    <td className="p-4">
                                      <div className="relative inline-block">
                                        <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <span className="font-medium">
                                                {truncateText(resume.name, 25)}
                                              </span>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                              <p>{resume.name}</p>
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                        {resume.isPrimary && (
                                          <span className="absolute -top-1 left-full ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full border border-blue-200">
                                            Primary
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="p-4 text-gray-600 text-center">
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <span className="p-4 text-gray-600">
                                              {truncateText(resume.jobTitle, 25)}
                                            </span>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p>{resume.jobTitle}</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    </td>
                                    <td className="p-4 text-gray-600">{resume.created}</td>
                                    <td className="p-4">
                                      <div className="flex items-center space-x-2">
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="sm" className="p-1 hover:bg-gray-100 rounded">
                                              <MoreHorizontal className="w-4 h-4 text-gray-400" />
                                            </Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align="end">
                                            <DropdownMenuItem
                                              onClick={() => handleEditResume(resume.id)}
                                              className="flex items-center space-x-2"
                                            >
                                              <Edit className="w-4 h-4" />
                                              <span>Edit</span>
                                            </DropdownMenuItem>

                                            {!resume.isPrimary && (
                                              <DropdownMenuItem
                                                onClick={() => handleMakePrimary(resume.id)}
                                                className="flex items-center space-x-2"
                                              >
                                                <Star className="w-4 h-4" />
                                                <span>Make Primary</span>
                                              </DropdownMenuItem>
                                            )}
                                            <DropdownMenuItem
                                              onClick={() => resume.isPrimary ? null : handleDeleteResume(resume.id)}
                                              className={`flex items-center space-x-2 ${resume.isPrimary
                                                ? 'text-gray-400 cursor-not-allowed'
                                                : 'text-red-600 hover:text-red-700'
                                                }`}
                                              disabled={resume.isPrimary}
                                            >
                                              <Trash2 className="w-4 h-4" />
                                              <span className="flex items-center gap-1">
                                                Delete
                                                {resume.isPrimary && (
                                                  <span className="text-xs text-gray-500">(Can't delete primary)</span>
                                                )}
                                              </span>
                                            </DropdownMenuItem>
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Edit Resume Modal */}
                    <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                      <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                          <DialogTitle>Edit Resume</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="resumeName">Resume Name</Label>
                            <Input
                              id="resumeName"
                              value={editForm.name}
                              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                              placeholder="Enter resume name"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="jobTitle">Job Title</Label>
                            <Input
                              id="jobTitle"
                              value={editForm.jobTitle}
                              onChange={(e) => setEditForm({ ...editForm, jobTitle: e.target.value })}
                              placeholder="Enter job title"
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={handleCancelEdit}>
                            Cancel
                          </Button>
                          <Button
                            onClick={handleSaveEdit}
                            className="bg-black hover:bg-gray-800 text-white"
                            disabled={!editForm.name.trim() || !editForm.jobTitle.trim()}
                          >
                            Save Changes
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    {/* Upload Resume Modal */}
                    <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
                      <DialogContent className="sm:max-w-[600px]">
                        <DialogHeader>
                          <DialogTitle>Upload New Resume</DialogTitle>
                        </DialogHeader>
                        <div className="py-4">
                          <ResumeUpload
                            onUploadSuccess={async () => {
                              setShowUploadModal(false)
                              setIsRefreshingResumes(true) // Show loading while refreshing

                              try {
                                if (session?.accessToken) {
                                  const token = session.accessToken as string
                                  const resumesData = await fetchResumes(token)
                                  const transformedResumes = resumesData.map((resume: any, index: number) => ({
                                    id: resume.resume_id,
                                    name: resume.name || resume.file_name,
                                    jobTitle: resume.job_title || "Software Engineer",
                                    created: formatDate(resume.created_at),
                                    isPrimary: resume.is_primary || false
                                  }))
                                  setResumes(transformedResumes)
                                }
                              } catch (error) {
                                console.error("Failed to refresh resumes:", error)
                              } finally {
                                setIsRefreshingResumes(false) // Hide loading
                              }
                            }}
                            onUploadError={(error) => {
                              console.error("Upload error:", error)
                              setIsRefreshingResumes(false) // Hide loading on error too
                            }}
                          />
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}

                {activeTab === "analysis-history" && (
                  <div className="space-y-6">
                    {/* Analysis History Header */}
                    <Card>
                      <CardHeader>
                        <div>
                          <CardTitle className="text-2xl font-bold">Analysis History</CardTitle>
                          <p className="text-gray-600 mt-1">
                            View all your past resume analyses and track your progress
                          </p>
                        </div>
                      </CardHeader>
                    </Card>

                    {/* Loading State */}
                    {isLoadingAnalyses ? (
                      <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                          <Card key={i}>
                            <CardContent className="p-6">
                              <div className="animate-pulse">
                                <div className="h-6 bg-gray-200 rounded w-1/3 mb-3"></div>
                                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <>
                        {/* Analysis History List */}
                        <div className="space-y-4">
                          {analysisHistory.map((analysis) => (
                            <Card
                              key={analysis.id}
                              className="hover:shadow-sm transition-shadow cursor-pointer"
                              onClick={() => {
                                // Navigate to analysis results if you want
                                // router.push(`/analysis-results/${analysis.id}`)
                              }}
                            >
                              <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center justify-between mb-2">
                                      <h3 className="text-lg font-semibold text-gray-900">
                                        {analysis.jobTitle}
                                      </h3>
                                      <div className="px-4 py-2 rounded-full text-lg font-bold bg-blue-100 text-blue-800">
                                        {analysis.matchScore}%
                                      </div>
                                    </div>

                                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                                      <div className="flex items-center space-x-1">
                                        <Building className="w-4 h-4" />
                                        <span>{analysis.company}</span>
                                      </div>
                                      <span>•</span>
                                      <div className="flex items-center space-x-1">
                                        <Calendar className="w-4 h-4" />
                                        <span>{analysis.date}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>

                        {/* Empty State */}
                        {analysisHistory.length === 0 && (
                          <Card>
                            <CardContent className="p-12 text-center">
                              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <BarChart3 className="w-8 h-8 text-gray-400" />
                              </div>
                              <h3 className="text-lg font-semibold text-gray-900 mb-2">No enhanced analyses yet</h3>
                              <p className="text-gray-600 mb-6">
                                Complete the "Tailor Your Resume" step after analyzing a job to see your enhanced match scores here.
                              </p>
                              <Button
                                onClick={() => router.push('/dashboard')}
                                className="bg-black border border-black text-white hover:bg-gray-800"
                              >
                                Start Your First Analysis
                              </Button>
                            </CardContent>
                          </Card>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Edit Panel */}
          {renderEditPanel()}

          {/* Feedback Modal */}
          <FeedbackModal
            isOpen={showFeedbackModal}
            onOpenChange={setShowFeedbackModal}
          />
        </>
      )}
    </div>
  )
}
