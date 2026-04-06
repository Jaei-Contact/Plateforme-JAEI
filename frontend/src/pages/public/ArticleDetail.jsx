import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import api from '../../utils/api';

// ============================================================
// ArticleDetail — Page de lecture d'un article — style ScienceDirect
// ============================================================

const BACKEND = 'http://localhost:5000';

// ── Étoiles interactives ─────────────────────────────────────
function StarRating({ average, count, onRate }) {
  const [hover, setHover] = useState(0);
  const [rated, setRated] = useState(false);
  const display = hover || Math.round(average) || 0;

  const handleRate = (val) => {
    if (rated) return;
    setRated(true);
    onRate(val);
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(s => (
          <button key={s}
                  onClick={() => handleRate(s)}
                  onMouseEnter={() => !rated && setHover(s)}
                  onMouseLeave={() => setHover(0)}
                  disabled={rated}
                  className="focus:outline-none disabled:cursor-default">
            <svg className={`w-5 h-5 transition-colors ${s <= display ? 'text-yellow-400' : 'text-white/40'}`}
                 fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462
                       c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921
                       -.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838
                       -.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38
                       -1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </button>
        ))}
      </div>
      <span className="text-white/70 text-xs">
        {average > 0 ? `${parseFloat(average).toFixed(1)} / 5` : 'Not yet rated'}
        {count > 0 && <span className="ml-1">({count})</span>}
      </span>
      {rated && <span className="text-yellow-300 text-xs font-medium">Thank you!</span>}
    </div>
  );
}

// ── Article connexe ──────────────────────────────────────────
const RelatedCard = ({ article }) => (
  <Link to={`/articles/${article.id}`}
        className="block py-3 border-b border-neutral-100 last:border-0 no-underline group">
    {article.research_area && (
      <span className="text-xxs font-semibold uppercase tracking-wider text-accent">
        {article.research_area}
      </span>
    )}
    <p className="text-sm font-medium text-neutral-800 mt-0.5 leading-snug line-clamp-2
                  group-hover:text-primary transition-colors">
      {article.title}
    </p>
    <p className="text-xs text-neutral-400 mt-1">{article.author_name}</p>
  </Link>
);

