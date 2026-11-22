import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getEducationalSign, libraryEntries } from '../src/data/library.ts';
import { gameCategories, gameVocabulary, getMinigame, getMinigameReturnPath, minigames, normalizeGameSettings } from '../src/data/minigames.ts';
import { createGameRun, gameOutcome, POINTS_PER_SUCCESS, restoreChallenge, updateGameRun, validateGameOutcome } from '../src/data/minigameRun.ts';
import { emptyProgress, recordProgressEvent, restoreProgress, summarizeMinigame, summarizeProgress } from '../src/data/progress.ts';
import { createProfileExport, defaultProfile } from '../src/data/profile.ts';

const at = 1000;
const date = '2026-11-22T18:30:00.000Z';
const stable = () => .99;
const setup = (id, settings = {}, random = stable) => createGameRun(getMinigame(id), settings, `${id}-demo`, at, random);
const move = (run, type, data = {}, time = at + 100) => updateGameRun(run, { type, at: time, ...data });

function finishQuiz(run, wrongFirst = false) {
  for (const [step, round] of run.board.rounds.entries()) {
    const choice = step === 0 && wrongFirst ? round.options.find(id => id !== round.signId) : round.signId;
    run = move(run, 'answer', { step, choice });
    run = move(run, 'next');
  }
  return run;
}

function save(state, gameId, runId, result) {
  return recordProgressEvent(state, { type: 'minigame', completed: true, gameId, runId, details: result,
    score: result.correct * POINTS_PER_SUCCESS, maxScore: result.limit * POINTS_PER_SUCCESS }, date);
}

test('visual, textual and camera vocabularies are selected independently from Biblioteca', () => {
  assert.deepEqual(minigames.map(game => game.id), ['memoria', 'adivina', 'desafio', 'senas', 'relaciona']);
  const visual = gameVocabulary(getMinigame('adivina'));
  assert.deepEqual(visual.map(sign => sign.id), ['LSP-001', 'LSP-002', 'LSP-003', 'LSP-004', 'LSP-005']);
  for (const sign of visual) {
    assert.ok(sign.reference && sign.handDiagram && !sign.handDiagram.description.toLowerCase().includes(sign.word.toLowerCase()));
    assert.equal(sign.validation, 'pending');
  }
  assert.equal(new Set(visual.map(sign => sign.handDiagram.extended.join(','))).size, 5);
  assert.equal(gameVocabulary(getMinigame('senas')).length, 10);
  assert.equal(gameVocabulary(getMinigame('relaciona')).length, libraryEntries.length);
  assert.equal(gameVocabulary(getMinigame('senas')).some(sign => sign.id === 'cero'), false);
  assert.ok(gameCategories(getMinigame('relaciona')).includes('familia'));
});

test('memory shuffles complete pairs, validates flips and keeps solved cards locked', () => {
  let run = setup('memoria');
  const randomOrder = setup('memoria', {}, () => 0);
  assert.equal(run.board.cards.length, 6);
  assert.notDeepEqual(run.board.cards, randomOrder.board.cards);
  assert.equal(setup('memoria', { difficulty: 'intermedio' }).board.cards.length, 10);
  assert.equal(move(run, 'flip', { index: 99 }), run);
  run = move(run, 'flip', { index: 0 });
  assert.equal(move(run, 'flip', { index: 0 }), run);
  run = move(run, 'flip', { index: 2 });
  assert.equal(run.score.errors, 1);
  assert.equal(move(run, 'flip', { index: 1 }), run);
  run = move(run, 'hide');
  for (let i = 0; i < 6; i += 2) {
    run = move(run, 'flip', { index: i });
    run = move(run, 'flip', { index: i + 1 });
    assert.equal(move(run, 'flip', { index: i }), run);
  }
  assert.equal(gameOutcome(run).correct, 3);
  assert.equal(gameOutcome(run).errors, 1);
  assert.equal(gameOutcome(run).elapsedMs, 100);
});

test('quiz alternates shuffle without duplicates and validates answers, progress and streaks', () => {
  let run = setup('adivina', { difficulty: 'intermedio' });
  assert.equal(run.limit, 5);
  const rotated = setup('adivina', { difficulty: 'intermedio' }, () => 0);
  assert.notDeepEqual(run.board.rounds, rotated.board.rounds);
  for (const round of run.board.rounds) {
    assert.equal(new Set(round.options).size, 4);
    assert.equal(round.options.filter(id => id === round.signId).length, 1);
  }
  const first = run.board.rounds[0];
  assert.equal(move(run, 'answer', { choice: first.signId, step: 1 }), run);
  assert.equal(move(run, 'answer', { choice: 'NEG-001', step: 0 }), run);
  assert.equal(move(run, 'next'), run);
  run = move(run, 'answer', { choice: first.signId, step: 0 });
  assert.equal(move(run, 'answer', { choice: first.signId, step: 0 }), run);
  run = move(run, 'next');
  const round = run.board.rounds[1];
  run = move(run, 'answer', { choice: round.options.find(id => id !== round.signId), step: 1 });
  assert.deepEqual(run.score, { correct: 1, errors: 1, streak: 0, bestStreak: 1 });
  assert.equal(gameOutcome(finishQuiz(setup('adivina'), true)).bestStreak, 2);
});

