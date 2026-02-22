/**
 * Azure DevOps platform client
 * Authentication: Basic base64(":PAT")
 * api-version=7.1
 */

import { createPatch } from "diff";
import type { AppConfig } from "../config.js";
import type {
  PlatformClient,
  PrInfo,
  PrIteration,
  PrChange,
  PrThread,
  InlineCommentContext,
} from "./types.js";

const API_VERSION = "7.1";

function getAuthHeader(pat: string): string {
  const encoded = Buffer.from(`:${pat}`, "utf-8").toString("base64");
  return `Basic ${encoded}`;
}

function buildUrl(orgUrl: string, project: string, path: string, params?: Record<string, string>): string {
  const base = `${orgUrl.replace(/\/$/, "")}/${project}/_apis/git${path}`;
  const search = new URLSearchParams({ "api-version": API_VERSION, ...params });
  return `${base}?${search.toString()}`;
}

interface AdoPrDetails {
  pullRequestId: number;
  title: string;
  description: string;
  sourceRefName: string;
  targetRefName: string;
  repository: { id: string; name: string };
  lastMergeSourceCommit?: { commitId: string };
  lastMergeTargetCommit?: { commitId: string };
}

async function parseJsonOrThrow<T>(res: Response, config: AppConfig, context: string): Promise<T> {
  const text = await res.text();
  if (!text.trim().startsWith("{") && !text.trim().startsWith("[")) {
    const preview = text.slice(0, 200).replace(config.pat ?? "", "[REDACTED]");
    throw new Error(
      `${context}: Expected JSON but got HTML or other content. ` +
        `This often means: (1) Invalid PAT or expired token, (2) Wrong org/project/repo, (3) No access to the resource. ` +
        `Response preview: ${preview}...`
    );
  }
  try {
    return JSON.parse(text) as T;
  } catch (e) {
    throw new Error(`${context}: Invalid JSON. ${(e as Error).message}. Preview: ${text.slice(0, 150)}...`);
  }
}

