"use strict";
/**
 * Azure DevOps platform client
 * Authentication: Basic base64(":PAT")
 * api-version=7.1
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.adoPlatform = void 0;
const diff_1 = require("diff");
const API_VERSION = "7.1";
function getAuthHeader(pat) {
    const encoded = Buffer.from(`:${pat}`, "utf-8").toString("base64");
    return `Basic ${encoded}`;
}
function buildUrl(orgUrl, project, path, params) {
    const base = `${orgUrl.replace(/\/$/, "")}/${project}/_apis/git${path}`;
    const search = new URLSearchParams({ "api-version": API_VERSION, ...params });
    return `${base}?${search.toString()}`;
}
async function parseJsonOrThrow(res, config, context) {
    const text = await res.text();
    if (!text.trim().startsWith("{") && !text.trim().startsWith("[")) {
        const preview = text.slice(0, 200).replace(config.pat ?? "", "[REDACTED]");
        throw new Error(`${context}: Expected JSON but got HTML or other content. ` +
            `This often means: (1) Invalid PAT or expired token, (2) Wrong org/project/repo, (3) No access to the resource. ` +
            `Response preview: ${preview}...`);
    }
    try {
        return JSON.parse(text);
    }
    catch (e) {
        throw new Error(`${context}: Invalid JSON. ${e.message}. Preview: ${text.slice(0, 150)}...`);
    }
}
exports.adoPlatform = {
    name: "Azure DevOps",
    platform: "ado",
    async fetchPr(config, repoId, prId) {
        const url = buildUrl(config.orgUrl, config.project, `/repositories/${repoId}/pullRequests/${prId}`);
        const res = await fetch(url, {
            headers: { Authorization: getAuthHeader(config.pat) },
            redirect: "manual",
        });
        if (!res.ok) {
            const text = await res.text();
            const msg = text.includes("<!DOCTYPE") || text.includes("<html")
                ? `Auth failed or redirect to login (${res.status}). Check: (1) PAT is valid and has Code read scope, (2) org/project/repo are correct. URL: ${url.replace(config.pat ?? "", "[REDACTED]")}`
                : text.replace(config.pat ?? "", "[REDACTED]").slice(0, 300);
            throw new Error(`ADO API error ${res.status}: ${msg}`);
        }
        const data = await parseJsonOrThrow(res, config, `fetchPr(${prId})`);
        return data;
    },
    async listPrThreads(config, repoId, prId) {
        const url = buildUrl(config.orgUrl, config.project, `/repositories/${repoId}/pullRequests/${prId}/threads`);
        const res = await fetch(url, {
            headers: { Authorization: getAuthHeader(config.pat) },
        });
        if (!res.ok) {
            const text = await res.text();
            throw new Error(`ADO API error ${res.status}: ${text.replace(config.pat ?? "", "[REDACTED]")}`);
        }
        const data = (await res.json());
        return data.value ?? [];
    },
    async deletePrThreadComment(config, repoId, prId, threadId, commentId) {
        const url = buildUrl(config.orgUrl, config.project, `/repositories/${repoId}/pullRequests/${prId}/threads/${threadId}/comments/${commentId}`);
        const res = await fetch(url, {
            method: "DELETE",
            headers: { Authorization: getAuthHeader(config.pat) },
        });
        if (!res.ok) {
            const text = await res.text();
            throw new Error(`ADO API error ${res.status}: ${text.replace(config.pat ?? "", "[REDACTED]")}`);
        }
    },
    async createPrThread(config, repoId, prId, content, inlineContext, iterationContext) {
        const url = buildUrl(config.orgUrl, config.project, `/repositories/${repoId}/pullRequests/${prId}/threads`);
        const body = {
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
                Authorization: getAuthHeader(config.pat),
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });
        if (!res.ok) {
            const text = await res.text();
            throw new Error(`ADO API error ${res.status}: ${text.replace(config.pat ?? "", "[REDACTED]")}`);
        }
        return (await res.json());
    },
    async getPrIterations(config, repoId, prId) {
        const url = buildUrl(config.orgUrl, config.project, `/repositories/${repoId}/pullRequests/${prId}/iterations`);
        const res = await fetch(url, {
            headers: { Authorization: getAuthHeader(config.pat) },
        });
        if (!res.ok) {
            const text = await res.text();
            throw new Error(`ADO API error ${res.status}: ${text.replace(config.pat ?? "", "[REDACTED]")}`);
        }
        const data = (await res.json());
        return data.value ?? [];
    },
    async getPrChanges(config, repoId, prId, iterationId) {
        const url = buildUrl(config.orgUrl, config.project, `/repositories/${repoId}/pullRequests/${prId}/iterations/${iterationId}/changes`);
        const res = await fetch(url, {
            headers: { Authorization: getAuthHeader(config.pat) },
        });
        if (!res.ok) {
            const text = await res.text();
            throw new Error(`ADO API error ${res.status}: ${text.replace(config.pat ?? "", "[REDACTED]")}`);
        }
        const data = (await res.json());
        const changes = data.changes ?? data.changeEntries ?? [];
        return changes.map((c) => ({ item: c.item, changeTrackingId: c.changeTrackingId }));
    },
    async getDiffs(config, repoId, baseCommit, targetCommit, options) {
        const maxFiles = options?.maxFiles ?? 50;
        const maxFileSize = options?.maxFileSize ?? 100000;
        const url = buildUrl(config.orgUrl, config.project, `/repositories/${repoId}/diffs/commits`, {
            baseVersion: baseCommit,
            baseVersionType: "commit",
            targetVersion: targetCommit,
            targetVersionType: "commit",
        });
        const res = await fetch(url, {
            headers: { Authorization: getAuthHeader(config.pat) },
        });
        if (!res.ok) {
            const text = await res.text();
            throw new Error(`ADO API error ${res.status}: ${text.replace(config.pat ?? "", "[REDACTED]")}`);
        }
        const data = (await res.json());
        const changes = data.changes ?? [];
        const blobChanges = changes.filter((ch) => ch.item?.gitObjectType === "blob" && !ch.item?.isFolder && ch.item?.path);
        const filesToFetch = blobChanges.slice(0, maxFiles);
        const parts = [];
        for (const ch of filesToFetch) {
            const path = ch.item.path;
            const changeType = ch.changeType ?? "edit";
            const displayPath = path.startsWith("/") ? path : `/${path}`;
            try {
                let baseContent = "";
                let targetContent = "";
                if (changeType === "add") {
                    targetContent = await getFileContent(config, repoId, path, targetCommit);
                    if (targetContent === "[File not found or deleted]")
                        continue;
                }
                else if (changeType === "delete") {
                    baseContent = await getFileContent(config, repoId, path, baseCommit);
                    if (baseContent === "[File not found or deleted]")
                        baseContent = "";
                }
                else {
                    baseContent = await getFileContent(config, repoId, path, baseCommit);
                    targetContent = await getFileContent(config, repoId, path, targetCommit);
                    if (baseContent === "[File not found or deleted]")
                        baseContent = "";
                    if (targetContent === "[File not found or deleted]")
                        targetContent = "";
                }
                const patch = (0, diff_1.createPatch)(displayPath, baseContent, targetContent, "a/" + displayPath, "b/" + displayPath, { context: 3 });
                if (patch.length > maxFileSize) {
                    parts.push(`--- ${displayPath} (${changeType})\n[... diff truncated ...]\n${patch.slice(0, maxFileSize)}\n\n[... truncated ...]`);
                }
                else {
                    parts.push(`--- ${displayPath} (${changeType})\n${patch}`);
                }
            }
            catch (e) {
                parts.push(`--- ${displayPath} (${changeType})\n[Could not fetch: ${e.message}]`);
            }
        }
        if (blobChanges.length > maxFiles) {
            parts.push(`\n[... ${blobChanges.length - maxFiles} more files omitted ...]`);
        }
        return parts.join("\n\n");
    },
};
async function getFileContent(config, repoId, filePath, commitId) {
    const pathParam = filePath.replace(/^\//, "");
    const url = buildUrl(config.orgUrl, config.project, `/repositories/${repoId}/items`, {
        path: pathParam,
        "versionDescriptor.versionType": "Commit",
        "versionDescriptor.version": commitId,
        download: "false",
    });
    const res = await fetch(url, {
        headers: { Authorization: getAuthHeader(config.pat) },
    });
    if (!res.ok) {
        if (res.status === 404)
            return "[File not found or deleted]";
        const text = await res.text();
        throw new Error(`ADO API error ${res.status}: ${text.replace(config.pat ?? "", "[REDACTED]")}`);
    }
    return await res.text();
}
//# sourceMappingURL=ado.js.map