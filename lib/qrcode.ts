/**
 * Minimal QR Code encoder (ISO/IEC 18004) — byte mode, error correction level M.
 * Zero dependencies. Supports versions 1-15 (up to 535 bytes) which comfortably
 * covers any UPI payment string.
 */

const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);

(function initGaloisField() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) GF_EXP[i] = GF_EXP[i - 255];
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function generatorPoly(degree: number): Uint8Array {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < degree; i++) {
    const next = new Uint8Array(poly.length + 1);
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMul(poly[j], GF_EXP[i]);
    }
    poly = next;
  }
  return poly;
}

function reedSolomon(data: Uint8Array, ecLen: number): Uint8Array {
  const gen = generatorPoly(ecLen);
  const res = new Uint8Array(data.length + ecLen);
  res.set(data);
  for (let i = 0; i < data.length; i++) {
    const coef = res[i];
    if (coef === 0) continue;
    for (let j = 0; j < gen.length; j++) {
      res[i + j] ^= gfMul(gen[j], coef);
    }
  }
  return res.slice(data.length);
}

/** [version] → { totalCodewords, ecPerBlock, group1Blocks, group1Data, group2Blocks, group2Data } for ECC level M */
const VERSION_SPEC: Record<
  number,
  { ec: number; g1b: number; g1d: number; g2b: number; g2d: number }
> = {
  1: { ec: 10, g1b: 1, g1d: 16, g2b: 0, g2d: 0 },
  2: { ec: 16, g1b: 1, g1d: 28, g2b: 0, g2d: 0 },
  3: { ec: 26, g1b: 1, g1d: 44, g2b: 0, g2d: 0 },
  4: { ec: 18, g1b: 2, g1d: 32, g2b: 0, g2d: 0 },
  5: { ec: 24, g1b: 2, g1d: 43, g2b: 0, g2d: 0 },
  6: { ec: 16, g1b: 4, g1d: 27, g2b: 0, g2d: 0 },
  7: { ec: 18, g1b: 4, g1d: 31, g2b: 0, g2d: 0 },
  8: { ec: 22, g1b: 2, g1d: 38, g2b: 2, g2d: 39 },
  9: { ec: 22, g1b: 3, g1d: 36, g2b: 2, g2d: 37 },
  10: { ec: 26, g1b: 4, g1d: 43, g2b: 1, g2d: 44 },
  11: { ec: 30, g1b: 1, g1d: 50, g2b: 4, g2d: 51 },
  12: { ec: 22, g1b: 6, g1d: 36, g2b: 2, g2d: 37 },
  13: { ec: 22, g1b: 8, g1d: 37, g2b: 1, g2d: 38 },
  14: { ec: 24, g1b: 4, g1d: 40, g2b: 5, g2d: 41 },
  15: { ec: 24, g1b: 5, g1d: 41, g2b: 5, g2d: 42 },
};

const ALIGNMENT_CENTERS: Record<number, number[]> = {
  1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30], 6: [6, 34],
  7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50],
  11: [6, 30, 54], 12: [6, 32, 58], 13: [6, 34, 62], 14: [6, 26, 46, 66],
  15: [6, 26, 48, 70],
};

function dataCapacity(v: number): number {
  const s = VERSION_SPEC[v];
  return s.g1b * s.g1d + s.g2b * s.g2d;
}

function pickVersion(byteLen: number): number {
  for (let v = 1; v <= 15; v++) {
    const capBits = dataCapacity(v) * 8;
    const lenBits = v < 10 ? 8 : 16;
    if (4 + lenBits + byteLen * 8 <= capBits) return v;
  }
  throw new Error("QR payload too large (max 535 bytes)");
}

class BitBuffer {
  bits: number[] = [];
  put(value: number, length: number) {
    for (let i = length - 1; i >= 0; i--) this.bits.push((value >>> i) & 1);
  }
  get length() {
    return this.bits.length;
  }
}

