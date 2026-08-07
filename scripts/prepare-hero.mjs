import sharp from "sharp";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, mkdirSync, existsSync, writeFileSync } from "node:fs";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(root, "public", "hero");

/**
 * Source photos live OUTSIDE public/ so Windows' case-insensitive filesystem
 * cannot collide `public/Hero` with the generated `public/hero` route folder.
 * Drop new student photos into assets/hero-source/ and run `npm run hero`.
 */
const SRC_CANDIDATES = [
  join(root, "assets", "hero-source"),
  join(root, "public", "Hero"),
];
const SRC = SRC_CANDIDATES.find((p) => existsSync(p)) ?? SRC_CANDIDATES[0];

const ok = (m) => console.log(`\u001b[32m✓ ${m}\u001b[0m`);
const warn = (m) => console.log(`\u001b[33m! ${m}\u001b[0m`);
const log = (m) => console.log(`\u001b[36m▶ ${m}\u001b[0m`);

mkdirSync(OUT, { recursive: true });

if (!existsSync(SRC)) {
  warn("No source folder found. Create assets/hero-source/ and add photos.");
  process.exit(0);
}

const IMG = /\.(png|jpe?g|webp|avif)$/i;
const files = readdirSync(SRC).filter((f) => IMG.test(f));

if (!files.length) {
  warn(`No images found in ${SRC}.`);
  process.exit(0);
}

log(`Scanning ${files.length} file(s) in ${SRC.replace(root + "\\\\", "").replace(/\\\\/g, "/")}`);

// ---- Deduplicate by content hash -----------------------------------
const unique = [];
const seen = new Map();

for (const f of files.sort()) {
  const buf = readFileSync(join(SRC, f));
  const hash = createHash("md5").update(buf).digest("hex");
  if (seen.has(hash)) {
    warn(`${f} — duplicate of ${seen.get(hash)}, skipped`);
    continue;
  }
  seen.set(hash, f);
  unique.push({ file: f, buf });
}

ok(`${unique.length} unique image(s) after deduplication`);

// ---- Optimise ------------------------------------------------------
const manifest = [];

for (let i = 0; i < unique.length; i++) {
  const { file, buf } = unique[i];
  const meta = await sharp(buf).metadata();
  const aspect = meta.width / meta.height;
  const slug = `topper-${i + 1}`;

  // Cap the long edge at 1600px — plenty for a hero card, huge size win.
  const targetW = Math.min(meta.width, 1600);

  await sharp(buf)
    .resize(targetW, undefined, { withoutEnlargement: true })
    .webp({ quality: 86, effort: 5 })
    .toFile(join(OUT, `${slug}.webp`));

  await sharp(buf)
    .resize(Math.min(targetW, 1200), undefined, { withoutEnlargement: true })
    .jpeg({ quality: 84, progressive: true, mozjpeg: true })
    .toFile(join(OUT, `${slug}.jpg`));

  // Tiny blurred LQIP for instant paint
  const blurBuf = await sharp(buf).resize(20).blur(2).webp({ quality: 40 }).toBuffer();
  const blurDataURL = `data:image/webp;base64,${blurBuf.toString("base64")}`;

  const outMeta = await sharp(join(OUT, `${slug}.webp`)).metadata();
  const beforeKb = Math.round(buf.length / 1024);
  const afterKb = Math.round(readFileSync(join(OUT, `${slug}.webp`)).length / 1024);

  manifest.push({
    slug,
    src: `/hero/${slug}.webp`,
    fallback: `/hero/${slug}.jpg`,
    width: outMeta.width,
    height: outMeta.height,
    aspect: +aspect.toFixed(4),
    orientation: aspect > 1.35 ? "landscape" : aspect < 0.85 ? "portrait" : "square",
    blurDataURL,
    source: file,
  });

  ok(
    `${slug}.webp  ${outMeta.width}x${outMeta.height}  ` +
      `${beforeKb}KB → ${afterKb}KB (−${Math.round((1 - afterKb / beforeKb) * 100)}%)  [${file}]`
  );
}

writeFileSync(
  join(OUT, "manifest.json"),
  JSON.stringify({ generated: new Date().toISOString(), images: manifest }, null, 2)
);

ok(`Wrote public/hero/manifest.json (${manifest.length} image(s))`);

const landscape = manifest.filter((m) => m.orientation === "landscape").length;
if (landscape === manifest.length && manifest.length < 4) {
  console.log("");
  warn(
    `All ${manifest.length} image(s) are wide landscape banners. The hero renders them ` +
      `full-width with object-contain so nothing is stretched or face-cropped.`
  );
  warn(
    "To get the 4-card portrait gallery, drop 4 individual student photos into " +
      "public/Hero and re-run:  npm run hero"
  );
}
