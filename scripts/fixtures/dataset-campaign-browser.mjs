import assert from 'node:assert/strict';

export async function checkDatasetCampaign({ send, evaluate }, origin, until) {
  const wait = (description, expression) => until(description, () => evaluate(expression), 45000);
  const click = (selector, text) => wait(text, `(() => {
    const item = [...document.querySelectorAll(${JSON.stringify(selector)})]
      .find(element => element.textContent.includes(${JSON.stringify(text)}) && !element.disabled);
    if (item) item.click();
    return !!item;
  })()`);
  const choose = (selector, value) => evaluate(`(() => {
    const field = document.querySelector(${JSON.stringify(selector)});
    field.value = ${JSON.stringify(value)};
    field.dispatchEvent(new Event('change', { bubbles: true }));
  })()`);

  await send('Page.navigate', { url: origin + '/herramientas/dataset' });
  await wait('Dataset Studio', '!!document.querySelector("#dataset-participants-title")');
  await evaluate(`document.querySelector('[aria-label="Crear participante anónimo"]').click()`);
  const guide = '[aria-labelledby="dataset-campaign-title"]';
  await wait('guía del participante', `!!document.querySelector('${guide} select')`);
  await choose(`${guide} select`, 'validation');
  await wait('partición guardada', `document.querySelectorAll('${guide} select')[1]?.disabled === false`);
  await choose(`${guide} label:nth-of-type(2) select`, '1');
  await wait('sesión 1 con 16 tomas', 'document.querySelectorAll(".dataset-campaign-list li").length === 16');
  await evaluate('document.querySelector(".dataset-consent input").click()');
  await click('.dataset-consent button', 'Registrar consentimiento');
  await click('.dataset-campaign-list button', 'Ausencia de manos');
  await click('.practice-camera-button', 'Activar cámara');
  await wait('Worker activo sin detecciones', 'window.labWorkers.some(worker => worker.results > 0)');
  await evaluate(`window.studentTrace = { cursor: 0, frames: [{ time: 0,
    result: { landmarks: [], worldLandmarks: [], handedness: [], handednesses: [] } }] }; true`);
  await evaluate(`document.querySelector('[name="dataset-countdown"][value="1"]').click()`);
  await click('.dataset-start', 'Grabar muestra');
  await wait('borrador de la captura', '!!document.querySelector(".dataset-draft")');
  const requiresAcknowledgement = await evaluate(`[...document.querySelectorAll('.dataset-draft label')].some(label =>
    label.textContent.includes('Conservar esta captura de calidad insuficiente'))`);
  if (requiresAcknowledgement) await evaluate(`[...document.querySelectorAll('.dataset-draft label')].find(label =>
    label.textContent.includes('Conservar esta captura de calidad insuficiente')).querySelector('input').click()`);
  await click('.dataset-recording button', 'Guardar como pendiente');
  await click('.dataset-samples tbody button', 'Revisar');
  await wait('detalle de la toma', '!!document.querySelector(".dataset-dialog[open] .dataset-campaign-notes")');
  if (requiresAcknowledgement) {
    assert.equal(await evaluate(`[...document.querySelectorAll('.dataset-dialog[open] button')]
      .find(button => button.textContent.includes('Aceptar muestra')).disabled`), true);
  } else {
    await click('.dataset-dialog[open] button', 'Aceptar muestra');
    await click('.dataset-samples tbody button', 'Revisar');
  }
  await click('.dataset-dialog[open] button', 'Marcar como revisada por operador');
  await wait('avance revisado', `document.querySelector('${guide} strong').textContent.includes('${requiresAcknowledgement ? 0 : 1} de 32')`);
  await choose(`${guide} label:nth-of-type(2) select`, '2');
  await wait('nuevo consentimiento al cambiar de sesión', '!!document.querySelector(".dataset-consent input:not(:checked)")');

  const blocks = '[aria-labelledby="dataset-blocks-title"]';
  await choose(`${blocks} select`, 'session');
  await choose(`${blocks} label:nth-of-type(2) select`, 'P001');
  await click(`${blocks} button`, 'Preparar bloques');
  await wait('descarga numerada', '!!document.querySelector(".dataset-generated-blocks button")');
  const downloaded = await evaluate(`(async () => {
    let url;
    const original = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function() { url = this.href; };
    try {
      document.querySelector('.dataset-generated-blocks button').click();
      const envelope = await (await fetch(url)).json();
      const sample = JSON.parse(envelope.payload).samples[0];
      return { format: envelope.format, count: envelope.sampleCount, status: sample.reviewStatus, reviewed: sample.operatorReviewed,
        campaign: sample.captureMetadata.campaign, hands: sample.qualityMetrics.maximumHands };
    } finally { HTMLAnchorElement.prototype.click = original; }
  })()`);
  assert.deepEqual(downloaded, { format: 'senaverse-block-v1', count: 1, status: requiresAcknowledgement ? 'pending' : 'accepted', reviewed: true,
    campaign: { slotId: '1-neg-6', session: 1, hand: 'none', negativeSubtype: 'no-hands' }, hands: 0 });
  await wait('liberación al cambiar de sesión', 'window.labWorkers.every(worker => worker.ended) && window.labStreams.flatMap(stream => stream.getTracks()).every(track => track.readyState === "ended")');
  console.log(JSON.stringify({ guideSlots: 32, participantPartition: 'validation', consentRenewed: true, fakeCamera: true, replayedEmptyWorkerResults: true,
    sampleReviewStatus: downloaded.status, localBlock: true, cameraReleased: true }));
}
