import { execSync, spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ENV_FILE = join(root, ".env.local");

const log = (m) => console.log(`\n\u001b[36m▶ ${m}\u001b[0m`);
const ok = (m) => console.log(`\u001b[32m✓ ${m}\u001b[0m`);
const warn = (m) => console.log(`\u001b[33m! ${m}\u001b[0m`);
const dim = (m) => console.log(`\u001b[90m  ${m}\u001b[0m`);

const PROJECT_REF = "nhjhnevxyynllomfmyxp";

/** name → { envs, secret, hint } */
const VARS = {
  NEXT_PUBLIC_SUPABASE_URL: {
    envs: ["production", "preview", "development"],
    secret: false,
    hint: `https://${PROJECT_REF}.supabase.co`,
  },
  NEXT_PUBLIC_API_BASE_URL: {
    envs: ["production"],
    secret: false,
    hint: "https://ibemhal-ias-lms.vercel.app",
  },
  NEXT_PUBLIC_SUPABASE_ANON_KEY: {
    envs: ["production", "preview", "development"],
    secret: true,
    hint: "Dashboard → Project Settings → API → anon / public",
  },
  SUPABASE_SERVICE_ROLE_KEY: {
    envs: ["production"],
    secret: true,
    hint: "Dashboard → Project Settings → API → service_role (SERVER ONLY)",
  },
  ANTHROPIC_API_KEY: { envs: ["production"], secret: true, optional: true, hint: "AI Tier 1" },
  OPENAI_API_KEY: { envs: ["production"], secret: true, optional: true, hint: "AI Tier 2" },
  GOOGLE_API_KEY: { envs: ["production"], secret: true, optional: true, hint: "AI Tier 3" },
  DEEPSEEK_API_KEY: { envs: ["production"], secret: true, optional: true, hint: "AI Tier 4" },
  GROQ_API_KEY: { envs: ["production"], secret: true, optional: true, hint: "AI Tier 5" },
  MUX_TOKEN_ID: { envs: ["production"], secret: true, optional: true, hint: "Mux video" },
  MUX_TOKEN_SECRET: { envs: ["production"], secret: true, optional: true, hint: "Mux video" },
};

function parseEnvFile() {
  if (!existsSync(ENV_FILE)) return {};
  const out = {};
  for (const line of readFileSync(ENV_FILE, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (value) out[key] = value;
  }
  return out;
}

function listRemote() {
  try {
    const raw = execSync("vercel env ls", { cwd: root, encoding: "utf8", stdio: "pipe" });
    const found = new Set();
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s+/);
      if (m) found.add(m[1]);
    }
    return found;
  } catch {
    return new Set();
  }
}

function pushVar(name, value, env) {
  const res = spawnSync("vercel", ["env", "add", name, env], {
    cwd: root,
    input: `${value}\n`,
    encoding: "utf8",
    shell: true,
  });
  return res.status === 0;
}

const local = parseEnvFile();
const remote = listRemote();

log(`Syncing Vercel environment — Supabase project ${PROJECT_REF}`);

const missing = [];
let pushed = 0;

for (const [name, cfg] of Object.entries(VARS)) {
  const value = local[name];

  if (!value) {
    if (!cfg.optional) missing.push({ name, hint: cfg.hint });
    continue;
  }

  if (remote.has(name)) {
    dim(`${name} — already set on Vercel, skipping (use \`vercel env rm\` to replace)`);
    continue;
  }

  for (const env of cfg.envs) {
    if (pushVar(name, value, env)) {
      ok(`${name} → ${env}`);
      pushed++;
    } else {
      warn(`${name} → ${env} failed`);
    }
  }
}

console.log("");
if (pushed) ok(`${pushed} variable binding(s) pushed`);

if (missing.length) {
  warn(`${missing.length} required variable(s) not found in .env.local:`);
  for (const m of missing) dim(`${m.name.padEnd(32)} ${m.hint}`);
  console.log("");
  dim("Fill them in .env.local, then re-run:  npm run env:sync");
  dim(`Keys: https://supabase.com/dashboard/project/${PROJECT_REF}/settings/api`);
} else {
  ok("All required variables are configured.");
  dim("Redeploy to apply:  vercel --prod --yes");
}
