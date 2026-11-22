const FINGERS = [[5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16], [17, 18, 19, 20]];
const ZERO = [0, 0, 0];
const subtract = (a, b) => a.map((value, i) => value - b[i]);
const length = vector => Math.hypot(...vector);
const distance = (a, b) => length(subtract(a, b));
const unit = vector => vector.map(value => value / Math.max(1e-5, length(vector)));
const average = values => values.reduce((sum, value) => sum + value, 0) / values.length;
const median = values => {
  const sorted = values.toSorted((a, b) => a - b);
  return (sorted[Math.floor(sorted.length / 2)] + sorted[Math.floor((sorted.length - 1) / 2)]) / 2;
};

export function palmSize(points) {
  return Math.max(1e-5, (distance(points[9], points[0]) + distance(points[17], points[5])) / 2);
}

function contiguous(sequence, count) {
  let best = [], run = [], previous = '';
  for (const slots of sequence) {
    const hands = slots.filter(Boolean);
    const key = hands.map(hand => hand.id).join('/');
    if (hands.length !== count) {
      run = [];
      previous = '';
      continue;
    }
    if (key !== previous) run = [];
    previous = key;
    run.push(hands.map(hand => hand.points));
    if (run.length > best.length) best = run;
  }
  return best;
}

// Median over three observations before measuring excursions. Keep endpoints from real observations.
function smooth(values) {
  return values.slice(1, -1).map((value, i) => median([values[i], value, values[i + 2]]));
}

function directedTravel(values) {
  const edge = Math.max(1, Math.floor(values.length * .15));
  const end = average(values.slice(-edge));
  const leading = values.slice(0, -edge);
  return end - Math.min(...leading);
}

function signedExcursion(values) {
  const edge = Math.max(1, Math.floor(values.length * .15));
  return average(values.slice(-edge)) - average(values.slice(0, edge));
}

function fingertipOpening(points) {
  return average(FINGERS.map(([, , , tip]) => distance(points[4], points[tip]))) / palmSize(points);
}

function palmNormal(points) {
  const a = subtract(points[5], points[0]);
  const b = subtract(points[17], points[0]);
  return unit([a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]);
}

function cycle(values) {
  let excursion = 0;
  for (let i = 2; i < values.length - 2; i++) {
    const before = values.slice(0, i);
    const after = values.slice(i + 1);
    excursion = Math.max(excursion,
      Math.min(values[i] - Math.min(...before), values[i] - Math.min(...after)),
      Math.min(Math.max(...before) - values[i], Math.max(...after) - values[i]));
  }
  return excursion;
}

function turn(points, first, second) {
  const sampled = [points[0]];
  for (const point of points.slice(1)) {
    const previous = sampled.at(-1);
    if (Math.hypot(point[first] - previous[first], point[second] - previous[second]) >= .07) sampled.push(point);
  }
  const steps = sampled.slice(1).map((point, i) => subtract(point, sampled[i]));
  let signed = 0, total = 0, corners = 0;
  for (const [i, step] of steps.slice(1).entries()) {
    const a = steps[i], b = step;
    const angle = Math.atan2(a[first] * b[second] - a[second] * b[first], a[first] * b[first] + a[second] * b[second]);
    if (Math.abs(angle) > 1.75 || Math.abs(angle) < .10) continue;
    signed += angle;
    total += Math.abs(angle);
    corners++;
  }
  return { radians: Math.abs(signed), consistency: total ? Math.abs(signed) / total : 0, corners };
}

