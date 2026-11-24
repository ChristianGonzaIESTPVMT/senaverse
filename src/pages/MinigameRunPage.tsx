import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Link2, RotateCcw, Trophy } from 'lucide-react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { QuizSignMedia } from '../components/QuizSignMedia';
import { getEducationalSign } from '../data/library';
import { signQuizMedia } from '../data/signQuizMedia';
import { numberIds, playElapsed, playLimit, playMove, playResult, playSettings,
  pointsPerMatch, startPlay, type GameBoard, type Play } from '../data/gameMechanics';
import { gameDurations, getMinigame, type Minigame } from '../data/minigames';
import { summarizeMinigame } from '../data/progress';
import { useStudentProgress } from '../hooks/progressContext';

const CameraGame = lazy(async () => ({ default: (await import('../components/RecognitionPractice')).GameRecognitionPractice }));
type Send = (action: Parameters<typeof playMove>[1]) => void;
const word = (id: string) => getEducationalSign(id)?.word ?? '';
const quantity = (id: string) => numberIds.findIndex(number => number === id) + 1;
const durationLabel = (ms: number) => {
  const seconds = Math.floor(Math.max(0, ms) / 1000);
  return Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0');
};

function Sign({ id, diagram = false }: { id: string; diagram?: boolean }) {
  const sign = getEducationalSign(id);
  if (!sign) return null;
  const media = signQuizMedia(sign, diagram ? 'diagram' : 'photo') ?? signQuizMedia(sign, 'diagram');
  return media ? <QuizSignMedia key={id + ':' + media.kind} media={media} /> : null;
}

function explanation(id: string) {
  const sign = getEducationalSign(id);
  return sign && signQuizMedia(sign, 'diagram')?.description;
}

function Quantity({ id }: { id: string }) {
  return <span className="game-quantity"><strong>{word(id)}</strong><span aria-label={'Cantidad ' + quantity(id)}>{'●'.repeat(quantity(id))}</span></span>;
}

export function MinigameRunPage({ viaCamera = false }: { viaCamera?: boolean }) {
  const { gameId } = useParams();
  const [params] = useSearchParams();
  const game = getMinigame(viaCamera ? 'senas' : gameId);
  if (!game) return <Navigate to="/minijuegos" replace />;
  return <GameSession key={game.id + ':' + viaCamera} game={game} viaCamera={viaCamera} initialSize={params.get('cantidad')} />;
}

