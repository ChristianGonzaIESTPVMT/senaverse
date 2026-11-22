import { useRef, useState, type FormEvent } from 'react';
import { Award, BookOpen, ChevronRight, Download, Pencil, RotateCcw, Settings2, ShieldCheck, Smile, UserRound, Zap } from 'lucide-react';
import { StudentAvatar } from '../components/StudentAvatar';
import { AvatarPicker } from '../components/AvatarPicker';
import { createProfileBackup } from '../data/profileBackup';
import { readProfilePhoto } from '../data/profilePhotoStore';
import { validateStoredPhoto } from '../data/profilePhoto';
import { PROFILE_BIO_LIMIT, PROFILE_NAME_LIMIT, type PersonalInfoErrors } from '../data/profile';
import { Link } from 'react-router-dom';
import { StudentLevel } from '../components/StudentLevel';
import { useStudentOverview } from '../hooks/useStudentOverview';
import { useStudentProfile } from '../hooks/profileContext';
import { useStudentProgress } from '../hooks/progressContext';
import './ProfilePage.css';

export function ProfilePage() {
  const { profile, storageAvailable, photoUrl, savePersonalInfo, resetProfile } = useStudentProfile();
  const { progress } = useStudentProgress();
  const { summary } = useStudentOverview();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ displayName: profile.displayName, bio: profile.bio });
  const [errors, setErrors] = useState<PersonalInfoErrors>({});
  const [feedback, setFeedback] = useState('');
  const [exportError, setExportError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState('');
  const nameRef = useRef<HTMLInputElement>(null);
  const bioRef = useRef<HTMLTextAreaElement>(null);
  const avatarRef = useRef<HTMLDialogElement>(null);
  const resetRef = useRef<HTMLDialogElement>(null);

  const startEditing = () => {
    setDraft({ displayName: profile.displayName, bio: profile.bio });
    setErrors({});
    setFeedback('');
    setEditing(true);
  };

  const saveInfo = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = savePersonalInfo(draft);
    setErrors(nextErrors);
    if (nextErrors.displayName) nameRef.current?.focus();
    else if (nextErrors.bio) bioRef.current?.focus();
    else {
      setEditing(false);
      setFeedback('Información personal actualizada.');
    }
  };

  const exportData = async () => {
    setExporting(true);
    setExportError('');
    setFeedback('');
    try {
      const photo = profile.photoId ? await readProfilePhoto(profile.photoId) : null;
      if (profile.photoId && !photo) throw new Error('No se pudo leer la foto guardada. Reemplázala o elimínala antes de exportar.');
      if (photo) await validateStoredPhoto(photo);
      const data = await createProfileBackup(profile, progress, photo);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `senaverse-mis-datos-${data.exportedAt.slice(0, 10)}.json`;
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setFeedback('Se inició la descarga de tus datos.');
    } catch {
      setExportError('No se pudieron exportar tus datos. Inténtalo de nuevo.');
    }
  };

  const statistics = [
    { label: 'XP acumulados', value: summary.xp, icon: Zap },
    { label: 'Lecciones completadas', value: summary.curriculum.done, icon: BookOpen },
    { label: 'Logros obtenidos', value: summary.latestAchievements.length, icon: Award },
  ];
  const badges = summary.latestAchievements.slice(0, 3);

  return (
    <div className="profile-page">
      <header className="profile-heading">
        <h1>Mi perfil</h1>
        <p>Personaliza tu experiencia de aprendizaje en SeñaVerse</p>
      </header>

      <section className="profile-panel profile-summary" aria-labelledby="profile-student-name">
        <div className="profile-identity">
          <StudentAvatar avatarId={profile.avatarId} photoUrl={photoUrl} className="profile-main-avatar" />
          <div className="profile-identity-copy">
            <div className="profile-name-row"><h2 id="profile-student-name">{profile.displayName}</h2><span className="profile-local"><ShieldCheck size={14} aria-hidden="true" /> Perfil local</span></div>
            {profile.bio && <p className="profile-bio">{profile.bio}</p>}
          </div>
        </div>
        <dl className="profile-statistics">{statistics.map(({ label, value, icon: Icon }) => <div className="profile-statistic" key={label}>
          <dt><Icon size={18} aria-hidden="true" />{label}</dt>
          <dd>{value.toLocaleString('es-PE')}</dd>
        </div>)}</dl>
        <div className="profile-learning">
          <StudentLevel level={summary.level} xp={summary.xp} />
          <div>
            <h3>Actividad y logros</h3>
            <p>Racha actual de {summary.calendar.current} {summary.calendar.current === 1 ? 'día' : 'días'}.</p>
            {!!summary.historicalLessons && <p>{summary.historicalLessons} {summary.historicalLessons === 1 ? 'finalización anterior' : 'finalizaciones anteriores'} en el historial.</p>}
            {badges.length ? <ul>{badges.map(badge => <li key={badge.id}>{badge.name}</li>)}</ul> : <p>Aún no has obtenido insignias.</p>}
            <Link to="/progreso">Ver mi progreso</Link>
          </div>
        </div>
      </section>

      <div className="profile-details">
        <section className="profile-panel profile-personal" aria-labelledby="profile-personal-title">
          <div className="profile-section-heading">
            <h2 id="profile-personal-title"><UserRound size={21} aria-hidden="true" />Información personal</h2>
            {!editing && <button type="button" className="profile-edit" onClick={startEditing}><Pencil size={15} aria-hidden="true" />Editar</button>}
          </div>
          {editing ? <form className="profile-form" onSubmit={saveInfo} noValidate>
            <div className="profile-field">
              <label htmlFor="profile-display-name">Nombre visible</label>
              <input id="profile-display-name" ref={nameRef} value={draft.displayName} onChange={event => setDraft({ ...draft, displayName: event.target.value })} maxLength={PROFILE_NAME_LIMIT} required autoFocus autoComplete="nickname" aria-invalid={!!errors.displayName} aria-describedby={`profile-name-help${errors.displayName ? ' profile-name-error' : ''}`} />
              <p id="profile-name-help" className="profile-field-help">Hasta {PROFILE_NAME_LIMIT} caracteres.</p>
              {errors.displayName && <p id="profile-name-error" className="profile-error" role="alert">{errors.displayName}</p>}
            </div>
            <div className="profile-field">
              <label htmlFor="profile-bio">Biografía breve <span>(opcional)</span></label>
              <textarea id="profile-bio" ref={bioRef} value={draft.bio} onChange={event => setDraft({ ...draft, bio: event.target.value })} maxLength={PROFILE_BIO_LIMIT} rows={3} aria-invalid={!!errors.bio} aria-describedby={`profile-bio-help${errors.bio ? ' profile-bio-error' : ''}`} />
              <p id="profile-bio-help" className="profile-field-help profile-character-count">{draft.bio.length}/{PROFILE_BIO_LIMIT} caracteres</p>
              {errors.bio && <p id="profile-bio-error" className="profile-error" role="alert">{errors.bio}</p>}
            </div>
            <div className="profile-actions"><button type="submit" className="button button-primary">Guardar cambios</button><button type="button" className="button button-outline" onClick={() => { setEditing(false); setErrors({}); }}>Cancelar</button></div>
          </form> : <dl className="profile-info">
            <div><dt>Nombre visible</dt><dd>{profile.displayName}</dd></div>
            <div><dt>Biografía breve</dt><dd className={profile.bio ? '' : 'profile-empty-bio'}>{profile.bio || 'Aún no has añadido una biografía.'}</dd></div>
          </dl>}
        </section>

        <section className="profile-panel profile-settings" aria-labelledby="profile-settings-title">
          <div className="profile-section-heading"><h2 id="profile-settings-title"><Settings2 size={21} aria-hidden="true" />Configuración</h2></div>
          <div className="profile-setting-list">
            <button type="button" className="profile-setting" aria-haspopup="dialog" aria-controls="profile-avatar-dialog" onClick={() => { avatarRef.current?.showModal(); }}>
              <span className="profile-setting-icon"><Smile size={22} aria-hidden="true" /></span><span className="profile-setting-copy"><strong>Cambiar avatar</strong><span>Elige el que más te represente.</span></span><ChevronRight size={19} aria-hidden="true" />
            </button>
            <button type="button" className="profile-setting" disabled={exporting} onClick={() => { void exportData(); }}>
              <span className="profile-setting-icon"><Download size={22} aria-hidden="true" /></span><span className="profile-setting-copy"><strong>Exportar mis datos</strong><span>Descarga tu perfil y progreso en JSON.</span></span><ChevronRight size={19} aria-hidden="true" />
            </button>
            <button type="button" className="profile-setting profile-setting-reset" aria-haspopup="dialog" aria-controls="profile-reset-dialog" onClick={() => { setResetError(''); resetRef.current?.showModal(); }}>
              <span className="profile-setting-icon"><RotateCcw size={21} aria-hidden="true" /></span><span className="profile-setting-copy"><strong>Restablecer perfil</strong><span>Tu progreso se conserva.</span></span><ChevronRight size={19} aria-hidden="true" />
            </button>
          </div>
        </section>
      </div>

      <p className="profile-feedback" role="status">{feedback}</p>
      {!storageAvailable && <p className="profile-storage-warning" role="status">El almacenamiento del navegador no está disponible. Tus cambios se conservarán solo durante esta sesión.</p>}
      {exportError && <p className="profile-error" role="alert">{exportError}</p>}

      <AvatarPicker dialogRef={avatarRef} onSaved={setFeedback} />

      <dialog id="profile-reset-dialog" className="profile-dialog profile-reset-dialog" ref={resetRef} aria-labelledby="profile-reset-title" aria-describedby="profile-reset-description" onCancel={event => { if (resetting) event.preventDefault(); }} onClick={event => { if (event.target === event.currentTarget && !resetting) resetRef.current?.close(); }}>
        {resetError && <p className="profile-error" role="alert">{resetError}</p>}
        <h2 id="profile-reset-title">¿Restablecer tu perfil?</h2>
        <p id="profile-reset-description">Tu nombre volverá a «Estudiante», se vaciará la biografía, se eliminará tu foto y recuperarás el avatar inicial. Tus XP, lecciones y logros se conservarán.</p>
        <div className="profile-actions"><button type="button" className="button button-outline" autoFocus disabled={resetting} onClick={() => resetRef.current?.close()}>Cancelar</button><button type="button" className="button button-primary" disabled={resetting} onClick={() => { setResetting(true); setResetError(''); void resetProfile().then(() => { setEditing(false); setErrors({}); resetRef.current?.close(); setFeedback('Perfil restablecido. Tu progreso se conserva.'); }).catch(cause => setResetError(cause instanceof Error ? cause.message : 'No se pudo restablecer el perfil.')).finally(() => setResetting(false)); }}>Restablecer perfil</button></div>
      </dialog>
    </div>
  );
}
