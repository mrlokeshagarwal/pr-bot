/**
 * Zod schema for Claude API review response
 */

import { z } from "zod";

export const issueSchema = z.object({
  severity: z.enum(["critical", "high", "medium", "low", "info"]),
  title: z.string(),
  body: z.string(),
  file: z.string().optional(),
  /** Line number (1-based) for inline comment placement */
  line: z.number().optional(),
  /** End line for multi-line selection (optional) */
  lineEnd: z.number().optional(),
  /** Code snippet to include in comment (like Claude does) */
  codeSnippet: z.string().optional(),
  standardRef: z.string().optional(),
});

export const reviewResponseSchema = z.object({
  overview: z.object({
    summary: z.string(),
    risk: z.string().optional(),
    questions: z.array(z.string()).optional(),
    missingDescriptionFields: z.array(z.string()).optional(),
  }),
  issues: z.array(issueSchema),
});

export type Issue = z.infer<typeof issueSchema>;
export type ReviewResponse = z.infer<typeof reviewResponseSchema>;

export function validateReviewResponse(data: unknown): ReviewResponse {
  return reviewResponseSchema.parse(data);
}

export function safeValidateReviewResponse(data: unknown): { success: true; data: ReviewResponse } | { success: false; error: z.ZodError } {
  const result = reviewResponseSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}
