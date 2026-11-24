import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import test from 'node:test';
import { units } from '../src/data/curriculum.ts';
import { headerIllustrations } from '../src/data/illustrations.ts';
import { minigames } from '../src/data/minigames.ts';
import { imageDimensions } from '../src/data/profilePhoto.ts';
import { situations } from '../src/data/situations.ts';

test('los catálogos usan las 21 ilustraciones del paquete en sus dimensiones originales', async () => {
  const root = new URL('../', import.meta.url);
  const inventory = JSON.parse(await readFile(new URL('inventario-ilustraciones.json', root), 'utf8'));
  const readme = await readFile(new URL('LEEME-ilustraciones.md', root), 'utf8');
  const reading = units.flatMap(unit => unit.lessons.flatMap(lesson =>
    lesson.plan?.steps.flatMap(step => step.kind === 'reading' && step.illustration ? [{ lesson, step }] : []) ?? []));
  assert.equal(reading.length, 1);
  assert.equal(reading[0].lesson.id, 'comunicacion-visual');
  assert.equal(reading[0].step.references.length, 2);

  const resources = [
    ...units.map(unit => unit.cover),
    ...situations.map(situation => situation.illustrationSrc),
    ...minigames.map(game => game.cover),
    ...Object.values(headerIllustrations),
    reading[0].step.illustration,
  ];
  const names = resources.map(asset => 'public/' + asset.src);
  assert.equal(inventory.length, 21);
  assert.equal(new Set(names).size, 21);
  assert.deepEqual(names, inventory.map(entry => entry.file));
  const directory = new URL('public/images/illustrations/', root);
  const groups = await readdir(directory);
  const shipped = (await Promise.all(groups.map(async group =>
    (await readdir(new URL(group + '/', directory))).map(file => 'public/images/illustrations/' + group + '/' + file)))).flat();
  assert.deepEqual(shipped.sort(), [...names].sort());

  for (const [index, entry] of inventory.entries()) {
    assert.ok(readme.includes(entry.file), entry.id);
    const data = await readFile(new URL(entry.file, root));
    const { width, height } = resources[index];
    assert.deepEqual({ width, height }, { width: entry.width, height: entry.height }, entry.id);
    assert.deepEqual(imageDimensions(data, 'image/webp'), { width, height }, entry.id);
    assert.equal(data.length, entry.bytes, entry.id);
  }
});
