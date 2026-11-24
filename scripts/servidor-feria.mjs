import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createReadStream, existsSync } from 'node:fs';
import { lstat, mkdir, readFile, readdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';

export const fairRoot = fileURLToPath(new URL('..', import.meta.url));
export const fairHost = '127.0.0.1';
export const fairPort = 4173;
export const fairManifest = 'VERSION-FERIA.json';

const wasmNames = ['vision_wasm_internal', 'vision_wasm_module_internal'];
const buildRequired = [
  'index.html', 'favicon.png', 'icons.svg', 'images/logo-senaverse.png', 'fonts/nunito-latin-variable.ttf',
  'models/lsp-v1.json', 'models/hand_landmarker.task', 'mediapipe/wasm/version.json',
  ...wasmNames.flatMap(name => [`mediapipe/wasm/${name}.js`, `mediapipe/wasm/${name}.wasm`]),
];
const buildExtras = new Set(['fonts/OFL-Nunito.txt', 'models/README.md']);
const generatedAsset = /^assets\/[A-Za-z0-9][A-Za-z0-9_.-]*-[A-Za-z0-9_-]{8}\.(?:js|css)$/;
const educationalMedia = /^media\/signs\/lsp-0(?:0[1-9]|10)-[a-z]+\.(?:jpeg|mp4)$/;
const illustrationDirectory = 'images/illustrations';
const illustrationGroups = {
  aprender: ['unidad-01-primeros-pasos', 'unidad-02-numeros', 'unidad-03-saludos', 'unidad-04-expresiones', 'unidad-05-entorno', 'unidad-06-evaluacion'],
  situaciones: ['situacion-01-tienda', 'situacion-02-comida', 'situacion-03-preguntas', 'situacion-04-actividad', 'situacion-05-utiles', 'situacion-06-cantidad'],
  minijuegos: ['juego-01-memoria', 'juego-02-adivina', 'juego-03-contrarreloj', 'juego-04-desafio-senas', 'juego-05-relaciona'],
  cabeceras: ['cabecera-presentacion', 'cabecera-ruta-aprendizaje', 'cabecera-centro-practica'],
  recursos: ['recurso-comunicacion-visual'],
};
const educationalIllustrations = new Set(Object.entries(illustrationGroups).flatMap(([group, files]) =>
  files.map(file => `${illustrationDirectory}/${group}/${file}.webp`)));
const buildDirectories = new Set(['assets', 'images', 'fonts', 'models', 'mediapipe', 'mediapipe/wasm', 'media', 'media/signs',
  illustrationDirectory, ...Object.keys(illustrationGroups).map(group => `${illustrationDirectory}/${group}`)]);
const publicView = new Set(['', 'panel', 'presentacion', 'academia', 'biblioteca', 'camara', 'simulador', 'minijuegos', 'progreso', 'perfil', 'leccion']);
const contentTypes = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.wasm': 'application/wasm', '.task': 'application/octet-stream',
  '.ttf': 'font/ttf', '.png': 'image/png', '.svg': 'image/svg+xml', '.md': 'text/plain; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
  '.jpeg': 'image/jpeg', '.mp4': 'video/mp4', '.webp': 'image/webp',
};

export function sha256(content) {
  return createHash('sha256').update(content).digest('hex');
}

async function enumerateBuild(directory, relative = '') {
  const files = new Map();
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const name = relative + entry.name;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!buildDirectories.has(name)) throw new Error(`Carpeta no esperada en dist: ${name}.`);
      for (const [key, file] of await enumerateBuild(path, `${name}/`)) files.set(key, file);
    } else {
      if (!entry.isFile() || !(buildRequired.includes(name) || buildExtras.has(name) || generatedAsset.test(name)
        || educationalMedia.test(name) || educationalIllustrations.has(name))) {
        throw new Error(`Archivo no esperado en dist: ${name}. Genera un build limpio o recupera el paquete verificado.`);
      }
      const metadata = await lstat(path);
      if (!metadata.isFile() || !metadata.size) throw new Error(`Archivo inválido o vacío en dist: ${name}.`);
      files.set(name, { path, size: metadata.size });
    }
  }
  return files;
}

