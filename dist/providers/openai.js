"use strict";
/**
 * OpenAI API provider - Chat Completions API (GPT-4, etc.)
 * https://api.openai.com/v1/chat/completions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.openaiProvider = void 0;
const reviewSchema_js_1 = require("../reviewSchema.js");
const API_URL = "https://api.openai.com/v1/chat/completions";
exports.openaiProvider = {
    name: "OpenAI",
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
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userContent },
            ],
        };
        const res = await fetch(API_URL, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });
        const text = await res.text();
        if (!res.ok) {
            return { success: false, rawResponse: text, error: `OpenAI API error ${res.status}: ${text}` };
        }
        let parsed;
        try {
            parsed = JSON.parse(text);
        }
        catch {
            return { success: false, rawResponse: text, error: "OpenAI response is not valid JSON" };
        }
        const choices = parsed?.choices;
        const content = choices?.[0]?.message?.content ?? "";
        if (!content.trim()) {
            return { success: false, rawResponse: text, error: "OpenAI returned empty content" };
        }
        let jsonStr = content.trim();
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
                error: `OpenAI JSON parse error: ${e.message}. Output: ${content.slice(0, 500)}`,
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
//# sourceMappingURL=openai.js.map