/**
 * AI Models Configuration
 *
 * Uses Vercel AI SDK with multi-model strategy:
 * - Gemini 2.0 Flash: Complex analysis, risk scoring (thinking model)
 * - Gemini 2.0 Flash Lite: Fast document parsing, simple extractions
 *
 * Models are lazily initialized to prevent build errors when env vars aren't set.
 */

import { createVertex } from '@ai-sdk/google-vertex';

// Lazy initialization - models created on first use
let _google: ReturnType<typeof createVertex> | null = null;

/**
 * Get Google Vertex AI provider (lazy initialization)
 */
function getGoogle() {
    if (!_google) {
        if (!process.env.GOOGLE_VERTEX_PROJECT) {
            throw new Error('GOOGLE_VERTEX_PROJECT environment variable is required for AI features');
        }
        _google = createVertex({
            project: process.env.GOOGLE_VERTEX_PROJECT,
            location: process.env.GOOGLE_VERTEX_LOCATION || 'us-central1',
        });
    }
    return _google;
}

/**
 * Get thinking model for complex analysis tasks
 * - FICA document verification
 * - Risk flag detection
 * - AI trust score calculation
 */
export function getThinkingModel() {
    return getGoogle()('gemini-2.0-flash');
}

/**
 * Get fast model for simple extraction tasks
 * - Document metadata extraction
 * - Quick validation checks
 */
export function getFastModel() {
    return getGoogle()('gemini-2.0-flash-lite');
}

/**
 * Get the appropriate model based on task complexity
 */
export function getModel(complexity: 'fast' | 'thinking' = 'thinking') {
    return complexity === 'fast' ? getFastModel() : getThinkingModel();
}

/**
 * Check if AI is configured
 */
export function isAIConfigured(): boolean {
    return !!process.env.GOOGLE_VERTEX_PROJECT;
}

/**
 * AI configuration constants
 */
export const AI_CONFIG = {
    /** Temperature for deterministic outputs */
    ANALYSIS_TEMPERATURE: 0.1,
    /** Retry attempts for failed AI calls */
    MAX_RETRIES: 3,
} as const;
