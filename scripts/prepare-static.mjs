import { cpSync, existsSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const API_DIR = join(root, "app", "api");
const STASH = join(root, ".api-stash");

const mode = process.argv[2];

function rmRetry(target, attempts = 8) {
  for (let i = 0; i < attempts; i++) {
    try {
      rmSync(target, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
      if (!existsSync(target)) return true;
    } catch {
      // retry
    }
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 250);
  }
  return !existsSync(target);
}

if (mode === "stash") {
  if (existsSync(API_DIR)) {
    rmRetry(STASH);
    cpSync(API_DIR, STASH, { recursive: true });
    if (!rmRetry(API_DIR)) {
      console.error("Could not remove app/api — close editors/OneDrive sync and retry.");
      process.exit(1);
    }
    console.log("API routes stashed for static export");
  } else {
    console.log("No app/api directory — nothing to stash");
  }
} else if (mode === "restore") {
  if (existsSync(STASH)) {
    rmRetry(API_DIR);
    cpSync(STASH, API_DIR, { recursive: true });
    rmRetry(STASH);
    console.log("API routes restored");
  } else {
    console.log("No stash present — nothing to restore");
  }
} else {
  console.error("Usage: node scripts/prepare-static.mjs <stash|restore>");
  process.exit(1);
}
