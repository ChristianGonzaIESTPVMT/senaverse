import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getMinigame } from '../src/data/minigames.ts';
import { numberIds, playElapsed, playLimit, playMove, playResult, playSettings, shuffle, startPlay, validatePlayResult } from '../src/data/gameMechanics.ts';
import { createGestureGate } from '../src/data/gameGestures.ts';
import { emptyProgress, recordProgressEvent, restoreProgress, summarizeMinigame } from '../src/data/progress.ts';
import { createGameRun, gameOutcome, updateGameRun } from '../src/data/minigameRun.ts';

function gameRun(id, settings = {}, runId = id) {
  const game = getMinigame(id);
  return startPlay(game, playSettings(game, settings), runId, 1000, () => .999);
}
function apply(run, action) {
  return playMove(run, { at: run.lastAt + 100, ...action });
}

test('association destinations are shuffled, links can change, and checks lock correct pairs only', () => {
  let run = gameRun('relaciona');
  const [a,b,c] = run.board.sources;
  assert.notDeepEqual(run.board.sources, run.board.destinations);
  assert.equal(apply(run, { type: 'check' }), run);
  for (const [source, destination] of [[a,a], [b,c], [c,b]]) run = apply(run, { type: 'link', source, destination });
  run = apply(run, { type: 'check' });
  assert.deepEqual(run.board.locked, [a]);
  assert.equal(run.errors, 2);
  assert.equal(apply(run, { type: 'link', source: b, destination: a }), run);
  assert.equal(apply(run, { type: 'check' }), run);
  run = apply(run, { type: 'link', source: b, destination: b });
  assert.equal(run.board.pairs[c], undefined);
  run = apply(run, { type: 'link', source: c, destination: c });
  run = apply(run, { type: 'check' });
  assert.equal(playResult(run).correct, 3);
  assert.equal(playResult(run).errors, 2);
});

test('memory has 3/4/5 shuffled pairs and tracks mismatches without double counting flips', () => {
  assert.notDeepEqual(shuffle(numberIds, () => 0), numberIds);
  for (const [index, difficulty] of ['basico', 'intermedio', 'avanzado'].entries()) {
    assert.equal(gameRun('memoria', { difficulty }).board.cards.length, (index + 3) * 2);
  }
  let run = gameRun('memoria');
  run = apply(run, { type: 'flip', index: 0 });
  assert.equal(apply(run, { type: 'flip', index: 0 }), run);
  run = apply(run, { type: 'flip', index: 2 });
  assert.equal(apply(run, { type: 'flip', index: 1 }), run);
  run = apply(run, { type: 'hide' });
  for (let index = 0; index < 6; index++) run = apply(run, { type: 'flip', index });
  assert.equal(playResult(run).moves, 4);
  assert.equal(playResult(run).correct, 3);
});

test('guess offers adjacent configurations, records feedback once and tracks the best streak', () => {
  let run = gameRun('adivina');
  for (let step = 0; step < run.limit; step++) {
    const target = run.board.targets[step];
    const options = run.board.options[step];
    assert.equal(options.length, 2);
    assert.equal(Math.abs(numberIds.indexOf(options[0]) - numberIds.indexOf(options[1])), 1);
    run = apply(run, { type: 'answer', step, id: target });
    assert.equal(apply(run, { type: 'answer', step, id: target }), run);
    run = apply(run, { type: 'next', step });
  }
  assert.equal(playResult(run).bestStreak, 3);
});

test('visual sequence hides the study stage, retains the correct prefix, and separates assisted results', () => {
  let run = gameRun('senas');
  const [a,b,c] = run.board.targets;
  assert.equal(new Set(run.board.targets).size, run.limit);
  assert.equal(apply(run, { type: 'pick', id: a }), run);
  run = apply(run, { type: 'recall' });
  for (const id of [a,c,b]) run = apply(run, { type: 'pick', id });
  run = apply(run, { type: 'check' });
  assert.deepEqual(run.board.ordered, [a]);
  assert.equal(run.errors, 1);
  run = apply(run, { type: 'hint' });
  assert.equal(run.activeSince, null);
  run = apply(run, { type: 'recall' });
  for (const id of [b,c]) run = apply(run, { type: 'pick', id });
  run = apply(run, { type: 'check' });
  assert.equal(playResult(run).assisted, true);
  assert.equal(playResult(run).alternative, 3);
});

