/**
 * Platform abstraction - unified types for PR operations across Azure DevOps, GitHub, etc.
 */

import type { AppConfig } from "../config.js";

/** Unified PR info returned by fetchPr */
export interface PrInfo {
  pullRequestId: number;
  title: string;
  description: string;
  sourceRefName: string;
  targetRefName: string;
  repository: { id: string; name: string };
  lastMergeSourceCommit?: { commitId: string };
  lastMergeTargetCommit?: { commitId: string };
}

/** Iteration info (ADO-specific; GitHub uses single "iteration") */
export interface PrIteration {
  id: number;
  sourceRefCommit?: { commitId: string };
  targetRefCommit?: { commitId: string };
}

/** Change entry for file tracking */
export interface PrChange {
  item?: { path?: string };
  changeTrackingId?: number;
}

/** Unified thread/comment structure for dedupe and display */
export interface PrThread {
  id?: number;
  comments?: Array<{ id?: number; content?: string }>;
}

/** Context for inline comments */
export interface InlineCommentContext {
  filePath: string;
  line: number;
  lineEnd?: number;
  changeTrackingId: number;
}

export type PlatformType = "ado" | "github" | "bitbucket";

/**
 * Platform client interface - each platform (ADO, GitHub) implements this.
 */
export interface PlatformClient {
  readonly name: string;
  readonly platform: PlatformType;

  fetchPr(config: AppConfig, repoId: string, prId: number): Promise<PrInfo>;
  getPrIterations(config: AppConfig, repoId: string, prId: number): Promise<PrIteration[]>;
  getPrChanges(config: AppConfig, repoId: string, prId: number, iterationId: number): Promise<PrChange[]>;
  getDiffs(
    config: AppConfig,
    repoId: string,
    baseCommit: string,
    headCommit: string,
    options?: { maxFiles?: number; maxFileSize?: number; prId?: number }
  ): Promise<string>;
  listPrThreads(config: AppConfig, repoId: string, prId: number): Promise<PrThread[]>;
  createPrThread(
    config: AppConfig,
    repoId: string,
    prId: number,
    content: string,
    inlineContext?: InlineCommentContext,
    iterationContext?: { firstComparingIteration: number; secondComparingIteration: number }
  ): Promise<PrThread>;
  deletePrThreadComment(
    config: AppConfig,
    repoId: string,
    prId: number,
    threadId: number,
    commentId: number
  ): Promise<void>;
}
