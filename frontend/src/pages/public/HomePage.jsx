import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import api from '../../utils/api';

// ============================================================
// HomePage — Reproduction 100% fidèle ScienceDirect
// Structure complète (captures d'écran du haut vers le bas) :
//
//  [Navbar JAEI existante — identique à ScienceDirect global nav]
//  ── ZONE 1 : Journal header (fond vert, logo + titre + métriques droite)
//  ── ZONE 2 : Tab nav blanc (Articles & Issues | About | ... | Search | Submit)
//  ── ZONE 3 : About the journal (gauche gris) + Article publishing options (droite)
//  ── ZONE 4 : Barre métriques pleine largeur (grands chiffres, bordure gauche)
//  ── ZONE 5 : Editors-in-Chief (fond vert pleine largeur)
//  ── ZONE 6 : Articles (blanc, sous-tabs + grille 4 col)
//  ── ZONE 7 : More from JAEI (blanc)
//  ── ZONE 8 : Calls for papers (fond bleu clair)
//  ── ZONE 9 : Special issues (fond gris)
//  ── ZONE 10 : Footer journal
// ============================================================

const G  = '#1B4427';  // JAEI vert = teal ScienceDirect
const B  = '#2E9E68';  // JAEI vert accent (même ton que bleu ScienceDirect mais vert)

// ── Icônes ────────────────────────────────────────────────
const Chev = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

const SearchIco = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="15.5" y2="15.5"/>
  </svg>
);

const Arr = ({ color = '#fff', size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
       strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);

const InfoIco = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={B}
       strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="8.5" strokeWidth={3}/>
    <line x1="12" y1="12" x2="12" y2="16"/>
  </svg>
);

// Barre bleue au-dessus des titres de section
const Bar = () => <div style={{ width: 28, height: 3, background: B, marginBottom: 10 }}/>;

// Bouton carré bleu → label (comme "Read latest issue")
const SqBtn = ({ to, label }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 28 }}>
    <Link to={to} style={{
      width: 38, height: 38, background: B, borderRadius: 2,
      display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', flexShrink: 0,
    }}><Arr color="#fff" size={16}/></Link>
    <Link to={to} style={{ fontSize: 14, color: '#1D1D1D', textDecoration: 'none', fontWeight: 500 }}
          className="hover:underline">{label}</Link>
  </div>
);

// ── Carte article (grille 4 col) ──────────────────────────
const ACard = ({ a }) => {
  const date = a.updated_at
    ? new Date(a.updated_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : '';
  return (
    <div style={{ borderBottom: '1px solid #E8E8E8', paddingBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: '#6B6B6B' }}>Research article</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#22A048', fontWeight: 500 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22A048', display: 'inline-block' }}/>
          Open access
        </span>
      </div>
      <Link to={`/articles/${a.id}`} className="hover:underline"
            style={{ display: 'block', fontSize: 14, fontWeight: 700, color: '#1D1D1D',
                     lineHeight: 1.45, textDecoration: 'none', marginBottom: 8 }}>
        {a.title}
      </Link>
      {a.author_name && (
        <p style={{ fontSize: 12, color: '#6B6B6B', margin: '0 0 3px', lineHeight: 1.4 }}>
          {a.author_name}
        </p>
      )}
      <p style={{ fontSize: 12, color: '#6B6B6B', margin: '0 0 8px' }}>{date}</p>
      <Link to={`/articles/${a.id}`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5,
                     fontSize: 12, color: '#C0392B', textDecoration: 'none' }}
            className="hover:underline">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="#C0392B">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/>
          <path d="M14 2v6h6"/>
        </svg>
        View PDF
      </Link>
    </div>
  );
};