function GameSession({ game, viaCamera, initialSize }: { game: Minigame; viaCamera: boolean; initialSize: string | null }) {
  const { progress, recordActivity } = useStudentProgress();
  const [settings, setSettings] = useState(() => playSettings(game, { mode: viaCamera ? 'camera' : 'visual',
    difficulty: initialSize === '5' ? 'avanzado' : initialSize === '4' ? 'intermedio' : 'basico' }));
  const [run, setRun] = useState<Play>();
  const [clock, setClock] = useState(0);
  const runId = run?.id;
  const running = !!run && !run.ended;
  const activeTimer = running && run.activeSince !== null;
  const result = run && playResult(run);
  const best = summarizeMinigame(progress, game, settings, playLimit(game, settings), run?.assisted).best;
  const assistedBest = !run && game.id === 'senas' ? summarizeMinigame(progress, game, settings, playLimit(game, settings), true).best : undefined;
  const supportsCamera = game.id === 'senas' || game.id === 'desafio';

  const send = useCallback<Send>(action => setRun(previous => previous && previous.id === runId ? playMove(previous, action) : previous), [runId]);
  const ready = useCallback((available: boolean) => send({ type: available ? 'resume' : 'pause', at: Date.now() }), [send]);
  const gesture = useCallback((id: string, step: number) => send({ type: 'gesture', id, step, at: Date.now() }), [send]);

  useEffect(() => {
    if (!activeTimer) return;
    const timer = window.setInterval(() => {
      const at = Date.now();
      setClock(at);
      send({ type: 'tick', at });
    }, 125);
    return () => window.clearInterval(timer);
  }, [activeTimer, send]);

  useEffect(() => {
    if (!run?.ended) return;
    const details = playResult(run)!;
    recordActivity({ type: 'minigame', runId: run.id, gameId: game.id, completed: true,
      score: details.correct * pointsPerMatch, maxScore: details.limit * pointsPerMatch, details });
  }, [game.id, recordActivity, run]);

  function start() {
    const at = Date.now();
    setClock(at);
    setRun(startPlay(game, settings, crypto.randomUUID(), at));
  }

  const now = run ? Math.max(clock, run.lastAt) : 0;
  const elapsed = run ? playElapsed(run, now) : 0;
  const countdown = run?.board.kind === 'sprint' && run.activeSince !== null ? Math.ceil((run.activeSince - now) / 1000) : 0;
  const waitingCamera = run?.board.kind === 'sprint' && run.settings.mode === 'camera' && run.activeSince === null;
  return <div className="minigames-page minigame-session" data-game={game.id}>
    <Link className="game-back" to={viaCamera ? '/camara' : '/minijuegos'}><ArrowLeft size={18} aria-hidden="true" />{viaCamera ? 'Centro de práctica' : 'Minijuegos'}</Link>
    <header className="minigames-heading"><h1>{game.title}</h1><p>{game.objective}</p></header>
    {!run && <section className="game-panel game-setup">
      <h2>Configura tu partida</h2>
      <div className="game-settings">
        <label>Nivel<select value={settings.difficulty} onChange={event => setSettings(playSettings(game, { ...settings, difficulty: event.target.value as Play['settings']['difficulty'] }))}>
          <option value="basico">{game.id === 'memoria' ? 'Fácil' : 'Principiante'}</option>
          <option value="intermedio">Intermedio</option>
          <option value="avanzado">{game.id === 'memoria' ? 'Difícil' : 'Avanzado'}</option>
        </select></label>
        {supportsCamera && <label>Modalidad<select value={settings.mode} onChange={event => setSettings(playSettings(game, { ...settings, mode: event.target.value === 'camera' ? 'camera' : 'visual' }))}>
          <option value="visual">Visual · sin cámara</option><option value="camera">Cámara experimental</option>
        </select></label>}
        {game.id === 'desafio' && <label>Duración<select value={settings.duration} onChange={event => setSettings(playSettings(game, { ...settings, duration: Number(event.target.value) as Play['settings']['duration'] }))}>
          {gameDurations.map(seconds => <option key={seconds} value={seconds}>{seconds ? seconds + ' segundos' : 'Sin límite de tiempo'}</option>)}
        </select></label>}
      </div>
      <p>{playLimit(game, settings)} {game.id === 'memoria' || game.id === 'relaciona' ? 'parejas' : game.id === 'senas' ? 'señas' : 'objetivos'} por partida.</p>
      {best && <p>Récord de esta configuración{game.id === 'senas' && ' sin ayuda'} · {best.score} puntos{best.details.moves !== undefined && ' · ' + best.details.moves + ' movimientos'} · {durationLabel(best.details.elapsedMs)}</p>}
      {assistedBest && <p>Récord con ayuda · {assistedBest.score} puntos · {durationLabel(assistedBest.details.elapsedMs)}</p>}
      <p className="game-source">Fotografías educativas de SeñaVerse y diagramas basados en el MINEDU. Revisión lingüística pendiente.</p>
      <button type="button" className="button button-primary" onClick={start}>Iniciar partida</button>
    </section>}
    {run && running && <>
      <div className="game-score" aria-label="Estado de la partida">
        <span><strong data-score>{run.correct * pointsPerMatch}</strong> puntos</span>
        <span><strong>{run.correct}</strong> {game.id === 'memoria' || game.id === 'relaciona' ? (run.correct === 1 ? 'pareja' : 'parejas') : (run.correct === 1 ? 'acierto' : 'aciertos')}</span>
        <span><strong data-errors>{run.errors}</strong> {run.errors === 1 ? 'error' : 'errores'}</span>
        {run.board.kind === 'memory' ? <span><strong>{run.correct + run.errors}</strong> movimientos</span>
          : <span><strong>{run.streak}</strong> {run.board.kind === 'sprint' ? 'de combo' : 'de racha'}</span>}
        <span role="timer" aria-label={settings.duration ? 'Tiempo restante' : 'Tiempo transcurrido'}><strong>
          {durationLabel(settings.duration ? Math.ceil((settings.duration * 1000 - elapsed) / 1000) * 1000 : elapsed)}
        </strong> {settings.duration ? 'restante' : 'transcurrido'}</span>
      </div>
      <progress className="game-progress" value={run.correct} max={run.limit} aria-label="Aciertos de la partida" />
      {run.board.kind === 'association' && <Association key={run.id} board={run.board} send={send} />}
      {run.board.kind === 'memory' && <Memory board={run.board} send={send} />}
      {run.board.kind === 'guess' && <Interpretation key={run.id + ':' + run.board.step} board={run.board} send={send} />}
      {run.board.kind === 'sequence' && <Sequence key={run.id} run={run} board={run.board} send={send} ready={ready} gesture={gesture} />}
      {run.board.kind === 'sprint' && <section className="game-panel game-sprint" aria-label="Reto en curso">
        <div className="game-sprint-prompt">
          <p className="game-progress-label">Objetivo {run.board.step + 1} de {run.limit}</p>
          {waitingCamera ? <h2>Prepara la cámara</h2> : countdown > 0 ? <h2 role="status" className="game-countdown">Empieza en {countdown}</h2>
            : settings.mode === 'camera' ? <h2>Realiza «<span data-target>{word(run.board.targets[run.board.step])}</span>»</h2> : null}
          {settings.mode === 'camera' && !waitingCamera && countdown <= 0 && <div className="game-gesture-reference"><Sign id={run.board.targets[run.board.step]} diagram /></div>}
        </div>
        {settings.mode === 'camera' ? <Suspense fallback={<p role="status">Cargando cámara…</p>}>
          <CameraGame key={run.id} step={run.board.step} accepting={!waitingCamera && countdown <= 0} onReady={ready} onGesture={gesture} />
        </Suspense> : countdown > 0 ? null : <Interpretation key={run.id + ':' + run.board.step} board={run.board} send={send} sprint />}
      </section>}
      <div className="game-actions">
        <button className="button button-outline" type="button" onClick={start}><RotateCcw size={17} aria-hidden="true" /> Reiniciar partida</button>
        <button className="button button-outline" type="button" onClick={() => setRun(undefined)}>Abandonar partida</button>
      </div>
    </>}
    {run && result && <Results game={game} run={run} result={result} best={best}
      reward={progress.activities.find(activity => activity.id === 'minigame:' + run.id)?.rewardXp}
      repeat={start} options={() => setRun(undefined)} />}
  </div>;
}

