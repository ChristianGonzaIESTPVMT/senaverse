export type MovementEvidence = {
  singleSteps: number;
  pairSteps: number;
  solo?: { radians: number; consistency: number; corners: number; span: number };
  yes?: { pitchDown: number; pitchForward: number };
  nada?: { rightward: number; leftward: number; netX: number; xRange: number; yRange: number; pinchMedian: number;
    palmAxisYMedian: number; palmNormalZMedian: number; extensionMedian: number };
  mucho?: { cycling: number };
  con?: { closing: number; rebound: number };
};
export function passesMovement(labelId: string, movement?: MovementEvidence): boolean;
