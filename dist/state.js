"use strict";
/**
 * state.json handling - lastReviewedCommit per PR
 * Stored in config directory
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
exports.loadState = loadState;
exports.saveState = saveState;
exports.getLastReviewedCommit = getLastReviewedCommit;
exports.setLastReviewedCommit = setLastReviewedCommit;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_js_1 = require("./utils.js");
function getStatePath() {
    return path.join((0, utils_js_1.getConfigDir)(), "state.json");
}
function ensureConfigDir() {
    const dir = (0, utils_js_1.getConfigDir)();
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}
function loadState() {
    const statePath = getStatePath();
    if (!fs.existsSync(statePath)) {
        return {};
    }
    try {
        const raw = fs.readFileSync(statePath, "utf-8");
        return JSON.parse(raw);
    }
    catch {
        return {};
    }
}
function saveState(state) {
    ensureConfigDir();
    fs.writeFileSync(getStatePath(), JSON.stringify(state, null, 2), "utf-8");
}
function getLastReviewedCommit(repoId, prId) {
    const state = loadState();
    const key = `${repoId}:${prId}`;
    return state[key]?.lastReviewedHeadCommit;
}
function setLastReviewedCommit(repoId, prId, headCommit) {
    const state = loadState();
    const key = `${repoId}:${prId}`;
    state[key] = {
        prId,
        repoId,
        lastReviewedHeadCommit: headCommit,
        timestamp: new Date().toISOString(),
    };
    saveState(state);
}
//# sourceMappingURL=state.js.map