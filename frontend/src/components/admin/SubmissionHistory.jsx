import { useState } from 'react';

// Panneau « History » de la fiche éditeur (retour client du 13/11/2026) : ce qui s'est passé sur l'article et quand,
// du plus récent au plus ancien. Les événements viennent du serveur (backend/utils/history.js), construits à partir
// des dates déjà enregistrées ; une décision prise sans message n'a pas de date propre.

const DOT = {
  submitted: '#1E88C8', editor_assigned: '#1B4427', reviewer_invited: '#9CA3AF', reviewer_accepted: '#1D4ED8',
  reviewer_declined: '#B45309', review_submitted: '#15803D', revised: '#6D28D9', message: '#9CA3AF',
  decision: '#1B4427', apc_paid: '#15803D', invoice: '#9CA3AF', published: '#065F46', withdrawn: '#B91C1C',
  stalled: '#B45309', reminder: '#B45309',   // surveillance des 14 jours (17/11/2026)
};

const SHOWN = 8;

const formatWhen = (d) => new Date(d).toLocaleString('en-GB', {
  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
});

const SubmissionHistory = ({ events }) => {
  const [showAll, setShowAll] = useState(false);
  if (!events || events.length === 0) return null;
  const list = showAll ? events : events.slice(0, SHOWN);

  return (
    <div className="bg-white rounded-sm" data-testid="submission-history"
         style={{ border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #F3F4F6' }}>
        <h3 className="text-sm font-bold" style={{ color: '#111827' }}>History</h3>
        <span className="text-xs px-2 py-0.5 rounded-sm font-medium" style={{ background: '#F3F4F6', color: '#6B7280' }}>
          {events.length}
        </span>
      </div>
      <ol className="px-5 py-4">
        {list.map((e, i) => (
          <li key={`${e.type}-${e.at}-${i}`} className="flex items-start gap-3 mb-3 last:mb-0">
            <span className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ background: DOT[e.type] || '#9CA3AF' }} />
            <div className="min-w-0">
              <p className="text-xs font-medium" style={{ color: '#111827' }}>{e.title}</p>
              {e.detail && (
                <p className="text-xs" style={{ color: '#6B7280', wordBreak: 'break-word' }}>{e.detail}</p>
              )}
              <p className="text-xs" style={{ color: '#9CA3AF' }}>{formatWhen(e.at)}</p>
            </div>
          </li>
        ))}
      </ol>
      {events.length > SHOWN && (
        <button type="button" onClick={() => setShowAll(v => !v)}
                className="w-full px-5 py-2.5 text-xs font-semibold"
                style={{ borderTop: '1px solid #F3F4F6', color: '#1E88C8', background: 'transparent' }}>
          {showAll ? 'Show less' : `Show all (${events.length})`}
        </button>
      )}
    </div>
  );
};

export default SubmissionHistory;
