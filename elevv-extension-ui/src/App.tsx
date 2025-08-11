"use client"

import { useState, useEffect } from "react"
import { Loader2, FileText, ExternalLink } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { AnalysisResults } from "./AnalysisResults" // Your new results component
import { EnhancementsPage } from "./EnhancementsPage" // Your new enhancements component
import Logo from "./components/Logo";

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
  const [isGeneratingEnhancements, setIsGeneratingEnhancements] = useState(false)
  const [currentView, setCurrentView] = useState<'form' | 'results' | 'enhancements'>('form')

  // --- NEW: Track if user came from enhancements page ---
  const [cameFromEnhancements, setCameFromEnhancements] = useState(false)
  const [hasExistingEnhancements, setHasExistingEnhancements] = useState(false)

  const [analysisData, setAnalysisData] = useState<{
    matchScore: number;
    summary: string;
    strengths: string[];
    gaps: string[];
    analysisId?: string; // Store analysis ID for enhancement tracking
    rawData?: any; // Store the full API response for enhancement generation
  }>({
    matchScore: 0,
    summary: "",
    strengths: [],
    gaps: [],
    analysisId: undefined,
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
      type: 'add' | 'rephrase' | 'quantify' | 'highlight' | 'remove' | 'style_adjust';
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

  // --- NEW: Check for existing enhancement results ---
  useEffect(() => {
    const checkExistingEnhancements = () => {
      const storedEnhancements = sessionStorage.getItem('enhancement_results');
      setHasExistingEnhancements(!!storedEnhancements);
    };

    checkExistingEnhancements();
  }, [currentView]) // Check when view changes

  // --- Listen for live job data updates from content script/background ---
  useEffect(() => {
    const messageListener = (
      message: any,
      _sender: chrome.runtime.MessageSender,
      _sendResponse: (response?: any) => void
    ) => {
      if (message?.type === "JOB_DATA_UPDATED") {
        console.log("Received updated job data:", message.payload);
        const { jobTitle, companyName, jobDescription } = message.payload || {};
        setJobTitle(jobTitle || "");
        setCompanyName(companyName || "");
        setJobDescription(jobDescription || "");
      }
    };

    // Guard for development environment
    if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage?.addListener) {
      chrome.runtime.onMessage.addListener(messageListener);
    }

    return () => {
      if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage?.removeListener) {
        chrome.runtime.onMessage.removeListener(messageListener);
      }
    };
  }, []); // Run once when component mounts

  // --- HELPER FUNCTION: Map backend response to extension UI format ---
  const mapEnhancementData = (optimizationResponse: OptimizationResponse) => {
    const priorityMapping: Record<string, 'Critical' | 'High' | 'Medium' | 'Low'> = {
      'critical': 'Critical',
      'high': 'High',
      'medium': 'Medium',
      'low': 'Low'
    };

    const typeMapping: Record<string, 'add' | 'rephrase' | 'quantify' | 'highlight' | 'remove' | 'style_adjust'> = {
      'add': 'add',
      'rephrase': 'rephrase',
      'quantify': 'quantify',
      'highlight': 'highlight',
      'remove': 'remove',
      'style_adjust': 'style_adjust'
    };

    return {
      projectedScore: optimizationResponse.match_after_enhancement,
      strategicSummary: optimizationResponse.overall_feedback,
      suggestions: optimizationResponse.enhancement_suggestions.map((suggestion, index) => ({
        id: `suggestion-${index}`,
        context: suggestion.target_section,
        priority: priorityMapping[suggestion.priority] || 'Medium',
        type: typeMapping[suggestion.type] || 'rephrase',
        currentText: suggestion.original_text_snippet,
        suggestedText: suggestion.suggested_text,
        rationale: suggestion.reasoning
      }))
    };
  };  // --- UPDATED handleAnalyze function to call ONLY analysis API ---
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
        console.log('Development mode: Using mock analysis data');

        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Mock analysis data only
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
          analysisId: 'dev-analysis-123',
          rawData: {
            // Mock raw data for enhancement API
            user_id: 'dev-user',
            analysis_id: 'dev-analysis-123',
            job_title: jobTitle,
            resume_id: selectedResume,
            resume_content: "Mock resume content...",
            job_description: { content: jobDescription },
            relationship_map: { relationship_map: {} },
            job_match_analysis: { match_analysis: {} },
            resume_file_type: 'pdf'
          },
        });

        console.log('Mock analysis data set successfully');
        setCurrentView('results');
        return;
      }

      // Step 1: Get analysis results only (production mode)
      console.log('Starting job analysis...');
      const analysisResult = await startJobAnalysis(user.accessToken, analysisRequestData);

      // Map analysis data for the results view
      setAnalysisData({
        matchScore: analysisResult.overall_match_percentage,
        summary: analysisResult.job_match_analysis.match_analysis.strength_summary,
        strengths: analysisResult.relationship_map.relationship_map.strong_points_in_resume,
        gaps: analysisResult.relationship_map.relationship_map.identified_gaps_in_resume.map((g: any) => g.jd_requirement),
        analysisId: analysisResult.analysis_id,
        rawData: analysisResult, // Store for enhancement generation
      });

      console.log('Analysis completed successfully');
      setCurrentView('results');

    } catch (error) {
      console.error("Analysis API failed:", error);
      // TODO: Add error state handling for user feedback
    } finally {
      setIsAnalyzing(false);
    }
  }; const handleBackToForm = () => {
    setCurrentView('form');
  }

  // --- NEW: Handle viewing existing enhancements ---
  const handleViewEnhancements = () => {
    if (!analysisData.analysisId) {
      console.error('No analysis ID available for enhancement retrieval');
      handleTailorResume();
      return;
    }

    const enhancementKey = `enhancements_${analysisData.analysisId}`;
    const storedEnhancements = sessionStorage.getItem(enhancementKey);

    if (storedEnhancements) {
      try {
        const parsedEnhancements = JSON.parse(storedEnhancements);
        setEnhancementsData(parsedEnhancements);
        setCurrentView('enhancements');
      } catch (error) {
        console.error('Failed to parse stored enhancement results:', error);
        // Fallback to generate new enhancements
        handleTailorResume();
      }
    } else {
      // No stored enhancements, generate new ones
      handleTailorResume();
    }
  };

  const handleTailorResume = async () => {
    if (!user?.accessToken || !analysisData.rawData) {
      console.error('No analysis data available for enhancement generation');
      return;
    }

    setIsGeneratingEnhancements(true);

    try {
      // Check if this is development mode
      if (user.accessToken === 'dev-mock-token-12345') {
        console.log('Development mode: Using mock enhancement data');

        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Mock enhancement data
        setEnhancementsData({
          projectedScore: 85,
          strategicSummary: "By implementing these strategic enhancements, your resume can better showcase your technical depth and leadership potential, positioning you as a strong candidate for this senior-level role.",
          suggestions: [
            {
              id: 'suggestion-1',
              context: 'Technical Skills Section',
              priority: 'Critical',
              type: 'rephrase',
              currentText: 'Experienced with JavaScript frameworks',
              suggestedText: 'Expert in React.js with 5+ years building scalable web applications serving 100K+ users',
              rationale: 'Quantifying your experience with specific metrics and user scale demonstrates the impact of your work.'
            },
            {
              id: 'suggestion-2',
              context: 'Professional Experience',
              priority: 'Critical',
              type: 'add',
              currentText: 'Worked on various backend services',
              suggestedText: 'Architected and developed microservices handling 1M+ requests/day using Node.js and AWS Lambda',
              rationale: 'Adding specific scale metrics and technology details shows your ability to handle enterprise-level systems.'
            },
            {
              id: 'suggestion-3',
              context: 'Leadership Experience',
              priority: 'High',
              type: 'rephrase',
              currentText: 'Collaborated with team members',
              suggestedText: 'Led cross-functional team of 4 developers, mentored 2 junior engineers, and delivered projects 15% ahead of schedule',
              rationale: 'Highlighting leadership and mentoring experience is crucial for senior roles and shows your growth potential.'
            }
          ]
        });

        // Store mock enhancement results in sessionStorage with analysis_id
        const enhancementKey = `enhancements_${analysisData.analysisId}`;
        sessionStorage.setItem(enhancementKey, JSON.stringify({
          projectedScore: 88,
          strategicSummary: "Your resume is already strong, showcasing impressive projects and quantified achievements. The key opportunity is to more explicitly align your existing experience with the specific language used in the Google job description, particularly around 'ML infrastructure', 'model evaluation/optimization', and 'large-scale systems'. By reframing your accomplishments using these keywords, you will transform your resume from 'strong candidate' to 'ideal candidate' and significantly increase your chances of passing the initial screening.",
          suggestions: [
            { id: '1', context: 'Summary', priority: 'Critical' as const, type: 'rephrase' as const, currentText: 'Software Engineer with 2.5+ years of experience, currently building a full-stack, AI-powered career intelligence platform using a sophisticated multi-agent architecture. Led ML-driven automation, and built microservices that cut order processing time by 90%.', suggestedText: 'Software Engineer with 2.5+ years of experience building and scaling enterprise-grade microservices for a leading ERP provider (SAP). Proven expertise in full-stack development, distributed systems, and enhancing application reliability. Drove a 90% reduction in order processing time and improved system monitoring, directly impacting customer success.', rationale: 'The current summary leads with a personal project. This revision immediately highlights your most relevant experience (SAP enterprise software), which is a direct parallel to Microsoft Dynamics. It incorporates keywords from the job description like "scaling", "enterprise-grade", "reliability", and "customer success" to create immediate alignment with the recruiter\'s needs.' },
            { id: '2', context: 'Technical Skills', priority: 'High' as const, type: 'add' as const, currentText: '', suggestedText: 'ML Infrastructure: Model deployment, evaluation pipelines, large-scale data processing', rationale: 'Adding explicit ML infrastructure keywords directly matches the job requirements and showcases your relevant experience in a way that will be immediately recognized by both automated screening systems and human recruiters.' }
          ]
        }));

        console.log('Mock enhancement data set successfully');
        setCurrentView('enhancements');
        return;
      }

      // Production mode - call the enhancement API
      console.log('Getting enhancement suggestions...');
      const enhancementResult = await optimizeResume(user.accessToken, analysisData.rawData);

      // Map enhancement data for the enhancements view  
      const mappedEnhancementData = mapEnhancementData(enhancementResult);
      setEnhancementsData(mappedEnhancementData);

      // Store enhancement results in sessionStorage with analysis_id
      const enhancementKey = `enhancements_${analysisData.analysisId}`;
      sessionStorage.setItem(enhancementKey, JSON.stringify(mappedEnhancementData));

      console.log('Enhancement generation completed successfully');
      setCurrentView('enhancements');

    } catch (error) {
      console.error("Enhancement API failed:", error);
      // TODO: Add error state handling for user feedback
    } finally {
      setIsGeneratingEnhancements(false);
    }
  }

  const handleBackToResults = () => {
    setCameFromEnhancements(true);
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
            <Logo className="logo-icon" />
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
            <Logo className="logo-icon" />
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
              </div>
              <h2>Welcome to Elevv</h2>
              <p>Start analyzing your resume against job descriptions and get tailored feedback.</p>

              <div className="auth-features">
                <div className="feature-item">
                  <div className="feature-bullet"></div>
                  <span>One-click analysis</span>
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
          <Logo className="logo-icon" />
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
              onViewEnhancements={handleViewEnhancements}
              showViewEnhancements={cameFromEnhancements && hasExistingEnhancements}
              isGeneratingEnhancements={isGeneratingEnhancements}
              matchScore={analysisData.matchScore}
              summary={analysisData.summary}
              strengths={analysisData.strengths}
              gaps={analysisData.gaps}
              analysisId={analysisData.analysisId}
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
            className={`analyze-button ${isAnalyzing ? 'analyzing' : ''}`}
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="loader-spinner-button" />
                Analyzing...
              </>
            ) : (
              "Analyze Now"
            )}
          </motion.button>
        </footer>
      )}
    </div>
  )
}