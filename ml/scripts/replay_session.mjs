import { createRecognitionSession } from '../../src/features/sign-recognition/liveRecognition.ts';

export function simulate(model, row) {
  let now = 0;
  let started = 0;
  const session = createRecognitionSession(model, () => now + performance.now() - started);
  session.start();
  const snapshots = [];
  let tick = 0;
  for (const frame of row.frames) {
    const source = frame.sourceTimestamps;
    const capturedAtMs = source ? source.capturedAtMs - row.recordingStart : frame.timestampMs;
    const inferenceTimestampMs = source ? source.inferenceTimestampMs - row.recordingStart : capturedAtMs;
    const receivedAtMs = source ? source.receivedAtMs - row.recordingStart : capturedAtMs;
    while (tick < receivedAtMs) {
      session.expire(tick);
      tick += 50;
    }
    const event = { source: 'worker', capturedAtMs, inferenceTimestampMs, receivedAtMs,
      configuration: row.configuration,
      result: { landmarks: frame.hands.map(hand => hand.landmarks), handedness: frame.hands.map(hand => hand.handedness) } };
    now = receivedAtMs;
    started = performance.now();
    const view = session.observe(event, receivedAtMs);
    if (view?.top.length) snapshots.push({ ...view, capturedAtMs });
  }
  session.stop();
  return snapshots;
}
