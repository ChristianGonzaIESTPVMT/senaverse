import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';
import { LAB_FLAG, LAB_MODEL_PATH, LAB_MODEL_VERSION } from '../src/features/sign-recognition/labProtocol.ts';

const artifact = 'ml/artifacts/hito-3/model.json';
const artifactSha256 = '055e31bf081e18a68081648e3948713fb86825afc6890bee7333d5cb3364c5a6';

/** Serve a projection of the reviewed V1 artifact without serving its directory. */
export function recognitionModelPlugin(): Plugin {
  return {
    name: 'vite-plugin-senaverse-recognition-model',
    apply: 'serve',
    configureServer(server) {
      const { root, base, env, isProduction, mode } = server.config;
      const path = base + LAB_MODEL_PATH;
      const enabled = !isProduction && mode === 'development' && env[LAB_FLAG] === 'true';
      server.middlewares.use(async (request, response, next) => {
        if (request.url?.split('?')[0] !== path) return next();
        response.setHeader('Cache-Control', 'no-store');
        response.setHeader('X-Content-Type-Options', 'nosniff');
        if (!enabled) {
          response.statusCode = 404;
          response.end();
          return;
        }
        if (request.method !== 'GET' && request.method !== 'HEAD') {
          response.statusCode = 405;
          response.setHeader('Allow', 'GET, HEAD');
          response.end();
          return;
        }
        try {
          const raw = await readFile(resolve(root, artifact));
          if (createHash('sha256').update(raw).digest('hex') !== artifactSha256) throw new Error('Huella V1 inesperada.');
          const { format, kind, modelVersion, preprocessing, inputDimensions, outputDimensions, labels, negativeLabelId, thresholds,
            parameters, detector } = JSON.parse(raw.toString('utf8'));
          if (modelVersion !== LAB_MODEL_VERSION) throw new Error('Versión V1 inesperada.');
          const payload = JSON.stringify({ format, kind, modelVersion, preprocessing, inputDimensions, outputDimensions, labels,
            negativeLabelId, thresholds, parameters, detector });
          response.setHeader('Content-Type', 'application/json; charset=utf-8');
          response.setHeader('Content-Length', Buffer.byteLength(payload));
          response.end(request.method === 'HEAD' ? undefined : payload);
        } catch {
          response.statusCode = 503;
          response.end();
        }
      });
    },
  };
}
