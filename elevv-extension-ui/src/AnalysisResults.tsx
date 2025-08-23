"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowLeft, CheckCircle, AlertTriangle, ChevronRight, Loader2 } from "lucide-react"

interface AnalysisResultsProps {
    onBack: () => void
    onTailorResume: () => void
    isGeneratingEnhancements?: boolean
    matchScore: number
    summary: string
    strengths: string[]
    gaps: string[]
    // NEW: Props for enhancement viewing logic
    showViewEnhancements?: boolean
    onViewEnhancements?: () => void
    // NEW: Analysis ID for unique enhancement tracking
    analysisId?: string
}

export function AnalysisResults({
    onBack,
    onTailorResume,
    isGeneratingEnhancements = false,
    matchScore,
    summary,
    strengths,
    gaps,
    showViewEnhancements = false,
    onViewEnhancements,
    analysisId
}: AnalysisResultsProps) {
    const [expandedSection, setExpandedSection] = useState<'strengths' | 'gaps' | null>('gaps')

    // NEW: State to track if enhancements exist for current analysis
    const [hasValidEnhancements, setHasValidEnhancements] = useState(false)

    // NEW: Check for existing enhancements using analysis_id
    useEffect(() => {
        const checkForExistingEnhancements = () => {
            if (!analysisId) {
                setHasValidEnhancements(false)
                return
            }

            try {
                const enhancementKey = `enhancements_${analysisId}`
                const storedEnhancements = sessionStorage.getItem(enhancementKey)

                if (storedEnhancements) {
                    const enhancementData = JSON.parse(storedEnhancements)

                    // Check if enhancement data is valid
                    if (enhancementData.suggestions && enhancementData.suggestions.length > 0) {
                        setHasValidEnhancements(true)
                        console.log(`Found valid enhancement results for analysis_id: ${analysisId}`)
                    } else {
                        setHasValidEnhancements(false)
                        console.log(`Invalid enhancement data for analysis_id: ${analysisId}`)
                    }
                } else {
                    setHasValidEnhancements(false)
                    console.log(`No enhancement results found for analysis_id: ${analysisId}`)
                }
            } catch (error) {
                console.error('Error checking for existing enhancements:', error)
                setHasValidEnhancements(false)
            }
        }

        checkForExistingEnhancements()
    }, [analysisId])

    // NEW: Determine button state based on enhancement availability
    const shouldShowViewEnhancements = showViewEnhancements || hasValidEnhancements
    const buttonText = shouldShowViewEnhancements ? 'View Enhancements' : 'Tailor Your Resume'
    const buttonAction = shouldShowViewEnhancements ? onViewEnhancements : onTailorResume

    const circleLength = 2 * Math.PI * 30;

    return (
        <motion.div
            key="results"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="results-container"
        >
            <div className="results-header">
                <button onClick={onBack} className="back-button">
                    <ArrowLeft className="icon" />
                    Back to Analysis
                </button>
            </div>

            <div className="score-section">
                <div className="score-gauge">
                    <svg className="gauge-svg" viewBox="0 0 80 80">
                        <circle className="gauge-bg" cx="40" cy="40" r="30" />
                        <motion.circle
                            className="gauge-fg"
                            cx="40"
                            cy="40"
                            r="30"
                            strokeDasharray={circleLength}
                            initial={{ strokeDashoffset: circleLength }}
                            animate={{ strokeDashoffset: circleLength * (1 - matchScore / 100) }}
                            transition={{ duration: 1.5, ease: "circOut", delay: 0.5 }}
                        />
                    </svg>
                    <div className="score-text">{matchScore}%</div>
                    <span className="score-label">Match Score</span>
                </div>

                <div className="score-button-section">
                    <motion.button
                        whileHover={{ scale: isGeneratingEnhancements ? 1 : 1.02 }}
                        whileTap={{ scale: isGeneratingEnhancements ? 1 : 0.98 }}
                        onClick={buttonAction}
                        disabled={isGeneratingEnhancements}
                        className={`tailor-button ${isGeneratingEnhancements ? 'loading' : ''}`}
                    >
                        {isGeneratingEnhancements ? (
                            <>
                                <Loader2 className="spinner" />
                                <span className="loading-text">Generating...</span>
                            </>
                        ) : (
                            buttonText
                        )}
                    </motion.button>
                </div>
            </div>

            <div className="summary-box">
                <p>{summary}</p>
            </div>

            <div className="accordion-group">
                {/* Strengths Accordion */}
                <div className="accordion-item">
                    <button
                        onClick={() => setExpandedSection(expandedSection === 'strengths' ? null : 'strengths')}
                        className="accordion-trigger"
                    >
                        <div className="accordion-title">
                            <CheckCircle className="icon-strength" />
                            <span>Your Top Strengths</span>
                        </div>
                        <div className="accordion-meta">
                            <span>{strengths.length} found</span>
                            <motion.div animate={{ rotate: expandedSection === 'strengths' ? 90 : 0 }}>
                                <ChevronRight className="icon-chevron" />
                            </motion.div>
                        </div>
                    </button>
                    <AnimatePresence>
                        {expandedSection === 'strengths' && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="accordion-content"
                            >
                                <ul>
                                    {strengths.map((strength, index) => (
                                        <li key={index}>
                                            <div className="bullet-strength" />
                                            <span>{strength}</span>
                                        </li>
                                    ))}
                                </ul>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Gaps Accordion */}
                <div className="accordion-item">
                    <button
                        onClick={() => setExpandedSection(expandedSection === 'gaps' ? null : 'gaps')}
                        className="accordion-trigger"
                    >
                        <div className="accordion-title">
                            <AlertTriangle className="icon-gap" />
                            <span>Areas to Address</span>
                        </div>
                        <div className="accordion-meta">
                            <span>{gaps.length} identified</span>
                            <motion.div animate={{ rotate: expandedSection === 'gaps' ? 90 : 0 }}>
                                <ChevronRight className="icon-chevron" />
                            </motion.div>
                        </div>
                    </button>
                    <AnimatePresence>
                        {expandedSection === 'gaps' && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="accordion-content"
                            >
                                <ul>
                                    {gaps.map((gap, index) => (
                                        <li key={index}>
                                            <div className="bullet-gap" />
                                            <span>{gap}</span>
                                        </li>
                                    ))}
                                </ul>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </motion.div>
    )
}