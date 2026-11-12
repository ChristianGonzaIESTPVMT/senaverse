import { useEffect, useRef, useState } from 'react';
import { Bookmark, Check, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Frown, Hand, Heart, HeartHandshake, LayoutGrid, Play, Search, SearchX, Smile, Soup, Sparkles, UsersRound, UserRound, Video, X, Droplets, Circle } from 'lucide-react';
import { libraryCategories, libraryEntries, type LibraryCategory, type LibraryEntry } from '../data/library';

type CategoryFilter = 'all' | 'saved' | LibraryCategory;

const SAVED_KEY = 'senaverse-library-saved-v1';
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
  { id: 'saved', label: 'Guardadas', icon: Bookmark },
] as const;

function searchWords(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().match(/[a-z0-9]+/g) ?? [];
}

function readSaved(): string[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(SAVED_KEY) ?? '[]');
    if (Array.isArray(stored)) return libraryEntries.filter(entry => stored.includes(entry.id)).map(entry => entry.id);
  } catch { /* Los marcadores también funcionan durante la sesión sin almacenamiento. */ }
  return [];
}

function LibraryThumbnail({ entry }: { entry: LibraryEntry }) {
  const icons = { wave: Hand, heart: Heart, family: UsersRound, yes: Check, no: X, person: UserRound, happy: Smile, sad: Frown, surprise: Circle, number: Circle, water: Droplets, food: Soup, help: HeartHandshake };
  const Icon = icons[entry.visual];

  return (
    <div className={`library-thumbnail library-thumbnail-${entry.visual}`} data-tone={entry.tone} aria-hidden="true">
      {entry.thumbnailSrc ? <img src={entry.thumbnailSrc} alt="" loading="lazy" /> : <>
        <span className="library-thumbnail-orbit" />
        {entry.number ? <span className="library-thumbnail-number">{entry.number}</span> : <Icon className="library-thumbnail-icon" strokeWidth={1.65} />}
        <span className="library-thumbnail-label">LSP</span>
      </>}
    </div>
  );
}

