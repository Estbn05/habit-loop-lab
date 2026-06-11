import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { deflateSync } from "node:zlib";

const outputs = [
  ["assets/icons/icon-180.png", 180],
  ["assets/icons/icon-192.png", 192],
  ["assets/icons/icon-512.png", 512],
];

for (const [file, size] of outputs) {
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, createIconPng(size));
}

console.log(`Generated ${outputs.length} PWA icons.`);

function createIconPng(size) {
  const rows = [];

  for (let y = 0; y < size; y += 1) {
    const row = Buffer.alloc(1 + size * 4);
    row[0] = 0;

    for (let x = 0; x < size; x += 1) {
      const offset = 1 + x * 4;
      const radius = size * 0.18;
      const inside = roundedRect(x, y, size, radius);
      const pixel = inside ? iconPixel(x, y, size) : [0, 0, 0, 0];

      row[offset] = pixel[0];
      row[offset + 1] = pixel[1];
      row[offset + 2] = pixel[2];
      row[offset + 3] = pixel[3];
    }

    rows.push(row);
  }

  const raw = Buffer.concat(rows);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr(size, size)),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function iconPixel(x, y, size) {
  const unit = size / 56;
  const px = (x + 0.5) / unit;
  const py = (y + 0.5) / unit;
  const matte = [26, 26, 26, 255];
  const cream = [247, 245, 240, 255];

  if (insideCircle(px, py, 14.5, 44, 5.5)) return cream;
  if (insideCircle(px, py, 28, 28, 3)) return mixRgba(matte, cream, 0.28);
  if (insideLoopStroke(px, py)) return cream;
  return matte;
}

function insideLoopStroke(x, y) {
  const centerX = 28;
  const centerY = 28;
  const radius = 19;
  const halfStroke = 1.75;
  const distance = Math.hypot(x - centerX, y - centerY);
  const angle = (Math.atan2(y - centerY, x - centerX) * 180) / Math.PI;
  const normalizedAngle = angle < 0 ? angle + 360 : angle;
  const onArc = normalizedAngle >= 270 || normalizedAngle <= 130;

  return (
    (onArc && Math.abs(distance - radius) <= halfStroke) ||
    insideCircle(x, y, 28, 9, halfStroke) ||
    insideCircle(x, y, 15.8, 42.6, halfStroke)
  );
}

function insideCircle(x, y, centerX, centerY, radius) {
  return Math.hypot(x - centerX, y - centerY) <= radius;
}

function roundedRect(x, y, size, radius) {
  const max = size - 1;
  const cx = x < radius ? radius : x > max - radius ? max - radius : x;
  const cy = y < radius ? radius : y > max - radius ? max - radius : y;
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= radius * radius;
}

function ihdr(width, height) {
  const buffer = Buffer.alloc(13);
  buffer.writeUInt32BE(width, 0);
  buffer.writeUInt32BE(height, 4);
  buffer[8] = 8;
  buffer[9] = 6;
  buffer[10] = 0;
  buffer[11] = 0;
  buffer[12] = 0;
  return buffer;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);

  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

function crc32(buffer) {
  let crc = 0xffffffff;

  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function mixRgba(a, b, t) {
  return a.map((value, index) => Math.round(value + (b[index] - value) * t));
}
