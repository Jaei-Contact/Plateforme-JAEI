import { useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../components/layout/Layout';

// ============================================================
// Guide de soumission — JAEI Platform
// ============================================================

const sections = [
  { id: 'eligibility',   label: 'Critères d\'éligibilité' },
  { id: 'preparation',   label: 'Préparation du manuscrit' },
  { id: 'format',        label: 'Format et structure' },
  { id: 'submission',    label: 'Processus de soumission' },
  { id: 'review',        label: 'Évaluation par les pairs' },
  { id: 'fees',          label: 'Frais de publication' },
];

const Step = ({ number, title, children }) => (
  <div className="flex gap-4 mb-6">
    <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5"
         style={{ background: '#1B4427', color: '#fff' }}>
      {number}
    </div>
    <div>
      <h4 className="text-sm font-semibold mb-1" style={{ color: '#111827' }}>{title}</h4>
      <div className="text-sm" style={{ color: '#374151', lineHeight: '1.7' }}>{children}</div>
    </div>
  </div>
);

const SectionTitle = ({ id, children }) => (
  <h2 id={id} className="text-lg font-bold mb-4 pb-2" style={{ color: '#1B4427', borderBottom: '2px solid #E5E7EB' }}>
    {children}
  </h2>
);

const GuideSubmission = () => {
  const [activeSection, setActiveSection] = useState('eligibility');

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
            Guide de soumission
          </h1>
          <p className="text-base" style={{ color: 'rgba(255,255,255,0.75)', maxWidth: '600px' }}>
            Tout ce que vous devez savoir pour soumettre votre manuscrit à JAEI avec succès.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex flex-col lg:flex-row gap-8">

          {/* Sidebar sommaire — sticky */}
          <aside className="hidden lg:block w-56 flex-shrink-0">
            <div className="sticky top-24">
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#6B7280' }}>
                Sommaire
              </p>
              <nav className="space-y-1">
                {sections.map(s => (
                  <button
                    key={s.id}
                    onClick={() => scrollTo(s.id)}
                    className="w-full text-left px-3 py-2 text-sm rounded-sm transition-colors"
                    style={{
                      color: activeSection === s.id ? '#1B4427' : '#6B7280',
                      background: activeSection === s.id ? '#F0FDF4' : 'transparent',
                      fontWeight: activeSection === s.id ? 600 : 400,
                      borderLeft: activeSection === s.id ? '3px solid #1B4427' : '3px solid transparent',
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </nav>

              <div className="mt-6 p-4 rounded-sm" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                <p className="text-xs font-semibold mb-2" style={{ color: '#1D4ED8' }}>Prêt à soumettre ?</p>
                <Link to="/author/submit"
                      className="block text-center px-3 py-2 rounded-sm text-xs font-semibold no-underline"
                      style={{ background: '#1E88C8', color: '#fff' }}>
                  Soumettre un article
                </Link>
              </div>
            </div>
          </aside>

          {/* Article */}
          <article className="flex-1 min-w-0 bg-white rounded-sm px-8 py-8"
                   style={{ border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>

            {/* Critères d'éligibilité */}
            <section id="eligibility" className="mb-10">
              <SectionTitle id="eligibility">Critères d'éligibilité</SectionTitle>
              <p className="text-sm mb-4" style={{ color: '#374151', lineHeight: '1.7' }}>
                JAEI accepte les travaux originaux portant sur l'agriculture durable, les sciences environnementales
                et les innovations agronomiques. Avant de soumettre, assurez-vous que votre manuscrit respecte les critères suivants :
              </p>
              <ul className="space-y-2 text-sm" style={{ color: '#374151' }}>
                {[
                  'Le travail est original et n\'a pas été publié ou soumis ailleurs simultanément',
                  'Le contenu relève des domaines couverts par JAEI (agronomie, environnement, biotechnologies végétales…)',
                  'Tous les auteurs ont approuvé la soumission et déclaré leurs conflits d\'intérêts',
                  'Les données expérimentales sont disponibles sur demande',
                  'Les autorisations éthiques requises ont été obtenues',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ background: '#1B4427' }} />
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            {/* Préparation du manuscrit */}
            <section id="preparation" className="mb-10">
              <SectionTitle id="preparation">Préparation du manuscrit</SectionTitle>
              <p className="text-sm mb-4" style={{ color: '#374151', lineHeight: '1.7' }}>
                Votre manuscrit doit être rédigé en français ou en anglais, dans un style clair et scientifiquement rigoureux.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                {[
                  { label: 'Longueur', value: '5 000 – 10 000 mots (hors références)' },
                  { label: 'Résumé', value: '250 mots maximum, structuré' },
                  { label: 'Mots-clés', value: '5 à 8 mots-clés' },
                  { label: 'Format fichier', value: 'PDF ou Word (.docx)' },
                  { label: 'Taille maximale', value: '10 Mo' },
                  { label: 'Langue', value: 'Français ou Anglais' },
                ].map(({ label, value }) => (
                  <div key={label} className="px-4 py-3 rounded-sm" style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                    <p className="text-xs font-semibold mb-0.5" style={{ color: '#6B7280' }}>{label}</p>
                    <p className="text-sm" style={{ color: '#111827' }}>{value}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Format et structure */}
            <section id="format" className="mb-10">
              <SectionTitle id="format">Format et structure</SectionTitle>
              <p className="text-sm mb-4" style={{ color: '#374151', lineHeight: '1.7' }}>
                Les manuscrits doivent être structurés selon le plan IMRAD (Introduction, Méthodes, Résultats, Discussion) :
              </p>
              {[
                { title: 'Titre', desc: 'Concis, informatif, sans abréviation. Maximum 20 mots.' },
                { title: 'Résumé structuré', desc: 'Contexte, objectifs, méthodes, résultats principaux et conclusion. 250 mots max.' },
                { title: 'Introduction', desc: 'Contexte scientifique, lacunes identifiées, objectifs et hypothèses.' },
                { title: 'Matériels et méthodes', desc: 'Description reproductible du protocole expérimental, des analyses statistiques et du cadre éthique.' },
                { title: 'Résultats', desc: 'Présentation factuelle des données, figures et tableaux numérotés avec légendes.' },
                { title: 'Discussion', desc: 'Interprétation des résultats, limites de l\'étude, perspectives.' },
                { title: 'Références', desc: 'Style APA 7e édition. 30 références minimum pour un article de recherche.' },
              ].map((item, i) => (
                <Step key={i} number={i + 1} title={item.title}>{item.desc}</Step>
              ))}
            </section>

            {/* Processus de soumission */}
            <section id="submission" className="mb-10">
              <SectionTitle id="submission">Processus de soumission</SectionTitle>
              <div className="space-y-4">
                {[
                  { step: '1', label: 'Création de compte', desc: 'Inscrivez-vous sur JAEI en tant qu\'Auteur et complétez votre profil.' },
                  { step: '2', label: 'Remplissage du formulaire', desc: 'Saisissez le titre, le résumé, les mots-clés, le domaine et les co-auteurs éventuels.' },
                  { step: '3', label: 'Téléversement du fichier', desc: 'Joignez votre manuscrit au format PDF ou Word (10 Mo max).' },
                  { step: '4', label: 'Confirmation', desc: 'Vous recevrez un accusé de réception par email avec votre numéro de soumission.' },
                  { step: '5', label: 'Suivi', desc: 'Suivez le statut de votre soumission en temps réel depuis votre tableau de bord Auteur.' },
                ].map(item => (
                  <div key={item.step} className="flex gap-4 p-4 rounded-sm" style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                         style={{ background: '#1E88C8', color: '#fff' }}>
                      {item.step}
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: '#111827' }}>{item.label}</p>
                      <p className="text-sm mt-0.5" style={{ color: '#6B7280' }}>{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Évaluation par les pairs */}
            <section id="review" className="mb-10">
              <SectionTitle id="review">Évaluation par les pairs</SectionTitle>
              <p className="text-sm mb-4" style={{ color: '#374151', lineHeight: '1.7' }}>
                JAEI applique un processus d'évaluation en double aveugle. Votre identité et celle des évaluateurs restent mutuellement anonymes.
              </p>
              <div className="p-4 rounded-sm mb-4" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
                <p className="text-sm font-semibold mb-1" style={{ color: '#92400E' }}>Délais indicatifs</p>
                <ul className="text-sm space-y-1" style={{ color: '#92400E' }}>
                  <li>Vérification éditoriale initiale : 5 à 7 jours ouvrables</li>
                  <li>Évaluation par les pairs : 3 à 6 semaines</li>
                  <li>Décision finale après révision : 2 à 3 semaines</li>
                </ul>
              </div>
              <p className="text-sm" style={{ color: '#374151', lineHeight: '1.7' }}>
                Les décisions possibles sont : <strong>Accepté</strong>, <strong>Révision majeure</strong>,
                <strong> Révision mineure</strong> ou <strong>Rejeté</strong>. Chaque décision est accompagnée
                des commentaires détaillés des évaluateurs.
              </p>
            </section>

            {/* Frais de publication */}
            <section id="fees" className="mb-4">
              <SectionTitle id="fees">Frais de publication</SectionTitle>
              <div className="p-5 rounded-sm" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                <p className="text-base font-bold mb-1" style={{ color: '#15803D' }}>200 000 XAF</p>
                <p className="text-sm" style={{ color: '#374151' }}>
                  Frais de traitement éditorial (APC — Article Processing Charge), applicables uniquement après acceptation définitive.
                  Aucun frais n'est exigé lors de la soumission initiale.
                </p>
              </div>
              <p className="text-sm mt-4" style={{ color: '#6B7280', lineHeight: '1.7' }}>
                Les paiements sont acceptés par carte bancaire (Visa, Mastercard et autres cartes internationales).
                Un reçu officiel est envoyé par email après confirmation du paiement.
              </p>
            </section>

          </article>
        </div>
      </div>

    </Layout>
  );
};

export default GuideSubmission;
