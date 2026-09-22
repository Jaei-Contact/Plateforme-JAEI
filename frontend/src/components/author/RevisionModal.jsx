import { useState } from 'react';
import api from '../../utils/api';

// ============================================================
// RevisionModal — dépôt d'une version révisée par l'auteur
// Remarques 5-6 (client, 22/09) : après les commentaires de l'éditeur (ou un
// renvoi "Send back to the authors"), l'auteur envoie :
//   • Response to the reviewer
//   • Revised Manuscript (clean version)
//   • Revised Manuscript (with track change)
//   • Other documents
// Avant évaluation (sent_back), seule la version propre est exigée : il n'y a
// encore ni reviewer à qui répondre, ni évaluation à suivre.
// ============================================================

const MB = 1024 * 1024;
const MAX_SIZE = 15 * MB;
const MAX_OTHER = 5;

const buildSlots = (beforeReview) => [
  { field: 'response_to_reviewer', label: 'Response to the reviewer',
    hint: 'Point-by-point answer to the comments received.',
    exts: ['.docx', '.pdf'], required: !beforeReview },
  { field: 'revised_clean', label: 'Revised Manuscript (clean version)',
    hint: 'Final text with all corrections accepted.',
    exts: ['.docx'], required: true },
  { field: 'revised_tracked', label: 'Revised Manuscript (with track change)',
    hint: 'Same manuscript with Word "Track Changes" turned on.',
    exts: ['.docx'], required: !beforeReview },
  { field: 'other_documents', label: 'Other documents',
    hint: `Figures, tables, supplementary material — up to ${MAX_OTHER} files.`,
    exts: ['.docx', '.pdf', '.xlsx', '.png', '.jpg', '.jpeg', '.tif', '.tiff'], required: false, multiple: true },
];

const extOf = (name) => (name.match(/\.[^.]+$/)?.[0] || '').toLowerCase();