export const adoPlatform: PlatformClient = {
  name: "Azure DevOps",
  platform: "ado",

  async fetchPr(config: AppConfig, repoId: string, prId: number): Promise<PrInfo> {
    const url = buildUrl(config.orgUrl!, config.project!, `/repositories/${repoId}/pullRequests/${prId}`);
    const res = await fetch(url, {
      headers: { Authorization: getAuthHeader(config.pat!) },
      redirect: "manual",
    });
    if (!res.ok) {
      const text = await res.text();
      const msg = text.includes("<!DOCTYPE") || text.includes("<html")
        ? `Auth failed or redirect to login (${res.status}). Check: (1) PAT is valid and has Code read scope, (2) org/project/repo are correct. URL: ${url.replace(config.pat ?? "", "[REDACTED]")}`
        : text.replace(config.pat ?? "", "[REDACTED]").slice(0, 300);
      throw new Error(`ADO API error ${res.status}: ${msg}`);
    }
    const data = await parseJsonOrThrow<AdoPrDetails>(res, config, `fetchPr(${prId})`);
    return data as PrInfo;
  },

  async listPrThreads(config: AppConfig, repoId: string, prId: number): Promise<PrThread[]> {
    const url = buildUrl(config.orgUrl!, config.project!, `/repositories/${repoId}/pullRequests/${prId}/threads`);
    const res = await fetch(url, {
      headers: { Authorization: getAuthHeader(config.pat!) },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`ADO API error ${res.status}: ${text.replace(config.pat ?? "", "[REDACTED]")}`);
    }
    const data = (await res.json()) as { value?: PrThread[] };
    return data.value ?? [];
  },

  async deletePrThreadComment(
    config: AppConfig,
    repoId: string,
    prId: number,
    threadId: number,
    commentId: number
  ): Promise<void> {
    const url = buildUrl(
      config.orgUrl!,
      config.project!,
      `/repositories/${repoId}/pullRequests/${prId}/threads/${threadId}/comments/${commentId}`
    );
    const res = await fetch(url, {
      method: "DELETE",
      headers: { Authorization: getAuthHeader(config.pat!) },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`ADO API error ${res.status}: ${text.replace(config.pat ?? "", "[REDACTED]")}`);
    }
  },

  async createPrThread(
    config: AppConfig,
    repoId: string,
    prId: number,
    content: string,
    inlineContext?: InlineCommentContext,
    iterationContext?: { firstComparingIteration: number; secondComparingIteration: number }
  ): Promise<PrThread> {
    const url = buildUrl(config.orgUrl!, config.project!, `/repositories/${repoId}/pullRequests/${prId}/threads`);
    const body: Record<string, unknown> = {
      comments: [{ parentCommentId: 0, content, commentType: 1 }],
      status: 1,
    };

    if (inlineContext && iterationContext) {
      const lineEnd = inlineContext.lineEnd ?? inlineContext.line;
      body.threadContext = {
        filePath: inlineContext.filePath.startsWith("/") ? inlineContext.filePath : `/${inlineContext.filePath}`,
        leftFileStart: null,
        leftFileEnd: null,
        rightFileStart: { line: inlineContext.line, offset: 1 },
        rightFileEnd: { line: lineEnd, offset: 999 },
      };
      body.pullRequestThreadContext = {
        changeTrackingId: inlineContext.changeTrackingId,
        iterationContext,
      };
    }

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: getAuthHeader(config.pat!),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`ADO API error ${res.status}: ${text.replace(config.pat ?? "", "[REDACTED]")}`);
    }
    return (await res.json()) as PrThread;
  },

  async getPrIterations(config: AppConfig, repoId: string, prId: number): Promise<PrIteration[]> {
    const url = buildUrl(config.orgUrl!, config.project!, `/repositories/${repoId}/pullRequests/${prId}/iterations`);
    const res = await fetch(url, {
      headers: { Authorization: getAuthHeader(config.pat!) },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`ADO API error ${res.status}: ${text.replace(config.pat ?? "", "[REDACTED]")}`);
    }
    const data = (await res.json()) as { value?: PrIteration[] };
    return data.value ?? [];
  },

  async getPrChanges(
    config: AppConfig,
    repoId: string,
    prId: number,
    iterationId: number
  ): Promise<PrChange[]> {
    const url = buildUrl(
      config.orgUrl!,
      config.project!,
      `/repositories/${repoId}/pullRequests/${prId}/iterations/${iterationId}/changes`
    );
    const res = await fetch(url, {
      headers: { Authorization: getAuthHeader(config.pat!) },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`ADO API error ${res.status}: ${text.replace(config.pat ?? "", "[REDACTED]")}`);
    }
    const data = (await res.json()) as {
      changes?: Array<{ item?: { path?: string }; changeTrackingId?: number }>;
      changeEntries?: Array<{ item?: { path?: string }; changeTrackingId?: number }>;
    };
    const changes = data.changes ?? data.changeEntries ?? [];
    return changes.map((c) => ({ item: c.item, changeTrackingId: c.changeTrackingId }));
  },

  async getDiffs(
    config: AppConfig,
    repoId: string,
    baseCommit: string,
    targetCommit: string,
    options?: { maxFiles?: number; maxFileSize?: number; prId?: number }
  ): Promise<string> {
    const maxFiles = options?.maxFiles ?? 50;
    const maxFileSize = options?.maxFileSize ?? 100000;
    const url = buildUrl(config.orgUrl!, config.project!, `/repositories/${repoId}/diffs/commits`, {
      baseVersion: baseCommit,
      baseVersionType: "commit",
      targetVersion: targetCommit,
      targetVersionType: "commit",
    });
    const res = await fetch(url, {
      headers: { Authorization: getAuthHeader(config.pat!) },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`ADO API error ${res.status}: ${text.replace(config.pat ?? "", "[REDACTED]")}`);
    }
    interface DiffChange {
      item?: { path?: string; gitObjectType?: string; isFolder?: boolean };
      changeType?: string;
    }
    const data = (await res.json()) as { changes?: DiffChange[] };
    const changes = data.changes ?? [];
    const blobChanges = changes.filter(
      (ch) => ch.item?.gitObjectType === "blob" && !ch.item?.isFolder && ch.item?.path
    );
    const filesToFetch = blobChanges.slice(0, maxFiles);
    const parts: string[] = [];

    for (const ch of filesToFetch) {
      const path = ch.item!.path!;
      const changeType = ch.changeType ?? "edit";
      const displayPath = path.startsWith("/") ? path : `/${path}`;
      try {
        let baseContent = "";
        let targetContent = "";
        if (changeType === "add") {
          targetContent = await getFileContent(config, repoId, path, targetCommit);
          if (targetContent === "[File not found or deleted]") continue;
        } else if (changeType === "delete") {
          baseContent = await getFileContent(config, repoId, path, baseCommit);
          if (baseContent === "[File not found or deleted]") baseContent = "";
        } else {
          baseContent = await getFileContent(config, repoId, path, baseCommit);
          targetContent = await getFileContent(config, repoId, path, targetCommit);
          if (baseContent === "[File not found or deleted]") baseContent = "";
          if (targetContent === "[File not found or deleted]") targetContent = "";
        }
        const patch = createPatch(
          displayPath,
          baseContent,
          targetContent,
          "a/" + displayPath,
          "b/" + displayPath,
          { context: 3 }
        );
        if (patch.length > maxFileSize) {
          parts.push(
            `--- ${displayPath} (${changeType})\n[... diff truncated ...]\n${patch.slice(0, maxFileSize)}\n\n[... truncated ...]`
          );
        } else {
          parts.push(`--- ${displayPath} (${changeType})\n${patch}`);
        }
      } catch (e) {
        parts.push(`--- ${displayPath} (${changeType})\n[Could not fetch: ${(e as Error).message}]`);
      }
    }

    if (blobChanges.length > maxFiles) {
      parts.push(`\n[... ${blobChanges.length - maxFiles} more files omitted ...]`);
    }
    return parts.join("\n\n");
  },
};

async function getFileContent(
  config: AppConfig,
  repoId: string,
  filePath: string,
  commitId: string
): Promise<string> {
  const pathParam = filePath.replace(/^\//, "");
  const url = buildUrl(config.orgUrl!, config.project!, `/repositories/${repoId}/items`, {
    path: pathParam,
    "versionDescriptor.versionType": "Commit",
    "versionDescriptor.version": commitId,
    download: "false",
  });
  const res = await fetch(url, {
    headers: { Authorization: getAuthHeader(config.pat!) },
  });
  if (!res.ok) {
    if (res.status === 404) return "[File not found or deleted]";
    const text = await res.text();
    throw new Error(`ADO API error ${res.status}: ${text.replace(config.pat ?? "", "[REDACTED]")}`);
  }
  return await res.text();
}
