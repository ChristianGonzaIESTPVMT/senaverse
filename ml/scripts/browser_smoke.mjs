// Exercise the actual ESM classifier and live-window adapter in a local Chromium installation.
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createPredictor } from '../web/model.mjs';
import { browserCases, inference } from '../tests/fixtures.mjs';

const [modelPath, executable] = process.argv.slice(2);
const model = JSON.parse(readFileSync(modelPath, 'utf8'));
const cases = browserCases().map(frames => frames.map(inference));
const predictor = createPredictor(model);
const expected = cases.map(events => {
  const live = predictor.live();
  for (const event of events) live.push(event, event.receivedAtMs);
  return live.predict(events.at(-1).receivedAtMs);
});

const base = realpathSync(tmpdir());
const directory = realpathSync(mkdtempSync(join(base, 'senaverse-ml-')));
if (!/^senaverse-ml-[^/\\]+$/.test(relative(base, directory))) throw new Error('Directorio temporal inesperado.');
try {
  for (const name of ['model.mjs', 'features.mjs']) {
    copyFileSync(new URL('../web/' + name, import.meta.url), join(directory, name));
  }
  const inline = JSON.stringify({ model, cases }).replaceAll('<', '\\u003c');
  writeFileSync(join(directory, 'index.html'),
    '<!doctype html><meta charset="utf-8"><pre id="result"></pre>'
    + '<script type="application/json" id="input">' + inline + '</script><script type="module" src="./verify.mjs"></script>');
  writeFileSync(join(directory, 'verify.mjs'), `
    import { createPredictor } from './model.mjs';
    const { model, cases } = JSON.parse(document.querySelector('#input').textContent);
    const predictor = createPredictor(model);
    const predictions = cases.map(events => {
      const live = predictor.live();
      for (const event of events) live.push(event, event.receivedAtMs);
      return live.predict(events.at(-1).receivedAtMs);
    });
    document.querySelector('#result').textContent = JSON.stringify({ predictions, agent: navigator.userAgent });
  `);

  const run = spawnSync(executable, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--disable-background-networking', '--disable-sync',
    '--disable-component-update', '--host-resolver-rules=MAP * ~NOTFOUND', '--allow-file-access-from-files',
    '--user-data-dir=' + join(directory, 'profile'), '--dump-dom', pathToFileURL(join(directory, 'index.html')).href,
  ], { encoding: 'utf8', windowsHide: true, timeout: 30000, maxBuffer: 4 * 1024 * 1024 });
  const rendered = run.stdout?.match(/<pre id="result">([^<]+)<\/pre>/)?.[1];
  if (run.error || run.status !== 0 || !rendered) throw new Error('Chromium no completó la inferencia local: ' + (run.error?.message ?? run.status));
  const actual = JSON.parse(rendered);
  if (actual.predictions.length !== expected.length) throw new Error('Faltan decisiones de Chromium.');
  let maxAbsoluteScoreError = 0;
  expected.forEach((row, i) => {
    const next = actual.predictions[i];
    if (row.labelId !== next.labelId || row.reason !== next.reason || row.scores.length !== next.scores.length) {
      throw new Error('Decisión de Chromium distinta a Node.');
    }
    row.scores.forEach((score, j) => { maxAbsoluteScoreError = Math.max(maxAbsoluteScoreError, Math.abs(score - next.scores[j])); });
  });
  if (!Number.isFinite(maxAbsoluteScoreError) || maxAbsoluteScoreError > 2e-6) throw new Error('Puntuaciones de Chromium fuera de tolerancia.');
  const version = actual.agent.match(/Chrome\/[\d.]+/)?.[0] ?? 'Chromium';
  process.stdout.write(JSON.stringify({
    browser: basename(executable) + ' (' + version + ')', syntheticCases: expected.length, maxAbsoluteScoreError,
  }));
} finally {
  rmSync(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}
