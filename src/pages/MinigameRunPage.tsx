import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, RotateCcw, Trophy } from 'lucide-react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { GuidedSignPractice } from '../components/GuidedSignPractice';
import { EducationalVisual } from '../components/SignMediaViewer';
import { ExternalReference } from '../components/ExternalReference';
import { getQuizVisual } from '../data/educationalMedia';
import { getEducationalSign, libraryCategories, numbersReference } from '../data/library';
import { CHALLENGE_CHECKPOINT_KEY, createGameRun, gameOutcome, gameSize, POINTS_PER_SUCCESS, restoreChallenge,
  updateGameRun, type GameRun } from '../data/minigameRun';
import { gameCategories, gameDurations, getMinigame, normalizeGameSettings, type Minigame } from '../data/minigames';
import { summarizeMinigame } from '../data/progress';
import { getHandCountExercise } from '../data/signExercises';
import { useStudentProgress } from '../hooks/progressContext';

type DispatchMove = (action: Parameters<typeof updateGameRun>[1]) => void;

export function MinigameRunPage({ viaCamera = false }: { viaCamera?: boolean }) {
  const { gameId } = useParams();
  const [params] = useSearchParams();
  const game = getMinigame(viaCamera ? 'senas' : gameId);
  if (!game) return <Navigate to="/minijuegos" replace />;
  return <GameSession key={game.id} game={game} viaCamera={viaCamera} initialSize={params.get('cantidad')} />;
}

function readChallenge(game: Minigame) {
  if (game.kind !== 'challenge') return;
  try { return restoreChallenge(game, sessionStorage.getItem(CHALLENGE_CHECKPOINT_KEY), Date.now()); }
  catch { /* The challenge can still be played in this view. */ }
}

