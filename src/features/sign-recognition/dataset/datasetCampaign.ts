import type { DatasetSample, SampleSummary } from './datasetTypes.ts';

export const partitions = { train: 'Entrenamiento', validation: 'Validación', test: 'Prueba final' };
export type DatasetPartition = keyof typeof partitions;
export type CampaignSession = 1 | 2;
export type RecordedHand = 'left' | 'right' | 'both' | 'none';
export const recordedHands = { left: 'Izquierda', right: 'Derecha', both: 'Ambas', none: 'Sin manos' };
export const negativeSubtypes = {
  'index-still': 'Índice inmóvil',
  'index-straight': 'Movimiento recto del índice',
  'partial-turn': 'Giro incompleto',
  'pinch-still': 'Pinza inmóvil',
  'pinch-wrong-direction': 'Pinza con dirección incorrecta',
  'number-like': 'Postura parecida a un número',
  'mucho-like': 'Movimiento similar a Mucho',
  'con-like': 'Movimiento similar a Con',
  transition: 'Transición entre señas',
  'unknown-gesture': 'Gesto ajeno al catálogo',
  'no-hands': 'Ausencia de manos',
};
export type NegativeSubtype = keyof typeof negativeSubtypes;
export type CampaignCapture = { slotId: string; session: CampaignSession; hand: RecordedHand; negativeSubtype?: NegativeSubtype; notes?: string };
export type CampaignSlot = {
  id: string; session: CampaignSession; labelId: string; title: string; durationMs: number; hands: 0 | 1 | 2;
  subtype?: NegativeSubtype; targetHand?: RecordedHand; guidance?: string;
};

const names = ['Uno', 'Dos', 'Tres', 'Cuatro', 'Cinco', 'Sí', 'Nada', 'Mucho', 'Solo', 'Con'];
const dynamicGuidance: Record<number, string> = {
  5: 'Deja visibles el inicio, la flexión y el retorno de Sí. Anota si alguna fase quedó incompleta.',
  6: 'Registra el movimiento completo y anota su dirección. La dirección geométrica por sí sola no valida Nada en LSP.',
  8: 'Registra el giro completo del índice, desde la salida de la postura inicial hasta el final.',
};
const plannedNegatives: Record<CampaignSession, NegativeSubtype[]> = {
  1: ['index-still', 'index-straight', 'pinch-still', 'mucho-like', 'transition', 'no-hands'],
  2: ['partial-turn', 'pinch-wrong-direction', 'con-like', 'number-like', 'unknown-gesture', 'no-hands'],
};

export const campaignSlots: CampaignSlot[] = ([1, 2] as const).flatMap(session => [
  ...names.map((title, index): CampaignSlot => {
    const targetHand = index < 5 ? (index + session) % 2 ? 'right' : 'left' : undefined;
    return { id: `${session}-lsp-${index + 1}`, session, labelId: `LSP-${String(index + 1).padStart(3, '0')}`,
      title: targetHand ? `${title} · ${recordedHands[targetHand]}` : title,
      hands: index === 7 || index === 9 ? 2 : 1, durationMs: index < 5 ? 2000 : index === 7 || index === 9 ? 3000 : 2500,
      targetHand, guidance: dynamicGuidance[index] };
  }),
  ...plannedNegatives[session].map((subtype, index): CampaignSlot => ({
    id: `${session}-neg-${index + 1}`, session, labelId: 'NEG-001', title: negativeSubtypes[subtype], subtype, durationMs: 2500,
    hands: subtype === 'no-hands' ? 0 : index < (session === 1 ? 3 : 2) ? 1 : 2,
  })),
]);
export const campaignSlotsById = new Map(campaignSlots.map(slot => [slot.id, slot]));

export function availableSubtypes(hands: CampaignSlot['hands']): NegativeSubtype[] {
  return (Object.keys(negativeSubtypes) as NegativeSubtype[]).filter(subtype => {
    if (hands === 0) return subtype === 'no-hands';
    if (subtype === 'no-hands') return false;
    if (['index-still', 'index-straight', 'partial-turn', 'pinch-still', 'pinch-wrong-direction'].includes(subtype)) return hands === 1;
    if (subtype === 'mucho-like' || subtype === 'con-like') return hands === 2;
    return true;
  });
}

export function campaignCaptureMatches(capture: CampaignCapture, labelId: string, hands: number, durationMs: number) {
  const slot = campaignSlotsById.get(capture.slotId);
  return !!slot && slot.session === capture.session && slot.labelId === labelId && slot.hands === hands && slot.durationMs === durationMs
    && (hands === 0 ? capture.hand === 'none' : hands === 2 ? capture.hand === 'both' : ['left', 'right'].includes(capture.hand))
    && (slot.subtype ? !!capture.negativeSubtype && availableSubtypes(slot.hands).includes(capture.negativeSubtype) : capture.negativeSubtype === undefined);
}

export function campaignSlotState(samples: SampleSummary[], slot: CampaignSlot) {
  const attempts = samples.filter(sample => sample.captureMetadata.campaign?.slotId === slot.id);
  if (attempts.some(sample => sample.operatorReviewed === true && sample.reviewStatus === 'accepted' && !sample.excludedFromV2
    && (!slot.targetHand || sample.captureMetadata.campaign?.hand === slot.targetHand))) return 'Revisada y aceptada';
  if (attempts.some(sample => sample.reviewStatus !== 'rejected' && sample.qualityMetrics.sufficient && !sample.excludedFromV2
    && (!slot.targetHand || sample.captureMetadata.campaign?.hand === slot.targetHand))) return 'Guardada · falta revisión';
  return attempts.length ? 'Repetir' : 'Pendiente';
}

export function campaignHandWarnings(sample: DatasetSample) {
  const { campaign } = sample.captureMetadata;
  if (!campaign) return [];
  const expected = campaignSlotsById.get(campaign.slotId)?.targetHand;
  const observed = new Set(sample.frames.filter(frame => frame.handCount === 1).map(frame =>
    frame.hands[0].handedness[0]?.categoryName.toLowerCase()).filter(hand => hand === 'left' || hand === 'right'));
  return [
    ...(expected && expected !== campaign.hand ? ['La mano declarada pertenece a otra toma de la guía.'] : []),
    ...(observed.size > 1 && ['left', 'right'].includes(campaign.hand) ? ['MediaPipe alternó la lateralidad. Revisa un posible cambio de mano o de clasificación.'] : []),
    ...(observed.size === 1 && (campaign.hand === 'left' || campaign.hand === 'right') && !observed.has(campaign.hand)
      ? ['La lateralidad del detector y la mano declarada difieren. Revisa la toma.'] : []),
  ];
}
