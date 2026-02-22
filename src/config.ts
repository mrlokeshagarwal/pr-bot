/**
 * Configuration load/save and header display
 * Config stored at %APPDATA%/ado-pr-reviewer/config.json on Windows
 */

import * as fs from "fs";
import * as path from "path";
import type { AiProvider } from "./providers/types.js";
import { getConfigDir, redactSecret, sanitizeSecret } from "./utils.js";

export interface AppConfig {
  /** Platform: ado (default), github, or bitbucket */
  platform?: "ado" | "github" | "bitbucket";
  /** Azure DevOps */
  orgUrl?: string;
  project?: string;
  pat?: string;
  /** GitHub - token for API auth */
  githubToken?: string;
  /** Bitbucket - App Password or token for API auth */
  bitbucketToken?: string;
  /** Repo: for ADO = repo name/id, for GitHub/Bitbucket = owner/repo or workspace/repo */
  defaultRepo?: string;
  codingStandardPath?: string;
  /** AI provider: claude (default), cursor, or openai */
  aiProvider?: AiProvider;
  claudeApiKey?: string;
  claudeModel?: string;
  cursorApiKey?: string;
  cursorModel?: string;
  openaiApiKey?: string;
  openaiModel?: string;
  /** GitHub PR URL - required when aiProvider is cursor */
  githubPrUrl?: string;
  maxIssues?: number;
  dryRun?: boolean;
}

const DEFAULT_CONFIG: Partial<AppConfig> = {
  platform: "ado",
  aiProvider: "claude",
  claudeModel: "claude-3-5-sonnet-latest",
  cursorModel: "claude-4-sonnet-thinking",
  openaiModel: "gpt-4o",
  maxIssues: 8,
  dryRun: false,
};

function getConfigPath(): string {
  return path.join(getConfigDir(), "config.json");
}

function ensureConfigDir(): void {
  const dir = getConfigDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function loadConfig(): AppConfig {
  const configPath = getConfigPath();
  if (!fs.existsSync(configPath)) {
    return { ...DEFAULT_CONFIG } as AppConfig;
  }
  try {
    const raw = fs.readFileSync(configPath, "utf-8");
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const config = { ...DEFAULT_CONFIG, ...parsed } as AppConfig;
    if (config.pat) config.pat = sanitizeSecret(config.pat);
    if (config.githubToken) config.githubToken = sanitizeSecret(config.githubToken);
    if (config.bitbucketToken) config.bitbucketToken = sanitizeSecret(config.bitbucketToken);
    if (config.claudeApiKey) config.claudeApiKey = sanitizeSecret(config.claudeApiKey);
    if (config.cursorApiKey) config.cursorApiKey = sanitizeSecret(config.cursorApiKey);
    if (config.openaiApiKey) config.openaiApiKey = sanitizeSecret(config.openaiApiKey);
    return config;
  } catch (e) {
    console.error("Failed to load config:", (e as Error).message);
    return { ...DEFAULT_CONFIG } as AppConfig;
  }
}

export function saveConfig(config: AppConfig): void {
  ensureConfigDir();
  const configPath = getConfigPath();
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");
}

export function printHeader(config: AppConfig): void {
  const platform = config.platform ?? "ado";
  const org = config.orgUrl ?? "(not set)";
  const project = config.project ?? "(not set)";
  const repo = config.defaultRepo ?? "(not set)";
  const standard = config.codingStandardPath ?? "(not set)";
  const provider = config.aiProvider ?? "claude";
  const hasKey =
    provider === "claude"
      ? !!(config.claudeApiKey && config.claudeApiKey.length > 0)
      : provider === "cursor"
        ? !!(config.cursorApiKey && config.cursorApiKey.length > 0)
        : !!(config.openaiApiKey && config.openaiApiKey.length > 0);
  const model =
    provider === "claude"
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

export function printStatus(config: AppConfig): void {
  printHeader(config);
  console.log("Secrets (redacted):");
  console.log("  PAT:         ", redactSecret(config.pat));
  console.log("  GitHub Token:   ", redactSecret(config.githubToken));
  console.log("  Bitbucket Token:", redactSecret(config.bitbucketToken));
  console.log("  Claude Key:  ", redactSecret(config.claudeApiKey));
  console.log("  Cursor Key:  ", redactSecret(config.cursorApiKey));
  console.log("  OpenAI Key:  ", redactSecret(config.openaiApiKey));
  if (config.aiProvider === "cursor" && config.githubPrUrl) {
    console.log("  GitHub PR:   ", config.githubPrUrl);
  }
}
