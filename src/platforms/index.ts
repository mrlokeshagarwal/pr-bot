/**
 * Platform registry - returns the appropriate client for the configured platform
 */

import type { AppConfig } from "../config.js";
import type { PlatformClient, PlatformType } from "./types.js";
import { adoPlatform } from "./ado.js";
import { githubPlatform } from "./github.js";
import { bitbucketPlatform } from "./bitbucket.js";

const platforms: Record<PlatformType, PlatformClient> = {
  ado: adoPlatform,
  github: githubPlatform,
  bitbucket: bitbucketPlatform,
};

export function getPlatform(config: AppConfig): PlatformClient {
  const platform = config.platform ?? "ado";
  const client = platforms[platform];
  if (!client) {
    throw new Error(`Unknown platform: ${platform}. Supported: ado, github, bitbucket`);
  }
  return client;
}

export { adoPlatform, githubPlatform, bitbucketPlatform };
export type { PlatformClient, PlatformType, PrInfo, PrThread, PrChange, PrIteration, InlineCommentContext } from "./types.js";
