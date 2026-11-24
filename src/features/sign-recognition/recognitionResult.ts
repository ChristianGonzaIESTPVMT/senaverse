import type { RecognitionSnapshot } from './liveRecognition.ts';

export type RecognitionMode = { type: 'free' } | { type: 'directed'; targetId: string };
export type RecognitionConfirmation = { signId: string; outcome: 'recognized' | 'matched' | 'different' };
export type RecognitionObservation = { status: 'recognized'; signId: string } | { status: 'unknown' | 'tracking' };

export function recognitionResult(snapshot: RecognitionSnapshot, mode: RecognitionMode) {
  const signId = snapshot.status === 'recognized' ? snapshot.stableId : null;
  const confirmation: RecognitionConfirmation | null = signId ? {
    signId,
    outcome: mode.type === 'free' ? 'recognized' : signId === mode.targetId ? 'matched' : 'different',
  } : null;
  return { status: snapshot.reason === 'hand-count' && snapshot.hands ? 'unknown' as const : snapshot.status, confirmation };
}
