"use client"

import { useState, useEffect } from "react"
import { Brain, Loader2, FileText } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { AnalysisResults } from "./AnalysisResults" // Your new results component

export default function ChromeExtensionPopup() {
  // --- STATE MANAGEMENT ---
  const [isLoading, setIsLoading] = useState(true)
  const [jobTitle, setJobTitle] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [jobDescription, setJobDescription] = useState("")
  const [selectedResume, setSelectedResume] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [showResults, setShowResults] = useState(false)

  const [analysisData, setAnalysisData] = useState<{
    matchScore: number;
    summary: string;
    strengths: string[];
    gaps: string[];
  }>({
    matchScore: 0,
    summary: "",
    strengths: [],
    gaps: [],
  });

  // Mock data for resumes - this will be replaced with an API call
  const userResumes = [
    { id: "1", name: "Software_Engineer_Resume.pdf" },
    { id: "2", name: "Data_Scientist_Resume_v2.pdf" },
  ]

  // --- DATA FETCHING & PARSING ---
  useEffect(() => {
    // This function messages the content script to parse the page
    setTimeout(() => { // Using a timeout to ensure the UI feels responsive
      if (chrome.tabs && chrome.tabs.query) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]?.id) {
            chrome.tabs.sendMessage(tabs[0].id, { action: "parseJob" }, (response) => {
              if (chrome.runtime.lastError) {
                console.log("Could not establish connection. This is normal on non-job pages.");
                setIsLoading(false);
                return;
              }
              if (response) {
                setJobTitle(response.jobTitle || "");
                setCompanyName(response.companyName || "");
                setJobDescription(response.jobDescription || "");
              }
              setIsLoading(false);
            });
          } else {
            setIsLoading(false);
          }
        });
      } else {
        // Fallback for local development when not in an extension environment
        setJobTitle("Senior Software Engineer");
        setCompanyName("Google");
        setJobDescription("This is a sample job description for local testing.");
        setIsLoading(false);
      }
    }, 500);
  }, [])

  // --- EVENT HANDLERS ---
  const handleAnalyze = () => {
    setIsAnalyzing(true);
    // In a real app, this is where you would make the API call to your AIService
    setTimeout(() => {
      // Set mock analysis data for demonstration
      setAnalysisData({
        matchScore: 75,
        summary: "Your resume shows strong technical alignment but needs key improvements in testing frameworks and cloud experience to better match this Google position.Your resume shows strong technical alignment but needs key improvements in testing frameworks and cloud experience to better match this Google position.",
        strengths: [
          "Strong technical background in React and JavaScript",
          "5+ years of relevant frontend development experience",
          "Leadership experience managing development teams",
          "Proficient in modern development tools and workflows",
          "Experience with version control systems (Git)",
          "Strong problem-solving and analytical skills",
          "Excellent communication and collaboration abilities",
          "Knowledge of responsive web design principles",
          "Understanding of software development lifecycle",
          "Experience with agile development methodologies",
        ],
        gaps: [
          "Missing TypeScript experience mentioned in job requirements",
          "No mention of testing frameworks (Jest, Cypress)",
          "Lack of cloud platform experience (AWS, GCP)",
          "Limited experience with containerization (Docker, Kubernetes)",
          "No mention of CI/CD pipeline experience",
          "Missing backend development skills (Node.js, databases)",
          "Lack of mobile development experience",
          "No experience with microservices architecture",
          "Limited knowledge of performance optimization techniques",
          "Missing experience with GraphQL APIs",
        ],
      });

      setIsAnalyzing(false);
      setShowResults(true);
    }, 2000);
  }

  const handleBackToForm = () => {
    setShowResults(false);
  }

  // --- RENDER LOGIC ---
  return (
    <div className="app-container">
      <header className="app-header">
        <div className="logo">
          <Brain className="logo-icon" />
          <span>Elevv</span>
        </div>
        <h1 className="header-subtitle">
          {showResults ? "Analysis Results" : "Start a New Analysis"}
        </h1>
      </header>

      <main className="app-content">
        <AnimatePresence mode="wait">
          {showResults ? (
            <AnalysisResults
              onBack={handleBackToForm}
              matchScore={analysisData.matchScore}
              summary={analysisData.summary}
              strengths={analysisData.strengths}
              gaps={analysisData.gaps}
            />
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="form-container"
            >
              {isLoading ? (
                <div className="loader-container">
                  <Loader2 className="loader-spinner" />
                  <p>Parsing Job Details...</p>
                </div>
              ) : (
                <>
                  <div className="form-group">
                    <label htmlFor="job-title">Job Title</label>
                    <input id="job-title" type="text" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="company-name">Company Name</label>
                    <input id="company-name" type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="job-description">Job Description</label>
                    <textarea id="job-description" value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} rows={6} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="resume-select">Analyze using this resume</label>
                    <div className="select-wrapper">
                      <FileText className="select-icon" />
                      <select id="resume-select" value={selectedResume} onChange={(e) => setSelectedResume(e.target.value)}>
                        <option value="" disabled>Select a resume</option>
                        {userResumes.map((resume) => (
                          <option key={resume.id} value={resume.id}>{resume.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {!showResults && (
        <footer className="app-footer">
          <motion.button
            onClick={handleAnalyze}
            disabled={isLoading || isAnalyzing || !selectedResume}
            whileTap={{ scale: 0.98 }}
            className="analyze-button"
          >
            {isAnalyzing ? <Loader2 className="loader-spinner-button" /> : "Analyze Now"}
          </motion.button>
        </footer>
      )}
    </div>
  )
}