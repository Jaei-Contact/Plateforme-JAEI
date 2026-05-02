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
        <h1 className="text-2xl font-bold" style={{ color: '#fff' }}>Terms of use</h1>
        <p className="text-sm mt-2" style={{ color: 'rgba(255,255,255,0.65)' }}>Last updated: April 2026</p>
      </div>
    </div>

    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="bg-white rounded-sm px-8 py-8" style={{ border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>

        <Section title="1. Acceptance of terms">
          <p>
            By accessing and using the JAEI platform, you unconditionally accept these terms of use.
            If you do not accept these terms, you must immediately stop using the platform.
          </p>
        </Section>

        <Section title="2. Service description">
          <p>
            JAEI is a platform for submitting, reviewing and publishing scientific articles in the fields
            of agriculture and environmental sciences. It is accessible to registered authors, reviewers and readers.
          </p>
        </Section>

        <Section title="3. Account creation">
          <p>Access to certain features requires creating an account. You agree to:</p>
          <ul className="space-y-1">
            {[
              'Provide accurate and up-to-date information upon registration',
              'Keep your login credentials confidential',
              'Notify JAEI immediately in the event of any compromise of your account',
              'Not share your account with third parties',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ background: '#1B4427' }} />
                {item}
              </li>
            ))}
          </ul>
        </Section>

        <Section title="4. Intellectual property">
          <p>
            Authors retain copyright over their submitted manuscripts. By submitting an article, you grant
            JAEI a non-exclusive licence to publish, reproduce and distribute it within the scope of the journal.
          </p>
          <p>
            The content of the platform (design, interface, logo, editorial texts) is protected by intellectual
            property law and belongs to JAEI.
          </p>
        </Section>

        <Section title="5. Acceptable use">
          <p>It is prohibited to use the platform to:</p>
          <ul className="space-y-1">
            {[
              'Submit fraudulent, plagiarised or scientifically unethical content',
              'Attempt to access features without authorisation',
              'Disrupt the operation of the platform (attacks, spam, bots)',
              'Impersonate another user or researcher',
              'Disclose the identity of reviewers under double-blind conditions',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ background: '#B91C1C' }} />
                {item}
              </li>
            ))}
          </ul>
        </Section>

        <Section title="6. Fees and payments">
          <p>
            Initial submission is free. An Article Processing Charge (APC) of <strong>100 000 FCFA</strong> (or equivalent: $180 USD / ¥1 300 RMB) applies
            after final acceptance of the article. These fees cover the costs of editing, online publishing
            and archiving. Exceptions or reductions may be considered upon justified request, particularly
            for doctoral candidates, independent researchers, or non-profit collective projects.
          </p>
          <p>
            Any payment made for an accepted article is final. In the event of voluntary withdrawal after payment,
            no refund will be granted unless the editorial board decides otherwise.
          </p>
        </Section>

        <Section title="7. Limitation of liability">
          <p>
            JAEI strives to keep the platform available at all times but does not guarantee uninterrupted availability.
            JAEI shall not be held liable for data loss, service interruptions or indirect damages resulting from
            the use of the platform.
          </p>
        </Section>

        <Section title="8. Termination">
          <p>
            JAEI reserves the right to suspend or delete any account in the event of a breach of these terms,
            without prior notice or refund. Users may close their account at any time by contacting support.
          </p>
        </Section>

        <Section title="9. Governing law">
          <p>
            These terms are governed by the law applicable in Cameroon. Any dispute shall be subject to the
            exclusive jurisdiction of the courts of Yaoundé, unless otherwise provided by law.
          </p>
        </Section>

        <Section title="10. Contact">
          <p>For any questions regarding these terms: <strong>contact@jaei-journal.org</strong></p>
        </Section>

      </div>
    </div>
  </Layout>
);

export default TermsPage;