export async function readFairBuild(root = fairRoot) {
  const directory = join(root, 'dist');
  const metadata = await lstat(directory).catch(error => {
    if (error.code !== 'ENOENT') throw error;
    throw new Error('Falta dist. Extrae el paquete de la feria o ejecuta npm.cmd run build en el repositorio.');
  });
  if (!metadata.isDirectory()) throw new Error('dist debe ser una carpeta local del paquete.');
  const files = await enumerateBuild(directory);
  for (const name of buildRequired) {
    if (!files.has(name)) throw new Error(`Falta dist/${name}. Recupera el paquete de la feria o vuelve a compilar.`);
  }
  const index = await readFile(files.get('index.html').path, 'utf8');
  const entryFiles = [...index.matchAll(/(?:href|src)="\/(assets\/[A-Za-z0-9_-]+\.(?:js|css))"/g)].map(match => match[1]);
  if (!entryFiles.some(name => name.endsWith('.js')) || !entryFiles.some(name => name.endsWith('.css'))
    || entryFiles.some(name => !files.has(name)) || ![...files.keys()].some(name => /^assets\/handDetection\.worker-/.test(name))) {
    throw new Error('El build de producción está incompleto. Vuelve a compilar o extrae el paquete verificado.');
  }
  const manifestPath = join(root, fairManifest);
  const stored = await readFile(manifestPath, 'utf8').catch(error => {
    if (error.code !== 'ENOENT') throw error;
    return null;
  });
  if (stored !== null) {
    const manifest = JSON.parse(stored);
    if (manifest?.schema !== 1 || !manifest.files || Object.keys(manifest.files).length !== files.size) {
      throw new Error('El inventario del paquete no coincide con dist. Extrae de nuevo la copia verificada.');
    }
    for (const [name, file] of files) {
      if (manifest.files[name] !== sha256(await readFile(file.path))) {
        throw new Error(`La verificación SHA-256 falló en dist/${name}. Extrae de nuevo la copia verificada.`);
      }
    }
  }
  return files;
}

function parseVideoRange(header, size) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header);
  if (!match || !(match[1] || match[2])) return null;
  const start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
  const end = match[1] && match[2] ? Math.min(size - 1, Number(match[2])) : size - 1;
  return Number.isSafeInteger(start) && Number.isSafeInteger(end) && start < size && start <= end ? { start, end } : null;
}

export async function serveFairBuild(files, port = fairPort) {
  let authority;
  const server = createServer(async (request, response) => {
    function reject(status, message) {
      response.writeHead(status, { 'Content-Type': contentTypes['.txt'], 'Cache-Control': 'no-store' });
      response.end(message);
    }
    if (request.headers.host !== authority || !request.url?.startsWith('/') || request.url.startsWith('//')) {
      return reject(400, 'Utiliza la dirección local que informa el servidor.');
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.setHeader('Allow', 'GET, HEAD');
      return reject(405, 'Método no permitido.');
    }
    let route;
    try { route = decodeURIComponent(new URL(request.url, `http://${authority}`).pathname).slice(1); }
    catch { return reject(400, 'Ruta inválida.'); }
    if (route.includes('\\') || route.split('/').some(segment => segment === '..' || segment.startsWith('.'))) {
      return reject(404, 'Recurso no disponible.');
    }
    let name = route || 'index.html';
    if (!files.has(name) && request.headers.accept?.includes('text/html')
      && publicView.has(route.split('/')[0]) && !extname(route)) name = 'index.html';
    const file = files.get(name);
    if (!file) return reject(404, 'Recurso no disponible.');
    const extension = extname(name);
    const headers = { 'Content-Type': contentTypes[extension], 'Content-Length': file.size,
      'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' };
    let range;
    if (extension === '.mp4') {
      headers['Accept-Ranges'] = 'bytes';
      if (request.method === 'GET' && request.headers.range) {
        range = parseVideoRange(request.headers.range, file.size);
        if (!range) {
          response.setHeader('Content-Range', `bytes */${file.size}`);
          return reject(416, 'Tramo de video no disponible.');
        }
        headers['Content-Range'] = `bytes ${range.start}-${range.end}/${file.size}`;
        headers['Content-Length'] = range.end - range.start + 1;
      }
    }
    response.writeHead(range ? 206 : 200, headers);
    if (request.method === 'HEAD') return response.end();
    await pipeline(createReadStream(file.path, range), response).catch(error => {
      if (error.code !== 'ERR_STREAM_PREMATURE_CLOSE') console.error(`No se pudo servir dist/${name}: ${error.message}`);
    });
  });
  await new Promise((accept, reject) => {
    server.once('error', reject);
    server.listen(port, fairHost, () => {
      authority = `${fairHost}:${server.address().port}`;
      server.removeListener('error', reject);
      accept();
    });
  });
  return server;
}

