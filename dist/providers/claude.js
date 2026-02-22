"use strict";
/**
 * Claude API provider - Anthropic Messages API
 * https://api.anthropic.com/v1/messages
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.claudeProvider = void 0;
const reviewSchema_js_1 = require("../reviewSchema.js");
const API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
exports.claudeProvider = {
    name: "Claude",
    async generateReview(apiKey, model, bundle, maxIssues) {
        const systemPrompt = `You are a strict code review assistant. Use only: PR description, diff, and coding standard. Do not invent context. Prefer high-signal issues. Return JSON only.

Output strictly this JSON schema (no markdown, no extra text):
{
  "overview": {
    "summary": "string",
    "risk": "string (optional)",
    "questions": ["string array optional"],
    "missingDescriptionFields": ["string array optional"]
  },
  "issues": [
    {
      "severity": "critical|high|medium|low|info",
      "title": "string",
      "body": "string",
      "file": "string (optional, path from diff)",
      "line": "number (optional, 1-based line number for inline placement)",
      "lineEnd": "number (optional, for multi-line)",
      "codeSnippet": "string (optional, include relevant code like 2-5 lines)",
      "standardRef": "string (optional)"
    }
  ]
}

Rules:
- Maximum ${maxIssues} issues. Prefer high-signal only.
- Each issue must cite a standard heading or explain correctness/security risk.
- When referencing specific code: include file, line, and codeSnippet (the exact lines from the diff).
- If no issues, return overview with empty issues array.
- Output ONLY valid JSON.`;
        const userContent = `# PR: ${bundle.title}

## Description
${bundle.description}

## Review Mode
${bundle.reviewMode}

## Changed Files
${bundle.changedFiles.join("\n")}

## Coding Standard
${bundle.codingStandard}

## Diff (unified format: + added, - removed)
${bundle.diff}`;
        const body = {
            model,
            max_tokens: 8192,
            system: systemPrompt,
            messages: [{ role: "user", content: userContent }],
        };
        const res = await fetch(API_URL, {
            method: "POST",
            headers: {
                "x-api-key": apiKey,
                "anthropic-version": ANTHROPIC_VERSION,
                "content-type": "application/json",
            },
            body: JSON.stringify(body),
        });
        const text = await res.text();
        if (!res.ok) {
            return { success: false, rawResponse: text, error: `Claude API error ${res.status}: ${text}` };
        }
        let parsed;
        try {
            parsed = JSON.parse(text);
        }
        catch {
            return { success: false, rawResponse: text, error: "Claude response is not valid JSON" };
        }
        const content = parsed?.content;
        const textBlock = Array.isArray(content) ? content.find((c) => c.type === "text") : null;
        const output = textBlock?.text ?? "";
        if (!output.trim()) {
            return { success: false, rawResponse: text, error: "Claude returned empty content" };
        }
        let jsonStr = output.trim();
        const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (codeBlockMatch) {
            jsonStr = codeBlockMatch[1].trim();
        }
        let jsonParsed;
        try {
            jsonParsed = JSON.parse(jsonStr);
        }
        catch (e) {
            return {
                success: false,
                rawResponse: text,
                error: `Claude JSON parse error: ${e.message}. Output: ${output.slice(0, 500)}`,
            };
        }
        const validated = (0, reviewSchema_js_1.safeValidateReviewResponse)(jsonParsed);
        if (!validated.success) {
            return {
                success: false,
                rawResponse: text,
                error: `Schema validation failed: ${validated.error.toString()}`,
            };
        }
        return { success: true, data: validated.data };
    },
};
//# sourceMappingURL=claude.js.map