// ============================================================
export default function ArticleDetail() {
  const { id }    = useParams();
  const navigate  = useNavigate();

  const [data,    setData]    = useState(null);   // { article, related, authorStats }
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState('resume');
  const [avgRating, setAvgRating] = useState(0);
  const [ratingCount, setRatingCount] = useState(0);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    api.get(`/articles/${id}`)
      .then(r => {
        setData(r.data);
        const a = r.data.article;
        const avg = a.rating_count > 0 ? a.rating_sum / a.rating_count : 0;
        setAvgRating(avg);
        setRatingCount(a.rating_count || 0);
      })
      .catch(err => {
        if (err.response?.status === 404) setNotFound(true);
      })
      .finally(() => setLoading(false));
  }, [id]);

  // ── Télécharger + incrémenter ──────────────────────────────
  const handleDownload = () => {
    api.post(`/articles/${id}/download`).catch(() => {});
    window.open(`${BACKEND}${article.pdf_url}`, '_blank');
  };

  // ── Noter ──────────────────────────────────────────────────
  const handleRate = (val) => {
    api.post(`/articles/${id}/rate`, { rating: val })
      .then(r => {
        setAvgRating(parseFloat(r.data.average));
        setRatingCount(r.data.count);
      })
      .catch(() => {});
  };

  // ── Chargement ──────────────────────────────────────────────
  if (loading) {
    return (
      <Layout>
        {/* Bannière skeleton */}
        <div className="bg-primary-900 h-44 animate-pulse" />
        <div className="page-container py-8 animate-pulse space-y-4">
          <div className="h-4 w-32 bg-neutral-200 rounded" />
          <div className="h-6 bg-neutral-200 rounded w-3/4" />
          <div className="h-4 bg-neutral-100 rounded w-1/2" />
        </div>
      </Layout>
    );
  }

  // ── 404 ────────────────────────────────────────────────────
  if (notFound) {
    return (
      <Layout>
        <div className="page-container py-20 text-center">
          <div className="text-5xl mb-4">📄</div>
          <h1 className="text-xl font-bold text-neutral-800 mb-2">Article not found</h1>
          <p className="text-sm text-neutral-500 mb-8">
            This article does not exist or has not been published yet.
          </p>
          <Link to="/articles"
                className="px-5 py-2.5 bg-primary text-white rounded text-sm font-medium
                           hover:bg-primary-600 transition-colors no-underline">
            Back to catalogue
          </Link>
        </div>
      </Layout>
    );
  }

  if (!data) return null;

  const { article, related, authorStats } = data;

  const keywords = article.keywords
    ? article.keywords.split(',').map(k => k.trim()).filter(Boolean)
    : [];

  const coAuthors = article.co_authors
    ? article.co_authors.split(',').map(a => a.trim()).filter(Boolean)
    : [];

  const pubDate = article.updated_at
    ? new Date(article.updated_at).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
      })
    : '';

  const submitDate = article.submitted_at
    ? new Date(article.submitted_at).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
      })
    : '';

  const TABS = [
    { id: 'resume',  label: 'Abstract'     },
    { id: 'info',    label: 'Information'  },
    { id: 'download',label: 'Download'     },
  ];

  const isDocx = article.pdf_url && article.pdf_url.match(/\.docx$/i);
  const fileLabel = isDocx ? 'Download document' : 'Download PDF';

  return (
    <Layout>

      {/* ── Fil d'Ariane — au-dessus de la bannière ──────────── */}
      <div className="bg-neutral-100 border-b border-neutral-200">
        <div className="page-container py-2">
          <nav className="flex items-center gap-1.5 text-xs text-neutral-500">
            <Link to="/" className="hover:text-primary no-underline transition-colors">Home</Link>
            <span>›</span>
            <Link to="/articles" className="hover:text-primary no-underline transition-colors">Articles</Link>
            <span>›</span>
            <span className="text-neutral-700 truncate max-w-[160px] sm:max-w-[300px]">{article.title}</span>
          </nav>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          🟩 BANNIÈRE VERTE — Titre + thumbnail + stats
      ══════════════════════════════════════════════════════ */}
      <div className="bg-primary-900 text-white">
        <div className="page-container">
          <div className="flex items-stretch min-h-[160px] md:min-h-[200px]">

            {/* Miniature — centrée verticalement dans la bande */}
            <div className="hidden md:flex flex-shrink-0 items-center py-8 pr-8">
              <div className="w-28 h-36 bg-white/10 border border-white/20 rounded
                              flex flex-col items-center justify-center gap-2 shadow-lg">
                <svg className="w-9 h-9 text-white/50" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd"
                        d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116
                           7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1
                           0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                        clipRule="evenodd" />
                </svg>
                <span className="text-xxs text-white/50 font-bold uppercase tracking-widest">
                  {isDocx ? 'DOCX' : 'PDF'}
                </span>
              </div>
            </div>

            {/* Contenu titre — séparé de la miniature par un border */}
            <div className="flex-1 min-w-0 py-6 md:py-8 md:border-l md:border-white/10 md:pl-8">

              {/* Domaine + badges sur la même ligne */}
              <div className="flex flex-wrap items-center gap-3 mb-4">
                {article.research_area && (
                  <span className="text-xxs font-semibold uppercase tracking-wider
                                   text-primary-200 bg-white/10 border border-white/20 rounded px-2.5 py-1">
                    {article.research_area}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold
                                 text-emerald-300 bg-emerald-900/40 border border-emerald-700/50 rounded px-2.5 py-1">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd"
                          d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0
                             002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z"
                          clipRule="evenodd" />
                  </svg>
                  Open Access
                </span>
              </div>

              {/* Titre */}
              <h1 className="text-xl md:text-2xl font-bold text-white leading-snug mb-4">
                {article.title}
              </h1>

              {/* Auteurs */}
              <p className="text-sm text-white/70 mb-5">
                <span className="font-medium text-white">{article.author_name}</span>
                {coAuthors.length > 0 && (
                  <span className="text-white/60">, {coAuthors.join(', ')}</span>
                )}
              </p>

              {/* Téléchargements + étoiles — bien espacés */}
              <div className="flex flex-wrap items-center gap-6">
                <span className="flex items-center gap-2 text-sm text-white/70">
                  <svg className="w-4 h-4 text-white/40" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd"
                          d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0
                             011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414
                             1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                          clipRule="evenodd" />
                  </svg>
                  <span className="font-bold text-white text-base">{article.download_count || 0}</span>
                  <span>download{(article.download_count || 0) !== 1 ? 's' : ''}</span>
                </span>

                <div className="h-4 border-l border-white/20" />

                <StarRating average={avgRating} count={ratingCount} onRate={handleRate} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          🟨 BARRE D'ONGLETS
      ══════════════════════════════════════════════════════ */}
      <div className="bg-neutral-100 border-b border-neutral-200 sticky top-0 z-10">
        <div className="page-container">
          <div className="flex items-center gap-0 overflow-x-auto">
            {TABS.map(tab => (
              <button key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-5 py-3.5 text-sm font-medium whitespace-nowrap border-b-2
                                  transition-colors focus:outline-none
                                  ${activeTab === tab.id
                                    ? 'border-primary text-primary bg-white'
                                    : 'border-transparent text-neutral-500 hover:text-neutral-800 hover:border-neutral-300'
                                  }`}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          ⬛ CONTENU PRINCIPAL
      ══════════════════════════════════════════════════════ */}
      <div className="bg-white">
        <div className="page-container py-8">
          <div className="lg:grid lg:grid-cols-[1fr_280px] gap-8 items-start">

            {/* ── Colonne principale ────────────────────── */}
            <main>

              {/* ─── TAB: Abstract ─── */}
              {activeTab === 'resume' && (
                <div className="space-y-8">

                  {/* Abstract */}
                  <section>
                    <h2 className="text-base font-bold text-neutral-800 mb-3 pb-2
                                   border-b-2 border-primary inline-block pr-4">
                      Abstract
                    </h2>
                    <p className="text-sm text-neutral-700 leading-relaxed mt-3">
                      {article.abstract}
                    </p>
                  </section>

                  {/* Authors detail */}
                  <section>
                    <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-4">
                      Authors
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-2 bg-neutral-50 border
                                       border-neutral-200 rounded-full px-4 py-1.5 text-sm text-neutral-700">
                        <span className="w-6 h-6 rounded-full bg-primary text-white text-xs font-bold
                                         flex items-center justify-center flex-shrink-0">
                          {article.author_name?.[0]?.toUpperCase()}
                        </span>
                        {article.author_name}
                        {article.institution && (
                          <span className="text-neutral-400 text-xs">— {article.institution}</span>
                        )}
                      </span>
                      {coAuthors.map((ca, i) => (
                        <span key={i}
                              className="inline-flex items-center gap-2 bg-neutral-50 border
                                         border-neutral-200 rounded-full px-4 py-1.5 text-sm text-neutral-700">
                          <span className="w-6 h-6 rounded-full bg-neutral-300 text-white text-xs font-bold
                                           flex items-center justify-center flex-shrink-0">
                            {ca[0]?.toUpperCase()}
                          </span>
                          {ca}
                        </span>
                      ))}
                    </div>
                  </section>

                  {/* Keywords */}
                  {keywords.length > 0 && (
                    <section>
                      <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-3">
                        Keywords
                      </h2>
                      <div className="flex flex-wrap gap-2">
                        {keywords.map(k => (
                          <Link key={k}
                                to={`/articles?q=${encodeURIComponent(k)}`}
                                className="text-xs bg-neutral-100 text-neutral-600 rounded px-3 py-1.5
                                           border border-neutral-200 hover:border-primary hover:text-primary
                                           no-underline transition-colors">
                            {k}
                          </Link>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Document preview */}
                  <section className="bg-neutral-50 border border-neutral-200 rounded-lg p-6
                                      flex items-center gap-4">
                    <div className="w-16 h-20 bg-white border border-neutral-300 rounded
                                    flex items-center justify-center flex-shrink-0 shadow-sm">
                      <svg className="w-8 h-8 text-primary/40" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd"
                              d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116
                                 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1
                                 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                              clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-700 mb-1">
                        Access full document
                      </p>
                      <p className="text-xs text-neutral-400 mb-3">
                        {isDocx ? 'Word document (.docx)' : 'PDF document'}
                        {pubDate && <span> — Published on {pubDate}</span>}
                      </p>
                      {article.pdf_url && (
                        <button onClick={handleDownload}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white
                                           rounded text-sm font-medium hover:bg-primary-600 transition-colors">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd"
                                  d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1
                                     1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0
                                     111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                                  clipRule="evenodd" />
                          </svg>
                          {fileLabel}
                        </button>
                      )}
                    </div>
                  </section>
                </div>
              )}

              {/* ─── TAB: Information ─── */}
              {activeTab === 'info' && (
                <div className="space-y-6">
                  <h2 className="text-base font-bold text-neutral-800 pb-2
                                 border-b-2 border-primary inline-block pr-4">
                    Bibliographic information
                  </h2>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5 mt-4">
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-1">
                        Journal
                      </dt>
                      <dd className="text-sm text-neutral-700 font-medium leading-snug">
                        Journal of Agricultural and Environmental Innovation (JAEI)
                      </dd>
                    </div>
                    {article.research_area && (
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-1">
                          Field
                        </dt>
                        <dd className="text-sm text-neutral-700">{article.research_area}</dd>
                      </div>
                    )}
                    {pubDate && (
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-1">
                          Publication date
                        </dt>
                        <dd className="text-sm text-neutral-700">{pubDate}</dd>
                      </div>
                    )}
                    {submitDate && (
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-1">
                          Submission date
                        </dt>
                        <dd className="text-sm text-neutral-700">{submitDate}</dd>
                      </div>
                    )}
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-1">
                        Access type
                      </dt>
                      <dd className="text-sm text-success font-semibold">Open Access</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-1">
                        Review
                      </dt>
                      <dd className="text-sm text-neutral-700">Editorial board (double-blind)</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-1">
                        Downloads
                      </dt>
                      <dd className="text-2xl font-bold text-primary">
                        {article.download_count || 0}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-1">
                        Average rating
                      </dt>
                      <dd className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-yellow-500">
                          {avgRating > 0 ? parseFloat(avgRating).toFixed(1) : '—'}
                        </span>
                        {ratingCount > 0 && (
                          <span className="text-xs text-neutral-400">/ 5 ({ratingCount} reviews)</span>
                        )}
                      </dd>
                    </div>
                  </dl>

                  {keywords.length > 0 && (
                    <div className="pt-4 border-t border-neutral-100">
                      <dt className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-3">
                        Keywords
                      </dt>
                      <div className="flex flex-wrap gap-2">
                        {keywords.map(k => (
                          <Link key={k}
                                to={`/articles?q=${encodeURIComponent(k)}`}
                                className="text-xs bg-neutral-100 text-neutral-600 rounded px-3 py-1.5
                                           border border-neutral-200 hover:border-primary hover:text-primary
                                           no-underline transition-colors">
                            {k}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ─── TAB: Download ─── */}
              {activeTab === 'download' && (
                <div className="space-y-6">
                  <h2 className="text-base font-bold text-neutral-800 pb-2
                                 border-b-2 border-primary inline-block pr-4">
                    Download article
                  </h2>
                  {article.pdf_url ? (
                    <div className="mt-4 bg-neutral-50 border border-neutral-200 rounded-lg p-8
                                    flex flex-col items-center text-center gap-5">
                      <div className="w-20 h-24 bg-white border border-neutral-300 rounded
                                      flex items-center justify-center shadow-sm">
                        <svg className="w-10 h-10 text-primary/40" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd"
                                d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116
                                   7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1
                                   0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                                clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-base font-semibold text-neutral-800 mb-1">
                          {article.title}
                        </p>
                        <p className="text-sm text-neutral-500 mb-1">{article.author_name}</p>
                        <p className="text-xs text-neutral-400 mb-5">
                          {isDocx ? 'Document Word (.docx)' : 'Document PDF'} — Open Access
                        </p>
                        <button onClick={handleDownload}
                                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white
                                           rounded text-sm font-semibold hover:bg-primary-600 transition-colors
                                           shadow-sm">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd"
                                  d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1
                                     1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0
                                     111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                                  clipRule="evenodd" />
                          </svg>
                          {fileLabel}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-neutral-500 mt-4">
                      The file for this article is not yet available.
                    </p>
                  )}
                </div>
              )}

            </main>

            {/* ── Colonne latérale ─────────────────────── */}
            <aside className="mt-8 lg:mt-0 space-y-5">

              {/* Téléchargement rapide */}
              {article.pdf_url && (
                <div className="bg-primary rounded-lg p-5 text-white">
                  <button onClick={handleDownload}
                          className="w-full flex items-center justify-center gap-2 px-4 py-3
                                     bg-white text-primary font-semibold text-sm rounded
                                     hover:bg-primary-50 transition-colors">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd"
                            d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1
                               1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0
                               111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                            clipRule="evenodd" />
                    </svg>
                    {fileLabel}
                  </button>
                  <p className="text-xs text-white/60 text-center mt-2">
                    Open Access · No registration required
                  </p>
                </div>
              )}

              {/* Infos rapides */}
              <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
                <div className="bg-neutral-50 px-4 py-3 border-b border-neutral-200">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-500">
                    Informations
                  </h3>
                </div>
                <dl className="px-4 py-4 space-y-3 text-xs">
                  <div className="flex justify-between">
                    <dt className="text-neutral-400">Journal</dt>
                    <dd className="text-neutral-700 font-medium text-right max-w-[140px] leading-tight">JAEI</dd>
                  </div>
                  {pubDate && (
                    <div className="flex justify-between">
                      <dt className="text-neutral-400">Published on</dt>
                      <dd className="text-neutral-700">{pubDate}</dd>
                    </div>
                  )}
                  {article.research_area && (
                    <div className="flex justify-between">
                      <dt className="text-neutral-400">Field</dt>
                      <dd className="text-neutral-700 text-right max-w-[150px] leading-tight">
                        {article.research_area}
                      </dd>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <dt className="text-neutral-400">Access</dt>
                    <dd className="text-success font-semibold">Open</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-neutral-400">Review</dt>
                    <dd className="text-neutral-700 text-right max-w-[130px] leading-tight">
                      Double-blind
                    </dd>
                  </div>
                </dl>
              </div>

              {/* CTA submit */}
              <div className="bg-jaei-gradient rounded-lg p-5 text-white">
                <h3 className="text-sm font-semibold mb-2">Are you a researcher?</h3>
                <p className="text-xs text-white/70 mb-4 leading-relaxed">
                  Submit your work to JAEI and contribute to the dissemination of agricultural knowledge.
                </p>
                <Link to="/register"
                      className="block text-center px-4 py-2 bg-white text-primary text-xs
                                 font-semibold rounded hover:bg-primary-50 transition-colors no-underline">
                  Submit an article
                </Link>
              </div>

              {/* Articles connexes */}
              {related.length > 0 && (
                <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
                  <div className="bg-neutral-50 px-4 py-3 border-b border-neutral-200">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-500">
                      Related articles
                    </h3>
                  </div>
                  <div className="px-4 py-2">
                    {related.map(r => <RelatedCard key={r.id} article={r} />)}
                  </div>
                </div>
              )}
            </aside>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          🟪 MÉTRIQUES AUTEUR
      ══════════════════════════════════════════════════════ */}
      {authorStats && (
        <div className="bg-white border-t border-neutral-200">
          <div className="page-container py-10">
            <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-8 text-center">
              Author metrics
            </h2>
            <div className="grid grid-cols-3 divide-x divide-neutral-200">
              <div className="flex flex-col items-center py-4 text-center">
                <span className="text-5xl font-extrabold text-primary leading-none">
                  {authorStats.published_count || 0}
                </span>
                <span className="text-xs text-neutral-500 mt-3">
                  Article{parseInt(authorStats.published_count) !== 1 ? 's' : ''} published
                </span>
              </div>
              <div className="flex flex-col items-center py-4 text-center">
                <span className="text-5xl font-extrabold text-primary leading-none">
                  {authorStats.total_downloads || 0}
                </span>
                <span className="text-xs text-neutral-500 mt-3">Downloads</span>
              </div>
              <div className="flex flex-col items-center py-4 text-center">
                <span className="text-5xl font-extrabold text-primary leading-none">
                  {authorStats.total_submitted || 0}
                </span>
                <span className="text-xs text-neutral-500 mt-3">Total submissions</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          🟣 PROFIL AUTEUR — bande verte foncée
      ══════════════════════════════════════════════════════ */}
      <div className="bg-primary-900 min-h-[180px] flex flex-col justify-center">
        <div className="page-container py-10">
          <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-6 text-center">
            About the author
          </p>
          <div className="flex items-center gap-10 max-w-3xl mx-auto">

            {/* Avatar + Nom groupés (espace réduit entre eux) */}
            <div className="flex items-center gap-4 flex-1 min-w-0">
              {/* Avatar */}
              <div className="flex-shrink-0">
                {article.author_avatar ? (
                  <img src={`${BACKEND}${article.author_avatar}`}
                       alt={article.author_name}
                       className="w-20 h-20 rounded-full object-cover border-2 border-white/20" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-primary-700 border-2 border-white/20
                                  flex items-center justify-center">
                    <span className="text-3xl font-bold text-white/80">
                      {article.author_name?.[0]?.toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              {/* Nom + institution */}
              <div className="min-w-0">
                <h3 className="text-xl font-bold text-white">{article.author_name}</h3>
                {article.institution && (
                  <p className="text-sm text-white/60 mt-1">{article.institution}</p>
                )}
                {article.author_domain && (
                  <span className="inline-block mt-2 text-xxs font-semibold uppercase tracking-wider
                                   text-primary-200 bg-white/10 border border-white/20 rounded px-2.5 py-1">
                    {article.author_domain}
                  </span>
                )}
              </div>
            </div>

            {/* Stats à droite */}
            {authorStats && (
              <div className="flex items-center gap-10 flex-shrink-0 border-l border-white/20 pl-10">
                <div className="text-center">
                  <p className="text-3xl font-extrabold text-white leading-none">
                    {authorStats.published_count || 0}
                  </p>
                  <p className="text-xxs text-white/40 mt-1.5 uppercase tracking-widest">Publications</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-extrabold text-white leading-none">
                    {authorStats.total_downloads || 0}
                  </p>
                  <p className="text-xxs text-white/40 mt-1.5 uppercase tracking-widest">Downloads</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

    </Layout>
  );
}
