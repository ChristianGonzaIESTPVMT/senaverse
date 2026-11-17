import { createRequire } from 'node:module';
import { copyFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const packageRoot = dirname(require.resolve('@mediapipe/tasks-vision'));
const { version } = JSON.parse(await readFile(join(packageRoot, 'package.json'), 'utf8'));
const destination = fileURLToPath(new URL('../public/mediapipe/wasm/', import.meta.url));
await mkdir(destination, { recursive: true });
const source = join(packageRoot, 'wasm');
for (const entry of await readdir(source, { withFileTypes: true })) {
  if (!entry.isFile()) continue;
  const from = join(source, entry.name);
  const to = join(destination, entry.name);
  const expected = await readFile(from);
  const existing = await readFile(to).catch(error => { if (error.code === 'ENOENT') return null; throw error; });
  // Avoid replacing files already being served by Vite, including on Windows.
  if (!existing?.equals(expected)) await copyFile(from, to);
}
const markerPath = join(destination, 'version.json');
const marker = JSON.stringify({ package: '@mediapipe/tasks-vision', version }, null, 2) + '\n';
if (await readFile(markerPath, 'utf8').catch(error => { if (error.code === 'ENOENT') return null; throw error; }) !== marker) await writeFile(markerPath, marker);
console.log(`MediaPipe ${version}: recursos WASM locales preparados.`);
