import React, { useState } from 'react';
import { motion, AnimatePresence } from "framer-motion"
import { Loader2 } from "lucide-react"
import { downloadEnhancedResume } from './utils/api';
import { FeedbackWidget } from './components/FeedbackWidget';

// --- ICONS ---
const ArrowLeftIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></svg>;
const CopyIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>;
const CheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>;
const ChevronDownIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
const DownloadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7,10 12,15 17,10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>


// --- TYPESCRIPT INTERFACES ---
type Priority = 'Critical' | 'High' | 'Medium' | 'Low';

export interface Suggestion {
    id: string;
    context: string;
    priority: Priority;
    type: 'add' | 'rephrase' | 'quantify' | 'highlight' | 'remove' | 'style_adjust';
    currentText: string;
    suggestedText: string;
    rationale: string;
}

export interface EnhancementsData {
    projectedScore: number;
    strategicSummary: string;
    suggestions: Suggestion[];
    analysisId?: string; // Add analysisId to interface
}

interface EnhancementsPageProps {
    onBack: () => void;
    data: EnhancementsData;
    userToken?: string; // Add user token for download
    userName?: string; // Add user name for filename
}

export const EnhancementsPage: React.FC<EnhancementsPageProps> = ({ onBack, data, userToken, userName }) => {
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(data.suggestions[0]?.id || null);
    const [isDownloading, setIsDownloading] = useState(false);
    const circleLength = 2 * Math.PI * 30;

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleDownload = async () => {
        if (!data.analysisId || !userToken || isDownloading) return;

        setIsDownloading(true);
        try {
            const blob = await downloadEnhancedResume(userToken, data.analysisId);

            // Generate professional filename with user's name and date
            const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
            const safeName = userName ? userName.replace(/[^a-zA-Z0-9]/g, '_') : null;
            const filename = safeName
                ? `${safeName}_Elevv_Resume_${today}.docx`
                : `Elevv_Resume_${today}.docx`;

            // Create download link
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Download failed:', error);
            // Could add error handling UI here
        } finally {
            setIsDownloading(false);
        }
    };

    // NEW: Sort suggestions by priority instead of grouping
    const prioritySortOrder: Record<Priority, number> = { 'Critical': 1, 'High': 2, 'Medium': 3, 'Low': 4 };
    const sortedSuggestions = [...data.suggestions].sort((a, b) => {
        return prioritySortOrder[a.priority] - prioritySortOrder[b.priority];
    });


    return (
        <motion.div
            key="enhancements"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="results-container"
        >
            <div className="results-header">
                <button onClick={onBack} className="back-button">
                    <ArrowLeftIcon />
                    Back to Analysis Results
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
                            animate={{ strokeDashoffset: circleLength * (1 - data.projectedScore / 100) }}
                            transition={{ duration: 1.5, ease: "circOut", delay: 0.5 }}
                        />
                    </svg>
                    <div className="score-text">{data.projectedScore}%</div>
                    <span className="score-label">Projected Score</span>
                </div>

                <div className="score-button-section">
                    {data.analysisId && userToken && (
                        <motion.button
                            whileHover={{ scale: isDownloading ? 1 : 1.02 }}
                            whileTap={{ scale: isDownloading ? 1 : 0.98 }}
                            onClick={handleDownload}
                            disabled={isDownloading}
                            className={`download-button ${isDownloading ? 'loading' : ''}`}
                        >
                            {isDownloading ? (
                                <>
                                    <Loader2 className="spinner" />
                                    <span className="loading-text">Downloading...</span>
                                </>
                            ) : (
                                <>
                                    <DownloadIcon />
                                    Download Your Resume
                                </>
                            )}
                        </motion.button>
                    )}
                </div>
            </div>

            <div className="summary-box">
                <p>{data.strategicSummary}</p>
            </div>

            {/* MODIFIED: Render a single, sorted list of accordions */}
            <div className="suggestion-accordion-group">
                {sortedSuggestions.map((suggestion) => {
                    const isExpanded = expandedId === suggestion.id;
                    return (
                        <div key={suggestion.id} className="suggestion-accordion-item">
                            <button
                                className="suggestion-accordion-trigger"
                                onClick={() => setExpandedId(isExpanded ? null : suggestion.id)}
                            >
                                {/* Updated: Match the UI from the images */}
                                <div className="accordion-trigger-left">
                                    <span className={`priority-badge priority-${suggestion.priority.toLowerCase()}`}>
                                        {suggestion.priority}
                                    </span>
                                    <span className={`action-type-badge ${suggestion.type}`}>
                                        {suggestion.type === 'add' ? 'Add New Content' :
                                            suggestion.type === 'rephrase' ? 'Rephrase Existing' :
                                                suggestion.type === 'quantify' ? 'Add Metrics' :
                                                    'Modify Content'}
                                    </span>
                                </div>
                                <div className="accordion-trigger-right">
                                    <span className="section-indicator">
                                        {suggestion.context.replace(/^(In your |section)/gi, '').trim().toUpperCase()}
                                    </span>
                                    <motion.div animate={{ rotate: isExpanded ? 180 : 0 }}>
                                        <ChevronDownIcon />
                                    </motion.div>
                                </div>
                            </button>
                            <AnimatePresence>
                                {isExpanded && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.3, ease: "easeInOut" }}
                                        className="suggestion-accordion-content"
                                    >
                                        <div className="suggestion-change-block">
                                            {/* Only show current text if it's not blank */}
                                            {suggestion.currentText && suggestion.currentText.trim() && (
                                                <>
                                                    <label>Current Text</label>
                                                    <p className="suggestion-current-text">{suggestion.currentText}</p>
                                                </>
                                            )}
                                        </div>

                                        <div className="suggestion-change-block">
                                            <div className="suggestion-suggested-header">
                                                <label>Suggested Improvement</label>
                                            </div>
                                            <div className="suggestion-text-container">
                                                <p className="suggestion-suggested-text">{suggestion.suggestedText}</p>
                                                <button
                                                    onClick={() => handleCopy(suggestion.suggestedText, suggestion.id)}
                                                    className="suggestion-copy-icon"
                                                    disabled={copiedId === suggestion.id}
                                                    title={copiedId === suggestion.id ? 'Copied!' : 'Copy text'}
                                                >
                                                    {copiedId === suggestion.id ? <CheckIcon /> : <CopyIcon />}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="suggestion-rationale-block">
                                            <label>Why This Matters</label>
                                            <p>{suggestion.rationale}</p>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )
                })}
            </div>

            {/* Feedback Widget */}
            <FeedbackWidget
                userToken={userToken}
                analysisId={data.analysisId}
                show={true}
            />
        </motion.div>
    );
};