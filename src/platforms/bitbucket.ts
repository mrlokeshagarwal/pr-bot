/**
 * Bitbucket Cloud platform client
 * Uses REST API 2.0 with Bearer token or App Password auth
 * https://developer.atlassian.com/cloud/bitbucket/rest/
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

const API_BASE = "https://api.bitbucket.org/2.0";

function getAuthHeader(token: string): string {
  return `Bearer ${token}`;
}

function parseWorkspaceRepo(repoId: string): { workspace: string; repo: string } {
  const parts = repoId.split("/");
  if (parts.length >= 2) {
    return { workspace: parts[0], repo: parts.slice(1).join("/") };
  }
  throw new Error(`Bitbucket repo must be workspace/repo format, got: ${repoId}`);
}

async function bbFetch(
  url: string,
  token: string,
  options: RequestInit = {}
): Promise<Response> {
  return fetch(url, {
    ...options,
    headers: {
      Accept: "application/json",
      Authorization: getAuthHeader(token),
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
}

async function bbFetchText(url: string, token: string): Promise<string> {
  const res = await bbFetch(url, token);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Bitbucket API error ${res.status}: ${text.replace(token, "[REDACTED]").slice(0, 300)}`);
  }
  return res.text();
}

async function bbFetchJson<T>(url: string, token: string): Promise<T> {
  const text = await bbFetchText(url, token);
  return JSON.parse(text) as T;
}

interface BbPr {
  id: number;
  title: string;
  description: string | null;
  source: { commit?: { hash?: string } };
  destination: { commit?: { hash?: string } };
  links?: { html?: { href?: string } };
}

interface BbComment {
  id: number;
  content?: { raw?: string };
}

interface BbDiffStat {
  values?: Array<{ old?: { path?: string }; new?: { path?: string } }>;
}

export const bitbucketPlatform: PlatformClient = {
  name: "Bitbucket",
  platform: "bitbucket",

  async fetchPr(config: AppConfig, repoId: string, prId: number): Promise<PrInfo> {
    const { workspace, repo } = parseWorkspaceRepo(repoId);
    const token = config.bitbucketToken!;
    const url = `${API_BASE}/repositories/${workspace}/${repo}/pullrequests/${prId}`;
    const pr = await bbFetchJson<BbPr>(url, token);
    const headCommit = pr.source?.commit?.hash ?? "";
    const baseCommit = pr.destination?.commit?.hash ?? "";
    return {
      pullRequestId: pr.id,
      title: pr.title,
      description: pr.description ?? "",
      sourceRefName: headCommit ? `refs/heads/${headCommit}` : "",
      targetRefName: baseCommit ? `refs/heads/${baseCommit}` : "",
      repository: { id: repoId, name: repo },
      lastMergeSourceCommit: headCommit ? { commitId: headCommit } : undefined,
      lastMergeTargetCommit: baseCommit ? { commitId: baseCommit } : undefined,
    };
  },

  async getPrIterations(config: AppConfig, repoId: string, prId: number): Promise<PrIteration[]> {
    const pr = await this.fetchPr(config, repoId, prId);
    return [
      {
        id: 1,
        sourceRefCommit: pr.lastMergeSourceCommit,
        targetRefCommit: pr.lastMergeTargetCommit,
      },
    ];
  },

  async getPrChanges(
    config: AppConfig,
    repoId: string,
    prId: number,
    _iterationId: number
  ): Promise<PrChange[]> {
    const { workspace, repo } = parseWorkspaceRepo(repoId);
    const token = config.bitbucketToken!;
    const url = `${API_BASE}/repositories/${workspace}/${repo}/pullrequests/${prId}/diffstat`;
    const data = await bbFetchJson<BbDiffStat>(url, token);
    const values = data.values ?? [];
    return values.map((v, i) => ({
      item: { path: v.new?.path ?? v.old?.path },
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
      throw new Error("Bitbucket getDiffs requires prId in options");
    }
    const { workspace, repo } = parseWorkspaceRepo(repoId);
    const token = config.bitbucketToken!;
    const url = `${API_BASE}/repositories/${workspace}/${repo}/pullrequests/${prId}/diff`;
    return bbFetchText(url, token);
  },

  async listPrThreads(config: AppConfig, repoId: string, prId: number): Promise<PrThread[]> {
    const { workspace, repo } = parseWorkspaceRepo(repoId);
    const token = config.bitbucketToken!;
    const threads: PrThread[] = [];
    let url: string | null = `${API_BASE}/repositories/${workspace}/${repo}/pullrequests/${prId}/comments`;

    while (url) {
      const page: { values?: BbComment[]; next?: string } = await bbFetchJson(url, token);
      const values = page.values ?? [];
      for (const c of values) {
        threads.push({
          id: c.id,
          comments: [{ id: c.id, content: c.content?.raw }],
        });
      }
      url = page.next ?? null;
    }

    return threads;
  },

  async deletePrThreadComment(
    config: AppConfig,
    repoId: string,
    prId: number,
    _threadId: number,
    commentId: number
  ): Promise<void> {
    const { workspace, repo } = parseWorkspaceRepo(repoId);
    const token = config.bitbucketToken!;
    const url = `${API_BASE}/repositories/${workspace}/${repo}/pullrequests/${prId}/comments/${commentId}`;
    const res = await bbFetch(url, token, { method: "DELETE" });
    if (!res.ok && res.status !== 404) {
      const text = await res.text();
      throw new Error(`Bitbucket API error ${res.status}: ${text.replace(token, "[REDACTED]")}`);
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
    const { workspace, repo } = parseWorkspaceRepo(repoId);
    const token = config.bitbucketToken!;

    const body: Record<string, unknown> = {
      content: { raw: content },
    };

    if (inlineContext) {
      const path = inlineContext.filePath.replace(/^\//, "");
      const lineEnd = inlineContext.lineEnd ?? inlineContext.line;
      body.inline = {
        path,
        from: inlineContext.line,
        to: lineEnd,
      };
    }

    const url = `${API_BASE}/repositories/${workspace}/${repo}/pullrequests/${prId}/comments`;
    const res = await bbFetch(url, token, {
      method: "POST",
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Bitbucket API error ${res.status}: ${text.replace(token, "[REDACTED]")}`);
    }
    const data = await res.json() as { id: number; content?: { raw?: string } };
    return {
      id: data.id,
      comments: [{ id: data.id, content: data.content?.raw }],
    };
  },
};
