/**
 * GitHub platform client
 * Uses REST API v3 with Bearer token auth
 * https://docs.github.com/en/rest
 */

import type { AppConfig } from "../config.js";
import type {
  PlatformClient,
  PrInfo,
  PrIteration,
  PrChange,
  PrThread,
  InlineCommentContext,
} from "./types.js";

const API_BASE = "https://api.github.com";

function getAuthHeader(token: string): string {
  return `Bearer ${token}`;
}

function parseOwnerRepo(repoId: string): { owner: string; repo: string } {
  const parts = repoId.split("/");
  if (parts.length >= 2) {
    return { owner: parts[0], repo: parts.slice(1).join("/") };
  }
  throw new Error(`GitHub repo must be owner/repo format, got: ${repoId}`);
}

async function ghFetch(
  url: string,
  token: string,
  options: RequestInit = {}
): Promise<Response> {
  return fetch(url, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      Authorization: getAuthHeader(token),
      ...options.headers,
    },
  });
}

async function ghFetchText(url: string, token: string, accept?: string): Promise<string> {
  const res = await ghFetch(url, token, {
    headers: accept ? { Accept: accept } : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API error ${res.status}: ${text.replace(token, "[REDACTED]").slice(0, 300)}`);
  }
  return res.text();
}

async function ghFetchJson<T>(url: string, token: string): Promise<T> {
  const text = await ghFetchText(url, token);
  return JSON.parse(text) as T;
}

interface GhPr {
  number: number;
  title: string;
  body: string | null;
  base: { sha: string };
  head: { sha: string };
}

interface GhFile {
  filename: string;
  status?: string;
}

interface GhReviewComment {
  id: number;
  body: string;
  path?: string;
  line?: number;
  original_line?: number;
  side?: string;
}

interface GhIssueComment {
  id: number;
  body: string;
}

export const githubPlatform: PlatformClient = {
  name: "GitHub",
  platform: "github",

  async fetchPr(config: AppConfig, repoId: string, prId: number): Promise<PrInfo> {
    const { owner, repo } = parseOwnerRepo(repoId);
    const token = config.githubToken!;
    const url = `${API_BASE}/repos/${owner}/${repo}/pulls/${prId}`;
    const pr = await ghFetchJson<GhPr>(url, token);
    return {
      pullRequestId: pr.number,
      title: pr.title,
      description: pr.body ?? "",
      sourceRefName: `refs/heads/${pr.head.sha}`,
      targetRefName: `refs/heads/${pr.base.sha}`,
      repository: { id: repoId, name: repo },
      lastMergeSourceCommit: { commitId: pr.head.sha },
      lastMergeTargetCommit: { commitId: pr.base.sha },
    };
  },

  async getPrIterations(config: AppConfig, repoId: string, prId: number): Promise<PrIteration[]> {
    const pr = await this.fetchPr(config, repoId, prId);
    return [
      {
        id: 1,
        sourceRefCommit: { commitId: pr.lastMergeSourceCommit?.commitId ?? "" },
        targetRefCommit: { commitId: pr.lastMergeTargetCommit?.commitId ?? "" },
      },
    ];
  },

  async getPrChanges(
    config: AppConfig,
    repoId: string,
    prId: number,
    _iterationId: number
  ): Promise<PrChange[]> {
    const { owner, repo } = parseOwnerRepo(repoId);
    const token = config.githubToken!;
    const url = `${API_BASE}/repos/${owner}/${repo}/pulls/${prId}/files`;
    const files = await ghFetchJson<GhFile[]>(url, token);
    return files.map((f, i) => ({
      item: { path: f.filename },
      changeTrackingId: i + 1,
    }));
  },

  async getDiffs(
    config: AppConfig,
    repoId: string,
    _baseCommit: string,
    _headCommit: string,
    options?: { maxFiles?: number; maxFileSize?: number; prId?: number }
  ): Promise<string> {
    const prId = options?.prId;
    if (!prId) {
      throw new Error("GitHub getDiffs requires prId in options");
    }
    const { owner, repo } = parseOwnerRepo(repoId);
    const token = config.githubToken!;
    const url = `${API_BASE}/repos/${owner}/${repo}/pulls/${prId}`;
    return ghFetchText(url, token, "application/vnd.github.v3.diff");
  },

  async listPrThreads(config: AppConfig, repoId: string, prId: number): Promise<PrThread[]> {
    const { owner, repo } = parseOwnerRepo(repoId);
    const token = config.githubToken!;
    const threads: PrThread[] = [];

    const issueCommentsUrl = `${API_BASE}/repos/${owner}/${repo}/issues/${prId}/comments`;
    const issueComments = await ghFetchJson<GhIssueComment[]>(issueCommentsUrl, token);
    for (const c of issueComments) {
      threads.push({ id: c.id, comments: [{ id: c.id, content: c.body }] });
    }

    const reviewCommentsUrl = `${API_BASE}/repos/${owner}/${repo}/pulls/${prId}/comments`;
    const reviewComments = await ghFetchJson<GhReviewComment[]>(reviewCommentsUrl, token);
    for (const c of reviewComments) {
      threads.push({ id: c.id, comments: [{ id: c.id, content: c.body }] });
    }

    return threads;
  },

  async deletePrThreadComment(
    config: AppConfig,
    repoId: string,
    _prId: number,
    _threadId: number,
    commentId: number
  ): Promise<void> {
    const { owner, repo } = parseOwnerRepo(repoId);
    const token = config.githubToken!;
    const reviewUrl = `${API_BASE}/repos/${owner}/${repo}/pulls/comments/${commentId}`;
    const issueUrl = `${API_BASE}/repos/${owner}/${repo}/issues/comments/${commentId}`;
    const resReview = await ghFetch(reviewUrl, token, { method: "DELETE" });
    if (resReview.ok) return;
    if (resReview.status === 404) {
      const resIssue = await ghFetch(issueUrl, token, { method: "DELETE" });
      if (!resIssue.ok && resIssue.status !== 404) {
        const text = await resIssue.text();
        throw new Error(`GitHub API error ${resIssue.status}: ${text.replace(token, "[REDACTED]")}`);
      }
    } else {
      const text = await resReview.text();
      throw new Error(`GitHub API error ${resReview.status}: ${text.replace(token, "[REDACTED]")}`);
    }
  },

  async createPrThread(
    config: AppConfig,
    repoId: string,
    prId: number,
    content: string,
    inlineContext?: InlineCommentContext,
    _iterationContext?: { firstComparingIteration: number; secondComparingIteration: number }
  ): Promise<PrThread> {
    const { owner, repo } = parseOwnerRepo(repoId);
    const token = config.githubToken!;

    if (inlineContext) {
      const pr = await this.fetchPr(config, repoId, prId);
      const headCommit = pr.lastMergeSourceCommit?.commitId;
      if (!headCommit) {
        throw new Error("Could not determine head commit for inline comment");
      }
      const path = inlineContext.filePath.replace(/^\//, "");
      const body: Record<string, unknown> = {
        body: content,
        commit_id: headCommit,
        path,
        line: inlineContext.lineEnd ?? inlineContext.line,
        side: "RIGHT",
      };
      if (inlineContext.lineEnd && inlineContext.lineEnd !== inlineContext.line) {
        body.start_line = inlineContext.line;
        body.start_side = "RIGHT";
      }
      const url = `${API_BASE}/repos/${owner}/${repo}/pulls/${prId}/comments`;
      const res = await ghFetch(url, token, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`GitHub API error ${res.status}: ${text.replace(token, "[REDACTED]")}`);
      }
      const data = (await res.json()) as { id: number; body: string };
      return { id: data.id, comments: [{ id: data.id, content: data.body }] };
    }

    const url = `${API_BASE}/repos/${owner}/${repo}/issues/${prId}/comments`;
    const res = await ghFetch(url, token, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: content }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`GitHub API error ${res.status}: ${text.replace(token, "[REDACTED]")}`);
    }
    const data = (await res.json()) as { id: number; body: string };
    return { id: data.id, comments: [{ id: data.id, content: data.body }] };
  },
};
