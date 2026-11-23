import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { simulate } from '../ml/scripts/replay_session.mjs';
import { parseLabModel } from '../src/features/sign-recognition/labModel.ts';

const datasetPath = process.argv[2];
if (!datasetPath) throw new Error('Indica la ruta de las 355 muestras locales.');
const data = readFileSync(datasetPath);
const samples = JSON.parse(data).samples;
const manifest = JSON.parse(readFileSync('ml/artifacts/hito-3/prepared.json', 'utf8'));
const modelData = readFileSync('public/models/lsp-v1.json');
assert.equal(samples.length, 355);
assert.equal(createHash('sha256').update(data).digest('hex'), manifest.sourceSha256);
assert.deepEqual(modelData, readFileSync('dist/models/lsp-v1.json'));
const model = parseLabModel(JSON.parse(modelData));

function distribution(values) {
  const sorted = values.toSorted((a, b) => a - b);
  const p = n => +sorted[Math.ceil(sorted.length * n) - 1].toFixed(3);
  return { count: values.length, median: p(.5), p95: p(.95) };
}

const classifier = [], captureToDecision = [], startToConfirmation = [];
for (const { labelId, frames, captureMetadata } of samples) {
  const views = simulate(model, { frames, configuration: captureMetadata.configuration, recordingStart: captureMetadata.recordingStartedAtMs });
  for (const view of views) {
    if (view.classifierMs !== null) classifier.push(view.classifierMs);
    if (view.captureToDecisionMs !== null) captureToDecision.push(view.captureToDecisionMs);
  }
  const first = views.find(view => view.status === 'recognized' && view.stableId === labelId);
  if (first) startToConfirmation.push(first.capturedAtMs + (first.captureToDecisionMs ?? 0));
}

const files = readdirSync('dist', { recursive: true }).filter(name => statSync(join('dist', name)).isFile());
const matches = (pattern, input = files) => input.filter(name => pattern.test(name.replaceAll('\\', '/')));
const privateFiles = matches(/(^|\/)(ml|\.git|\.env[^/]*|docs|scripts|datasets|consent|participants)(\/|$)|\.(map|csv|npz|pkl)$/i);
assert.deepEqual(privateFiles, []);
const bytes = input => input.reduce((size, name) => size + statSync(join('dist', name)).size, 0);
const main = matches(/^assets\/index-[^/]+\.js$/)[0];
const css = matches(/^assets\/index-[^/]+\.css$/)[0];
const gzip = name => gzipSync(readFileSync(join('dist', name))).length;
console.log(JSON.stringify({
  integrity: { samples: samples.length, modelUnchanged: true, privateFiles: privateFiles.length, activeClasses: model.labels.length },
  build: { fileCount: files.length, bytes: bytes(files), wasmBytes: bytes(matches(/\.wasm$/)), jsBytes: bytes(matches(/\.js$/)),
    cssBytes: bytes(matches(/\.css$/)), mainJsGzipBytes: gzip(main), mainCssGzipBytes: gzip(css) },
  replayMs: { classifier: distribution(classifier), captureToDecision: distribution(captureToDecision), startToMatchingConfirmation: distribution(startToConfirmation) },
}, null, 2));
