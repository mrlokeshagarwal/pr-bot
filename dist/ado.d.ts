/**
 * Azure DevOps REST API client
 * Authentication: Basic base64(":PAT")
 * api-version=7.1
 */
import type { AppConfig } from "./config.js";
export interface PrDetails {
    pullRequestId: number;
    title: string;
    description: string;
    sourceRefName: string;
    targetRefName: string;
    repository: {
        id: string;
        name: string;
    };
    lastMergeSourceCommit?: {
        commitId: string;
    };
    lastMergeTargetCommit?: {
        commitId: string;
    };
}
export interface PrIteration {
    id: number;
    sourceRefCommit?: {
        commitId: string;
    };
    targetRefCommit?: {
        commitId: string;
    };
}
export interface PrChange {
    item?: {
        path?: string;
    };
    changeTrackingId?: number;
}
export interface PrThread {
    id: number;
    comments?: Array<{
        id: number;
        content?: string;
    }>;
}
export interface DiffEntry {
    path?: string;
    item?: {
        path?: string;
    };
    content?: string;
}
export declare function fetchPr(config: AppConfig, repoId: string, prId: number): Promise<PrDetails>;
export declare function listPrThreads(config: AppConfig, repoId: string, prId: number): Promise<PrThread[]>;
export declare function deletePrThreadComment(config: AppConfig, repoId: string, prId: number, threadId: number, commentId: number): Promise<void>;
export interface InlineCommentContext {
    filePath: string;
    line: number;
    lineEnd?: number;
    changeTrackingId: number;
}
export declare function createPrThread(config: AppConfig, repoId: string, prId: number, content: string, inlineContext?: InlineCommentContext, iterationContext?: {
    firstComparingIteration: number;
    secondComparingIteration: number;
}): Promise<PrThread>;
export declare function getPrIterations(config: AppConfig, repoId: string, prId: number): Promise<PrIteration[]>;
export declare function getPrChanges(config: AppConfig, repoId: string, prId: number, iterationId: number): Promise<PrChange[]>;
export declare function getDiffs(config: AppConfig, repoId: string, baseCommit: string, targetCommit: string, maxFiles?: number, maxFileSize?: number): Promise<string>;
//# sourceMappingURL=ado.d.ts.map