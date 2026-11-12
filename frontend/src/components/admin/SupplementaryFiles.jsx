import { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import { fileUrl } from '../../utils/fileUrl';
import { MAX_UPLOAD_MB } from '../../config/limits';

// ============================================================
// SupplementaryFiles — documents supplémentaires publiés avec l'article
// (figures, tableaux en plus, jeux de données…). Réservé à l'éditeur.
//
// Deux façons de remplir la liste publique, qui se combinent :
//   1. cocher des fichiers déjà déposés par l'auteur (types ci-dessous) ;
//   2. déposer ses propres fichiers (par ex. une version propre d'un tableau).
// Les lecteurs les voient sur la page de l'article, une fois publié.
// API : PUT/POST/DELETE /submissions/:id/supplementary (backend/routes/submissions.js).
// ============================================================

// Types de fichiers du formulaire de soumission qui peuvent devenir publics
// (même liste que backend/utils/supplementary.js — le serveur reste juge).
const PUBLISHABLE_TYPES = ['Supplementary Material', 'Figure', 'Table', 'Dataset', 'Video', 'e-component'];
const ACCEPT = '.pdf,.docx,.xlsx,.csv,.txt,.zip,.png,.jpg,.jpeg,.tif,.tiff,.eps';

const fmtSize = (bytes) => {
  const n = Number(bytes);
  if (!n) return '';
  return n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;
};

// Par défaut : pour un même nom de fichier, la version la plus récente (le dernier tour de révision)
const latestPerName = (list) => {
  const best = new Map();
  for (const f of list) {
    const key = String(f.original_name || f.id).toLowerCase();
    const cur = best.get(key);
    if (!cur || (Number(f.revision_round) || 0) > (Number(cur.revision_round) || 0)) best.set(key, f);
  }
  return [...best.values()];
};

const sameSet = (a, b) => a.size === b.size && [...a].every(x => b.has(x));

const IconFile = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
  </svg>
);
const IconTrash = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
  </svg>
);

const Tag = ({ children }) => (
  <span className="text-xs font-medium px-1.5 py-0.5 rounded-sm flex-shrink-0" style={{ background: '#EEF5F1', color: '#1B4427' }}>
    {children}
  </span>
);

