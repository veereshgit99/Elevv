"use client"

import { useState, useEffect, useRef } from "react"
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
  Brain,
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
  Settings,
  LogOut,
  ChevronDown,
  X,
  GraduationCap,
  Briefcase,
} from "lucide-react"
import { useAnalysisNavigation } from "@/components/analysis-navigation-context"

// Add this import with your other imports
import { useSession } from "next-auth/react"
import { fetchResumes, fetchUserProfile } from "@/utils/api"
import { ResumeUpload } from "@/components/resume-upload"

type EditSection = "personal" | "education" | "work-experience" | null

export default function ProfilePage() {
  const [showToRecruiters, setShowToRecruiters] = useState(true)
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

  // Add this with your other state declarations (around line 35)
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)

  // Sample resume data
  const [resumes, setResumes] = useState([
    {
      id: "resume-1",
      name: "Veeresh_Koliwad_Resume",
      jobTitle: "Software Engineer",
      created: "14 days ago",
    },
    {
      id: "resume-2",
      name: "Veeresh_Koliwad_Frontend",
      jobTitle: "Frontend Developer",
      created: "7 days ago",
    },
  ])

  // Personal form data
  const [personalData, setPersonalData] = useState({
    firstName: "Veeresh",
    lastName: "Koliwad",
    email: "veeresh.koliwad@email.com",
    phone: "+1 (555) 123-4567",
    location: "Bangalore, Karnataka, India",
    linkedin: "https://linkedin.com/in/veeresh-koliwad",
    website: "",
  })

  // Education form data
  const [educationData, setEducationData] = useState([
    {
      id: 1,
      institution: "Arizona State University",
      degree: "M.S. in Computer Science",
      startYear: "2019",
      endYear: "2021",
      location: "Tempe, AZ",
      description:
        "Specialized in Software Engineering and Data Structures. Relevant coursework: Advanced Algorithms, Database Systems, Software Architecture.",
    },
    {
      id: 2,
      institution: "RV College of Engineering",
      degree: "B.S. in Computer Science",
      startYear: "2015",
      endYear: "2019",
      location: "Bangalore, India",
      description:
        "Foundation in Computer Science fundamentals. Relevant coursework: Data Structures, Object-Oriented Programming, Computer Networks, Operating Systems.",
    },
  ])

  // Work experience form data
  const [workData, setWorkData] = useState([
    {
      id: 1,
      title: "Associative Software Developer",
      company: "SAP LABS",
      startDate: "Jul 2021",
      endDate: "Dec 2023",
      location: "Bangalore, India",
      type: "Full-Time",
      description:
        "Built a purchase order microservice for SAP ERP to automate manual workflows, reducing processing time by 90% for 5K+ monthly orders.\n\nMigrated legacy applications to SAP Cloud, cutting infrastructure costs by 20% and improving scalability.\n\nOptimized API response time by 30% using Redis caching, improving overall user engagement by 20%.\n\nCollaborated with cross-functional teams to deliver enterprise-grade solutions serving 10K+ users.",
    },
    {
      id: 2,
      title: "Software Engineering Intern",
      company: "Tata Consultancy Services",
      startDate: "Jun 2020",
      endDate: "Aug 2020",
      location: "Mumbai, India",
      type: "Internship",
      description:
        "Developed and tested web applications using Java Spring Boot and React.js.\n\nParticipated in agile development processes and code reviews with senior developers.\n\nContributed to documentation and testing procedures for client-facing applications.",
    },
  ])

  // Update your useEffect or wherever you fetch data
  useEffect(() => {
    const loadProfileData = async () => {
      setIsLoadingProfile(true)
      try {
        // Fetch all your data here
        const [profileData, resumesData] = await Promise.all([
          fetchUserProfile(),
          fetchResumes()
        ])


        // Transform and set resumes
        const transformedResumes = resumesData.map((resume: any) => ({
          id: resume.resume_id,
          name: resume.name || resume.file_name,
          jobTitle: "Software Engineer",
          created: new Date(resume.created_at).toLocaleDateString(),
        }))
        setResumes(transformedResumes)

      } catch (error) {
        console.error("Failed to load profile data:", error)
      } finally {
        setIsLoadingProfile(false)
      }
    }

    loadProfileData()
  }, [])

  const scrollToSection = (sectionId: string) => {
    const refs = {
      personal: personalRef,
      education: educationRef,
      "work-experience": workExperienceRef,
    }

    const targetRef = refs[sectionId as keyof typeof refs]
    if (targetRef.current) {
      const yOffset = -140 // Account for sticky header + navigation menu
      const y = targetRef.current.getBoundingClientRect().top + window.pageYOffset + yOffset
      window.scrollTo({ top: y, behavior: "smooth" })
    }
  }

  const handleMakePrimary = (resumeId: string) => {
    setPrimaryResumeId(resumeId)
  }

  const handleDeleteResume = (resumeId: string) => {
    setResumes(resumes.filter((resume) => resume.id !== resumeId))
    if (primaryResumeId === resumeId) {
      setPrimaryResumeId(resumes.find((r) => r.id !== resumeId)?.id || "")
    }
  }

  const handleExportResume = (resumeId: string) => {
    // Handle resume export/download logic here
    console.log("Export resume:", resumeId)
  }

  const handlePreviewResume = (resumeId: string) => {
    // Handle resume preview logic here
    console.log("Preview resume:", resumeId)
  }

  const handleEditResume = (resumeId: string) => {
    const resume = resumes.find((r) => r.id === resumeId)
    if (resume) {
      setEditForm({ name: resume.name, jobTitle: resume.jobTitle })
      setEditingResume(resumeId)
      setIsEditModalOpen(true)
    }
  }

  const handleSaveEdit = () => {
    if (editingResume) {
      setResumes(
        resumes.map((resume) =>
          resume.id === editingResume ? { ...resume, name: editForm.name, jobTitle: editForm.jobTitle } : resume,
        ),
      )
      setEditingResume(null)
      setEditForm({ name: "", jobTitle: "" })
      setIsEditModalOpen(false)
    }
  }

  const handleCancelEdit = () => {
    setEditingResume(null)
    setEditForm({ name: "", jobTitle: "" })
    setIsEditModalOpen(false)
  }

  const handleSignOut = () => {
    // Handle sign out logic here
    router.push("/")
  }

  const handleEditSection = (section: EditSection) => {
    setEditingSection(section)
  }

  const handleSaveSection = () => {
    // Save logic would go here
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
              <Button onClick={handleSaveSection} className="bg-[#FF5722] hover:bg-[#E64A19] text-white">
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (isLoadingProfile) {
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
                    className="flex items-center space-x-2 text-base font-medium text-gray-600 hover:text-gray-900 transition-colors pb-4"
                  >
                    <BarChart3 className="w-5 h-5" />
                    <span>Analysis</span>
                  </Link>
                  <Link
                    href="/profile"
                    className="flex items-center space-x-2 text-base font-semibold text-black relative pb-4 border-b-2 border-[#FF5722] transition-colors"
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

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex gap-8">
            {/* Skeleton for sidebar */}
            <div className="w-72 flex-shrink-0">
              <Card className="p-6">
                <div className="animate-pulse">
                  <div className="w-24 h-24 bg-gray-200 rounded-full mx-auto mb-4"></div>
                  <div className="h-6 bg-gray-200 rounded w-3/4 mx-auto mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
                </div>
              </Card>
            </div>

            {/* Skeleton for main content */}
            <div className="flex-1">
              <Card>
                <CardContent className="p-6">
                  <div className="animate-pulse space-y-4">
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-10 bg-gray-200 rounded"></div>
                    <div className="h-10 bg-gray-200 rounded"></div>
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
                  className="flex items-center space-x-2 text-base font-medium text-gray-600 hover:text-gray-900 transition-colors pb-4"
                >
                  <BarChart3 className="w-5 h-5" />
                  <span>Analysis</span>
                </Link>
                <Link
                  href="/profile"
                  className="flex items-center space-x-2 text-base font-semibold text-black relative pb-4 border-b-2 border-[#FF5722] transition-colors"
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

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Left Sidebar - Now Sticky */}
          <div className="w-72 flex-shrink-0">
            <div className="sticky top-24">
              <Card className="p-6">
                {/* User Avatar and Info */}
                <div className="text-center mb-8">
                  <div className="w-24 h-24 bg-[#FF5722] rounded-full flex items-center justify-center text-white text-3xl font-bold mx-auto mb-4">
                    VK
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Veeresh Koliwad</h2>
                  <p className="text-gray-600 text-sm mb-4">Software Developer</p>
                  <p className="text-gray-500 text-xs">Previously @ SAP LABS</p>
                </div>

                {/* Navigation Tabs */}
                <div className="space-y-2">
                  <button
                    onClick={() => setActiveTab("profile")}
                    className={`w-full flex items-center space-x-3 p-3 rounded-lg text-left transition-colors ${activeTab === "profile" ? "bg-[#FF5722] text-white" : "text-gray-600 hover:bg-gray-100"
                      }`}
                  >
                    <User className="w-5 h-5" />
                    <span className="font-medium">Profile</span>
                  </button>

                  <button
                    onClick={() => setActiveTab("resume")}
                    className={`w-full flex items-center space-x-3 p-3 rounded-lg text-left transition-colors ${activeTab === "resume" ? "bg-[#FF5722] text-white" : "text-gray-600 hover:bg-gray-100"
                      }`}
                  >
                    <FileText className="w-5 h-5" />
                    <span className="font-medium">Resume</span>
                  </button>
                </div>
              </Card>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {activeTab === "profile" && (
              <div className="space-y-6">
                {/* Sticky Horizontal Navigation */}
                <div className="sticky top-16 z-40 bg-white/95 backdrop-blur-sm rounded-lg border border-gray-200 p-4 shadow-sm mb-6">
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
                </div>

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
                          <div className="h-9 px-3 py-2 border rounded-md bg-gray-50 text-sm">
                            {personalData.firstName}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-sm">Last Name</Label>
                          <div className="h-9 px-3 py-2 border rounded-md bg-gray-50 text-sm">
                            {personalData.lastName}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-sm">Email Address</Label>
                        <div className="h-9 px-3 py-2 border rounded-md bg-gray-50 text-sm flex items-center">
                          <Mail className="h-4 w-4 text-gray-400 mr-2" />
                          {personalData.email}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label className="text-sm">Phone Number</Label>
                          <div className="h-9 px-3 py-2 border rounded-md bg-gray-50 text-sm flex items-center">
                            <Phone className="h-4 w-4 text-gray-400 mr-2" />
                            {personalData.phone}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-sm">Location</Label>
                          <div className="h-9 px-3 py-2 border rounded-md bg-gray-50 text-sm flex items-center">
                            <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                            {personalData.location}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label className="text-sm">LinkedIn Profile</Label>
                          <div className="h-9 px-3 py-2 border rounded-md bg-gray-50 text-sm">
                            {personalData.linkedin}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-sm">Personal Website</Label>
                          <div className="h-9 px-3 py-2 border rounded-md bg-gray-50 text-sm">
                            {personalData.website || "Not provided"}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Education Section */}
                <div ref={educationRef} className="scroll-mt-32">
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
                </div>

                {/* Work Experience Section */}
                <div ref={workExperienceRef} className="scroll-mt-32">
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
                </div>
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
                      <Button
                        onClick={() => setShowUploadModal(true)}
                        className="bg-[#FF5722] hover:bg-[#E64A19] text-white"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Resume
                      </Button>
                    </div>
                  </CardHeader>
                </Card>

                {/* Resume Table */}
                <Card>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                          <tr>
                            <th className="text-left p-4 font-medium text-gray-900">Resume</th>
                            <th className="text-left p-4 font-medium text-gray-900">Job Title</th>
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
                                  <span className="font-medium">{resume.name}</span>
                                  {primaryResumeId === resume.id && (
                                    <span className="absolute -top-1 left-full ml-2 bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full border border-green-200">
                                      Default
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="p-4 text-gray-600">{resume.jobTitle}</td>
                              <td className="p-4 text-gray-600">{resume.created}</td>
                              <td className="p-4">
                                <div className="flex items-center space-x-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handlePreviewResume(resume.id)}
                                    className="p-1 hover:bg-gray-100 rounded"
                                  >
                                    <Eye className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                                  </Button>
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
                                      <DropdownMenuItem
                                        onClick={() => handleExportResume(resume.id)}
                                        className="flex items-center space-x-2"
                                      >
                                        <Download className="w-4 h-4" />
                                        <span>Export</span>
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => handleMakePrimary(resume.id)}
                                        className="flex items-center space-x-2"
                                      >
                                        <Star className="w-4 h-4" />
                                        <span>Make Primary</span>
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => handleDeleteResume(resume.id)}
                                        className="flex items-center space-x-2 text-red-600 hover:text-red-700"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                        <span>Delete</span>
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
                      <Button onClick={handleSaveEdit} className="bg-[#FF5722] hover:bg-[#E64A19] text-white">
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
                          // Refresh the resumes list
                          try {
                            const resumesData = await fetchResumes()
                            const transformedResumes = resumesData.map((resume: any) => ({
                              id: resume.resume_id,
                              name: resume.name || resume.file_name,
                              jobTitle: "Software Engineer",
                              created: new Date(resume.created_at).toLocaleDateString(),
                              isPrimary: resume.is_primary
                            }))
                            setResumes(transformedResumes)
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
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Panel */}
      {renderEditPanel()}
    </div>
  )
}
