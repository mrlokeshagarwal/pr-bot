/**
 * AI provider types and interface for PR review generation
 */
import type { ReviewResponse } from "../reviewSchema.js";
export type AiProvider = "claude" | "cursor" | "openai";
export interface ReviewBundle {
    prId: number;
    title: string;
    description: string;
    reviewMode: string;
    codingStandard: string;
    diff: string;
    changedFiles: string[];
    /** Required when using Cursor provider - GitHub PR URL */
    githubPrUrl?: string;
}
export type GenerateReviewResult = {
    success: true;
    data: ReviewResponse;
} | {
    success: false;
    rawResponse: string;
    error: string;
};
export interface ReviewProvider {
    readonly name: string;
    generateReview(apiKey: string, model: string, bundle: ReviewBundle, maxIssues: number): Promise<GenerateReviewResult>;
}
//# sourceMappingURL=types.d.ts.map