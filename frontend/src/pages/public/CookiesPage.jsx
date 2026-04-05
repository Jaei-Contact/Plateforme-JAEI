import Layout from '../../components/layout/Layout';

const Section = ({ title, children }) => (
  <div className="mb-8">
    <h2 className="text-base font-bold mb-3 pb-2" style={{ color: '#1B4427', borderBottom: '2px solid #E5E7EB' }}>{title}</h2>
    <div className="text-sm space-y-3" style={{ color: '#374151', lineHeight: '1.7' }}>{children}</div>
  </div>
);

const CookieRow = ({ name, purpose, duration, type }) => (
  <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
    <td className="px-4 py-2.5 text-xs font-mono" style={{ color: '#374151' }}>{name}</td>
    <td className="px-4 py-2.5 text-sm" style={{ color: '#374151' }}>{purpose}</td>
    <td className="px-4 py-2.5 text-sm" style={{ color: '#6B7280' }}>{duration}</td>
    <td className="px-4 py-2.5">
      <span className="text-xs px-2 py-0.5 rounded-sm font-medium"
            style={{
              background: type === 'Essentiel' ? '#F0FDF4' : '#EFF6FF',
              color: type === 'Essentiel' ? '#15803D' : '#1D4ED8',
              border: `1px solid ${type === 'Essentiel' ? '#BBF7D0' : '#BFDBFE'}`,
            }}>
        {type}
      </span>
    </td>
  </tr>
);

const CookiesPage = () => (
  <Layout>
    <div style={{ background: 'linear-gradient(135deg, #1B4427 0%, #1a5c35 100%)', borderBottom: '3px solid #1E88C8' }}>
      <div className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold" style={{ color: '#fff' }}>Politique de cookies</h1>
        <p className="text-sm mt-2" style={{ color: 'rgba(255,255,255,0.65)' }}>Dernière mise à jour : avril 2026</p>
      </div>
    </div>

    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="bg-white rounded-sm px-8 py-8" style={{ border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>

        <Section title="1. Qu'est-ce qu'un cookie ?">
          <p>
            Un cookie est un petit fichier texte déposé sur votre appareil lorsque vous visitez un site web.
            Il permet au site de mémoriser vos préférences et actions afin d'améliorer votre expérience de navigation.
          </p>
        </Section>

        <Section title="2. Cookies utilisés par JAEI">
          <p>La plateforme JAEI utilise uniquement les cookies nécessaires à son bon fonctionnement :</p>
          <div className="overflow-x-auto mt-3">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr style={{ background: '#1B4427' }}>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold" style={{ color: '#fff' }}>Nom</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold" style={{ color: '#fff' }}>Finalité</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold" style={{ color: '#fff' }}>Durée</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold" style={{ color: '#fff' }}>Type</th>
                </tr>
              </thead>
              <tbody>
                <CookieRow name="jaei_token" purpose="Authentification et maintien de session" duration="7 jours" type="Essentiel" />
                <CookieRow name="jaei_user" purpose="Données utilisateur mises en cache localement" duration="Session" type="Essentiel" />
                <CookieRow name="jaei_prefs" purpose="Préférences d'affichage (thème, langue)" duration="30 jours" type="Fonctionnel" />
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="3. Cookies tiers">
          <p>
            JAEI n'intègre pas de cookies publicitaires ou de tracking tiers. Les seuls services externes pouvant
            déposer des cookies sont :
          </p>
          <ul className="space-y-1">
            {[
              'Stripe — traitement des paiements (cookie de sécurité anti-fraude)',
              'Cloudinary — hébergement des fichiers (aucun cookie de tracking)',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ background: '#1B4427' }} />
                {item}
              </li>
            ))}
          </ul>
        </Section>

        <Section title="4. Gestion des cookies">
          <p>
            Vous pouvez configurer votre navigateur pour refuser ou supprimer les cookies. Notez cependant que
            le refus des cookies essentiels empêchera la connexion à votre compte JAEI.
          </p>
          <p>Guides pour gérer les cookies selon votre navigateur :</p>
          <ul className="space-y-1">
            {['Google Chrome', 'Mozilla Firefox', 'Microsoft Edge', 'Safari'].map((browser, i) => (
              <li key={i} className="flex items-start gap-2 text-sm" style={{ color: '#374151' }}>
                <span className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ background: '#1E88C8' }} />
                {browser} — via les paramètres → Confidentialité et sécurité
              </li>
            ))}
          </ul>
        </Section>

        <Section title="5. Contact">
          <p>
            Pour toute question relative à l'utilisation des cookies sur JAEI : <strong>privacy@jaei.com</strong>
          </p>
        </Section>

      </div>
    </div>
  </Layout>
);

export default CookiesPage;
