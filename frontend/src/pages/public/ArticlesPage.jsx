import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import api from '../../utils/api';
import { DOMAIN_MAP, MAIN_DOMAINS } from '../../utils/domains';

// ============================================================
// ArticlesPage — Catalogue JAEI
// 7 domaines officiels JAEI + sous-domaines
// ============================================================

// Groupes de filtres construits depuis la source de vérité unique (utils/domains.js)
// Chaque groupe inclut le nom du domaine principal comme premier filtre
// → couvre les articles migrés (research_area = domaine principal)
//   ET les nouveaux articles (research_area = sous-domaine)
const DOMAIN_GROUPS = MAIN_DOMAINS.map(domain => ({
  label: domain,
  // Le domaine principal lui-même est inclus en premier pour les articles migrés
  subdomains: [domain, ...DOMAIN_MAP[domain]],
}));

// ── Icônes ────────────────────────────────────────────────────
const IconPdf = () => (
  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd"
      d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z"
      clipRule="evenodd"/>
  </svg>
);

const IconOpenAccess = () => (
  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd"
      d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
      clipRule="evenodd"/>
  </svg>
);

const IconSearch = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/>
  </svg>
);

const IconChevron = ({ open }) => (
  <svg className={`w-3.5 h-3.5 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
       fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
  </svg>
);

// ── Résultat article (style ScienceDirect) ────────────────────
const ArticleRow = ({ article }) => {
  const abstract = article.abstract?.length > 280
    ? article.abstract.slice(0, 280) + '…'
    : article.abstract;

  const date = article.updated_at
    ? new Date(article.updated_at).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : '';

  const keywords = article.keywords
    ? article.keywords.split(',').map(k => k.trim()).filter(Boolean).slice(0, 5)
    : [];

  return (
    <div className="py-5 border-b border-neutral-200 last:border-0 hover:bg-neutral-50 px-1 -mx-1 rounded-sm"
         style={{ transition: 'background-color 0.15s ease' }}>

      {/* Badges */}
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className="inline-flex items-center gap-1 text-xxs font-semibold text-success
                         bg-green-50 border border-green-200 rounded px-1.5 py-0.5 uppercase tracking-wide">
          <IconOpenAccess /> Open Access
        </span>
        {article.research_area && (
          <span className="inline-block text-xxs font-semibold uppercase tracking-wider
                           text-accent bg-accent-50 border border-accent-100 rounded px-2 py-0.5">
            {article.research_area}
          </span>
        )}
      </div>

      {/* Titre */}
      <Link to={`/articles/${article.id}`}
            className="block text-[15px] font-semibold text-primary leading-snug mb-1.5
                       hover:underline no-underline">
        {article.title}
      </Link>

      {/* Auteurs */}
      <p className="text-xs text-neutral-600 mb-1">
        {article.author_name}
        {article.co_authors && <span className="text-neutral-400">, {article.co_authors}</span>}
      </p>

      {/* Journal + date */}
      <p className="text-xs text-neutral-400 italic mb-3">
        Journal of Agricultural and Environmental Innovation
        {date && <> &bull; Published on {date}</>}
      </p>

      {/* Résumé */}
      {abstract && (
        <p className="text-xs text-neutral-600 leading-relaxed mb-3 line-clamp-3">{abstract}</p>
      )}

      {/* Mots-clés */}
      {keywords.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {keywords.map(k => (
            <Link key={k} to={`/articles?q=${encodeURIComponent(k)}`}
                  className="text-xxs bg-neutral-100 text-neutral-500 rounded px-2 py-0.5
                             border border-neutral-200 hover:border-primary hover:text-primary
                             no-underline transition-colors">
              {k}
            </Link>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Link to={`/articles/${article.id}`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-white
                         bg-primary px-3 py-1.5 rounded hover:bg-primary-600
                         no-underline transition-colors">
          Read article
        </Link>
        {article.pdf_url && (
          <a href={`http://localhost:5000${article.pdf_url}`}
             target="_blank" rel="noopener noreferrer"
             onClick={e => e.stopPropagation()}
             className="inline-flex items-center gap-1.5 text-xs font-medium text-primary
                        border border-primary px-3 py-1.5 rounded hover:bg-primary-50
                        no-underline transition-colors">
            <IconPdf /> PDF
          </a>
        )}
      </div>
    </div>
  );
};

