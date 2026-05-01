import { useState, useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import api from '../../utils/api';

// ============================================================
// ArticleDetail — Style ScienceDirect (scroll, pas d'onglets)
// ============================================================

const BACKEND = 'http://localhost:5000';

// ── Étoiles ─────────────────────────────────────────────────
function StarRating({ average, count, onRate }) {
  const [hover, setHover]   = useState(0);
  const [rated, setRated]   = useState(false);
  const display = hover || Math.round(average) || 0;
  const handleRate = (val) => { if (rated) return; setRated(true); onRate(val); };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {[1,2,3,4,5].map(s => (
        <button key={s} onClick={() => handleRate(s)}
                onMouseEnter={() => !rated && setHover(s)}
                onMouseLeave={() => setHover(0)}
                disabled={rated}
                style={{ background: 'none', border: 'none', cursor: rated ? 'default' : 'pointer', padding: 0 }}>
          <svg style={{ width: 18, height: 18, color: s <= display ? '#f59e0b' : '#ccc' }}
               fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
          </svg>
        </button>
      ))}
      <span style={{ fontSize: 12, color: '#666' }}>
        {average > 0 ? `${parseFloat(average).toFixed(1)} / 5` : 'Not yet rated'}
        {count > 0 && ` (${count})`}
      </span>
      {rated && <span style={{ fontSize: 12, color: '#2E9E68', fontWeight: 600 }}>Thank you!</span>}
    </div>
  );
}

