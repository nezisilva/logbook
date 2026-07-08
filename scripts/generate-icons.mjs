// Generates the PWA icons (512 / 512-maskable / 192 / apple-touch 180)
// without any image dependencies: draws a journal glyph into an RGBA
// buffer and encodes PNG via zlib.
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const OUT = path.resolve(process.cwd(), "public");
mkdirSync(OUT, { recursive: true });

// ---- palette ----
const BG = [31, 42, 68, 255]; // ink navy (matches theme_color #1f2a44)
const PAGE = [246, 243, 236, 255]; // paper
const LINE = [167, 178, 201, 255]; // ruled lines
const RIBBON = [224, 90, 90, 255]; // coral bookmark (#e05a5a)

// Design coordinates live on a 512 grid; `inset` shrinks the glyph toward
// the center (maskable icons need an ~80% safe zone).
function drawIcon(size, { transparentCorners = true, inset = 0 } = {}) {
  const px = new Uint8Array(size * size * 4);
  const scale = (size * (1 - 2 * inset)) / 512;
  const off = size * inset;
  const g = (v) => off + v * scale; // grid → pixel
  const radius = size * 0.1875;

  const put = (x, y, [r, gc, b, a]) => {
    const i = (y * size + x) * 4;
    const na = a / 255;
    px[i] = Math.round(r * na + px[i] * (1 - na));
    px[i + 1] = Math.round(gc * na + px[i + 1] * (1 - na));
    px[i + 2] = Math.round(b * na + px[i + 2] * (1 - na));
    px[i + 3] = Math.max(px[i + 3], a);
  };

  const inRoundedRect = (x, y) => {
    const r = radius;
    const w = size;
    const cx = Math.min(Math.max(x, r), w - r);
    const cy = Math.min(Math.max(y, r), w - r);
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (transparentCorners && !inRoundedRect(x + 0.5, y + 0.5)) continue;
      put(x, y, BG);

      // journal page
      if (x >= g(128) && x <= g(384) && y >= g(88) && y <= g(424)) {
        put(x, y, PAGE);

        // ruled entry lines
        for (const ly of [200, 262, 324]) {
          if (Math.abs(y - g(ly)) <= 9 * scale && x >= g(164) && x <= g(348)) {
            put(x, y, LINE);
          }
        }
      }

      // bookmark ribbon with swallowtail notch
      if (x >= g(296) && x <= g(336) && y >= g(88) && y <= g(240)) {
        const notch = y > g(190) && Math.abs(x - g(316)) < (y - g(190)) * 0.5;
        if (!notch) put(x, y, RIBBON);
      }
    }
  }
  return px;
}

// ---- minimal PNG encoder ----
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(px, size) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  // filter byte 0 per scanline
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    Buffer.from(px.buffer, y * size * 4, size * 4).copy(
      raw,
      y * (size * 4 + 1) + 1,
    );
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

for (const [file, size, opts] of [
  ["icon-512.png", 512, {}],
  ["icon-192.png", 192, {}],
  // maskable: opaque, glyph inside the ~80% safe zone
  ["icon-512-maskable.png", 512, { transparentCorners: false, inset: 0.11 }],
  // apple-touch-icon: iOS composites its own corners, so keep square
  ["apple-touch-icon.png", 180, { transparentCorners: false }],
]) {
  const png = encodePng(drawIcon(size, opts), size);
  writeFileSync(path.join(OUT, file), png);
  console.log(`wrote public/${file} (${png.length} bytes)`);
}
