import { useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../components/layout/Layout';

// ============================================================
// Author Guidelines — JAEI Platform
// Source : Statuts officiels JAEI, sections 4, 5 et 6
// ============================================================

const sections = [
  { id: 'scope',        label: 'Scope and article types' },
  { id: 'language',     label: 'Language and style' },
  { id: 'preparation',  label: 'Manuscript preparation' },
  { id: 'structure',    label: 'Article structure' },
  { id: 'figures',      label: 'Figures and tables' },
  { id: 'references',   label: 'References (JAEI style)' },
  { id: 'ethics',       label: 'Ethics and integrity' },
  { id: 'ai-policy',    label: 'AI usage policy' },
];

const SectionTitle = ({ id, children }) => (
  <h2 id={id} className="text-lg font-bold mb-4 pb-2"
      style={{ color: '#1B4427', borderBottom: '2px solid #E5E7EB' }}>
    {children}
  </h2>
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
  <ul className="space-y-2 text-sm" style={{ color: '#374151' }}>
    {items.map((item, i) => (
      <li key={i} className="flex items-start gap-2">
        <span className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ background: color }} />
        {item}
      </li>
    ))}
  </ul>
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
              </div>
            </div>
          </aside>

          {/* Article */}
          <article className="flex-1 min-w-0 bg-white rounded-sm px-8 py-8"
                   style={{ border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>

            {/* ── Scope and article types ── */}
            <section id="scope" className="mb-10">
              <SectionTitle id="scope">Scope and article types</SectionTitle>
              <p className="text-sm mb-4" style={{ color: '#374151', lineHeight: '1.7' }}>
                JAEI publishes original work across seven thematic domains covering agricultural and environmental sciences.
                Manuscripts must be submitted in one of the following article types:
              </p>
              <Table
                headers={['Type', 'Description', 'Approx. length']}
                rows={[
                  ['Articles / Original Research Papers', 'Full reports of original experimental or observational research', '5,000 – 10,000 words'],
                  ['Review / Mini Reviews', 'Critical and comprehensive synthesis of the literature on a topic', '8,000 – 15,000 words'],
                  ['Brief Communication', 'Focused report of a single finding or methodological contribution', '2,000 – 4,000 words'],
                  ['Short Communications', 'Preliminary or noteworthy results of limited scope', '1,500 – 3,000 words'],
                  ['Registered Reports', 'Pre-registered study protocol evaluated prior to data collection', '3,000 – 8,000 words'],
                  ['Perspective', 'Forward-looking viewpoint grounded in evidence and expertise', '1,500 – 3,000 words'],
                  ['Opinions', 'Expert commentary presenting a reasoned position on a scientific question', '1,000 – 2,500 words'],
                  ['Analysis', 'Quantitative or qualitative examination of a dataset or policy', '3,000 – 6,000 words'],
                  ['Feature', 'In-depth thematic article for a broad scientific audience', '2,000 – 4,000 words'],
                  ['Correspondence', 'Response to a published article or general scientific observation', '500 – 1,500 words'],
                  ['Letters to the Editor', 'Brief comment on a recently published article in JAEI', '500 – 1,000 words'],
                  ['Short Comments', 'Concise reaction to an article, dataset, or event', '300 – 800 words'],
                  ['Technical Advances / Technical Notes', 'Description of a new method, protocol, or instrument', '2,000 – 4,000 words'],
                  ['Special Issues', 'Thematic collections coordinated by guest editors', 'Variable'],
                ]}
              />
            </section>

            {/* ── Language and style ── */}
            <section id="language" className="mb-10">
              <SectionTitle id="language">Language and writing style</SectionTitle>
              <p className="text-sm mb-3" style={{ color: '#374151', lineHeight: '1.7' }}>
                JAEI accepts manuscripts in <strong>English</strong> and in <strong>French</strong>.
                Authors writing in their second language are strongly encouraged to have their manuscript
                professionally proofread before submission. The writing style must be clear, precise,
                and free of unnecessary jargon.
              </p>
              <Bullet items={[
                'Active voice preferred over passive voice wherever appropriate',
                'Short sentences and well-delimited paragraphs',
                'All abbreviations defined at first occurrence in both the abstract and the main text',
                'SI units required throughout (e.g. kg ha⁻¹, mm, °C)',
                'Scientific species names in italics; authority names in uppercase (e.g. LINNAEUS)',
                'Numbers below 10 written in full, except when paired with units',
              ]} />
            </section>

            {/* ── Manuscript preparation ── */}
            <section id="preparation" className="mb-10">
              <SectionTitle id="preparation">Manuscript preparation</SectionTitle>

              <h3 className="text-sm font-bold mb-3" style={{ color: '#1B4427' }}>File format and layout</h3>
              <Table
                headers={['Element', 'Specification']}
                rows={[
                  ['File format', 'PDF or Word (.docx) — maximum 10 MB'],
                  ['Font', 'Times New Roman or Arial, 12 pt'],
                  ['Line spacing', 'Double (2) throughout'],
                  ['Margins', '2.4 cm on all sides'],
                  ['Page numbering', 'Bottom right, starting from page 1'],
                  ['Running head', 'Abbreviated title, maximum 50 characters'],
                ]}
              />

              <h3 className="text-sm font-bold mb-3 mt-6" style={{ color: '#1B4427' }}>Title page (mandatory, separate)</h3>
              <Bullet items={[
                'Full article title — no abbreviations or acronyms',
                'Complete author list: first name, last name, and institutional affiliation for each author',
                'Corresponding author: name, institutional address, telephone, and email address',
                'Author contributions (e.g. using CRediT taxonomy)',
                'Conflict of interest declaration',
                'Acknowledgements (funding bodies, technical assistance)',
                'Word count of the main text (excluding title page, abstract, references, figures, and tables)',
              ]} />

              <h3 className="text-sm font-bold mb-3 mt-6" style={{ color: '#1B4427' }}>Abstract</h3>
              <p className="text-sm mb-2" style={{ color: '#374151', lineHeight: '1.7' }}>
                A structured abstract of <strong>maximum 250 words</strong> is required for all article types
                except Letters, Short Comments, and Correspondence. The abstract must be self-contained
                (no references, no undefined abbreviations) and should cover:
              </p>
              <Bullet items={[
                'Background / Context — why this research matters',
                'Objectives — what the study set out to answer',
                'Methods — key methodological approach',
                'Results — main findings with specific data where possible',
                'Conclusion — principal implication or recommendation',
              ]} />

              <h3 className="text-sm font-bold mb-3 mt-6" style={{ color: '#1B4427' }}>Keywords</h3>
              <p className="text-sm mb-2" style={{ color: '#374151', lineHeight: '1.7' }}>
                Provide <strong>4 to 7 keywords</strong> that capture the key topics of your manuscript.
                Keywords should not duplicate words already in the title, must not contain abbreviations or
                acronyms, and should be separated by commas.
              </p>

              <h3 className="text-sm font-bold mb-3 mt-6" style={{ color: '#1B4427' }}>Highlights (recommended)</h3>
              <p className="text-sm mb-2" style={{ color: '#374151', lineHeight: '1.7' }}>
                Authors are invited to submit 3 to 5 bullet-point highlights summarising the core findings.
                Each highlight should be a complete sentence of no more than 90 characters (including spaces).
              </p>

              <h3 className="text-sm font-bold mb-3 mt-6" style={{ color: '#1B4427' }}>Graphical abstract (recommended)</h3>
              <p className="text-sm" style={{ color: '#374151', lineHeight: '1.7' }}>
                A single image (minimum 531 × 1328 pixels, TIFF or EPS) that summarises the main finding
                of the article visually. Text within the image should use a minimum 12 pt font.
              </p>

              <h3 className="text-sm font-bold mb-3 mt-6" style={{ color: '#1B4427' }}>Mathematical content</h3>
              <Bullet items={[
                'Simple in-line equations may be written directly in the text',
                'All equations must be numbered consecutively in parentheses: (1), (2)…',
                'Greek letters and special symbols must be clearly identified at first use',
                'Avoid sub-scripts and super-scripts within running text wherever possible',
              ]} />
            </section>

            {/* ── Article structure ── */}
            <section id="structure" className="mb-10">
              <SectionTitle id="structure">Article structure (original research)</SectionTitle>
              <p className="text-sm mb-3" style={{ color: '#374151', lineHeight: '1.7' }}>
                Original research papers and review articles should follow the IMRAD structure.
                Other article types may use a format appropriate to the content.
              </p>
              <Table
                headers={['Section', 'Guidance']}
                rows={[
                  ['Introduction', 'State the context, identify the gap in knowledge, and present the research objective(s) or hypothesis.'],
                  ['Materials and Methods', 'Describe the study site, experimental design, data collection, and statistical analysis in sufficient detail for reproducibility.'],
                  ['Results', 'Present findings in a logical sequence using text, tables, and figures. Do not discuss results in this section.'],
                  ['Discussion', 'Interpret results in light of existing knowledge, acknowledge limitations, and state implications.'],
                  ['Conclusion', 'Summarise the main findings and their significance. Avoid repeating the abstract verbatim.'],
                  ['Acknowledgements', 'Thank individuals who contributed but do not qualify for authorship, and cite all funding sources.'],
                  ['Conflict of Interest', 'Mandatory declaration for all authors.'],
                  ['References', 'JAEI author-year style (see section below).'],
                ]}
              />
            </section>

            {/* ── Figures and tables ── */}
            <section id="figures" className="mb-10">
              <SectionTitle id="figures">Figures and tables</SectionTitle>
              <p className="text-sm mb-3" style={{ color: '#374151', lineHeight: '1.7' }}>
                Figures and tables must be numbered sequentially (Figure 1, Table 1…) and
                cited in the text in order of appearance. Every figure and table must be
                accompanied by an explicit, stand-alone caption.
              </p>

              <h3 className="text-sm font-bold mb-2 mt-4" style={{ color: '#1B4427' }}>Figures</h3>
              <Bullet items={[
                'Minimum resolution: 300 dpi for halftones; 600–1200 dpi for line art',
                'Accepted formats: TIFF, PNG, EPS (JPEG acceptable for photographs only)',
                'Captions placed below the figure',
                'Colour figures published at no extra charge; authors must ensure greyscale readability',
                'All raw data and original figure files available upon request',
                'Manipulated images must be disclosed in the caption',
              ]} />

              <h3 className="text-sm font-bold mb-2 mt-4" style={{ color: '#1B4427' }}>Tables</h3>
              <Bullet items={[
                'Submitted as editable text, never as image files',
                'Captions placed above the table',
                'No duplication between figures and tables for the same dataset',
                'Footnotes to tables indicated by superscript lowercase letters (a, b, c…)',
              ]} />
            </section>

            {/* ── References ── */}
            <section id="references" className="mb-10">
              <SectionTitle id="references">References (JAEI style)</SectionTitle>
              <p className="text-sm mb-3" style={{ color: '#374151', lineHeight: '1.7' }}>
                JAEI uses its own author-year reference style. References are listed
                <strong> alphabetically</strong> by first author's surname and then chronologically.
                Multiple references from the same author(s) in the same year are distinguished by
                letters a, b, c… after the year.
              </p>
              <Bullet items={[
                'In-text: According to Bol et al. (2016)… or …(Goller et al., 2006; Ella et al., 2010)',
                'Author names: surname followed by initials, no comma between them — e.g. Goller R.',
                'Multiple authors separated by commas; last author preceded by "and" (not "&")',
                'More than 5 authors: first author et al. — e.g. Bol R., Julich D., Brödlin D et al.',
                'DOIs included where available',
                'Maximum 80 references for original articles; 50 for Analysis; 20 for Brief Communication; 100 for Reviews',
              ]} />
              <div className="space-y-3 mt-4">
                {[
                  {
                    type: 'Single author',
                    example: 'Asaf Y. (2017). Syrian Women and the Refugee Crisis: Surviving the Conflict, Building Peace, and Taking New Gender Roles. Social Sciences, 6, 110.',
                  },
                  {
                    type: 'Two authors',
                    example: 'Yoo G. and Kang H. (2012). Effects of biochar addition on greenhouse gas emissions and microbial responses in a short-term laboratory experiment. Journal of Environmental Quality, 41(4), 1193–1202.',
                  },
                  {
                    type: 'Up to 5 authors',
                    example: 'Goller R., Wilcke W., Fleischbein K., Valarezo C. and Zech W. (2006). Dissolved nitrogen, phosphorus, and sulfur forms in the ecosystem fluxes of a montane forest in Ecuador. Biogeochemistry, 77, 57–89.',
                  },
                  {
                    type: 'More than 5 authors',
                    example: 'Bol R., Julich D., Brödlin D et al. (2016). Dissolved and colloidal phosphorus fluxes in forest ecosystems — an almost blind spot in ecosystem research. Journal of Plant Nutrition and Soil Science, 179, 425–438.',
                  },
                  {
                    type: 'Book',
                    example: 'Strunk JW. and White EB. (2000). The Elements of Style, fourth ed. Longman, New York.',
                  },
                  {
                    type: 'Book chapter',
                    example: 'Mettam GR. and Adams LB. (2023). How to prepare an electronic version of your article, in: Jones BS. and Smith RZ. (Eds.), Introduction to the Electronic Age. E-Publishing Inc., New York, pp. 281–304.',
                  },
                ].map(({ type, example }) => (
                  <div key={type} className="p-3 rounded-sm" style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                    <p className="text-xs font-semibold mb-1" style={{ color: '#6B7280' }}>{type}</p>
                    <p className="text-xs font-mono" style={{ color: '#374151' }}>{example}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* ── Ethics and integrity ── */}
            <section id="ethics" className="mb-10">
              <SectionTitle id="ethics">Publication ethics and scientific integrity</SectionTitle>

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
                'Authorship changes after submission require written justification and approval by the editor-in-chief',
              ]} />
            </section>

            {/* ── AI usage policy ── */}
            <section id="ai-policy" className="mb-4">
              <SectionTitle id="ai-policy">Generative AI usage policy</SectionTitle>

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

              <h3 className="text-sm font-bold mb-2 mt-4" style={{ color: '#1B4427' }}>Permitted uses</h3>
              <p className="text-sm mb-3" style={{ color: '#374151', lineHeight: '1.7' }}>
                JAEI permits the responsible use of AI-assisted tools to improve the clarity,
                grammar, and readability of a manuscript. Authors who use such tools must:
              </p>
              <Bullet items={[
                'Disclose any use of generative AI tools in the manuscript preparation process',
                'Review, verify, and take full responsibility for all AI-generated or AI-assisted content',
                'Never use AI to fabricate, manipulate, or misrepresent data, results, images, or references',
                'Include the mandatory declaration statement directly before the References section',
              ]} />

              <h3 className="text-sm font-bold mb-2 mt-5" style={{ color: '#1B4427' }}>AI-generated figures and artwork</h3>
              <p className="text-sm mb-3" style={{ color: '#374151', lineHeight: '1.7' }}>
                The use of AI image-generation tools (e.g. DALL·E, Midjourney, Stable Diffusion)
                to create or modify scientific figures is <strong>not permitted</strong> unless the
                methodology of the study explicitly concerns AI-generated imagery.
                Any such use must be disclosed and justified in the Methods section.
              </p>

              <h3 className="text-sm font-bold mb-2 mt-5" style={{ color: '#1B4427' }}>Required declaration template</h3>
              <div className="p-4 rounded-sm" style={{ background: '#F3F4F6', border: '1px solid #E5E7EB' }}>
                <p className="text-sm font-semibold mb-2" style={{ color: '#374151' }}>
                  To be placed directly before the References section
                </p>
                <p className="text-sm italic" style={{ color: '#6B7280', lineHeight: '1.7' }}>
                  "During the preparation of this work the author(s) used [NAME OF TOOL] in order to
                  [REASON / TASK]. After using this tool/service, the author(s) reviewed and edited the content
                  as needed and take(s) full responsibility for the content of the published article."
                </p>
                <p className="text-xs mt-3" style={{ color: '#9CA3AF' }}>
                  No disclosure is required for basic spelling and grammar checks (e.g. Grammarly, spell-checker).
                  This policy applies to the preparation of manuscripts only; reviewers and editors are similarly
                  required to disclose AI assistance.
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
