/**
 * Helper utilities for prbot
 */

/**
 * Sanitize secret input - remove control chars and trim (fixes paste issues like \u0016)
 */
export function sanitizeSecret(value: string | undefined): string {
  if (!value || typeof value !== "string") return "";
  return value
    .replace(/[\x00-\x1F\x7F]/g, "")
    .trim();
}

/**
 * Redact a secret for display - show only last 4 chars
 */
export function redactSecret(value: string | undefined): string {
  if (!value || value.length === 0) return "(empty)";
  if (value.length <= 4) return "****";
  return "****" + value.slice(-4);
}

/**
 * Get config directory path (cross-platform, Windows uses AppData/Roaming)
 */
export function getConfigDir(): string {
  const home = process.env.APPDATA || (process.env.HOME && `${process.env.HOME}/.config`) || process.env.USERPROFILE || process.env.HOME || ".";
  if (process.platform === "win32" && process.env.APPDATA) {
    return `${process.env.APPDATA}\\ado-pr-reviewer`;
  }
  return `${home}/.config/ado-pr-reviewer`;
}

/**
 * Truncate text with clear marker
 */
export function truncateWithMarker(text: string, maxLen: number, marker = "\n\n[... truncated ...]"): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - marker.length) + marker;
}