test('camera sequence requires a live run and correct class in order', () => {
  let run = gameRun('senas', { mode: 'camera' });
  const [a,b,c] = run.board.targets;
  run = apply(run, { type: 'recall' });
  assert.equal(apply(run, { type: 'gesture', step: 0, id: a }), run);
  run = apply(run, { type: 'resume' });
  run = apply(run, { type: 'gesture', step: 0, id: b });
  assert.equal(run.errors, 1);
  assert.equal(run.correct, 0);
  for (const [step,id] of [a,b,c].entries()) {
    run = apply(run, { type: 'gesture', id, step });
    assert.equal(apply(run, { type: 'gesture', id, step }), run);
  }
  assert.equal(playResult(run).camera, 3);
});

test('camera sprint waits for countdown, pauses for camera outages and ends at exact duration', () => {
  let run = gameRun('desafio', { mode: 'camera', duration: 30 });
  assert.equal(playElapsed(run, 10000), 0);
  run = apply(run, { type: 'resume' });
  const id = run.board.targets[0];
  assert.equal(apply(run, { type: 'gesture', id, step: 0 }), run);
  run = apply(run, { type: 'gesture', id, step: 0, at: 4200 });
  assert.equal(run.correct, 1);
  run = apply(run, { type: 'pause', at: 5000 });
  assert.equal(playElapsed(run, 22000), 900);
  run = apply(run, { type: 'resume', at: 22000 });
  run = apply(run, { type: 'tick', at: 60000 });
  assert.equal(playResult(run).elapsedMs, 30000);
  assert.equal(playResult(run).camera, 1);
  assert.equal(playResult(run).errors, 0);
  for (const [index, difficulty] of ['basico', 'intermedio', 'avanzado'].entries()) {
    const unlimited = gameRun('desafio', { mode: 'camera', difficulty });
    assert.equal(unlimited.limit, [5, 8, 12][index]);
    assert.ok(unlimited.board.targets.every((target, i, all) => target !== all[i - 1]));
  }
});

test('gesture gate rejects stale, duplicate and held frames until a new release', () => {
  const gate = createGestureGate();
  gate.open(100, true);
  assert.equal(gate.accept(90, false), false);
  assert.equal(gate.accept(105, true), false);
  assert.equal(gate.accept(105, false), false);
  assert.equal(gate.accept(110, false), false);
  assert.equal(gate.accept(115, true), false);
  assert.equal(gate.accept(130, false), false);
  assert.equal(gate.accept(250, false), true);
  assert.equal(gate.accept(260, true), true);
  gate.open(300, true);
  assert.equal(gate.accept(290, false), false);
  assert.equal(gate.accept(305, true), false);
});

test('results preserve legacy XP and isolate camera and visual records, including after restoration', () => {
  const game = getMinigame('desafio');
  let state = emptyProgress();
  const log = (run, details) => {
    state = recordProgressEvent(state, { type: 'minigame', gameId: game.id, runId: run.id, completed: true,
      score: details.correct * 10, maxScore: details.limit * 10, details });
  };
  let old = createGameRun(game, { difficulty: 'basico', duration: 30, category: 'numeros' }, 'legacy', 1000, () => .999);
  old = updateGameRun(old, { type: 'answer', choice: old.board.rounds[0].signId, step: 0, at: 1100 });
  old = updateGameRun(old, { type: 'tick', at: 31000 });
  log(old, gameOutcome(old));
  for (const mode of ['camera', 'visual']) {
    let run = gameRun('desafio', { mode, duration: 30 }, mode);
    if (mode === 'camera') run = apply(run, { type: 'resume' });
    run = apply(run, { type: mode === 'camera' ? 'gesture' : 'answer', id: run.board.targets[0], step: 0, at: 5000 });
    run = apply(run, { type: 'tick', at: 40000 });
    const outcome = playResult(run);
    assert.equal(validatePlayResult(game, { ...outcome, camera: 100 }), undefined);
    log(run, outcome);
    log(run, outcome);
  }
  state = restoreProgress(JSON.stringify(state));
  assert.equal(state.activities.length, 3);
  assert.equal(state.activities.reduce((total, item) => total + (item.rewardXp ?? 0), 0), 20);
  const camera = playSettings(game, { mode: 'camera', duration: 30 });
  assert.equal(summarizeMinigame(state, game, camera, playLimit(game, camera)).best.details.settings.mode, 'camera');
  const visual = playSettings(game, { mode: 'visual', duration: 30 });
  assert.equal(summarizeMinigame(state, game, visual, playLimit(game, visual)).best.details.settings.mode, 'visual');
});