export function LibraryPage() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [page, setPage] = useState(1);
  const [saved, setSaved] = useState(readSaved);
  const [savedMessage, setSavedMessage] = useState('');
  const [moreOpen, setMoreOpen] = useState(false);
  const [selected, setSelected] = useState<LibraryEntry | null>(null);
  const moreRef = useRef<HTMLDivElement>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const resultsRef = useRef<HTMLElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try { localStorage.setItem(SAVED_KEY, JSON.stringify(saved)); } catch { /* Usar marcadores en memoria. */ }
  }, [saved]);

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

  const terms = searchWords(query);
  const filtered = libraryEntries.filter(entry => {
    const inCategory = category === 'all' || (category === 'saved' ? saved.includes(entry.id) : entry.category === category);
    const words = searchWords([entry.word, entry.description, ...(entry.keywords ?? [])].join(' '));
    return inCategory && terms.every(term => words.some(word => word.startsWith(term)));
  });
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
    const isSaved = saved.includes(entry.id);
    setSaved(previous => isSaved ? previous.filter(id => id !== entry.id) : [...previous, entry.id]);
    setSavedMessage(isSaved ? `${entry.word} se quitó de guardadas.` : `${entry.word} se guardó para repasar.`);
  }

  function resetFilters() {
    setQuery('');
    selectCategory('all');
  }

  function openEntry(entry: LibraryEntry) {
    setSelected(entry);
    dialogRef.current?.showModal();
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
            <span className="library-more-caption">SIGUE EXPLORANDO</span>
            {extraCategories.map(({ id, label, icon: Icon }) => <button key={id} type="button" aria-pressed={category === id} onClick={() => { selectCategory(id); moreButtonRef.current?.focus(); }}><Icon size={20} aria-hidden="true" /><span>{label}</span>{id === 'saved' && <span className="library-saved-count">{saved.length}</span>}{id !== 'saved' && category === id && <Check size={17} aria-hidden="true" />}</button>)}
          </div>}
        </div>
      </div>

      <p className="sr-only" role="status">{filtered.length} {filtered.length === 1 ? 'resultado' : 'resultados'}. {filtered.length > 0 ? `Página ${currentPage} de ${pageCount}.` : ''}</p>
      <p className="sr-only" role="status">{savedMessage}</p>
      <section className="library-results" aria-label="Palabras de la biblioteca" ref={resultsRef} tabIndex={-1}>
        {visibleEntries.length > 0 ? <div className="library-grid">
          {visibleEntries.map(entry => {
            const isSaved = saved.includes(entry.id);
            return (
              <article className="library-card" key={entry.id}>
                <LibraryThumbnail entry={entry} />
                <div className="library-card-copy"><h2>{entry.word}</h2><p>{entry.description}</p><button className="library-view" type="button" aria-haspopup="dialog" aria-label={`Ver seña: ${entry.word}`} onClick={() => openEntry(entry)}><Play size={17} fill="currentColor" aria-hidden="true" />Ver seña</button></div>
                <button className={`library-save${isSaved ? ' is-saved' : ''}`} type="button" aria-label={isSaved ? `Quitar ${entry.word} de guardadas` : `Guardar ${entry.word}`} aria-pressed={isSaved} onClick={() => toggleSaved(entry)}><Bookmark size={23} fill={isSaved ? 'currentColor' : 'none'} aria-hidden="true" /></button>
              </article>
            );
          })}
        </div> : <div className="library-empty">
          {category === 'saved' && !query ? <Bookmark size={40} aria-hidden="true" /> : <SearchX size={40} aria-hidden="true" />}
          <h2>{category === 'saved' && !query ? 'Tus favoritas, siempre a mano' : 'No encontramos esa palabra'}</h2>
          <p>{category === 'saved' && !query ? 'Toca el marcador de una tarjeta para guardarla y volver a repasarla cuando quieras.' : 'Prueba con otra palabra o cambia la categoría para seguir explorando.'}</p>
          <button type="button" className="button button-primary" onClick={resetFilters}>{category === 'saved' && !query ? 'Explorar la biblioteca' : 'Limpiar filtros'}</button>
        </div>}
      </section>

      {pageCount > 1 && <nav className="library-pagination" aria-label="Páginas de la biblioteca">
        <button type="button" className="library-page-arrow" aria-label="Página anterior" disabled={currentPage === 1} onClick={() => changePage(currentPage - 1)}><ChevronLeft size={25} aria-hidden="true" /></button>
        {Array.from({ length: pageCount }, (_, index) => index + 1).map(number => <button key={number} type="button" className={currentPage === number ? 'is-current' : ''} aria-label={`Página ${number}`} aria-current={currentPage === number ? 'page' : undefined} onClick={() => changePage(number)}>{number}</button>)}
        <button type="button" className="library-page-arrow" aria-label="Página siguiente" disabled={currentPage === pageCount} onClick={() => changePage(currentPage + 1)}><ChevronRight size={25} aria-hidden="true" /></button>
      </nav>}

      <dialog ref={dialogRef} className="library-dialog" aria-labelledby="library-dialog-title" onClose={() => { videoRef.current?.pause(); setSelected(null); }} onClick={event => { if (event.target === event.currentTarget) dialogRef.current?.close(); }}>
        <div className="library-dialog-content">
          <button className="library-dialog-close" type="button" aria-label="Cerrar ficha" autoFocus onClick={() => dialogRef.current?.close()}><X size={24} /></button>
          <span className="library-dialog-category">{selectedCategory?.label}</span>
          <h2 id="library-dialog-title">{selected?.word}</h2>
          <p className="library-dialog-description">{selected?.description}</p>
          {selected && <>
            {selected.videoSrc ? <video key={selected.id} ref={videoRef} className="library-video" controls playsInline preload="metadata" poster={selected.thumbnailSrc} aria-label={`Video de ${selected.word} en LSP`}>
              <source src={selected.videoSrc} />
              {selected.captionsSrc && <track kind="captions" src={selected.captionsSrc} srcLang="es" label="Español" default />}
              Tu navegador no admite la reproducción de este video.
            </video> : <div className="library-video-placeholder"><LibraryThumbnail entry={selected} /><span><Video size={20} aria-hidden="true" />Video próximamente</span><p>Aquí encontrarás la demostración en Lengua de Señas Peruana.</p></div>}
            <div className="library-meaning"><CircleHelp size={20} aria-hidden="true" /><div><h3>¿Qué significa?</h3><p>{selected.meaning}</p></div></div>
            <button className={`library-dialog-save${saved.includes(selected.id) ? ' is-saved' : ''}`} type="button" aria-pressed={saved.includes(selected.id)} onClick={() => toggleSaved(selected)}><Bookmark size={20} fill={saved.includes(selected.id) ? 'currentColor' : 'none'} aria-hidden="true" />{saved.includes(selected.id) ? 'Guardada para repasar' : 'Guardar para repasar'}</button>
          </>}
        </div>
      </dialog>
    </div>
  );
}
