import { useEffect, useRef, useState } from 'react';
import { BookOpen, Bookmark, Camera, Check, ChevronDown, ChevronLeft, ChevronRight, Hand, Heart, LayoutGrid, Search, SearchX, Soup, Sparkles, UsersRound, X } from 'lucide-react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { EducationalVisual, SignMediaViewer } from '../components/SignMediaViewer';
import { ExternalReference } from '../components/ExternalReference';
import { getEducationalSign, libraryCategories, searchLibrary, type LibraryCategory, type LibraryEntry } from '../data/library';
import { getLessonLocation, getLessonPath } from '../data/curriculum';
import { getFreePracticePath } from '../data/practice';
import { getSituationReturnPath } from '../data/situations';
import { getMinigameReturnPath } from '../data/minigames';
import { useStudentProgress } from '../hooks/progressContext';
import { useStudentProfile } from '../hooks/profileContext';

type CategoryFilter = 'all' | LibraryCategory;
const PAGE_SIZE = 6;
const mainCategories = [
  { id: 'all', label: 'Todas', icon: LayoutGrid },
  { id: 'saludo', label: 'Saludo', icon: Hand },
  { id: 'familia', label: 'Familia', icon: UsersRound },
  { id: 'emociones', label: 'Emociones', icon: Heart },
  { id: 'numeros', label: 'Números', icon: null },
] as const;
const extraCategories = [
  { id: 'respuestas', label: 'Respuestas', icon: Check },
  { id: 'alimentos', label: 'Alimentos', icon: Soup },
  { id: 'cotidiano', label: 'Vida cotidiana', icon: Sparkles },
] as const;

function LibraryReference({ entry }: { entry: LibraryEntry }) {
  const { visual, video, document } = entry.media;
  return (
    <div className="library-thumbnail library-card-reference" data-tone={entry.tone}>
      {visual.availability === 'available' && visual.kind !== 'sequence' ? <EducationalVisual visual={visual} decorative />
        : <BookOpen size={31} aria-hidden="true" />}
      {document ? <ExternalReference href={document.location.url}
        label={`Abrir lámina de ${entry.word} (nueva pestaña)`}>Abrir lámina</ExternalReference>
        : <span>{video.availability === 'available' ? 'Video en la ficha' : visual.availability === 'available'
          ? 'Referencia en la ficha' : 'Referencia pendiente'}</span>}
    </div>
  );
}

