import { readFileSync } from 'node:fs';
import { recordedWindow, trailingWindow } from '../web/features.mjs';
import { parseLabModel } from '../../src/features/sign-recognition/labModel.ts';
import { recognitionDefaults } from '../../src/features/sign-recognition/liveRecognition.ts';
import { simulate } from './replay_session.mjs';

function percentile(values, fraction) {
  if (!values.length) return null;
  const ordered = values.toSorted((a, b) => a - b);
  return ordered[Math.ceil(fraction * values.length) - 1];
}

function distribution(values) {
  return { n: values.length, p50: percentile(values, .50), p95: percentile(values, .95) };
}

function compare(model, rows) {
  const summary = {};
  const timings = { classifierMs: [], captureToDecisionMs: [], scoredHz: [], recordedDetectorFps: [] };
  const falseAccepts = {};
  for (const row of rows) {
    const wanted = row.labelId === 'NEG-001' ? null : row.labelId;
    const offline = model.predictor.classify(recordedWindow(row.frames, row.aspect, model.preprocessing));
    const final = model.predictor.classify(trailingWindow(row.frames, row.aspect, model.preprocessing));
    const snapshots = simulate(model, row);
    const stable = snapshots.filter(view => view.status === 'recognized');
    const correct = wanted && stable.find(view => view.stableId === wanted);
    const counts = summary[row.labelId] ??= {
      takes: 0, offlineCorrect: 0, finalWindowCorrect: 0, instantCorrect: 0, stableCorrect: 0,
      everWrongStable: 0, noScore: 0, firstStableMs: [],
    };
    counts.takes++;
    counts.offlineCorrect += Number(offline.labelId === wanted);
    counts.finalWindowCorrect += Number(final.labelId === wanted);
    const instant = snapshots.filter(view => !view.reason);
    counts.instantCorrect += Number(wanted ? instant.some(view => view.top[0].id === wanted) : !instant.length);
    counts.stableCorrect += Number(wanted ? !!correct : stable.length === 0);
    counts.everWrongStable += Number(stable.some(view => view.stableId !== wanted));
    counts.noScore += Number(snapshots.length === 0);
    if (correct) counts.firstStableMs.push(correct.capturedAtMs);
    if (!wanted) {
      for (const id of new Set(stable.map(view => view.stableId))) falseAccepts[id] = (falseAccepts[id] ?? 0) + 1;
    }
    for (const view of snapshots) {
      timings.classifierMs.push(view.classifierMs);
      timings.captureToDecisionMs.push(view.captureToDecisionMs);
    }
    if (snapshots.length > 1) timings.scoredHz.push(1000 * (snapshots.length - 1) / (snapshots.at(-1).capturedAtMs - snapshots[0].capturedAtMs));
    timings.recordedDetectorFps.push(1000 * (row.frames.length - 1) / (row.frames.at(-1).timestampMs - row.frames[0].timestampMs));
  }
  return {
    byLabel: Object.fromEntries(Object.entries(summary).map(([label, counts]) => [
      label, { ...counts, firstStableMs: distribution(counts.firstStableMs) },
    ])),
    timings: Object.fromEntries(Object.entries(timings).map(([metric, values]) => [metric, distribution(values)])),
    falseAccepts,
  };
}

const input = JSON.parse(readFileSync(0, 'utf8'));
const model = parseLabModel(input.model);
const warm = Object.values(input.partitions).flat().find(row => row.frames.at(-1).timestampMs > 2000);
if (warm) for (let i = 0; i < 20; i++) simulate(model, warm);
const partitions = Object.fromEntries(Object.entries(input.partitions).map(([split, rows]) => [split, compare(model, rows)]));
process.stdout.write(JSON.stringify({ modelVersion: model.modelVersion, settings: recognitionDefaults(model), partitions }, null, 2) + '\n');
