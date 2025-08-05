import React, { useState } from 'react';
import { motion, AnimatePresence } from "framer-motion"

// --- ICONS ---
const ArrowLeftIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></svg>;
const CopyIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>;
const CheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>;
const ChevronDownIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>


// --- TYPESCRIPT INTERFACES ---
type Priority = 'Critical' | 'High' | 'Medium' | 'Low';

export interface Suggestion {
    id: string;
    context: string;
    priority: Priority;
    currentText: string;
    suggestedText: string;
    rationale: string;
}

export interface EnhancementsData {
    projectedScore: number;
    strategicSummary: string;
    suggestions: Suggestion[];
}

interface EnhancementsPageProps {
    onBack: () => void;
    data: EnhancementsData;
}

export const EnhancementsPage: React.FC<EnhancementsPageProps> = ({ onBack, data }) => {
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(data.suggestions[0]?.id || null);
    const circleLength = 2 * Math.PI * 30;

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    // NEW: Sort suggestions by priority instead of grouping
    const prioritySortOrder: Record<Priority, number> = { 'Critical': 1, 'High': 2, 'Medium': 3, 'Low': 4 };
    const sortedSuggestions = [...data.suggestions].sort((a, b) => {
        return prioritySortOrder[a.priority] - prioritySortOrder[b.priority];
    });


    return (
        <div className="enhancements-container">
            <div className="enhancements-header">
                <button onClick={onBack} className="back-button">
                    <ArrowLeftIcon />
                    <span>Back to Analysis Results</span>
                </button>
            </div>

            <section className="enhancements-summary-section">
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
                <p className="enhancements-strategic-summary">{data.strategicSummary}</p>
            </section>

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
                                {/* NEW: Accordion title format */}
                                <div className="accordion-trigger-title">
                                    <span className={`priority-label priority-${suggestion.priority.toLowerCase()}`}>
                                        {suggestion.priority}
                                    </span>
                                    <span>- {suggestion.context}</span>
                                </div>
                                <motion.div animate={{ rotate: isExpanded ? 180 : 0 }}>
                                    <ChevronDownIcon />
                                </motion.div>
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
                                            <label>Current Text</label>
                                            <p className="suggestion-current-text">{suggestion.currentText}</p>
                                        </div>

                                        <div className="suggestion-change-block">
                                            <div className="suggestion-suggested-header">
                                                <label>Suggested Improvement</label>
                                                <button
                                                    onClick={() => handleCopy(suggestion.suggestedText, suggestion.id)}
                                                    className="suggestion-copy-button"
                                                    disabled={copiedId === suggestion.id}
                                                >
                                                    {copiedId === suggestion.id ? <CheckIcon /> : <CopyIcon />}
                                                    <span>{copiedId === suggestion.id ? 'Copied!' : 'Copy'}</span>
                                                </button>
                                            </div>
                                            <p className="suggestion-suggested-text">{suggestion.suggestedText}</p>
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
        </div>
    );
};