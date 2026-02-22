/**
 * Cursor API provider - Cloud Agents API
 * https://api.cursor.com/v0/agents
 *
 * Launches a Cursor cloud agent to review a GitHub PR and extracts JSON from the conversation.
 * Requires a GitHub PR URL (Cursor Cloud Agents work with GitHub only).
 */

import { safeValidateReviewResponse } from "../reviewSchema.js";
import type { ReviewProvider } from "./types.js";
import type { ReviewBundle, GenerateReviewResult } from "./types.js";

const API_URL = "https://api.cursor.com/v0/agents";

function getAuthHeader(apiKey: string): string {
  return `Basic ${Buffer.from(`${apiKey}:`, "utf-8").toString("base64")}`;
}

export const cursorProvider: ReviewProvider = {
  name: "Cursor",

  async generateReview(
    apiKey: string,
    model: string,
    bundle: ReviewBundle,
    maxIssues: number
  ): Promise<GenerateReviewResult> {
    const githubPrUrl = bundle.githubPrUrl;
    if (!githubPrUrl) {
      return {
        success: false,
        rawResponse: "",
        error:
          "Cursor provider requires a GitHub PR URL. Set githubPrUrl in config or use --github-pr <url>. " +
          "Note: Cursor Cloud Agents work with GitHub only.",
      };
    }

    const promptText = `Review this pull request. Use ONLY the information below. Do not modify any files. Output strictly valid JSON with this schema (no markdown, no extra text):

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
      "file": "string (optional)",
      "line": "number (optional, 1-based)",
      "lineEnd": "number (optional)",
      "codeSnippet": "string (optional, relevant code 2-5 lines)",
      "standardRef": "string (optional)"
    }
  ]
}

Rules: Maximum ${maxIssues} issues. When referencing code include file, line, codeSnippet. Output ONLY valid JSON.

---

# PR: ${bundle.title}

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

    const body: Record<string, unknown> = {
      prompt: { text: promptText },
      source: { prUrl: githubPrUrl },
      target: { autoCreatePr: false },
    };
    if (model) {
      body.model = model;
    }

    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        Authorization: getAuthHeader(apiKey),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    if (!res.ok) {
      return {
        success: false,
        rawResponse: text,
        error: `Cursor API error ${res.status}: ${text}`,
      };
    }

    let launchData: { id?: string };
    try {
      launchData = JSON.parse(text) as { id?: string };
    } catch {
      return { success: false, rawResponse: text, error: "Cursor response is not valid JSON" };
    }

    const agentId = launchData.id;
    if (!agentId) {
      return { success: false, rawResponse: text, error: "Cursor response missing agent id" };
    }

    const maxWaitMs = 120_000;
    const pollIntervalMs = 3000;
    let elapsed = 0;

    while (elapsed < maxWaitMs) {
      await new Promise((r) => setTimeout(r, pollIntervalMs));
      elapsed += pollIntervalMs;

      const statusRes = await fetch(`${API_URL}/${agentId}`, {
        headers: { Authorization: getAuthHeader(apiKey) },
      });
      const statusData = (await statusRes.json()) as { status?: string };
      const status = statusData.status;

      if (status === "FINISHED") {
        const convRes = await fetch(`${API_URL}/${agentId}/conversation`, {
          headers: { Authorization: getAuthHeader(apiKey) },
        });
        const convData = (await convRes.json()) as {
          messages?: Array<{ type: string; text?: string }>;
        };
        const messages = convData.messages ?? [];
        const lastAssistant = [...messages].reverse().find((m) => m.type === "assistant_message");
        const output = lastAssistant?.text ?? "";

        if (!output.trim()) {
          return {
            success: false,
            rawResponse: JSON.stringify(convData),
            error: "Cursor agent returned no review content",
          };
        }

        let jsonStr = output.trim();
        const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (codeBlockMatch) {
          jsonStr = codeBlockMatch[1].trim();
        }

        let jsonParsed: unknown;
        try {
          jsonParsed = JSON.parse(jsonStr);
        } catch (e) {
          return {
            success: false,
            rawResponse: output,
            error: `Cursor JSON parse error: ${(e as Error).message}`,
          };
        }

        const validated = safeValidateReviewResponse(jsonParsed);
        if (!validated.success) {
          return {
            success: false,
            rawResponse: output,
            error: `Schema validation failed: ${validated.error.toString()}`,
          };
        }

        return { success: true, data: validated.data };
      }

      if (status === "FAILED" || status === "STOPPED") {
        return {
          success: false,
          rawResponse: JSON.stringify(statusData),
          error: `Cursor agent ${status?.toLowerCase() ?? "failed"}`,
        };
      }
    }

    return {
      success: false,
      rawResponse: "",
      error: `Cursor agent did not finish within ${maxWaitMs / 1000}s`,
    };
  },
};