function encodeData(text: string, version: number): Uint8Array {
  const bytes = new TextEncoder().encode(text);
  const spec = VERSION_SPEC[version];
  const totalData = dataCapacity(version);

  const bb = new BitBuffer();
  bb.put(0b0100, 4); // byte mode
  bb.put(bytes.length, version < 10 ? 8 : 16);
  for (const b of bytes) bb.put(b, 8);

  const capBits = totalData * 8;
  const terminator = Math.min(4, capBits - bb.length);
  bb.put(0, terminator);
  while (bb.length % 8 !== 0) bb.bits.push(0);

  const dataCodewords: number[] = [];
  for (let i = 0; i < bb.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) byte = (byte << 1) | bb.bits[i + j];
    dataCodewords.push(byte);
  }

  const PAD = [0xec, 0x11];
  let p = 0;
  while (dataCodewords.length < totalData) dataCodewords.push(PAD[p++ % 2]);

  // Split into blocks
  const blocks: Uint8Array[] = [];
  const ecBlocks: Uint8Array[] = [];
  let offset = 0;

  for (let i = 0; i < spec.g1b; i++) {
    const blk = new Uint8Array(dataCodewords.slice(offset, offset + spec.g1d));
    offset += spec.g1d;
    blocks.push(blk);
    ecBlocks.push(reedSolomon(blk, spec.ec));
  }
  for (let i = 0; i < spec.g2b; i++) {
    const blk = new Uint8Array(dataCodewords.slice(offset, offset + spec.g2d));
    offset += spec.g2d;
    blocks.push(blk);
    ecBlocks.push(reedSolomon(blk, spec.ec));
  }

  // Interleave
  const out: number[] = [];
  const maxData = Math.max(spec.g1d, spec.g2d);
  for (let i = 0; i < maxData; i++) {
    for (const blk of blocks) if (i < blk.length) out.push(blk[i]);
  }
  for (let i = 0; i < spec.ec; i++) {
    for (const blk of ecBlocks) if (i < blk.length) out.push(blk[i]);
  }

  return new Uint8Array(out);
}

type Grid = (0 | 1 | null)[][];

function buildMatrix(version: number, codewords: Uint8Array, mask: number): Grid {
  const size = version * 4 + 17;
  const m: Grid = Array.from({ length: size }, () => Array<0 | 1 | null>(size).fill(null));
  const reserved: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  const setFn = (r: number, c: number, v: 0 | 1) => {
    if (r >= 0 && r < size && c >= 0 && c < size) {
      m[r][c] = v;
      reserved[r][c] = true;
    }
  };

  // Finder patterns + separators
  const finder = (row: number, col: number) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const rr = row + r;
        const cc = col + c;
        if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue;
        const inRing =
          (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
          (c >= 0 && c <= 6 && (r === 0 || r === 6)) ||
          (r >= 2 && r <= 4 && c >= 2 && c <= 4);
        setFn(rr, cc, inRing ? 1 : 0);
      }
    }
  };
  finder(0, 0);
  finder(0, size - 7);
  finder(size - 7, 0);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    setFn(6, i, i % 2 === 0 ? 1 : 0);
    setFn(i, 6, i % 2 === 0 ? 1 : 0);
  }

  // Alignment patterns
  const centers = ALIGNMENT_CENTERS[version] ?? [];
  for (const r of centers) {
    for (const c of centers) {
      if ((r <= 7 && c <= 7) || (r <= 7 && c >= size - 8) || (r >= size - 8 && c <= 7)) continue;
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const ring = Math.max(Math.abs(dr), Math.abs(dc));
          setFn(r + dr, c + dc, ring === 1 ? 0 : 1);
        }
      }
    }
  }

  // Dark module
  setFn(size - 8, 8, 1);

  // Reserve format-info areas
  for (let i = 0; i < 9; i++) {
    if (m[8][i] === null) reserved[8][i] = true;
    if (m[i][8] === null) reserved[i][8] = true;
  }
  for (let i = 0; i < 8; i++) {
    reserved[8][size - 1 - i] = true;
    reserved[size - 1 - i][8] = true;
  }

  // Reserve version info (v >= 7)
  if (version >= 7) {
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 3; j++) {
        reserved[i][size - 11 + j] = true;
        reserved[size - 11 + j][i] = true;
      }
    }
  }

  // Place data with zigzag traversal
  const maskFn = (r: number, c: number): boolean => {
    switch (mask) {
      case 0: return (r + c) % 2 === 0;
      case 1: return r % 2 === 0;
      case 2: return c % 3 === 0;
      case 3: return (r + c) % 3 === 0;
      case 4: return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
      case 5: return ((r * c) % 2) + ((r * c) % 3) === 0;
      case 6: return (((r * c) % 2) + ((r * c) % 3)) % 2 === 0;
      default: return (((r + c) % 2) + ((r * c) % 3)) % 2 === 0;
    }
  };

  let bitIdx = 0;
  const totalBits = codewords.length * 8;
  let upward = true;

  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col = 5;
    for (let i = 0; i < size; i++) {
      const row = upward ? size - 1 - i : i;
      for (let k = 0; k < 2; k++) {
        const c = col - k;
        if (reserved[row][c]) continue;
        let bit: 0 | 1 = 0;
        if (bitIdx < totalBits) {
          bit = ((codewords[bitIdx >> 3] >> (7 - (bitIdx & 7))) & 1) as 0 | 1;
          bitIdx++;
        }
        m[row][c] = (maskFn(row, c) ? bit ^ 1 : bit) as 0 | 1;
      }
    }
    upward = !upward;
  }

  // Format information (ECC level M = 0b00)
  const formatBits = ((0b00 << 3) | mask) << 10;
  let rem = formatBits;
  for (let i = 14; i >= 10; i--) {
    if ((rem >> i) & 1) rem ^= 0b10100110111 << (i - 10);
  }
  const format = (((0b00 << 3) | mask) << 10 | rem) ^ 0b101010000010010;

  for (let i = 0; i <= 5; i++) m[8][i] = ((format >> i) & 1) as 0 | 1;
  m[8][7] = ((format >> 6) & 1) as 0 | 1;
  m[8][8] = ((format >> 7) & 1) as 0 | 1;
  m[7][8] = ((format >> 8) & 1) as 0 | 1;
  for (let i = 9; i <= 14; i++) m[14 - i][8] = ((format >> i) & 1) as 0 | 1;

  for (let i = 0; i <= 7; i++) m[size - 1 - i][8] = ((format >> i) & 1) as 0 | 1;
  for (let i = 8; i <= 14; i++) m[8][size - 15 + i] = ((format >> i) & 1) as 0 | 1;

  m[size - 8][8] = 1;

  // Version information (v >= 7)
  if (version >= 7) {
    let vrem = version << 12;
    for (let i = 17; i >= 12; i--) {
      if ((vrem >> i) & 1) vrem ^= 0b1111100100101 << (i - 12);
    }
    const vBits = (version << 12) | vrem;
    for (let i = 0; i < 18; i++) {
      const bit = ((vBits >> i) & 1) as 0 | 1;
      m[Math.floor(i / 3)][size - 11 + (i % 3)] = bit;
      m[size - 11 + (i % 3)][Math.floor(i / 3)] = bit;
    }
  }

  return m;
}

