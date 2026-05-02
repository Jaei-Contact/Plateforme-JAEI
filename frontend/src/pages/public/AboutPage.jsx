import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import api from '../../utils/api';

// ============================================================
// AboutPage — ScienceDirect / academic journal style
// ============================================================

// Official domains (schema.sql)
const DOMAIN_GROUPS = [
  {
    label: 'Agroecology and Sustainable Land Use',
    subdomains: [
      'Agroforestry systems',
      'Soil science and fertility management',
      'Forest ecology and wildlife conservation',
      'Carbon and nitrogen cycling in terrestrial ecosystems',
      'Soil–plant interactions and nutrient dynamics',
    ],
  },
  {
    label: 'Animal and Aquatic Sciences',
    subdomains: [
      'Animal nutrition and feed science',
      'Ruminant physiology and enteric methane mitigation',
      'Gut microbiota in animals and humans',
      'Sustainable aquaculture and fisheries management',
      'Aquatic animal health, immunology, and disease control',
      'Marine biotechnology and algal cultivation',
      'Post-harvest processing of aquatic and agricultural products',
      'Food safety and quality assurance',
      'Nutritional biochemistry',
    ],
  },
  {
    label: 'Environmental Science and Pollution Control',
    subdomains: [
      'Water and soil pollution monitoring and remediation',
      'Bioremediation technologies',
      'Advanced oxidation processes (photocatalysis)',
      'Circular economy and coastal resource governance',
    ],
  },
  {
    label: 'Biotechnology and Biochemistry',
    subdomains: [
      'Plant and fruit tree biotechnology',
      'Carbohydrate chemistry and metabolism',
      'Microbial cell culture and in vitro fermentation techniques',
    ],
  },
  {
    label: 'Socio-Economic and Policy Dimensions of Natural Resource Use',
    subdomains: [
      'Socio-economic surveys in livestock and fisheries systems',
      'Community-based natural resource management',
      'Policy and governance in agriculture, forestry, and fisheries',
    ],
  },
  {
    label: 'Interdisciplinary and Emerging Areas',
    subdomains: [
      'One health (animal, human, and environmental health)',
      'Climate-smart agriculture and mitigation strategies',
      'Methane reduction and carbon sequestration',
    ],
  },
  {
    label: 'Language, Communication, and Knowledge Translation',
    subdomains: [
      'Scientific communication in multilingual contexts',
      'Translation of environmental and agricultural knowledge',
      'Cognitive and cultural aspects of technical translation',
    ],
  },
];


const SECTIONS = [
  { id: 'mission',    label: 'Mission & Scope' },
  { id: 'domaines',   label: 'Fields covered' },
  { id: 'editorial',  label: 'Editorial process' },
  { id: 'comite',     label: 'Editorial board' },
  { id: 'acces',      label: 'Open access' },
  { id: 'soumission', label: 'Submission' },
  { id: 'contact',    label: 'Contact' },
];

const scrollTo = (id) => {
  const el = document.getElementById(id);
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY - 88;
  window.scrollTo({ top, behavior: 'smooth' });
};

const SectionTitle = ({ children }) => (
  <h2 className="text-lg font-bold mb-4 pb-2 text-neutral-800"
      style={{ borderBottom: '2px solid #1B4427' }}>
    {children}
  </h2>
);

// ── Initials for avatar ───────────────────────────────────────
const initials = (name) => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

