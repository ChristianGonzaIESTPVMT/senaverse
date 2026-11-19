import type { HandDetectionFailure, HandFailurePhase } from './types.ts';

/** Keep the actual failure in development diagnostics without exposing stacks or frames. */
export function detectionFailure(error: unknown, fallback: HandFailurePhase): HandDetectionFailure {
  const phases = ['initialization', 'capture', 'inference', 'render', 'worker'];
  const phase = error && typeof error === 'object' && 'phase' in error && phases.includes(String(error.phase)) ? error.phase as HandFailurePhase : fallback;
  const detail = error instanceof Error ? error.message : typeof error === 'string' ? error : 'Error sin detalle disponible.';
  return { phase, detail: detail.slice(0, 1000) };
}

export function detectionError(phase: HandFailurePhase, error: unknown) {
  const failure = detectionFailure(error, phase);
  return Object.assign(new Error(failure.detail), { phase: failure.phase });
}
