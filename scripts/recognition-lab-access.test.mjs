import assert from 'node:assert/strict';
import { test } from 'node:test';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { createServer } from 'vite';
import { LAB_FLAG, LAB_MODEL_PATH, LAB_MODEL_VERSION } from '../src/features/sign-recognition/labProtocol.ts';

const configFile = resolve('vite.config.ts');
const fixturePaths = ['ml/datasets/fixture.json', 'ml/artifacts/fixture.json',
  'ml/reports/local/fixture.json', 'ml/.venv/fixture.json'];

async function fixture(work) {
  const base = await realpath(tmpdir());
  const directory = await realpath(await mkdtemp(join(base, 'senaverse-lab-access-')));
  assert.match(relative(base, directory), /^senaverse-lab-access-[^/\\]+$/);
  const saved = process.env[LAB_FLAG];
  delete process.env[LAB_FLAG];
  try { return await work(directory); }
  finally {
    if (saved === undefined) delete process.env[LAB_FLAG]; else process.env[LAB_FLAG] = saved;
    await rm(directory, { recursive: true, force: true, maxRetries: 3 });
  }
}

async function withServer(directory, settings, work) {
  const server = await createServer({
    configFile, envDir: directory, logLevel: 'silent',
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { host: '127.0.0.1', port: 0, ws: false, watch: null },
    ...settings,
  });
  try {
    await server.listen();
    const origin = 'http://127.0.0.1:' + server.httpServer.address().port;
    await work(origin);
  } finally { await server.close(); }
}

test('the model route requires the explicit development flag and rejects production mode', async () => {
  await fixture(async directory => {
    await writeFile(join(directory, '.env.example'), LAB_FLAG + '=true\n');
    await withServer(directory, { root: directory }, async origin => {
      assert.equal((await fetch(origin + '/' + LAB_MODEL_PATH)).status, 404);
    });
    process.env[LAB_FLAG] = 'true';
    await withServer(directory, { root: directory, mode: 'production' }, async origin => {
      assert.equal((await fetch(origin + '/' + LAB_MODEL_PATH)).status, 404);
    });
  });
});

test('missing or unverified V1 returns 503 while original private paths are blocked', async () => {
  await fixture(async directory => {
    await writeFile(join(directory, '.env.development.local'), LAB_FLAG + '=true\n');
    for (const path of fixturePaths) {
      await mkdir(join(directory, path, '..'), { recursive: true });
      await writeFile(join(directory, path), '{"private":"synthetic"}');
    }
    await withServer(directory, { root: directory }, async origin => {
      assert.equal((await fetch(origin + '/' + LAB_MODEL_PATH)).status, 503);
      await mkdir(join(directory, 'ml/artifacts/hito-3'), { recursive: true });
      await writeFile(join(directory, 'ml/artifacts/hito-3/model.json'), '{"private":"unapproved"}');
      assert.equal((await fetch(origin + '/' + LAB_MODEL_PATH)).status, 503);
      for (const path of [...fixturePaths, 'ml/artifacts/hito-3/model.json']) {
        assert.equal((await fetch(origin + '/' + path)).status, 403, path);
      }
      const absolute = join(directory, 'ml/datasets/fixture.json').replaceAll('\\', '/');
      assert.equal((await fetch(origin + '/@fs/' + absolute)).status, 403);
    });
  });
});

test('the verified local V1 is published only as an inference projection', {
  skip: !existsSync('ml/artifacts/hito-3/model.json') && 'El artefacto V1 se conserva localmente.',
}, async () => {
  await fixture(async directory => {
    await writeFile(join(directory, '.env.development.local'), LAB_FLAG + '=true\n');
    await withServer(directory, {}, async origin => {
      const url = origin + '/' + LAB_MODEL_PATH;
      const response = await fetch(url);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      const model = await response.json();
      assert.deepEqual(Object.keys(model).sort(), [
        'format', 'kind', 'modelVersion', 'preprocessing', 'inputDimensions', 'outputDimensions',
        'labels', 'negativeLabelId', 'thresholds', 'parameters', 'detector',
      ].sort());
      assert.equal(model.modelVersion, LAB_MODEL_VERSION);
      assert.equal(model.parameters.weights.length, 10);
      assert.equal((await fetch(url, { method: 'HEAD' })).status, 200);
      assert.equal((await fetch(url, { method: 'POST' })).status, 405);
      assert.equal((await fetch(origin + '/ml/artifacts/hito-3/model.json')).status, 403);
    });
  });
});
