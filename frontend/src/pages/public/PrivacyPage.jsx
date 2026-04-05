import Layout from '../../components/layout/Layout';

const Section = ({ title, children }) => (
  <div className="mb-8">
    <h2 className="text-base font-bold mb-3 pb-2" style={{ color: '#1B4427', borderBottom: '2px solid #E5E7EB' }}>{title}</h2>
    <div className="text-sm space-y-3" style={{ color: '#374151', lineHeight: '1.7' }}>{children}</div>
  </div>
);

const PrivacyPage = () => (
  <Layout>
    <div style={{ background: 'linear-gradient(135deg, #1B4427 0%, #1a5c35 100%)', borderBottom: '3px solid #1E88C8' }}>
      <div className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold" style={{ color: '#fff' }}>Politique de confidentialité</h1>
        <p className="text-sm mt-2" style={{ color: 'rgba(255,255,255,0.65)' }}>Dernière mise à jour : avril 2026</p>
      </div>
    </div>

    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="bg-white rounded-sm px-8 py-8" style={{ border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>

        <Section title="1. Responsable du traitement">
          <p>
            JAEI (Journal of Agricultural and Environmental Innovation) est responsable du traitement de vos données
            personnelles collectées via la plateforme accessible à l'adresse jaei.com.
          </p>
          <p>Pour toute question relative à vos données : <strong>privacy@jaei.com</strong></p>
        </Section>

        <Section title="2. Données collectées">
          <p>Nous collectons les données suivantes lors de votre inscription et utilisation de la plateforme :</p>
          <ul className="space-y-1">
            {[
              'Identité : prénom, nom, institution, pays',
              'Contact : adresse email',
              'Données de profil : domaines de recherche, photo de profil (optionnelle)',
              'Données de soumission : titres, résumés, manuscrits, mots-clés',
              'Données de navigation : adresse IP, type de navigateur, pages visitées',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ background: '#1B4427' }} />
                {item}
              </li>
            ))}
          </ul>
        </Section>

        <Section title="3. Finalités du traitement">
          <p>Vos données sont utilisées pour :</p>
          <ul className="space-y-1">
            {[
              'Gestion de votre compte et authentification sécurisée',
              'Traitement des soumissions et communications éditoriales',
              'Envoi de notifications relatives à vos soumissions',
              'Amélioration de la plateforme et analyses statistiques anonymisées',
              'Respect des obligations légales et contractuelles',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ background: '#1B4427' }} />
                {item}
              </li>
            ))}
          </ul>
        </Section>

        <Section title="4. Durée de conservation">
          <p>
            Les données de compte sont conservées pendant toute la durée de votre inscription et 3 ans après
            la fermeture de votre compte. Les données de soumission sont conservées 10 ans conformément aux
            exigences de traçabilité scientifique.
          </p>
        </Section>

        <Section title="5. Partage des données">
          <p>
            Vos données ne sont jamais vendues à des tiers. Elles peuvent être partagées avec :
          </p>
          <ul className="space-y-1">
            {[
              'Les évaluateurs assignés (données anonymisées dans le cadre du double aveugle)',
              'Nos prestataires techniques (hébergement, messagerie) soumis à des obligations de confidentialité',
              'Les autorités compétentes si la loi l\'exige',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ background: '#1B4427' }} />
                {item}
              </li>
            ))}
          </ul>
        </Section>

        <Section title="6. Vos droits">
          <p>Conformément à la réglementation applicable, vous disposez des droits suivants :</p>
          <ul className="space-y-1">
            {[
              'Droit d\'accès à vos données personnelles',
              'Droit de rectification des données inexactes',
              'Droit à l\'effacement (« droit à l\'oubli »)',
              'Droit à la portabilité de vos données',
              'Droit d\'opposition au traitement',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ background: '#1B4427' }} />
                {item}
              </li>
            ))}
          </ul>
          <p>Pour exercer vos droits, contactez-nous à : <strong>privacy@jaei.com</strong></p>
        </Section>

        <Section title="7. Sécurité">
          <p>
            Nous mettons en œuvre des mesures techniques et organisationnelles adaptées pour protéger vos données :
            chiffrement des mots de passe (bcrypt), connexions HTTPS, jetons JWT sécurisés, accès restreint aux données
            selon les rôles.
          </p>
        </Section>

        <Section title="8. Modifications">
          <p>
            Cette politique peut être mise à jour périodiquement. Toute modification substantielle sera notifiée
            par email ou via une alerte sur la plateforme.
          </p>
        </Section>

      </div>
    </div>
  </Layout>
);

export default PrivacyPage;
