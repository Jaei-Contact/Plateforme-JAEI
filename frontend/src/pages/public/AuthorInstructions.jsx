import { useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../components/layout/Layout';

// ============================================================
// Author Guidelines — JAEI Platform
// ============================================================

const sections = [
  { id: 'scope',       label: 'Scope and fields' },
  { id: 'types',       label: 'Publication types' },
  { id: 'language',    label: 'Language and style' },
  { id: 'formatting',  label: 'Formatting' },
  { id: 'figures',     label: 'Figures and tables' },
  { id: 'references',  label: 'References' },
  { id: 'ethics',      label: 'Ethics and integrity' },
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
            Author Guidelines
          </h1>
          <p className="text-base" style={{ color: 'rgba(255,255,255,0.75)', maxWidth: '600px' }}>
            Complete guidelines for writing and presenting your manuscripts.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex flex-col lg:flex-row gap-8">

          {/* Sticky table of contents */}
          <aside className="hidden lg:block w-56 flex-shrink-0">
            <div className="sticky top-24">
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#6B7280' }}>Contents</p>
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
                <p className="text-xs font-semibold mb-2" style={{ color: '#1D4ED8' }}>See also</p>
                <Link to="/guide-submission" className="block text-xs no-underline mb-1" style={{ color: '#1E88C8' }}>
                  Submission guide →
                </Link>
              </div>
            </div>
          </aside>

          {/* Article */}
          <article className="flex-1 min-w-0 bg-white rounded-sm px-8 py-8"
                   style={{ border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>

            {/* Scope */}
            <section id="scope" className="mb-10">
              <SectionTitle id="scope">Scope and fields covered</SectionTitle>
              <p className="text-sm mb-3" style={{ color: '#374151', lineHeight: '1.7' }}>
                JAEI publishes original work in the following fields:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  'Agronomy and crop production',
                  'Soil science and fertilisation',
                  'Plant genetics and breeding',
                  'Agroecology and sustainable agriculture',
                  'Environmental sciences',
                  'Water resource management',
                  'Agricultural biotechnologies',
                  'Agricultural economics and policy',
                  'Animal nutrition and husbandry',
                  'Climate change and adaptation',
                ].map((d, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm px-3 py-2 rounded-sm"
                       style={{ background: '#F0FDF4', color: '#15803D', border: '1px solid #BBF7D0' }}>
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#15803D' }} />
                    {d}
                  </div>
                ))}
              </div>
            </section>

            {/* Publication types */}
            <section id="types" className="mb-10">
              <SectionTitle id="types">Accepted publication types</SectionTitle>
              <Table
                headers={['Type', 'Description', 'Length']}
                rows={[
                  ['Original article', 'Results of an original experimental study', '5,000 – 10,000 words'],
                  ['Review article', 'Critical synthesis of the literature on a topic', '8,000 – 15,000 words'],
                  ['Short communication', 'Preliminary results or technical note', '2,000 – 4,000 words'],
                  ['Case study', 'In-depth analysis of a specific case', '3,000 – 6,000 words'],
                  ['Letter to the editor', 'Comment on a published article', '500 – 1,000 words'],
                ]}
              />
            </section>

            {/* Language and style */}
            <section id="language" className="mb-10">
              <SectionTitle id="language">Language and writing style</SectionTitle>
              <p className="text-sm mb-3" style={{ color: '#374151', lineHeight: '1.7' }}>
                Manuscripts are accepted in <strong>French</strong> and in <strong>English</strong>.
                The style must be clear, precise and free of unnecessary jargon. Recommendations:
              </p>
              <ul className="space-y-2 text-sm" style={{ color: '#374151' }}>
                {[
                  'Active voice preferred over passive voice',
                  'Short sentences and well-delimited paragraphs',
                  'Abbreviations defined at first occurrence',
                  'SI units required (e.g. kg/ha, mm, °C)',
                  'Scientific names in italics and author names in uppercase',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ background: '#1B4427' }} />
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            {/* Formatting */}
            <section id="formatting" className="mb-10">
              <SectionTitle id="formatting">Document formatting</SectionTitle>
              <Table
                headers={['Element', 'Specification']}
                rows={[
                  ['Font', 'Times New Roman or Arial, 12 pt'],
                  ['Line spacing', '1.5 or double'],
                  ['Margins', '2.5 cm on all sides'],
                  ['Numbering', 'Pages numbered bottom right'],
                  ['Header', 'Abbreviated title (max 50 characters)'],
                  ['Format', 'PDF or Word (.docx), max size 10 MB'],
                ]}
              />
            </section>

            {/* Figures and tables */}
            <section id="figures" className="mb-10">
              <SectionTitle id="figures">Figures and tables</SectionTitle>
              <p className="text-sm mb-3" style={{ color: '#374151', lineHeight: '1.7' }}>
                Figures and tables must be numbered sequentially (Figure 1, Table 1…)
                and accompanied by an explicit caption.
              </p>
              <ul className="space-y-2 text-sm" style={{ color: '#374151' }}>
                {[
                  'Minimum figure resolution: 300 dpi (TIFF, PNG, EPS formats)',
                  'Tables as text (no table images)',
                  'Figure captions below the figure, table captions above',
                  'All figures and raw data available upon request',
                  'No duplication between figures and tables for the same data',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ background: '#1B4427' }} />
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            {/* References */}
            <section id="references" className="mb-10">
              <SectionTitle id="references">References</SectionTitle>
              <p className="text-sm mb-3" style={{ color: '#374151', lineHeight: '1.7' }}>
                JAEI uses the <strong>APA 7th edition</strong> style.{' '}
                <a href="https://apastyle.apa.org/" target="_blank" rel="noopener noreferrer"
                   className="no-underline hover:underline font-medium"
                   style={{ color: '#1E88C8' }}>
                  See the official APA guide →
                </a>
              </p>
              <div className="space-y-3">
                {[
                  { type: 'Article', example: 'Dupont, A., & Martin, B. (2023). Article title. Journal Name, 12(3), 45–60. https://doi.org/10.xxxx' },
                  { type: 'Book', example: 'Author, A. A. (2021). Book title. Publisher.' },
                  { type: 'Chapter', example: 'Author, A. (2022). Chapter title. In B. Editor (Ed.), Book title (pp. 10–30). Publisher.' },
                ].map(({ type, example }) => (
                  <div key={type} className="p-3 rounded-sm" style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                    <p className="text-xs font-semibold mb-1" style={{ color: '#6B7280' }}>{type}</p>
                    <p className="text-xs font-mono" style={{ color: '#374151' }}>{example}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Ethics */}
            <section id="ethics" className="mb-4">
              <SectionTitle id="ethics">Publication ethics and scientific integrity</SectionTitle>
              <div className="p-4 rounded-sm mb-4" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
                <p className="text-sm font-semibold mb-1" style={{ color: '#B91C1C' }}>Anti-plagiarism policy</p>
                <p className="text-sm" style={{ color: '#374151', lineHeight: '1.7' }}>
                  Every submitted manuscript undergoes a similarity check. A similarity rate
                  above 20% results in automatic rejection without peer review.
                </p>
              </div>
              <ul className="space-y-2 text-sm" style={{ color: '#374151' }}>
                {[
                  'Mandatory declaration of financial or non-financial conflicts of interest',
                  'Ethical approval required for any animal or human experimentation',
                  'Informed consent of participants (studies involving people)',
                  'Raw data retained for at least 5 years after publication',
                  'Any modified image must be noted in the caption',
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
