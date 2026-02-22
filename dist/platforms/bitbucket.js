"use strict";
/**
 * Bitbucket Cloud platform client
 * Uses REST API 2.0 with Bearer token or App Password auth
 * https://developer.atlassian.com/cloud/bitbucket/rest/
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.bitbucketPlatform = void 0;
const API_BASE = "https://api.bitbucket.org/2.0";
function getAuthHeader(token) {
    return `Bearer ${token}`;
}
function parseWorkspaceRepo(repoId) {
    const parts = repoId.split("/");
    if (parts.length >= 2) {
        return { workspace: parts[0], repo: parts.slice(1).join("/") };
    }
    throw new Error(`Bitbucket repo must be workspace/repo format, got: ${repoId}`);
}
async function bbFetch(url, token, options = {}) {
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
async function bbFetchText(url, token) {
    const res = await bbFetch(url, token);
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Bitbucket API error ${res.status}: ${text.replace(token, "[REDACTED]").slice(0, 300)}`);
    }
    return res.text();
}
async function bbFetchJson(url, token) {
    const text = await bbFetchText(url, token);
    return JSON.parse(text);
}
exports.bitbucketPlatform = {
    name: "Bitbucket",
    platform: "bitbucket",
    async fetchPr(config, repoId, prId) {
        const { workspace, repo } = parseWorkspaceRepo(repoId);
        const token = config.bitbucketToken;
        const url = `${API_BASE}/repositories/${workspace}/${repo}/pullrequests/${prId}`;
        const pr = await bbFetchJson(url, token);
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
    async getPrIterations(config, repoId, prId) {
        const pr = await this.fetchPr(config, repoId, prId);
        return [
            {
                id: 1,
                sourceRefCommit: pr.lastMergeSourceCommit,
                targetRefCommit: pr.lastMergeTargetCommit,
            },
        ];
    },
    async getPrChanges(config, repoId, prId, _iterationId) {
        const { workspace, repo } = parseWorkspaceRepo(repoId);
        const token = config.bitbucketToken;
        const url = `${API_BASE}/repositories/${workspace}/${repo}/pullrequests/${prId}/diffstat`;
        const data = await bbFetchJson(url, token);
        const values = data.values ?? [];
        return values.map((v, i) => ({
            item: { path: v.new?.path ?? v.old?.path },
            changeTrackingId: i + 1,
        }));
    },
    async getDiffs(config, repoId, _baseCommit, _headCommit, options) {
        const prId = options?.prId;
        if (!prId) {
            throw new Error("Bitbucket getDiffs requires prId in options");
        }
        const { workspace, repo } = parseWorkspaceRepo(repoId);
        const token = config.bitbucketToken;
        const url = `${API_BASE}/repositories/${workspace}/${repo}/pullrequests/${prId}/diff`;
        return bbFetchText(url, token);
    },
    async listPrThreads(config, repoId, prId) {
        const { workspace, repo } = parseWorkspaceRepo(repoId);
        const token = config.bitbucketToken;
        const threads = [];
        let url = `${API_BASE}/repositories/${workspace}/${repo}/pullrequests/${prId}/comments`;
        while (url) {
            const page = await bbFetchJson(url, token);
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
    async deletePrThreadComment(config, repoId, prId, _threadId, commentId) {
        const { workspace, repo } = parseWorkspaceRepo(repoId);
        const token = config.bitbucketToken;
        const url = `${API_BASE}/repositories/${workspace}/${repo}/pullrequests/${prId}/comments/${commentId}`;
        const res = await bbFetch(url, token, { method: "DELETE" });
        if (!res.ok && res.status !== 404) {
            const text = await res.text();
            throw new Error(`Bitbucket API error ${res.status}: ${text.replace(token, "[REDACTED]")}`);
        }
    },
    async createPrThread(config, repoId, prId, content, inlineContext, _iterationContext) {
        const { workspace, repo } = parseWorkspaceRepo(repoId);
        const token = config.bitbucketToken;
        const body = {
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
        const data = await res.json();
        return {
            id: data.id,
            comments: [{ id: data.id, content: data.content?.raw }],
        };
    },
};
//# sourceMappingURL=bitbucket.js.map