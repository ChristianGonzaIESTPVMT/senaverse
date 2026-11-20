// Offline bridge. Raw geometry stays in this process and in the Python process via stdin.
import { readFileSync } from 'node:fs';
import { FEATURE_CONFIG, featureCount, recordedWindow, trailingWindow } from '../web/features.mjs';
import { createPredictor } from '../web/model.mjs';

function latency(inputs, action, iterations = 350) {
  if (inputs.length === 0) return null;
  for (let i = 0; i < 80; i++) action(inputs[i % inputs.length]);
  const times = Array.from({ length: iterations }, (_, i) => {
    const start = performance.now();
    action(inputs[i % inputs.length]);
    return performance.now() - start;
  }).sort((a, b) => a - b);
  return { medianMs: times[Math.floor(times.length / 2)], p95Ms: times[Math.ceil(times.length * .95) - 1], iterations };
}

const input = JSON.parse(readFileSync(0, 'utf8'));
const action = process.argv[2];
let result;
if (action === 'features') {
  result = [24, 32].map(steps => {
    const config = { ...FEATURE_CONFIG, steps };
    return {
      config,
      dimensions: featureCount(config),
      rows: input.map(({ frames, aspect }) => {
        const { features, reason } = recordedWindow(frames, aspect, config);
        return { features, reason };
      }),
    };
  });
} else if (action === 'score') {
  const predictor = createPredictor(input.model);
  result = {
    predictions: input.rows.map(row => predictor.classify(row)),
    latency: latency(input.rows.filter(row => row.features), row => predictor.classify(row)),
  };
  if (input.windows?.length) {
    result.trailingWindowLatency = latency(input.windows, ({ frames, aspect }) => {
      predictor.classify(trailingWindow(frames, aspect, input.model.preprocessing));
    }, 200);
  }
} else {
  throw new Error('Comando de puente desconocido.');
}
process.stdout.write(JSON.stringify(result));
