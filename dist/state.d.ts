/**
 * state.json handling - lastReviewedCommit per PR
 * Stored in config directory
 */
export interface StateEntry {
    prId: number;
    repoId: string;
    lastReviewedHeadCommit: string;
    timestamp: string;
}
export interface AppState {
    [key: string]: StateEntry;
}
export declare function loadState(): AppState;
export declare function saveState(state: AppState): void;
export declare function getLastReviewedCommit(repoId: string, prId: number): string | undefined;
export declare function setLastReviewedCommit(repoId: string, prId: number, headCommit: string): void;
//# sourceMappingURL=state.d.ts.map