import { execSync, spawnSync } from "node:child_process";
import { existsSync, cpSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(root, "out");
const CAP_DIST = join(root, ".next-static");
const ANDROID = join(root, "android");

const log = (m) => console.log(`\n\u001b[36m▶ ${m}\u001b[0m`);
const ok = (m) => console.log(`\u001b[32m✓ ${m}\u001b[0m`);
const warn = (m) => console.log(`\u001b[33m! ${m}\u001b[0m`);

function run(cmd, opts = {}) {
  execSync(cmd, { cwd: root, stdio: "inherit", ...opts });
}

function tryRun(cmd, opts = {}) {
  try {
    execSync(cmd, { cwd: root, stdio: "inherit", ...opts });
    return true;
  } catch {
    return false;
  }
}

// 1. Static export (API routes run on Vercel, stashed during export)
log("Building Next.js static export for Capacitor");
rmSync(CAP_DIST, { recursive: true, force: true });
rmSync(OUT, { recursive: true, force: true });

run("node scripts/prepare-static.mjs stash");
try {
  run("npx next build", { env: { ...process.env, BUILD_TARGET: "capacitor" } });
} finally {
  run("node scripts/prepare-static.mjs restore");
}

// Next writes the exported site into distDir; mirror it to /out for Capacitor webDir
if (existsSync(CAP_DIST)) {
  rmSync(OUT, { recursive: true, force: true });
  const nested = join(CAP_DIST, "out");
  cpSync(existsSync(nested) ? nested : CAP_DIST, OUT, { recursive: true });
}

if (!existsSync(join(OUT, "index.html"))) {
  throw new Error("Static export did not produce out/index.html. Check for dynamic server routes.");
}
ok("Static export ready at /out");

// 2. Ensure android platform
if (!existsSync(ANDROID)) {
  log("Adding Android platform");
  if (!tryRun("npx cap add android")) {
    warn("`cap add android` failed — creating platform on next sync");
  }
} else {
  ok("Android platform present");
}

// 3. Sync web assets + plugins
log("Syncing web assets into Android project");
run("npx cap sync android");
ok("Capacitor sync complete");

// 4. Gradle assembleDebug
const gradlew = process.platform === "win32" ? "gradlew.bat" : "./gradlew";
const gradlePath = join(ANDROID, process.platform === "win32" ? "gradlew.bat" : "gradlew");

if (!existsSync(gradlePath)) {
  warn("Gradle wrapper not found — Android platform incomplete.");
  process.exit(0);
}

// Locate a JDK: PATH → JAVA_HOME → Android Studio JBR
function findJdk() {
  if (!spawnSync("java", ["-version"], { stdio: "ignore" }).error) {
    return process.env.JAVA_HOME || "";
  }
  const candidates = [
    process.env.JAVA_HOME,
    "C:\\Program Files\\Android\\Android Studio\\jbr",
    join(process.env.LOCALAPPDATA ?? "", "Programs", "Android Studio", "jbr"),
    "C:\\Program Files\\Eclipse Adoptium\\jdk-17",
    "/usr/lib/jvm/java-17-openjdk-amd64",
  ].filter(Boolean);

  for (const c of candidates) {
    const bin = join(c, "bin", process.platform === "win32" ? "java.exe" : "java");
    if (existsSync(bin)) return c;
  }
  return null;
}

const jdkHome = findJdk();
if (jdkHome === null) {
  warn("No JDK found. Install JDK 17 (or Android Studio) and set JAVA_HOME, then rerun:");
  warn(`  cd android && ${gradlew} assembleDebug`);
  process.exit(0);
}

const gradleEnv = { ...process.env };
if (jdkHome) {
  gradleEnv.JAVA_HOME = jdkHome;
  gradleEnv.PATH = `${join(jdkHome, "bin")}${process.platform === "win32" ? ";" : ":"}${process.env.PATH}`;
  ok(`Using JDK: ${jdkHome}`);
}

// Ensure Android SDK location is discoverable
const sdkCandidates = [
  process.env.ANDROID_HOME,
  process.env.ANDROID_SDK_ROOT,
  join(process.env.LOCALAPPDATA ?? "", "Android", "Sdk"),
  join(process.env.HOME ?? "", "Android", "Sdk"),
].filter(Boolean);
const sdk = sdkCandidates.find((p) => existsSync(p));
if (sdk) {
  gradleEnv.ANDROID_HOME = sdk;
  gradleEnv.ANDROID_SDK_ROOT = sdk;
  writeFileSync(join(ANDROID, "local.properties"), `sdk.dir=${sdk.replace(/\\/g, "\\\\")}\n`);
  ok(`Using Android SDK: ${sdk}`);
} else {
  warn("Android SDK not found — Gradle may fail. Install via Android Studio SDK Manager.");
}

log("Compiling debug APK via Gradle");
const built = tryRun(`${gradlew} assembleDebug --no-daemon`, { cwd: ANDROID, env: gradleEnv });

const apk = join(ANDROID, "app", "build", "outputs", "apk", "debug", "app-debug.apk");
if (built && existsSync(apk)) {
  ok(`APK built: ${apk}`);
} else {
  warn("Gradle build did not complete. Ensure Android SDK + JDK 17 are installed.");
  warn(`Manual: cd android && ${gradlew} assembleDebug`);
}