export function movementEvidence(sequence, config) {
  const single = contiguous(sequence, 1).map(([points]) => points);
  const pair = contiguous(sequence, 2);
  const minSteps = Math.max(8, Math.ceil(config.steps * .65));
  const result = { singleSteps: single.length, pairSteps: pair.length };
  if (single.length >= minSteps) {
    const scale = median(single.map(palmSize));
    const wristX = smooth(single.map(points => points[0][0] / scale));
    const wristY = smooth(single.map(points => points[0][1] / scale));
    const tips = single.map(points => subtract(points[8], points[0]).map(value => value / scale));
    const axes = ZERO.map((_, axis) => smooth(tips.map(point => point[axis])));
    const smoothed = axes[0].map((_, i) => axes.map(axis => axis[i]));
    const turns = [[0, 1], [0, 2], [1, 2]].map(([a, b]) => turn(smoothed, a, b));
    const rotation = turns.toSorted((a, b) => b.radians * b.consistency - a.radians * a.consistency)[0];
    const wristAxes = single.map(points => unit(subtract(points[9], points[0])));
    const pitchY = smooth(wristAxes.map(axis => axis[1]));
    const pitchZ = smooth(wristAxes.map(axis => axis[2]));
    result.solo = { ...rotation, span: Math.max(...smoothed.map(point => distance(point, smoothed[0]))) };
    // The wrist can tilt toward the camera from an almost vertical initial pose, where y alone changes little.
    const pitch = pitchY.map((y, i) => Math.atan2(-pitchZ[i], -y));
    const continuousPitch = [pitch[0]];
    for (const [i, angle] of pitch.slice(1).entries()) {
      const change = angle - pitch[i];
      continuousPitch.push(continuousPitch[i] + Math.atan2(Math.sin(change), Math.cos(change)));
    }
    result.yes = { pitchDown: directedTravel(pitchY), pitchForward: directedTravel(continuousPitch) };
    result.nada = {
      rightward: directedTravel(wristX), leftward: directedTravel(wristX.map(value => -value)),
      netX: signedExcursion(wristX), xRange: Math.max(...wristX) - Math.min(...wristX),
      yRange: Math.max(...wristY) - Math.min(...wristY),
      pinchMedian: median(single.map(points => distance(points[4], points[8]) / palmSize(points))),
      palmAxisYMedian: median(wristAxes.map(axis => axis[1])),
      palmNormalZMedian: median(single.map(points => palmNormal(points)[2])),
      extensionMedian: median(single.map(points => average(FINGERS.slice(1).map(([a, b, c, d]) =>
        distance(points[a], points[d]) / Math.max(1e-5, distance(points[a], points[b])
          + distance(points[b], points[c]) + distance(points[c], points[d])))))),
    };
  }
  if (pair.length >= minSteps) {
    const scale = median(pair.flatMap(hands => hands.map(palmSize)));
    const separation = smooth(pair.map(([a, b]) => distance(a[0], b[0]) / scale));
    const left = smooth(pair.map(hands => fingertipOpening(hands[0])));
    const right = smooth(pair.map(hands => fingertipOpening(hands[1])));
    const joint = left.map((value, i) => (value + right[i]) / 2);
    result.mucho = { cycling: Math.min(cycle(left), cycle(right), cycle(joint)) };
    result.con = { closing: directedTravel(separation.map(value => -value)),
      rebound: (separation.at(-1) + separation.at(-2)) / 2 - Math.min(...separation) };
  }
  return result;
}

// Provisional, scale-relative criteria to verify on the validation split before an independent test.
export function passesMovement(labelId, movement) {
  const { solo, yes, nada, mucho, con } = movement ?? {};
  switch (labelId) {
    case 'LSP-006': return !!yes && (yes.pitchDown >= .20 || yes.pitchForward >= .30);
    case 'LSP-007': return !!nada && nada.rightward >= .45 && nada.rightward >= .7 * nada.xRange
      && nada.xRange >= .8 * nada.yRange && nada.pinchMedian <= .4;
    case 'LSP-008': return !!mucho && mucho.cycling >= .12;
    case 'LSP-009': return !!solo && solo.radians >= 2.2 && solo.consistency >= .65 && solo.corners >= 3 && solo.span >= .25;
    case 'LSP-010': return !!con && con.closing >= .55 && con.rebound <= .6 * con.closing;
    default: return true;
  }
}
