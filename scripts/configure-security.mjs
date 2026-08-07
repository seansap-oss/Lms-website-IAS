import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const PKG_PATH = join("com", "ibemhal", "ias", "lms");
const JAVA_DIR = join(root, "android", "app", "src", "main", "java", PKG_PATH);
const MAIN_ACTIVITY = join(JAVA_DIR, "MainActivity.java");
const MANIFEST = join(root, "android", "app", "src", "main", "AndroidManifest.xml");

const ok = (m) => console.log(`\u001b[32m✓ ${m}\u001b[0m`);
const warn = (m) => console.log(`\u001b[33m! ${m}\u001b[0m`);
const log = (m) => console.log(`\u001b[36m▶ ${m}\u001b[0m`);

if (!existsSync(join(root, "android"))) {
  warn("android/ not found — run `npx cap add android` first.");
  process.exit(0);
}

log("Applying native content-protection flags");

/* ------------------------------------------------------------------ */
/* 1. MainActivity — FLAG_SECURE                                       */
/* ------------------------------------------------------------------ */

const SECURE_ACTIVITY = `package com.ibemhal.ias.lms;

import android.os.Bundle;
import android.view.WindowManager;

import com.getcapacitor.BridgeActivity;

/**
 * Ibemhal IAS — secure host activity.
 *
 * FLAG_SECURE instructs the Android window manager to:
 *   • block screenshots (the shutter fails with "Couldn't capture screenshot")
 *   • render a black frame in screen recordings and casts
 *   • hide the app preview in the recent-apps switcher
 *
 * Managed by scripts/configure-security.mjs — re-applied automatically on
 * every \`npm run build:apk\`, so it survives \`npx cap add android\`.
 */
public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_SECURE,
            WindowManager.LayoutParams.FLAG_SECURE
        );
    }

    @Override
    public void onResume() {
        super.onResume();
        // Re-assert in case a plugin cleared the flag while backgrounded.
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_SECURE,
            WindowManager.LayoutParams.FLAG_SECURE
        );
    }
}
`;

mkdirSync(JAVA_DIR, { recursive: true });

const existing = existsSync(MAIN_ACTIVITY) ? readFileSync(MAIN_ACTIVITY, "utf8") : "";

if (existing.includes("FLAG_SECURE")) {
  ok("MainActivity already hardened with FLAG_SECURE");
} else {
  writeFileSync(MAIN_ACTIVITY, SECURE_ACTIVITY, "utf8");
  ok("MainActivity.java — FLAG_SECURE applied (screenshots + recording blocked)");
}

/* ------------------------------------------------------------------ */
/* 2. AndroidManifest — disable backup / cleartext, allow no extraction */
/* ------------------------------------------------------------------ */

if (existsSync(MANIFEST)) {
  let manifest = readFileSync(MANIFEST, "utf8");
  let changed = false;

  const ensureAttr = (attr, value) => {
    const re = new RegExp(`${attr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}="[^"]*"`);
    if (re.test(manifest)) {
      const next = manifest.replace(re, `${attr}="${value}"`);
      if (next !== manifest) {
        manifest = next;
        changed = true;
      }
    } else {
      const next = manifest.replace(
        /<application\b/,
        `<application\n        ${attr}="${value}"`
      );
      if (next !== manifest) {
        manifest = next;
        changed = true;
      }
    }
  };

  ensureAttr("android:allowBackup", "false");
  ensureAttr("android:fullBackupContent", "false");
  ensureAttr("android:usesCleartextTraffic", "false");

  if (changed) {
    writeFileSync(MANIFEST, manifest, "utf8");
    ok("AndroidManifest.xml — backup disabled, cleartext traffic blocked");
  } else {
    ok("AndroidManifest.xml already hardened");
  }
} else {
  warn("AndroidManifest.xml not found — skipped");
}

console.log("");
ok("Native content protection configured");
console.log("\u001b[90m  Screenshots, screen recording and app-switcher previews are blocked.\u001b[0m");