function Association({ board, send }: { board: Extract<GameBoard, { kind: 'association' }>; send: Send }) {
  const [selected, setSelected] = useState('');
  const [rejected, setRejected] = useState(false);
  const connect = (source: string, destination: string, at: number) => {
    if (!source || !board.sources.includes(source) || board.locked.includes(source) || board.locked.includes(destination)) return;
    send({ type: 'link', source, destination, at });
    setSelected('');
    setRejected(false);
  };

  return <section className="game-panel game-association" aria-label="Tablero de asociación">
    <h2>Conecta cada seña con una cantidad</h2>
    <p>Selecciona una seña y luego una cantidad. También puedes arrastrar la seña hacia su destino.</p>
    <div className="game-association-grid">
      <div><h3>Señas</h3>{board.sources.map((id, index) => <button key={id} type="button" className="game-association-item"
        data-source-index={index} data-pair={board.locked.includes(id) ? 'correct' : board.checked && board.pairs[id] ? 'wrong' : undefined}
        aria-pressed={selected === id} aria-label={'Seña ' + (index + 1) + '. ' + explanation(id) + (board.pairs[id] ? ' Conectada con ' + word(board.pairs[id]) : '')}
        disabled={board.locked.includes(id)} draggable={!board.locked.includes(id)}
        onDragStart={event => { event.dataTransfer.effectAllowed = 'link'; event.dataTransfer.setData('text/plain', id); }}
        onClick={() => { setSelected(selected === id ? '' : id); setRejected(false); }}>
        <span className="game-connector">{index + 1}</span><Sign id={id} diagram={index % 2 === 1} />
        {board.pairs[id] && <Link2 size={17} aria-hidden="true" />}
      </button>)}</div>
      <div><h3>Cantidades</h3>{board.destinations.map((id, index) => {
        const origin = Object.keys(board.pairs).find(source => board.pairs[source] === id);
        return <button key={id} type="button" className="game-association-item" data-destination-index={index}
          data-pair={board.locked.includes(id) ? 'correct' : board.checked && origin ? 'wrong' : undefined}
          disabled={board.locked.includes(id)}
          onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); connect(event.dataTransfer.getData('text/plain'), id, Date.now()); }}
          onClick={() => selected ? connect(selected, id, Date.now()) : setRejected(true)}>
          <span className="game-connector">{origin ? board.sources.indexOf(origin) + 1 : '–'}</span><Quantity id={id} />
          {board.locked.includes(id) && <Check size={17} aria-hidden="true" />}
        </button>;
      })}</div>
    </div>
    <p role="status">{rejected ? 'Selecciona primero una seña.' : selected ? 'Seña ' + (board.sources.indexOf(selected) + 1) + ' seleccionada. Elige una cantidad.'
      : board.checked ? 'Las conexiones marcadas se pueden corregir.' : Object.keys(board.pairs).length + ' conexiones de ' + board.sources.length}</p>
    {board.checked && <ul className="game-feedback-list">{board.sources.map((id, index) => <li key={id}>
      <strong>Seña {index + 1} · {board.locked.includes(id) ? 'Correcta' : 'Revisar'}</strong> {explanation(id)}
    </li>)}</ul>}
    <button className="button button-primary" type="button" disabled={board.checked || Object.keys(board.pairs).length !== board.sources.length}
      onClick={() => send({ type: 'check', at: Date.now() })}>Comprobar conexiones</button>
  </section>;
}

