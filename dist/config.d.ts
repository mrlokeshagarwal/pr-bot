/**
 * Configuration load/save and header display
 * Config stored at %APPDATA%/ado-pr-reviewer/config.json on Windows
 */
import type { AiProvider } from "./providers/types.js";
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
export declare function loadConfig(): AppConfig;
export declare function saveConfig(config: AppConfig): void;
export declare function printHeader(config: AppConfig): void;
export declare function printStatus(config: AppConfig): void;
//# sourceMappingURL=config.d.ts.map