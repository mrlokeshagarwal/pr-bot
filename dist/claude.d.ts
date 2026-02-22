/**
 * Claude API client - Messages API
 * https://api.anthropic.com/v1/messages
 */
import type { ReviewResponse } from "./reviewSchema.js";
export interface ReviewBundle {
    prId: number;
    title: string;
    description: string;
    reviewMode: string;
    codingStandard: string;
    diff: string;
    changedFiles: string[];
}
export declare function generateReview(apiKey: string, model: string, bundle: ReviewBundle, maxIssues: number): Promise<{
    success: true;
    data: ReviewResponse;
} | {
    success: false;
    rawResponse: string;
    error: string;
}>;
//# sourceMappingURL=claude.d.ts.map