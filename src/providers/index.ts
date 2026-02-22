/**
 * AI provider registry - switch between Claude and Cursor
 */

import type { AiProvider, ReviewProvider } from "./types.js";
import { claudeProvider } from "./claude.js";
import { cursorProvider } from "./cursor.js";
import { openaiProvider } from "./openai.js";

const providers: Record<AiProvider, ReviewProvider> = {
  claude: claudeProvider,
  cursor: cursorProvider,
  openai: openaiProvider,
};

export function getProvider(name: AiProvider): ReviewProvider {
  const p = providers[name];
  if (!p) {
    throw new Error(`Unknown AI provider: ${name}. Use 'claude', 'cursor', or 'openai'.`);
  }
  return p;
}

export { claudeProvider, cursorProvider, openaiProvider };
export type { AiProvider, ReviewBundle, GenerateReviewResult, ReviewProvider } from "./types.js";