const ASkel = () => (
  <div style={{ borderBottom: '1px solid #E8E8E8', paddingBottom: 18 }} className="animate-pulse">
    <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
      <div style={{ height: 11, width: 90, background: '#EBEBEB', borderRadius: 2 }}/>
      <div style={{ height: 11, width: 70, background: '#F0F0F0', borderRadius: 2 }}/>
    </div>
    <div style={{ height: 14, width: '88%', background: '#E0E0E0', borderRadius: 2, marginBottom: 6 }}/>
    <div style={{ height: 14, width: '65%', background: '#E8E8E8', borderRadius: 2, marginBottom: 10 }}/>
    <div style={{ height: 11, width: 60, background: '#F0F0F0', borderRadius: 2 }}/>
  </div>
);

// ── Carte éditeur (fond coloré) ───────────────────────────
const EdCard = ({ ed }) => {
  const clean    = ed.name.replace(/^Dr\.?\s*/i, '');
  const parts    = clean.trim().split(/\s+/);
  const initials = ((parts[0]?.[0] || '') + (parts[parts.length - 1]?.[0] || '')).toUpperCase();
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
      <div style={{
        width: 72, height: 72, borderRadius: '50%', flexShrink: 0,
        background: 'rgba(255,255,255,0.2)', border: '3px solid rgba(255,255,255,0.42)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 22, fontWeight: 700, color: '#fff',
      }}>{initials}</div>
      <div style={{ paddingTop: 5 }}>
        <p style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: '0 0 5px', lineHeight: 1.3 }}>
          {ed.name}
        </p>
        {ed.affiliation && (
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.76)', margin: 0, lineHeight: 1.45 }}>
            {ed.affiliation}
          </p>
        )}
      </div>
    </div>
  );
};

// ── Conteneur centré pleine largeur ──────────────────────
const W = ({ children, pad = '0 24px' }) => (
  <div style={{ maxWidth: 1280, margin: '0 auto', padding: pad }}>{children}</div>
);

