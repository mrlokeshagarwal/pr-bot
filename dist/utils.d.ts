/**
 * Helper utilities for prbot
 */
/**
 * Sanitize secret input - remove control chars and trim (fixes paste issues like \u0016)
 */
export declare function sanitizeSecret(value: string | undefined): string;
/**
 * Redact a secret for display - show only last 4 chars
 */
export declare function redactSecret(value: string | undefined): string;
/**
 * Get config directory path (cross-platform, Windows uses AppData/Roaming)
 */
export declare function getConfigDir(): string;
/**
 * Truncate text with clear marker
 */
export declare function truncateWithMarker(text: string, maxLen: number, marker?: string): string;
//# sourceMappingURL=utils.d.ts.map