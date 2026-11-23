import { execFileSync } from 'node:child_process';
import { constants, existsSync } from 'node:fs';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fairManifest, fairRoot, readFairBuild, sha256 } from './servidor-feria.mjs';

const launcher = 'INICIAR_SEÑAVERSE.bat';
const server = 'scripts/servidor-feria.mjs';
const output = join(fairRoot, 'dist-feria');

async function packageFairBuild() {
  const revision = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: fairRoot, encoding: 'utf8' }).trim();
  const version = process.argv[2] ?? `6.6-${revision}`;
  if (!/^[a-zA-Z0-9][a-zA-Z0-9.-]{0,49}$/.test(version) || process.argv.length > 3) throw new Error('Indica una única etiqueta de versión válida.');
  const name = `SenaVerse-feria-${version}`;
  const folder = join(output, name);
  const archive = join(output, `${name}.zip`);
  if ([folder, archive, `${archive}.sha256`].some(existsSync)) throw new Error('Ya existe esa versión. Conserva la copia anterior y elige otra etiqueta.');

  const files = await readFairBuild();
  await mkdir(output, { recursive: true });
  await mkdir(folder);
  const hashes = {};
  for (const key of [...files.keys()].sort()) {
    const path = join(folder, 'dist', key);
    await mkdir(dirname(path), { recursive: true });
    const content = await readFile(files.get(key).path);
    await writeFile(path, content, { flag: 'wx' });
    hashes[key] = sha256(content);
  }
  await mkdir(join(folder, 'scripts'));
  for (const path of [launcher, server]) {
    await copyFile(join(fairRoot, path), join(folder, path), constants.COPYFILE_EXCL);
  }
  await writeFile(join(folder, fairManifest), JSON.stringify({ schema: 1, version, revisionBase: revision, files: hashes }, null, 2) + '\n', { flag: 'wx' });
  await writeFile(join(folder, 'LEEME.txt'), [
    `SeñaVerse · Versión de feria ${version}`, '',
    'Extrae todos los archivos a una carpeta local. Instala previamente Node.js 22 o posterior y Edge o Chrome.',
    `Abre ${launcher} y deja la consola abierta. La aplicación quedará en http://127.0.0.1:4173/.`,
    'El inicio automático usa un perfil de navegador dedicado. Conserva el mismo navegador, perfil y URL para continuar.',
    `Para validar los archivos ejecuta: .\\${launcher} --verificar`,
    'Alternativa manual: node scripts/servidor-feria.mjs --solo-servidor',
    'Abre la URL anterior en un perfil independiente. Las láminas del MINEDU requieren conexión externa.',
    'Prueba físicamente la webcam antes de mostrar reconocimiento. Aprender y Situaciones ofrecen ejercicios sin cámara.', '',
  ].join('\r\n'), { flag: 'wx' });
  await readFairBuild(folder);
  execFileSync('tar.exe', ['-a', '-c', '-f', archive, '-C', folder, '.'], { stdio: 'inherit' });
  await writeFile(`${archive}.sha256`, `${sha256(await readFile(archive))}  ${name}.zip\n`, { flag: 'wx' });
  console.log(`Paquete de feria: ${archive}`);
}

packageFairBuild().catch(error => {
  console.error(`No se pudo empaquetar SeñaVerse: ${error.message}`);
  process.exitCode = 1;
});
