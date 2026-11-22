import { readFileSync } from 'node:fs';
import { causalWindowsV2, FEATURE_CONFIG, featureCount, recordedMovement, trailingWindow } from '../web/features.mjs';
import { passesMovement } from '../web/movement.mjs';
import { createPredictor } from '../web/model.mjs';

const staticLabels = new Set(['LSP-001', 'LSP-002', 'LSP-003', 'LSP-004', 'LSP-005']);

function nadaDirection(motion) {
  const value = motion?.nada;
  if (!value) return 'seguimiento-insuficiente';
  if (value.xRange < .45) return 'poco-desplazamiento-horizontal';
  if (value.xRange < .8 * value.yRange) return 'trayectoria-predominantemente-vertical';
  if (value.netX >= .45 && value.netX >= .65 * value.xRange) return 'compatible-en-direccion';
  if (value.netX <= -.45 && -value.netX >= .65 * value.xRange) return 'direccion-opuesta';
  return 'retorno-o-direccion-no-concluyente';
}

function features(row) {
  return [...causalWindowsV2(row.frames, row.aspect)].flatMap(window => {
    if (!window.features) return [];
    const { features, canonicalFeatures, side } = window;
    if (canonicalFeatures && staticLabels.has(row.labelId)) return [canonicalFeatures];
    if (canonicalFeatures && row.labelId === 'NEG-001') return [features, canonicalFeatures];
    if (staticLabels.has(row.labelId) && side !== 'Right') return [];
    return [features];
  });
}

function inspect(row) {
  const windows = [...causalWindowsV2(row.frames, row.aspect)];
  const complete = recordedMovement(row.frames, row.aspect);
  return {
    ...('sampleId' in row && { sampleId: row.sampleId }),
    complete,
    completePasses: passesMovement(row.labelId, complete),
    ...(row.labelId === 'LSP-007' && { direction: nadaDirection(complete) }),
    windows: windows.map(({ endMs, movement, side }) => ({
      endMs, movement, side, passes: passesMovement(row.labelId, movement),
    })),
  };
}

function testLaterality({ rows, model }) {
  const predictor = createPredictor(model);
  const summary = { takes: 0, originalCorrect: 0, reflectedCorrect: 0, canonicalCorrect: 0 };
  for (const { frames, aspect, labelId } of rows) {
    const original = [...causalWindowsV2(frames, aspect)].at(-1);
    if (original?.side !== 'Right') continue;
    const reflected = frames.map(frame => ({ ...frame, hands: frame.hands.map(hand => ({
      ...hand, handedness: hand.handedness.map(category => ({ ...category, categoryName: 'Left' })),
      landmarks: hand.landmarks.map(({ x, y, z }) => ({ x: 1 - x, y, z })),
    })) }));
    const candidate = [...causalWindowsV2(reflected, aspect)].at(-1);
    if (!candidate?.canonicalFeatures) continue;
    summary.takes++;
    summary.originalCorrect += Number(predictor.classify(trailingWindow(frames, aspect)).labelId === labelId);
    summary.reflectedCorrect += Number(predictor.classify(trailingWindow(reflected, aspect)).labelId === labelId);
    summary.canonicalCorrect += Number(predictor.classify({ features: candidate.canonicalFeatures }).labelId === labelId);
  }
  return summary;
}

const input = JSON.parse(readFileSync(0, 'utf8'));
const command = process.argv[2];
const handlers = { inspect: rows => rows.map(inspect), features: rows => ({
  config: FEATURE_CONFIG, dimensions: featureCount(FEATURE_CONFIG), rows: rows.map(features),
}), laterality: testLaterality };
if (!Object.hasOwn(handlers, command)) throw new Error('Comando de geometría V2 desconocido.');
process.stdout.write(JSON.stringify(handlers[command](input)));
