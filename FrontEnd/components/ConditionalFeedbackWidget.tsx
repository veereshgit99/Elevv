"use client"

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { submitAnalysisFeedback, checkAnalysisFeedback } from '@/utils/analysis-api'

export default function ConditionalFeedbackWidget() {
    const pathname = usePathname()
    const { status } = useSession()
    const [mounted, setMounted] = useState(false)
    const [feedbackGiven, setFeedbackGiven] = useState(false)
    const [showThankYou, setShowThankYou] = useState(false)
    const [analysisId, setAnalysisId] = useState<string | null>(null)
    const [isCheckingFeedback, setIsCheckingFeedback] = useState(false)
    const [feedbackCheckComplete, setFeedbackCheckComplete] = useState(false)

    useEffect(() => {
        // This ensures the portal is only created on the client side
        setMounted(true)
    }, [])

    // Watch for changes in sessionStorage and analysis ID
    useEffect(() => {
        const getAnalysisIdAndCheckFeedback = () => {
            const storedEnhancements = sessionStorage.getItem('enhancement_results')
            if (storedEnhancements) {
                try {
                    const enhancementData = JSON.parse(storedEnhancements)
                    if (enhancementData.analysis_id) {
                        const newAnalysisId = enhancementData.analysis_id

                        // Only update if analysis ID has changed
                        if (newAnalysisId !== analysisId) {
                            setAnalysisId(newAnalysisId)
                            // Reset feedback state for new analysis
                            setFeedbackGiven(false)
                            setFeedbackCheckComplete(false)
                            // Check feedback status for new analysis
                            checkFeedbackStatus(newAnalysisId)
                        }
                    }
                } catch (error) {
                    console.error('Error parsing enhancement data:', error)
                }
            }
        }

        // Initial check
        getAnalysisIdAndCheckFeedback()

        // Set up interval to check for sessionStorage changes
        const interval = setInterval(getAnalysisIdAndCheckFeedback, 500)

        return () => clearInterval(interval)
    }, [analysisId]) // Depend on analysisId to detect changes

    const checkFeedbackStatus = async (analysisId: string) => {
        setIsCheckingFeedback(true)
        try {
            // Only rely on backend - no localStorage
            const alreadyGiven = await checkAnalysisFeedback(analysisId)
            setFeedbackGiven(alreadyGiven)
        } catch (error) {
            console.error('Error checking feedback status:', error)
            // If backend fails, assume no feedback given (safer default)
            setFeedbackGiven(false)
        } finally {
            setIsCheckingFeedback(false)
            setFeedbackCheckComplete(true)
        }
    }

    // Only show feedback widget on enhancements page when authenticated and we have an analysis ID
    // Don't show while checking feedback status or before the check is complete
    // Hide widget if feedback already given (unless showing thank you message)
    if (!pathname.startsWith("/enhancements") || status !== "authenticated" || !analysisId || !feedbackCheckComplete || (feedbackGiven && !showThankYou)) {
        return null
    }

    const handleFeedback = async (liked: boolean) => {
        if (!analysisId) return

        // Show "Thank you" message immediately
        setShowThankYou(true)

        // Hide widget after 3 seconds
        setTimeout(() => {
            setShowThankYou(false)
            setFeedbackGiven(true) // Mark as given to prevent reappearing
        }, 3000)

        // Submit to API in background (don't await)
        submitAnalysisFeedback(analysisId, { liked }).then(() => {
            console.log("Feedback submitted successfully:", liked ? "👍" : "👎")
        }).catch((error) => {
            console.error("Failed to submit feedback:", error)
            // Note: We don't revert the UI state even if API fails
            // because the user experience should be immediate
        })
    }

    // This is the JSX for your widget
    const widgetJsx = (
        <div style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            backgroundColor: showThankYou ? '#fff' : '#3b82f6', // White when showing thank you, blue otherwise
            border: '1px solid #e5e7eb',
            borderRadius: '20px',
            padding: '8px 12px',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            zIndex: 2147483647,
            transition: 'background-color 0.3s ease',
        }}>
            {showThankYou ? (
                <span style={{
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#000',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    Thank you for your feedback!
                </span>
            ) : (
                <>
                    <span style={{ fontSize: '14px', fontWeight: '500', color: '#ffffff' }}>
                        Rate our suggestions?
                    </span>
                    <button
                        onClick={() => handleFeedback(true)}
                        style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '18px',
                            cursor: 'pointer',
                            transition: 'transform 0.2s ease',
                            borderRadius: '4px',
                            padding: '4px',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'scale(1.3)'
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'scale(1)'
                        }}
                        title="Yes, helpful"
                    >
                        👍
                    </button>
                    <button
                        onClick={() => handleFeedback(false)}
                        style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '18px',
                            cursor: 'pointer',
                            transition: 'transform 0.2s ease',
                            borderRadius: '4px',
                            padding: '4px',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'scale(1.3)'
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'scale(1)'
                        }}
                        title="Not helpful"
                    >
                        👎
                    </button>
                </>
            )}
        </div>
    )

    // After the component has mounted on the client, create a portal and render the widget into the document.body
    return mounted ? createPortal(widgetJsx, document.body) : null
}