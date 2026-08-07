import sharp from "sharp";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const iconsDir = join(root, "public", "icons");
const splashDir = join(root, "public", "splash");
const resDir = join(root, "resources");

mkdirSync(iconsDir, { recursive: true });
mkdirSync(splashDir, { recursive: true });
mkdirSync(resDir, { recursive: true });

const NAVY = "#0f172a";
const BLUE = "#1e3a8a";

function logoSvg(size, { maskable = false } = {}) {
  const pad = maskable ? size * 0.16 : size * 0.08;
  const inner = size - pad * 2;
  const r = maskable ? 0 : size * 0.22;
  const fs = inner * 0.46;
  const sub = inner * 0.13;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1e3a8a"/>
      <stop offset="55%" stop-color="#3b82f6"/>
      <stop offset="100%" stop-color="#6366f1"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${r}" fill="${NAVY}"/>
  <rect x="${pad}" y="${pad}" width="${inner}" height="${inner}" rx="${maskable ? inner * 0.18 : inner * 0.2}" fill="url(#g)"/>
  <text x="50%" y="${size * 0.53}" font-family="Georgia,'Times New Roman',serif" font-size="${fs}" font-weight="700" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">II</text>
  <text x="50%" y="${size * 0.735}" font-family="Arial,Helvetica,sans-serif" font-size="${sub}" font-weight="600" letter-spacing="${sub * 0.18}" fill="#dbeafe" text-anchor="middle">IAS</text>
</svg>`;
}

function splashSvg(w, h) {
  const s = Math.min(w, h) * 0.28;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="60%" stop-color="#172554"/>
      <stop offset="100%" stop-color="#1e1b4b"/>
    </linearGradient>
    <linearGradient id="badge" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1e3a8a"/>
      <stop offset="100%" stop-color="#6366f1"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)"/>
  <rect x="${(w - s) / 2}" y="${h / 2 - s * 0.72}" width="${s}" height="${s}" rx="${s * 0.22}" fill="url(#badge)"/>
  <text x="50%" y="${h / 2 - s * 0.19}" font-family="Georgia,serif" font-size="${s * 0.42}" font-weight="700" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">II</text>
  <text x="50%" y="${h / 2 + s * 0.62}" font-family="Arial,Helvetica,sans-serif" font-size="${Math.min(w, h) * 0.062}" font-weight="700" letter-spacing="1.5" fill="#ffffff" text-anchor="middle">IBEMHAL IAS</text>
  <text x="50%" y="${h / 2 + s * 0.92}" font-family="Arial,Helvetica,sans-serif" font-size="${Math.min(w, h) * 0.032}" letter-spacing="3" fill="#93c5fd" text-anchor="middle">CIVIL SERVICES ACADEMY</text>
</svg>`;
}

const iconSizes = [72, 96, 128, 144, 152, 180, 192, 256, 384, 512, 1024];

for (const size of iconSizes) {
  await sharp(Buffer.from(logoSvg(size))).png().toFile(join(iconsDir, `icon-${size}.png`));
}
for (const size of [192, 512, 1024]) {
  await sharp(Buffer.from(logoSvg(size, { maskable: true })))
    .png()
    .toFile(join(iconsDir, `icon-maskable-${size}.png`));
}

await sharp(Buffer.from(logoSvg(180))).png().toFile(join(root, "public", "apple-touch-icon.png"));
await sharp(Buffer.from(logoSvg(32))).png().toFile(join(root, "public", "favicon-32.png"));
await sharp(Buffer.from(logoSvg(1024))).png().toFile(join(resDir, "icon.png"));
await sharp(Buffer.from(splashSvg(2732, 2732))).png().toFile(join(resDir, "splash.png"));

const iosSplashes = [
  [1170, 2532], [1179, 2556], [1290, 2796], [1284, 2778],
  [1125, 2436], [1242, 2688], [828, 1792], [750, 1334],
  [1536, 2048], [1668, 2388], [2048, 2732],
];

for (const [w, h] of iosSplashes) {
  await sharp(Buffer.from(splashSvg(w, h))).png().toFile(join(splashDir, `splash-${w}x${h}.png`));
}

writeFileSync(
  join(root, "public", "browserconfig.xml"),
  `<?xml version="1.0" encoding="utf-8"?>
<browserconfig><msapplication><tile>
<square150x150logo src="/icons/icon-152.png"/>
<TileColor>${BLUE}</TileColor>
</tile></msapplication></browserconfig>`
);

console.log(`Generated ${iconSizes.length + 3} icons, ${iosSplashes.length} iOS splashes, Capacitor resources.`);
