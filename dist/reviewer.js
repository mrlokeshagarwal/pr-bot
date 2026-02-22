"use strict";
/**
 * Review flow orchestration
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.runReview = runReview;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const config_js_1 = require("./config.js");
const index_js_1 = require("./platforms/index.js");
const index_js_2 = require("./providers/index.js");
const dedupe_js_1 = require("./dedupe.js");
const state_js_1 = require("./state.js");
const utils_js_1 = require("./utils.js");
const AI_REVIEW_MARKER = "[AI Review]";
const MAX_DIFF_CHARS = 150000;
function inferReviewMode(description) {
    const d = description.toLowerCase();
    if (d.includes("hotfix"))
        return "hotfix";
    if (d.includes("refactor"))
        return "refactor";
    if (d.includes("feature"))
        return "feature";
    if (d.includes("perf") || d.includes("performance"))
        return "perf";
    if (d.includes("security"))
        return "security";
    return "default";
}
function loadCodingStandard(path) {
    if (!fs.existsSync(path)) {
        throw new Error(`Coding standard file not found: ${path}\nRun: prbot set standard <absolutePath>`);
    }
    return fs.readFileSync(path, "utf-8");
}
function buildOverviewContent(res) {
    const lines = [AI_REVIEW_MARKER];
    lines.push("");
    lines.push("**Summary**");
    lines.push(res.overview.summary);
    if (res.overview.risk) {
        lines.push("");
        lines.push("**Risk**");
        lines.push(res.overview.risk);
    }
    if (res.overview.questions?.length) {
        lines.push("");
        lines.push("**Questions**");
        res.overview.questions.forEach((q) => lines.push(`- ${q}`));
    }
    if (res.overview.missingDescriptionFields?.length) {
        lines.push("");
        lines.push("**Missing Description Fields**");
        res.overview.missingDescriptionFields.forEach((f) => lines.push(`- ${f}`));
    }
    return lines.join("\n");
}
function buildIssueContent(issue) {
    const prefix = `${AI_REVIEW_MARKER} ${issue.severity}: ${issue.title}`;
    const parts = [prefix, "", issue.body];
    if (issue.codeSnippet) {
        parts.push("");
        parts.push("```");
        parts.push(issue.codeSnippet.trim());
        parts.push("```");
    }
    if (issue.standardRef) {
        parts.push("");
        parts.push(`*Standard ref: ${issue.standardRef}*`);
    }
    if (issue.file) {
        parts.push("");
        parts.push(`*File: ${issue.file}${issue.line ? ` (line ${issue.line})` : ""}*`);
    }
    return parts.join("\n");
}
// TODO: Inline comments - map issues with file/line to threadProperties for line-anchored threads
async function runReview(prId, repoOverride, dryRunOverride, githubPrUrlOverride, replaceOverride) {
    const config = (0, config_js_1.loadConfig)();
    (0, config_js_1.printHeader)(config);
    const repoId = repoOverride ?? config.defaultRepo;
    if (!repoId) {
        console.error("Error: No repo configured. Run: prbot set repo <repoNameOrId>");
        process.exit(1);
    }
    const platform = config.platform ?? "ado";
    const platformClient = (0, index_js_1.getPlatform)(config);
    const provider = config.aiProvider ?? "claude";
    if (platform === "github") {
        if (!config.githubToken) {
            console.error("Error: Missing githubToken. Run: prbot set github-token <value>");
            process.exit(1);
        }
    }
    else if (platform === "bitbucket") {
        if (!config.bitbucketToken) {
            console.error("Error: Missing bitbucketToken. Run: prbot set bitbucket-token <value>");
            process.exit(1);
        }
    }
    else {
        if (!config.orgUrl) {
            console.error("Error: Missing orgUrl. Run: prbot set org <value>");
            process.exit(1);
        }
        if (!config.project) {
            console.error("Error: Missing project. Run: prbot set project <value>");
            process.exit(1);
        }
        if (!config.pat) {
            console.error("Error: Missing pat. Run: prbot set pat <value>");
            process.exit(1);
        }
    }
    if (!config.codingStandardPath) {
        console.error("Error: Missing codingStandardPath. Run: prbot set standard <path>");
        process.exit(1);
    }
    const apiKey = provider === "claude"
        ? config.claudeApiKey
        : provider === "cursor"
            ? config.cursorApiKey
            : config.openaiApiKey;
    const keyCommand = provider === "claude" ? "claude-key" : provider === "cursor" ? "cursor-key" : "openai-key";
    if (!apiKey) {
        console.error(`Error: Missing ${provider} API key. Run: prbot set ${keyCommand}`);
        process.exit(1);
    }
    const githubPrUrl = githubPrUrlOverride ?? config.githubPrUrl;
    if (provider === "cursor" && !githubPrUrl) {
        console.error("Error: Cursor provider requires githubPrUrl. Run: prbot set github-pr <url> or use --github-pr <url>");
        process.exit(1);
    }
    if (!fs.existsSync(config.codingStandardPath)) {
        console.error(`Error: Coding standard file not found: ${config.codingStandardPath}`);
        console.error("Run: prbot set standard <absolutePath>");
        process.exit(1);
    }
    const dryRun = dryRunOverride ?? config.dryRun ?? false;
    const maxIssues = config.maxIssues ?? 8;
    console.log(`Fetching PR ${prId}...`);
    const pr = await platformClient.fetchPr(config, repoId, prId);
    let headCommit = pr.lastMergeSourceCommit?.commitId ?? "";
    let baseCommit = pr.lastMergeTargetCommit?.commitId ?? "";
    if (!headCommit || !baseCommit) {
        const iterations = await platformClient.getPrIterations(config, repoId, prId);
        const latest = iterations[iterations.length - 1];
        if (latest) {
            headCommit = latest.sourceRefCommit?.commitId ?? headCommit;
            baseCommit = latest.targetRefCommit?.commitId ?? baseCommit;
        }
    }
    if (!headCommit || !baseCommit) {
        console.error("Error: Could not determine base/head commits for PR");
        process.exit(1);
    }
    const iterations = await platformClient.getPrIterations(config, repoId, prId);
    const latestIteration = iterations[iterations.length - 1];
    const iterationId = latestIteration?.id ?? 1;
    const changes = await platformClient.getPrChanges(config, repoId, prId, iterationId);
    const changedFiles = changes
        .map((c) => c.item?.path)
        .filter((p) => !!p && !p.endsWith("/"));
    const fileToChangeTrackingId = new Map();
    for (const c of changes) {
        const p = c.item?.path;
        if (p && c.changeTrackingId != null) {
            const norm = p.startsWith("/") ? p : `/${p}`;
            fileToChangeTrackingId.set(norm, c.changeTrackingId);
            fileToChangeTrackingId.set(p, c.changeTrackingId);
        }
    }
    const diff = await platformClient.getDiffs(config, repoId, baseCommit, headCommit, {
        prId: platform === "github" || platform === "bitbucket" ? prId : undefined,
    });
    const diffTruncated = (0, utils_js_1.truncateWithMarker)(diff, MAX_DIFF_CHARS);
    const codingStandard = loadCodingStandard(config.codingStandardPath);
    const reviewMode = inferReviewMode(pr.description);
    const bundle = {
        prId,
        title: pr.title,
        description: pr.description || "(no description)",
        reviewMode,
        codingStandard,
        diff: diffTruncated,
        changedFiles,
        ...(provider === "cursor" && githubPrUrl ? { githubPrUrl } : {}),
    };
    const replaceExisting = replaceOverride ?? false;
    let existingThreads = await platformClient.listPrThreads(config, repoId, prId);
    if (replaceExisting) {
        const botThreads = existingThreads.filter((t) => (0, dedupe_js_1.isBotThread)(t));
        if (botThreads.length > 0) {
            console.log(`Deleting ${botThreads.length} existing [AI Review] thread(s)...`);
            for (const thread of botThreads) {
                const comments = thread.comments ?? [];
                for (const comment of comments) {
                    const tid = thread.id ?? comment.id;
                    if (tid != null && comment.id != null) {
                        await platformClient.deletePrThreadComment(config, repoId, prId, tid, comment.id);
                    }
                }
            }
            existingThreads = await platformClient.listPrThreads(config, repoId, prId);
        }
    }
    else {
        const lastReviewed = (0, state_js_1.getLastReviewedCommit)(repoId, prId);
        if (lastReviewed === headCommit && (0, dedupe_js_1.hasOverviewThread)(existingThreads)) {
            console.log("No review needed: [AI Review] overview already posted for this commit.");
            console.log("Use --replace to delete old comments and post a fresh review.");
            process.exit(0);
        }
    }
    const model = provider === "claude"
        ? (config.claudeModel ?? "claude-3-5-sonnet-latest")
        : provider === "cursor"
            ? (config.cursorModel ?? "claude-4-sonnet-thinking")
            : (config.openaiModel ?? "gpt-4o");
    console.log(`Generating review with ${provider}...`);
    const reviewProvider = (0, index_js_2.getProvider)(provider);
    const reviewResult = await reviewProvider.generateReview(apiKey, model, bundle, maxIssues);
    if (!reviewResult.success) {
        console.error("Error:", reviewResult.error);
        const debugPath = path.join((0, utils_js_1.getConfigDir)(), "ai-debug-response.json");
        fs.writeFileSync(debugPath, reviewResult.rawResponse, "utf-8");
        console.error(`Raw response saved to: ${debugPath}`);
        process.exit(1);
    }
    const res = reviewResult.data;
    if (!res.overview?.summary && (!res.issues || res.issues.length === 0)) {
        console.error("Error: AI returned empty/invalid review. Refusing to post.");
        const debugPath = path.join((0, utils_js_1.getConfigDir)(), "ai-debug-response.json");
        fs.writeFileSync(debugPath, JSON.stringify(res, null, 2), "utf-8");
        console.error(`Response saved to: ${debugPath}`);
        process.exit(1);
    }
    const overviewContent = buildOverviewContent(res);
    const issueContents = (res.issues ?? [])
        .slice(0, maxIssues)
        .map((i) => ({ issue: i, content: buildIssueContent(i) }));
    if (dryRun) {
        console.log("\n--- DRY RUN: Review JSON ---");
        console.log(JSON.stringify(res, null, 2));
        console.log("\n--- Planned threads ---");
        console.log("1. Overview:", overviewContent.slice(0, 200) + "...");
        issueContents.forEach((ic, i) => {
            console.log(`${i + 2}. Issue [${ic.issue.severity}]: ${ic.issue.title}`);
        });
        console.log("\nDry run complete. No comments posted.");
        process.exit(0);
    }
    const overviewExists = replaceExisting ? false : (0, dedupe_js_1.hasOverviewThread)(existingThreads);
    let postedOverview = false;
    let postedIssues = 0;
    if (!overviewExists) {
        await platformClient.createPrThread(config, repoId, prId, overviewContent);
        postedOverview = true;
    }
    const iterationContext = { firstComparingIteration: 1, secondComparingIteration: iterationId };
    for (const { issue, content } of issueContents) {
        const fp = (0, dedupe_js_1.fingerprint)(issue.file, issue.title, issue.body);
        const exists = existingThreads.some((t) => (0, dedupe_js_1.threadMatchesFingerprint)(t, fp));
        if (!exists) {
            let inlineContext;
            if (issue.file && issue.line != null && issue.line >= 1) {
                const filePath = issue.file.startsWith("/") ? issue.file : `/${issue.file}`;
                const changeTrackingId = fileToChangeTrackingId.get(issue.file) ?? fileToChangeTrackingId.get(filePath);
                const useInline = platform === "github" || platform === "bitbucket" || changeTrackingId != null;
                if (useInline) {
                    inlineContext = {
                        filePath,
                        line: issue.line,
                        lineEnd: issue.lineEnd,
                        changeTrackingId: changeTrackingId ?? 0,
                    };
                }
            }
            await platformClient.createPrThread(config, repoId, prId, content, inlineContext, inlineContext && platform === "ado" ? iterationContext : undefined);
            postedIssues++;
        }
    }
    (0, state_js_1.setLastReviewedCommit)(repoId, prId, headCommit);
    console.log("Done.");
    console.log(`  Overview: ${postedOverview ? "posted" : "skipped (duplicate)"}`);
    console.log(`  Issues: ${postedIssues} posted`);
}
//# sourceMappingURL=reviewer.js.map