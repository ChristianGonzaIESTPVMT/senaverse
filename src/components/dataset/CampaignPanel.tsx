import { availableSubtypes, campaignSlots, campaignSlotsById, campaignSlotState, negativeSubtypes, partitions,
  type CampaignCapture, type CampaignSession, type DatasetPartition, type NegativeSubtype, type RecordedHand } from '../../features/sign-recognition/dataset/datasetCampaign';
import type { DatasetParticipant, SampleSummary } from '../../features/sign-recognition/dataset/datasetTypes';

export type CampaignDraft = Omit<CampaignCapture, 'hand'> & { hand: RecordedHand | '' };

export function CampaignPanel({ participant, samples, session, draft, disabled, onPartition, onSession, onDraft }: {
  participant: DatasetParticipant;
  samples: SampleSummary[];
  session: CampaignSession | '';
  draft?: CampaignDraft;
  disabled: boolean;
  onPartition: (partition: DatasetPartition) => void;
  onSession: (session: CampaignSession | '') => void;
  onDraft: (draft: CampaignDraft) => void;
}) {
  const slots = campaignSlots.filter(slot => slot.session === session);
  const selected = draft && campaignSlotsById.get(draft.slotId);
  const reviewed = campaignSlots.filter(slot => campaignSlotState(samples, slot) === 'Revisada y aceptada').length;
  const sessionReviewed = slots.filter(slot => campaignSlotState(samples, slot) === 'Revisada y aceptada').length;

  return <section className="dataset-panel" aria-labelledby="dataset-campaign-title">
    <h2 id="dataset-campaign-title">Guía de capturas V2</h2>
    <p className="dataset-muted">Usa este ID para ambas sesiones de la misma persona. Elige su partición antes de guardar la primera toma.</p>
    <label className="dataset-field">Partición de {participant.id}
      <select value={participant.partition ?? ''} disabled={disabled || samples.length > 0} onChange={event => {
        if (event.target.value) onPartition(event.target.value as DatasetPartition);
      }}>
        <option value="">Sin asignar</option>
        {Object.entries(partitions).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
    </label>
    {samples.length > 0 && !participant.partition && <p className="dataset-muted">Este ID tiene tomas anteriores. Usa un identificador nuevo para cada persona nueva.</p>}
    <label className="dataset-field">Modo de captura
      <select value={session} disabled={disabled || !participant.partition} onChange={event => onSession(event.target.value ? Number(event.target.value) as CampaignSession : '')}>
        <option value="">Captura manual</option><option value="1">Guía · sesión 1</option><option value="2">Guía · sesión 2</option>
      </select>
    </label>
    {session && <>
      <p><strong>{reviewed} de 32 revisadas y aceptadas</strong> · Sesión {session}: {sessionReviewed} de 16.</p>
      <ol className="dataset-campaign-list">
        {slots.map(slot => <li key={slot.id}>
          <button className="button button-outline" type="button" aria-pressed={draft?.slotId === slot.id} disabled={disabled} onClick={() => onDraft({
            slotId: slot.id, session, hand: slot.hands === 0 ? 'none' : slot.hands === 2 ? 'both' : '',
            ...(slot.subtype && { negativeSubtype: slot.subtype }),
          })}>{slot.title}</button>
          <span>{campaignSlotState(samples, slot)}</span>
        </li>)}
      </ol>
      {selected && draft && <fieldset className="dataset-campaign-fields" disabled={disabled}>
        <legend>{selected.title} · {selected.durationMs} ms</legend>
        {selected.hands === 1 && <label className="dataset-field">Mano realmente utilizada
          <select value={draft.hand} onChange={event => onDraft({ ...draft, hand: event.target.value as CampaignDraft['hand'] })}>
            <option value="">Elige la mano</option><option value="left">Izquierda</option><option value="right">Derecha</option>
          </select>
        </label>}
        {selected.subtype && <label className="dataset-field">Subtipo de NEG-001
          <select value={draft.negativeSubtype} onChange={event => onDraft({ ...draft, negativeSubtype: event.target.value as NegativeSubtype })}>
            {availableSubtypes(selected.hands).map(subtype => <option key={subtype} value={subtype}>{negativeSubtypes[subtype]}</option>)}
          </select>
        </label>}
        {selected.guidance && <p className="dataset-muted">{selected.guidance}</p>}
        {draft.negativeSubtype === 'number-like' && <p className="dataset-muted">Usa una configuración ajena al catálogo. Evita formar correctamente cualquiera de los números de Uno a Cinco.</p>}
        {selected.subtype && <p className="dataset-muted">Una seña correctamente ejecutada del catálogo se registra con su propia etiqueta. Para un negativo mantén la mano o manos esperadas, salvo en la toma sin manos.</p>}
        <label className="dataset-field">Anotación del movimiento (opcional)
          <textarea rows={2} maxLength={500} value={draft.notes ?? ''} onChange={event => onDraft({ ...draft, notes: event.target.value })} placeholder="Describe el gesto sin datos personales" />
        </label>
      </fieldset>}
    </>}
  </section>;
}
