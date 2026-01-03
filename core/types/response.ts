/**
 * Response Types
 * 
 * Unified API response wrapper.
 */

// ━━ Formatted Response ━━
export interface FormattedResponse<T> {
    success: boolean;
    data?: T;
    errors?: string;
}
