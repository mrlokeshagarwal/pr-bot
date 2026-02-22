"use strict";
/**
 * Platform registry - returns the appropriate client for the configured platform
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.bitbucketPlatform = exports.githubPlatform = exports.adoPlatform = void 0;
exports.getPlatform = getPlatform;
const ado_js_1 = require("./ado.js");
Object.defineProperty(exports, "adoPlatform", { enumerable: true, get: function () { return ado_js_1.adoPlatform; } });
const github_js_1 = require("./github.js");
Object.defineProperty(exports, "githubPlatform", { enumerable: true, get: function () { return github_js_1.githubPlatform; } });
const bitbucket_js_1 = require("./bitbucket.js");
Object.defineProperty(exports, "bitbucketPlatform", { enumerable: true, get: function () { return bitbucket_js_1.bitbucketPlatform; } });
const platforms = {
    ado: ado_js_1.adoPlatform,
    github: github_js_1.githubPlatform,
    bitbucket: bitbucket_js_1.bitbucketPlatform,
};
function getPlatform(config) {
    const platform = config.platform ?? "ado";
    const client = platforms[platform];
    if (!client) {
        throw new Error(`Unknown platform: ${platform}. Supported: ado, github, bitbucket`);
    }
    return client;
}
//# sourceMappingURL=index.js.map