import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { inflateSync } from 'node:zlib';

function rgbaPng(buffer) {
  const width = buffer.readUInt32BE(16), height = buffer.readUInt32BE(20);
  assert.equal(buffer[24], 8); assert.equal(buffer[25], 6);
  const chunks = [];
  for (let offset = 8; offset < buffer.length;) {
    const size = buffer.readUInt32BE(offset);
    if (buffer.toString('ascii', offset + 4, offset + 8) === 'IDAT') chunks.push(buffer.subarray(offset + 8, offset + 8 + size));
    offset += 12 + size;
  }
  const source = inflateSync(Buffer.concat(chunks));
  const stride = width * 4, pixels = Buffer.alloc(width * height * 4);
  const paeth = (a, b, c) => { const p = a + b - c; const x = Math.abs(p - a), y = Math.abs(p - b), z = Math.abs(p - c); return x <= y && x <= z ? a : y <= z ? b : c; };
  for (let y = 0; y < height; y++) {
    const filter = source[y * (stride + 1)];
    for (let x = 0; x < stride; x++) {
      const i = y * stride + x;
      const a = x >= 4 ? pixels[i - 4] : 0, b = y ? pixels[i - stride] : 0, c = y && x >= 4 ? pixels[i - stride - 4] : 0;
      const prediction = [0, a, b, Math.floor((a + b) / 2), paeth(a, b, c)][filter];
      assert.notEqual(prediction, undefined);
      pixels[i] = (source[y * (stride + 1) + x + 1] + prediction) & 255;
    }
  }
  return { width, height, pixels, pixel(x, y) { return [...pixels.subarray((y * width + x) * 4, (y * width + x) * 4 + 4)]; } };
}

test('the corrected official hand is solid white with fully opaque interiors at web and favicon sizes', async () => {
  for (const [file, scale] of [['../public/images/logo-senaverse.png', 1], ['../public/favicon.png', .25]]) {
    const png = rgbaPng(await readFile(new URL(file, import.meta.url)));
    for (const [x, y] of [[93, 53], [100, 78], [130, 62], [183, 106], [112, 201]]) {
      assert.deepEqual(png.pixel(Math.round(x * scale), Math.round(y * scale)), [255, 255, 255, 255]);
    }
    for (const [x, y] of [[0, 0], [png.width - 1, 0], [0, png.height - 1], [png.width - 1, png.height - 1]]) assert.equal(png.pixel(x, y)[3], 0);
  }
});

test('the heart opening and exterior purple, fuchsia and green gradients remain colored', async () => {
  const png = rgbaPng(await readFile(new URL('../public/images/logo-senaverse.png', import.meta.url)));
  const green = png.pixel(50, 186), pink = png.pixel(204, 155), purple = png.pixel(110, 35), heart = png.pixel(120, 160);
  assert.ok(green[1] > 150 && green[0] < 60 && green[3] > 240);
  assert.ok(pink[0] > 150 && pink[1] < 60 && pink[2] > 100 && pink[3] > 240);
  assert.ok(purple[2] > purple[1] && purple[2] > 100);
  assert.notDeepEqual(heart.slice(0, 3), [255, 255, 255]);
  assert.ok(heart[2] > heart[1]);
});
