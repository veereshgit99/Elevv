import React, { useState, useEffect } from 'react';
import { submitAnalysisFeedback, checkAnalysisFeedback } from '../utils/api';

interface FeedbackWidgetProps {
    userToken?: string;
    analysisId?: string;
    show?: boolean;
}

export const FeedbackWidget: React.FC<FeedbackWidgetProps> = ({
    userToken,
    analysisId,
    show = true
}) => {
    const [feedbackGiven, setFeedbackGiven] = useState(false);
    const [showThankYou, setShowThankYou] = useState(false);
    const [isCheckingFeedback, setIsCheckingFeedback] = useState(false);
    const [feedbackCheckComplete, setFeedbackCheckComplete] = useState(false);

    // Check feedback status when analysisId changes
    useEffect(() => {
        const checkFeedbackStatus = async () => {
            if (!userToken || !analysisId) {
                setFeedbackCheckComplete(true);
                return;
            }

            // Skip check in development mode
            if (userToken === 'dev-mock-token-12345') {
                setFeedbackGiven(false);
                setFeedbackCheckComplete(true);
                return;
            }

            setIsCheckingFeedback(true);
            try {
                const alreadyGiven = await checkAnalysisFeedback(userToken, analysisId);
                setFeedbackGiven(alreadyGiven);
            } catch (error) {
                console.error('Error checking feedback status:', error);
                // If backend fails, assume no feedback given (safer default)
                setFeedbackGiven(false);
            } finally {
                setIsCheckingFeedback(false);
                setFeedbackCheckComplete(true);
            }
        };

        if (analysisId) {
            setFeedbackCheckComplete(false);
            checkFeedbackStatus();
        }
    }, [userToken, analysisId]);

    const handleFeedback = async (liked: boolean) => {
        if (!userToken || !analysisId) return;

        // Show "Thank you" message immediately
        setShowThankYou(true);

        // Hide widget after 3 seconds
        setTimeout(() => {
            setShowThankYou(false);
            setFeedbackGiven(true); // Mark as given to prevent reappearing
        }, 3000);

        // Skip API call in development mode
        if (userToken === 'dev-mock-token-12345') {
            console.log("Development mode feedback:", liked ? "👍" : "👎");
            return;
        }

        // Submit to API in background (don't await)
        submitAnalysisFeedback(userToken, analysisId, { liked }).then(() => {
            console.log("Feedback submitted successfully:", liked ? "👍" : "👎");
        }).catch((error) => {
            console.error("Failed to submit feedback:", error);
            // Note: We don't revert the UI state even if API fails
            // because the user experience should be immediate
        });
    };

    // Don't show widget if conditions aren't met or feedback already given
    if (!show || !userToken || !analysisId || !feedbackCheckComplete || isCheckingFeedback || (feedbackGiven && !showThankYou)) {
        return null;
    }

    return (
        <div className="feedback-widget">
            {showThankYou ? (
                <span className="feedback-thank-you">
                    Thank you for your feedback!
                </span>
            ) : (
                <>
                    <span className="feedback-prompt">
                        Rate our suggestions?
                    </span>
                    <button
                        onClick={() => handleFeedback(true)}
                        className="feedback-button feedback-button-positive"
                        title="Yes, helpful"
                    >
                        👍
                    </button>
                    <button
                        onClick={() => handleFeedback(false)}
                        className="feedback-button feedback-button-negative"
                        title="Not helpful"
                    >
                        👎
                    </button>
                </>
            )}
        </div>
    );
};