// ── Squelette ─────────────────────────────────────────────────
const SkeletonRow = () => (
  <div className="py-5 border-b border-neutral-200 animate-pulse">
    <div className="h-3 w-32 bg-neutral-200 rounded mb-3" />
    <div className="h-4 bg-neutral-200 rounded mb-2 w-3/4" />
    <div className="h-3 w-40 bg-neutral-100 rounded mb-2" />
    <div className="h-3 w-56 bg-neutral-100 rounded mb-3" />
    <div className="space-y-1.5 mb-3">
      <div className="h-3 bg-neutral-100 rounded" />
      <div className="h-3 bg-neutral-100 rounded w-5/6" />
    </div>
    <div className="flex gap-2">
      <div className="h-6 w-24 bg-neutral-200 rounded" />
      <div className="h-6 w-14 bg-neutral-100 rounded" />
    </div>
  </div>
);

// ── Groupe filtre (domaine principal + sous-domaines) ──────────
const DomainGroup = ({ group, domains, onToggle }) => {
  const activeCount = group.subdomains.filter(s => domains.includes(s)).length;
  const [open, setOpen] = useState(activeCount > 0);

  return (
    <div className="border-b border-neutral-100 last:border-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between py-2.5 gap-2 text-left group"
      >
        <span className={`text-xs font-semibold leading-tight transition-colors flex-1
          ${activeCount > 0 ? 'text-primary' : 'text-neutral-700 group-hover:text-primary'}`}>
          {group.label}
          {activeCount > 0 && (
            <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4
                             bg-primary text-white text-xxs rounded-full font-bold">
              {activeCount}
            </span>
          )}
        </span>
        <IconChevron open={open} />
      </button>

      {open && (
        <div className="pb-2.5 pl-2 space-y-1.5">
          {group.subdomains.map((sub, idx) => {
            const checked = domains.includes(sub);
            const isMainDomain = idx === 0; // premier item = domaine principal lui-même
            return (
              <label key={sub} className="flex items-center gap-2 cursor-pointer group/item">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(sub)}
                  className="w-3.5 h-3.5 accent-primary flex-shrink-0 cursor-pointer"
                />
                <span className={`text-xs leading-tight transition-colors
                  ${checked
                    ? 'text-primary font-semibold'
                    : 'text-neutral-500 group-hover/item:text-neutral-800'}`}>
                  {isMainDomain ? <em>All articles in this domain</em> : sub}
                </span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ============================================================
export default function ArticlesPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [articles,    setArticles]    = useState([]);
  const [pagination,  setPagination]  = useState({ total: 0, pages: 1, page: 1 });
  const [loading,     setLoading]     = useState(true);
  const [searchInput, setSearchInput] = useState(searchParams.get('q') || '');
  const [search,      setSearch]      = useState(searchParams.get('q') || '');
  // domains = array of checked subdomains (multi-select)
  const [domains, setDomains] = useState(() => searchParams.getAll('domain') || []);

  const page = parseInt(searchParams.get('page') || '1');

  // Sync URL → state when URL changes (back/forward navigation)
  useEffect(() => {
    setDomains(searchParams.getAll('domain') || []);
    setSearch(searchParams.get('q') || '');
    setSearchInput(searchParams.get('q') || '');
  }, [searchParams]);

  const buildParams = useCallback((q, domList, p) => {
    const params = new URLSearchParams();
    if (q)       params.set('q', q);
    domList.forEach(d => params.append('domain', d));
    if (p > 1)   params.set('page', p);
    return params;
  }, []);

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    try {
      // Axios sérialise les tableaux en ?domain=A&domain=B avec paramsSerializer
      const params = { page, limit: 10 };
      if (search)         params.q      = search;
      if (domains.length) params.domain = domains;
      const res = await api.get('/articles', {
        params,
        paramsSerializer: p => {
          const sp = new URLSearchParams();
          Object.entries(p).forEach(([k, v]) => {
            if (Array.isArray(v)) v.forEach(item => sp.append(k, item));
            else sp.set(k, v);
          });
          return sp.toString();
        },
      });
      setArticles(res.data.articles || []);
      setPagination(res.data.pagination || { total: 0, pages: 1, page: 1 });
    } catch {
      setArticles([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, domains]);

  useEffect(() => { fetchArticles(); }, [fetchArticles]);

  const applySearch = (e) => {
    e.preventDefault();
    const q = searchInput.trim();
    setSearch(q);
    setSearchParams(buildParams(q, domains, 1));
  };

  const toggleDomain = (d) => {
    const newList = domains.includes(d)
      ? domains.filter(x => x !== d)
      : [...domains, d];
    setDomains(newList);
    setSearchParams(buildParams(search, newList, 1));
  };

  const goToPage = (p) => {
    setSearchParams(buildParams(search, domains, p));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearFilters = () => {
    setSearch('');
    setSearchInput('');
    setDomains([]);
    setSearchParams({});
  };

  const hasFilters = search || domains.length > 0;

  return (
    <Layout>

      {/* ── Bandeau page ──────────────────────────────────── */}
      <div className="bg-white border-b border-neutral-200">
        <div className="page-container py-6">

          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-xs text-neutral-400 mb-4">
            <Link to="/" className="hover:text-primary no-underline transition-colors">Home</Link>
            <span>›</span>
            <span className="text-neutral-600">Articles</span>
          </nav>

          <h1 className="text-xl font-bold text-neutral-800 mb-4">Published articles</h1>

          {/* Search bar — full width with integrated icon */}
          <form onSubmit={applySearch} className="relative w-full">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">
              <IconSearch />
            </span>
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Title, author, keywords, abstract…"
              className="w-full pl-9 pr-12 py-2.5 border border-neutral-300 rounded text-sm
                         focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary
                         bg-white text-neutral-800 placeholder:text-neutral-400"
            />
            <button type="submit" title="Search"
                    className="absolute right-0 top-0 h-full px-4 bg-primary text-white rounded-r
                               hover:bg-primary-600 transition-colors flex items-center justify-center">
              <IconSearch />
            </button>
          </form>
        </div>
      </div>

      {/* ── Corps : sidebar + liste ────────────────────────── */}
      <div className="bg-neutral-50">
        <div className="page-container py-6">
          <div className="flex gap-6 items-start">

            {/* ── Sidebar filtres ──────────────────────── */}
            <aside className="hidden lg:block w-60 flex-shrink-0 self-start sticky top-20">
              <div className="bg-white border border-neutral-200 rounded overflow-hidden">

                {/* Sidebar title */}
                <div className="px-4 py-3 bg-neutral-50 border-b border-neutral-200">
                  <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                    Filter by field
                  </p>
                </div>

                {/* Domain list — scrollable if too long */}
                <div className="px-4 py-2 max-h-[calc(100vh-14rem)] overflow-y-auto">
                  {DOMAIN_GROUPS.map(group => (
                    <DomainGroup
                      key={group.label}
                      group={group}
                      domains={domains}
                      onToggle={toggleDomain}
                    />
                  ))}
                </div>

                {/* Reset */}
                {domains.length > 0 && (
                  <div className="px-4 py-3 border-t border-neutral-100 bg-neutral-50">
                    <button onClick={() => { setDomains([]); setSearchParams(buildParams(search, [], 1)); }}
                            className="w-full text-xs text-error border border-error/30 rounded
                                       py-1.5 hover:bg-red-50 transition-colors">
                      Clear field filters ({domains.length})
                    </button>
                  </div>
                )}
              </div>
            </aside>

            {/* ── Zone résultats ───────────────────────── */}
            <div className="flex-1 min-w-0">

              {/* Barre résultats */}
              <div className="bg-white border border-neutral-200 rounded px-4 py-3 mb-4
                              flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-neutral-600">
                  {loading
                    ? 'Loading…'
                    : <><span className="font-semibold text-neutral-800">{pagination.total}</span>
                        {' '}result{pagination.total !== 1 ? 's' : ''}
                        {hasFilters && ' · active filters'}</>
                  }
                </p>

                {/* Chips filtres actifs */}
                {hasFilters && (
                  <div className="flex flex-wrap gap-2">
                    {search && (
                      <span className="inline-flex items-center gap-1 text-xs bg-primary-50
                                       text-primary border border-primary-200 rounded px-2.5 py-0.5 font-medium">
                        « {search} »
                        <button onClick={() => {
                          setSearch(''); setSearchInput('');
                          setSearchParams(buildParams('', domains, 1));
                        }} className="ml-1 font-bold hover:text-primary-700">×</button>
                      </span>
                    )}
                    {domains.map(d => (
                      <span key={d} className="inline-flex items-center gap-1 text-xs bg-accent-50
                                       text-accent border border-accent-100 rounded px-2.5 py-0.5 font-medium">
                        {d}
                        <button onClick={() => toggleDomain(d)}
                                className="ml-1 font-bold hover:text-accent-600">×</button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Filtres mobile (pills horizontales) */}
                <div className="flex flex-wrap gap-1.5 lg:hidden w-full pt-2 border-t border-neutral-100">
                  {DOMAIN_GROUPS.flatMap(g => g.subdomains).map(d => (
                    <button key={d} onClick={() => toggleDomain(d)}
                            className={`text-xs px-2.5 py-0.5 rounded border transition-colors
                              ${domains.includes(d)
                                ? 'bg-primary text-white border-primary'
                                : 'bg-white text-neutral-600 border-neutral-200 hover:border-primary hover:text-primary'
                              }`}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* Liste articles */}
              <div className="bg-white border border-neutral-200 rounded px-5"
                   style={{ transition: 'opacity 0.25s ease', opacity: loading ? 0.5 : 1 }}>
                {loading
                  ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                  : articles.length === 0
                    ? (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="text-4xl mb-4 opacity-40">📄</div>
                        <h3 className="text-base font-semibold text-neutral-700 mb-2">
                          No articles found
                        </h3>
                        <p className="text-sm text-neutral-500 max-w-sm mb-6">
                          {hasFilters
                            ? 'Try adjusting or resetting your filters.'
                            : 'No articles have been published in this journal yet.'}
                        </p>
                        {hasFilters && (
                          <button onClick={clearFilters}
                                  className="px-4 py-2 text-sm font-medium text-primary border
                                             border-primary rounded hover:bg-primary-50 transition-colors">
                            Reset filters
                          </button>
                        )}
                      </div>
                    )
                    : articles.map(a => <ArticleRow key={a.id} article={a} />)
                }
              </div>

              {/* Pagination */}
              {!loading && pagination.pages > 1 && (
                <div className="flex items-center justify-center gap-1 mt-6">
                  <button onClick={() => goToPage(page - 1)} disabled={page === 1}
                          className="px-3 py-1.5 text-sm border border-neutral-200 rounded bg-white
                                     text-neutral-600 hover:border-primary hover:text-primary
                                     disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                    ← Previous
                  </button>

                  {Array.from({ length: pagination.pages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === pagination.pages || Math.abs(p - page) <= 2)
                    .reduce((acc, p, idx, arr) => {
                      if (idx > 0 && p - arr[idx - 1] > 1) acc.push('…');
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((p, i) =>
                      p === '…'
                        ? <span key={`e${i}`} className="px-2 text-neutral-400 text-sm">…</span>
                        : (
                          <button key={p} onClick={() => goToPage(p)}
                                  className={`px-3 py-1.5 text-sm border rounded transition-colors
                                    ${p === page
                                      ? 'bg-primary text-white border-primary'
                                      : 'bg-white border-neutral-200 text-neutral-600 hover:border-primary hover:text-primary'
                                    }`}>
                            {p}
                          </button>
                        )
                    )}

                  <button onClick={() => goToPage(page + 1)} disabled={page === pagination.pages}
                          className="px-3 py-1.5 text-sm border border-neutral-200 rounded bg-white
                                     text-neutral-600 hover:border-primary hover:text-primary
                                     disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                    Next →
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
