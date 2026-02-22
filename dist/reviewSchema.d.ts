/**
 * Zod schema for Claude API review response
 */
import { z } from "zod";
export declare const issueSchema: z.ZodObject<{
    severity: z.ZodEnum<["critical", "high", "medium", "low", "info"]>;
    title: z.ZodString;
    body: z.ZodString;
    file: z.ZodOptional<z.ZodString>;
    /** Line number (1-based) for inline comment placement */
    line: z.ZodOptional<z.ZodNumber>;
    /** End line for multi-line selection (optional) */
    lineEnd: z.ZodOptional<z.ZodNumber>;
    /** Code snippet to include in comment (like Claude does) */
    codeSnippet: z.ZodOptional<z.ZodString>;
    standardRef: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    severity: "critical" | "high" | "medium" | "low" | "info";
    title: string;
    body: string;
    file?: string | undefined;
    line?: number | undefined;
    lineEnd?: number | undefined;
    codeSnippet?: string | undefined;
    standardRef?: string | undefined;
}, {
    severity: "critical" | "high" | "medium" | "low" | "info";
    title: string;
    body: string;
    file?: string | undefined;
    line?: number | undefined;
    lineEnd?: number | undefined;
    codeSnippet?: string | undefined;
    standardRef?: string | undefined;
}>;
export declare const reviewResponseSchema: z.ZodObject<{
    overview: z.ZodObject<{
        summary: z.ZodString;
        risk: z.ZodOptional<z.ZodString>;
        questions: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        missingDescriptionFields: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        summary: string;
        risk?: string | undefined;
        questions?: string[] | undefined;
        missingDescriptionFields?: string[] | undefined;
    }, {
        summary: string;
        risk?: string | undefined;
        questions?: string[] | undefined;
        missingDescriptionFields?: string[] | undefined;
    }>;
    issues: z.ZodArray<z.ZodObject<{
        severity: z.ZodEnum<["critical", "high", "medium", "low", "info"]>;
        title: z.ZodString;
        body: z.ZodString;
        file: z.ZodOptional<z.ZodString>;
        /** Line number (1-based) for inline comment placement */
        line: z.ZodOptional<z.ZodNumber>;
        /** End line for multi-line selection (optional) */
        lineEnd: z.ZodOptional<z.ZodNumber>;
        /** Code snippet to include in comment (like Claude does) */
        codeSnippet: z.ZodOptional<z.ZodString>;
        standardRef: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        severity: "critical" | "high" | "medium" | "low" | "info";
        title: string;
        body: string;
        file?: string | undefined;
        line?: number | undefined;
        lineEnd?: number | undefined;
        codeSnippet?: string | undefined;
        standardRef?: string | undefined;
    }, {
        severity: "critical" | "high" | "medium" | "low" | "info";
        title: string;
        body: string;
        file?: string | undefined;
        line?: number | undefined;
        lineEnd?: number | undefined;
        codeSnippet?: string | undefined;
        standardRef?: string | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    issues: {
        severity: "critical" | "high" | "medium" | "low" | "info";
        title: string;
        body: string;
        file?: string | undefined;
        line?: number | undefined;
        lineEnd?: number | undefined;
        codeSnippet?: string | undefined;
        standardRef?: string | undefined;
    }[];
    overview: {
        summary: string;
        risk?: string | undefined;
        questions?: string[] | undefined;
        missingDescriptionFields?: string[] | undefined;
    };
}, {
    issues: {
        severity: "critical" | "high" | "medium" | "low" | "info";
        title: string;
        body: string;
        file?: string | undefined;
        line?: number | undefined;
        lineEnd?: number | undefined;
        codeSnippet?: string | undefined;
        standardRef?: string | undefined;
    }[];
    overview: {
        summary: string;
        risk?: string | undefined;
        questions?: string[] | undefined;
        missingDescriptionFields?: string[] | undefined;
    };
}>;
export type Issue = z.infer<typeof issueSchema>;
export type ReviewResponse = z.infer<typeof reviewResponseSchema>;
export declare function validateReviewResponse(data: unknown): ReviewResponse;
export declare function safeValidateReviewResponse(data: unknown): {
    success: true;
    data: ReviewResponse;
} | {
    success: false;
    error: z.ZodError;
};
//# sourceMappingURL=reviewSchema.d.ts.map