// utils/analysis-api.ts

import { authenticatedFetch } from './api'

const AI_API_URL = process.env.NEXT_PUBLIC_AI_API_URL

// Request types
interface AnalysisRequest {
    job_title: string
    company_name: string
    job_description_text: string
    resume_id: string  // Add this
    job_url?: string
}

// Response types - properly typed based on the actual API response
interface Classification {
    primary_classification: string
    confidence: number
    reasoning: string
    file_type: string
    llm_model_used: string
}

interface ExtractedEntities {
    companies: string[]
    dates: string[]
    skills: string[]
    job_titles: string[]
    technologies: string[]
    education_degrees: string[]
    universities: string[]
    achievements: string[]
    requirements: string[]
}

interface EntityExtractionResult {
    entities: ExtractedEntities
    summary: {
        total_extracted_entities: number
        entity_counts: Record<string, number>
        has_contact_info: boolean
        technical_skills_found: boolean
        achievements_found: boolean
        requirements_found: boolean
    }
    document_classification: string
    llm_model_used: string
}

interface MatchedSkill {
    resume_skill: string
    jd_requirement: string
    confidence: number
    reasoning: string
}

interface MatchedExperience {
    resume_experience_summary: string
    jd_responsibility: string
    confidence: number
    reasoning: string
}

interface IdentifiedGap {
    jd_requirement: string
    type: 'skill_gap' | 'experience_gap'
}

interface RelationshipMap {
    matched_skills: MatchedSkill[]
    matched_experience_to_responsibilities: MatchedExperience[]
    identified_gaps_in_resume: IdentifiedGap[]
    strong_points_in_resume: string[]
}

interface JobMatchAnalysis {
    match_percentage: number
    strength_summary: string
    areas_for_improvement: string[]
}

interface JobDescription {
    file_id: string
    content: string
    entities: ExtractedEntities
}

// Main response interface
interface AnalysisResponse {
    // Core analysis results
    overall_match_percentage: number
    resume_classification: Classification
    resume_entities: EntityExtractionResult
    jd_classification: Classification
    jd_entities: EntityExtractionResult
    relationship_map: {
        relationship_map: RelationshipMap
        resume_id: string
        jd_id: string
        llm_model_used: string
    }
    job_match_analysis: {
        match_analysis: JobMatchAnalysis
        overall_match_percentage: number
        llm_model_used: string
    }

    // Additional metadata
    user_id: string
    analysis_id: string
    job_title: string
    resume_id: string
    resume_content: string
    job_description: JobDescription
    resume_file_type: string
    company_name: string
}

// API functions
export async function analyzeJobApplication(data: AnalysisRequest): Promise<AnalysisResponse> {
    const response = await authenticatedFetch(`${AI_API_URL}/analyze-application`, {
        method: 'POST',
        body: JSON.stringify(data),
    })

    if (!response.ok) {
        const error = await response.text()
        throw new Error(`Analysis failed: ${error}`)
    }

    return response.json()
}

export async function optimizeResume(analysisData: AnalysisResponse) {
    const response = await authenticatedFetch(`${AI_API_URL}/optimize-resume`, {
        method: 'POST',
        body: JSON.stringify({
            user_id: analysisData.user_id,
            analysis_id: analysisData.analysis_id,
            job_title: analysisData.job_title,
            resume_id: analysisData.resume_id,
            resume_content: analysisData.resume_content,
            job_description: analysisData.job_description,
            relationship_map: analysisData.relationship_map.relationship_map,
            job_match_analysis: analysisData.job_match_analysis.match_analysis,
            resume_file_type: analysisData.resume_file_type
        }),
    })

    if (!response.ok) {
        const error = await response.text()
        throw new Error(`Optimization failed: ${error}`)
    }

    return response.json()
}

// Download enhanced resume function
export async function downloadEnhancedResume(analysisId: string): Promise<Blob> {
    const response = await authenticatedFetch(`${AI_API_URL}/download-enhanced-resume?analysis_id=${encodeURIComponent(analysisId)}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
    })

    if (!response.ok) {
        const error = await response.text()
        throw new Error(`Download failed: ${error}`)
    }

    // Return the file blob
    return response.blob()
}

// Submit feedback for a specific analysis
export async function submitAnalysisFeedback(analysisId: string, feedback: { liked: boolean; comment?: string }): Promise<void> {
    const FILES_API_URL = process.env.NEXT_PUBLIC_FILES_API_URL

    const response = await authenticatedFetch(`${FILES_API_URL}/analyses/${analysisId}`, {
        method: 'PATCH',
        body: JSON.stringify({
            feedback_liked: feedback.liked,
            feedback_timestamp: new Date().toISOString()
        }),
    })

    if (!response.ok) {
        const error = await response.text()
        throw new Error(`Failed to submit feedback: ${error}`)
    }
}

// Check if feedback already exists for an analysis
export async function checkAnalysisFeedback(analysisId: string): Promise<boolean> {
    const FILES_API_URL = process.env.NEXT_PUBLIC_FILES_API_URL

    try {
        const response = await authenticatedFetch(`${FILES_API_URL}/analyses/${analysisId}`, {
            method: 'GET',
        })

        if (!response.ok) {
            return false // If we can't fetch, assume no feedback given
        }

        const analysisData = await response.json()

        // Check if feedback_liked field exists (not null/undefined)
        return analysisData.feedback_liked !== null && analysisData.feedback_liked !== undefined
    } catch (error) {
        console.error('Error checking feedback status:', error)
        return false // If error occurs, assume no feedback given
    }
}

// Export all types for use in other components
export type {
    AnalysisRequest,
    AnalysisResponse,
    Classification,
    ExtractedEntities,
    EntityExtractionResult,
    MatchedSkill,
    MatchedExperience,
    IdentifiedGap,
    RelationshipMap,
    JobMatchAnalysis,
    JobDescription
}