export function LibraryPage() {
  const { consultSign } = useStudentProgress();
  const { profile, storageAvailable, toggleFavorite } = useStudentProfile();
  const saved = profile.favoriteSignIds ?? [];
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const requested = params.get('sena');
  const selected = requested === null ? undefined : getEducationalSign(requested);
  const situationReturn = getSituationReturnPath(location.state?.situationReturn);
  const minigameReturn = getMinigameReturnPath(location.state?.minigameReturn);
  const lessonState = location.state?.lessonReturn;
  const lessonReturn = typeof lessonState?.lessonId === 'string' ? getLessonLocation(lessonState.lessonId) : undefined;
  const lessonStep = lessonReturn?.lesson.plan?.steps.find(step => step.id === lessonState.stepId);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [compatible, setCompatible] = useState(false);
  const [savedOnly, setSavedOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [savedMessage, setSavedMessage] = useState('');
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const resultsRef = useRef<HTMLElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (selected) {
      consultSign(selected.id);
      if (dialog && !dialog.open) dialog.showModal();
    } else if (dialog?.open) {
      dialog.close();
      if (!dialog.contains(document.activeElement) && document.activeElement === document.body) searchRef.current?.focus();
    }
  }, [consultSign, selected]);
  useEffect(() => {
    if (!moreOpen) return;
    function onPointerDown(event: PointerEvent) {
      if (event.target instanceof Node && !moreRef.current?.contains(event.target)) setMoreOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMoreOpen(false);
        moreButtonRef.current?.focus();
      }
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [moreOpen]);

  const filtered = searchLibrary({ query, category, compatible, favorites: savedOnly ? saved : undefined });
  const hasFilters = !!query || category !== 'all' || compatible || savedOnly;
  const pageCount = Math.ceil(filtered.length / PAGE_SIZE);
  const currentPage = Math.min(page, Math.max(1, pageCount));
  const visibleEntries = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const activeExtra = extraCategories.find(item => item.id === category);
  const selectedCategory = libraryCategories.find(item => item.id === selected?.category);

  function selectCategory(next: CategoryFilter) {
    setCategory(next);
    setPage(1);
    setMoreOpen(false);
  }

  function toggleSaved(entry: LibraryEntry) {
    const next = toggleFavorite(entry.id);
    setSavedMessage(next ? next.includes(entry.id) ? `${entry.word} se guardó para repasar.` : `${entry.word} se quitó de favoritos.`
      : 'Espera a que se termine de guardar el perfil y vuelve a intentarlo.');
  }

  function resetFilters() {
    setQuery('');
    setCompatible(false);
    setSavedOnly(false);
    selectCategory('all');
    searchRef.current?.focus();
  }

  function closeEntry() {
    if (location.state?.libraryCard) navigate(-1);
    else setParams(previous => {
      const next = new URLSearchParams(previous);
      next.delete('sena');
      return next;
    }, { replace: true });
  }

  function changePage(next: number) {
    setPage(next);
    resultsRef.current?.focus({ preventScroll: true });
    if (resultsRef.current && resultsRef.current.getBoundingClientRect().top < 0) {
      resultsRef.current.scrollIntoView({ block: 'start' });
    }
  }

  return (
    <div className="library-page">
      <header className="library-hero">
        <div className="library-book" aria-hidden="true">
          <svg viewBox="0 0 120 104" fill="none" stroke="currentColor" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" focusable="false">
            <path d="M60 22C44 7 20 8 8 16v67c19-8 37-3 52 10 15-13 33-18 52-10V16c-12-8-36-9-52 6Z" fill="#b49aef" />
            <path d="M60 22v71M23 30c8-1 17 1 24 5m-24 12c8-1 17 1 24 5m-24 12c8-1 17 1 24 5m26-34c7-4 15-6 24-5M73 52c7-4 15-6 24-5M73 69c7-4 15-6 24-5" fill="none" />
          </svg>
        </div>
        <div className="library-hero-copy"><h1>Biblioteca de señas</h1><p>Encuentra el vocabulario que necesitas consultar o repasar.</p></div>
        <div className="library-hero-art" aria-hidden="true"><Hand className="library-hand-left" /><Hand className="library-hand-right" /><span>✦</span></div>
      </header>

      <form className="library-search" role="search" aria-label="Buscar en la biblioteca" onSubmit={event => { event.preventDefault(); setPage(1); resultsRef.current?.focus(); }}>
        <Search className="library-search-leading" size={25} aria-hidden="true" />
        <label className="sr-only" htmlFor="library-search">Buscar palabra o expresión</label>
        <input id="library-search" ref={searchRef} type="search" value={query} autoComplete="off" placeholder="Buscar palabra o expresión… (ejemplo: hola)" onChange={event => { setQuery(event.target.value); setPage(1); }} />
        {query && <button className="library-search-clear" type="button" aria-label="Borrar búsqueda" onClick={() => { setQuery(''); setPage(1); searchRef.current?.focus(); }}><X size={20} /></button>}
        <button className="library-search-submit" type="submit" aria-label="Buscar"><Search size={28} aria-hidden="true" /></button>
      </form>

      <div className="library-filters" role="group" aria-label="Filtrar por categoría">
        {mainCategories.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" className={`library-filter${category === id ? ' is-active' : ''}`} aria-pressed={category === id} onClick={() => selectCategory(id)}>
            {Icon ? <Icon size={25} aria-hidden="true" /> : <span className="library-numbers-icon" aria-hidden="true">123</span>}{label}
          </button>
        ))}
        <div className="library-more" ref={moreRef}>
          <button ref={moreButtonRef} type="button" className={`library-filter library-more-button${activeExtra ? ' is-active' : ''}`} aria-expanded={moreOpen} aria-controls="library-extra-categories" onClick={() => setMoreOpen(!moreOpen)}>
            {activeExtra?.label ?? 'Más'}<ChevronDown size={20} aria-hidden="true" />
          </button>
          {moreOpen && <div id="library-extra-categories" className="library-more-options" role="group" aria-label="Más categorías">
            {extraCategories.map(({ id, label, icon: Icon }) => <button key={id} type="button" aria-pressed={category === id} onClick={() => { selectCategory(id); moreButtonRef.current?.focus(); }}><Icon size={20} aria-hidden="true" /><span>{label}</span>{category === id && <Check size={17} aria-hidden="true" />}</button>)}
          </div>}
        </div>
      </div>

      <div className="library-result-toolbar">
        <div className="library-refinements" role="group" aria-label="Filtros adicionales">
          <label><input type="checkbox" checked={compatible} onChange={event => { setCompatible(event.target.checked); setPage(1); }} /> Con reconocimiento</label>
          <label><input type="checkbox" checked={savedOnly} onChange={event => { setSavedOnly(event.target.checked); setPage(1); }} /> Favoritos ({saved.length})</label>
        </div>
        <p role="status">{filtered.length} {filtered.length === 1 ? 'resultado' : 'resultados'}{pageCount > 1 ? ` · Página ${currentPage} de ${pageCount}` : ''}</p>
        {hasFilters && <button type="button" className="button button-outline" onClick={resetFilters}>Limpiar filtros</button>}
      </div>
      {requested !== null && !selected && <div className="library-invalid">
        <p role="status">La ficha solicitada no está disponible.</p>
        <button className="button button-outline" type="button" onClick={() => { closeEntry(); searchRef.current?.focus(); }}>Volver al catálogo</button>
      </div>}
      {!storageAvailable && <p role="status">Los cambios en favoritos se conservarán solo durante esta sesión.</p>}
      {!selected && <p className="sr-only" role="status">{savedMessage}</p>}
      <section className="library-results" aria-label="Palabras de la biblioteca" ref={resultsRef} tabIndex={-1}>
        {visibleEntries.length > 0 ? <div className="library-grid">
          {visibleEntries.map(entry => {
            const isSaved = saved.includes(entry.id);
            const detail = new URLSearchParams(params);
            detail.set('sena', entry.id);
            return (
              <article className="library-card" key={entry.id}>
                <LibraryReference entry={entry} />
                <div className="library-card-copy">
                  <h2>{entry.word}</h2>
                  <span className="library-entry-category">{libraryCategories.find(item => item.id === entry.category)?.label}</span>
                  <span className={`library-compatibility${entry.recognitionClassId ? ' is-compatible' : ''}`}>{entry.recognitionClassId ? 'Con reconocimiento experimental' : 'Sin reconocimiento'}</span>
                  <Link className="library-view" to={{ search: detail.toString() }} state={{ libraryCard: requested === null }}
                    aria-haspopup="dialog" aria-label={`Ver seña: ${entry.word}`}>Ver ficha</Link>
                </div>
                <button className={`library-save${isSaved ? ' is-saved' : ''}`} type="button" aria-label={`${entry.word} en favoritos`} aria-pressed={isSaved} onClick={() => toggleSaved(entry)}><Bookmark size={23} fill={isSaved ? 'currentColor' : 'none'} aria-hidden="true" /></button>
              </article>
            );
          })}
        </div> : <div className="library-empty">
          {savedOnly && !saved.length ? <Bookmark size={40} aria-hidden="true" /> : <SearchX size={40} aria-hidden="true" />}
          <h2>{savedOnly && !saved.length ? 'Aún no tienes favoritos' : 'No hay señas con esos filtros'}</h2>
          <p>{savedOnly && !saved.length ? 'Usa el marcador de una tarjeta para guardarla.' : 'Prueba otra búsqueda o ajusta los filtros.'}</p>
        </div>}
      </section>

      {pageCount > 1 && <nav className="library-pagination" aria-label="Páginas de la biblioteca">
        <button type="button" className="library-page-arrow" aria-label="Página anterior" disabled={currentPage === 1} onClick={() => changePage(currentPage - 1)}><ChevronLeft size={25} aria-hidden="true" /></button>
        {Array.from({ length: pageCount }, (_, index) => index + 1).map(number => <button key={number} type="button" className={currentPage === number ? 'is-current' : ''} aria-label={`Página ${number}`} aria-current={currentPage === number ? 'page' : undefined} onClick={() => changePage(number)}>{number}</button>)}
        <button type="button" className="library-page-arrow" aria-label="Página siguiente" disabled={currentPage === pageCount} onClick={() => changePage(currentPage + 1)}><ChevronRight size={25} aria-hidden="true" /></button>
      </nav>}

      <dialog ref={dialogRef} className="library-dialog" aria-labelledby="library-dialog-title"
        onCancel={event => { event.preventDefault(); closeEntry(); }} onClick={event => { if (event.target === event.currentTarget) closeEntry(); }}>
        <div className="library-dialog-content">
          <button className="library-dialog-close" type="button" aria-label="Cerrar ficha" autoFocus onClick={closeEntry}><X size={24} /></button>
          <span className="library-dialog-category">{selectedCategory?.label}</span>
          <h2 id="library-dialog-title">{selected?.word}</h2>
          <p className="library-dialog-description">{selected?.description}</p>
          {selected && <>
            <div className="library-meaning">
              <div>
                <h3>Referencia y ejecución</h3>
                <SignMediaViewer key={selected.id} sign={selected} />
              </div>
            </div>
            <dl className="library-sign-facts">
              <div><dt>Postura y movimiento</dt><dd>{selected.type === 'static' ? 'Estática · postura sostenida'
                : selected.type === 'dynamic' ? 'Dinámica · incluye movimiento' : 'Pendiente de revisión'}</dd></div>
              <div><dt>Manos</dt><dd>{selected.hands === 1 ? 'Una' : selected.hands === 2 ? 'Dos' : 'Pendiente de revisión'}</dd></div>
              <div><dt>Validación lingüística</dt><dd>{selected.validation === 'pending' ? 'Pendiente de revisión' : 'Revisada'}</dd></div>
              <div><dt>Reconocimiento</dt><dd>{selected.recognitionClassId ? 'Disponible · experimental V1' : 'Sin reconocimiento automático'}</dd></div>
            </dl>
            <p>{selected.meaning}</p>
            {selected.media.document && !selected.recognitionClassId && <p>Usa la referencia para repasar la seña a tu ritmo.</p>}
            <div className="library-dialog-actions">
              {situationReturn && <Link className="button button-outline" to={situationReturn}>Volver a la situación</Link>}
              {minigameReturn && <Link className="button button-outline" to={minigameReturn}>Volver al desafío</Link>}
                {lessonReturn && lessonStep && <Link className="button button-outline" to={getLessonPath(lessonReturn.unit.id, lessonReturn.lesson.id)}
                  state={{ lessonStep: lessonStep.id }}>Volver a la lección</Link>}
              {selected.recognitionClassId && <Link className="button button-primary" to={getFreePracticePath(selected.recognitionClassId)}>
                <Camera size={18} aria-hidden="true" /> Practicar con cámara
              </Link>}
                {selected.lesson && selected.lesson.lessonId !== lessonReturn?.lesson.id &&
                  <Link className="button button-outline" to={getLessonPath(selected.lesson.unitId, selected.lesson.lessonId)}>Ir a {selected.lesson.title}</Link>}
              <button className={`library-dialog-save${saved.includes(selected.id) ? ' is-saved' : ''}`} type="button"
                aria-label={`${selected.word} en favoritos`} aria-pressed={saved.includes(selected.id)} onClick={() => toggleSaved(selected)}>
                <Bookmark size={20} fill={saved.includes(selected.id) ? 'currentColor' : 'none'} aria-hidden="true" />
                {saved.includes(selected.id) ? 'Quitar de favoritos' : 'Guardar en favoritos'}
              </button>
            </div>
            {!storageAvailable && <p role="status">Los cambios en favoritos se conservarán solo durante esta sesión.</p>}
            <p className="sr-only" role="status">{savedMessage}</p>
          </>}
        </div>
      </dialog>
    </div>
  );
}
