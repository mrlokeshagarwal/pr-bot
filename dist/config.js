"use strict";
/**
 * Configuration load/save and header display
 * Config stored at %APPDATA%/ado-pr-reviewer/config.json on Windows
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
exports.loadConfig = loadConfig;
exports.saveConfig = saveConfig;
exports.printHeader = printHeader;
exports.printStatus = printStatus;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_js_1 = require("./utils.js");
const DEFAULT_CONFIG = {
    platform: "ado",
    aiProvider: "claude",
    claudeModel: "claude-3-5-sonnet-latest",
    cursorModel: "claude-4-sonnet-thinking",
    openaiModel: "gpt-4o",
    maxIssues: 8,
    dryRun: false,
};
function getConfigPath() {
    return path.join((0, utils_js_1.getConfigDir)(), "config.json");
}
function ensureConfigDir() {
    const dir = (0, utils_js_1.getConfigDir)();
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}
function loadConfig() {
    const configPath = getConfigPath();
    if (!fs.existsSync(configPath)) {
        return { ...DEFAULT_CONFIG };
    }
    try {
        const raw = fs.readFileSync(configPath, "utf-8");
        const parsed = JSON.parse(raw);
        const config = { ...DEFAULT_CONFIG, ...parsed };
        if (config.pat)
            config.pat = (0, utils_js_1.sanitizeSecret)(config.pat);
        if (config.githubToken)
            config.githubToken = (0, utils_js_1.sanitizeSecret)(config.githubToken);
        if (config.bitbucketToken)
            config.bitbucketToken = (0, utils_js_1.sanitizeSecret)(config.bitbucketToken);
        if (config.claudeApiKey)
            config.claudeApiKey = (0, utils_js_1.sanitizeSecret)(config.claudeApiKey);
        if (config.cursorApiKey)
            config.cursorApiKey = (0, utils_js_1.sanitizeSecret)(config.cursorApiKey);
        if (config.openaiApiKey)
            config.openaiApiKey = (0, utils_js_1.sanitizeSecret)(config.openaiApiKey);
        return config;
    }
    catch (e) {
        console.error("Failed to load config:", e.message);
        return { ...DEFAULT_CONFIG };
    }
}
function saveConfig(config) {
    ensureConfigDir();
    const configPath = getConfigPath();
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");
}
function printHeader(config) {
    const platform = config.platform ?? "ado";
    const org = config.orgUrl ?? "(not set)";
    const project = config.project ?? "(not set)";
    const repo = config.defaultRepo ?? "(not set)";
    const standard = config.codingStandardPath ?? "(not set)";
    const provider = config.aiProvider ?? "claude";
    const hasKey = provider === "claude"
        ? !!(config.claudeApiKey && config.claudeApiKey.length > 0)
        : provider === "cursor"
            ? !!(config.cursorApiKey && config.cursorApiKey.length > 0)
            : !!(config.openaiApiKey && config.openaiApiKey.length > 0);
    const model = provider === "claude"
        ? (config.claudeModel ?? "claude-3-5-sonnet-latest")
        : provider === "cursor"
            ? (config.cursorModel ?? "claude-4-sonnet-thinking")
            : (config.openaiModel ?? "gpt-4o");
    const aiStatus = hasKey ? `enabled (${provider}, model: ${model})` : "disabled";
    const dryRun = config.dryRun ?? false;
    console.log("PR Reviewer");
    console.log("Platform:", platform);
    console.log("Org:     ", org);
    console.log("Project: ", project);
    console.log("Repo:    ", repo);
    console.log("Standard:", standard);
    console.log("AI:      ", aiStatus);
    console.log("DryRun:  ", dryRun);
    console.log();
}
function printStatus(config) {
    printHeader(config);
    console.log("Secrets (redacted):");
    console.log("  PAT:         ", (0, utils_js_1.redactSecret)(config.pat));
    console.log("  GitHub Token:   ", (0, utils_js_1.redactSecret)(config.githubToken));
    console.log("  Bitbucket Token:", (0, utils_js_1.redactSecret)(config.bitbucketToken));
    console.log("  Claude Key:  ", (0, utils_js_1.redactSecret)(config.claudeApiKey));
    console.log("  Cursor Key:  ", (0, utils_js_1.redactSecret)(config.cursorApiKey));
    console.log("  OpenAI Key:  ", (0, utils_js_1.redactSecret)(config.openaiApiKey));
    if (config.aiProvider === "cursor" && config.githubPrUrl) {
        console.log("  GitHub PR:   ", config.githubPrUrl);
    }
}
//# sourceMappingURL=config.js.map