"use strict";
/**
 * Dedupe utilities - detect bot threads and fingerprint comments
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isBotThread = isBotThread;
exports.fingerprint = fingerprint;
exports.threadMatchesFingerprint = threadMatchesFingerprint;
exports.hasOverviewThread = hasOverviewThread;
const AI_REVIEW_MARKER = "[AI Review]";
/**
 * Returns true if any comment in the thread contains "[AI Review]"
 */
function isBotThread(thread) {
    const comments = thread.comments ?? [];
    return comments.some((c) => (c.content ?? "").includes(AI_REVIEW_MARKER));
}
/**
 * Create fingerprint: file + title + first 80 chars of body
 */
function fingerprint(file, title, body) {
    const f = file ?? "";
    const bodyPrefix = body.slice(0, 80);
    return `${f}|${title}|${bodyPrefix}`;
}
/**
 * Check if a thread matches the given fingerprint
 */
function threadMatchesFingerprint(thread, fp) {
    const comments = thread.comments ?? [];
    for (const c of comments) {
        const content = c.content ?? "";
        if (!content.includes(AI_REVIEW_MARKER))
            continue;
        // Extract file/title/body from "[AI Review] <severity>: <title>" format or overview format
        const parts = fp.split("|");
        const file = parts[0];
        const title = parts[1];
        const bodyPrefix = parts[2];
        if (content.includes(title) && content.includes(bodyPrefix)) {
            return true;
        }
        if (file && content.includes(file) && content.includes(title)) {
            return true;
        }
    }
    return false;
}
/**
 * Check if overview thread exists (has [AI Review] and looks like overview - no severity prefix)
 */
function hasOverviewThread(threads) {
    return threads.some((t) => {
        const comments = t.comments ?? [];
        return comments.some((c) => {
            const content = c.content ?? "";
            return content.includes(AI_REVIEW_MARKER) && !/\[AI Review\]\s*(critical|high|medium|low|info):/i.test(content);
        });
    });
}
//# sourceMappingURL=dedupe.js.map