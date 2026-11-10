import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import ContentBlocks, { Inline } from '../../components/content/ContentBlocks';
import { SUBMISSION_GUIDELINES, SIMPLIFIED_GUIDELINES, GUIDE_FOR_AUTHORS } from '../../content/authorGuide';

// ============================================================
// Author Guidelines — JAEI Platform
// Source : Statuts officiels JAEI, points 3, 4 et 5 (contenu dans src/content/authorGuide.js)
//   • point 3 : Submission Guidelines and Article Types
//   • point 4 : Simplified author guidelines
//   • point 5 : Guide for authors — Article formats (writing and formatting)
//     → ancre #guide-for-authors : cible du bouton « Guide for authors » du menu principal
// « Additional requirements » : exigences complémentaires de la plateforme, demandées
// précédemment par le client (elles ne contredisent pas les statuts).
// Les politiques éditoriales (point 6) sont sur la page About (#politiques).
// ============================================================

const sections = [
  { id: 'submission-guidelines', label: 'Submission guidelines and article types' },
  { id: 'simplified-guidelines', label: 'Simplified author guidelines' },
  { id: 'guide-for-authors',     label: 'Guide for authors' },
  { id: 'additional',            label: 'Additional requirements' },
];

const SectionTitle = ({ children }) => (
  <h2 className="text-lg font-bold mb-4 pb-2"
      style={{ color: '#1B4427', borderBottom: '2px solid #E5E7EB' }}>
    {children}
  </h2>
);

const SubTitle = ({ children, first }) => (
  <h3 className={`text-sm font-bold mb-3 ${first ? '' : 'mt-7'}`} style={{ color: '#1B4427' }}>{children}</h3>
);

