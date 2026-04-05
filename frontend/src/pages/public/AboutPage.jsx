import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import api from '../../utils/api';

// ============================================================
// AboutPage — Style ScienceDirect / journal académique
// ============================================================

// Domaines officiels (schema.sql)
const DOMAIN_GROUPS = [
  {
    label: 'Agroécologie et Utilisation Durable des Terres',
    subdomains: [
      'Agronomie', 'Agroforesterie', 'Génétique des plantes',
      'Productions végétales', 'Sciences du sol', 'Phytopathologie',
      'Génie rural & Hydraulique', 'Développement rural',
    ],
  },
  {
    label: 'Sciences Animales et Aquatiques',
    subdomains: [
      'Aquaculture & Pêche', 'Nutrition animale', 'Productions animales',
      'Parasitologie vétérinaire', 'Zootechnie',
    ],
  },
  {
    label: 'Sciences Environnementales et Pollution',
    subdomains: [
      'Écologie', 'Environnement & Pollution',
      'Changement climatique & Agriculture', 'Foresterie',
      'Gestion des ressources naturelles', "Sciences de l'eau",
    ],
  },
  {
    label: 'Biotechnologie et Innovation Agricole',
    subdomains: [
      'Biotechnologie agricole', 'Microbiologie du sol', 'Économie agricole',
    ],
  },
];


