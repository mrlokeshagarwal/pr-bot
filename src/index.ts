#!/usr/bin/env node
/**
 * prbot - Multi-platform PR Review Bot
 * Supports Azure DevOps and GitHub
 */

import { Command } from "commander";
import prompts from "prompts";
import * as fs from "fs";
import * as path from "path";
import { loadConfig, saveConfig, printHeader, printStatus } from "./config.js";
import { runReview } from "./reviewer.js";
import { getConfigDir, sanitizeSecret } from "./utils.js";

const program = new Command();

program
  .name("prbot")
  .description("Multi-platform PR Review Bot - AI-powered code review for Azure DevOps, GitHub, and Bitbucket")
  .version("1.0.0");

function ensureHeader(): void {
  const config = loadConfig();
  printHeader(config);
}

program
  .command("status")
  .description("Show current configuration and status")
  .action(() => {
    const config = loadConfig();
    printStatus(config);
  });

program
  .command("set")
  .description("Set configuration values")
  .argument("<key>", "platform | org | project | repo | standard | pat | github-token | bitbucket-token | provider | claude-key | cursor-key | openai-key | model | github-pr | maxissues | dryrun")
  .argument("[value]", "Value (for pat: paste token here if prompt paste fails)")
  .action(async (key: string, value: string) => {
    const config = loadConfig();
    printHeader(config);

    const dir = getConfigDir();
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    switch (key.toLowerCase()) {
      case "platform":
        if (value === "ado" || value === "github" || value === "bitbucket") {
          config.platform = value;
          saveConfig(config);
          console.log(`Platform set to ${value}.`);
        } else {
          console.error("Platform must be 'ado', 'github', or 'bitbucket'");
          process.exit(1);
        }
        break;
      case "org":
        config.orgUrl = value;
        saveConfig(config);
        console.log("Org URL set.");
        break;
      case "project":
        config.project = value;
        saveConfig(config);
        console.log("Project set.");
        break;
      case "repo":
        config.defaultRepo = value;
        saveConfig(config);
        console.log("Default repo set.");
        break;
      case "standard":
        config.codingStandardPath = value;
        if (!fs.existsSync(value)) {
          console.warn(`Warning: File not found: ${value}`);
        }
        saveConfig(config);
        console.log("Coding standard path set.");
        break;
      case "github-token": {
        let tokenInput: string;
        if (value) {
          tokenInput = value;
        } else {
          const result = await prompts({
            type: "password",
            name: "token",
            message: "Enter GitHub token (hidden):",
          });
          tokenInput = result.token;
        }
        const sanitizedToken = sanitizeSecret(tokenInput);
        if (sanitizedToken) {
          config.githubToken = sanitizedToken;
          saveConfig(config);
          console.log("GitHub token set.");
        } else {
          console.log("No token entered. Use: prbot set github-token YOUR_TOKEN");
        }
        break;
      }
      case "bitbucket-token": {
        let tokenInput: string;
        if (value) {
          tokenInput = value;
        } else {
          const result = await prompts({
            type: "password",
            name: "token",
            message: "Enter Bitbucket App Password (hidden):",
          });
          tokenInput = result.token;
        }
        const sanitizedToken = sanitizeSecret(tokenInput);
        if (sanitizedToken) {
          config.bitbucketToken = sanitizedToken;
          saveConfig(config);
          console.log("Bitbucket token set.");
        } else {
          console.log("No token entered. Use: prbot set bitbucket-token YOUR_TOKEN");
        }
        break;
      }
      case "pat": {
        let patInput: string;
        if (value) {
          patInput = value;
        } else {
          const result = await prompts({
            type: "password",
            name: "pat",
            message: "Enter Azure DevOps PAT (hidden):",
          });
          patInput = result.pat;
        }
        const sanitized = sanitizeSecret(patInput);
        if (sanitized) {
          config.pat = sanitized;
          saveConfig(config);
          console.log("PAT set.");
        } else {
          console.log("No PAT entered.");
          console.log("Tip: If paste fails in the prompt, use: prbot set pat YOUR_PAT");
          console.log("     (paste the token as the argument; avoid leaving it in shell history)");
        }
        break;
      }
      case "provider":
        if (value === "claude" || value === "cursor" || value === "openai") {
          config.aiProvider = value;
          saveConfig(config);
          console.log(`AI provider set to ${value}.`);
        } else {
          console.error("Provider must be 'claude', 'cursor', or 'openai'");
          process.exit(1);
        }
        break;
      case "claude-key":
      case "claudekey": {
        let apiKey: string;
        if (value) {
          apiKey = value;
        } else {
          const result = await prompts({
            type: "password",
            name: "key",
            message: "Enter Claude API key (hidden):",
          });
          apiKey = result.key;
        }
        const sanitized = sanitizeSecret(apiKey);
        if (sanitized) {
          config.claudeApiKey = sanitized;
          saveConfig(config);
          console.log("Claude API key set.");
        } else {
          console.log("No key entered. Use: prbot set claude-key YOUR_KEY");
        }
        break;
      }
      case "cursor-key": {
        let apiKey: string;
        if (value) {
          apiKey = value;
        } else {
          const result = await prompts({
            type: "password",
            name: "key",
            message: "Enter Cursor API key (hidden):",
          });
          apiKey = result.key;
        }
        const sanitized = sanitizeSecret(apiKey);
        if (sanitized) {
          config.cursorApiKey = sanitized;
          saveConfig(config);
          console.log("Cursor API key set.");
        } else {
          console.log("No key entered. Use: prbot set cursor-key YOUR_KEY");
        }
        break;
      }
      case "openai-key": {
        let apiKey: string;
        if (value) {
          apiKey = value;
        } else {
          const result = await prompts({
            type: "password",
            name: "key",
            message: "Enter OpenAI API key (hidden):",
          });
          apiKey = result.key;
        }
        const sanitized = sanitizeSecret(apiKey);
        if (sanitized) {
          config.openaiApiKey = sanitized;
          saveConfig(config);
          console.log("OpenAI API key set.");
        } else {
          console.log("No key entered. Use: prbot set openai-key YOUR_KEY");
        }
        break;
      }
      case "model":
        const p = config.aiProvider ?? "claude";
        if (p === "cursor") {
          config.cursorModel = value;
        } else if (p === "openai") {
          config.openaiModel = value;
        } else {
          config.claudeModel = value;
        }
        saveConfig(config);
        console.log("Model set.");
        break;
      case "github-pr":
        config.githubPrUrl = value;
        saveConfig(config);
        console.log("GitHub PR URL set (for Cursor provider).");
        break;
      case "maxissues":
        config.maxIssues = parseInt(value, 10);
        saveConfig(config);
        console.log("Max issues set.");
        break;
      case "dryrun":
        config.dryRun = value.toLowerCase() === "true" || value === "1";
        saveConfig(config);
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
  .action(async (prIdOrRepo: string, prIdArg: string | undefined, opts: { dryRun?: boolean; replace?: boolean; githubPr?: string }) => {
    let prId: number;
    let repoOverride: string | undefined;

    if (prIdArg !== undefined) {
      repoOverride = prIdOrRepo;
      prId = parseInt(prIdArg, 10);
    } else {
      prId = parseInt(prIdOrRepo, 10);
    }

    if (isNaN(prId)) {
      console.error("Error: Invalid PR ID. Usage: prbot review <prId> or prbot review <repo> <prId>");
      process.exit(1);
    }

    await runReview(prId, repoOverride, opts.dryRun, opts.githubPr, opts.replace);
  });

program
  .command("reset")
  .description("Reset configuration and state")
  .action(async () => {
    const config = loadConfig();
    printHeader(config);

    const { confirm } = await prompts({
      type: "confirm",
      name: "confirm",
      message: "Reset all config and state? This cannot be undone.",
      initial: false,
    });

    if (confirm) {
      const dir = getConfigDir();
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
    } else {
      console.log("Cancelled.");
    }
  });

program.parse();