test('all durations use the same question engine, enforce the deadline and allow untimed play', () => {
  for (const duration of [30, 60, 90]) {
    let run = setup('desafio', { duration });
    assert.equal(run.limit, 30);
    assert.ok(run.board.rounds.every((round, index) => round.signId !== run.board.rounds[index - 1]?.signId));
    const deadline = at + duration * 1000;
    assert.equal(move(run, 'tick', {}, deadline - 1), run);
    run = move(run, 'answer', { choice: run.board.rounds[0].signId, step: 0 }, deadline);
    assert.equal(gameOutcome(run).correct, 0);
    assert.equal(gameOutcome(run).elapsedMs, duration * 1000);
    assert.equal(move(run, 'tick', {}, deadline + 500), run);
    assert.deepEqual(validateGameOutcome(getMinigame('desafio'), gameOutcome(run)), gameOutcome(run));
  }
  const noLimit = setup('desafio', { duration: 0 });
  assert.equal(noLimit.limit, 3);
  assert.equal(move(noLimit, 'tick', {}, at + 90000), noLimit);
  assert.equal(gameOutcome(finishQuiz(noLimit)).correct, 3);
});

test('practice validates the target and alternative, resumes the draft, then records each class once', () => {
  const game = getMinigame('senas');
  let run = setup('senas', { category: 'numeros' });
  const [first, second, third] = run.board.targets;
  assert.equal(move(run, 'practice', { signId: first, input: { method: 'camera', signId: second } }), run);
  assert.equal(move(run, 'practice', { signId: first, input: { method: 'alternative', response: 'two' } }), run);
  run = move(run, 'practice', { signId: first, input: { method: 'camera', signId: first } });
  assert.equal(move(run, 'practice', { signId: first, input: { method: 'camera', signId: first } }), run);
  const restored = restoreChallenge(game, JSON.stringify(run), at + 100);
  assert.deepEqual(restored, run);
  assert.equal(restoreChallenge(game, JSON.stringify({ ...run, board: { ...run.board, targets: [first, first, first] } }), at + 100), undefined);
  for (const signId of [second, third]) {
    const response = getEducationalSign(signId).hands === 1 ? 'one' : 'two';
    run = move(run, 'practice', { signId, input: { method: 'alternative', response } });
  }
  assert.equal(gameOutcome(run).camera, 1);
  assert.equal(gameOutcome(run).alternative, 2);
  assert.equal(restoreChallenge(game, JSON.stringify(run), at + 100), undefined);
  assert.equal(getMinigameReturnPath('senas'), '/minijuegos/senas');
  assert.equal(getMinigameReturnPath('//otro'), undefined);
});

test('game records retain the best result by rules and award first qualified completion only', () => {
  const game = getMinigame('adivina');
  const first = gameOutcome(finishQuiz(setup('adivina'), true));
  const second = gameOutcome(finishQuiz(setup('adivina')));
  let state = recordProgressEvent(emptyProgress(), { type: 'lesson-start', lessonId: 'numeros' }, date);
  state = recordProgressEvent(state, { type: 'situation-start', situationId: 'tienda' }, date);
  const { lessonStudy, situationStudy } = state;
  state = save(state, game.id, 'first', first);
  assert.equal(summarizeProgress(state).xp, game.rewardXp);
  assert.equal(save(state, game.id, 'first', second), state);
  state = save(state, game.id, 'second', second);
  const third = gameOutcome(finishQuiz(setup('adivina', { difficulty: 'intermedio' })));
  state = save(state, game.id, 'third', third);
  assert.equal(summarizeMinigame(state, game, first.settings, first.limit).best.score, 30);
  assert.equal(summarizeMinigame(state, game, third.settings, third.limit).best.score, 50);
  assert.equal(summarizeMinigame(state, game).plays, 3);
  assert.equal(summarizeProgress(state).xp, 20);
  assert.equal(state.lessonStudy, lessonStudy);
  assert.equal(state.situationStudy, situationStudy);
  assert.deepEqual(restoreProgress(JSON.stringify(state)), state);
  assert.equal(createProfileExport(defaultProfile(), state).progressSummary.xp, 20);
});

test('empty timed runs and invalid detail records do not award XP', () => {
  const game = getMinigame('desafio');
  const result = gameOutcome(move(setup(game.id, { duration: 30 }), 'tick', {}, at + 30000));
  const state = save(emptyProgress(), game.id, 'first', result);
  assert.equal(summarizeMinigame(state, game).plays, 1);
  assert.equal(summarizeProgress(state).xp, 0);
  assert.equal(save(state, game.id, 'forged', { ...result, camera: 1 }), state);
  assert.equal(save(state, game.id, 'bad-settings', { ...result, settings: { ...result.settings, duration: 6 } }), state);
  assert.deepEqual(normalizeGameSettings(game, { category: 'no-existe', duration: 6 }), { difficulty: 'basico', category: 'numeros', duration: 0 });
});
