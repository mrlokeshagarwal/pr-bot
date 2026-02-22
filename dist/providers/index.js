"use strict";
/**
 * AI provider registry - switch between Claude and Cursor
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.openaiProvider = exports.cursorProvider = exports.claudeProvider = void 0;
exports.getProvider = getProvider;
const claude_js_1 = require("./claude.js");
Object.defineProperty(exports, "claudeProvider", { enumerable: true, get: function () { return claude_js_1.claudeProvider; } });
const cursor_js_1 = require("./cursor.js");
Object.defineProperty(exports, "cursorProvider", { enumerable: true, get: function () { return cursor_js_1.cursorProvider; } });
const openai_js_1 = require("./openai.js");
Object.defineProperty(exports, "openaiProvider", { enumerable: true, get: function () { return openai_js_1.openaiProvider; } });
const providers = {
    claude: claude_js_1.claudeProvider,
    cursor: cursor_js_1.cursorProvider,
    openai: openai_js_1.openaiProvider,
};
function getProvider(name) {
    const p = providers[name];
    if (!p) {
        throw new Error(`Unknown AI provider: ${name}. Use 'claude', 'cursor', or 'openai'.`);
    }
    return p;
}
//# sourceMappingURL=index.js.map