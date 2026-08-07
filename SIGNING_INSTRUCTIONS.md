# Google Play Store — Signing & Release Guide

**App:** Ibemhal IAS
**Package ID:** `com.ibemhal.ias.lms`

Google Play requires every uploaded artifact to be **digitally signed** with a key you own and keep forever. This guide takes you from zero to an uploadable `.aab`.

> ⚠️ **Critical:** If you lose `upload-keystore.jks` or its passwords you can **never** publish an update to this app under the same package name. Back it up in at least two secure locations (password manager + encrypted offline drive).

---

## Step 1 — Generate the upload keystore

Pick **one** of the two methods below. You only ever do this **once**.

### Option A — Command line (recommended)

`keytool` ships with the JDK. If it is not on your `PATH`, use the copy bundled with Android Studio:

```
C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe
```

Run from the project root:

**Windows (PowerShell)**
```powershell
& "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe" `
  -genkeypair -v `
  -keystore "D:\LMS IAS WEBSITE\android\upload-keystore.jks" `
  -alias ibemhal-upload `
  -keyalg RSA `
  -keysize 2048 `
  -validity 10000
```

**macOS / Linux**
```bash
keytool -genkeypair -v \
  -keystore android/upload-keystore.jks \
  -alias ibemhal-upload \
  -keyalg RSA -keysize 2048 -validity 10000
```

You will be prompted for:

| Prompt | Suggested answer |
|--------|------------------|
| Keystore password | A strong password — **save it** |
| Re-enter password | Same |
| First and last name (CN) | `Ibemhal IAS Academy` |
| Organizational unit (OU) | `Technology` |
| Organization (O) | `Ibemhal IAS Academy` |
| City (L) | `Imphal` |
| State (ST) | `Manipur` |
| Country code (C) | `IN` |
| Is this correct? | `yes` |
| Key password for `<ibemhal-upload>` | Press **Enter** to reuse the keystore password |

`-validity 10000` ≈ 27 years, comfortably above Google's requirement that the key stay valid past **22 October 2033**.

### Option B — Android Studio GUI

1. `npm run cap:open` (opens the `android/` project)
2. Menu → **Build → Generate Signed Bundle / APK…**
3. Choose **Android App Bundle** → **Next**
4. Click **Create new…** under *Key store path*
5. Fill in:
   - **Key store path:** `D:\LMS IAS WEBSITE\android\upload-keystore.jks`
   - **Password / Confirm:** your strong password
   - **Alias:** `ibemhal-upload`
   - **Validity (years):** `27`
   - **Certificate → First and Last Name:** `Ibemhal IAS Academy`
   - **Organization:** `Ibemhal IAS Academy`
   - **City:** `Imphal` · **State:** `Manipur` · **Country Code:** `IN`
6. **OK** → **Next** → select **release** → **Create**

---

## Step 2 — Register the credentials

Create **`android/keystore.properties`** (already git-ignored):

```properties
storeFile=upload-keystore.jks
storePassword=YOUR_KEYSTORE_PASSWORD
keyAlias=ibemhal-upload
keyPassword=YOUR_KEY_PASSWORD
```

`storeFile` is resolved **relative to the `android/` folder**, so `upload-keystore.jks` is correct when the file sits at `android/upload-keystore.jks`.

### CI / GitHub Actions alternative

Instead of the properties file, set these environment variables — the Gradle config reads them automatically:

```
ANDROID_KEYSTORE_PATH=upload-keystore.jks
ANDROID_KEYSTORE_PASSWORD=***
ANDROID_KEY_ALIAS=ibemhal-upload
ANDROID_KEY_PASSWORD=***
```

In GitHub Actions, store the keystore itself as a base64 secret and decode it during the job:

```yaml
- name: Restore keystore
  run: |
    echo "${{ secrets.ANDROID_KEYSTORE_BASE64 }}" | base64 -d > android/upload-keystore.jks
```

---

