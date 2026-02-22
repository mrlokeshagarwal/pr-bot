"use strict";
/**
 * Zod schema for Claude API review response
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.reviewResponseSchema = exports.issueSchema = void 0;
exports.validateReviewResponse = validateReviewResponse;
exports.safeValidateReviewResponse = safeValidateReviewResponse;
const zod_1 = require("zod");
exports.issueSchema = zod_1.z.object({
    severity: zod_1.z.enum(["critical", "high", "medium", "low", "info"]),
    title: zod_1.z.string(),
    body: zod_1.z.string(),
    file: zod_1.z.string().optional(),
    /** Line number (1-based) for inline comment placement */
    line: zod_1.z.number().optional(),
    /** End line for multi-line selection (optional) */
    lineEnd: zod_1.z.number().optional(),
    /** Code snippet to include in comment (like Claude does) */
    codeSnippet: zod_1.z.string().optional(),
    standardRef: zod_1.z.string().optional(),
});
exports.reviewResponseSchema = zod_1.z.object({
    overview: zod_1.z.object({
        summary: zod_1.z.string(),
        risk: zod_1.z.string().optional(),
        questions: zod_1.z.array(zod_1.z.string()).optional(),
        missingDescriptionFields: zod_1.z.array(zod_1.z.string()).optional(),
    }),
    issues: zod_1.z.array(exports.issueSchema),
});
function validateReviewResponse(data) {
    return exports.reviewResponseSchema.parse(data);
}
function safeValidateReviewResponse(data) {
    const result = exports.reviewResponseSchema.safeParse(data);
    if (result.success) {
        return { success: true, data: result.data };
    }
    return { success: false, error: result.error };
}
//# sourceMappingURL=reviewSchema.js.map