const Table = ({ headers, rows }) => (
  <div className="overflow-x-auto mb-4">
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr style={{ background: '#1B4427' }}>
          {headers.map(h => (
            <th key={h} className="px-4 py-2.5 text-left font-semibold"
                style={{ color: '#fff' }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i}
              style={{ background: i % 2 === 0 ? '#fff' : '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
            {row.map((cell, j) => (
              <td key={j} className="px-4 py-2.5" style={{ color: '#374151' }}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const Bullet = ({ color = '#1B4427', items }) => (
  <ul className="space-y-2 text-sm mb-4" style={{ color: '#374151', lineHeight: '1.7' }}>
    {items.map((item, i) => (
      <li key={i} className="flex items-start gap-2">
        <span className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ background: color }} />
        <div className="min-w-0"><Inline text={item} /></div>
      </li>
    ))}
  </ul>
);

const Para = ({ children }) => (
  <p className="text-sm mb-3" style={{ color: '#374151', lineHeight: '1.7' }}>{children}</p>
);

const AuthorInstructions = () => {
  const [activeSection, setActiveSection] = useState('submission-guidelines');
  const location = useLocation();
  const mountedAt = useRef(Date.now());

  const scrollTo = (id) => {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Lien avec ancre (ex. bouton « Guide for authors » du menu : /author-instructions#guide-for-authors).
  // On attend la fin de l'animation d'entrée de la page (0,4 s) pour que la position visée soit exacte.
  useEffect(() => {
    if (!location.hash) return undefined;
    const id = decodeURIComponent(location.hash.slice(1));
    const wait = Math.max(0, 450 - (Date.now() - mountedAt.current));
    const t = setTimeout(() => {
      const el = document.getElementById(id);
      if (el) { setActiveSection(id); el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    }, wait);
    return () => clearTimeout(t);
  }, [location.key, location.hash]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) setActiveSection(visible[0].target.id);
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0 }
    );
    sections.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

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
          <p className="text-base" style={{ color: 'rgba(255,255,255,0.75)', maxWidth: '620px' }}>
            Official submission requirements for manuscripts submitted to JAEI.
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
                      color:      activeSection === s.id ? '#1B4427' : '#6B7280',
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
                <Link to="/about#politiques" className="block text-xs no-underline" style={{ color: '#1E88C8' }}>
                  Editorial policies and ethics →
                </Link>
              </div>
            </div>
          </aside>

          {/* Article */}
          <article className="flex-1 min-w-0 bg-white rounded-sm px-8 py-8"
                   style={{ border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>

            {/* ── Point 3 des statuts ── */}
            <section id="submission-guidelines" className="mb-12 scroll-mt-24">
              <SectionTitle>Submission Guidelines and Article Types</SectionTitle>
              <ContentBlocks blocks={SUBMISSION_GUIDELINES} />
            </section>

            {/* ── Point 4 des statuts ── */}
            <section id="simplified-guidelines" className="mb-12 scroll-mt-24">
              <SectionTitle>Simplified Author Guidelines</SectionTitle>
              <ContentBlocks blocks={SIMPLIFIED_GUIDELINES} />
            </section>

            {/* ── Point 5 des statuts (cible du bouton « Guide for authors ») ── */}
            <section id="guide-for-authors" className="mb-12 scroll-mt-24">
              <SectionTitle>Guide for Authors – Article Formats (Writing and Formatting)</SectionTitle>
              <ContentBlocks blocks={GUIDE_FOR_AUTHORS} />
            </section>

            {/* ── Exigences complémentaires de la plateforme (conservées) ── */}
            <section id="additional" className="mb-4 scroll-mt-24">
              <SectionTitle>Additional requirements</SectionTitle>
              <Para>
                In addition to the guidelines above, the following requirements apply to manuscripts submitted through this platform.
              </Para>

              <SubTitle first>Files on this platform</SubTitle>
              <Table
                headers={['Element', 'Specification']}
                rows={[
                  ['File format', 'Word (.docx) only. Figures and the graphical abstract may also be TIFF, EPS, JPEG or PNG images.'],
                  ['Maximum file size', '10 MB per file'],
                ]}
              />

              <SubTitle>Language and writing style</SubTitle>
              <Para>
                JAEI accepts manuscripts in <strong>English</strong> and in <strong>French</strong>.
                Authors writing in their second language are strongly encouraged to have their manuscript
                professionally proofread before submission. The writing style must be clear, precise,
                and free of unnecessary jargon.
              </Para>
              <Bullet items={[
                'Active voice preferred over passive voice wherever appropriate',
                'Short sentences and well-delimited paragraphs',
                'All abbreviations defined at first occurrence in both the abstract and the main text',
                'SI units required throughout (e.g. kg ha⁻¹, mm, °C)',
                'Scientific species names in italics; authority names in uppercase (e.g. LINNAEUS)',
                'Numbers below 10 written in full, except when paired with units',
              ]} />

              <SubTitle>Title page, keywords and highlights</SubTitle>
              <Bullet items={[
                'Corresponding author(s): up to 2 — name, address, telephone, and email',
                'Keywords should not duplicate words already in the title and should be separated by commas',
                'Each highlight should be a complete sentence',
              ]} />

              <SubTitle>Mathematical content</SubTitle>
              <Bullet items={[
                'All equations must be numbered consecutively in parentheses: (1), (2)…',
                'Greek letters and special symbols must be clearly identified at first use',
                'Avoid sub-scripts and super-scripts within running text wherever possible',
              ]} />

              <SubTitle>Section-by-section guidance</SubTitle>
              <Para>
                Original research papers and review articles should follow the IMRAD structure.
                Other article types may use a format appropriate to the content.
              </Para>
              <Table
                headers={['Section', 'Guidance']}
                rows={[
                  ['Introduction', 'State the context, identify the gap in knowledge, and present the research objective(s) or hypothesis.'],
                  ['Materials and Methods', 'Describe the study site, experimental design, data collection, and statistical analysis in sufficient detail for reproducibility.'],
                  ['Results', 'Present findings in a logical sequence using text, tables, and figures. Do not discuss results in this section.'],
                  ['Discussion', 'Interpret results in light of existing knowledge. Authors may merge Results and Discussion.'],
                  ['Conclusion', 'Summarize the main findings and their significance. Avoid repeating the abstract verbatim.'],
                  ['CRediT Authorship Statement', 'Optional. Acknowledge each co-author\'s contribution using CRediT taxonomy roles.'],
                  ['Availability of Data and Material', 'Mandatory. State how and where data can be accessed, or justify any restrictions.'],
                  ['Compliance with Ethics', 'Mandatory. State that the article contains no studies involving human or animal subjects, or provide the ethical approval reference.'],
                  ['Funding', 'Optional. Disclose all funding sources and the role of sponsors.'],
                  ['Declaration of Competing Interests', 'Mandatory for all authors.'],
                  ['Acknowledgments', 'Thank individuals who contributed but do not qualify for authorship.'],
                  ['References', 'JAEI author-year style (see “References style in the reference section” above).'],
                ]}
              />

              <SubTitle>Figures and tables</SubTitle>
              <Para>
                <strong>Figures</strong>
              </Para>
              <Bullet items={[
                'Minimum resolution: 300 dpi for halftones; 600–1200 dpi for line art',
                'Accepted formats: TIFF, EPS, JPEG or PNG (JPEG preferably for photographs), or embedded in your Word file — 10 MB maximum per file',
                'Color figures published at no extra charge; authors must ensure grayscale readability',
                'All raw data and original figure files available upon request',
                'Manipulated images must be disclosed in the caption',
              ]} />
              <Para>
                <strong>Tables</strong>
              </Para>
              <Bullet items={[
                'Captions placed above the table',
                'Footnotes to tables indicated by superscript lowercase letters (a, b, c…)',
              ]} />

              <SubTitle>References</SubTitle>
              <Bullet items={[
                'Author names: surname followed by initials, no comma between them — e.g. Goller R.',
                'Multiple authors separated by commas; last author preceded by “and” (not “&”)',
                'DOIs included where available',
              ]} />

              <SubTitle>Publication ethics and scientific integrity</SubTitle>
              <div className="p-4 rounded-sm mb-4" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
                <p className="text-sm font-semibold mb-1" style={{ color: '#B91C1C' }}>Anti-plagiarism policy</p>
                <p className="text-sm" style={{ color: '#374151', lineHeight: '1.7' }}>
                  All submitted manuscripts undergo a similarity check before review. A similarity index
                  above <strong>20%</strong> results in automatic rejection without peer review. Self-plagiarism
                  of previously published work is equally prohibited.
                </p>
              </div>
              <Bullet color="#B91C1C" items={[
                'Mandatory declaration of all financial and non-financial conflicts of interest for every author',
                'Ethical committee approval required for any study involving animals or human participants; approval number must be cited',
                'Informed written consent of all participants in studies involving people',
                'Raw data must be retained for at least 5 years after publication and provided upon reasonable request',
                'Any digitally enhanced or modified image must be disclosed with a note in the figure caption',
                'Duplicate submission (submitting the same manuscript to another journal simultaneously) is prohibited',
                'Authorship changes after submission require written justification and approval by the journal editor',
              ]} />
              <Para>
                The complete editorial policies of the journal are published in{' '}
                <Inline text="{{Editorial Policies and Ethics|/about#politiques}}" />.
              </Para>

              <SubTitle>Generative AI usage policy</SubTitle>
              <div className="p-4 rounded-sm mb-4" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                <p className="text-sm font-semibold mb-1" style={{ color: '#1B4427' }}>
                  Generative AI is not an author
                </p>
                <p className="text-sm" style={{ color: '#374151', lineHeight: '1.7' }}>
                  AI and AI-assisted tools (e.g. ChatGPT, Gemini, Copilot) cannot be listed as authors.
                  Authorship implies accountability for the integrity of the work — a responsibility that
                  AI systems cannot assume.
                </p>
              </div>

              <h4 className="text-sm font-semibold mb-2 mt-4" style={{ color: '#111827' }}>Permitted uses</h4>
              <Para>
                JAEI permits the responsible use of AI-assisted tools to improve the clarity,
                grammar, and readability of a manuscript. Authors who use such tools must:
              </Para>
              <Bullet items={[
                'Disclose any use of generative AI tools in the manuscript preparation process',
                'Review, verify, and take full responsibility for all AI-generated or AI-assisted content',
                'Never use AI to fabricate, manipulate, or misrepresent data, results, images, or references',
                'Include the mandatory declaration statement directly before the References section',
              ]} />

              <h4 className="text-sm font-semibold mb-2 mt-4" style={{ color: '#111827' }}>AI-generated figures and artwork</h4>
              <Para>
                The use of AI image-generation tools (e.g. DALL·E, Midjourney, Stable Diffusion)
                to create or modify scientific figures is <strong>not permitted</strong> unless the
                methodology of the study explicitly concerns AI-generated imagery.
                Any such use must be disclosed and justified in the Methods section.
              </Para>

              <h4 className="text-sm font-semibold mb-2 mt-4" style={{ color: '#111827' }}>Required declaration template</h4>
              <div className="p-4 rounded-sm" style={{ background: '#F3F4F6', border: '1px solid #E5E7EB' }}>
                <p className="text-sm font-semibold mb-2" style={{ color: '#374151' }}>
                  To be placed directly before the References section
                </p>
                <p className="text-sm italic" style={{ color: '#6B7280', lineHeight: '1.7' }}>
                  “During the preparation of this work the author(s) used [NAME OF TOOL] in order to
                  [REASON / TASK]. After using this tool/service, the author(s) reviewed and edited the content
                  as needed and take(s) full responsibility for the content of the published article.”
                </p>
                <p className="text-xs mt-3" style={{ color: '#9CA3AF' }}>
                  No disclosure is required for basic spelling and grammar checks (e.g. Grammarly, spell-checker).
                  This policy applies to the preparation of manuscripts by authors; reviewers and editors must not use
                  generative AI tools for reviewing or editorial decisions (see{' '}
                  <Link to="/about#politiques" className="no-underline hover:underline" style={{ color: '#1E88C8' }}>
                    Editorial Policies and Ethics
                  </Link>).
                </p>
              </div>
            </section>

          </article>
        </div>
      </div>

    </Layout>
  );
};

export default AuthorInstructions;
