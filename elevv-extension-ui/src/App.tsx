"use client"

import { useState, useEffect } from "react"
import { Brain, Loader2, FileText, ExternalLink } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { AnalysisResults } from "./AnalysisResults" // Your new results component
import { EnhancementsPage } from "./EnhancementsPage" // Your new enhancements component

// --- ADD THESE IMPORTS ---
import { fetchResumes, startJobAnalysis, optimizeResume } from "./utils/api";
import type { Resume, AnalysisRequest, OptimizationResponse } from "./utils/api";

// Types for authentication
interface AuthUser {
  id: string;
  email: string;
  name?: string;
  accessToken?: string;
  // Add other user properties you expect from your session
}

export default function ChromeExtensionPopup() {
  // --- AUTHENTICATION STATE ---
  const [isCheckingAuth, setIsCheckingAuth] = useState(true) // Start as true to prevent login flash
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // --- ADD THIS NEW STATE VARIABLE ---
  const [userResumes, setUserResumes] = useState<Resume[]>([]);

  // --- EXISTING STATE MANAGEMENT ---
  const [isLoading, setIsLoading] = useState(true)
  const [jobTitle, setJobTitle] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [jobDescription, setJobDescription] = useState("")
  const [selectedResume, setSelectedResume] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [currentView, setCurrentView] = useState<'form' | 'results' | 'enhancements'>('form')

  const [analysisData, setAnalysisData] = useState<{
    matchScore: number;
    summary: string;
    strengths: string[];
    gaps: string[];
    rawData?: any; // Store the full API response for enhancement generation
  }>({
    matchScore: 0,
    summary: "",
    strengths: [],
    gaps: [],
    rawData: null,
  });

  // --- ENHANCEMENT DATA STATE ---
  const [enhancementsData, setEnhancementsData] = useState<{
    projectedScore: number;
    strategicSummary: string;
    suggestions: Array<{
      id: string;
      context: string;
      priority: 'Critical' | 'High' | 'Medium' | 'Low';
      currentText: string;
      suggestedText: string;
      rationale: string;
    }>;
  } | null>(null);

  // --- AUTHENTICATION CHECK ---
  useEffect(() => {
    try {
      if (chrome.runtime && chrome.runtime.sendMessage) {
        // This tells the background script the popup is open, triggering a refresh
        const port = chrome.runtime.connect({ name: 'popup' });

        // Get cached data first - this should be instant
        chrome.runtime.sendMessage({ type: 'GET_AUTH_STATUS' }, (response) => {
          if (chrome.runtime.lastError) {
            console.error('Auth check error:', chrome.runtime.lastError.message);
            setIsAuthenticated(false);
            setUser(null);
            setIsCheckingAuth(false);
            return;
          }

          if (response && Object.keys(response).length > 0) {
            // User is cached - show authenticated UI immediately
            setUser(response);
            setIsAuthenticated(true);
            setIsCheckingAuth(false);
            console.log('User authenticated from cache:', response);
            console.log('Available user properties:', Object.keys(response));
            console.log('Full user object:', JSON.stringify(response, null, 2));
            console.log('AccessToken field exists:', 'accessToken' in response);
            console.log('Other token fields:', Object.keys(response).filter(key => key.toLowerCase().includes('token')));

            // Background refresh to ensure data is fresh (silent update)
            setTimeout(() => {
              chrome.runtime.sendMessage({ type: 'REFRESH_AUTH_STATUS' }, (freshResponse) => {
                if (chrome.runtime.lastError) {
                  console.log('Background refresh failed - keeping cached data');
                  return;
                }

                if (freshResponse && Object.keys(freshResponse).length > 0) {
                  // Silently update with fresh data if different
                  if (JSON.stringify(freshResponse) !== JSON.stringify(response)) {
                    setUser(freshResponse);
                    console.log('User data refreshed silently:', freshResponse);
                  }
                } else {
                  // User logged out - update UI
                  setIsAuthenticated(false);
                  setUser(null);
                  console.log('User logged out, updating UI');
                }
              });
            }, 100); // Small delay to ensure UI renders first
          } else {
            // No cached user - check fresh (this will be rare)
            console.log('No cached user found, checking fresh auth...');
            chrome.runtime.sendMessage({ type: 'REFRESH_AUTH_STATUS' }, (freshResponse) => {
              if (freshResponse && Object.keys(freshResponse).length > 0) {
                setUser(freshResponse);
                setIsAuthenticated(true);
                console.log('Fresh login detected:', freshResponse);
              } else {
                setIsAuthenticated(false);
                setUser(null);
              }
              setIsCheckingAuth(false);
            });
          }
        });

        // Disconnect the port when the component unmounts
        return () => port.disconnect();
      } else {
        // Fallback for development environment
        console.log('Running in development mode - skipping auth check');
        setIsAuthenticated(true);
        setUser({
          id: 'dev-user',
          email: 'dev@example.com',
          name: 'Development User',
          accessToken: 'dev-mock-token-12345' // Add mock token for development
        });
        setIsCheckingAuth(false);
      }
    } catch (error) {
      console.error('Authentication check failed:', error);
      setIsAuthenticated(false);
      setUser(null);
      setIsCheckingAuth(false);
    }
  }, []);

  // --- DATA FETCHING & PARSING (only when authenticated) ---
  useEffect(() => {
    if (!isAuthenticated || isCheckingAuth || !user) return;

    // --- ADD THIS BLOCK to fetch resumes ---
    const loadUserResumes = async () => {
      try {
        console.log('Loading resumes for user:', user);
        console.log('User access token exists:', !!user.accessToken);

        // Try different token field names that might be returned by your session endpoint
        const token = user.accessToken || (user as any).access_token || (user as any).token || (user as any).jwt;

        if (!token) {
          console.error('No access token found for user. Available fields:', Object.keys(user));
          return;
        }

        // Development mode check - provide mock data instead of API call
        if (token === 'dev-mock-token-12345') {
          console.log('Development mode: Using mock resume data');
          const mockResumes: Resume[] = [
            {
              resume_id: 'dev-resume-1',
              file_name: 'John_Doe_Resume.pdf',
              is_primary: true
            },
            {
              resume_id: 'dev-resume-2',
              file_name: 'John_Doe_Technical_Resume.pdf',
              is_primary: false
            }
          ];
          setUserResumes(mockResumes);
          setSelectedResume('dev-resume-1'); // Auto-select the primary resume
          console.log('Mock resumes loaded and primary selected');
          return;
        }

        console.log('Using token:', token.substring(0, 20) + '...');
        const resumesData = await fetchResumes(token);
        console.log('Successfully loaded resumes:', resumesData);
        setUserResumes(resumesData);

        // Pre-select the primary resume if one exists
        const primaryResume = resumesData.find(r => r.is_primary);
        if (primaryResume) {
          setSelectedResume(primaryResume.resume_id);
          console.log('Auto-selected primary resume:', primaryResume.resume_id);
        }
      } catch (error) {
        console.error("Failed to fetch resumes:", error);
        // Check if it's an authentication error
        if (error instanceof Error && error.message.includes('401')) {
          console.log('Authentication error - token might be invalid');
          // You might want to trigger a re-authentication here
        }
      }
    };
    loadUserResumes();
    // --- END OF ADDED BLOCK ---

    // This function messages the content script to parse the page
    setTimeout(() => {
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
  }, [isAuthenticated, isCheckingAuth])

  // --- HELPER FUNCTION: Map backend response to extension UI format ---
  const mapEnhancementData = (optimizationResponse: OptimizationResponse) => {
    const priorityMapping: Record<string, 'Critical' | 'High' | 'Medium' | 'Low'> = {
      'critical': 'Critical',
      'high': 'High',
      'medium': 'Medium',
      'low': 'Low'
    };

    return {
      projectedScore: optimizationResponse.match_after_enhancement,
      strategicSummary: optimizationResponse.overall_feedback,
      suggestions: optimizationResponse.enhancement_suggestions.map((suggestion, index) => ({
        id: `suggestion-${index}`,
        context: suggestion.target_section,
        priority: priorityMapping[suggestion.priority] || 'Medium',
        currentText: suggestion.original_text_snippet,
        suggestedText: suggestion.suggested_text,
        rationale: suggestion.reasoning
      }))
    };
  };

  // --- UPDATED handleAnalyze function to call BOTH APIs ---
  const handleAnalyze = async () => {
    if (!user?.accessToken || !selectedResume) {
      console.error('Authentication error or no resume selected.');
      return;
    }

    setIsAnalyzing(true);

    try {
      const analysisRequestData: AnalysisRequest = {
        job_title: jobTitle,
        company_name: companyName,
        job_description_text: jobDescription,
        resume_id: selectedResume,
      };

      // Check if this is development mode
      if (user.accessToken === 'dev-mock-token-12345') {
        console.log('Development mode: Using mock analysis and enhancement data');

        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Mock analysis data
        setAnalysisData({
          matchScore: 78,
          summary: "Your profile shows strong technical skills and relevant experience for this Senior Software Engineer role at Google. Your background in full-stack development and cloud technologies aligns well with the position requirements.",
          strengths: [
            "5+ years of experience in software development",
            "Proficiency in React, Node.js, and cloud platforms",
            "Strong problem-solving and analytical skills",
            "Experience with agile development methodologies"
          ],
          gaps: [
            "Limited experience with large-scale distributed systems",
            "Could benefit from more leadership experience",
            "GraphQL experience not clearly demonstrated"
          ],
          rawData: null,
        });

        // Mock enhancement data
        setEnhancementsData({
          projectedScore: 85,
          strategicSummary: "By implementing these strategic enhancements, your resume can better showcase your technical depth and leadership potential, positioning you as a strong candidate for this senior-level role.",
          suggestions: [
            {
              id: 'suggestion-1',
              context: 'Technical Skills Section',
              priority: 'Critical',
              currentText: 'Experienced with JavaScript frameworks',
              suggestedText: 'Expert in React.js with 5+ years building scalable web applications serving 100K+ users',
              rationale: 'Quantifying your experience with specific metrics and user scale demonstrates the impact of your work.'
            },
            {
              id: 'suggestion-2',
              context: 'Professional Experience',
              priority: 'High',
              currentText: 'Worked on various backend services',
              suggestedText: 'Architected and developed microservices handling 1M+ requests/day using Node.js and AWS Lambda',
              rationale: 'Adding specific scale metrics and technology details shows your ability to handle enterprise-level systems.'
            },
            {
              id: 'suggestion-3',
              context: 'Leadership Experience',
              priority: 'Medium',
              currentText: 'Collaborated with team members',
              suggestedText: 'Led cross-functional team of 4 developers, mentored 2 junior engineers, and delivered projects 15% ahead of schedule',
              rationale: 'Highlighting leadership and mentoring experience is crucial for senior roles and shows your growth potential.'
            }
          ]
        });

        console.log('Mock analysis and enhancements data set successfully');
        setCurrentView('results');
        return;
      }

      // Step 1: Get analysis results (production mode)
      console.log('Starting job analysis...');
      const analysisResult = await startJobAnalysis(user.accessToken, analysisRequestData);

      // Step 2: Get enhancement suggestions using the analysis results
      console.log('Getting enhancement suggestions...');
      const enhancementResult = await optimizeResume(user.accessToken, analysisResult);

      // Step 3: Map analysis data for the results view
      setAnalysisData({
        matchScore: analysisResult.overall_match_percentage,
        summary: analysisResult.job_match_analysis.match_analysis.strength_summary,
        strengths: analysisResult.relationship_map.relationship_map.strong_points_in_resume,
        gaps: analysisResult.relationship_map.relationship_map.identified_gaps_in_resume.map((g: any) => g.jd_requirement),
        rawData: analysisResult, // Store for potential future use
      });

      // Step 4: Map enhancement data for the enhancements view  
      const mappedEnhancementData = mapEnhancementData(enhancementResult);
      setEnhancementsData(mappedEnhancementData);

      console.log('Analysis and enhancements completed successfully');
      setCurrentView('results');

    } catch (error) {
      console.error("Analysis or enhancement API failed:", error);
      // TODO: Add error state handling for user feedback
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleBackToForm = () => {
    setCurrentView('form');
  }

  const handleTailorResume = () => {
    if (enhancementsData) {
      setCurrentView('enhancements');
    } else {
      console.error('No enhancement data available');
      // Optionally show a message to the user
    }
  }

  const handleBackToResults = () => {
    setCurrentView('results');
  }

  const handleSignIn = () => {
    // Open the login page in a new tab
    chrome.tabs.create({ url: 'https://elevv.net/login' });
  }

  const handleRefreshAuth = () => {
    setIsCheckingAuth(true);
    // Send the REFRESH message to force a new check
    chrome.runtime.sendMessage({ type: 'REFRESH_AUTH_STATUS' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Auth refresh error:', chrome.runtime.lastError.message);
        setIsAuthenticated(false);
        setUser(null);
      } else if (response && Object.keys(response).length > 0) {
        setUser(response);
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }
      setIsCheckingAuth(false);
    });
  }

  // --- RENDER LOGIC ---

  // Show loading spinner while checking authentication
  if (isCheckingAuth) {
    return (
      <div className="app-container">
        <header className="app-header">
          <div className="logo">
            <Brain className="logo-icon" />
            <span>Elevv</span>
          </div>
          <h1 className="header-subtitle">Authenticating...</h1>
        </header>
        <main className="app-content">
          <div className="loader-container">
            <Loader2 className="loader-spinner" />
            <p>Checking authentication status...</p>
          </div>
        </main>
      </div>
    );
  }

  // Show login prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="app-container">
        <header className="app-header">
          <div className="logo">
            <Brain className="logo-icon" />
            <span>Elevv</span>
          </div>
          <h1 className="header-subtitle">Sign In Required</h1>
        </header>
        <main className="app-content">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="auth-container"
          >
            <div className="auth-content">
              <div className="auth-icon">
                <Brain className="auth-brain-icon" />
              </div>
              <h2>Welcome to Elevv</h2>
              <p>Please sign in to your Elevv account to start analyzing job descriptions and optimizing your resume.</p>

              <div className="auth-features">
                <div className="feature-item">
                  <div className="feature-bullet"></div>
                  <span>AI-powered resume analysis</span>
                </div>
                <div className="feature-item">
                  <div className="feature-bullet"></div>
                  <span>Personalized optimization suggestions</span>
                </div>
                <div className="feature-item">
                  <div className="feature-bullet"></div>
                  <span>Job-specific match scoring</span>
                </div>
              </div>

              <div className="auth-buttons">
                <button
                  onClick={handleSignIn}
                  className="sign-in-button"
                >
                  <ExternalLink className="button-icon" />
                  Sign In to Elevv
                </button>
                <button
                  onClick={handleRefreshAuth}
                  className="refresh-button"
                >
                  I'm already signed in
                </button>
              </div>
            </div>
          </motion.div>
        </main>
      </div>
    );
  }

  // Show main app if authenticated
  return (
    <div className="app-container">
      <header className="app-header">
        <div className="logo">
          <Brain className="logo-icon" />
          <span>Elevv</span>
        </div>
        <h1 className="header-subtitle">
          {currentView === 'results'
            ? "Analysis Results"
            : currentView === 'enhancements'
              ? "Resume Enhancements"
              : `Hey ${user?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'there'}, Start a New Analysis`}
        </h1>
      </header>

      <main className="app-content">
        <AnimatePresence mode="wait">
          {currentView === 'results' ? (
            <AnalysisResults
              onBack={handleBackToForm}
              onTailorResume={handleTailorResume}
              matchScore={analysisData.matchScore}
              summary={analysisData.summary}
              strengths={analysisData.strengths}
              gaps={analysisData.gaps}
            />
          ) : currentView === 'enhancements' && enhancementsData ? (
            <EnhancementsPage
              onBack={handleBackToResults}
              data={enhancementsData}
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
                          <option key={resume.resume_id} value={resume.resume_id}>
                            {resume.file_name}
                          </option>
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

      {currentView === 'form' && isAuthenticated && (
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