import { readFileSync } from 'node:fs';
import { LAB_SIGNS_BY_ID, parseLabModel } from '../../src/features/sign-recognition/labModel.ts';
import { simulate } from './replay_session.mjs';

function distribution(values) {
  const ordered = values.toSorted((a, b) => a - b);
  const percentile = fraction => ordered[Math.ceil(fraction * ordered.length) - 1] ?? null;
  return { n: ordered.length, p50: percentile(.5), p95: percentile(.95) };
}

function observedHands(row) {
  const counts = [0, 0, 0];
  for (const frame of row.frames) counts[frame.hands.length]++;
  return counts;
}

function observedSide(row) {
  const count = { Left: 0, Right: 0 };
  const single = row.frames.filter(frame => frame.hands.length === 1);
  for (const frame of single) {
    const [best] = frame.hands[0].handedness.toSorted((a, b) => b.score - a.score);
    if (best?.score >= .8 && Object.hasOwn(count, best.categoryName)) count[best.categoryName]++;
  }
  return single.length && Object.keys(count).find(side => count[side] >= .8 * single.length) || 'undetermined';
}

function replay(model, rows) {
  const warm = rows.find(row => row.frames.at(-1).timestampMs > 1700 && row.frames.some(frame => frame.hands.length));
  if (warm) for (let i = 0; i < 12; i++) simulate(model, warm);
  const byLabel = {}, byStaticHand = {}, negativeByHands = {}, confusion = {}, motionConfusion = {}, latencyByLabel = {};
  const timings = { classifierMs: [], captureToDecisionMs: [], firstCorrectMs: [], recordedDetectorFps: [] };
  let falseAccepts = 0, falseRejects = 0, wrongPositiveTakes = 0, negativeTakes = 0, positiveTakes = 0;
  let unknownWithHands = 0;
  function add(target, key, field) {
    const counts = target[key] ??= {};
    counts[field] = (counts[field] ?? 0) + 1;
  }
  const takes = rows.map(row => {
    const wanted = LAB_SIGNS_BY_ID.get(row.labelId);
    const hands = observedHands(row);
    const maxHands = hands[2] ? 2 : hands[1] ? 1 : 0;
    const side = wanted?.expectedHands === 1 ? observedSide(row) : null;
    const views = simulate(model, row);
    const confirmed = views.filter(view => view.status === 'recognized' && view.stableId);
    const labels = [...new Set(confirmed.map(view => view.stableId))];
    const correct = wanted && confirmed.find(view => view.stableId === wanted.id);
    const first = confirmed[0]?.stableId ?? null;
    const correctAtMs = correct ? correct.capturedAtMs + correct.captureToDecisionMs : null;
    add(byLabel, row.labelId, 'takes');
    if (wanted) {
      positiveTakes++;
      if (wanted.type === 'static') {
        const key = `${row.labelId}/${side}`;
        add(byStaticHand, key, 'takes');
        if (correct) add(byStaticHand, key, 'correct');
      }
      if (!labels.length) falseRejects++;
      if (labels.some(id => id !== wanted.id)) wrongPositiveTakes++;
      if (correct) {
        timings.firstCorrectMs.push(correctAtMs);
        (latencyByLabel[row.labelId] ??= []).push(correctAtMs);
        add(byLabel, row.labelId, 'correct');
      }
      for (const id of labels) {
        const actual = LAB_SIGNS_BY_ID.get(id).type;
        if (actual !== wanted.type) add(motionConfusion, wanted.type, actual);
      }
    } else {
      negativeTakes++;
      add(negativeByHands, maxHands, 'takes');
      if (labels.length) {
        falseAccepts++;
        add(negativeByHands, maxHands, 'falseAccepts');
      } else {
        add(negativeByHands, maxHands, 'correctRejections');
        add(byLabel, row.labelId, 'correct');
      }
    }
    add(confusion, row.labelId, first ?? 'sin-confirmacion');
    if (!labels.length && maxHands) unknownWithHands++;
    for (const view of views) {
      timings.classifierMs.push(view.classifierMs);
      timings.captureToDecisionMs.push(view.captureToDecisionMs);
    }
    const span = row.frames.at(-1).timestampMs - row.frames[0].timestampMs;
    if (span > 0) timings.recordedDetectorFps.push(1000 * (row.frames.length - 1) / span);
    return { sampleId: row.sampleId, labelId: row.labelId, side, hands, first, labels, correctAtMs,
      analyzedWindows: views.length, rejects: views.reduce((counts, view) => {
        if (view.reason) counts[view.reason] = (counts[view.reason] ?? 0) + 1;
        return counts;
      }, {}) };
  });
  return {
    summary: { modelVersion: model.modelVersion, positiveTakes, negativeTakes, falseAccepts, falseRejects, wrongPositiveTakes,
      knownWithoutCorrect: positiveTakes - Object.entries(byLabel).reduce((n, [id, row]) =>
        n + (LAB_SIGNS_BY_ID.has(id) ? (row.correct ?? 0) : 0), 0),
      unknownWithHands, byLabel: Object.fromEntries(Object.entries(byLabel).map(([id, counts]) => [
        id, { ...counts, correct: counts.correct ?? 0,
          ...(LAB_SIGNS_BY_ID.has(id) && { firstCorrectMs: distribution(latencyByLabel[id] ?? []) }) },
      ])), byStaticHand, negativeByHands, confusion, motionConfusion,
      timings: Object.fromEntries(Object.entries(timings).map(([name, values]) => [name, distribution(values)])) },
    takes,
  };
}

const { models, rows } = JSON.parse(readFileSync(0, 'utf8'));
const comparisons = Object.entries(models).map(([version, model]) => [version, replay(parseLabModel(model, version), rows)]);
process.stdout.write(JSON.stringify({
  summary: Object.fromEntries(comparisons.map(([version, report]) => [version, report.summary])),
  takes: Object.fromEntries(comparisons.map(([version, report]) => [version, report.takes])),
}));
