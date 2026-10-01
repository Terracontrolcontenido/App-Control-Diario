import fs from 'fs';
import zlib from 'zlib';

function createSolidPng(width, height, r, g, b) {
  // Construct a minimal uncompressed/deflated raw PNG
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  
  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // bit depth
  ihdrData.writeUInt8(2, 9); // color type: RGB
  ihdrData.writeUInt8(0, 10); // compression
  ihdrData.writeUInt8(0, 11); // filter
  ihdrData.writeUInt8(0, 12); // interlace
  
  const ihdrChunk = createChunk('IHDR', ihdrData);

  // Scanlines with filter byte 0
  const rowBytes = width * 3;
  const rawData = Buffer.alloc(height * (rowBytes + 1));
  for (let y = 0; y < height; y++) {
    const rowStart = y * (rowBytes + 1);
    rawData[rowStart] = 0; // Filter 0
    for (let x = 0; x < width; x++) {
      const p = rowStart + 1 + x * 3;
      // Border accent in Terra Red (#dc2626)
      const isBorder = (x < 10 || x > width - 11 || y < 10 || y > height - 11);
      if (isBorder) {
        rawData[p] = 220;
        rawData[p + 1] = 38;
        rawData[p + 2] = 38;
      } else {
        rawData[p] = r;
        rawData[p + 1] = g;
        rawData[p + 2] = b;
      }
    }
  }

  const deflated = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', deflated);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(len + 12);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);

  let crc = 0xffffffff;
  for (let i = 4; i < len + 8; i++) {
    crc = updateCrc(crc, chunk[i]);
  }
  crc = crc ^ 0xffffffff;
  chunk.writeInt32BE(crc, len + 8);
  return chunk;
}

const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

function updateCrc(crc, byte) {
  return crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
}

if (!fs.existsSync('./public')) {
  fs.mkdirSync('./public', { recursive: true });
}

fs.writeFileSync('./public/pwa-192x192.png', createSolidPng(192, 192, 255, 255, 255));
fs.writeFileSync('./public/pwa-512x512.png', createSolidPng(512, 512, 255, 255, 255));
fs.writeFileSync('./public/pwa-maskable-512x512.png', createSolidPng(512, 512, 255, 255, 255));
fs.writeFileSync('./public/apple-touch-icon.png', createSolidPng(180, 180, 255, 255, 255));
console.log('PWA PNG icons generated successfully in /public!');
