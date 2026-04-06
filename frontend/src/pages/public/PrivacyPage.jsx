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
        <h1 className="text-2xl font-bold" style={{ color: '#fff' }}>Privacy policy</h1>
        <p className="text-sm mt-2" style={{ color: 'rgba(255,255,255,0.65)' }}>Last updated: April 2026</p>
      </div>
    </div>

    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="bg-white rounded-sm px-8 py-8" style={{ border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>

        <Section title="1. Data controller">
          <p>
            JAEI (Journal of Agricultural and Environmental Innovation) is the controller of your personal data
            collected through the platform accessible at jaei.com.
          </p>
          <p>For any questions regarding your data: <strong>privacy@jaei.com</strong></p>
        </Section>

        <Section title="2. Data collected">
          <p>We collect the following data during your registration and use of the platform:</p>
          <ul className="space-y-1">
            {[
              'Identity: first name, last name, institution, country',
              'Contact: email address',
              'Profile data: research fields, profile photo (optional)',
              'Submission data: titles, abstracts, manuscripts, keywords',
              'Browsing data: IP address, browser type, pages visited',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ background: '#1B4427' }} />
                {item}
              </li>
            ))}
          </ul>
        </Section>

        <Section title="3. Purposes of processing">
          <p>Your data is used to:</p>
          <ul className="space-y-1">
            {[
              'Manage your account and provide secure authentication',
              'Process submissions and editorial communications',
              'Send notifications related to your submissions',
              'Improve the platform and perform anonymised statistical analyses',
              'Comply with legal and contractual obligations',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ background: '#1B4427' }} />
                {item}
              </li>
            ))}
          </ul>
        </Section>

        <Section title="4. Retention period">
          <p>
            Account data is retained for the duration of your registration and 3 years after
            account closure. Submission data is retained for 10 years in accordance with
            scientific traceability requirements.
          </p>
        </Section>

        <Section title="5. Data sharing">
          <p>
            Your data is never sold to third parties. It may be shared with:
          </p>
          <ul className="space-y-1">
            {[
              'Assigned reviewers (anonymised data under double-blind conditions)',
              'Our technical service providers (hosting, messaging) bound by confidentiality obligations',
              'Competent authorities if required by law',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ background: '#1B4427' }} />
                {item}
              </li>
            ))}
          </ul>
        </Section>

        <Section title="6. Your rights">
          <p>In accordance with applicable regulations, you have the following rights:</p>
          <ul className="space-y-1">
            {[
              'Right of access to your personal data',
              'Right to rectification of inaccurate data',
              'Right to erasure ("right to be forgotten")',
              'Right to data portability',
              'Right to object to processing',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ background: '#1B4427' }} />
                {item}
              </li>
            ))}
          </ul>
          <p>To exercise your rights, contact us at: <strong>privacy@jaei.com</strong></p>
        </Section>

        <Section title="7. Security">
          <p>
            We implement appropriate technical and organisational measures to protect your data:
            password encryption (bcrypt), HTTPS connections, secure JWT tokens, role-based access control.
          </p>
        </Section>

        <Section title="8. Amendments">
          <p>
            This policy may be updated periodically. Any material change will be notified
            by email or via an alert on the platform.
          </p>
        </Section>

      </div>
    </div>
  </Layout>
);

export default PrivacyPage;