function Memory({ board, send }: { board: Extract<GameBoard, { kind: 'memory' }>; send: Send }) {
  const waiting = board.open.length === 2;
  const cards = useRef<(HTMLButtonElement | null)[]>([]);
  return <section className="game-panel game-memory" aria-label="Tablero de memoria">
    <h2>Descubre las parejas</h2>
    <p role="status">{waiting ? 'Estas cartas no forman pareja.' : board.open.length ? 'Gira una segunda carta.' : 'Parejas encontradas · ' + board.matched.length / 2 + ' de ' + board.cards.length / 2}</p>
    <div className="game-card-grid">{board.cards.map((card, index) => {
      const matched = board.matched.includes(index);
      const visible = matched || board.open.includes(index);
      return <button className="game-memory-card" key={index} type="button" ref={node => { cards.current[index] = node; }}
        data-state={matched ? 'matched' : visible ? 'open' : 'hidden'} aria-disabled={matched || visible || waiting}
        aria-label={'Carta ' + (index + 1) + (matched ? ', pareja encontrada' : visible ? card.visual ? ', ' + explanation(card.id) : ', ' + word(card.id) : ' oculta')}
        onClick={() => send({ type: 'flip', index, at: Date.now() })}>
        <span className="game-card-face">{visible ? card.visual ? <Sign id={card.id} diagram={quantity(card.id) % 2 === 0} />
          : <Quantity id={card.id} /> : <span aria-hidden="true">?</span>}</span>
        {matched && <Check className="game-match-check" size={17} aria-hidden="true" />}
      </button>;
    })}</div>
    {waiting && <button className="button button-outline game-restart" type="button" onClick={() => {
      cards.current[board.open[0]]?.focus();
      send({ type: 'hide', at: Date.now() });
    }}>Ocultar tarjetas</button>}
  </section>;
}

