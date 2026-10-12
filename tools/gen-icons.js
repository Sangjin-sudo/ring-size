// Draws the app icon as PNG files without any dependency.
// Run: node tools/gen-icons.js   (writes icon-192.png, icon-512.png, icon-maskable-512.png)
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const NAVY = [0x14, 0x21, 0x3d], GOLD = [0xe0, 0xb0, 0x40], PAPER = [0xf7, 0xf5, 0xf0];

// Colour of the icon at a point in a 512-unit design space, or null for transparent.
function sample(x, y, maskable) {
  const s = maskable ? 0.72 : 1;               // keep art inside the maskable safe zone
  const ax = (x - 256) / s + 256, ay = (y - 256) / s + 256;
  if (!maskable) {
    const r = 112, cx = Math.min(Math.max(x, r), 512 - r), cy = Math.min(Math.max(y, r), 512 - r);
    if ((x - cx) ** 2 + (y - cy) ** 2 > r * r) return null;
  }
  if (Math.abs(ax - 256) / 44 + Math.abs(ay - 112) / 52 <= 1) return PAPER;   // the stone
  const d = Math.hypot(ax - 256, ay - 272);
  if (d >= 106 && d <= 150) return GOLD;                                       // the band
  return NAVY;
}

function crc32(buf) {
  let c, crc = ~0;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return ~crc >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function png(size, maskable) {
  const SS = 4, raw = Buffer.alloc(size * (size * 4 + 1));
  for (let py = 0; py < size; py++) {
    const row = py * (size * 4 + 1);
    raw[row] = 0;
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
        const c = sample((px + (sx + 0.5) / SS) * 512 / size, (py + (sy + 0.5) / SS) * 512 / size, maskable);
        if (c) { r += c[0]; g += c[1]; b += c[2]; a++; }
      }
      const o = row + 1 + px * 4;
      if (a) { raw[o] = r / a; raw[o + 1] = g / a; raw[o + 2] = b / a; }
      raw[o + 3] = Math.round(255 * a / (SS * SS));
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))
  ]);
}

const out = path.join(__dirname, '..');
fs.writeFileSync(path.join(out, 'icon-192.png'), png(192, false));
fs.writeFileSync(path.join(out, 'icon-512.png'), png(512, false));
fs.writeFileSync(path.join(out, 'icon-maskable-512.png'), png(512, true));
console.log('icons written');
