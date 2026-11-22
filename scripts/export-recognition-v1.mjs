import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { LAB_MODEL_VERSION } from '../src/features/sign-recognition/labProtocol.ts';

const source = new URL('../ml/artifacts/hito-3/model.json', import.meta.url);
const destination = new URL('../public/models/lsp-v1.json', import.meta.url);
const raw = await readFile(source);
if (createHash('sha256').update(raw).digest('hex') !== '055e31bf081e18a68081648e3948713fb86825afc6890bee7333d5cb3364c5a6') {
  throw new Error('Huella del artefacto V1 inesperada.');
}
const { format, kind, modelVersion, preprocessing, inputDimensions, outputDimensions, labels,
  negativeLabelId, thresholds, parameters, detector } = JSON.parse(raw);
if (modelVersion !== LAB_MODEL_VERSION) throw new Error('Versión del artefacto V1 inesperada.');
await writeFile(destination, JSON.stringify({ format, kind, modelVersion, preprocessing, inputDimensions,
  outputDimensions, labels, negativeLabelId, thresholds, parameters, detector }) + '\n');
