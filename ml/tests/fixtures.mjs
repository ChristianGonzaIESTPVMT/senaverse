export function hand(x, y, { size = .12, bend = 0, side = 'Right' } = {}) {
  const landmarks = [{ x, y, z: 0 }];
  for (let finger = 0; finger < 5; finger++) {
    for (let joint = 0; joint < 4; joint++) {
      landmarks.push({
        x: x + size * ((finger - 2) * (.18 + joint * .03)),
        y: y - size * (.45 + joint * .19 - bend * joint * .07),
        z: size * bend * joint * .10,
      });
    }
  }
  return { landmarks, handedness: [{ categoryName: side, score: .97 }] };
}

export function frames(handsAt, step = 50, end = 1350) {
  const times = Array.from({ length: Math.ceil(end / step) }, (_, i) => i * step);
  times.push(end);
  return times.map(timestampMs => ({ timestampMs, hands: handsAt(timestampMs) }));
}

export function inference(frame) {
  return {
    source: 'worker',
    capturedAtMs: frame.timestampMs,
    inferenceTimestampMs: frame.timestampMs + 5,
    receivedAtMs: frame.timestampMs + 10,
    configuration: { processingWidth: 640, processingHeight: 480, inputMirrored: false, profile: 'baseline' },
    result: {
      landmarks: frame.hands.map(item => item.landmarks),
      handedness: frame.hands.map(item => item.handedness),
    },
  };
}

export const browserCases = () => [
  frames(() => [hand(.4, .55)]),
  frames(t => [hand(.3 + t * .0002, .55, { bend: Math.sin(t / 180) })]),
  frames(t => [hand(.28 + t * .0001, .55, { side: 'Left' }), hand(.7 - t * .0001, .54)]),
  frames(() => []),
];