const SupplementaryFiles = ({ submissionId, status, authorFiles = [], published = [], onChange }) => {
  const candidates = useMemo(
    () => authorFiles.filter(f => PUBLISHABLE_TYPES.includes(f.file_type)),
    [authorFiles]
  );
  const savedIds = useMemo(
    () => new Set(published.filter(p => p.source_file_id).map(p => p.source_file_id)),
    [published]
  );
  const savedKey = [...savedIds].sort().join(',');
  const candidatesKey = candidates.map(f => f.id).join(',');
  const editorFiles = published.filter(p => !p.source_file_id);    // déposés par l'éditeur (ou source disparue)

  // Sélection en cours : celle déjà enregistrée ; à défaut, suggestion = fichiers de la dernière version de chaque nom
  const [selected, setSelected] = useState(new Set());
  const [touched, setTouched]   = useState(false);   // une sélection a déjà été enregistrée pendant cette visite
  useEffect(() => {
    if (savedIds.size > 0 || touched) setSelected(new Set(savedIds));
    else setSelected(new Set(latestPerName(candidates).map(f => f.id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedKey, candidatesKey]);

  const [saving, setSaving]       = useState(false);
  const [notice, setNotice]       = useState(null);     // { ok, text }
  const [queue, setQueue]         = useState([]);       // fichiers choisis, pas encore envoyés : { file, description }
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId]       = useState(null);
  const inputRef = useRef(null);

  const dirty = !sameSet(selected, savedIds);
  const flash = (ok, text) => { setNotice({ ok, text }); setTimeout(() => setNotice(null), 4000); };
  const apiError = (err, fallback) => err.response?.data?.message || fallback;

  const toggle = (id) => setSelected(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const saveSelection = async () => {
    setSaving(true);
    try {
      const res = await api.put(`/submissions/${submissionId}/supplementary`, { source_file_ids: [...selected] });
      setTouched(true);
      onChange(res.data.published_files || []);
      flash(true, 'Selection saved.');
    } catch (err) {
      flash(false, apiError(err, 'Could not save the selection.'));
    } finally {
      setSaving(false);
    }
  };

  const chooseFiles = (e) => {
    const picked = [...(e.target.files || [])];
    e.target.value = '';
    const tooBig = picked.filter(f => f.size > MAX_UPLOAD_MB * 1024 * 1024);
    if (tooBig.length) flash(false, `"${tooBig[0].name}" is larger than ${MAX_UPLOAD_MB} MB.`);
    setQueue(prev => [...prev, ...picked.filter(f => f.size <= MAX_UPLOAD_MB * 1024 * 1024).map(file => ({ file, description: '' }))]);
  };

  const uploadQueue = async () => {
    if (queue.length === 0) return;
    setUploading(true);
    try {
      const fd = new FormData();
      queue.forEach(q => fd.append('files', q.file));
      fd.append('descriptions', JSON.stringify(queue.map(q => q.description.trim())));
      const res = await api.post(`/submissions/${submissionId}/supplementary`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      onChange(res.data.published_files || []);
      setQueue([]);
      flash(true, `${queue.length} file${queue.length > 1 ? 's' : ''} added.`);
    } catch (err) {
      flash(false, apiError(err, 'Upload failed. Please try again.'));
    } finally {
      setUploading(false);
    }
  };

  const removePublished = async (row) => {
    if (!window.confirm(`Remove "${row.original_name}" from the public supplementary files?`)) return;
    setBusyId(row.id);
    try {
      const res = await api.delete(`/submissions/${submissionId}/supplementary/${row.id}`);
      onChange(res.data.published_files || []);
    } catch (err) {
      flash(false, apiError(err, 'Could not remove this file.'));
    } finally {
      setBusyId(null);
    }
  };

  const rounds = [...new Set(candidates.map(f => Number(f.revision_round) || 0))].sort((a, b) => b - a);
  const total = published.length;

  return (
    <div className="bg-white rounded-sm" style={{ border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div className="px-6 py-4 flex flex-wrap items-start justify-between gap-3" style={{ borderBottom: '1px solid #F3F4F6' }}>
        <div>
          <h3 className="text-base font-bold flex items-center gap-2" style={{ color: '#111827' }}>
            Supplementary files
            <span className="text-xs px-2 py-0.5 rounded-sm font-medium"
                  style={{ background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }}>{total}</span>
          </h3>
          <p className="text-xs mt-1" style={{ color: '#6B7280' }}>
            Figures, extra tables and data published with the article.{' '}
            {status === 'published'
              ? 'Readers can see and download them on the article page.'
              : 'They become visible to readers once the article is published.'}
          </p>
        </div>
        {status === 'published' && total > 0 && (
          <Link to={`/articles/${submissionId}#supplementary`} className="text-xs font-semibold no-underline" style={{ color: '#1E88C8' }}>
            View on the public page →
          </Link>
        )}
      </div>

      {notice && (
        <div className="mx-6 mt-4 px-3 py-2 rounded-sm text-sm"
             style={notice.ok
               ? { background: '#F0FDF4', color: '#15803D', border: '1px solid #BBF7D0' }
               : { background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA' }}>
          {notice.text}
        </div>
      )}

      {/* 1 — fichiers déposés par l'auteur */}
      <div className="px-6 pt-4 pb-2">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold" style={{ color: '#111827' }}>From the authors' files</p>
          {candidates.length > 0 && (
            <div className="flex items-center gap-3 text-xs">
              <button type="button" onClick={() => setSelected(new Set(candidates.map(f => f.id)))}
                      className="font-semibold" style={{ color: '#1E88C8' }}>Select all</button>
              <button type="button" onClick={() => setSelected(new Set())}
                      className="font-semibold" style={{ color: '#6B7280' }}>None</button>
            </div>
          )}
        </div>
        {candidates.length === 0 ? (
          <p className="text-sm py-3" style={{ color: '#9CA3AF' }}>
            The authors did not attach any figure, table or supplementary file. You can add your own below.
          </p>
        ) : (
          <>
            <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
              Never published: manuscript, title page, cover letter, author agreement and responses to reviewers.
              Word files may contain comments or tracked changes — check them, or upload a clean version below.
            </p>
            <div className="mt-2">
              {rounds.map(round => (
                <div key={`r-${round}`}>
                  {rounds.length > 1 && (
                    <p className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider"
                       style={{ background: round > 0 ? '#FEF2F2' : '#F9FAFB', color: round > 0 ? '#B91C1C' : '#6B7280' }}>
                      {round > 0 ? `Revised version ${round}` : 'Original submission'}
                    </p>
                  )}
                  {candidates.filter(f => (Number(f.revision_round) || 0) === round).map(f => (
                    <label key={f.id} className="flex items-center gap-3 px-3 py-2.5 cursor-pointer"
                           style={{ borderTop: '1px solid #F3F4F6' }}>
                      <input type="checkbox" checked={selected.has(f.id)} onChange={() => toggle(f.id)}
                             className="w-4 h-4 flex-shrink-0" style={{ accentColor: '#1B4427' }} />
                      <span className="flex-1 min-w-0">
                        <span className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium truncate" style={{ color: '#111827' }}>{f.original_name || 'File'}</span>
                          <Tag>{f.file_type}</Tag>
                        </span>
                        <span className="block text-xs truncate" style={{ color: '#9CA3AF' }}>
                          {[f.description, fmtSize(f.file_size)].filter(Boolean).join(' · ')}
                        </span>
                      </span>
                      <a href={fileUrl(f.file_url, 'download', f.original_name)} target="_blank" rel="noreferrer"
                         onClick={e => e.stopPropagation()}
                         className="text-xs font-semibold no-underline flex-shrink-0" style={{ color: '#1E88C8' }}>Open</a>
                    </label>
                  ))}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between gap-3 py-3" style={{ borderTop: '1px solid #F3F4F6' }}>
              <p className="text-xs" style={{ color: dirty ? '#92400E' : '#9CA3AF' }}>
                {dirty
                  ? (savedIds.size === 0 && !touched
                      ? 'Suggested selection (latest version of each file) — click “Save selection” to confirm.'
                      : 'Unsaved changes.')
                  : `${savedIds.size} of the authors' file${savedIds.size === 1 ? '' : 's'} published.`}
              </p>
              <button type="button" onClick={saveSelection} disabled={saving || !dirty}
                      className="px-4 py-2 rounded-sm text-sm font-semibold text-white flex-shrink-0"
                      style={{ background: saving || !dirty ? '#9CA3AF' : '#1B4427', cursor: saving || !dirty ? 'not-allowed' : 'pointer' }}>
                {saving ? 'Saving…' : 'Save selection'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* 2 — fichiers déposés par l'éditeur */}
      <div className="px-6 pt-3 pb-5" style={{ borderTop: '1px solid #F3F4F6' }}>
        <p className="text-sm font-semibold" style={{ color: '#111827' }}>Files added by the editor</p>

        {editorFiles.length > 0 && (
          <div className="mt-2">
            {editorFiles.map(row => (
              <div key={row.id} className="flex items-center gap-3 px-3 py-2.5" style={{ borderTop: '1px solid #F3F4F6' }}>
                <span style={{ color: '#1D4ED8' }}><IconFile /></span>
                <span className="flex-1 min-w-0">
                  <span className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium truncate" style={{ color: '#111827' }}>{row.original_name}</span>
                    <Tag>{row.file_type}</Tag>
                  </span>
                  <span className="block text-xs truncate" style={{ color: '#9CA3AF' }}>
                    {[row.description, fmtSize(row.file_size)].filter(Boolean).join(' · ')}
                  </span>
                </span>
                <a href={fileUrl(row.file_url, 'download', row.original_name)} target="_blank" rel="noreferrer"
                   className="text-xs font-semibold no-underline flex-shrink-0" style={{ color: '#1E88C8' }}>Open</a>
                <button type="button" onClick={() => removePublished(row)} disabled={busyId === row.id}
                        title="Remove from the public files"
                        className="inline-flex items-center justify-center w-7 h-7 rounded-sm flex-shrink-0"
                        style={{ border: '1px solid #FECACA', background: '#FEF2F2', color: '#B91C1C', opacity: busyId === row.id ? 0.5 : 1 }}>
                  <IconTrash />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Fichiers de l'auteur déjà publiés : retirables aussi depuis la liste du haut (décocher + Save) */}

        {queue.length > 0 && (
          <div className="mt-3 rounded-sm" style={{ border: '1px dashed #BBF7D0', background: '#F7FDF9' }}>
            {queue.map((q, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2" style={{ borderTop: i === 0 ? 'none' : '1px solid #E5F5EA' }}>
                <span style={{ color: '#15803D' }}><IconFile /></span>
                <span className="text-sm font-medium truncate" style={{ color: '#111827', maxWidth: '34%' }}>{q.file.name}</span>
                <input type="text" value={q.description} maxLength={300} placeholder="Short description (optional)"
                       onChange={e => setQueue(prev => prev.map((x, j) => j === i ? { ...x, description: e.target.value } : x))}
                       className="flex-1 min-w-0 px-2 py-1 text-xs rounded-sm outline-none" style={{ border: '1px solid #D1D5DB' }} />
                <button type="button" onClick={() => setQueue(prev => prev.filter((_, j) => j !== i))}
                        className="text-xs font-semibold flex-shrink-0" style={{ color: '#6B7280' }}>Cancel</button>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 mt-3">
          <input ref={inputRef} type="file" multiple accept={ACCEPT} onChange={chooseFiles} className="hidden" />
          <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}
                  className="px-4 py-2 rounded-sm text-sm font-semibold"
                  style={{ border: '1px solid #1B4427', color: '#1B4427', background: '#fff' }}>
            Add files
          </button>
          {queue.length > 0 && (
            <button type="button" onClick={uploadQueue} disabled={uploading}
                    className="px-4 py-2 rounded-sm text-sm font-semibold text-white"
                    style={{ background: uploading ? '#9CA3AF' : '#1B4427', cursor: uploading ? 'wait' : 'pointer' }}>
              {uploading ? 'Uploading…' : `Upload ${queue.length} file${queue.length > 1 ? 's' : ''}`}
            </button>
          )}
          <span className="text-xs" style={{ color: '#9CA3AF' }}>
            PDF, Word, Excel, CSV, TXT, ZIP, PNG, JPEG, TIFF or EPS — {MAX_UPLOAD_MB} MB max per file.
          </span>
        </div>
      </div>
    </div>
  );
};

export default SupplementaryFiles;
