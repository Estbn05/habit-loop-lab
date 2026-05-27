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
  const nx = x / Math.max(size - 1, 1);
  const ny = y / Math.max(size - 1, 1);
  const teal = [13, 124, 102];
  const blue = [55, 111, 151];
  const coral = [199, 85, 62];
  const mid = mix(teal, blue, clamp(nx * 0.9 + ny * 0.25, 0, 1));
  const base = mix(mid, coral, clamp((nx + ny - 0.85) * 0.9, 0, 1));
  const shade = 1 - radial(nx, ny, 0.18, 0.1) * 0.12 + radial(nx, ny, 0.85, 0.9) * 0.1;
  const letter = letterMask(x, y, size);

  if (letter) return [255, 255, 255, 255];
  return [
    clampByte(base[0] * shade),
    clampByte(base[1] * shade),
    clampByte(base[2] * shade),
    255,
  ];
}

function letterMask(x, y, size) {
  const unit = size / 18;
  const inRect = (left, top, width, height) => (
    x >= left * unit &&
    x <= (left + width) * unit &&
    y >= top * unit &&
    y <= (top + height) * unit
  );

  return (
    inRect(4, 5, 1.6, 8) ||
    inRect(8.2, 5, 1.6, 8) ||
    inRect(4, 8.2, 5.8, 1.45) ||
    inRect(11.7, 5, 1.65, 8) ||
    inRect(11.7, 11.3, 4.2, 1.65)
  );
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

function mix(a, b, t) {
  return a.map((value, index) => value + (b[index] - value) * t);
}

function radial(x, y, cx, cy) {
  const dx = x - cx;
  const dy = y - cy;
  return clamp(1 - Math.sqrt(dx * dx + dy * dy), 0, 1);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function clampByte(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}