// ============================================================
export default function HomePage() {
  const [recent,     setRecent]     = useState([]);
  const [editors,    setEditors]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [artTab,     setArtTab]     = useState('latest');
  const [search,     setSearch]     = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      api.get('/articles', { params: { limit: 8, page: 1 } }),
      api.get('/editorial-board'),
    ]).then(([ar, er]) => {
      setRecent(ar.data.articles || []);
      setEditors((er.data.data || []).flatMap(g => g.members));
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    navigate(search.trim() ? `/articles?q=${encodeURIComponent(search.trim())}` : '/articles');
  };

  const ART_TABS = ['Latest published', 'Articles in press', 'Top cited', 'Most downloaded', 'Most popular'];

  return (
    <Layout fullWidth>

      {/* ══════════════════════════════════════════════════
          ZONE 1 — JOURNAL HEADER (teal/vert, cover + titre + métriques)
          Exactement ScienceDirect : logo gauche | titre centre | métriques droite
      ══════════════════════════════════════════════════ */}
      <div style={{ background: G }}>
        <W pad="0 24px">
          <div style={{ display: 'flex', alignItems: 'center', padding: '20px 0', gap: 24, minHeight: 140 }}>

            {/* Logo (= cover image ScienceDirect) */}
            <img src="/logo-jaei.png" alt="JAEI"
                 style={{ height: 100, width: 'auto', objectFit: 'contain', flexShrink: 0,
                          filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.3))' }}/>

            {/* Titre + badge "Supports open access" */}
            <div style={{ flex: 1 }}>
              <h1 style={{
                fontSize: 28, fontWeight: 700, color: '#fff', margin: '0 0 8px',
                fontFamily: "'Georgia','Times New Roman',serif",
                borderBottom: '2px solid rgba(255,255,255,0.6)',
                paddingBottom: 8, lineHeight: 1.2,
              }}>
                Journal of Agricultural and Environmental Innovation
              </h1>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.88)', margin: 0 }}>
                Supports open access
              </p>
            </div>

            {/* Métriques droite (= CiteScore | Impact Factor sur ScienceDirect) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, flexShrink: 0 }}>
              <div style={{ textAlign: 'center', paddingRight: 24 }}>
                <p style={{ fontSize: 26, fontWeight: 700, color: '#fff', margin: '0 0 3px' }}>5 days</p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.80)', margin: 0 }}>Time to first decision</p>
              </div>
              <div style={{ width: 1, height: 44, background: 'rgba(255,255,255,0.35)' }}/>
              <div style={{ textAlign: 'center', paddingLeft: 24 }}>
                <p style={{ fontSize: 26, fontWeight: 700, color: '#fff', margin: '0 0 3px' }}>45 days</p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.80)', margin: 0 }}>Time to acceptance</p>
              </div>
            </div>
          </div>
        </W>
      </div>

      {/* ══════════════════════════════════════════════════
          ZONE 2 — TAB NAV BLANC (sticky, exactement ScienceDirect)
          Articles & Issues ▾ | About ▾ | Publish ▾ | Order ↗ | [Search] [🔍] | Submit ↗ | Guide
      ══════════════════════════════════════════════════ */}
      <div style={{ background: '#fff', borderBottom: '1px solid #D0D0D0',
                    position: 'sticky', top: 0, zIndex: 50 }}>
        <W pad="0 24px">
          <div style={{ display: 'flex', alignItems: 'center' }}>

            {/* Tabs avec dropdown arrow */}
            {[
              { label: 'Articles & Issues', active: true },
              { label: 'About',  to: '/about' },
              { label: 'Publish', to: '/register' },
            ].map(t => {
              const base = {
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '14px 16px', fontSize: 14, background: 'none', border: 'none',
                borderBottom: t.active ? `3px solid ${G}` : '3px solid transparent',
                color: t.active ? G : '#1D1D1D', fontWeight: t.active ? 600 : 400,
                cursor: 'pointer', whiteSpace: 'nowrap', textDecoration: 'none',
              };
              return t.to ? (
                <Link key={t.label} to={t.to} style={base}
                      onMouseEnter={e => { e.currentTarget.style.color = G; e.currentTarget.style.borderBottomColor = G; }}
                      onMouseLeave={e => { e.currentTarget.style.color = '#1D1D1D'; e.currentTarget.style.borderBottomColor = 'transparent'; }}>
                  {t.label} <Chev/>
                </Link>
              ) : (
                <button key={t.label} style={base}>{t.label} <Chev/></button>
              );
            })}

            {/* Order journal */}
            <Link to="/register" style={{
              padding: '14px 16px', fontSize: 14, color: '#1D1D1D',
              textDecoration: 'none', whiteSpace: 'nowrap',
            }}>Order journal ↗</Link>

            {/* Search */}
            <form onSubmit={handleSearch}
                  style={{ display: 'flex', alignItems: 'center', flex: 1, maxWidth: 300, margin: '0 8px' }}>
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                     placeholder="Search in this journal"
                     style={{ flex: 1, padding: '7px 12px', fontSize: 13, border: '1px solid #C8C8C8',
                              borderRight: 'none', outline: 'none', color: '#333' }}/>
              <button type="submit" style={{ padding: '7px 13px', background: B, color: '#fff',
                                             border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <SearchIco/>
              </button>
            </form>

            {/* Submit your article (lien dans la tab nav, comme ScienceDirect) */}
            <Link to="/register" style={{
              padding: '14px 16px', fontSize: 14, color: '#1D1D1D',
              textDecoration: 'none', whiteSpace: 'nowrap',
            }}>Submit your article ↗</Link>

            {/* Guide for authors (tout à droite) */}
            <Link to="/about" style={{
              marginLeft: 'auto', padding: '14px 0 14px 16px', fontSize: 14,
              color: '#1D1D1D', textDecoration: 'none', whiteSpace: 'nowrap',
            }}>Guide for authors</Link>
          </div>
        </W>
      </div>

      {/* ══════════════════════════════════════════════════
          ZONE 3 — ABOUT + PUBLISHING OPTIONS (fond blanc)
          Gauche : "About the journal" (card gris clair)
          Droite : "Article publishing options"
          Exactement comme ScienceDirect
      ══════════════════════════════════════════════════ */}
      <div style={{ background: '#fff', borderBottom: '1px solid #E8E8E8' }}>
        <W pad="32px 24px">
          <div style={{ display: 'flex', gap: 48, alignItems: 'flex-start' }}>

            {/* Gauche — About the journal (fond gris comme ScienceDirect) */}
            <div style={{
              flex: 2, background: '#F0F0F0', padding: '24px 28px', minHeight: 220,
            }}>
              <h2 style={{ fontSize: 18, fontWeight: 400, color: '#1D1D1D', margin: '0 0 16px' }}>
                About the journal
              </h2>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#1D1D1D', margin: '0 0 10px',
                          textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                AIMS
              </p>
              <p style={{ fontSize: 14, color: '#333', lineHeight: 1.75, margin: '0 0 16px',
                          fontStyle: 'italic' }}>
                <strong>Journal of Agricultural and Environmental Innovation (JAEI)</strong> publishes
                original, scientifically rigorous research articles of international significance
                focused on agricultural and environmental sciences, including{' '}
                <strong>soil biology</strong>, <strong>sustainable land use</strong>,
                {' '}aquaculture, biotechnology, pollution control, and related interdisciplinary domains.
                These include the possible applications of such knowledge in African and tropical contexts …
              </p>
              <Link to="/about" style={{ fontSize: 14, color: B, textDecoration: 'none' }}
                    className="hover:underline">
                View full aims &amp; scope
              </Link>
            </div>

            {/* Droite — Article publishing options */}
            <div style={{ flex: 1, minWidth: 260 }}>
              <h2 style={{ fontSize: 18, fontWeight: 400, color: '#1D1D1D', margin: '0 0 20px' }}>
                Article publishing options
              </h2>

              {/* Open Access */}
              <div style={{ marginBottom: 24 }}>
                <p style={{ fontSize: 15, fontWeight: 600, color: '#1D1D1D', margin: '0 0 8px' }}>
                  Open Access
                </p>
                <p style={{ fontSize: 14, color: '#444', lineHeight: 1.65, margin: '0 0 8px' }}>
                  Article Publishing Charge (APC):{' '}
                  <strong>USD 180</strong> / 100&nbsp;000&nbsp;FCFA / ¥&nbsp;1&nbsp;300 (excluding taxes).
                  The amount may be reduced or waived for eligible authors upon request.
                </p>
                <p style={{ fontSize: 14, color: '#444', margin: 0 }}>
                  Review{' '}
                  <Link to="/about" style={{ color: B, textDecoration: 'none' }} className="hover:underline">
                    this journal's open access policy.
                  </Link>
                </p>
              </div>

              {/* Subscription — adapté JAEI (tout OA, pas d'abonnement) */}
              <div>
                <p style={{ fontSize: 15, fontWeight: 600, color: '#1D1D1D', margin: '0 0 8px' }}>
                  Open Access only
                </p>
                <p style={{ fontSize: 14, color: '#444', lineHeight: 1.65, margin: 0 }}>
                  JAEI is a fully open access journal. All published articles are freely and
                  immediately accessible to all readers worldwide, with no subscription required.
                </p>
              </div>
            </div>
          </div>
        </W>
      </div>

      {/* ══════════════════════════════════════════════════
          ZONE 4 — BARRE MÉTRIQUES (fond blanc, pleine largeur)
          Exactement ScienceDirect : grands chiffres + bordure gauche + bouton carré
      ══════════════════════════════════════════════════ */}
      <div style={{ background: '#fff', borderBottom: '1px solid #E0E0E0' }}>
        <W pad="0 24px">
          <div style={{ display: 'flex', alignItems: 'center', padding: '36px 0' }}>
            {[
              { v: '5 days',    l: 'Submission to first decision' },
              { v: '45 days',   l: 'Submission to acceptance' },
              { v: 'Immediate', l: 'Acceptance to online publication' },
              { v: '4 / year',  l: 'Issues published per year' },
            ].map(({ v, l }, i) => (
              <div key={l} style={{
                flex: 1, padding: '0 32px',
                borderLeft: i > 0 ? '1px solid #D8D8D8' : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 30, fontWeight: 700, color: '#1D1D1D' }}>{v}</span>
                  <InfoIco/>
                </div>
                <p style={{ fontSize: 13, color: '#555', margin: 0, lineHeight: 1.4 }}>{l}</p>
              </div>
            ))}
            {/* Bouton bleu carré "View all insights" */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14,
                          paddingLeft: 32, borderLeft: '1px solid #D8D8D8', flexShrink: 0 }}>
              <div style={{ width: 40, height: 40, background: B, borderRadius: 2,
                            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Arr color="#fff" size={16}/>
              </div>
              <Link to="/about" style={{ fontSize: 14, color: '#1D1D1D', textDecoration: 'none',
                                         fontWeight: 500, whiteSpace: 'nowrap' }}>
                View all insights
              </Link>
            </div>
          </div>
        </W>
      </div>

      {/* ══════════════════════════════════════════════════
          ZONE 5 — EDITORS-IN-CHIEF (fond vert JAEI, pleine largeur)
          Avatar circulaire + Nom gras + Affiliation — grille 3 col
      ══════════════════════════════════════════════════ */}
      <div style={{ background: G }}>
        <W pad="40px 24px 48px">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: 0 }}>
              Editors-in-Chief
            </h2>
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 20 }}>|</span>
            <Link to="/about#comite" style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)',
                                              textDecoration: 'underline', textUnderlineOffset: 3 }}>
              View full editorial board
            </Link>
          </div>
          {editors.length === 0 ? (
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>Loading…</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(290px,1fr))',
                          gap: '28px 48px' }}>
              {editors.map(ed => <EdCard key={ed.id} ed={ed}/>)}
            </div>
          )}
        </W>
      </div>

      {/* ══════════════════════════════════════════════════
          ZONE 6 — ARTICLES (fond blanc, pleine largeur)
          Barre bleue + "Articles" + sous-tabs + grille 4 colonnes
      ══════════════════════════════════════════════════ */}
      <div style={{ background: '#fff' }}>
        <W pad="44px 24px 32px">
          <Bar/>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: '#1D1D1D', margin: '0 0 20px' }}>Articles</h2>

          {/* Sous-tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid #D8D8D8', marginBottom: 28 }}>
            {ART_TABS.map((t, i) => (
              <button key={t} onClick={() => setArtTab(t)}
                      style={{
                        padding: '10px 18px', fontSize: 14, background: 'none', border: 'none',
                        borderBottom: artTab === t ? '2px solid #1D1D1D' : '2px solid transparent',
                        color: '#1D1D1D', fontWeight: artTab === t ? 600 : 400,
                        cursor: 'pointer', whiteSpace: 'nowrap', marginBottom: -1,
                      }}>{t}</button>
            ))}
          </div>

          {/* Grille 4 colonnes */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '24px 32px' }}>
            {loading
              ? Array.from({ length: 8 }).map((_, i) => <ASkel key={i}/>)
              : recent.length === 0
                ? (
                  <div style={{ gridColumn: '1/-1', padding: '60px 0', textAlign: 'center' }}>
                    <p style={{ fontSize: 16, color: '#555', marginBottom: 8 }}>No articles published yet.</p>
                    <p style={{ fontSize: 13, color: '#999', marginBottom: 24 }}>
                      Accepted submissions will appear here automatically.
                    </p>
                    <Link to="/register" style={{ padding: '10px 28px', background: G, color: '#fff',
                                                   borderRadius: 2, textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
                      Be the first to submit
                    </Link>
                  </div>
                )
                : recent.map(a => <ACard key={a.id} a={a}/>)
            }
          </div>

          {!loading && recent.length > 0 && <SqBtn to="/articles" label="Read latest issue"/>}
        </W>
      </div>

      {/* ══════════════════════════════════════════════════
          ZONE 7 — MORE FROM JAEI (fond blanc)
          Tabs : News / Calls — comme "More from Soil Biology..."
      ══════════════════════════════════════════════════ */}
      <div style={{ background: '#fff', borderTop: '1px solid #E8E8E8' }}>
        <W pad="44px 24px 40px">
          <Bar/>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: '#1D1D1D', margin: '0 0 20px' }}>
            More from JAEI
          </h2>
          <div style={{ display: 'flex', borderBottom: '1px solid #D8D8D8', marginBottom: 24 }}>
            {['News', 'Conferences'].map((t, i) => (
              <button key={t} style={{
                padding: '10px 18px', fontSize: 14, background: 'none', border: 'none',
                borderBottom: i === 0 ? '2px solid #1D1D1D' : '2px solid transparent',
                color: '#1D1D1D', fontWeight: i === 0 ? 600 : 400,
                cursor: 'pointer', whiteSpace: 'nowrap', marginBottom: -1,
              }}>{t}</button>
            ))}
          </div>
          <div style={{ borderBottom: '1px solid #E8E8E8', paddingBottom: 20 }}>
            <p style={{ fontSize: 11, color: '#888', margin: '0 0 8px' }}>22 October 2025</p>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#1D1D1D', margin: 0 }}>
              JAEI is now open for manuscript submissions — Double-blind peer review
            </p>
          </div>
          <SqBtn to="/articles" label="View all news"/>
        </W>
      </div>

      {/* ══════════════════════════════════════════════════
          ZONE 8 — CALLS FOR PAPERS (fond bleu très clair)
          2 cartes blanches sur fond #EAF4FB — exactement ScienceDirect
      ══════════════════════════════════════════════════ */}
      <div style={{ background: '#EAF7EE', borderTop: '1px solid #C5E2CF' }}>
        <W pad="44px 24px 40px">
          <Bar/>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: '#1D1D1D', margin: '0 0 24px' }}>
            Calls for papers
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 20, marginBottom: 8 }}>
            {[
              {
                title: 'Agroecology and Sustainable Land Use — Special Issue 2025',
                eds: 'Guest editors: Dr. Mbezele Junior Yannick Ngaba, Dr. Aurele Gnetegha Ayemele',
                desc: 'JAEI invites original research manuscripts on agroforestry systems, soil carbon dynamics, and sustainable crop management in tropical and sub-Saharan contexts…',
                deadline: '31 December 2025',
              },
              {
                title: 'Aquaculture, Marine Biotechnology & Blue Economy',
                eds: 'Guest editor: Dr. Moussa Gouife',
                desc: 'We welcome submissions addressing sustainable aquaculture systems, aquatic animal health, fisheries ecology, and blue economy development in African and tropical regions…',
                deadline: '28 February 2026',
              },
            ].map(c => (
              <div key={c.title} style={{ background: '#fff', padding: 24, border: '1px solid #D8E8F0' }}>
                <p style={{ fontSize: 15, fontWeight: 700, color: '#1D1D1D', margin: '0 0 8px', lineHeight: 1.4 }}>
                  {c.title}
                </p>
                <p style={{ fontSize: 12, color: '#6B6B6B', margin: '0 0 10px' }}>{c.eds}</p>
                <p style={{ fontSize: 14, color: '#333', lineHeight: 1.65, margin: '0 0 14px' }}>{c.desc}</p>
                <p style={{ fontSize: 13, color: '#333', margin: 0 }}>
                  Submission deadline: <strong>{c.deadline}</strong>
                </p>
              </div>
            ))}
          </div>
          <SqBtn to="/register" label="View all calls for papers for special issues"/>
        </W>
      </div>

      {/* ══════════════════════════════════════════════════
          ZONE 9 — SPECIAL ISSUES (fond gris clair, grille 4 col)
      ══════════════════════════════════════════════════ */}
      <div style={{ background: '#F5F5F5', borderTop: '1px solid #E0E0E0' }}>
        <W pad="44px 24px 40px">
          <Bar/>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: '#1D1D1D', margin: '0 0 24px' }}>
            Special issues and article collections
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 20 }}>
            {[
              { title: 'Agroecology and Sustainable Land Use',                         editor: 'Dr. Mbezele Junior Yannick Ngaba',    date: '2025' },
              { title: 'Animal and Aquatic Sciences',                                  editor: 'Dr. Moussa Gouife',                   date: '2025' },
              { title: 'Environmental Science and Pollution Control',                  editor: 'Dr. Olive Mekontchou Yemele',        date: '2025' },
              { title: 'Biotechnology and Biochemistry',                               editor: 'Dr. David Mahoudjro Boujrenou',      date: '2025' },
              { title: 'Socio-Economic and Policy Dimensions of Natural Resource Use', editor: 'Dr. Aurele Gnetegha Ayemele',        date: '2025' },
              { title: 'Interdisciplinary and Emerging Areas',                         editor: 'Dr. Yvan Rudhel Megaptche Megaptche', date: '2025' },
              { title: 'Language, Communication, and Knowledge Translation',           editor: 'Dr. Yvan Rudhel Megaptche Megaptche', date: '2025' },
            ].map(s => (
              <div key={s.title} style={{ background: '#fff', padding: 18, border: '1px solid #E0E0E0' }}>
                <Link to="/register" style={{ fontSize: 14, fontWeight: 600, color: B,
                                               textDecoration: 'none', display: 'block', marginBottom: 8, lineHeight: 1.4 }}
                      className="hover:underline">{s.title}</Link>
                <p style={{ fontSize: 12, color: '#6B6B6B', margin: '0 0 6px' }}>Edited by {s.editor}</p>
                <p style={{ fontSize: 12, color: '#6B6B6B', margin: 0 }}>{s.date}</p>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 48, flexWrap: 'wrap' }}>
            <SqBtn to="/articles" label="View all special issues and article collections"/>
            <SqBtn to="/articles" label="View all issues"/>
          </div>
        </W>
      </div>

      {/* ══════════════════════════════════════════════════
          ZONE 10 — FOOTER JOURNAL (ISSN + colonnes For authors...)
          Exactement ScienceDirect
      ══════════════════════════════════════════════════ */}
      <div style={{ background: '#F5F5F5', borderTop: '1px solid #E0E0E0' }}>
        <W pad="32px 24px 16px">
          {/* ISSN + copyright */}
          <div style={{ display: 'flex', gap: 64, marginBottom: 32, flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontSize: 13, color: '#555', margin: '0 0 3px' }}>Print ISSN: To be defined</p>
              <p style={{ fontSize: 13, color: '#555', margin: 0 }}>Online ISSN: To be defined</p>
            </div>
            <p style={{ fontSize: 13, color: '#555', maxWidth: 440, lineHeight: 1.65, margin: 0 }}>
              Copyright © 2025 JAEI. All rights are reserved, including those for text and data mining,
              AI training, and similar technologies.
            </p>
          </div>

          {/* 3 colonnes : For authors | For editors | For reviewers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 32,
                        paddingTop: 24, borderTop: '1px solid #D8D8D8' }}>
            {[
              { title: 'For authors',   links: ['Submission guidelines', 'Author guidelines', 'Ethical requirements', 'CC BY 4.0 License', 'Track your submission'] },
              { title: 'For editors',   links: ['Editorial board', 'Editorial process', 'Peer review policy', 'Guest editors'] },
              { title: 'For reviewers', links: ['Reviewer guidelines', 'Review criteria', 'Editorial contact', 'Reviewer recognition'] },
            ].map(({ title, links }) => (
              <div key={title}>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#1D1D1D', margin: '0 0 12px' }}>{title}</p>
                <div style={{ height: 1, background: '#D8D8D8', marginBottom: 12 }}/>
                {links.map(l => (
                  <Link key={l} to="/about"
                        style={{ display: 'block', fontSize: 13, color: B, textDecoration: 'none', marginBottom: 8 }}
                        className="hover:underline">{l} ↗</Link>
                ))}
              </div>
            ))}
          </div>
        </W>
      </div>

    </Layout>
  );
}