function penalty(m: Grid): number {
  const size = m.length;
  let score = 0;

  // Rule 1 — runs of 5+
  for (let i = 0; i < size; i++) {
    for (const isRow of [true, false]) {
      let run = 1;
      for (let j = 1; j < size; j++) {
        const cur = isRow ? m[i][j] : m[j][i];
        const prev = isRow ? m[i][j - 1] : m[j - 1][i];
        if (cur === prev) {
          run++;
        } else {
          if (run >= 5) score += 3 + (run - 5);
          run = 1;
        }
      }
      if (run >= 5) score += 3 + (run - 5);
    }
  }

  // Rule 2 — 2x2 blocks
  for (let r = 0; r < size - 1; r++) {
    for (let c = 0; c < size - 1; c++) {
      const v = m[r][c];
      if (v === m[r][c + 1] && v === m[r + 1][c] && v === m[r + 1][c + 1]) score += 3;
    }
  }

  // Rule 4 — dark/light balance
  let dark = 0;
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) if (m[r][c] === 1) dark++;
  const pct = (dark * 100) / (size * size);
  score += Math.floor(Math.abs(pct - 50) / 5) * 10;

  return score;
}

/** Returns a boolean matrix — `true` means a dark module. */
export function generateQrMatrix(text: string): boolean[][] {
  const bytes = new TextEncoder().encode(text);
  const version = pickVersion(bytes.length);
  const codewords = encodeData(text, version);

  let best: Grid | null = null;
  let bestScore = Infinity;

  for (let mask = 0; mask < 8; mask++) {
    const candidate = buildMatrix(version, codewords, mask);
    const s = penalty(candidate);
    if (s < bestScore) {
      bestScore = s;
      best = candidate;
    }
  }

  return (best as Grid).map((row) => row.map((v) => v === 1));
}

/** Renders the matrix to a standalone SVG string. */
export function qrToSvg(
  text: string,
  options: { size?: number; margin?: number; dark?: string; light?: string } = {}
): string {
  const { size = 256, margin = 4, dark = "#000000", light = "#ffffff" } = options;
  const matrix = generateQrMatrix(text);
  const count = matrix.length;
  const total = count + margin * 2;
  const scale = size / total;

  let path = "";
  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (matrix[r][c]) {
        path += `M${(c + margin) * scale} ${(r + margin) * scale}h${scale}v${scale}h-${scale}z`;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges"><rect width="${size}" height="${size}" fill="${light}"/><path d="${path}" fill="${dark}"/></svg>`;
}
