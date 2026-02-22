/**
 * AI provider registry - switch between Claude and Cursor
 */
import type { AiProvider, ReviewProvider } from "./types.js";
import { claudeProvider } from "./claude.js";
import { cursorProvider } from "./cursor.js";
import { openaiProvider } from "./openai.js";
export declare function getProvider(name: AiProvider): ReviewProvider;
export { claudeProvider, cursorProvider, openaiProvider };
export type { AiProvider, ReviewBundle, GenerateReviewResult, ReviewProvider } from "./types.js";
//# sourceMappingURL=index.d.ts.map