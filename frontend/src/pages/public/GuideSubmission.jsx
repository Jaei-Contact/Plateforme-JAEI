import { useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../components/layout/Layout';

// ============================================================
// Guide de soumission — JAEI Platform
// ============================================================

const sections = [
  { id: 'eligibility',   label: 'Eligibility criteria' },
  { id: 'preparation',   label: 'Manuscript preparation' },
  { id: 'format',        label: 'Format and structure' },
  { id: 'submission',    label: 'Submission process' },
  { id: 'review',        label: 'Peer review' },
  { id: 'fees',          label: 'Publication fees' },
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
            Submission Guide
          </h1>
          <p className="text-base" style={{ color: 'rgba(255,255,255,0.75)', maxWidth: '600px' }}>
            Everything you need to know to successfully submit your manuscript to JAEI.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex flex-col lg:flex-row gap-8">

          {/* Sidebar table of contents — sticky */}
          <aside className="hidden lg:block w-56 flex-shrink-0">
            <div className="sticky top-24">
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#6B7280' }}>
                Contents
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
                <p className="text-xs font-semibold mb-2" style={{ color: '#1D4ED8' }}>Ready to submit?</p>
                <Link to="/author/submit"
                      className="block text-center px-3 py-2 rounded-sm text-xs font-semibold no-underline"
                      style={{ background: '#1E88C8', color: '#fff' }}>
                  Submit an article
                </Link>
              </div>
            </div>
          </aside>

          {/* Article */}
          <article className="flex-1 min-w-0 bg-white rounded-sm px-8 py-8"
                   style={{ border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>

            {/* Eligibility criteria */}
            <section id="eligibility" className="mb-10">
              <SectionTitle id="eligibility">Eligibility criteria</SectionTitle>
              <p className="text-sm mb-4" style={{ color: '#374151', lineHeight: '1.7' }}>
                JAEI accepts original work on sustainable agriculture, environmental sciences
                and agronomic innovations. Before submitting, ensure your manuscript meets the following criteria:
              </p>
              <ul className="space-y-2 text-sm" style={{ color: '#374151' }}>
                {[
                  'The work is original and has not been published or submitted elsewhere simultaneously',
                  'The content falls within the fields covered by JAEI (agronomy, environment, plant biotechnologies…)',
                  'All authors have approved the submission and declared their conflicts of interest',
                  'Experimental data are available upon request',
                  'Required ethical approvals have been obtained',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ background: '#1B4427' }} />
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            {/* Manuscript preparation */}
            <section id="preparation" className="mb-10">
              <SectionTitle id="preparation">Manuscript preparation</SectionTitle>
              <p className="text-sm mb-4" style={{ color: '#374151', lineHeight: '1.7' }}>
                Your manuscript must be written in French or English, in a clear and scientifically rigorous style.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                {[
                  { label: 'Length', value: '5,000 – 10,000 words (excluding references)' },
                  { label: 'Abstract', value: '250 words maximum, structured' },
                  { label: 'Keywords', value: '5 to 8 keywords' },
                  { label: 'File format', value: 'PDF or Word (.docx)' },
                  { label: 'Maximum size', value: '10 MB' },
                  { label: 'Language', value: 'French or English' },
                ].map(({ label, value }) => (
                  <div key={label} className="px-4 py-3 rounded-sm" style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                    <p className="text-xs font-semibold mb-0.5" style={{ color: '#6B7280' }}>{label}</p>
                    <p className="text-sm" style={{ color: '#111827' }}>{value}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Format and structure */}
            <section id="format" className="mb-10">
              <SectionTitle id="format">Format and structure</SectionTitle>
              <p className="text-sm mb-4" style={{ color: '#374151', lineHeight: '1.7' }}>
                Manuscripts must be structured according to the IMRAD format (Introduction, Methods, Results, Discussion):
              </p>
              {[
                { title: 'Title', desc: 'Concise, informative, without abbreviations. Maximum 20 words.' },
                { title: 'Structured abstract', desc: 'Context, objectives, methods, main results and conclusion. 250 words max.' },
                { title: 'Introduction', desc: 'Scientific context, identified gaps, objectives and hypotheses.' },
                { title: 'Materials and methods', desc: 'Reproducible description of the experimental protocol, statistical analyses and ethical framework.' },
                { title: 'Results', desc: 'Factual presentation of data, numbered figures and tables with captions.' },
                { title: 'Discussion', desc: 'Interpretation of results, study limitations, perspectives.' },
                { title: 'References', desc: 'APA 7th edition style. Minimum 30 references for a research article.' },
              ].map((item, i) => (
                <Step key={i} number={i + 1} title={item.title}>{item.desc}</Step>
              ))}
            </section>

            {/* Submission process */}
            <section id="submission" className="mb-10">
              <SectionTitle id="submission">Submission process</SectionTitle>
              <div className="space-y-4">
                {[
                  { step: '1', label: 'Account creation', desc: 'Register on JAEI as an Author and complete your profile.' },
                  { step: '2', label: 'Form completion', desc: 'Enter the title, abstract, keywords, research area and any co-authors.' },
                  { step: '3', label: 'File upload', desc: 'Attach your manuscript in PDF or Word format (10 MB max).' },
                  { step: '4', label: 'Confirmation', desc: 'You will receive an acknowledgement of receipt by email with your submission number.' },
                  { step: '5', label: 'Tracking', desc: 'Monitor the status of your submission in real time from your Author dashboard.' },
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

            {/* Peer review */}
            <section id="review" className="mb-10">
              <SectionTitle id="review">Peer review</SectionTitle>
              <p className="text-sm mb-4" style={{ color: '#374151', lineHeight: '1.7' }}>
                JAEI applies a double-blind review process. Your identity and that of the reviewers remain mutually anonymous.
              </p>
              <div className="p-4 rounded-sm mb-4" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
                <p className="text-sm font-semibold mb-1" style={{ color: '#92400E' }}>Indicative timelines</p>
                <ul className="text-sm space-y-1" style={{ color: '#92400E' }}>
                  <li>Initial editorial check: 5 to 7 business days</li>
                  <li>Peer review: 3 to 6 weeks</li>
                  <li>Final decision after revision: 2 to 3 weeks</li>
                </ul>
              </div>
              <p className="text-sm" style={{ color: '#374151', lineHeight: '1.7' }}>
                Possible decisions are: <strong>Accepted</strong>, <strong>Major revision</strong>,
                <strong> Minor revision</strong> or <strong>Rejected</strong>. Each decision is accompanied
                by the detailed comments of the reviewers.
              </p>
            </section>

            {/* Publication fees */}
            <section id="fees" className="mb-4">
              <SectionTitle id="fees">Publication fees</SectionTitle>
              <div className="p-5 rounded-sm" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                <p className="text-base font-bold mb-1" style={{ color: '#15803D' }}>200,000 XAF</p>
                <p className="text-sm" style={{ color: '#374151' }}>
                  Article Processing Charge (APC), applicable only after final acceptance.
                  No fee is required at the time of initial submission.
                </p>
              </div>
              <p className="text-sm mt-4" style={{ color: '#6B7280', lineHeight: '1.7' }}>
                Payments are accepted by credit card (Visa, Mastercard and other international cards).
                An official receipt is sent by email after payment confirmation.
              </p>
            </section>

          </article>
        </div>
      </div>

    </Layout>
  );
};

export default GuideSubmission;
