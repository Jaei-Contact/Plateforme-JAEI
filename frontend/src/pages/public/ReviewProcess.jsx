import { Link } from 'react-router-dom';
import Layout from '../../components/layout/Layout';

// ============================================================
// Review process — JAEI Platform
// Sources : Statuts du journal (« Double anonymized review »), page « About »
// (Editorial process), Submission Guide et fonctionnement réel de la plateforme.
// ============================================================

const STEPS = [
  {
    title: 'Submission',
    delay: '',
    desc: 'The author submits the manuscript through the online platform and receives an acknowledgement of receipt by email with the manuscript number.',
  },
  {
    title: 'Editorial check',
    delay: '≤ 5 working days',
    desc: 'The editorial team checks the manuscript against the journal requirements: format, thematic scope, originality (similarity check) and ethics. A first decision is communicated within 5 working days. A manuscript that needs formal corrections can be sent back to the authors before peer review.',
  },
  {
    title: 'Reviewer invitation',
    delay: '',
    desc: 'The editorial office invites at least two experts of the field. Each reviewer accepts or declines the invitation from the link received by email.',
  },
  {
    title: 'Peer review',
    delay: '~30 days (round 1)',
    desc: 'Each reviewer reads the manuscript and sends a recommendation (accept, revise or reject) with comments for the author(s), confidential comments for the Editor and, optionally, a review file. The due date starts on the day the invitation is accepted.',
  },
  {
    title: 'Editorial decision',
    delay: '',
    desc: 'On the basis of the review reports, the editor takes one of the following decisions: Accept, Minor revision, Major revision or Reject. The decision is sent to the author by email together with the editor\'s comments, which are also available on the author dashboard.',
  },
  {
    title: 'Revision (if requested)',
    delay: '~2 weeks (round 2)',
    desc: 'The author submits a revised version: a response to the reviewers, the clean revised manuscript and the manuscript with tracked changes. The reviewers who took part in the first round can be invited again to assess the revised manuscript.',
  },
  {
    title: 'Acceptance and publication',
    delay: '',
    desc: 'Once the article is accepted, the Article Processing Charge (APC) applies; no fee is required at submission. When the payment is recorded and the final PDF is ready, the article is published online in open access.',
  },
];

const RULES = [
  'Double anonymized review: reviewers do not see the names of the authors, nor the title page, the cover letter or the author agreement.',
  'The authors do not know who the reviewers are: the names of the reviewers are never disclosed to them.',
  'Authors receive the editor\'s comments; the confidential comments written by reviewers for the Editor are never shown to the authors.',
  'Manuscripts sent for review are confidential documents and must not be shared or used outside the review.',
  'Editors assess the suitability of a manuscript before sending it to reviewers.',
];

const ReviewProcess = () => (
  <Layout>

    {/* Hero */}
    <div style={{ background: 'linear-gradient(135deg, #1B4427 0%, #1a5c35 60%, #1565a8 100%)', borderBottom: '3px solid #1E88C8' }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <p className="text-xs font-medium mb-2 uppercase tracking-widest" style={{ color: '#4ade80' }}>
          Journal of Agricultural and Environmental Innovation
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold mb-3" style={{ color: '#fff' }}>
          Review process
        </h1>
        <p className="text-base" style={{ color: 'rgba(255,255,255,0.75)', maxWidth: '620px' }}>
          How a manuscript is evaluated at JAEI, from submission to publication.
        </p>
      </div>
    </div>

    {/* Content */}
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <article className="bg-white rounded-sm px-6 sm:px-8 py-8"
               style={{ border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>

        <section className="mb-10">
          <h2 className="text-lg font-bold mb-4 pb-2" style={{ color: '#1B4427', borderBottom: '2px solid #E5E7EB' }}>
            Overview
          </h2>
          <p className="text-sm" style={{ color: '#374151', lineHeight: '1.7' }}>
            JAEI applies a <strong>double anonymized peer review</strong>: the identity of the authors is concealed
            from the reviewers, and the identity of the reviewers is concealed from the authors. The editors
            assess the suitability of every manuscript before it is sent to reviewers.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-lg font-bold mb-4 pb-2" style={{ color: '#1B4427', borderBottom: '2px solid #E5E7EB' }}>
            The stages
          </h2>
          <div className="relative">
            <div className="absolute left-5 top-5 bottom-5 w-0.5" style={{ background: '#F3F4F6' }} />
            <div className="space-y-6">
              {STEPS.map(({ title, delay, desc }, i) => (
                <div key={title} className="flex gap-4 pl-1">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 z-10"
                       style={{ background: i === STEPS.length - 1 ? '#1E88C8' : '#1B4427' }}>
                    {i + 1}
                  </div>
                  <div className="flex-1 pt-0.5">
                    <div className="flex flex-wrap items-center gap-3 mb-1">
                      <h3 className="text-sm font-bold" style={{ color: '#111827' }}>{title}</h3>
                      {delay && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                              style={{ background: '#F3F4F6', color: '#6B7280', border: '1px solid #E5E7EB' }}>
                          {delay}
                        </span>
                      )}
                    </div>
                    <p className="text-sm" style={{ color: '#374151', lineHeight: '1.7' }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-lg font-bold mb-4 pb-2" style={{ color: '#1B4427', borderBottom: '2px solid #E5E7EB' }}>
            Indicative timelines
          </h2>
          <div className="p-4 rounded-sm" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
            <ul className="text-sm space-y-1" style={{ color: '#92400E' }}>
              <li>Submission to first decision: 5 working days</li>
              <li>First review round: 30 days</li>
              <li>Second review round (revised manuscript): about 2 weeks</li>
              <li>Submission to acceptance: 45 days on average</li>
            </ul>
          </div>
        </section>

        <section className="mb-4">
          <h2 className="text-lg font-bold mb-4 pb-2" style={{ color: '#1B4427', borderBottom: '2px solid #E5E7EB' }}>
            Anonymity and confidentiality
          </h2>
          <ul className="space-y-2 text-sm" style={{ color: '#374151' }}>
            {RULES.map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ background: '#1B4427' }} />
                {item}
              </li>
            ))}
          </ul>
          <p className="text-sm mt-6" style={{ color: '#6B7280', lineHeight: '1.7' }}>
            See also the <Link to="/guide-submission" style={{ color: '#1E88C8' }}>Submission Guide</Link> and
            the <Link to="/author-instructions" style={{ color: '#1E88C8' }}>Author Guidelines</Link>.
          </p>
        </section>

      </article>
    </div>

  </Layout>
);

export default ReviewProcess;