const RevisionModal = ({ submission, onClose, onSubmitted }) => {
  const beforeReview = submission.status === 'sent_back';
  const slots = buildSlots(beforeReview);
  const [picked, setPicked] = useState({});   // field → File[]
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  const addFiles = (slot, fileList) => {
    setError('');
    const incoming = Array.from(fileList || []);
    for (const f of incoming) {
      if (!slot.exts.includes(extOf(f.name))) {
        setError(`${slot.label}: accepted formats are ${slot.exts.join(', ')}.`);
        return;
      }
      if (f.size > MAX_SIZE) {
        setError(`"${f.name}" exceeds 15 MB.`);
        return;
      }
    }
    const current = picked[slot.field] || [];
    const next = slot.multiple ? [...current, ...incoming] : incoming.slice(0, 1);
    if (slot.multiple && next.length > MAX_OTHER) {
      setError(`${slot.label}: ${MAX_OTHER} files maximum.`);
      return;
    }
    setPicked(prev => ({ ...prev, [slot.field]: next }));
  };

  const removeFile = (field, index) =>
    setPicked(prev => ({ ...prev, [field]: (prev[field] || []).filter((_, i) => i !== index) }));

  const missing = slots.filter(s => s.required && !(picked[s.field] || []).length);

  const handleSubmit = async () => {
    if (missing.length) {
      setError(`Missing: ${missing.map(s => s.label).join(', ')}.`);
      return;
    }
    setSending(true);
    setError('');
    try {
      const fd = new FormData();
      for (const slot of slots) {
        for (const f of picked[slot.field] || []) fd.append(slot.field, f);
      }
      const res = await api.post(`/submissions/${submission.id}/revision`, fd,
        { headers: { 'Content-Type': 'multipart/form-data' } });
      onSubmitted(res.data.submission);
    } catch (err) {
      setError(err.response?.data?.message || 'The revised version could not be sent. Please try again.');
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{ background: 'rgba(17,24,39,0.55)' }}
         onClick={e => { if (e.target === e.currentTarget && !sending) onClose(); }}>
      <div className="bg-white rounded-sm w-full max-w-xl max-h-[92vh] overflow-y-auto"
           style={{ boxShadow: '0 20px 40px rgba(0,0,0,0.25)' }}>

        <div className="px-6 py-4" style={{ background: '#1B4427' }}>
          <h3 className="text-base font-bold text-white">Submit a revised version</h3>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.75)' }}>
            {submission.manuscript_number ? `Ref: ${submission.manuscript_number} · ` : ''}{submission.title}
          </p>
        </div>

        <div className="px-6 py-5 space-y-4">
          {beforeReview && (
            <p className="text-xs px-3 py-2 rounded-sm"
               style={{ background: '#FFF7ED', color: '#9A3412', border: '1px solid #FED7AA', lineHeight: 1.5 }}>
              Your manuscript was sent back before peer review: only the corrected manuscript (clean version) is required.
            </p>
          )}

          {slots.map(slot => {
            const files = picked[slot.field] || [];
            const canAdd = slot.multiple ? files.length < MAX_OTHER : files.length === 0;
            return (
              <div key={slot.field} className="rounded-sm p-3" style={{ border: '1px solid #E5E7EB' }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold" style={{ color: '#B91C1C' }}>
                      {slot.label}
                      <span className="ml-2 text-xs font-medium"
                            style={{ color: slot.required ? '#B91C1C' : '#9CA3AF' }}>
                        {slot.required ? 'Required' : 'Optional'}
                      </span>
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>
                      {slot.hint} <span style={{ color: '#9CA3AF' }}>({slot.exts.join(', ')})</span>
                    </p>
                  </div>
                  {canAdd && (
                    <label className="flex-shrink-0 inline-flex items-center px-3 py-1.5 rounded-sm text-xs font-semibold cursor-pointer"
                           style={{ background: '#F0FDF4', color: '#1B4427', border: '1px solid #BBDFCB' }}>
                      {slot.multiple && files.length ? 'Add a file' : 'Choose file'}
                      <input type="file" style={{ display: 'none' }} disabled={sending}
                             accept={slot.exts.join(',')} multiple={!!slot.multiple}
                             onChange={e => { addFiles(slot, e.target.files); e.target.value = ''; }} />
                    </label>
                  )}
                </div>
                {files.map((f, i) => (
                  <div key={`${f.name}-${i}`} className="mt-2 flex items-center justify-between gap-2 px-2 py-1.5 rounded-sm"
                       style={{ background: '#F9FAFB' }}>
                    <span className="text-xs truncate" style={{ color: '#374151' }}>
                      {f.name} <span style={{ color: '#9CA3AF' }}>· {(f.size / 1024).toFixed(0)} KB</span>
                    </span>
                    {!sending && (
                      <button type="button" onClick={() => removeFile(slot.field, i)}
                              className="text-xs flex-shrink-0" style={{ color: '#B91C1C' }}>
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
            );
          })}

          {error && (
            <p className="text-sm px-3 py-2 rounded-sm"
               style={{ background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA' }}>
              {error}
            </p>
          )}
        </div>

        <div className="px-6 py-4 flex justify-end gap-3" style={{ borderTop: '1px solid #F3F4F6' }}>
          <button type="button" onClick={onClose} disabled={sending}
                  className="px-4 py-2 text-sm font-medium rounded-sm"
                  style={{ border: '1px solid #E5E7EB', color: '#374151', background: '#F9FAFB' }}>
            Cancel
          </button>
          <button type="button" onClick={handleSubmit} disabled={sending || missing.length > 0}
                  className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white rounded-sm"
                  style={{ background: '#1B4427', opacity: (sending || missing.length > 0) ? 0.6 : 1,
                           cursor: (sending || missing.length > 0) ? 'not-allowed' : 'pointer' }}>
            {sending && (
              <span className="w-3.5 h-3.5 rounded-full border-2 animate-spin"
                    style={{ borderColor: '#fff', borderTopColor: 'transparent' }} />
            )}
            {sending ? 'Sending…' : 'Submit revised version'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RevisionModal;