const SECTIONS = [
  { id: 'mission',    label: 'Mission & Portée' },
  { id: 'domaines',   label: 'Domaines couverts' },
  { id: 'editorial',  label: 'Processus éditorial' },
  { id: 'comite',     label: 'Comité éditorial' },
  { id: 'acces',      label: 'Accès libre' },
  { id: 'soumission', label: 'Soumission' },
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

// ── Initiales pour l'avatar ───────────────────────────────────
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

      {/* ── Bandeau ──────────────────────────────────────────── */}
      <div className="bg-white border-b border-neutral-200">
        <div className="page-container py-6">
          <nav className="flex items-center gap-1.5 text-xs text-neutral-400 mb-4">
            <Link to="/" className="hover:text-primary no-underline transition-colors">Accueil</Link>
            <span>›</span>
            <span className="text-neutral-600">À propos</span>
          </nav>
          <h1 className="text-xl font-bold text-neutral-800 mb-1">À propos de JAEI</h1>
          <p className="text-sm text-neutral-500">Journal of Agricultural and Environmental Innovation</p>
        </div>
      </div>

      {/* ── Corps ────────────────────────────────────────────── */}
      <div className="bg-neutral-50">
        <div className="page-container py-8 pb-48">
          <div className="flex flex-col lg:flex-row gap-8 items-start">

            {/* ── Sidebar navigation ───────────────────────── */}
            <aside className="hidden lg:block w-52 flex-shrink-0 sticky top-20">
              <div className="bg-white border border-neutral-200 rounded overflow-hidden">
                <div className="px-4 py-3 bg-neutral-50 border-b border-neutral-200">
                  <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">Sommaire</p>
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

              {/* Info rapide */}
              <div className="mt-4 bg-white border border-neutral-200 rounded overflow-hidden">
                <div className="px-4 py-3 bg-neutral-50 border-b border-neutral-200">
                  <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">Informations</p>
                </div>
                <div className="px-4 py-3 space-y-2.5">
                  {[
                    { label: 'ISSN',        value: 'À définir' },
                    { label: 'Fondée',      value: '2026' },
                    { label: 'Périodicité', value: 'Continue' },
                    { label: 'Évaluation',  value: 'Double anonymat' },
                    { label: 'Accès',       value: 'Libre (Open Access)' },
                    { label: 'Langue',      value: 'Français / Anglais' },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-xxs uppercase tracking-wider text-neutral-400 font-semibold">{label}</p>
                      <p className="text-xs text-neutral-700 font-medium">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA Soumettre */}
              <div className="mt-4 rounded overflow-hidden"
                   style={{ background: 'linear-gradient(135deg,#1B4427,#1E88C8)' }}>
                <div className="px-4 py-4 text-white">
                  <p className="text-xs font-bold mb-1">Soumettre un article</p>
                  <p className="text-xxs text-white/80 mb-3 leading-relaxed">
                    Contribuez à l'avancement des sciences agricoles et environnementales.
                  </p>
                  <Link to="/register"
                        className="block text-center bg-white text-primary text-xs font-bold
                                   rounded px-3 py-1.5 no-underline hover:bg-neutral-50 transition-colors">
                    Créer un compte
                  </Link>
                </div>
              </div>
            </aside>

            {/* ── Contenu principal ────────────────────────── */}
            <main className="flex-1 min-w-0 space-y-8">

              {/* ① Mission & Portée */}
              <section id="mission" className="bg-white border border-neutral-200 rounded p-6 scroll-mt-24">
                <SectionTitle>Mission & Portée</SectionTitle>
                <p className="text-sm text-neutral-700 leading-relaxed mb-4">
                  Le <strong>Journal of Agricultural and Environmental Innovation (JAEI)</strong> est
                  une revue scientifique internationale à comité de lecture, publiée en accès libre.
                  Elle est consacrée à la diffusion de recherches originales et de revues de littérature
                  portant sur l'agriculture durable, les sciences environnementales et le développement agro-technologique.
                </p>
                <p className="text-sm text-neutral-700 leading-relaxed mb-4">
                  JAEI a pour ambition de constituer un espace d'échange rigoureux entre chercheurs,
                  praticiens et décideurs du monde agricole et environnemental, avec une attention
                  particulière aux contextes tropicaux et sub-sahariens.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                  {[
                    { icon: '🔬', title: 'Rigueur scientifique', desc: 'Évaluation par les pairs selon les standards internationaux les plus stricts.' },
                    { icon: '🌍', title: 'Portée internationale', desc: 'Articles publiés en français et en anglais, accessibles à la communauté mondiale.' },
                    { icon: '🔓', title: 'Accès libre', desc: 'Toutes les publications sont librement accessibles sans abonnement.' },
                  ].map(({ icon, title, desc }) => (
                    <div key={title} className="rounded border border-neutral-100 p-4 bg-neutral-50">
                      <div className="text-2xl mb-2">{icon}</div>
                      <h3 className="text-sm font-bold text-neutral-800 mb-1">{title}</h3>
                      <p className="text-xs text-neutral-600 leading-relaxed">{desc}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* ② Domaines couverts */}
              <section id="domaines" className="bg-white border border-neutral-200 rounded p-6 scroll-mt-24">
                <SectionTitle>Domaines couverts</SectionTitle>
                <p className="text-sm text-neutral-600 mb-5 leading-relaxed">
                  JAEI couvre quatre grands domaines thématiques, chacun subdivisé en spécialités
                  permettant une indexation précise des articles.
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

              {/* ③ Processus éditorial */}
              <section id="editorial" className="bg-white border border-neutral-200 rounded p-6 scroll-mt-24">
                <SectionTitle>Processus éditorial</SectionTitle>
                <p className="text-sm text-neutral-600 mb-6 leading-relaxed">
                  JAEI applique un processus d'évaluation en <strong>double anonymat</strong> :
                  l'identité des auteurs est masquée aux évaluateurs et réciproquement.
                </p>
                <div className="relative">
                  <div className="absolute left-5 top-5 bottom-5 w-0.5 bg-neutral-100" />
                  <div className="space-y-6">
                    {[
                      { num:'1', title:'Soumission',                desc:"L'auteur soumet son manuscrit via la plateforme en ligne. Un accusé de réception est envoyé automatiquement.", delay:'' },
                      { num:'2', title:'Vérification éditoriale',   desc:"L'équipe éditoriale vérifie la conformité du manuscrit (format, périmètre thématique, originalité).", delay:'1–3 jours' },
                      { num:'3', title:"Assignation d'évaluateurs", desc:"Le rédacteur en chef assigne au moins un expert du domaine pour évaluer l'article en double anonymat.", delay:'3–7 jours' },
                      { num:'4', title:'Évaluation par les pairs',  desc:"Les évaluateurs analysent le manuscrit et formulent une recommandation : accepter, révisions mineures, majeures, ou rejeter.", delay:'2–4 semaines' },
                      { num:'5', title:'Décision éditoriale',       desc:"Sur la base des rapports d'évaluation, le rédacteur en chef prend la décision finale et la notifie à l'auteur.", delay:'1–3 jours' },
                      { num:'6', title:'Publication',               desc:"L'article accepté est mis en ligne immédiatement et accessible librement à la communauté scientifique.", delay:'24–48 h' },
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

              {/* ④ Comité éditorial */}
              <section id="comite" className="bg-white border border-neutral-200 rounded p-6 scroll-mt-24">
                <SectionTitle>Comité éditorial</SectionTitle>

                {boardLoading ? (
                  <div className="flex items-center gap-3 py-6 text-sm text-neutral-400">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Chargement…
                  </div>
                ) : boardGroups.length === 0 ? (
                  <div className="py-8 text-center rounded border border-neutral-100 bg-neutral-50">
                    <p className="text-sm text-neutral-500">
                      La composition du comité éditorial sera annoncée lors du lancement officiel de la revue.
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

              {/* ⑤ Politique d'accès libre */}
              <section id="acces" className="bg-white border border-neutral-200 rounded p-6 scroll-mt-24">
                <SectionTitle>Politique d'accès libre</SectionTitle>
                <div className="flex items-start gap-4 mb-5 p-4 rounded border border-green-200 bg-green-50">
                  <span className="text-2xl flex-shrink-0">🔓</span>
                  <div>
                    <p className="text-sm font-bold text-green-800 mb-1">
                      JAEI est une revue entièrement en accès libre (Open Access)
                    </p>
                    <p className="text-xs text-green-700 leading-relaxed">
                      Tous les articles publiés dans JAEI sont accessibles gratuitement et immédiatement
                      à tous les lecteurs, sans abonnement ni barrière financière.
                    </p>
                  </div>
                </div>
                <div className="space-y-3 text-sm text-neutral-700 leading-relaxed">
                  <p>
                    Conformément aux principes de la <strong>Budapest Open Access Initiative</strong>,
                    JAEI garantit la libre distribution, reproduction et utilisation des articles
                    publiés, à condition que les auteurs soient correctement cités.
                  </p>
                  <p>
                    Les articles sont publiés sous licence <strong>Creative Commons CC BY 4.0</strong>,
                    permettant une réutilisation libre avec attribution.
                  </p>
                </div>
              </section>

              {/* ⑥ Instructions aux auteurs */}
              <section id="soumission" className="bg-white border border-neutral-200 rounded p-6 scroll-mt-24">
                <SectionTitle>Instructions aux auteurs</SectionTitle>
                <div className="space-y-4">
                  {[
                    {
                      title: 'Types de contributions acceptées',
                      items: ['Articles de recherche originaux','Revues de littérature systématiques','Notes de recherche et communications courtes',"Études de cas et retours d'expérience terrain"],
                    },
                    {
                      title: 'Format du manuscrit',
                      items: ['Fichier PDF ou Word (.docx)','Police Times New Roman 12pt, interligne 1.5','Résumé de 150–250 mots en français et en anglais','5 à 8 mots-clés pertinents'],
                      itemsExtra: [{ label: 'Références au format APA 7e édition', href: 'https://apastyle.apa.org/', linkLabel: 'Voir le guide officiel APA →' }],
                    },
                    {
                      title: 'Exigences éthiques',
                      items: ['Le manuscrit doit être original et non soumis ailleurs',"Les conflits d'intérêts doivent être déclarés",'Les données sources doivent être disponibles sur demande',"L'approbation éthique doit être mentionnée si applicable"],
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
                    Soumettre un article
                  </Link>
                  <Link to="/articles"
                        className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold
                                   text-primary border border-primary rounded no-underline hover:bg-primary-50 transition-colors">
                    Parcourir les articles
                  </Link>
                </div>
              </section>

              {/* ⑦ Contact */}
              <section id="contact" className="bg-white border border-neutral-200 rounded p-6 scroll-mt-24">
                <SectionTitle>Contact</SectionTitle>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { icon:'✉️', title:'Rédaction',        desc:'Pour toute question relative aux soumissions, évaluations ou décisions éditoriales.', value:'redaction@jaei-journal.org' },
                    { icon:'🛠️', title:'Support technique', desc:"Pour les problèmes de connexion, de soumission ou d'accès à la plateforme.",         value:'support@jaei-journal.org' },
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
