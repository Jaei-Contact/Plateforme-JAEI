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
              background: type === 'Essential' ? '#F0FDF4' : '#EFF6FF',
              color: type === 'Essential' ? '#15803D' : '#1D4ED8',
              border: `1px solid ${type === 'Essential' ? '#BBF7D0' : '#BFDBFE'}`,
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
        <h1 className="text-2xl font-bold" style={{ color: '#fff' }}>Cookie policy</h1>
        <p className="text-sm mt-2" style={{ color: 'rgba(255,255,255,0.65)' }}>Last updated: April 2026</p>
      </div>
    </div>

    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="bg-white rounded-sm px-8 py-8" style={{ border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>

        <Section title="1. What is a cookie?">
          <p>
            A cookie is a small text file placed on your device when you visit a website.
            It allows the site to remember your preferences and actions in order to improve your browsing experience.
          </p>
        </Section>

        <Section title="2. Cookies used by JAEI">
          <p>The JAEI platform uses only the cookies necessary for its proper operation:</p>
          <div className="overflow-x-auto mt-3">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr style={{ background: '#1B4427' }}>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold" style={{ color: '#fff' }}>Name</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold" style={{ color: '#fff' }}>Purpose</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold" style={{ color: '#fff' }}>Duration</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold" style={{ color: '#fff' }}>Type</th>
                </tr>
              </thead>
              <tbody>
                <CookieRow name="jaei_token" purpose="Authentication and session maintenance" duration="7 days" type="Essential" />
                <CookieRow name="jaei_user" purpose="User data cached locally" duration="Session" type="Essential" />
                <CookieRow name="jaei_prefs" purpose="Display preferences (theme, language)" duration="30 days" type="Functional" />
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="3. Third-party cookies">
          <p>
            JAEI does not include any advertising or third-party tracking cookies. The only external services
            that may place cookies are:
          </p>
          <ul className="space-y-1">
            {[
              'Stripe — payment processing (anti-fraud security cookie)',
              'Cloudinary — file hosting (no tracking cookies)',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ background: '#1B4427' }} />
                {item}
              </li>
            ))}
          </ul>
        </Section>

        <Section title="4. Cookie management">
          <p>
            You can configure your browser to refuse or delete cookies. Please note, however, that
            refusing essential cookies will prevent you from logging in to your JAEI account.
          </p>
          <p>Guides for managing cookies in your browser:</p>
          <ul className="space-y-1">
            {['Google Chrome', 'Mozilla Firefox', 'Microsoft Edge', 'Safari'].map((browser, i) => (
              <li key={i} className="flex items-start gap-2 text-sm" style={{ color: '#374151' }}>
                <span className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ background: '#1E88C8' }} />
                {browser} — via Settings → Privacy and security
              </li>
            ))}
          </ul>
        </Section>

        <Section title="5. Contact">
          <p>
            For any questions regarding the use of cookies on JAEI: <strong>contact@jaei-journal.org</strong>
          </p>
        </Section>

      </div>
    </div>
  </Layout>
);

export default CookiesPage;
