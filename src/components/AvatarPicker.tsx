import { useEffect, useRef, useState, type RefObject } from 'react';
import { Check, X } from 'lucide-react';
import { profileAvatars, type AvatarId } from '../data/profile';
import { drawPhotoCrop, encodePhoto, openPhotoFile, type DecodedPhoto } from '../data/profilePhoto';
import { useStudentProfile } from '../hooks/profileContext';
import { StudentAvatar } from './StudentAvatar';
import './AvatarPicker.css';

export function AvatarPicker({ dialogRef, onSaved }: { dialogRef: RefObject<HTMLDialogElement | null>; onSaved: (message: string) => void }) {
  const { profile, photoUrl, photoLoading, saveAvatar, savePhoto } = useStudentProfile();
  const [mode, setMode] = useState<'preset' | 'photo'>('preset');
  const [selected, setSelected] = useState<AvatarId>();
  const [decoded, setDecoded] = useState<DecodedPhoto | null>(null);
  const [zoom, setZoom] = useState(1);
  const [horizontal, setHorizontal] = useState(0);
  const [vertical, setVertical] = useState(0);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const request = useRef(0);

  useEffect(() => () => { decoded?.dispose(); }, [decoded]);
  useEffect(() => () => { request.current++; }, []);
  useEffect(() => {
    if (!decoded || !canvasRef.current) return;
    const frame = requestAnimationFrame(() => {
      try { if (canvasRef.current) drawPhotoCrop(canvasRef.current, decoded, zoom, horizontal, vertical); }
      catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo preparar la vista previa.'); }
    });
    return () => cancelAnimationFrame(frame);
  }, [decoded, zoom, horizontal, vertical]);

  const clearDraft = () => {
    request.current++;
    setDecoded(null); setSelected(undefined); setError(''); setLoading(false);
    setMode('preset');
    if (fileRef.current) fileRef.current.value = '';
  };
  const close = () => { if (!busy) dialogRef.current?.close(); };
  const chooseFile = async (file: File | undefined) => {
    if (!file) return;
    const token = ++request.current;
    setLoading(true); setError(''); setDecoded(null);
    try {
      const image = await openPhotoFile(file);
      if (token !== request.current) { image.dispose(); return; }
      setZoom(1); setHorizontal(0); setVertical(0); setDecoded(image);
    } catch (cause) { if (token === request.current) setError(cause instanceof Error ? cause.message : 'No se pudo leer la foto.'); }
    finally { if (token === request.current) { setLoading(false); if (fileRef.current) fileRef.current.value = ''; } }
  };
  const save = async (remove = false) => {
    setBusy(true); setError('');
    try {
      if (mode === 'photo' && !remove) {
        if (!decoded || !canvasRef.current) return;
        drawPhotoCrop(canvasRef.current, decoded, zoom, horizontal, vertical);
        await savePhoto(await encodePhoto(canvasRef.current));
      } else await saveAvatar(selected ?? profile.avatarId);
      dialogRef.current?.close();
      onSaved(remove ? 'Foto eliminada. Recuperaste tu avatar prediseñado.' : 'Avatar actualizado.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo guardar el avatar.'); }
    finally { setBusy(false); }
  };

  return <dialog id="profile-avatar-dialog" className="profile-dialog sv-motion-dialog" ref={dialogRef} aria-labelledby="profile-avatar-title" aria-describedby="profile-avatar-description" onClose={clearDraft} onCancel={event => { if (busy) event.preventDefault(); }} onClick={event => { if (event.target === event.currentTarget) close(); }}>
    <div className="profile-dialog-heading"><h2 id="profile-avatar-title">Elige tu avatar</h2><button type="button" className="profile-dialog-close" aria-label="Cerrar selector de avatar" autoFocus disabled={busy} onClick={close}><X size={21} /></button></div>
    <p id="profile-avatar-description">Elige un avatar o usa una foto que se guardará solo en este navegador.</p>
    <div className="avatar-modes" role="group" aria-label="Tipo de avatar">
      <button type="button" className="sv-motion-action" aria-pressed={mode === 'preset'} disabled={busy} onClick={() => setMode('preset')}>Avatares prediseñados</button>
      <button type="button" className="sv-motion-action" aria-pressed={mode === 'photo'} disabled={busy} onClick={() => setMode('photo')}>Foto personalizada</button>
    </div>
    <div hidden={mode !== 'preset'} className="profile-avatar-options" role="group" aria-label="Avatares disponibles">{profileAvatars.map(avatar => <button key={avatar.id} type="button" disabled={busy} className={`profile-avatar-option sv-motion-action${(selected ?? profile.avatarId) === avatar.id ? ' is-selected' : ''}`} aria-pressed={(selected ?? profile.avatarId) === avatar.id} onClick={() => setSelected(avatar.id)}>
      <StudentAvatar avatarId={avatar.id} /><span>{avatar.label}</span>{(selected ?? profile.avatarId) === avatar.id && <Check className="profile-avatar-check" size={17} aria-hidden="true" />}
    </button>)}</div>
    <div hidden={mode !== 'photo'} className="avatar-photo-editor">
      <label htmlFor="avatar-photo-file">Subir una foto <span>JPG, PNG o WebP · Hasta 5 MB</span></label>
      <input ref={fileRef} id="avatar-photo-file" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy || loading} onChange={event => { void chooseFile(event.target.files?.[0]); }} />
      {loading && <p role="status">Preparando imagen…</p>}
      {decoded ? <>
        <canvas ref={canvasRef} width={256} height={256} className="avatar-crop-preview" role="img" aria-label="Vista previa circular del recorte de la foto" />
        <div className="avatar-crop-controls">{[
          { label: 'Zoom', value: zoom, set: setZoom, min: 1, max: 3, step: .01 },
          { label: 'Encuadre horizontal', value: horizontal, set: setHorizontal, min: -100, max: 100, step: 1 },
          { label: 'Encuadre vertical', value: vertical, set: setVertical, min: -100, max: 100, step: 1 },
        ].map(control => <label key={control.label}>{control.label}<input type="range" min={control.min} max={control.max} step={control.step} value={control.value} disabled={busy} onChange={event => control.set(Number(event.target.value))} /></label>)}</div>
      </> : <div className="avatar-current-photo"><StudentAvatar avatarId={profile.avatarId} photoUrl={photoUrl} /><p>{photoLoading ? 'Cargando tu foto…' : profile.photoId && !photoUrl ? 'No se pudo cargar la foto guardada. Puedes reemplazarla o eliminarla.' : 'La vista previa aparecerá aquí al seleccionar una imagen.'}</p></div>}
      {profile.photoId && <button type="button" className="avatar-remove-photo" disabled={busy || loading} onClick={() => { void save(true); }}>Eliminar foto y volver a mi avatar</button>}
    </div>
    {error && <p className="profile-error" role="alert">{error}</p>}
    <div className="profile-actions"><button type="button" className="button button-primary sv-motion-action" disabled={busy || loading || (mode === 'photo' && !decoded)} onClick={() => { void save(); }}>{busy ? 'Guardando…' : mode === 'photo' ? 'Guardar foto' : 'Guardar avatar'}</button><button type="button" className="button button-outline sv-motion-action" disabled={busy} onClick={close}>Cancelar</button></div>
  </dialog>;
}
