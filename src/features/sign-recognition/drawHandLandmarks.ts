import type { HandDetectionResult } from './types.ts';

// MediaPipe's 21 anatomical connections: wrist, palm and all five fingers.
export const HAND_CONNECTIONS: readonly (readonly [number, number])[] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [0, 17], [17, 18], [18, 19], [19, 20],
];

export function clearHandCanvas(canvas: HTMLCanvasElement) {
  const context = canvas.getContext('2d');
  if (!context) return;
  context.save();
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.restore();
}

/** Same centered object-fit: cover geometry as the video. Mirroring is CSS only. */
export function getCoverGeometry(width: number, height: number, videoWidth: number, videoHeight: number) {
  const scale = Math.max(width / videoWidth, height / videoHeight);
  return { width: videoWidth * scale, height: videoHeight * scale, x: (width - videoWidth * scale) / 2, y: (height - videoHeight * scale) / 2 };
}

export function drawHandLandmarks(canvas: HTMLCanvasElement, video: HTMLVideoElement, result: HandDetectionResult | null, opacity = 1) {
  const context = canvas.getContext('2d');
  if (!context) throw new Error('No se pudo abrir el Canvas de detección.');
  const { width, height } = canvas.getBoundingClientRect();
  if (!width || !height || !video.videoWidth || !video.videoHeight) {
    clearHandCanvas(canvas);
    return;
  }
  const pixelRatio = Math.min(globalThis.devicePixelRatio || 1, 2);
  const backingWidth = Math.round(width * pixelRatio);
  const backingHeight = Math.round(height * pixelRatio);
  if (canvas.width !== backingWidth || canvas.height !== backingHeight) {
    canvas.width = backingWidth;
    canvas.height = backingHeight;
  }
  clearHandCanvas(canvas);
  if (!result) return;

  const cover = getCoverGeometry(width, height, video.videoWidth, video.videoHeight);
  context.save();
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  context.globalAlpha = opacity;
  context.lineWidth = 2.5;
  context.lineCap = 'round';

  result.landmarks.forEach((landmarks, handIndex) => {
    if (landmarks.length !== 21) return;
    const points = landmarks.map(point => ({ x: cover.x + point.x * cover.width, y: cover.y + point.y * cover.height }));
    context.strokeStyle = handIndex === 0 ? '#c4a3ff' : '#6ce9c4';
    context.beginPath();
    for (const [start, end] of HAND_CONNECTIONS) {
      context.moveTo(points[start].x, points[start].y);
      context.lineTo(points[end].x, points[end].y);
    }
    context.stroke();
    context.fillStyle = handIndex === 0 ? '#7c3aed' : '#087f67';
    context.strokeStyle = '#ffffff';
    context.lineWidth = 1.5;
    for (const point of points) {
      context.beginPath();
      context.arc(point.x, point.y, 3.5, 0, Math.PI * 2);
      context.fill();
      context.stroke();
    }
    context.lineWidth = 2.5;
  });
  context.restore();
}
