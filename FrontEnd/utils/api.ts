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

// Example usage functions - Updated to accept token parameter
export async function fetchUserProfile(token: string) {
    const response = await fetch(`${FILES_API_URL}/users/me`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    });

    if (response.status === 401) {
        // Token might be expired, trigger re-authentication
        throw new Error('Authentication expired. Please sign in again.');
    }

    if (!response.ok) {
        throw new Error(`Failed to fetch user profile: ${response.status}`);
    }

    return response.json();
}

export async function fetchResumes(token: string) {
    const response = await fetch(`${FILES_API_URL}/resumes`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    });
    if (!response.ok) {
        throw new Error(`Failed to fetch resumes: ${response.status}`);
    }
    return response.json();
}

// Keep the old functions for backward compatibility
export async function fetchUserProfileLegacy() {
    const response = await authenticatedFetch(`${FILES_API_URL}/users/me`);
    if (!response.ok) {
        throw new Error(`Failed to fetch user profile: ${response.status}`);
    }
    return response.json();
}

export async function fetchResumesLegacy() {
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

        const isFormData = options.body instanceof FormData;
        const headers: any = {
            ...options.headers,
            'Authorization': `Bearer ${session.accessToken}`,
        };

        if (!isFormData) {
            headers['Content-Type'] = 'application/json';
        }

        return fetch(url, {
            ...options,
            headers,
        });
    };

    return { authenticatedFetch, isAuthenticated: !!session?.accessToken };
}

// Add this to your utils/api.ts - Updated to accept token
export async function fetchAnalyses(token: string) {
    const response = await fetch(`${FILES_API_URL}/analyses`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    })

    if (!response.ok) {
        throw new Error('Failed to fetch analyses')
    }

    return response.json()
}

export async function updateUserProfile(token: string, profileData: any) {
    const response = await fetch(`${FILES_API_URL}/users/profile`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData),
    })

    if (!response.ok) {
        throw new Error('Failed to update profile')
    }

    return response.json()
}

// Legacy versions using authenticatedFetch
export async function fetchAnalysesLegacy() {
    const response = await authenticatedFetch(`${FILES_API_URL}/analyses`, {
        method: 'GET',
    })

    if (!response.ok) {
        throw new Error('Failed to fetch analyses')
    }

    return response.json()
}

export async function updateUserProfileLegacy(profileData: any) {
    const response = await authenticatedFetch(`${FILES_API_URL}/users/profile`, {
        method: 'PUT',
        body: JSON.stringify(profileData),
    })

    if (!response.ok) {
        throw new Error('Failed to update profile')
    }

    return response.json()
}


// Resume management functions - Updated to accept token
export async function deleteResume(token: string, resumeId: string) {
    const response = await fetch(`${FILES_API_URL}/resumes/${resumeId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    })

    if (!response.ok) {
        const error = await response.text()
        throw new Error(error || 'Failed to delete resume')
    }

    return response.json()
}

export async function updateResumePrimary(token: string, resumeId: string) {
    const response = await fetch(`${FILES_API_URL}/resumes/${resumeId}/make-primary`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    })

    if (!response.ok) {
        throw new Error('Failed to update primary resume')
    }

    return response.json()
}

export async function getResumeUploadUrl(token: string, filename: string, contentType: string, jobTitle: string) {
    const response = await fetch(`${FILES_API_URL}/resumes/upload-url`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
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

export async function updateResume(token: string, resumeId: string, name: string, jobTitle: string) {
    const response = await fetch(`${FILES_API_URL}/resumes/${resumeId}`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
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

// Legacy versions using authenticatedFetch
export async function deleteResumeLegacy(resumeId: string) {
    const response = await authenticatedFetch(`${FILES_API_URL}/resumes/${resumeId}`, {
        method: 'DELETE',
    })

    if (!response.ok) {
        const error = await response.text()
        throw new Error(error || 'Failed to delete resume')
    }

    return response.json()
}

export async function updateResumePrimaryLegacy(resumeId: string) {
    const response = await authenticatedFetch(`${FILES_API_URL}/resumes/${resumeId}/make-primary`, {
        method: 'PUT',
    })

    if (!response.ok) {
        throw new Error('Failed to update primary resume')
    }

    return response.json()
}

export async function getResumeUploadUrlLegacy(filename: string, contentType: string, jobTitle: string) {
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

export async function updateResumeLegacy(resumeId: string, name: string, jobTitle: string) {
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


export async function resendVerificationEmail(email: string) {
    const response = await fetch(`${FILES_API_URL}/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to resend email.');
    }
    return response.json();
}

export async function forgotPassword(email: string) {
    const response = await fetch(`${FILES_API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to initiate password reset.');
    }
    return response.json();
}

export async function confirmForgotPassword(email: string, confirmation_code: string, new_password: string) {
    const response = await fetch(`${FILES_API_URL}/auth/confirm-forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, confirmation_code, new_password }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to reset password.');
    }
    return response.json();
}

export async function confirmSignup(email: string, confirmation_code: string) {
    const response = await fetch(`${FILES_API_URL}/auth/confirm-signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, confirmation_code }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Invalid verification code.');
    }
    return response.json();
}