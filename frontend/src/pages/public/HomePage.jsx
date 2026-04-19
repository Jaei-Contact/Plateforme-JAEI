import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import api from '../../utils/api';
import { useCountUp } from '../../hooks/useCountUp';
import RevealSection from '../../components/ui/RevealSection';

// ============================================================
// HomePage — Academic journal style / ScienceDirect
// ============================================================

const DOMAINS = [
  { label: 'Agronomy',                              icon: '🌾' },
  { label: 'Agroforestry',                          icon: '🌳' },
  { label: 'Ecology',                               icon: '🌿' },
  { label: 'Climate Change & Agriculture',          icon: '🌡️' },
  { label: 'Water Sciences',                        icon: '💧' },
  { label: 'Agricultural Economics',                icon: '📊' },
  { label: 'Agricultural Biotechnology',            icon: '🔬' },
  { label: 'Natural Resource Management',           icon: '♻️' },
];

const HOW_IT_WORKS = [
  {
    num: '1',
    title: 'Submit your manuscript',
    desc: 'Create an author account, complete the submission form, and upload your article as a PDF.',
    color: '#1B4427',
  },
  {
    num: '2',
    title: 'Peer review',
    desc: 'Your article is evaluated by at least one domain expert through a rigorous double-blind process.',
    color: '#1E88C8',
  },
  {
    num: '3',
    title: 'Open access publication',
    desc: 'Once accepted, your article is published immediately and accessible to the global scientific community.',
    color: '#2D7A4E',
  },
];

// ── Icons ─────────────────────────────────────────────────────
const IconSearch = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/>
  </svg>
);

const IconOpenAccess = () => (
  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd"
          d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
          clipRule="evenodd"/>
  </svg>
);

const IconArrow = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
  </svg>
);

// ── Recent article (ScienceDirect-style list) ────────────────
const RecentArticleRow = ({ article }) => {
  const abstract = article.abstract?.length > 200
    ? article.abstract.slice(0, 200) + '…'
    : article.abstract;

  const date = article.updated_at
    ? new Date(article.updated_at).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
      })
    : '';

  return (
    <div className="py-4 border-b border-neutral-200 last:border-0 transition-colors duration-200 hover:bg-neutral-50 px-1 -mx-1 rounded">
      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
        <span className="inline-flex items-center gap-1 text-xxs font-semibold text-success
                         bg-green-50 border border-green-200 rounded px-1.5 py-0.5 uppercase tracking-wide">
          <IconOpenAccess /> Open Access
        </span>
        {article.research_area && (
          <span className="text-xxs font-semibold uppercase tracking-wider text-accent
                           bg-accent-50 border border-accent-100 rounded px-2 py-0.5">
            {article.research_area}
          </span>
        )}
      </div>
      <Link to={`/articles/${article.id}`}
            className="block text-sm font-semibold text-primary leading-snug mb-1
                       hover:underline no-underline">
        {article.title}
      </Link>
      <p className="text-xs text-neutral-500 mb-1">
        {article.author_name}
        {article.co_authors && <span className="text-neutral-400">, {article.co_authors}</span>}
      </p>
      <p className="text-xs text-neutral-400 italic mb-2">
        JAEI &bull; {date}
      </p>
      {abstract && (
        <p className="text-xs text-neutral-600 leading-relaxed line-clamp-2">{abstract}</p>
      )}
    </div>
  );
};

// ── Skeleton ──────────────────────────────────────────────────
const SkeletonRow = () => (
  <div className="py-4 border-b border-neutral-200 last:border-0 animate-pulse">
    <div className="h-3 w-20 bg-neutral-200 rounded mb-2" />
    <div className="h-4 bg-neutral-200 rounded mb-1.5 w-4/5" />
    <div className="h-3 w-32 bg-neutral-100 rounded mb-1" />
    <div className="h-3 w-24 bg-neutral-100 rounded mb-2" />
    <div className="h-3 bg-neutral-100 rounded w-full" />
  </div>
);

// ── Stat with animated counter ────────────────────────────────
function StatItem({ value, label }) {
  const numVal = typeof value === 'number' ? value : parseInt(value, 10);
  const [count, ref] = useCountUp(isNaN(numVal) ? 0 : numVal);
  const display = isNaN(numVal) || value === undefined ? '—' : count;
  return (
    <div ref={ref} className="text-center px-2 sm:px-4 py-3 sm:py-4">
      <div className="text-lg sm:text-xl font-bold text-white mb-0.5">{display}</div>
      <div className="text-xxs text-primary-300 uppercase tracking-wide leading-tight">{label}</div>
    </div>
  );
}

function StatsBar({ stats }) {
  return (
    <div className="grid grid-cols-3 divide-x divide-primary-700/50">
      <StatItem value={stats?.articles} label="Published articles" />
      <StatItem value={stats?.authors}  label="Authors" />
      <StatItem value={stats?.domains}  label="Fields covered" />
    </div>
  );
}

