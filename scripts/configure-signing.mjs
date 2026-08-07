import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const GRADLE = join(root, "android", "app", "build.gradle");
const MARKER = "// >>> IBEMHAL_SIGNING";

const ok = (m) => console.log(`\u001b[32m✓ ${m}\u001b[0m`);
const warn = (m) => console.log(`\u001b[33m! ${m}\u001b[0m`);

if (!existsSync(GRADLE)) {
  warn("android/app/build.gradle not found — run `npx cap add android` first.");
  process.exit(0);
}

let gradle = readFileSync(GRADLE, "utf8");

if (gradle.includes(MARKER)) {
  ok("Signing config already present in build.gradle");
  process.exit(0);
}

/**
 * Reads credentials from (in order):
 *   1. android/keystore.properties
 *   2. environment variables (CI-friendly)
 * Falls back to the debug signing key so `assembleRelease` never hard-fails.
 */
const SIGNING_BLOCK = `${MARKER} — injected by scripts/configure-signing.mjs
    // Credentials resolve from android/keystore.properties or environment variables.
    // See SIGNING_INSTRUCTIONS.md. Never commit the keystore or its passwords.
    def keystorePropsFile = rootProject.file("keystore.properties")
    def keystoreProps = new Properties()
    def hasKeystoreFile = keystorePropsFile.exists()
    if (hasKeystoreFile) {
        keystoreProps.load(new FileInputStream(keystorePropsFile))
    }

    def resolveProp = { String fileKey, String envKey ->
        def fromFile = hasKeystoreFile ? keystoreProps[fileKey] : null
        return fromFile ?: System.getenv(envKey)
    }

    def ksStorePath = resolveProp("storeFile", "ANDROID_KEYSTORE_PATH")
    def ksStorePassword = resolveProp("storePassword", "ANDROID_KEYSTORE_PASSWORD")
    def ksKeyAlias = resolveProp("keyAlias", "ANDROID_KEY_ALIAS")
    def ksKeyPassword = resolveProp("keyPassword", "ANDROID_KEY_PASSWORD")

    def releaseSigningReady = ksStorePath != null && ksStorePassword != null &&
                              ksKeyAlias != null && ksKeyPassword != null &&
                              rootProject.file(ksStorePath).exists()

    signingConfigs {
        release {
            if (releaseSigningReady) {
                storeFile rootProject.file(ksStorePath)
                storePassword ksStorePassword
                keyAlias ksKeyAlias
                keyPassword ksKeyPassword
                v1SigningEnabled true
                v2SigningEnabled true
            }
        }
    }
${MARKER}_END
`;

const RELEASE_BUILD_TYPE = `        release {
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
            signingConfig releaseSigningReady ? signingConfigs.release : signingConfigs.debug
            if (!releaseSigningReady) {
                logger.warn("[Ibemhal] No release keystore found — signing with the DEBUG key. " +
                            "This build CANNOT be uploaded to Google Play. See SIGNING_INSTRUCTIONS.md")
            }
        }`;

// 1. Insert the signing block immediately after `android {`
gradle = gradle.replace(/android\s*\{/, (m) => `${m}\n    ${SIGNING_BLOCK}`);

// 2. Replace the stock release build type
const releaseRe = /( {8})release \{\s*\n\s*minifyEnabled false\s*\n\s*proguardFiles[^\n]*\n\s*\}/;
if (releaseRe.test(gradle)) {
  gradle = gradle.replace(releaseRe, RELEASE_BUILD_TYPE);
} else {
  warn("Could not match the default release buildType — verify build.gradle manually.");
}

// 3. Bundle config for .aab output
if (!gradle.includes("bundle {")) {
  gradle = gradle.replace(
    /buildTypes \{/,
    `bundle {
        language { enableSplit = true }
        density { enableSplit = true }
        abi { enableSplit = true }
    }

    buildTypes {`
  );
}

writeFileSync(GRADLE, gradle, "utf8");
ok("Injected release signingConfig + bundle settings into android/app/build.gradle");

// Ensure the keystore never reaches git
const gitignorePath = join(root, "android", ".gitignore");
const entries = ["keystore.properties", "*.jks", "*.keystore"];
let content = existsSync(gitignorePath) ? readFileSync(gitignorePath, "utf8") : "";
let changed = false;
for (const e of entries) {
  if (!content.includes(e)) {
    content += `${content.endsWith("\n") || !content ? "" : "\n"}${e}\n`;
    changed = true;
  }
}
if (changed) {
  writeFileSync(gitignorePath, content, "utf8");
  ok("Added keystore patterns to android/.gitignore");
}