function timeLabel(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function GameSession({ game, viaCamera, initialSize }: { game: Minigame; viaCamera: boolean; initialSize: string | null }) {
  const { progress, recordActivity } = useStudentProgress();
  const [run, setRun] = useState(() => readChallenge(game));
  const [settings, setSettings] = useState(() => run?.settings ?? normalizeGameSettings(game, { difficulty: initialSize === '5' ? 'intermedio' : 'basico' }));
  const [clock, setClock] = useState<number>();
  const categories = gameCategories(game);
  const limit = gameSize(game, settings);
  const record = summarizeMinigame(progress, game, settings, limit);
  const ended = run?.ended !== undefined;
  const clockRunning = !!run && !ended && (game.kind === 'memory' || !!run.settings.duration);
  const visual = game.kind === 'memory' || game.kind === 'visual-quiz' || game.kind === 'timed-quiz';
  const noun = game.kind === 'memory' ? 'parejas' : game.kind === 'challenge' ? 'señas' : 'preguntas';

  useEffect(() => {
    if (!clockRunning) return;
    const timer = window.setInterval(() => {
      const at = Date.now();
      setClock(at);
      setRun(previous => previous && previous.id === run?.id ? updateGameRun(previous, { type: 'tick', at }) : previous);
    }, 200);
    return () => window.clearInterval(timer);
  }, [clockRunning, run?.id]);

  useEffect(() => {
    if (!run || game.kind !== 'challenge') return;
    try {
      if (run.ended === undefined) sessionStorage.setItem(CHALLENGE_CHECKPOINT_KEY, JSON.stringify(run));
      else sessionStorage.removeItem(CHALLENGE_CHECKPOINT_KEY);
    } catch { /* The challenge can still be played in this view. */ }
  }, [game.kind, run]);

  useEffect(() => {
    const details = run && gameOutcome(run);
    if (run && details) recordActivity({ type: 'minigame', runId: run.id, gameId: game.id, completed: true,
      score: details.correct * POINTS_PER_SUCCESS, maxScore: details.limit * POINTS_PER_SUCCESS, details });
  }, [game.id, recordActivity, run]);

  function start() {
    const at = Date.now();
    setClock(at);
    const id = Array.from(crypto.getRandomValues(new Uint32Array(4)), value => value.toString(16).padStart(8, '0')).join('');
    setRun(createGameRun(game, settings, id, at));
  }

  const move: DispatchMove = action => setRun(previous => previous && previous.id === run?.id ? updateGameRun(previous, action) : previous);
  const played = run ? run.board.kind === 'memory' || run.board.kind === 'challenge' ? run.score.correct : run.score.correct + run.score.errors : 0;
  const elapsed = run ? Math.floor(Math.max(0, (run.ended ?? clock ?? run.started) - run.started) / 1000) : 0;

  return <div className="minigames-page minigame-session">
    <Link className="game-back" to={viaCamera ? '/camara' : '/minijuegos'}><ArrowLeft size={18} aria-hidden="true" />{viaCamera ? 'Centro de práctica' : 'Minijuegos'}</Link>
    <header className="minigames-heading"><h1>{game.title}</h1><p>{game.objective}</p></header>

    {!run && <section className="game-panel game-setup" aria-labelledby="game-setup-title">
      <h2 id="game-setup-title">Configura tu partida</h2>
      <div className="game-settings">
        <label>Nivel <select value={settings.difficulty} onChange={event => setSettings(normalizeGameSettings(game, { ...settings, difficulty: event.target.value }))}>
          <option value="basico">Básico</option><option value="intermedio">Intermedio</option>
        </select></label>
        {categories.length > 1 && <label>Vocabulario <select value={settings.category}
          onChange={event => setSettings(normalizeGameSettings(game, { ...settings, category: event.target.value }))}>
          <option value="todas">Todas las categorías</option>
          {categories.map(id => <option key={id} value={id}>{libraryCategories.find(category => category.id === id)?.label}</option>)}
        </select></label>}
        {game.kind === 'timed-quiz' && <label>Duración <select value={settings.duration}
          onChange={event => setSettings(normalizeGameSettings(game, { ...settings, duration: Number(event.target.value) }))}>
          {gameDurations.map(duration => <option value={duration} key={duration}>{duration ? `${duration} segundos` : 'Sin límite de tiempo'}</option>)}
        </select></label>}
      </div>
      <p>{settings.duration ? `Hasta ${limit} ${noun} en ${settings.duration} segundos.` : `${limit} ${noun} por partida.`}</p>
      {record.best && <p>Récord de esta configuración · {record.best.score} puntos
        {game.kind === 'memory' && ` · ${record.best.details.correct + record.best.details.errors} intentos · ${timeLabel(Math.floor(record.best.details.elapsedMs / 1000))}`}</p>}
      {visual && <p className="game-source">Diagramas de Uno a Cinco basados en la figura 2 del MINEDU. Validación lingüística pendiente.</p>}
      <button className="button button-primary" type="button" onClick={start} disabled={!limit}>Iniciar partida</button>
    </section>}

    {run && !ended && <>
      <div className="game-score" aria-label="Estado de la partida">
        <span><strong>{run.score.correct * POINTS_PER_SUCCESS}</strong> puntos</span>
        <span><strong>{run.score.correct + run.score.errors}</strong> intentos</span>
        <span><strong>{run.score.correct}</strong> {game.kind === 'memory' ? 'parejas' : game.kind === 'challenge' ? 'prácticas' : 'aciertos'}</span>
        {game.kind !== 'challenge' && <span><strong>{run.score.errors}</strong> errores</span>}
        {run.board.kind !== 'memory' && run.board.kind !== 'challenge' && <span><strong>{run.score.streak}</strong> de racha</span>}
        {(game.kind === 'memory' || !!run.settings.duration) && <span role="timer" aria-label={run.settings.duration ? 'Tiempo restante' : 'Tiempo transcurrido'}>
          <strong>{timeLabel(run.settings.duration ? Math.max(0, run.settings.duration - elapsed) : elapsed)}</strong> {run.settings.duration ? 'restante' : 'transcurrido'}
        </span>}
      </div>
      <progress className="game-progress" value={played} max={run.limit} aria-label="Progreso de la partida" />
      {run.board.kind === 'memory' ? <MemoryBoard run={run} board={run.board} move={move} /> : run.board.kind === 'challenge'
        ? <ChallengeRound key={run.id} board={run.board} move={move} /> : <QuizBoard key={run.id} board={run.board} move={move} />}
      <button className="button button-outline game-restart" type="button" onClick={start}><RotateCcw size={18} aria-hidden="true" /> Reiniciar partida</button>
    </>}

    {run && ended && <GameResults game={game} run={run} record={record.best} visual={visual}
      reward={progress.activities.find(activity => activity.id === `minigame:${run.id}`)?.rewardXp}
      onRepeat={start} onSettings={() => setRun(undefined)} />}
  </div>;
}

function MemoryBoard({ run, board, move }: { run: GameRun; board: Extract<GameRun['board'], { kind: 'memory' }>; move: DispatchMove }) {
  const waiting = board.open.length === 2;
  const focus = useRef<HTMLButtonElement>(null);
  return <section className="game-panel game-memory" aria-label="Tablero de memoria">
    <p role="status">{waiting ? 'Las tarjetas forman parejas diferentes.' : board.open.length === 1 ? 'Gira una segunda tarjeta.' : `Parejas encontradas · ${run.score.correct} de ${run.limit}`}</p>
    <div className="game-card-grid">
      {board.cards.map((card, index) => {
        const matched = board.matched.includes(index);
        const visible = matched || board.open.includes(index);
        const sign = visible ? getEducationalSign(card.signId) : undefined;
        const visual = sign && card.side === 'diagram' ? getQuizVisual(sign.media) : undefined;
        return <button className="game-memory-card" key={index} type="button" ref={index === board.open[0] ? focus : undefined}
          data-state={matched ? 'matched' : visible ? 'open' : 'hidden'} aria-disabled={matched || visible || waiting} tabIndex={matched ? -1 : undefined}
          aria-label={sign ? `Tarjeta ${index + 1} · ${visual?.alt ?? sign.word}${matched ? ' · Pareja encontrada' : ''}` : `Tarjeta ${index + 1} oculta`}
          onClick={() => move({ type: 'flip', at: Date.now(), index })}>
          {visual ? <EducationalVisual visual={visual} decorative /> : sign ? sign.word : <span aria-hidden="true">?</span>}
        </button>;
      })}
    </div>
    {waiting && <button className="button button-outline game-restart" type="button" onClick={() => {
      focus.current?.focus();
      move({ type: 'hide', at: Date.now() });
    }}>Ocultar tarjetas</button>}
  </section>;
}

function QuizBoard({ board, move }: { board: Extract<GameRun['board'], { rounds: unknown }>; move: DispatchMove }) {
  const question = useRef<HTMLHeadingElement>(null);
  useEffect(() => { question.current?.focus(); }, [board.step]);
  const round = board.rounds[board.step];
  const sign = getEducationalSign(round.signId);
  const answered = board.selected !== undefined;
  if (!sign) return null;
  const visual = getQuizVisual(sign.media);
  return <section className="game-panel game-quiz" aria-labelledby="game-question">
    <p className="game-progress-label">Pregunta {board.step + 1} de {board.rounds.length}</p>
    <h2 id="game-question" ref={question} tabIndex={-1}>{board.kind === 'meaning-quiz' ? '¿Qué palabra corresponde a esta descripción?' : '¿Qué representa esta seña?'}</h2>
    {board.kind === 'meaning-quiz' ? <p className="game-prompt">{sign.meaning}</p>
      : visual && <div className="game-diagram"><EducationalVisual key={visual.id} visual={visual} /></div>}
    <div className="game-options" role="group" aria-label="Alternativas">
      {round.options.map(id => <button className="button button-outline" key={id} type="button" aria-disabled={answered}
        data-answer={answered && id === round.signId ? 'correct' : answered && id === board.selected ? 'wrong' : undefined}
        onClick={() => move({ type: 'answer', choice: id, step: board.step, at: Date.now() })}>{getEducationalSign(id)?.word}</button>)}
    </div>
    {answered && <div className="game-quiz-feedback">
      <p role="status" className={board.selected === round.signId ? 'success-message' : 'error-message'}>
        {board.selected === round.signId ? 'Respuesta correcta.' : `La respuesta era «${sign.word}».`}
      </p>
      <button className="button button-primary" type="button" onClick={() => move({ type: 'next', at: Date.now() })}>
        {board.step + 1 === board.rounds.length ? 'Ver resultados' : 'Siguiente pregunta'}
      </button>
    </div>}
  </section>;
}

function ChallengeRound({ board, move }: { board: Extract<GameRun['board'], { kind: 'challenge' }>; move: DispatchMove }) {
  const sign = getEducationalSign(board.targets[board.methods.length]);
  if (!sign?.recognitionClassId || !sign.hands) return null;
  return <section className="game-challenge" aria-label="Desafío actual">
    <p className="game-progress-label" role="status">Seña {board.methods.length + 1} de {board.targets.length}</p>
    <GuidedSignPractice key={sign.id} sign={sign} exercise={getHandCountExercise(sign.hands)} titleId="game-challenge-title"
      returnState={{ minigameReturn: 'senas' }} onComplete={input => move({ type: 'practice', signId: sign.id, input, at: Date.now() })} />
  </section>;
}

function GameResults({ game, run, visual, reward, record, onRepeat, onSettings }: { game: Minigame; run: GameRun; visual: boolean;
  reward?: number; record: ReturnType<typeof summarizeMinigame>['best']; onRepeat: () => void; onSettings: () => void }) {
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => { title.current?.focus(); }, []);
  const result = gameOutcome(run);
  if (!result) return null;
  const practice = game.kind === 'challenge';
  return <section className="game-panel game-results" aria-labelledby="game-results-title">
    <Trophy size={33} aria-hidden="true" />
    <h2 id="game-results-title" ref={title} tabIndex={-1}>Resultados de la partida</h2>
    {run.settings.duration > 0 && result.elapsedMs === run.settings.duration * 1000 && <p>Se acabó el tiempo.</p>}
    <dl className="game-results-stats">
      <div><dt>Puntos</dt><dd>{result.correct * POINTS_PER_SUCCESS}</dd></div>
      <div><dt>Mejor puntuación</dt><dd>{record?.score ?? result.correct * POINTS_PER_SUCCESS}</dd></div>
      <div><dt>{practice ? 'Señas practicadas' : game.kind === 'memory' ? 'Parejas encontradas' : 'Aciertos'}</dt><dd>{result.correct}</dd></div>
      {practice ? <><div><dt>Coincidencias experimentales guardadas</dt><dd>{result.camera}</dd></div>
        <div><dt>Ejercicios sin cámara</dt><dd>{result.alternative}</dd></div></> : <>
        <div><dt>Intentos</dt><dd>{result.correct + result.errors}</dd></div><div><dt>Errores</dt><dd>{result.errors}</dd></div>
        <div><dt>Tiempo</dt><dd>{timeLabel(Math.floor(result.elapsedMs / 1000))}</dd></div>
        {game.kind === 'memory' && record && <div><dt>Récord personal</dt><dd>{record.details.correct + record.details.errors} intentos · {timeLabel(Math.floor(record.details.elapsedMs / 1000))}</dd></div>}
        {game.kind !== 'memory' && <div><dt>Mejor racha</dt><dd>{result.bestStreak}</dd></div>}
      </>}
    </dl>
    {reward ? <p className="success-message">Ganaste {reward} XP por tu primera partida con aciertos.</p> : <p>La recompensa de {game.rewardXp} XP se otorga una vez por juego al terminar con aciertos.</p>}
    {visual && <ExternalReference className="game-back" href={numbersReference.url}>Consultar la lámina original del MINEDU (nueva pestaña)</ExternalReference>}
    <div className="game-actions"><button className="button button-primary" type="button" onClick={onRepeat}>Volver a jugar</button>
      <button className="button button-outline" type="button" onClick={onSettings}>Cambiar opciones</button></div>
  </section>;
}
