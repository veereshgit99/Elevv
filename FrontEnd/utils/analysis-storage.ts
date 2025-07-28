// utils/analysis-storage.ts

import { AnalysisResponse } from './analysis-api'

const ANALYSIS_STORAGE_KEY = 'latest_analysis_results'
const ANALYSIS_TIMESTAMP_KEY = 'latest_analysis_timestamp'

/**
 * Store analysis results in localStorage
 * In production, you might want to use a state management solution like Redux or Zustand
 */
export function storeAnalysisResults(results: AnalysisResponse): void {
    try {
        localStorage.setItem(ANALYSIS_STORAGE_KEY, JSON.stringify(results))
        localStorage.setItem(ANALYSIS_TIMESTAMP_KEY, Date.now().toString())
    } catch (error) {
        console.error('Failed to store analysis results:', error)
        // Fallback to sessionStorage if localStorage is full
        try {
            sessionStorage.setItem(ANALYSIS_STORAGE_KEY, JSON.stringify(results))
            sessionStorage.setItem(ANALYSIS_TIMESTAMP_KEY, Date.now().toString())
        } catch (sessionError) {
            console.error('Failed to store in sessionStorage:', sessionError)
        }
    }
}

/**
 * Retrieve stored analysis results
 */
export function getStoredAnalysisResults(): AnalysisResponse | null {
    try {
        // Try localStorage first
        const stored = localStorage.getItem(ANALYSIS_STORAGE_KEY)
        if (stored) {
            return JSON.parse(stored)
        }

        // Fallback to sessionStorage
        const sessionStored = sessionStorage.getItem(ANALYSIS_STORAGE_KEY)
        if (sessionStored) {
            return JSON.parse(sessionStored)
        }

        return null
    } catch (error) {
        console.error('Failed to retrieve analysis results:', error)
        return null
    }
}

/**
 * Clear stored analysis results
 */
export function clearAnalysisResults(): void {
    localStorage.removeItem(ANALYSIS_STORAGE_KEY)
    localStorage.removeItem(ANALYSIS_TIMESTAMP_KEY)
    sessionStorage.removeItem(ANALYSIS_STORAGE_KEY)
    sessionStorage.removeItem(ANALYSIS_TIMESTAMP_KEY)
}

/**
 * Check if stored results are still fresh (within 1 hour)
 */
export function areResultsFresh(): boolean {
    try {
        const timestamp = localStorage.getItem(ANALYSIS_TIMESTAMP_KEY) ||
            sessionStorage.getItem(ANALYSIS_TIMESTAMP_KEY)

        if (!timestamp) return false

        const storedTime = parseInt(timestamp)
        const currentTime = Date.now()
        const ONE_HOUR = 60 * 60 * 1000

        return (currentTime - storedTime) < ONE_HOUR
    } catch {
        return false
    }
}