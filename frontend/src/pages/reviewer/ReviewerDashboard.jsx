import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';

// ============================================================
// ReviewerDashboard — JAEI Platform
// Style inspiré ScienceDirect : liste d'articles à évaluer,
// badges de statut, deadline indicator, formulaire d'évaluation
// ============================================================

// ── Icônes ──────────────────────────────────────────────────

const IconClipboard = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
  </svg>
);

const IconClock = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
  </svg>
);

const IconCheck = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
  </svg>
);

const IconAlert = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
  </svg>
);

const IconEye = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
  </svg>
);

const IconEdit = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
  </svg>
);

const IconArrow = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
  </svg>
);

const IconInfo = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
  </svg>
);

const IconCalendar = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
  </svg>
);

// ── Statuts d'évaluation ─────────────────────────────────────

const REVIEW_STATUS = {
  assigned:   { label: 'Assigné',      bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
  in_progress:{ label: 'En cours',     bg: '#FFFBEB', color: '#92400E', border: '#FDE68A' },
  completed:  { label: 'Complété',     bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0' },
  overdue:    { label: 'En retard',    bg: '#FEF2F2', color: '#B91C1C', border: '#FECACA' },
};

const StatusBadge = ({ status }) => {
  const cfg = REVIEW_STATUS[status] || REVIEW_STATUS.assigned;
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-sm text-xs font-medium"
          style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
      {cfg.label}
    </span>
  );
};

// ── Indicateur de deadline ────────────────────────────────────

const DeadlineBadge = ({ daysLeft }) => {
  const urgent  = daysLeft <= 3;
  const warning = daysLeft <= 7 && daysLeft > 3;
  const bg    = urgent ? '#FEF2F2' : warning ? '#FFFBEB' : '#F0FDF4';
  const color = urgent ? '#B91C1C' : warning ? '#92400E' : '#15803D';
  const border= urgent ? '#FECACA' : warning ? '#FDE68A' : '#BBF7D0';
  const label = daysLeft === 0 ? "Aujourd'hui" : daysLeft < 0 ? `${Math.abs(daysLeft)}j de retard` : `${daysLeft}j restants`;

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-xs font-medium"
          style={{ background: bg, color, border: `1px solid ${border}` }}>
      <IconCalendar />
      {label}
    </span>
  );
};

// ── Données de démonstration ─────────────────────────────────

const DEMO_ASSIGNMENTS = [
  {
    id: 1,
    title: 'Effets des changements climatiques sur la production cacaoyère au Cameroun : analyse sur 20 ans',
    domain: 'Agronomie',
    author: 'Biya N.',
    submitted_at: '2026-03-08',
    deadline: '2026-03-25',
    review_status: 'in_progress',
    abstract: "Cette étude analyse l'impact des variations climatiques sur les rendements cacaoyers dans les régions du Centre et du Sud Cameroun sur une période de vingt ans (2004-2024)...",
  },
  {
    id: 2,
    title: 'Modélisation de la dégradation des terres agricoles en zone semi-aride par télédétection',
    domain: 'Environnement',
    author: 'Manga F., Owona S.',
    submitted_at: '2026-03-12',
    deadline: '2026-03-29',
    review_status: 'assigned',
    abstract: "L'article propose une approche basée sur l'imagerie satellitaire Sentinel-2 pour cartographier et quantifier la dégradation des terres en zone sahélienne...",
  },
  {
    id: 3,
    title: 'Diversité génétique des variétés de manioc résistantes à la mosaïque en Afrique centrale',
    domain: 'Biotechnologie agricole',
    author: 'Nkemdirim P.',
    submitted_at: '2026-02-28',
    deadline: '2026-03-18',
    review_status: 'overdue',
    abstract: "Une analyse de la diversité génétique de 42 accessions de manioc collectées dans cinq pays d'Afrique centrale révèle des marqueurs SSR associés à la résistance au CBSV...",
  },
  {
    id: 4,
    title: 'Impact de l\'aquaculture intensive sur la qualité des eaux du fleuve Sanaga',
    domain: 'Aquaculture',
    author: 'Etame R., Bella A.',
    submitted_at: '2026-02-15',
    deadline: '2026-03-05',
    review_status: 'completed',
    abstract: "Cette étude évalue les effets de l'aquaculture intensive sur les paramètres physicochimiques et biologiques des eaux du fleuve Sanaga...",
  },
];

const getDaysLeft = (deadline) => {
  const today = new Date('2026-03-18');
  const d     = new Date(deadline);
  return Math.round((d - today) / (1000 * 60 * 60 * 24));
};

const TABS = [
  { key: 'all',         label: 'Tous les articles' },
  { key: 'assigned',    label: 'À démarrer' },
  { key: 'in_progress', label: 'En cours' },
  { key: 'overdue',     label: 'En retard' },
  { key: 'completed',   label: 'Complétés' },
];