export function parseFairOptions(args) {
  const options = { port: fairPort, profile: 'feria', browser: 'auto', verify: false, open: true };
  for (const arg of args) {
    if (arg === '--verificar') options.verify = true;
    else if (arg === '--solo-servidor') options.open = false;
    else if (/^--puerto=\d{4,5}$/.test(arg)) options.port = Number(arg.slice('--puerto='.length));
    else if (/^--perfil=[a-z0-9][a-z0-9-]{0,31}$/.test(arg)) options.profile = arg.slice('--perfil='.length);
    else if (/^--navegador=(edge|chrome)$/.test(arg)) options.browser = arg.slice('--navegador='.length);
    else throw new Error(`Opción inválida: ${arg}. Usa --verificar, --solo-servidor, --puerto=4174, --navegador=edge|chrome o --perfil=ensayo.`);
  }
  if (options.port < 1024 || options.port > 65535) throw new Error('El puerto debe estar entre 1024 y 65535.');
  return options;
}

export function findFairBrowser(preferred, environment = process.env, exists = existsSync) {
  const products = preferred === 'auto' ? ['edge', 'chrome'] : [preferred];
  const directories = [environment.LOCALAPPDATA, environment.ProgramFiles, environment['ProgramFiles(x86)'], environment.ProgramW6432].filter(Boolean);
  const names = { edge: ['Microsoft', 'Edge', 'Application', 'msedge.exe'], chrome: ['Google', 'Chrome', 'Application', 'chrome.exe'] };
  for (const product of products) {
    for (const directory of directories) {
      const executable = join(directory, ...names[product]);
      if (exists(executable)) return { product, executable };
    }
  }
}

export function fairBrowserArguments(profileDirectory, url) {
  return [`--user-data-dir=${profileDirectory}`, '--no-first-run', '--no-default-browser-check', '--new-window', url];
}

async function openFairBrowser(options, url) {
  const browser = findFairBrowser(options.browser);
  if (!browser || !process.env.LOCALAPPDATA) {
    throw new Error('No se encontró Edge o Chrome en las rutas habituales. Abre la dirección en un perfil separado del navegador.');
  }
  const profile = join(process.env.LOCALAPPDATA, 'SenaVerse', 'Perfiles', browser.product, `demo-${options.profile}`);
  await mkdir(profile, { recursive: true });
  const child = spawn(browser.executable, fairBrowserArguments(profile, url), { detached: true, stdio: 'ignore' });
  await new Promise((accept, reject) => {
    child.once('spawn', accept);
    child.once('error', reject);
  });
  child.unref();
  console.log(`Perfil de exposición (${browser.product}): ${profile}`);
}

async function main() {
  const options = parseFairOptions(process.argv.slice(2));
  const files = await readFairBuild();
  console.log(`Producción verificada: ${files.size} archivos en dist.`);
  if (options.verify) return;
  let server;
  try { server = await serveFairBuild(files, options.port); }
  catch (error) {
    if (error.code === 'EADDRINUSE') throw new Error(`El puerto ${options.port} está ocupado. Si ya ejecutas SeñaVerse, usa esa ventana. Como alternativa, inicia con --puerto=4174.`);
    throw error;
  }
  server.on('error', error => console.error(`Error del servidor local: ${error.message}`));
  const url = `http://${fairHost}:${options.port}/`;
  console.log(`SeñaVerse está lista en ${url}`);
  console.log('Deja abierta esta ventana. Para detener el servidor, pulsa Ctrl+C.');
  if (options.open) await openFairBrowser(options, url).catch(error => {
    console.error(`No se pudo abrir el navegador: ${error.message}\nServidor disponible en ${url}`);
  });
}

if (process.argv[1] && resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase()) {
  main().catch(error => {
    console.error(`SeñaVerse no pudo iniciar: ${error.message}`);
    process.exitCode = 1;
  });
}