function Interpretation({ board, send, sprint = false }: { board: Extract<GameBoard, { kind: 'guess' | 'sprint' }>; send: Send; sprint?: boolean }) {
  const id = board.targets[board.step];
  const answered = board.answer !== undefined;
  const [diagram, setDiagram] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);
  return <div className={'game-interpretation' + (sprint ? '' : ' game-panel')}>
    <div>
      <p className="game-progress-label">{sprint ? 'Interpretación rápida' : 'Ronda ' + (board.step + 1) + ' de ' + board.targets.length}</p>
      <h2 ref={heading} tabIndex={-1}>¿Qué seña observas?</h2>
      <div className="game-observation"><Sign id={id} diagram={diagram} /></div>
      {answered && <button className="button button-outline game-restart" type="button" onClick={() => setDiagram(!diagram)}>{diagram ? 'Volver a la fotografía' : 'Volver a observar con el diagrama'}</button>}
    </div>
    <div>
      <div className="game-options" role="group" aria-label="Significados posibles">
        {board.options[board.step].map(option => <button className="button button-outline" key={option} type="button" aria-disabled={answered}
          data-answer={answered && option === id ? 'correct' : option === board.answer ? 'wrong' : undefined}
          onClick={() => send({ type: 'answer', id: option, step: board.step, at: Date.now() })}>{word(option)}</button>)}
      </div>
      {answered && <div className="game-quiz-feedback" role="status">
        <p><strong>{board.answer === id ? 'Correcto.' : 'La respuesta era'} {word(id)}.</strong> {explanation(id)}</p>
        <button className="button button-primary" type="button" onClick={() => send({ type: 'next', step: board.step, at: Date.now() })}>{board.step + 1 === board.targets.length ? 'Ver resultados' : 'Siguiente seña'}</button>
      </div>}
    </div>
  </div>;
}

function Sequence({ run, board, send, ready, gesture }: { run: Play; board: Extract<GameBoard, { kind: 'sequence' }>; send: Send;
  ready: (ready: boolean) => void; gesture: (id: string, step: number) => void }) {
  const showing = board.phase !== 'recall';
  const camera = run.settings.mode === 'camera';
  const resumeCamera = useCallback((available: boolean) => ready(available && !showing), [ready, showing]);
  return <section className="game-panel game-sequence" aria-label="Secuencia de señas">
    <h2>{showing ? 'Memoriza el orden' : camera ? 'Reproduce la secuencia' : 'Reconstruye la secuencia'}</h2>
    <ol className="game-sequence-track">{board.targets.map((id, index) => {
      const placed = board.ordered[index];
      const confirmed = index < board.step;
      return <li key={index} className="game-sequence-slot" data-confirmed={confirmed} aria-current={!showing && index === (camera ? board.step : board.ordered.length) ? 'step' : undefined}>
        <span>{index + 1}</span>
        {showing || placed ? <Sign id={showing ? id : placed} diagram /> : confirmed ? <Check size={24} aria-label="Confirmada" /> : <span aria-label="Por completar">·</span>}
      </li>;
    })}</ol>
    {!showing && <p role="status">{camera ? 'Posición ' + (board.step + 1) + ' de ' + run.limit + (run.errors ? ' · Intenta de nuevo si el modelo confirma otra seña.' : '')
      : board.step ? 'El comienzo es correcto. Corrige a partir de la posición ' + (board.step + 1) + '.' : 'Añade las tarjetas en el orden que recuerdas.'}</p>}
    {camera && board.phase !== 'study' && <div hidden={showing}>
      <Suspense fallback={<p role="status">Cargando cámara…</p>}>
        <CameraGame accepting={!showing} step={board.step} onReady={resumeCamera} onGesture={gesture} />
      </Suspense>
    </div>}
    {showing ? <button className="button button-primary" type="button" onClick={() => send({ type: 'recall', at: Date.now() })}>
      {board.phase === 'hint' ? 'Ocultar ayuda' : 'Ocultar secuencia y empezar'} <ArrowRight size={17} aria-hidden="true" />
    </button> : <>
      {!camera && <div className="game-sequence-choices" role="group" aria-label="Tarjetas para ordenar">{board.choices.map((id, index) => <button key={id} type="button"
          className="button button-outline" data-choice-index={index} aria-pressed={board.ordered.includes(id)}
          disabled={board.ordered.includes(id) || board.ordered.length === run.limit}
          onClick={() => send({ type: 'pick', id, at: Date.now() })}><Sign id={id} diagram={index % 2 === 0} /></button>)}</div>}
      <div className="game-actions">
        {!camera && <>
          <button className="button button-primary" type="button" disabled={board.ordered.length !== run.limit} onClick={() => send({ type: 'check', at: Date.now() })}>Comprobar secuencia</button>
          <button className="button button-outline" type="button" disabled={board.ordered.length <= board.step} onClick={() => send({ type: 'undo', at: Date.now() })}>Quitar última tarjeta</button>
        </>}
        <button className="button button-outline" type="button" onClick={() => send({ type: 'hint', at: Date.now() })}>Ver ayuda</button>
      </div>
    </>}
  </section>;
}

