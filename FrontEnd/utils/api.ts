// utils/api.ts

import { getSession } from "next-auth/react";
const FILES_API_URL = process.env.NEXT_PUBLIC_FILES_API_URL;

// API client with authentication
export async function authenticatedFetch(url: string, options: RequestInit = {}) {
    const session = await getSession();

    if (!session?.accessToken) {
        throw new Error('No authentication token found');
    }

    // Special handling for FormData - don't set Content-Type
    const isFormData = options.body instanceof FormData;

    const headers: any = {
        ...options.headers,
        'Authorization': `Bearer ${session.accessToken}`,
    };

    // Only set Content-Type if it's not FormData
    if (!isFormData) {
        headers['Content-Type'] = 'application/json';
    }

    return fetch(url, {
        ...options,
        headers,
    });
}

// Example usage functions
export async function fetchUserProfile() {
    const response = await authenticatedFetch(`${FILES_API_URL}/users/me`);
    if (!response.ok) {
        throw new Error(`Failed to fetch user profile: ${response.status}`);
    }
    return response.json();
}

export async function fetchResumes() {
    const response = await authenticatedFetch(`${FILES_API_URL}/resumes`);
    if (!response.ok) {
        throw new Error(`Failed to fetch resumes: ${response.status}`);
    }
    return response.json();
}

// For use in React components with hooks
import { useSession } from "next-auth/react";

export function useAuthenticatedFetch() {
    const { data: session } = useSession();

    const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
        if (!session?.accessToken) {
            throw new Error('No authentication token found');
        }

        // Special handling for FormData - don't set Content-Type
        const isFormData = options.body instanceof FormData;

        const headers: any = {
            ...options.headers,
            'Authorization': `Bearer ${session.accessToken}`,
        };

        // Only set Content-Type if it's not FormData
        if (!isFormData) {
            headers['Content-Type'] = 'application/json';
        }

        return fetch(url, {
            ...options,
            headers,
        });
    };

    return authenticatedFetch;
}

// Add this to your utils/api.ts
export async function fetchAnalyses() {
    const response = await authenticatedFetch(`${FILES_API_URL}/analyses`, {
        method: 'GET',
    })

    if (!response.ok) {
        throw new Error('Failed to fetch analyses')
    }

    return response.json()
}

export async function updateUserProfile(profileData: any) {
    const response = await authenticatedFetch(`${FILES_API_URL}/users/profile`, {
        method: 'PUT',
        body: JSON.stringify(profileData),
    })

    if (!response.ok) {
        throw new Error('Failed to update profile')
    }

    return response.json()
}


// Add these functions to your api.ts
export async function deleteResume(resumeId: string) {
    const response = await authenticatedFetch(`${FILES_API_URL}/resumes/${resumeId}`, {
        method: 'DELETE',
    })

    if (!response.ok) {
        const error = await response.text()
        throw new Error(error || 'Failed to delete resume')
    }

    return response.json()
}

export async function updateResumePrimary(resumeId: string) {
    const response = await authenticatedFetch(`${FILES_API_URL}/resumes/${resumeId}/make-primary`, {
        method: 'PUT',
    })

    if (!response.ok) {
        throw new Error('Failed to update primary resume')
    }

    return response.json()
}

// utils/api.ts

export async function getResumeUploadUrl(filename: string, contentType: string, jobTitle: string) {
    const response = await authenticatedFetch(`${FILES_API_URL}/resumes/upload-url`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            filename: filename,
            content_type: contentType,
            job_title: jobTitle
        }),
    })

    if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || 'Failed to get upload URL')
    }

    return response.json()
}


export async function updateResume(resumeId: string, name: string, jobTitle: string) {
    const response = await authenticatedFetch(`${FILES_API_URL}/resumes/${resumeId}`, {
        method: 'PUT',
        body: JSON.stringify({
            name: name,
            job_title: jobTitle
        }),
    })

    if (!response.ok) {
        throw new Error('Failed to update resume')
    }

    return response.json()
}