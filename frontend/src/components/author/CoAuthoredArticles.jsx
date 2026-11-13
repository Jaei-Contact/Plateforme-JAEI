import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import StatusBadges from '../ui/StatusBadges';
import { useCoAuthored } from '../../utils/useCoAuthored';

// Section « Co-authored articles » de l'espace membre (retour client du 13/11/2026) : les articles dont on est
// co-auteur sans en être le soumetteur, en CONSULTATION SEULE — le soumetteur les gère. Rien n'est affiché
// quand il n'y en a pas.

const IconEye = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
  </svg>
);

const formatDate = (d) =>
  new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

const CoAuthoredArticles = () => {
  const { items, loaded } = useCoAuthored();
  const { hash } = useLocation();

  // Lien depuis le tableau de bord (« …/submissions#co-authored ») : on amène la section à l'écran
  useEffect(() => {
    if (loaded && items.length > 0 && hash === '#co-authored') {
      document.getElementById('co-authored')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [loaded, items.length, hash]);

  if (!loaded || items.length === 0) return null;

  return (
    <div id="co-authored" className="bg-white rounded-sm overflow-hidden mt-8"
         style={{ border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div className="px-6 py-4" style={{ borderBottom: '1px solid #F3F4F6' }}>
        <div className="flex items-center gap-2">
          <h3 className="text-base font-bold" style={{ color: '#111827' }}>Co-authored articles</h3>
          <span className="text-xs px-2 py-0.5 rounded-sm font-medium"
                style={{ background: '#F5F3FF', color: '#6D28D9', border: '1px solid #DDD6FE' }}>
            {items.length}
          </span>
        </div>
        <p className="text-xs mt-1" style={{ color: '#6B7280', lineHeight: 1.6 }}>
          Articles on which you are listed as a co-author. You can follow them here in read-only mode:
          the author who submitted each article manages it.
        </p>
      </div>

      <ul className="divide-y" style={{ borderColor: '#F3F4F6' }}>
        {items.map(s => (
          <li key={s.id} className="px-6 py-5">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {s.research_area && (
                    <span className="text-xs px-2 py-0.5 rounded-sm"
                          style={{ background: '#F0FDF4', color: '#15803D', border: '1px solid #BBF7D0' }}>
                      {s.research_area}
                    </span>
                  )}
                  <StatusBadges submission={s} />
                  {s.manuscript_number && (
                    <span className="text-xs px-2 py-0.5 rounded-sm font-bold"
                          style={{ background: '#1B4427', color: '#fff' }}>
                      Ref: {s.manuscript_number}
                    </span>
                  )}
                </div>
                <h4 className="text-sm font-semibold mb-1" style={{ color: '#111827' }}>{s.title}</h4>
                <div className="flex flex-wrap gap-3 text-xs" style={{ color: '#9CA3AF' }}>
                  <span>Submitted on {formatDate(s.submitted_at)}</span>
                  {s.author_name && (
                    <span style={{ borderLeft: '1px solid #E5E7EB', paddingLeft: '0.75rem' }}>
                      Submitted by {s.author_name}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Link
                  to={`/author/submissions/${s.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-medium no-underline"
                  style={{ background: '#F5F3FF', color: '#6D28D9', border: '1px solid #DDD6FE' }}>
                  <IconEye /> View (read only)
                </Link>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default CoAuthoredArticles;