function Results({ game, run, result, reward, best, repeat, options }: { game: Minigame; run: Play; result: NonNullable<ReturnType<typeof playResult>>;
  reward?: number; best: ReturnType<typeof summarizeMinigame>['best']; repeat: () => void; options: () => void }) {
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => { title.current?.focus(); }, []);
  const points = result.correct * pointsPerMatch;
  return <section className="game-panel game-results" aria-labelledby="game-results-title">
    <Trophy size={32} aria-hidden="true" /><h2 id="game-results-title" tabIndex={-1} ref={title}>Resultados de la partida</h2>
    <p>{run.settings.mode === 'camera' ? 'Cámara experimental' : 'Modalidad visual'}
      {game.id === 'senas' && (result.assisted ? ' · Con ayuda' : ' · Sin ayuda')}
      {run.settings.duration > 0 && result.elapsedMs === run.settings.duration * 1000 && ' · Tiempo agotado'}</p>
    <dl className="game-results-stats">
      <div><dt>Puntos</dt><dd>{points}</dd></div><div><dt>Récord personal</dt><dd>{best?.score ?? points} puntos</dd></div>
      <div><dt>Aciertos</dt><dd>{result.correct} / {result.limit}</dd></div><div><dt>Errores</dt><dd>{result.errors}</dd></div>
      <div><dt>Tiempo de juego</dt><dd>{durationLabel(result.elapsedMs)}</dd></div>
      {result.moves !== undefined ? <div><dt>Movimientos</dt><dd>{result.moves} · mejor {best?.details.moves ?? result.moves}</dd></div>
        : <div><dt>Mejor racha</dt><dd>{result.bestStreak}</dd></div>}
    </dl>
    {run.board.kind === 'association' && <ul className="game-feedback-list">{run.board.sources.map(id => <li key={id}><strong>{word(id)}</strong> · {explanation(id)}</li>)}</ul>}
    {run.board.kind === 'sequence' && <p>Secuencia completada · {run.board.targets.map(word).join(' → ')}</p>}
    {reward ? <p className="success-message">Ganaste {reward} XP por tu primera partida con aciertos.</p>
      : <p>La recompensa de {game.rewardXp} XP se otorga una vez por juego al terminar con aciertos.</p>}
    <div className="game-actions"><button className="button button-primary" type="button" onClick={repeat}>Volver a jugar</button>
      <button className="button button-outline" type="button" onClick={options}>Cambiar opciones</button></div>
  </section>;
}
