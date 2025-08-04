"use client"

import { useState, useEffect } from "react"
import { Brain } from "lucide-react"
// Note: You will need to create these component files or install a library like shadcn/ui
// For simplicity, I'm assuming you have basic components.
// import { Button } from "@/components/ui/button"
// import { Input } from "@/components/ui/input"
// import { Label } from "@/components/ui/label"
// import { Textarea } from "@/components/ui/textarea"
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function ChromeExtensionPopup() {
  const [isLoading, setIsLoading] = useState(true)
  const [jobTitle, setJobTitle] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [jobDescription, setJobDescription] = useState("")
  const [selectedResume, setSelectedResume] = useState("")

  const userResumes = [
    { id: "1", name: "Software_Engineer_Resume.pdf" },
    { id: "2", name: "Data_Scientist_Resume_v2.pdf" },
  ]

  useEffect(() => {
    // This function will message the content script to parse the page
    if (chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(
          tabs[0].id!,
          { action: "parseJob" },
          (response) => {
            if (response) {
              setJobTitle(response.jobTitle || "");
              setCompanyName(response.companyName || "");
              setJobDescription(response.jobDescription || "");
            }
            setIsLoading(false);
          }
        );
      });
    } else {
      // Fallback for local development
      setTimeout(() => {
        setJobTitle("Senior Software Engineer");
        setCompanyName("Google");
        setJobDescription("Sample job description...");
        setIsLoading(false);
      }, 1000);
    }
  }, [])

  const handleAnalyze = () => {
    console.log("Starting analysis with:", {
      jobTitle,
      companyName,
      jobDescription,
      selectedResume,
    })
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="logo">
          <Brain className="logo-icon" />
          <span>Elevv</span>
        </div>
        <h1>Start a New Analysis</h1>
      </header>

      <main className="app-content">
        <div className="form-group">
          <label htmlFor="job-title">Job Title</label>
          {isLoading ? (
            <div className="skeleton-loader">Parsing...</div>
          ) : (
            <input
              id="job-title"
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
            />
          )}
        </div>

        <div className="form-group">
          <label htmlFor="company-name">Company Name</label>
          {isLoading ? (
            <div className="skeleton-loader">Parsing...</div>
          ) : (
            <input
              id="company-name"
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
          )}
        </div>

        <div className="form-group">
          <label htmlFor="job-description">Job Description</label>
          {isLoading ? (
            <div className="skeleton-loader skeleton-textarea">Parsing...</div>
          ) : (
            <textarea
              id="job-description"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              rows={8}
            />
          )}
        </div>

        <div className="form-group">
          <label htmlFor="resume-select">Analyze using this resume</label>
          <select id="resume-select" value={selectedResume} onChange={(e) => setSelectedResume(e.target.value)}>
            <option value="" disabled>Select a resume</option>
            {userResumes.map((resume) => (
              <option key={resume.id} value={resume.id}>
                {resume.name}
              </option>
            ))}
          </select>
        </div>

        <div className="button-container">
          <button
            onClick={handleAnalyze}
            disabled={isLoading || !jobTitle || !companyName || !jobDescription || !selectedResume}
          >
            {isLoading ? "Parsing..." : "Analyze Now"}
          </button>
        </div>
      </main>
    </div>
  )
}