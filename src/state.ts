/**
 * state.json handling - lastReviewedCommit per PR
 * Stored in config directory
 */

import * as fs from "fs";
import * as path from "path";
import { getConfigDir } from "./utils.js";

export interface StateEntry {
  prId: number;
  repoId: string;
  lastReviewedHeadCommit: string;
  timestamp: string;
}

export interface AppState {
  [key: string]: StateEntry; // key: "repoId:prId"
}

function getStatePath(): string {
  return path.join(getConfigDir(), "state.json");
}

function ensureConfigDir(): void {
  const dir = getConfigDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function loadState(): AppState {
  const statePath = getStatePath();
  if (!fs.existsSync(statePath)) {
    return {};
  }
  try {
    const raw = fs.readFileSync(statePath, "utf-8");
    return JSON.parse(raw) as AppState;
  } catch {
    return {};
  }
}

export function saveState(state: AppState): void {
  ensureConfigDir();
  fs.writeFileSync(getStatePath(), JSON.stringify(state, null, 2), "utf-8");
}

export function getLastReviewedCommit(repoId: string, prId: number): string | undefined {
  const state = loadState();
  const key = `${repoId}:${prId}`;
  return state[key]?.lastReviewedHeadCommit;
}

export function setLastReviewedCommit(repoId: string, prId: number, headCommit: string): void {
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