// ── Carte article connexe — style couverture ScienceDirect ───
const RelatedCard = ({ article }) => (
  <Link to={`/articles/${article.id}`} style={{ display: 'block', textDecoration: 'none' }}
        className="group">
    <div style={{
      width: '100%', aspectRatio: '3/4',
      background: 'linear-gradient(145deg, #1B4427 0%, #2E9E68 100%)',
      borderRadius: 2, marginBottom: 10,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 8, boxShadow: '1px 2px 8px rgba(0,0,0,0.18)', border: '1px solid #ccc',
    }}>
      <svg style={{ width: 36, height: 36, color: 'rgba(255,255,255,0.45)' }} fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd"/>
      </svg>
      <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.55)', fontWeight: 700, letterSpacing: '0.12em' }}>ARTICLE</span>
    </div>
    <p style={{ fontSize: 12, color: '#666', margin: '0 0 4px' }}>Article</p>
    <p style={{ fontSize: 13, color: '#0066cc', margin: '0 0 4px', lineHeight: 1.4,
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
       className="group-hover:underline">
      {article.title}
    </p>
    {article.author_name && (
      <p style={{ fontSize: 12, color: '#888', margin: 0 }}>{article.author_name}</p>
    )}
  </Link>
);

// ============================================================
export default function ArticleDetail() {
  const { id } = useParams();

  const [data,     setData]     = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [avgRating,    setAvgRating]    = useState(0);
  const [ratingCount,  setRatingCount]  = useState(0);
  const [abstractFull, setAbstractFull] = useState(false);
  const [copied,     setCopied]     = useState(false);
  const [shareOpen,  setShareOpen]  = useState(false);
  const shareRef = useRef(null);

  useEffect(() => {
    setLoading(true); setNotFound(false);
    api.get(`/articles/${id}`)
      .then(r => {
        setData(r.data);
        const a = r.data.article;
        const avg = a.rating_count > 0 ? a.rating_sum / a.rating_count : 0;
        setAvgRating(avg);
        setRatingCount(a.rating_count || 0);
      })
      .catch(err => { if (err.response?.status === 404) setNotFound(true); })
      .finally(() => setLoading(false));
  }, [id]);

  const handleDownload = () => {
    api.post(`/articles/${id}/download`).catch(() => {});
    window.open(`${BACKEND}${article.pdf_url}`, '_blank');
  };

  const handleShare = () => setShareOpen(o => !o);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true); setTimeout(() => { setCopied(false); setShareOpen(false); }, 2000);
    });
  };

  // Fermer le dropdown si clic en dehors
  useEffect(() => {
    if (!shareOpen) return;
    const handleClick = (e) => {
      if (shareRef.current && !shareRef.current.contains(e.target)) setShareOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [shareOpen]);

  const handleRate = (val) => {
    api.post(`/articles/${id}/rate`, { rating: val })
      .then(r => { setAvgRating(parseFloat(r.data.average)); setRatingCount(r.data.count); })
      .catch(() => {});
  };

  // ── Loading ──────────────────────────────────────────────
  if (loading) return (
    <Layout>
      <div style={{ background: '#1B4427', height: 120 }} className="animate-pulse"/>
      <div className="page-container py-8 animate-pulse space-y-4">
        <div style={{ height: 16, width: 200, background: '#e5e5e5', borderRadius: 2 }}/>
        <div style={{ height: 24, background: '#e5e5e5', borderRadius: 2, width: '70%' }}/>
      </div>
    </Layout>
  );

  // ── 404 ──────────────────────────────────────────────────
  if (notFound) return (
    <Layout>
      <div className="page-container py-20 text-center">
        <div style={{ fontSize: 48, marginBottom: 16 }}>📄</div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1D1D1D', marginBottom: 8 }}>Article not found</h1>
        <p style={{ fontSize: 14, color: '#666', marginBottom: 32 }}>
          This article does not exist or has not been published yet.
        </p>
        <Link to="/articles" style={{
          padding: '10px 24px', background: '#1B4427', color: '#fff',
          borderRadius: 2, fontSize: 14, fontWeight: 500, textDecoration: 'none',
        }}>Back to catalogue</Link>
      </div>
    </Layout>
  );

  if (!data) return null;
  const { article, related, authorStats } = data;

  const keywords  = article.keywords  ? article.keywords.split(',').map(k=>k.trim()).filter(Boolean) : [];
  const coAuthors = article.co_authors ? article.co_authors.split(',').map(a=>a.trim()).filter(Boolean) : [];

  const pubDate = article.updated_at
    ? new Date(article.updated_at).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })
    : '';
  const pubYear = article.updated_at ? new Date(article.updated_at).getFullYear() : '';
  const isDocx  = article.pdf_url && article.pdf_url.match(/\.docx$/i);
  const fileLabel = isDocx ? 'Download document' : 'Download PDF';

  const abstractShort = article.abstract && article.abstract.length > 320
    ? article.abstract.slice(0, 320) + '…'
    : article.abstract;

  // Grille Details
  const details = [
    { label: 'Language',     value: 'English' },
    { label: 'Published',    value: pubDate || '—' },
    { label: 'Access',       value: 'Open Access', green: true },
    { label: 'Downloads',    value: String(article.download_count || 0) },
    { label: 'Rating',       value: avgRating > 0 ? `${parseFloat(avgRating).toFixed(1)} / 5 (${ratingCount} reviews)` : '—' },
    { label: 'Research field', value: article.research_area || '—' },
  ];

  return (
    <Layout>

      {/* ── Breadcrumb ─────────────────────────────────────── */}
      <div style={{ background: '#f5f5f5', borderBottom: '1px solid #ddd' }}>
        <div className="page-container" style={{ padding: '8px 24px' }}>
          <nav style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#666' }}>
            <Link to="/" style={{ color: '#0066cc', textDecoration: 'none' }} className="hover:underline">Home</Link>
            <span>›</span>
            <Link to="/articles" style={{ color: '#0066cc', textDecoration: 'none' }} className="hover:underline">Articles</Link>
            <span>›</span>
            <span style={{ color: '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 400 }}>
              {article.title}
            </span>
          </nav>
        </div>
      </div>

      {/* ── Header + Cover + Panel (fond sombre unifié, style ScienceDirect) ── */}
      <div style={{ background: '#1B4427', padding: '32px 0 48px' }}>
        <div className="page-container">

          {/* Titre */}
          {article.research_area && (
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', margin: '0 0 10px',
                        fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {article.research_area}
            </p>
          )}
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#fff', margin: '0 0 8px',
                       lineHeight: 1.3, fontFamily: "'Georgia','Times New Roman',serif", maxWidth: 820 }}>
            {article.title}
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', margin: '0 0 32px' }}>
            Article{pubYear ? ` • ${pubYear}` : ''}
            <span style={{ margin: '0 10px', color: 'rgba(255,255,255,0.3)' }}>•</span>
            <span style={{ color: '#4ade80', fontWeight: 600 }}>Open Access</span>
          </p>

          {/* Cover + Panel sur fond sombre */}
          <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start' }}>

            {/* Colonne gauche : couverture + auteurs + bouton About */}
            <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 14 }}>
              <div style={{
                width: 130, height: 168,
                background: 'linear-gradient(145deg, #0d2b18 0%, #2E9E68 100%)',
                border: '1px solid rgba(255,255,255,0.2)', borderRadius: 2,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 10, boxShadow: '3px 4px 18px rgba(0,0,0,0.35)',
              }}>
                <svg style={{ width: 42, height: 42, color: 'rgba(255,255,255,0.45)' }} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd"/>
                </svg>
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.55)', fontWeight: 700, letterSpacing: '0.12em' }}>
                  {isDocx ? 'DOCX' : 'PDF'}
                </span>
              </div>
              {/* Auteurs sous la couverture */}
              <div>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', margin: '0 0 3px' }}>
                  {coAuthors.length > 0 ? 'Authors:' : 'Author:'}
                </p>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: 600, margin: 0 }}>
                  {article.author_name}
                  {coAuthors.length > 0 && (
                    <span style={{ fontWeight: 400, color: 'rgba(255,255,255,0.65)' }}>
                      {' '}and {coAuthors.join(', ')}
                    </span>
                  )}
                </p>
              </div>
              {/* Bouton About */}
              <a href="#about-article"
                 style={{ display: 'flex', alignItems: 'center', gap: 8,
                          border: '1px solid rgba(255,255,255,0.4)', borderRadius: 2,
                          padding: '7px 14px', fontSize: 13, color: '#fff',
                          background: 'transparent', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                <svg style={{ width: 14, height: 14 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                </svg>
                About the article
              </a>
            </div>

            {/* Panel blanc (actions + abstract + rating) */}
            <div style={{ flex: 1, background: '#fff', border: '1px solid rgba(255,255,255,0.15)',
                          borderRadius: 2, padding: '24px 28px', boxShadow: '0 2px 16px rgba(0,0,0,0.2)' }}>

              {/* Layout 2 colonnes : gauche=description, droite=boutons */}
              <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start' }}>

                {/* Colonne gauche : titre + description + rating */}
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1D1D1D', margin: '0 0 16px' }}>
                    Browse this article
                  </h3>

                  {/* Aperçu abstract */}
                  <div style={{ marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid #eee' }}>
                    <h4 style={{ fontSize: 14, fontWeight: 600, color: '#1D1D1D', margin: '0 0 8px' }}>
                      Article description
                    </h4>
                    <p style={{ fontSize: 14, color: '#444', lineHeight: 1.75, margin: '0 0 8px' }}>
                      {abstractFull ? article.abstract : abstractShort}
                    </p>
                    {article.abstract && article.abstract.length > 320 && (
                      <button onClick={() => setAbstractFull(!abstractFull)}
                              style={{ color: '#0066cc', fontSize: 13, background: 'none', border: 'none',
                                       cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
                        {abstractFull ? 'show less' : 'read full description'}
                      </button>
                    )}
                  </div>

                  {/* Rating */}
                  <div>
                    <p style={{ fontSize: 12, color: '#888', margin: '0 0 8px', fontWeight: 600,
                                 textTransform: 'uppercase', letterSpacing: '0.04em' }}>Rate this article</p>
                    <StarRating average={avgRating} count={ratingCount} onRate={handleRate}/>
                  </div>
                </div>

                {/* Colonne droite : boutons empilés */}
                <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12, minWidth: 190 }}>
                  {article.pdf_url && (
                    <button onClick={handleDownload} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#0066cc', fontSize: 14
                    }}>
                      <div style={{ width: 38, height: 38, background: '#0066cc', borderRadius: 2,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg style={{ width: 20, height: 20, color: '#fff' }} fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd"/>
                        </svg>
                      </div>
                      {fileLabel}
                    </button>
                  )}
                  {/* Share button + dropdown */}
                  <div ref={shareRef} style={{ position: 'relative' }}>
                  <button onClick={handleShare} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                    color: '#0066cc', fontSize: 14
                  }}>
                    <div style={{ width: 38, height: 38, background: '#0066cc',
                                  borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  flexShrink: 0 }}>
                      <svg style={{ width: 20, height: 20, color: '#fff' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
                      </svg>
                    </div>
                    Share this article
                  </button>

                  {shareOpen && (
                    <div style={{
                      position: 'absolute', top: 'calc(100% + 8px)', left: 0, zIndex: 100,
                      background: '#fff', border: '1px solid #ddd', borderRadius: 4,
                      boxShadow: '0 4px 20px rgba(0,0,0,0.15)', minWidth: 200, overflow: 'hidden'
                    }}>
                      {/* Flèche */}
                      <div style={{
                        position: 'absolute', top: -7, left: 14, width: 12, height: 12,
                        background: '#fff', border: '1px solid #ddd', borderBottom: 'none',
                        borderRight: 'none', transform: 'rotate(45deg)'
                      }}/>
                      {[
                        {
                          label: 'Copy link',
                          icon: (
                            <svg style={{ width: 16, height: 16 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                            </svg>
                          ),
                          action: handleCopyLink,
                          success: copied,
                        },
                        {
                          label: 'Email',
                          icon: (
                            <svg style={{ width: 16, height: 16 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                            </svg>
                          ),
                          href: `mailto:?subject=${encodeURIComponent(article.title)}&body=${encodeURIComponent('Check out this article: ' + window.location.href)}`,
                        },
                        {
                          label: 'Twitter / X',
                          icon: (
                            <svg style={{ width: 16, height: 16 }} fill="currentColor" viewBox="0 0 24 24">
                              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                            </svg>
                          ),
                          href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(article.title)}&url=${encodeURIComponent(window.location.href)}`,
                        },
                        {
                          label: 'LinkedIn',
                          icon: (
                            <svg style={{ width: 16, height: 16 }} fill="currentColor" viewBox="0 0 24 24">
                              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                            </svg>
                          ),
                          href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`,
                        },
                        {
                          label: 'Facebook',
                          icon: (
                            <svg style={{ width: 16, height: 16 }} fill="currentColor" viewBox="0 0 24 24">
                              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                            </svg>
                          ),
                          href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`,
                        },
                      ].map((item, idx) => (
                        item.href ? (
                          <a key={idx} href={item.href} target="_blank" rel="noopener noreferrer"
                             onClick={() => setShareOpen(false)}
                             style={{
                               display: 'flex', alignItems: 'center', gap: 12,
                               padding: '11px 16px', fontSize: 13, color: '#333',
                               textDecoration: 'none', borderBottom: idx < 4 ? '1px solid #f0f0f0' : 'none',
                               transition: 'background 0.1s',
                             }}
                             onMouseEnter={e => e.currentTarget.style.background = '#f5f5f5'}
                             onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <span style={{ color: '#555' }}>{item.icon}</span>
                            {item.label}
                          </a>
                        ) : (
                          <button key={idx} onClick={item.action}
                                  style={{
                                    display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                                    padding: '11px 16px', fontSize: 13,
                                    color: item.success ? '#2E9E68' : '#333',
                                    background: 'none', border: 'none', borderBottom: '1px solid #f0f0f0',
                                    cursor: 'pointer', textAlign: 'left', transition: 'background 0.1s',
                                  }}
                                  onMouseEnter={e => e.currentTarget.style.background = '#f5f5f5'}
                                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <span style={{ color: item.success ? '#2E9E68' : '#555' }}>{item.icon}</span>
                            {item.success ? 'Link copied!' : item.label}
                          </button>
                        )
                      ))}
                    </div>
                  )}
                </div>
                </div>{/* fin colonne droite */}
              </div>{/* fin layout 2 colonnes */}
            </div>
          </div>
        </div>
      </div>

      {/* ── Abstract complet ───────────────────────────────── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #ddd' }}>
        <div className="page-container" style={{ padding: '40px 24px' }}>
          <h2 style={{ fontSize: 22, fontWeight: 400, color: '#1D1D1D', margin: '0 0 20px' }}>Abstract</h2>
          <p style={{ fontSize: 15, color: '#333', lineHeight: 1.8, maxWidth: 820, margin: '0 0 20px' }}>
            {article.abstract}
          </p>
          {keywords.length > 0 && (
            <p style={{ fontSize: 14, color: '#333', margin: 0 }}>
              <strong>Keywords: </strong>
              {keywords.map((k, i) => (
                <span key={k}>
                  <Link to={`/articles?q=${encodeURIComponent(k)}`}
                        style={{ color: '#0066cc', textDecoration: 'none' }} className="hover:underline">
                    {k}
                  </Link>
                  {i < keywords.length - 1 && <span style={{ color: '#aaa', margin: '0 6px' }}>·</span>}
                </span>
              ))}
            </p>
          )}
        </div>
      </div>

      {/* ── About the article (2 colonnes) ────────────────── */}
      <div id="about-article" style={{ background: '#f5f5f5', borderBottom: '1px solid #ddd' }}>
        <div className="page-container" style={{ padding: '40px 24px' }}>
          <h2 style={{ fontSize: 22, fontWeight: 400, color: '#1D1D1D', margin: '0 0 24px' }}>About the article</h2>
          <div style={{ display: 'flex', gap: 56, alignItems: 'flex-start' }}>
            <div style={{ flex: 2 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1D1D1D', margin: '0 0 12px' }}>Description</h3>
              <p style={{ fontSize: 14, color: '#444', lineHeight: 1.8, margin: 0 }}>
                {article.abstract}
              </p>
            </div>
            {keywords.length > 0 && (
              <div style={{ flex: 1, minWidth: 200 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1D1D1D', margin: '0 0 12px' }}>Key topics</h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {keywords.map(k => (
                    <li key={k} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <span style={{ color: '#2E9E68', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>›</span>
                      <Link to={`/articles?q=${encodeURIComponent(k)}`}
                            style={{ color: '#0066cc', fontSize: 13, textDecoration: 'none' }}
                            className="hover:underline">
                        {k}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Details (grille 4 colonnes) ────────────────────── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #ddd' }}>
        <div className="page-container" style={{ padding: '40px 24px' }}>
          <h2 style={{ fontSize: 22, fontWeight: 400, color: '#1D1D1D', margin: '0 0 24px' }}>Details</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px 0' }}>
            {details.map((item, i) => (
              <div key={i} style={{
                padding: '12px 20px 12px 0',
              }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#888', margin: '0 0 6px',
                             textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {item.label}
                </p>
                <p style={{ fontSize: 14, margin: 0, fontWeight: item.green ? 600 : 400,
                             color: item.green ? '#2E9E68' : '#1D1D1D', lineHeight: 1.4 }}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Authors ────────────────────────────────────────── */}
      <div style={{ background: '#f5f5f5', borderBottom: '1px solid #ddd' }}>
        <div className="page-container" style={{ padding: '40px 24px' }}>
          <h2 style={{ fontSize: 22, fontWeight: 400, color: '#1D1D1D', margin: '0 0 24px' }}>
            {coAuthors.length > 0 ? 'Authors' : 'Author'}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Auteur principal */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
                            background: '#1B4427', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {article.author_avatar
                  ? <img src={`${BACKEND}${article.author_avatar}`} alt={article.author_name}
                         style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}/>
                  : <span style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>
                      {article.author_name?.[0]?.toUpperCase()}
                    </span>
                }
              </div>
              <div>
                <p style={{ fontSize: 16, fontWeight: 600, color: '#0066cc', margin: '0 0 3px' }}>
                  {article.author_name}
                </p>
                {article.institution && (
                  <p style={{ fontSize: 13, color: '#555', margin: '0 0 2px' }}>{article.institution}</p>
                )}
                {article.author_domain && (
                  <p style={{ fontSize: 12, color: '#888', margin: 0 }}>{article.author_domain}</p>
                )}
                {authorStats && (
                  <p style={{ fontSize: 12, color: '#aaa', margin: '4px 0 0' }}>
                    {authorStats.published_count || 0} article{parseInt(authorStats.published_count) !== 1 ? 's' : ''} published
                    · {authorStats.total_downloads || 0} downloads
                  </p>
                )}
              </div>
            </div>
            {/* Co-auteurs */}
            {coAuthors.map((ca, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
                              background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 20, fontWeight: 700, color: '#6b7280' }}>
                    {ca[0]?.toUpperCase()}
                  </span>
                </div>
                <div>
                  <p style={{ fontSize: 16, fontWeight: 600, color: '#0066cc', margin: 0 }}>{ca}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Related articles (grille couvertures) ──────────── */}
      {related.length > 0 && (
        <div style={{ background: '#fff', borderBottom: '1px solid #ddd' }}>
          <div className="page-container" style={{ padding: '40px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontSize: 22, fontWeight: 400, color: '#1D1D1D', margin: 0 }}>Related articles</h2>
              <Link to="/articles" style={{ fontSize: 13, color: '#0066cc', textDecoration: 'none' }}
                    className="hover:underline">
                View all articles →
              </Link>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 24 }}>
              {related.slice(0, 4).map(r => <RelatedCard key={r.id} article={r}/>)}
            </div>
          </div>
        </div>
      )}

    </Layout>
  );
}