## Step 3 — Build the release artifacts

```bash
npm run build:apk:release
```

This single command:

1. Builds the Next.js static export (API routes temporarily stashed)
2. Mirrors the export to `out/` and runs `npx cap sync android`
3. Injects the signing config into `android/app/build.gradle` (idempotent)
4. Auto-detects your JDK and Android SDK
5. Runs `gradlew assembleRelease` → **APK**
6. Runs `gradlew bundleRelease` → **AAB**

**Outputs**

| Artifact | Path | Use |
|----------|------|-----|
| **AAB** | `android/app/build/outputs/bundle/release/app-release.aab` | ✅ **Upload this to Google Play** |
| APK | `android/app/build/outputs/apk/release/app-release.apk` | Direct install / sideload testing |

If no keystore is configured, the build still succeeds but is signed with the **debug** key and prints a loud warning. Play will reject that artifact.

---

## Step 4 — Verify the signature

```bash
# Confirm the certificate details
keytool -list -v -keystore android/upload-keystore.jks -alias ibemhal-upload

# Verify the APK signature (apksigner lives in the Android SDK build-tools)
"%LOCALAPPDATA%\Android\Sdk\build-tools\34.0.0\apksigner" verify --verbose ^
  android\app\build\outputs\apk\release\app-release.apk
```

A healthy result reports `Verified using v2 scheme (APK Signature Scheme v2): true`.

---

## Step 5 — Upload to Google Play Console

1. Go to <https://play.google.com/console> → **Create app**
   - App name: **Ibemhal IAS**
   - Default language: **English (India)**
   - Type: **App** · Free
2. **Release → Production → Create new release**
3. Keep **Play App Signing** enabled (Google re-signs with a key it escrows; your `upload-keystore.jks` remains your *upload* key)
4. Upload `app-release.aab`
5. Complete the mandatory sections:

| Section | Notes for this app |
|---------|--------------------|
| App access | Provide a demo student login if any content is behind auth |
| Content rating | Complete the questionnaire → expect **Everyone** |
| Target audience | 18+ (civil-services aspirants) |
| Data safety | Declare: email + name (account), study analytics. All encrypted in transit. |
| Privacy policy | Required — host at `https://ibemhal-ias-lms.vercel.app/privacy` |
| Ads | Declare "No ads" unless you add them |
| Store listing | Short + full description, 512×512 icon, feature graphic 1024×500, ≥2 phone screenshots |

Assets already generated for you:
- Icon 512×512 → `public/icons/icon-512.png`
- High-res 1024×1024 → `resources/icon.png`

---

## Step 6 — Shipping updates

Bump the version in **`android/app/build.gradle`** before every upload. Play rejects a duplicate `versionCode`.

```gradle
versionCode 2          // must strictly increase on every upload
versionName "1.1.0"    // user-visible string
```

Then re-run `npm run build:apk:release`.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `keytool is not recognized` | Use the full Android Studio JBR path shown in Step 1 |
| `Keystore was tampered with, or password was incorrect` | Wrong `storePassword` in `keystore.properties` |
| `SDK location not found` | Install the SDK via Android Studio; the build script writes `local.properties` automatically |
| `You uploaded an APK signed with a debug certificate` | `keystore.properties` missing or path wrong — check `storeFile` is relative to `android/` |
| `Version code 1 has already been used` | Increase `versionCode` (Step 6) |
| `Signing did not activate` | Delete `android/app/build.gradle`, run `npx cap add android`, then `node scripts/configure-signing.mjs` |

---

## Security checklist

- [ ] `upload-keystore.jks` backed up in **two** secure locations
- [ ] Passwords stored in a password manager
- [ ] `android/keystore.properties` **never** committed (already in `android/.gitignore`)
- [ ] `*.jks` / `*.keystore` / `*.apk` / `*.aab` in the root `.gitignore`
- [ ] CI secrets stored as encrypted repository secrets, never in plaintext workflow files
