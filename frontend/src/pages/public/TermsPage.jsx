import Layout from '../../components/layout/Layout';

const Section = ({ title, children }) => (
  <div className="mb-8">
    <h2 className="text-base font-bold mb-3 pb-2" style={{ color: '#1B4427', borderBottom: '2px solid #E5E7EB' }}>{title}</h2>
    <div className="text-sm space-y-3" style={{ color: '#374151', lineHeight: '1.7' }}>{children}</div>
  </div>
);

const TermsPage = () => (
  <Layout>
    <div style={{ background: 'linear-gradient(135deg, #1B4427 0%, #1a5c35 100%)', borderBottom: '3px solid #1E88C8' }}>
      <div className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold" style={{ color: '#fff' }}>Conditions d'utilisation</h1>
        <p className="text-sm mt-2" style={{ color: 'rgba(255,255,255,0.65)' }}>Dernière mise à jour : avril 2026</p>
      </div>
    </div>

    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="bg-white rounded-sm px-8 py-8" style={{ border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>

        <Section title="1. Acceptation des conditions">
          <p>
            En accédant à la plateforme JAEI et en l'utilisant, vous acceptez sans réserve les présentes conditions d'utilisation.
            Si vous n'acceptez pas ces conditions, vous devez cesser d'utiliser la plateforme immédiatement.
          </p>
        </Section>

        <Section title="2. Description du service">
          <p>
            JAEI est une plateforme de soumission, d'évaluation et de publication d'articles scientifiques dans les domaines
            de l'agriculture et des sciences environnementales. Elle est accessible aux auteurs, évaluateurs et lecteurs
            enregistrés.
          </p>
        </Section>

        <Section title="3. Création de compte">
          <p>L'accès à certaines fonctionnalités requiert la création d'un compte. Vous vous engagez à :</p>
          <ul className="space-y-1">
            {[
              'Fournir des informations exactes et à jour lors de l\'inscription',
              'Maintenir la confidentialité de vos identifiants de connexion',
              'Notifier JAEI immédiatement en cas de compromission de votre compte',
              'Ne pas partager votre compte avec des tiers',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ background: '#1B4427' }} />
                {item}
              </li>
            ))}
          </ul>
        </Section>

        <Section title="4. Propriété intellectuelle">
          <p>
            Les auteurs conservent le droit d'auteur sur leurs manuscrits soumis. En soumettant un article, vous accordez
            à JAEI une licence non exclusive de publication, reproduction et distribution dans le cadre de la revue.
          </p>
          <p>
            Le contenu de la plateforme (design, interface, logo, textes éditoriaux) est protégé par le droit de la
            propriété intellectuelle et appartient à JAEI.
          </p>
        </Section>

        <Section title="5. Règles de bonne conduite">
          <p>Il est interdit d'utiliser la plateforme pour :</p>
          <ul className="space-y-1">
            {[
              'Soumettre des contenus frauduleux, plagiés ou contraires à l\'éthique scientifique',
              'Tenter d\'accéder à des fonctionnalités sans autorisation',
              'Perturber le fonctionnement de la plateforme (attaques, spam, bots)',
              'Usurper l\'identité d\'un autre utilisateur ou d\'un chercheur',
              'Divulguer l\'identité des évaluateurs dans le cadre du double aveugle',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ background: '#B91C1C' }} />
                {item}
              </li>
            ))}
          </ul>
        </Section>

        <Section title="6. Frais et paiements">
          <p>
            La soumission initiale est gratuite. Des frais de traitement éditorial (APC) de <strong>200 000 XAF</strong> sont
            applicables après acceptation définitive de l'article. Ces frais couvrent les coûts d'édition, de mise en ligne
            et d'archivage.
          </p>
          <p>
            Tout paiement effectué pour un article accepté est définitif. En cas de retrait volontaire après paiement,
            aucun remboursement ne sera accordé sauf décision éditoriale contraire.
          </p>
        </Section>

        <Section title="7. Limitation de responsabilité">
          <p>
            JAEI s'efforce de maintenir la plateforme disponible en permanence mais ne garantit pas une disponibilité
            ininterrompue. JAEI ne saurait être tenu responsable de pertes de données, d'interruptions de service ou
            de dommages indirects résultant de l'utilisation de la plateforme.
          </p>
        </Section>

        <Section title="8. Résiliation">
          <p>
            JAEI se réserve le droit de suspendre ou supprimer tout compte en cas de violation des présentes conditions,
            sans préavis ni remboursement. L'utilisateur peut fermer son compte à tout moment en contactant le support.
          </p>
        </Section>

        <Section title="9. Droit applicable">
          <p>
            Les présentes conditions sont régies par le droit applicable au Cameroun. Tout litige sera soumis à la
            compétence exclusive des tribunaux de Yaoundé, sauf disposition légale contraire.
          </p>
        </Section>

        <Section title="10. Contact">
          <p>Pour toute question relative aux présentes conditions : <strong>legal@jaei.com</strong></p>
        </Section>

      </div>
    </div>
  </Layout>
);

export default TermsPage;