// ── Page ─────────────────────────────────────────────────────

const ReviewerDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab]       = useState('all');
  const [expandedId, setExpandedId]     = useState(null);

  const firstName = user?.first_name || user?.email?.split('@')[0] || 'Évaluateur';

  const stats = {
    total:       DEMO_ASSIGNMENTS.length,
    pending:     DEMO_ASSIGNMENTS.filter(a => ['assigned', 'in_progress'].includes(a.review_status)).length,
    overdue:     DEMO_ASSIGNMENTS.filter(a => a.review_status === 'overdue').length,
    completed:   DEMO_ASSIGNMENTS.filter(a => a.review_status === 'completed').length,
  };

  const filtered = activeTab === 'all'
    ? DEMO_ASSIGNMENTS
    : DEMO_ASSIGNMENTS.filter(a => a.review_status === activeTab);

  const formatDate = (d) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <DashboardLayout title="Tableau de bord Évaluateur">

      {/* ── Bandeau de bienvenue ─────────────────────────────── */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold" style={{ color: '#111827' }}>
            Bonjour, {firstName}
          </h2>
          <p className="text-sm mt-0.5" style={{ color: '#6B7280' }}>
            Voici les articles qui vous sont assignés pour évaluation.
          </p>
        </div>

        <Link
          to="/reviewer/assignments"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-sm text-sm font-semibold no-underline transition-all"
          style={{ background: 'linear-gradient(90deg, #1B4427 0%, #1E88C8 100%)', color: '#fff' }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '0.9'; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
        >
          <IconClipboard />
          Voir toutes mes évaluations
        </Link>
      </div>

      {/* ── Alerte si articles en retard ─────────────────────── */}
      {stats.overdue > 0 && (
        <div className="mb-6 flex items-start gap-3 px-4 py-3 rounded-sm"
             style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
          <span className="flex-shrink-0 mt-0.5" style={{ color: '#DC2626' }}><IconAlert /></span>
          <div>
            <p className="text-sm font-semibold" style={{ color: '#991B1B' }}>
              {stats.overdue} article{stats.overdue > 1 ? 's' : ''} en retard d'évaluation
            </p>
            <p className="text-xs mt-0.5" style={{ color: '#B91C1C' }}>
              Veuillez soumettre vos évaluations dès que possible pour respecter les délais du journal.
            </p>
          </div>
        </div>
      )}

      {/* ── Statistiques ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Articles assignés', value: stats.total,     icon: IconClipboard, accent: '#1E88C8' },
          { label: 'À évaluer',         value: stats.pending,   icon: IconClock,     accent: '#D97706' },
          { label: 'En retard',         value: stats.overdue,   icon: IconAlert,     accent: '#DC2626' },
          { label: 'Complétés',         value: stats.completed, icon: IconCheck,     accent: '#15803D' },
        ].map(({ label, value, icon: Icon, accent }) => (
          <div key={label}
               className="bg-white rounded-sm px-5 py-4 flex items-center gap-4"
               style={{ border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                 style={{ background: `${accent}18` }}>
              <span style={{ color: accent }}><Icon /></span>
            </div>
            <div>
              <p className="text-2xl font-bold leading-none" style={{ color: '#111827' }}>{value}</p>
              <p className="text-xs mt-1 leading-tight" style={{ color: '#6B7280' }}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Liste des articles à évaluer ─────────────────────── */}
      <div className="bg-white rounded-sm overflow-hidden"
           style={{ border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>

        <div className="px-6 py-4 flex items-center justify-between"
             style={{ borderBottom: '1px solid #F3F4F6' }}>
          <h3 className="text-base font-bold" style={{ color: '#111827' }}>Articles à évaluer</h3>
          <span className="text-xs px-2 py-0.5 rounded-sm font-medium"
                style={{ background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }}>
            {filtered.length} article{filtered.length > 1 ? 's' : ''}
          </span>
        </div>

        {/* Onglets */}
        <div className="flex overflow-x-auto" style={{ borderBottom: '1px solid #E5E7EB' }}>
          {TABS.map(tab => {
            const isActive = tab.key === activeTab;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="px-5 py-3 text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0"
                style={{
                  color: isActive ? '#1E88C8' : '#6B7280',
                  borderBottom: isActive ? '2px solid #1E88C8' : '2px solid transparent',
                  background: 'transparent',
                  marginBottom: -1,
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = '#374151'; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = '#6B7280'; }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Cartes d'articles */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
                 style={{ background: '#F3F4F6' }}>
              <IconClipboard />
            </div>
            <p className="text-sm font-medium" style={{ color: '#374151' }}>
              Aucun article dans cette catégorie
            </p>
          </div>
        ) : (
          <ul className="divide-y" style={{ borderColor: '#F3F4F6' }}>
            {filtered.map(article => {
              const daysLeft  = getDaysLeft(article.deadline);
              const isExpanded = expandedId === article.id;

              return (
                <li key={article.id}
                    className="px-6 py-5 transition-colors"
                    style={{ background: isExpanded ? '#FAFAFA' : 'transparent' }}>

                  <div className="flex flex-col gap-3">

                    {/* Ligne principale */}
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="flex-1 min-w-0">

                        {/* Domain + statut + deadline */}
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="text-xs font-medium px-2 py-0.5 rounded-sm"
                                style={{ background: '#F0FDF4', color: '#15803D', border: '1px solid #BBF7D0' }}>
                            {article.domain}
                          </span>
                          <StatusBadge status={article.review_status} />
                          {article.review_status !== 'completed' && (
                            <DeadlineBadge daysLeft={daysLeft} />
                          )}
                        </div>

                        {/* Titre */}
                        <h4 className="text-sm font-semibold leading-snug mb-1.5"
                            style={{ color: '#1E88C8', cursor: 'pointer' }}
                            onClick={() => setExpandedId(isExpanded ? null : article.id)}>
                          {article.title}
                        </h4>

                        {/* Meta */}
                        <div className="flex flex-wrap items-center gap-3 text-xs" style={{ color: '#9CA3AF' }}>
                          <span>Auteur : {article.author}</span>
                          <span style={{ borderLeft: '1px solid #E5E7EB', paddingLeft: '0.75rem' }}>
                            Soumis le {formatDate(article.submitted_at)}
                          </span>
                          <span style={{ borderLeft: '1px solid #E5E7EB', paddingLeft: '0.75rem' }}>
                            Deadline : {formatDate(article.deadline)}
                          </span>
                        </div>
                      </div>

                      {/* Boutons d'action */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : article.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-medium transition-colors"
                          style={{ background: '#F3F4F6', color: '#374151', border: '1px solid #E5E7EB' }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#E5E7EB'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = '#F3F4F6'; }}
                        >
                          <IconEye /> Résumé
                        </button>

                        {article.review_status !== 'completed' && (
                          <Link
                            to={`/reviewer/assignments/${article.id}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-semibold no-underline transition-colors"
                            style={{
                              background: article.review_status === 'overdue' ? '#FEF2F2' : '#EFF6FF',
                              color: article.review_status === 'overdue' ? '#B91C1C' : '#1D4ED8',
                              border: `1px solid ${article.review_status === 'overdue' ? '#FECACA' : '#BFDBFE'}`,
                            }}
                            onMouseEnter={e => { e.currentTarget.style.opacity = '0.8'; }}
                            onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
                          >
                            <IconEdit />
                            {article.review_status === 'in_progress' ? 'Continuer' : 'Évaluer'}
                          </Link>
                        )}

                        {article.review_status === 'completed' && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-medium"
                                style={{ background: '#F0FDF4', color: '#15803D', border: '1px solid #BBF7D0' }}>
                            <IconCheck /> Soumis
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Résumé expansible */}
                    {isExpanded && (
                      <div className="mt-1 p-4 rounded-sm text-sm leading-relaxed"
                           style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', color: '#374151' }}>
                        <p className="text-xs font-semibold uppercase tracking-wider mb-2"
                           style={{ color: '#9CA3AF' }}>Résumé</p>
                        {article.abstract}
                        <div className="mt-3">
                          <Link to={`/reviewer/assignments/${article.id}`}
                                className="inline-flex items-center gap-1 text-xs font-medium no-underline"
                                style={{ color: '#1E88C8' }}>
                            Lire l'article complet <IconArrow />
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* ── Guide de l'évaluateur ────────────────────────────── */}
      <div className="mt-6 rounded-sm overflow-hidden"
           style={{ background: 'linear-gradient(135deg, #1B4427 0%, #1a5c35 100%)', border: '1px solid #1B4427' }}>
        <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 mt-0.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
              <IconInfo />
            </span>
            <div>
              <p className="text-sm font-semibold" style={{ color: '#fff' }}>
                Besoin d'aide pour l'évaluation ?
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.65)' }}>
                Consultez notre guide du processus de révision et les critères d'évaluation JAEI.
              </p>
            </div>
          </div>
          <Link to="/review-process"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-sm text-xs font-semibold no-underline transition-all flex-shrink-0"
                style={{ background: '#1E88C8', color: '#fff' }}
                onMouseEnter={e => { e.currentTarget.style.opacity = '0.9'; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}>
            Guide du reviewer <IconArrow />
          </Link>
        </div>
      </div>

    </DashboardLayout>
  );
};

export default ReviewerDashboard;
