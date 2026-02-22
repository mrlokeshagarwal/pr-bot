/**
 * Platform registry - returns the appropriate client for the configured platform
 */
import type { AppConfig } from "../config.js";
import type { PlatformClient } from "./types.js";
import { adoPlatform } from "./ado.js";
import { githubPlatform } from "./github.js";
import { bitbucketPlatform } from "./bitbucket.js";
export declare function getPlatform(config: AppConfig): PlatformClient;
export { adoPlatform, githubPlatform, bitbucketPlatform };
export type { PlatformClient, PlatformType, PrInfo, PrThread, PrChange, PrIteration, InlineCommentContext } from "./types.js";
//# sourceMappingURL=index.d.ts.map