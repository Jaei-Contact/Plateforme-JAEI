import { useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../components/layout/Layout';

// ============================================================
// Instructions aux auteurs — JAEI Platform
// ============================================================

const sections = [
  { id: 'scope',       label: 'Portée et domaines' },
  { id: 'types',       label: 'Types de publications' },
  { id: 'language',    label: 'Langue et style' },
  { id: 'formatting',  label: 'Mise en forme' },
  { id: 'figures',     label: 'Figures et tableaux' },
  { id: 'references',  label: 'Références bibliographiques' },
  { id: 'ethics',      label: 'Éthique et intégrité' },
];

const SectionTitle = ({ id, children }) => (
  <h2 id={id} className="text-lg font-bold mb-4 pb-2" style={{ color: '#1B4427', borderBottom: '2px solid #E5E7EB' }}>
    {children}
  </h2>
);

const Table = ({ headers, rows }) => (
  <div className="overflow-x-auto mb-4">
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr style={{ background: '#1B4427' }}>
          {headers.map(h => (
            <th key={h} className="px-4 py-2.5 text-left font-semibold" style={{ color: '#fff' }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
            {row.map((cell, j) => (
              <td key={j} className="px-4 py-2.5" style={{ color: '#374151' }}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const AuthorInstructions = () => {
  const [activeSection, setActiveSection] = useState('scope');

  const scrollTo = (id) => {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <Layout>

      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, #1B4427 0%, #1a5c35 60%, #1565a8 100%)', borderBottom: '3px solid #1E88C8' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <p className="text-xs font-medium mb-2 uppercase tracking-widest" style={{ color: '#4ade80' }}>
            Journal of Agricultural and Environmental Innovation
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold mb-3" style={{ color: '#fff' }}>
            Instructions aux auteurs
          </h1>
          <p className="text-base" style={{ color: 'rgba(255,255,255,0.75)', maxWidth: '600px' }}>
            Directives complètes pour la rédaction et la présentation de vos manuscrits.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex flex-col lg:flex-row gap-8">

          {/* Sommaire sticky */}
          <aside className="hidden lg:block w-56 flex-shrink-0">
            <div className="sticky top-24">
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#6B7280' }}>Sommaire</p>
              <nav className="space-y-1">
                {sections.map(s => (
                  <button key={s.id} onClick={() => scrollTo(s.id)}
                    className="w-full text-left px-3 py-2 text-sm rounded-sm transition-colors"
                    style={{
                      color: activeSection === s.id ? '#1B4427' : '#6B7280',
                      background: activeSection === s.id ? '#F0FDF4' : 'transparent',
                      fontWeight: activeSection === s.id ? 600 : 400,
                      borderLeft: activeSection === s.id ? '3px solid #1B4427' : '3px solid transparent',
                    }}>
                    {s.label}
                  </button>
                ))}
              </nav>
              <div className="mt-6 p-4 rounded-sm" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                <p className="text-xs font-semibold mb-2" style={{ color: '#1D4ED8' }}>Consulter aussi</p>
                <Link to="/guide-submission" className="block text-xs no-underline mb-1" style={{ color: '#1E88C8' }}>
                  Guide de soumission →
                </Link>
              </div>
            </div>
          </aside>

          {/* Article */}
          <article className="flex-1 min-w-0 bg-white rounded-sm px-8 py-8"
                   style={{ border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>

            {/* Portée */}
            <section id="scope" className="mb-10">
              <SectionTitle id="scope">Portée et domaines couverts</SectionTitle>
              <p className="text-sm mb-3" style={{ color: '#374151', lineHeight: '1.7' }}>
                JAEI publie des travaux originaux dans les domaines suivants :
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  'Agronomie et production végétale',
                  'Sciences du sol et fertilisation',
                  'Génétique et amélioration des plantes',
                  'Agroécologie et agriculture durable',
                  'Sciences de l\'environnement',
                  'Gestion des ressources en eau',
                  'Biotechnologies agricoles',
                  'Économie et politiques agricoles',
                  'Nutrition animale et zootechnie',
                  'Changement climatique et adaptation',
                ].map((d, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm px-3 py-2 rounded-sm"
                       style={{ background: '#F0FDF4', color: '#15803D', border: '1px solid #BBF7D0' }}>
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#15803D' }} />
                    {d}
                  </div>
                ))}
              </div>
            </section>

            {/* Types de publications */}
            <section id="types" className="mb-10">
              <SectionTitle id="types">Types de publications acceptés</SectionTitle>
              <Table
                headers={['Type', 'Description', 'Longueur']}
                rows={[
                  ['Article original', 'Résultats d\'une recherche expérimentale originale', '5 000 – 10 000 mots'],
                  ['Article de revue', 'Synthèse critique de la littérature sur un sujet', '8 000 – 15 000 mots'],
                  ['Communication courte', 'Résultats préliminaires ou note technique', '2 000 – 4 000 mots'],
                  ['Étude de cas', 'Analyse approfondie d\'un cas spécifique', '3 000 – 6 000 mots'],
                  ['Lettre à l\'éditeur', 'Commentaire sur un article publié', '500 – 1 000 mots'],
                ]}
              />
            </section>

            {/* Langue et style */}
            <section id="language" className="mb-10">
              <SectionTitle id="language">Langue et style rédactionnel</SectionTitle>
              <p className="text-sm mb-3" style={{ color: '#374151', lineHeight: '1.7' }}>
                Les manuscrits sont acceptés en <strong>français</strong> et en <strong>anglais</strong>.
                Le style doit être clair, précis et exempt de jargon inutile. Recommandations :
              </p>
              <ul className="space-y-2 text-sm" style={{ color: '#374151' }}>
                {[
                  'Voix active préférée à la voix passive',
                  'Phrases courtes et paragraphes bien délimités',
                  'Abréviations définies dès leur première occurrence',
                  'Unités SI obligatoires (ex. : kg/ha, mm, °C)',
                  'Noms scientifiques en italique et noms d\'auteurs en majuscules',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ background: '#1B4427' }} />
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            {/* Mise en forme */}
            <section id="formatting" className="mb-10">
              <SectionTitle id="formatting">Mise en forme du document</SectionTitle>
              <Table
                headers={['Élément', 'Spécification']}
                rows={[
                  ['Police', 'Times New Roman ou Arial, 12 pt'],
                  ['Interligne', '1,5 ou double'],
                  ['Marges', '2,5 cm sur tous les côtés'],
                  ['Numérotation', 'Pages numérotées en bas à droite'],
                  ['En-tête', 'Titre abrégé (max 50 caractères)'],
                  ['Format', 'PDF ou Word (.docx), taille max 10 Mo'],
                ]}
              />
            </section>

            {/* Figures et tableaux */}
            <section id="figures" className="mb-10">
              <SectionTitle id="figures">Figures et tableaux</SectionTitle>
              <p className="text-sm mb-3" style={{ color: '#374151', lineHeight: '1.7' }}>
                Les figures et tableaux doivent être numérotés séquentiellement (Figure 1, Tableau 1…)
                et accompagnés d'une légende explicite.
              </p>
              <ul className="space-y-2 text-sm" style={{ color: '#374151' }}>
                {[
                  'Résolution minimale des figures : 300 dpi (formats TIFF, PNG, EPS)',
                  'Tableaux en texte (pas d\'images de tableaux)',
                  'Légendes de figures sous la figure, légendes de tableaux au-dessus',
                  'Toutes les figures et données brutes disponibles sur demande',
                  'Pas de duplication entre figures et tableaux pour les mêmes données',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ background: '#1B4427' }} />
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            {/* Références */}
            <section id="references" className="mb-10">
              <SectionTitle id="references">Références bibliographiques</SectionTitle>
              <p className="text-sm mb-3" style={{ color: '#374151', lineHeight: '1.7' }}>
                JAEI utilise le style <strong>APA 7e édition</strong>.{' '}
                <a href="https://apastyle.apa.org/" target="_blank" rel="noopener noreferrer"
                   className="no-underline hover:underline font-medium"
                   style={{ color: '#1E88C8' }}>
                  Consulter le guide officiel APA →
                </a>
              </p>
              <div className="space-y-3">
                {[
                  { type: 'Article', example: 'Dupont, A., & Martin, B. (2023). Titre de l\'article. Journal Name, 12(3), 45–60. https://doi.org/10.xxxx' },
                  { type: 'Livre', example: 'Auteur, A. A. (2021). Titre du livre. Éditeur.' },
                  { type: 'Chapitre', example: 'Auteur, A. (2022). Titre du chapitre. In B. Éditeur (Éd.), Titre de l\'ouvrage (p. 10–30). Éditeur.' },
                ].map(({ type, example }) => (
                  <div key={type} className="p-3 rounded-sm" style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                    <p className="text-xs font-semibold mb-1" style={{ color: '#6B7280' }}>{type}</p>
                    <p className="text-xs font-mono" style={{ color: '#374151' }}>{example}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Éthique */}
            <section id="ethics" className="mb-4">
              <SectionTitle id="ethics">Éthique et intégrité scientifique</SectionTitle>
              <div className="p-4 rounded-sm mb-4" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
                <p className="text-sm font-semibold mb-1" style={{ color: '#B91C1C' }}>Politique anti-plagiat</p>
                <p className="text-sm" style={{ color: '#374151', lineHeight: '1.7' }}>
                  Tout manuscrit soumis fait l'objet d'une vérification de similarité. Un taux de similitude
                  supérieur à 20 % entraîne le rejet automatique sans évaluation par les pairs.
                </p>
              </div>
              <ul className="space-y-2 text-sm" style={{ color: '#374151' }}>
                {[
                  'Déclaration obligatoire des conflits d\'intérêts financiers ou non financiers',
                  'Approbation éthique requise pour toute expérimentation animale ou humaine',
                  'Consentement éclairé des participants (études impliquant des personnes)',
                  'Données brutes conservées au moins 5 ans après publication',
                  'Toute image modifiée doit être signalée dans la légende',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ background: '#B91C1C' }} />
                    {item}
                  </li>
                ))}
              </ul>
            </section>

          </article>
        </div>
      </div>

    </Layout>
  );
};

export default AuthorInstructions;
