/**
 * Dedupe utilities - detect bot threads and fingerprint comments
 */
/** Thread structure - compatible with both ADO and GitHub */
export interface AdoThread {
    id?: number;
    comments?: Array<{
        id?: number;
        content?: string;
    }>;
}
export interface CommentFingerprint {
    file: string;
    title: string;
    bodyPrefix: string;
}
/**
 * Returns true if any comment in the thread contains "[AI Review]"
 */
export declare function isBotThread(thread: AdoThread): boolean;
/**
 * Create fingerprint: file + title + first 80 chars of body
 */
export declare function fingerprint(file: string | undefined, title: string, body: string): string;
/**
 * Check if a thread matches the given fingerprint
 */
export declare function threadMatchesFingerprint(thread: AdoThread, fp: string): boolean;
/**
 * Check if overview thread exists (has [AI Review] and looks like overview - no severity prefix)
 */
export declare function hasOverviewThread(threads: AdoThread[]): boolean;
//# sourceMappingURL=dedupe.d.ts.map