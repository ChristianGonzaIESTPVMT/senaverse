import { checkFeatureConfig, createLiveWindow, featureCount } from './features.mjs';

export const MODEL_FORMAT = 'senaverse-landmark-classifier-v1';

function numbers(array, size, valid = Number.isFinite) {
  return Array.isArray(array) && array.length === size && array.every(valid);
}

function checkParameters(model, inputs, outputs) {
  const { parameters } = model;
  if (model.kind === 'linear-svm') {
    if (!numbers(parameters?.center, inputs) || !numbers(parameters.scale, inputs, n => Number.isFinite(n) && n > 0)
        || !Array.isArray(parameters.weights) || parameters.weights.length !== outputs
        || !parameters.weights.every(weights => numbers(weights, inputs)) || !numbers(parameters.bias, outputs)
        || !Number.isFinite(parameters.temperature) || parameters.temperature <= 0) {
      throw new TypeError('Parámetros SVM inválidos.');
    }
    return;
  }
  const trees = parameters?.trees;
  const validTree = tree => Array.isArray(tree) && tree.length && tree.every((node, index) => {
    if (!Array.isArray(node)) return false;
    const [feature, threshold, left, right] = node;
    if (feature === -1) return numbers(node.slice(1), outputs, n => Number.isFinite(n) && n >= 0 && n <= 1);
    return node.length === 4 && Number.isInteger(feature) && feature >= 0 && feature < inputs && Number.isFinite(threshold)
      && [left, right].every(child => Number.isInteger(child) && child > index && child < tree.length);
  });
  if (model.kind !== 'random-forest' || !Array.isArray(trees) || trees.length === 0 || !trees.every(validTree)) {
    throw new TypeError('Parámetros Random Forest inválidos.');
  }
}

function linearScores(features, { center, scale, weights, bias, temperature }) {
  const normalized = features.map((value, i) => (value - center[i]) / scale[i]);
  const logits = weights.map((row, i) => row.reduce((dot, weight, j) => dot + weight * normalized[j], bias[i]) / temperature);
  const max = Math.max(...logits);
  const scores = logits.map(logit => Math.exp(logit - max));
  const total = scores.reduce((sum, value) => sum + value, 0);
  return scores.map(value => value / total);
}

function forestScores(features, { trees }, outputs) {
  const scores = Array(outputs).fill(0);
  // scikit-learn applies the split to float32 inputs and float64 thresholds.
  const values = features.map(Math.fround);
  for (const tree of trees) {
    let node = tree[0];
    while (node[0] !== -1) {
      const [feature, threshold, left, right] = node;
      node = tree[values[feature] <= threshold ? left : right];
    }
    for (let i = 0; i < outputs; i++) scores[i] += node[i + 1];
  }
  return scores.map(score => score / trees.length);
}

export function createPredictor(model) {
  if (model?.format !== MODEL_FORMAT || typeof model.modelVersion !== 'string') throw new TypeError('Formato de modelo incompatible.');
  checkFeatureConfig(model.preprocessing);
  const inputs = featureCount(model.preprocessing);
  const outputs = model.labels?.length;
  const labelIds = model.labels?.map(label => label?.id);
  if (model.inputDimensions !== inputs || !Number.isInteger(outputs) || outputs < 2 || outputs !== model.outputDimensions
      || labelIds.some(id => typeof id !== 'string') || new Set(labelIds).size !== outputs
      || model.negativeLabelId !== 'NEG-001'
      || ![model.thresholds?.confidence, model.thresholds?.margin].every(n => Number.isFinite(n) && n >= 0 && n <= 1)) {
    throw new TypeError('Dimensiones, etiquetas o umbrales inválidos.');
  }
  checkParameters(model, inputs, outputs);
  const { thresholds, negativeLabelId } = model;

  function scores(features) {
    if (!numbers(features, inputs)) throw new TypeError('Vector de entrada inválido.');
    return model.kind === 'linear-svm' ? linearScores(features, model.parameters) : forestScores(features, model.parameters, outputs);
  }

  function classify(prepared) {
    if (!prepared.features) return { labelId: null, reason: prepared.reason, scores: [] };
    const values = scores(prepared.features);
    const ranked = values.map((_, i) => i).sort((a, b) => values[b] - values[a] || a - b);
    const [best, second] = ranked;
    const confidence = values[best];
    const margin = confidence - values[second];
    const label = labelIds[best];
    const reason = label === negativeLabelId ? 'negative-class'
      : confidence < thresholds.confidence ? 'low-confidence'
      : margin < thresholds.margin ? 'low-margin' : null;
    return { labelId: reason ? null : label, reason, scores: values, confidence, margin };
  }

  function live() {
    const buffer = createLiveWindow(model.preprocessing);
    return {
      push: buffer.push,
      reset: buffer.reset,
      predict: nowMs => classify(buffer.read(nowMs)),
    };
  }

  return { scores, classify, live };
}
