import assert from 'node:assert/strict';

export async function checkLibrary({ send, evaluate, requests }, origin, until) {
  const key = 'senaverse-student-profile-v1';
  const progressKey = 'senaverse-student-progress-v1';
  const lesson = '/academia/unidad/2/leccion/numeros';
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `
    if (!sessionStorage.getItem('library-seeded')) {
      sessionStorage.setItem('library-seeded', 'yes');
      localStorage.setItem('${key}', JSON.stringify({ version: 1, displayName: 'Luz', bio: 'Perfil de prueba', avatarId: 'cat' }));
      localStorage.setItem('senaverse-library-saved-v1', JSON.stringify(['uno', 'LSP-001', 'si']));
      localStorage.setItem('${progressKey}', JSON.stringify({ version: 1, consultedSignIds: ['uno'], activities: [] }));
    }
  ` });

  const list = '/biblioteca';
  const result = count => until(`${count} resultados`, () => evaluate(`document.querySelector('.library-result-toolbar [role=status]')
    ?.textContent.startsWith(${JSON.stringify(`${count} ${count === 1 ? 'resultado' : 'resultados'}`)})`));
  const named = (selector, label) => evaluate(`Array.from(document.querySelectorAll(${JSON.stringify(selector)}))
    .find(node => node.textContent.trim() === ${JSON.stringify(label)}).click()`);
  const aria = label => evaluate(`document.querySelector(${JSON.stringify(`[aria-label="${label}"]`)}).click()`);
  const toggle = index => evaluate(`document.querySelectorAll('.library-refinements input')[${index}].click()`);
  const search = value => evaluate(`(() => {
    const input = document.querySelector('#library-search');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ${JSON.stringify(value)});
    input.dispatchEvent(new Event('input', { bubbles: true }));
  })()`);
  const dialog = title => until(`ficha de ${title}`, () => evaluate(`document.querySelector('.library-dialog[open] h2')?.textContent === ${JSON.stringify(title)}`));
  const clear = () => named('.library-result-toolbar button', 'Limpiar filtros');
  const modelRequests = () => requests.filter(url => url.endsWith('/models/lsp-v1.json'));
  const reload = async () => {
    const timeOrigin = await evaluate('performance.timeOrigin');
    await send('Page.reload');
    await until('nuevo documento', () => evaluate(`performance.timeOrigin !== ${timeOrigin}`));
  };
  const open = word => evaluate(`(() => {
    const link = document.querySelector(${JSON.stringify(`[aria-label="Ver seña: ${word}"]`)});
    link.focus();
    link.click();
  })()`);

  await send('Page.navigate', { url: origin + list });
  await result(35);
  assert.equal(modelRequests().length, 0);
  await search('MAMÁ');
  await result(1);
  assert.equal(await evaluate('document.querySelector(".library-card h2").textContent'), 'Mamá');
  assert.match(await evaluate('document.querySelector(".library-card").textContent'), /Abrir lámina.*Sin reconocimiento/s);
  await clear();
  await named('.library-filters button', '123Números');
  await result(11);
  await toggle(0);
  await result(5);
  await toggle(1);
  await result(1);
  assert.equal(await evaluate('document.querySelector(".library-card h2").textContent'), 'Uno');
  await open('Uno');
  await dialog('Uno');
  assert.match(await evaluate('location.search'), /sena=LSP-001/);
  assert.match(await evaluate('document.querySelector(".library-meaning a").href'), /minedu\.gob\.pe.*#page=14$/);
  assert.match(await evaluate('document.querySelector(".library-sign-facts").textContent'), /Estática.*Una.*Pendiente.*V1/s);
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await until('cierre por teclado', () => evaluate('!document.querySelector(".library-dialog[open]") && !location.search'));
  assert.equal(await evaluate('document.activeElement.getAttribute("aria-label")'), 'Ver seña: Uno');
  await aria('Uno en favoritos');
  await result(0);
  assert.equal(await evaluate(`JSON.parse(localStorage.getItem('${key}')).displayName`), 'Luz');
  await clear();
  await search('SI');
  await toggle(1);
  await result(1);
  assert.equal(await evaluate('document.querySelector(".library-card h2").textContent'), 'Sí');
  await aria('Sí en favoritos');
  await reload();
  await result(35);
  await toggle(1);
  await result(0);
  assert.deepEqual(await evaluate(`JSON.parse(localStorage.getItem('${key}')).favoriteSignIds`), []);
  await clear();
  await search('cero');
  await open('Cero');
  await dialog('Cero');
  assert.equal(await evaluate(`Array.from(document.querySelectorAll('.library-dialog a')).some(link => link.pathname.startsWith('/camara'))`), false);
  assert.match(await evaluate('document.querySelector(".library-dialog").textContent'), /repasar la seña/);
  await named('.library-dialog-save', 'Guardar en favoritos');
  await until('favorito guardado', () => evaluate(`JSON.parse(localStorage.getItem('${key}')).favoriteSignIds.includes('cero')`));
  await reload();
  await dialog('Cero');
  assert.equal(await evaluate('document.querySelector(".library-dialog-save").getAttribute("aria-pressed")'), 'true');
  await aria('Cerrar ficha');
  await until('cierre de Cero', () => evaluate('!document.querySelector(".library-dialog[open]")'));

  for (const id of ['NEG-001', 'invalida']) {
    await send('Page.navigate', { url: origin + list + '?sena=' + id });
    await until('aviso de ficha inválida', () => evaluate(`location.search === ${JSON.stringify('?sena=' + id)} && !!document.querySelector('.library-invalid')`));
    assert.equal(await evaluate('!!document.querySelector(".library-dialog[open]")'), false);
  }
  await send('Page.navigate', { url: origin + lesson });
  await until('lección de números', () => evaluate('document.querySelector("#study-step-title")?.textContent.includes("Objetivos")'));
  await named('.lesson-sequence button', 'Comenzar lección');
  await until('observación en Aprender', () => evaluate('document.querySelector("#study-step-title")?.textContent.includes("Observa")'));
  await aria('Ver ficha de Tres en Biblioteca');
  await dialog('Tres');
  assert.equal(await evaluate(`JSON.parse(localStorage.getItem('${progressKey}')).lessonStudy.numeros.steps.inicio.complete`), true);
  await named('.library-dialog-actions a', 'Volver a la lección');
  await until('regreso con progreso', () => evaluate('document.querySelector("#study-step-title")?.textContent.includes("Observa")'));
  assert.match(await evaluate('document.querySelector(".lesson-sequence-outline").textContent'), /1 de 10/);
  await evaluate('document.querySelector(".theme-toggle").click()');
  await until('tema oscuro', () => evaluate('document.documentElement.dataset.theme === "dark"'));
  await aria('Ver ficha de Tres en Biblioteca');
  await dialog('Tres');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, mobile: true, deviceScaleFactor: 1 });
  assert.equal(await evaluate('document.documentElement.scrollWidth === innerWidth'), true);
  assert.equal(await evaluate('document.querySelector(".library-dialog").scrollWidth === document.querySelector(".library-dialog").clientWidth'), true);
  await send('Emulation.clearDeviceMetricsOverride');
  await named('.library-dialog-actions a', 'Practicar con cámara');
  await until('Práctica dirigida desde Biblioteca', () => evaluate('document.querySelector(".practice-select-field select")?.value === "LSP-003"'));
  assert.equal(await evaluate('window.studentAttempts'), 0);
  assert.equal(await evaluate('window.labWorkers.length'), 0);
  await until('respuesta del modelo local', () => evaluate('document.querySelector(".practice-camera-button")?.disabled === false'));
  assert.ok(modelRequests().length > 0);
  await send('Page.navigate', { url: origin + '/camara/libre?sena=cero' });
  await until('destino sin clase rechazado', () => evaluate('document.body?.textContent.includes("fuera del catálogo")'));
  assert.equal(await evaluate('document.querySelector(".practice-select-field select").value'), '');
  assert.equal(await evaluate('window.studentAttempts'), 0);

  console.log(JSON.stringify({ catalog: 35, combinedFilters: true, profileMigration: true, deepLink: true,
    keyboard: true, directedTarget: 'LSP-003', cameraOpened: false, resumeLesson: true, mobileDark: true }));
}
