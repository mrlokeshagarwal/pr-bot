#!/usr/bin/env node
"use strict";
/**
 * prbot - Multi-platform PR Review Bot
 * Supports Azure DevOps and GitHub
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const prompts_1 = __importDefault(require("prompts"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const config_js_1 = require("./config.js");
const reviewer_js_1 = require("./reviewer.js");
const utils_js_1 = require("./utils.js");
const program = new commander_1.Command();
program
    .name("prbot")
    .description("Multi-platform PR Review Bot - AI-powered code review for Azure DevOps and GitHub")
    .version("1.0.0");
function ensureHeader() {
    const config = (0, config_js_1.loadConfig)();
    (0, config_js_1.printHeader)(config);
}
program
    .command("status")
    .description("Show current configuration and status")
    .action(() => {
    const config = (0, config_js_1.loadConfig)();
    (0, config_js_1.printStatus)(config);
});
program
    .command("set")
    .description("Set configuration values")
    .argument("<key>", "platform | org | project | repo | standard | pat | github-token | bitbucket-token | provider | claude-key | cursor-key | openai-key | model | github-pr | maxissues | dryrun")
    .argument("[value]", "Value (for pat: paste token here if prompt paste fails)")
    .action(async (key, value) => {
    const config = (0, config_js_1.loadConfig)();
    (0, config_js_1.printHeader)(config);
    const dir = (0, utils_js_1.getConfigDir)();
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    switch (key.toLowerCase()) {
        case "platform":
            if (value === "ado" || value === "github" || value === "bitbucket") {
                config.platform = value;
                (0, config_js_1.saveConfig)(config);
                console.log(`Platform set to ${value}.`);
            }
            else {
                console.error("Platform must be 'ado', 'github', or 'bitbucket'");
                process.exit(1);
            }
            break;
        case "org":
            config.orgUrl = value;
            (0, config_js_1.saveConfig)(config);
            console.log("Org URL set.");
            break;
        case "project":
            config.project = value;
            (0, config_js_1.saveConfig)(config);
            console.log("Project set.");
            break;
        case "repo":
            config.defaultRepo = value;
            (0, config_js_1.saveConfig)(config);
            console.log("Default repo set.");
            break;
        case "standard":
            config.codingStandardPath = value;
            if (!fs.existsSync(value)) {
                console.warn(`Warning: File not found: ${value}`);
            }
            (0, config_js_1.saveConfig)(config);
            console.log("Coding standard path set.");
            break;
        case "github-token": {
            let tokenInput;
            if (value) {
                tokenInput = value;
            }
            else {
                const result = await (0, prompts_1.default)({
                    type: "password",
                    name: "token",
                    message: "Enter GitHub token (hidden):",
                });
                tokenInput = result.token;
            }
            const sanitizedToken = (0, utils_js_1.sanitizeSecret)(tokenInput);
            if (sanitizedToken) {
                config.githubToken = sanitizedToken;
                (0, config_js_1.saveConfig)(config);
                console.log("GitHub token set.");
            }
            else {
                console.log("No token entered. Use: prbot set github-token YOUR_TOKEN");
            }
            break;
        }
        case "bitbucket-token": {
            let tokenInput;
            if (value) {
                tokenInput = value;
            }
            else {
                const result = await (0, prompts_1.default)({
                    type: "password",
                    name: "token",
                    message: "Enter Bitbucket App Password (hidden):",
                });
                tokenInput = result.token;
            }
            const sanitizedToken = (0, utils_js_1.sanitizeSecret)(tokenInput);
            if (sanitizedToken) {
                config.bitbucketToken = sanitizedToken;
                (0, config_js_1.saveConfig)(config);
                console.log("Bitbucket token set.");
            }
            else {
                console.log("No token entered. Use: prbot set bitbucket-token YOUR_TOKEN");
            }
            break;
        }
        case "pat": {
            let patInput;
            if (value) {
                patInput = value;
            }
            else {
                const result = await (0, prompts_1.default)({
                    type: "password",
                    name: "pat",
                    message: "Enter Azure DevOps PAT (hidden):",
                });
                patInput = result.pat;
            }
            const sanitized = (0, utils_js_1.sanitizeSecret)(patInput);
            if (sanitized) {
                config.pat = sanitized;
                (0, config_js_1.saveConfig)(config);
                console.log("PAT set.");
            }
            else {
                console.log("No PAT entered.");
                console.log("Tip: If paste fails in the prompt, use: prbot set pat YOUR_PAT");
                console.log("     (paste the token as the argument; avoid leaving it in shell history)");
            }
            break;
        }
        case "provider":
            if (value === "claude" || value === "cursor" || value === "openai") {
                config.aiProvider = value;
                (0, config_js_1.saveConfig)(config);
                console.log(`AI provider set to ${value}.`);
            }
            else {
                console.error("Provider must be 'claude', 'cursor', or 'openai'");
                process.exit(1);
            }
            break;
        case "claude-key":
        case "claudekey": {
            let apiKey;
            if (value) {
                apiKey = value;
            }
            else {
                const result = await (0, prompts_1.default)({
                    type: "password",
                    name: "key",
                    message: "Enter Claude API key (hidden):",
                });
                apiKey = result.key;
            }
            const sanitized = (0, utils_js_1.sanitizeSecret)(apiKey);
            if (sanitized) {
                config.claudeApiKey = sanitized;
                (0, config_js_1.saveConfig)(config);
                console.log("Claude API key set.");
            }
            else {
                console.log("No key entered. Use: prbot set claude-key YOUR_KEY");
            }
            break;
        }
        case "cursor-key": {
            let apiKey;
            if (value) {
                apiKey = value;
            }
            else {
                const result = await (0, prompts_1.default)({
                    type: "password",
                    name: "key",
                    message: "Enter Cursor API key (hidden):",
                });
                apiKey = result.key;
            }
            const sanitized = (0, utils_js_1.sanitizeSecret)(apiKey);
            if (sanitized) {
                config.cursorApiKey = sanitized;
                (0, config_js_1.saveConfig)(config);
                console.log("Cursor API key set.");
            }
            else {
                console.log("No key entered. Use: prbot set cursor-key YOUR_KEY");
            }
            break;
        }
        case "openai-key": {
            let apiKey;
            if (value) {
                apiKey = value;
            }
            else {
                const result = await (0, prompts_1.default)({
                    type: "password",
                    name: "key",
                    message: "Enter OpenAI API key (hidden):",
                });
                apiKey = result.key;
            }
            const sanitized = (0, utils_js_1.sanitizeSecret)(apiKey);
            if (sanitized) {
                config.openaiApiKey = sanitized;
                (0, config_js_1.saveConfig)(config);
                console.log("OpenAI API key set.");
            }
            else {
                console.log("No key entered. Use: prbot set openai-key YOUR_KEY");
            }
            break;
        }
        case "model":
            const p = config.aiProvider ?? "claude";
            if (p === "cursor") {
                config.cursorModel = value;
            }
            else if (p === "openai") {
                config.openaiModel = value;
            }
            else {
                config.claudeModel = value;
            }
            (0, config_js_1.saveConfig)(config);
            console.log("Model set.");
            break;
        case "github-pr":
            config.githubPrUrl = value;
            (0, config_js_1.saveConfig)(config);
            console.log("GitHub PR URL set (for Cursor provider).");
            break;
        case "maxissues":
            config.maxIssues = parseInt(value, 10);
            (0, config_js_1.saveConfig)(config);
            console.log("Max issues set.");
            break;
        case "dryrun":
            config.dryRun = value.toLowerCase() === "true" || value === "1";
            (0, config_js_1.saveConfig)(config);
            console.log("Dry run set to", config.dryRun);
            break;
        default:
            console.error(`Unknown config key: ${key}`);
            console.error("Valid keys: platform, org, project, repo, standard, pat, github-token, bitbucket-token, provider, claude-key, cursor-key, openai-key, model, github-pr, maxissues, dryrun");
            process.exit(1);
    }
});
program
    .command("review")
    .description("Run AI review on a pull request")
    .argument("<prIdOrRepo>", "PR ID or repo name (if two args)")
    .argument("[prId]", "PR ID (when repo override provided)")
    .option("--dry-run", "Generate review JSON and print, do not post")
    .option("--replace", "Delete existing [AI Review] comments and post fresh review")
    .option("--github-pr <url>", "GitHub PR URL (for Cursor provider, overrides config)")
    .action(async (prIdOrRepo, prIdArg, opts) => {
    let prId;
    let repoOverride;
    if (prIdArg !== undefined) {
        repoOverride = prIdOrRepo;
        prId = parseInt(prIdArg, 10);
    }
    else {
        prId = parseInt(prIdOrRepo, 10);
    }
    if (isNaN(prId)) {
        console.error("Error: Invalid PR ID. Usage: prbot review <prId> or prbot review <repo> <prId>");
        process.exit(1);
    }
    await (0, reviewer_js_1.runReview)(prId, repoOverride, opts.dryRun, opts.githubPr, opts.replace);
});
program
    .command("reset")
    .description("Reset configuration and state")
    .action(async () => {
    const config = (0, config_js_1.loadConfig)();
    (0, config_js_1.printHeader)(config);
    const { confirm } = await (0, prompts_1.default)({
        type: "confirm",
        name: "confirm",
        message: "Reset all config and state? This cannot be undone.",
        initial: false,
    });
    if (confirm) {
        const dir = (0, utils_js_1.getConfigDir)();
        const configPath = path.join(dir, "config.json");
        const statePath = path.join(dir, "state.json");
        if (fs.existsSync(configPath)) {
            fs.unlinkSync(configPath);
            console.log("Config deleted.");
        }
        if (fs.existsSync(statePath)) {
            fs.unlinkSync(statePath);
            console.log("State deleted.");
        }
        console.log("Reset complete.");
    }
    else {
        console.log("Cancelled.");
    }
});
program.parse();
//# sourceMappingURL=index.js.map