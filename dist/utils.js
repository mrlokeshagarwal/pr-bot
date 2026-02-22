"use strict";
/**
 * Helper utilities for prbot
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeSecret = sanitizeSecret;
exports.redactSecret = redactSecret;
exports.getConfigDir = getConfigDir;
exports.truncateWithMarker = truncateWithMarker;
/**
 * Sanitize secret input - remove control chars and trim (fixes paste issues like \u0016)
 */
function sanitizeSecret(value) {
    if (!value || typeof value !== "string")
        return "";
    return value
        .replace(/[\x00-\x1F\x7F]/g, "")
        .trim();
}
/**
 * Redact a secret for display - show only last 4 chars
 */
function redactSecret(value) {
    if (!value || value.length === 0)
        return "(empty)";
    if (value.length <= 4)
        return "****";
    return "****" + value.slice(-4);
}
/**
 * Get config directory path (cross-platform, Windows uses AppData/Roaming)
 */
function getConfigDir() {
    const home = process.env.APPDATA || (process.env.HOME && `${process.env.HOME}/.config`) || process.env.USERPROFILE || process.env.HOME || ".";
    if (process.platform === "win32" && process.env.APPDATA) {
        return `${process.env.APPDATA}\\ado-pr-reviewer`;
    }
    return `${home}/.config/ado-pr-reviewer`;
}
/**
 * Truncate text with clear marker
 */
function truncateWithMarker(text, maxLen, marker = "\n\n[... truncated ...]") {
    if (text.length <= maxLen)
        return text;
    return text.slice(0, maxLen - marker.length) + marker;
}
//# sourceMappingURL=utils.js.map