// ============================================================
export default function HomePage() {
  const [stats,  setStats]  = useState(null);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/articles/stats').then(r => setStats(r.data)).catch(() => {});
    api.get('/articles', { params: { limit: 5, page: 1 } })
      .then(r => setRecent(r.data.articles || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    navigate(search.trim()
      ? `/articles?q=${encodeURIComponent(search.trim())}`
      : '/articles');
  };

  return (
    <Layout>

      {/* ══════════════════════════════════════════════════════
          HERO — Academic journal banner
      ══════════════════════════════════════════════════════ */}
      <section className="bg-primary-800 text-white">
        <div className="page-container py-12">

          {/* Title + description — centered */}
          <div className="text-center mb-8">
            <span className="inline-block text-xxs font-semibold uppercase tracking-widest
                             text-primary-200 mb-3 border-b border-primary-600 pb-1">
              Peer-reviewed scientific journal &bull; Open Access &bull; ISSN: to be defined
            </span>

            <h1 className="text-2xl md:text-3xl font-bold leading-tight mb-3 text-white">
              Journal of Agricultural and Environmental Innovation
            </h1>
            <p className="text-sm text-primary-200 leading-relaxed mx-auto max-w-xl">
              International journal dedicated to innovations in sustainable agriculture,
              environmental sciences and agro-technological development.
              Double-blind peer review — open access publication.
            </p>
          </div>

          {/* Search bar — full width of page-container */}
          <form onSubmit={handleSearch} className="relative w-full">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">
              <IconSearch />
            </span>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search for an article, an author, a keyword…"
              className="w-full pl-9 pr-12 py-2.5 bg-white border-0 rounded text-sm
                         text-neutral-800 focus:outline-none focus:ring-2 focus:ring-accent-300
                         placeholder:text-neutral-400"
            />
            <button type="submit" title="Search"
                    className="absolute right-0 top-0 h-full px-4 bg-accent text-white rounded-r
                               hover:bg-accent-600 transition-colors flex items-center justify-center">
              <IconSearch />
            </button>
          </form>

        </div>

        {/* Stats bar with animated counter */}
        <div className="bg-primary-900/50 border-t border-primary-700/50">
          <div className="page-container">
            <StatsBar stats={stats} />
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          BODY — 2-column layout (like ScienceDirect)
      ══════════════════════════════════════════════════════ */}
      <div className="bg-neutral-50">
        <div className="page-container py-8">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8 items-start">

            {/* ── Main column: recent publications ── */}
            <main>
              <div className="bg-white border border-neutral-200 rounded">

                {/* Section header */}
                <div className="px-5 py-4 border-b border-neutral-200 flex items-center justify-between">
                  <div>
                    <p className="text-xxs font-semibold uppercase tracking-widest text-accent mb-0.5">
                      Latest issues
                    </p>
                    <h2 className="text-base font-bold text-neutral-800">
                      Recent publications
                    </h2>
                  </div>
                  <Link to="/articles"
                        className="inline-flex items-center gap-1 text-xs font-medium text-primary
                                   hover:text-primary-700 no-underline transition-colors">
                    View all publications <IconArrow />
                  </Link>
                </div>

                {/* List */}
                <div className="px-5">
                  {loading
                    ? Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
                    : recent.length === 0
                      ? (
                        <div className="py-12 text-center">
                          <p className="text-sm text-neutral-500 mb-1">
                            No articles published yet.
                          </p>
                          <p className="text-xs text-neutral-400">
                            Accepted articles will appear here automatically.
                          </p>
                        </div>
                      )
                      : recent.map(a => <RecentArticleRow key={a.id} article={a} />)
                  }
                </div>

                {/* Section footer */}
                {!loading && recent.length > 0 && (
                  <div className="px-5 py-4 border-t border-neutral-100 bg-neutral-50">
                    <Link to="/articles"
                          className="text-xs font-semibold text-primary hover:text-primary-700
                                     no-underline inline-flex items-center gap-1">
                      Browse all publications <IconArrow />
                    </Link>
                  </div>
                )}
              </div>

              {/* ── Editorial process ───────────────────────── */}
              <div className="bg-white border border-neutral-200 rounded mt-6">
                <div className="px-5 py-4 border-b border-neutral-200">
                  <p className="text-xxs font-semibold uppercase tracking-widest text-accent mb-0.5">
                    Editorial process
                  </p>
                  <h2 className="text-base font-bold text-neutral-800">How to publish in JAEI?</h2>
                </div>
                <div className="divide-y divide-neutral-100">
                  {HOW_IT_WORKS.map((step, i) => (
                    <div key={i} className="px-5 py-4 flex items-start gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center
                                      justify-center text-white text-sm font-bold"
                           style={{ background: step.color }}>
                        {step.num}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-neutral-800 mb-0.5">{step.title}</p>
                        <p className="text-xs text-neutral-500 leading-relaxed">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-5 py-4 border-t border-neutral-100 bg-neutral-50">
                  <Link to="/register"
                        className="inline-flex items-center gap-2 px-5 py-2 bg-primary text-white
                                   text-sm font-semibold rounded hover:bg-primary-600 transition-colors
                                   no-underline">
                    Submit an article <IconArrow />
                  </Link>
                </div>
              </div>
            </main>

            {/* ── Sidebar ──────────────────────────────────── */}
            <RevealSection direction="left" delay={150} className="space-y-5">

              {/* Fields covered */}
              <div className="bg-white border border-neutral-200 rounded">
                <div className="px-4 py-3 border-b border-neutral-200">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-500">
                    Fields covered
                  </h3>
                </div>
                <div className="px-4 py-2">
                  {DOMAINS.map(d => (
                    <Link key={d.label}
                          to={`/articles?domain=${encodeURIComponent(d.label)}`}
                          className="flex items-center gap-2 py-2 border-b border-neutral-100
                                     last:border-0 text-xs text-neutral-600 hover:text-primary
                                     no-underline transition-colors group">
                      <span className="text-base leading-none">{d.icon}</span>
                      <span className="group-hover:underline">{d.label}</span>
                    </Link>
                  ))}
                </div>
                <div className="px-4 py-3 border-t border-neutral-100 bg-neutral-50">
                  <Link to="/articles"
                        className="text-xs font-semibold text-primary hover:text-primary-700
                                   no-underline inline-flex items-center gap-1">
                    All articles <IconArrow />
                  </Link>
                </div>
              </div>

              {/* About the journal */}
              <div className="bg-white border border-neutral-200 rounded">
                <div className="px-4 py-3 border-b border-neutral-200">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-500">
                    About JAEI
                  </h3>
                </div>
                <div className="px-4 py-4 space-y-3 text-xs text-neutral-600">
                  <p className="leading-relaxed">
                    <span className="font-semibold text-neutral-800">JAEI</span> is an international
                    peer-reviewed scientific journal published in open access.
                    It covers innovations in agriculture and environmental sciences.
                  </p>
                  <dl className="space-y-1.5">
                    <div className="flex justify-between">
                      <dt className="text-neutral-400">Review</dt>
                      <dd className="font-medium text-neutral-700 text-right">Double-blind</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-neutral-400">Access</dt>
                      <dd className="font-medium text-success">Open Access</dd>
                    </div>

                    <div className="flex justify-between">
                      <dt className="text-neutral-400">ISSN</dt>
                      <dd className="font-medium text-neutral-700">To be defined</dd>
                    </div>
                  </dl>
                </div>
                <div className="px-4 py-3 border-t border-neutral-100 bg-neutral-50">
                  <Link to="/about"
                        className="text-xs font-semibold text-primary hover:text-primary-700
                                   no-underline inline-flex items-center gap-1">
                    Learn more <IconArrow />
                  </Link>
                </div>
              </div>

              {/* CTA Authors */}
              <div className="rounded border border-primary-200 overflow-hidden">
                <div className="bg-primary-800 px-4 py-4 text-white">
                  <h3 className="text-sm font-bold mb-1 text-white">Are you a researcher?</h3>
                  <p className="text-xs text-white/80 leading-relaxed">
                    Submit your work to JAEI and contribute to the dissemination
                    of agricultural and environmental knowledge.
                  </p>
                </div>
                <div className="bg-white px-4 py-3 flex flex-col gap-2">
                  <Link to="/register"
                        className="block text-center px-4 py-2 bg-primary text-white text-xs
                                   font-semibold rounded hover:bg-primary-600 transition-colors
                                   no-underline">
                    Create an author account
                  </Link>
                  <Link to="/guide-submission"
                        className="block text-center px-4 py-2 border border-neutral-200 text-xs
                                   font-medium text-neutral-600 rounded hover:border-primary
                                   hover:text-primary transition-colors no-underline">
                    Submission guide
                  </Link>
                </div>
              </div>

              {/* Quick links */}
              <div className="bg-white border border-neutral-200 rounded">
                <div className="px-4 py-3 border-b border-neutral-200">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-500">
                    Useful links
                  </h3>
                </div>
                <div className="px-4 py-2">
                  {[
                    { label: 'Author guidelines',    path: '/author-instructions' },
                    { label: 'Editorial policy',     path: '/editorial-policy' },
                    { label: 'Review process',       path: '/review-process' },
                    { label: 'Editorial contact',    path: '/about' },
                  ].map(l => (
                    <Link key={l.path} to={l.path}
                          className="flex items-center justify-between py-2 border-b border-neutral-100
                                     last:border-0 text-xs text-neutral-600 hover:text-primary
                                     no-underline transition-colors group">
                      <span className="group-hover:underline">{l.label}</span>
                      <IconArrow />
                    </Link>
                  ))}
                </div>
              </div>
            </RevealSection>
          </div>
        </div>
      </div>

    </Layout>
  );
}