// ============================================================
export default function AboutPage() {
  const [activeId, setActiveId]       = useState('mission');
  const [boardGroups, setBoardGroups] = useState([]);
  const [boardLoading, setBoardLoading] = useState(true);

  useEffect(() => {
    api.get('/editorial-board')
      .then(({ data }) => setBoardGroups(data.data))
      .catch(() => setBoardGroups([]))
      .finally(() => setBoardLoading(false));
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) setActiveId(visible[0].target.id);
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0 }
    );

    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    const onScroll = () => {
      const nearBottom =
        window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 40;
      if (nearBottom) setActiveId(SECTIONS[SECTIONS.length - 1].id);
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  return (
    <Layout>

      {/* ── Banner ───────────────────────────────────────────── */}
      <div className="bg-white border-b border-neutral-200">
        <div className="page-container py-6">
          <nav className="flex items-center gap-1.5 text-xs text-neutral-400 mb-4">
            <Link to="/" className="hover:text-primary no-underline transition-colors">Home</Link>
            <span>›</span>
            <span className="text-neutral-600">About</span>
          </nav>
          <h1 className="text-xl font-bold text-neutral-800 mb-1">About JAEI</h1>
          <p className="text-sm text-neutral-500">Journal of Agricultural and Environmental Innovation</p>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────── */}
      <div className="bg-neutral-50">
        <div className="page-container py-8 pb-48">
          <div className="flex flex-col lg:flex-row gap-8 items-start">

            {/* ── Sidebar navigation ───────────────────────── */}
            <aside className="hidden lg:block w-52 flex-shrink-0 sticky top-20">
              <div className="bg-white border border-neutral-200 rounded overflow-hidden">
                <div className="px-4 py-3 bg-neutral-50 border-b border-neutral-200">
                  <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">Contents</p>
                </div>
                <nav className="py-2">
                  {SECTIONS.map(s => {
                    const isActive = activeId === s.id;
                    return (
                      <button key={s.id} onClick={() => scrollTo(s.id)}
                              className="w-full text-left px-4 py-2 text-xs transition-colors flex items-center gap-2"
                              style={{
                                color:      isActive ? '#1B4427' : '#555555',
                                background: isActive ? '#EEF5F1' : 'transparent',
                                fontWeight: isActive ? 600 : 400,
                                borderLeft: isActive ? '3px solid #1B4427' : '3px solid transparent',
                              }}>
                        {s.label}
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Quick info */}
              <div className="mt-4 bg-white border border-neutral-200 rounded overflow-hidden">
                <div className="px-4 py-3 bg-neutral-50 border-b border-neutral-200">
                  <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">Information</p>
                </div>
                <div className="px-4 py-3 space-y-2.5">
                  {[
                    { label: 'ISSN',        value: 'To be defined' },
                    { label: 'Founded',     value: 'Oct 22, 2025' },
                    { label: 'Frequency',   value: '4 issues / year' },
                    { label: 'Review',      value: 'Double-blind' },
                    { label: 'Access',      value: 'Open Access' },
                    { label: 'APC',         value: '$180 / 100 000 FCFA' },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-xxs uppercase tracking-wider text-neutral-400 font-semibold">{label}</p>
                      <p className="text-xs text-neutral-700 font-medium">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA Submit */}
              <div className="mt-4 rounded overflow-hidden"
                   style={{ background: 'linear-gradient(135deg,#1B4427,#1E88C8)' }}>
                <div className="px-4 py-4 text-white">
                  <p className="text-xs font-bold mb-1">Submit an article</p>
                  <p className="text-xxs text-white/80 mb-3 leading-relaxed">
                    Contribute to the advancement of agricultural and environmental sciences.
                  </p>
                  <Link to="/register"
                        className="block text-center bg-white text-primary text-xs font-bold
                                   rounded px-3 py-1.5 no-underline hover:bg-neutral-50 transition-colors">
                    Create an account
                  </Link>
                </div>
              </div>
            </aside>

            {/* ── Main content ─────────────────────────────── */}
            <main className="flex-1 min-w-0 space-y-8">

              {/* ① Mission & Scope */}
              <section id="mission" className="bg-white border border-neutral-200 rounded p-6 scroll-mt-24">
                <SectionTitle>Mission & Scope</SectionTitle>
                <p className="text-sm text-neutral-700 leading-relaxed mb-4">
                  The <strong>Journal of Agricultural and Environmental Innovation (JAEI)</strong> is
                  an international peer-reviewed scientific journal published in open access.
                  It is dedicated to disseminating original research and literature reviews
                  on sustainable agriculture, environmental sciences and agro-technological development.
                </p>
                <p className="text-sm text-neutral-700 leading-relaxed mb-4">
                  JAEI aims to be a rigorous forum for exchange among researchers,
                  practitioners and decision-makers in the agricultural and environmental world, with particular
                  attention to tropical and sub-Saharan contexts.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                  {[
                    { icon: '🔬', title: 'Scientific rigor', desc: 'Peer evaluation according to the strictest international standards.' },
                    { icon: '🌍', title: 'International reach', desc: 'Articles published in French and English, accessible to the global community.' },
                    { icon: '🔓', title: 'Open access', desc: 'All publications are freely accessible without a subscription.' },
                  ].map(({ icon, title, desc }) => (
                    <div key={title} className="rounded border border-neutral-100 p-4 bg-neutral-50">
                      <div className="text-2xl mb-2">{icon}</div>
                      <h3 className="text-sm font-bold text-neutral-800 mb-1">{title}</h3>
                      <p className="text-xs text-neutral-600 leading-relaxed">{desc}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* ② Fields covered */}
              <section id="domaines" className="bg-white border border-neutral-200 rounded p-6 scroll-mt-24">
                <SectionTitle>Fields covered</SectionTitle>
                <p className="text-sm text-neutral-600 mb-5 leading-relaxed">
                  JAEI covers seven major thematic domains, each subdivided into specialties
                  enabling precise indexing of articles.
                </p>
                <div className="space-y-4">
                  {DOMAIN_GROUPS.map((group, gi) => (
                    <div key={gi} className="border border-neutral-200 rounded overflow-hidden">
                      <div className="px-4 py-3 flex items-center gap-3"
                           style={{ background: '#F0FDF4', borderBottom: '1px solid #D1FAE5' }}>
                        <span className="w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center text-white flex-shrink-0"
                              style={{ background: '#1B4427' }}>
                          {gi + 1}
                        </span>
                        <h3 className="text-sm font-bold text-neutral-800">{group.label}</h3>
                      </div>
                      <div className="px-4 py-3 flex flex-wrap gap-2">
                        {group.subdomains.map(s => (
                          <Link key={s} to={`/articles?domain=${encodeURIComponent(s)}`}
                                className="text-xs px-2.5 py-1 rounded border border-neutral-200
                                           bg-white text-neutral-600 hover:border-primary hover:text-primary
                                           no-underline transition-colors">
                            {s}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* ③ Editorial process */}
              <section id="editorial" className="bg-white border border-neutral-200 rounded p-6 scroll-mt-24">
                <SectionTitle>Editorial process</SectionTitle>
                <p className="text-sm text-neutral-600 mb-6 leading-relaxed">
                  JAEI applies a <strong>double-blind</strong> review process:
                  the identity of authors is concealed from reviewers and vice versa.
                </p>
                <div className="relative">
                  <div className="absolute left-5 top-5 bottom-5 w-0.5 bg-neutral-100" />
                  <div className="space-y-6">
                    {[
                      { num:'1', title:'Submission',               desc:'The author submits their manuscript via the online platform. An automated acknowledgement of receipt is sent immediately.', delay:'' },
                      { num:'2', title:'Editorial check',          desc:'The editorial team verifies manuscript compliance: format, thematic scope, originality, and ethical requirements. A first decision is communicated within 5 working days.', delay:'≤ 5 days' },
                      { num:'3', title:'Reviewer assignment',      desc:'The editor-in-chief assigns at least two domain experts to evaluate the article under double-blind peer-review conditions.', delay:'' },
                      { num:'4', title:'Peer review',              desc:'Reviewers analyse the manuscript and formulate a recommendation: accept, minor revisions, major revisions, or reject. Authors may be invited to revise and resubmit.', delay:'~30 days (round 1)' },
                      { num:'5', title:'Editorial decision',       desc:'Based on the review reports, the editor-in-chief makes the final acceptance decision. The average time from submission to acceptance is 45 days.', delay:'≤ 45 days' },
                      { num:'6', title:'Publication',              desc:'The accepted article is published online immediately in continuous mode and freely accessible to the global scientific community.', delay:'24–48 h' },
                    ].map(({ num, title, desc, delay }) => (
                      <div key={num} className="flex gap-4 pl-1">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 z-10"
                             style={{ background: num === '6' ? '#1E88C8' : '#1B4427' }}>
                          {num}
                        </div>
                        <div className="flex-1 pt-0.5">
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="text-sm font-bold text-neutral-800">{title}</h3>
                            {delay && (
                              <span className="text-xxs px-2 py-0.5 rounded-full font-medium bg-neutral-100 text-neutral-500 border border-neutral-200">
                                {delay}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-neutral-600 leading-relaxed">{desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* ④ Editorial board */}
              <section id="comite" className="bg-white border border-neutral-200 rounded p-6 scroll-mt-24">
                <SectionTitle>Editorial board</SectionTitle>

                {boardLoading ? (
                  <div className="flex items-center gap-3 py-6 text-sm text-neutral-400">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Loading…
                  </div>
                ) : boardGroups.length === 0 ? (
                  <div className="py-8 text-center rounded border border-neutral-100 bg-neutral-50">
                    <p className="text-sm text-neutral-500">
                      The composition of the editorial board will be announced at the official launch of the journal.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {boardGroups.map(({ role, members }) => (
                      <div key={role}>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">{role}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {members.map((member) => (
                            <div key={member.id}
                                 className="flex items-start gap-3 p-3 rounded border border-neutral-100 bg-neutral-50">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                                   style={{ background: '#1B4427' }}>
                                {initials(member.name)}
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-neutral-800">{member.name}</p>
                                {member.affiliation && (
                                  <p className="text-xxs text-neutral-500">{member.affiliation}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* ⑤ Open access policy */}
              <section id="acces" className="bg-white border border-neutral-200 rounded p-6 scroll-mt-24">
                <SectionTitle>Open access policy</SectionTitle>
                <div className="flex items-start gap-4 mb-5 p-4 rounded border border-green-200 bg-green-50">
                  <span className="text-2xl flex-shrink-0">🔓</span>
                  <div>
                    <p className="text-sm font-bold text-green-800 mb-1">
                      JAEI is a fully open access journal
                    </p>
                    <p className="text-xs text-green-700 leading-relaxed">
                      All articles published in JAEI are freely and immediately accessible
                      to all readers, without subscription or financial barrier.
                    </p>
                  </div>
                </div>
                <div className="space-y-3 text-sm text-neutral-700 leading-relaxed">
                  <p>
                    In accordance with the principles of the <strong>Budapest Open Access Initiative</strong>,
                    JAEI guarantees the free distribution, reproduction and use of published articles,
                    provided that authors are correctly cited.
                  </p>
                  <p>
                    Articles are published under a <strong>Creative Commons CC BY 4.0</strong> licence,
                    allowing free reuse with attribution.
                  </p>
                </div>

                {/* APC */}
                <div className="mt-5 rounded border border-neutral-200 overflow-hidden">
                  <div className="px-4 py-3 bg-neutral-50 border-b border-neutral-200">
                    <p className="text-sm font-bold text-neutral-800">Article Processing Charge (APC)</p>
                  </div>
                  <div className="px-4 py-4">
                    <p className="text-xs text-neutral-600 leading-relaxed mb-4">
                      To cover editorial and publishing costs, JAEI charges a one-time Article Processing Charge
                      upon acceptance. There is no submission fee.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      {[
                        { currency: 'USD', amount: '$180', flag: '🌍' },
                        { currency: 'FCFA', amount: '100 000 FCFA', flag: '🌍' },
                        { currency: 'RMB', amount: '¥1 300', flag: '🇨🇳' },
                      ].map(({ currency, amount, flag }) => (
                        <div key={currency}
                             className="flex-1 min-w-[120px] text-center rounded border border-neutral-200 px-4 py-3 bg-white">
                          <p className="text-base font-bold" style={{ color: '#1B4427' }}>{amount}</p>
                          <p className="text-xs text-neutral-500 mt-0.5">{currency}</p>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-neutral-400 mt-3">
                      Waivers may be granted to authors from low-income countries upon request.
                    </p>
                  </div>
                </div>
              </section>

              {/* ⑥ Author guidelines */}
              <section id="soumission" className="bg-white border border-neutral-200 rounded p-6 scroll-mt-24">
                <SectionTitle>Author guidelines</SectionTitle>
                <div className="space-y-4">
                  {[
                    {
                      title: 'Accepted types of contributions',
                      items: [
                        'Original Research Papers / Articles',
                        'Review & Mini Reviews',
                        'Brief Communication / Short Communications',
                        'Registered Reports',
                        'Perspectives, Opinions & Correspondence',
                        'Letters to the Editor / Short Comments',
                        'Technical Advances / Technical Notes',
                        'Analysis, Feature & Special Issues',
                      ],
                    },
                    {
                      title: 'Manuscript format',
                      items: ['PDF or Word (.docx) file, max 10 MB','Times New Roman or Arial, 12 pt, 1.5 or double line spacing','Abstract of 250 words maximum in English and/or French','4 to 7 relevant keywords (no acronyms)'],
                      itemsExtra: [{ label: 'References in JAEI author-year style', href: '/author-instructions#references', linkLabel: 'See the reference guide →' }],
                    },
                    {
                      title: 'Ethical requirements',
                      items: ['The manuscript must be original and not submitted elsewhere','Conflicts of interest must be declared','Source data must be available upon request','Ethical approval must be mentioned if applicable'],
                    },
                  ].map(({ title, items, itemsExtra }) => (
                    <div key={title}>
                      <h3 className="text-sm font-semibold text-neutral-800 mb-2">{title}</h3>
                      <ul className="space-y-1">
                        {items.map(item => (
                          <li key={item} className="flex items-start gap-2 text-xs text-neutral-600">
                            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5" style={{ background: '#1B4427' }} />
                            {item}
                          </li>
                        ))}
                        {itemsExtra?.map(({ label, href, linkLabel }) => (
                          <li key={label} className="flex items-start gap-2 text-xs text-neutral-600">
                            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5" style={{ background: '#1B4427' }} />
                            <span>
                              {label}{' '}
                              <a href={href} target="_blank" rel="noopener noreferrer"
                                 className="no-underline hover:underline font-medium"
                                 style={{ color: '#1E88C8' }}>
                                {linkLabel}
                              </a>
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link to="/register"
                        className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold
                                   text-white rounded no-underline transition-opacity hover:opacity-90"
                        style={{ background: 'linear-gradient(90deg,#1B4427,#1E88C8)' }}>
                    Submit an article
                  </Link>
                  <Link to="/articles"
                        className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold
                                   text-primary border border-primary rounded no-underline hover:bg-primary-50 transition-colors">
                    Browse articles
                  </Link>
                </div>
              </section>

              {/* ⑦ Contact */}
              <section id="contact" className="bg-white border border-neutral-200 rounded p-6 scroll-mt-24">
                <SectionTitle>Contact</SectionTitle>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { icon:'✉️', title:'Editorial office',    desc:'For any questions regarding submissions, reviews or editorial decisions.', value:'contact@jaei-journal.org' },
                    { icon:'🛠️', title:'Technical support',   desc:'For login issues, submission problems or platform access.',               value:'contact@jaei-journal.org' },
                  ].map(({ icon, title, desc, value }) => (
                    <div key={title} className="p-4 rounded border border-neutral-200 bg-neutral-50">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">{icon}</span>
                        <h3 className="text-sm font-bold text-neutral-800">{title}</h3>
                      </div>
                      <p className="text-xs text-neutral-500 mb-3 leading-relaxed">{desc}</p>
                      <a href={`mailto:${value}`} className="text-xs font-semibold text-primary no-underline hover:underline">
                        {value}
                      </a>
                    </div>
                  ))}
                </div>
              </section>

            </main>
          </div>
        </div>
      </div>
    </Layout>
  );
}
