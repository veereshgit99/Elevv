// utils/api.ts

import { getSession } from "next-auth/react";

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
    const response = await authenticatedFetch('http://localhost:8001/users/me');
    if (!response.ok) {
        throw new Error(`Failed to fetch user profile: ${response.status}`);
    }
    return response.json();
}

export async function fetchResumes() {
    const response = await authenticatedFetch('http://localhost:8001/resumes');
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