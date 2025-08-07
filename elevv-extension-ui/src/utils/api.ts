// This file will contain functions for making authenticated API calls from the extension.

const FILES_API_URL = 'https://985vcwbfxz.us-east-2.awsapprunner.com'; // Your live FileService URL
const AI_API_URL = 'https://q6ampwabj8.us-east-2.awsapprunner.com';       // Your live AIService URL

/**
 * Defines the structure for a user's resume.
 */
export interface Resume {
    resume_id: string;
    file_name: string;
    is_primary: boolean;
}

/**
 * Fetches the list of resumes for the authenticated user.
 * @param token The user's JWT access token from the session.
 * @returns A promise that resolves to the list of resumes.
 */
export async function fetchResumes(token: string): Promise<Resume[]> {
    console.log('Fetching resumes with token:', token?.substring(0, 20) + '...');
    console.log('API URL:', `${FILES_API_URL}/resumes`);

    const response = await fetch(`${FILES_API_URL}/resumes`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers);

    if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`Failed to fetch resumes from the server. Status: ${response.status}, Error: ${errorText}`);
    }

    const data = await response.json();
    console.log('Resumes data:', data);
    return data;
}

/**
 * Defines the data structure for the analysis request.
 */
export interface AnalysisRequest {
    job_title: string;
    company_name: string;
    job_description_text: string;
    resume_id: string;
}

/**
 * Starts the job analysis process by calling the AI service.
 * @param token The user's JWT access token.
 * @param analysisData The data collected from the extension's form.
 * @returns A promise that resolves to the full analysis results.
 */
export async function startJobAnalysis(token: string, analysisData: AnalysisRequest) {
    // This endpoint comes from your website's analysis-api.ts file
    const response = await fetch(`${AI_API_URL}/analyze-application`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(analysisData),
    });

    if (!response.ok) {
        const errorData = await response.json();
        // Provide a more specific error message from the API if available
        throw new Error(errorData.detail || 'Analysis failed. Please try again.');
    }
    return response.json();
}

/**
 * Enhancement suggestion interface to match backend response
 */
export interface EnhancementSuggestion {
    type: 'add' | 'rephrase' | 'quantify' | 'highlight' | 'remove' | 'style_adjust';
    target_section: string;
    original_text_snippet: string;
    suggested_text: string;
    reasoning: string;
    priority: 'critical' | 'high' | 'medium' | 'low';
    quantification_prompt?: string;
}

/**
 * Optimization response interface to match backend response
 */
export interface OptimizationResponse {
    enhancement_suggestions: EnhancementSuggestion[];
    overall_feedback: string;
    match_after_enhancement: number;
    llm_model_used: string;
}

/**
 * Gets resume optimization suggestions for a completed analysis.
 * @param token The user's JWT access token.
 * @param analysisData The completed analysis results from startJobAnalysis.
 * @returns A promise that resolves to optimization suggestions.
 */
export async function optimizeResume(token: string, analysisData: any): Promise<OptimizationResponse> {
    const response = await fetch(`${AI_API_URL}/optimize-resume`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
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
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Resume optimization failed. Please try again.');
    }
    return response.json();
}