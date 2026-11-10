// Point 3 des statuts — Submission Guidelines and Article Types. Contenu issu des statuts du journal (« STATUS OF THE JOURNAL », version finale du 10/11/2026). Texte fidele au document, avec les seules corrections d'orthographe, de ponctuation et de coherence validees. Balisage inline : **gras**, *italique*, ***gras italique***, {{libelle|/chemin}} = lien interne.
export const SUBMISSION_GUIDELINES = [
 {
  "t": "h",
  "l": 3,
  "text": "Article types"
 },
 {
  "t": "types",
  "rows": [
   [
    "Articles (Original Research Papers)",
    "Up to 10,000 words, 6 display items, 80 references maximum."
   ],
   [
    "Analysis",
    "Up to 5,000 words, 6 display items, 50 references."
   ],
   [
    "Brief Communication",
    "1,000–3,500 words, 2 display items, 20 references."
   ],
   [
    "Correspondence",
    "300–800 words, 1 display item, 10 references."
   ],
   [
    "Feature",
    "Up to 3,000 words, journalistic style."
   ],
   [
    "Letters to the Editor",
    "Up to 3,000 words, journalistic style."
   ],
   [
    "Registered Report",
    "Up to 3,000 words, 8 display items, no reference limit."
   ],
   [
    "Review / Mini Reviews",
    "3,000–15,000 words, 100 references."
   ],
   [
    "Opinions",
    "Up to 3,000 words, journalistic style."
   ],
   [
    "Perspective",
    "Up to 5,000 words, 100 references."
   ],
   [
    "Short Comments",
    "Up to 1,500 words, 15 references."
   ],
   [
    "Short Communications",
    "Up to 3,000 words, journalistic style."
   ],
   [
    "Special Issues",
    "Up to 3,000 words, journalistic style."
   ],
   [
    "Technical Advances / Technical Notes",
    "Up to 3,000 words, journalistic style."
   ]
  ]
 },
 {
  "t": "h",
  "l": 3,
  "text": "Files required"
 },
 {
  "t": "ul",
  "items": [
   {
    "text": "Mandatory: Manuscript files"
   },
   {
    "text": "Optional: Supplementary file, graphical abstract, cover letter and data repository."
   }
  ]
 },
 {
  "t": "h",
  "l": 3,
  "text": "Ethics"
 },
 {
  "t": "p",
  "text": "Authors must disclose conflicts of interest, funding sources, and adhere to publishing ethics (e.g., no plagiarism, inclusive language, sex/gender-based analyses). Details are given in {{Editorial Policies and Ethics|/about#politiques}}."
 },
 {
  "t": "h",
  "l": 3,
  "text": "Data Sharing (recommended)"
 },
 {
  "t": "p",
  "text": "Optional; data must be archived in a public repository with a DOI."
 }
];

// Point 4 des statuts — Simplified author guidelines.
export const SIMPLIFIED_GUIDELINES = [
 {
  "t": "ul",
  "items": [
   {
    "text": "File format: Word"
   },
   {
    "text": "Word files should be in a single-column layout"
   },
   {
    "text": "Line spacing set to 2."
   },
   {
    "text": "Font size 12 and justified text"
   },
   {
    "text": "Normal margins: 2.4 cm for the top, bottom, left, and right."
   },
   {
    "text": "Portrait orientation is required, with line and page numbers included."
   },
   {
    "text": "Article structure:",
    "sub": [
     "Title page (title of the paper, names of the authors and their affiliations, corresponding authors)",
     "Abstract (maximum 250 words)",
     "Introduction",
     "Materials and Methods",
     "Results",
     "Discussion (the authors may merge the Results and Discussion sections)",
     "Conclusion",
     "CRediT authorship contribution statement (optional)",
     "Availability of data and material",
     "Compliance with ethics requirements: This article does not contain any studies involving human or animal subjects",
     "Funding (optional)",
     "Declaration of competing interests",
     "Acknowledgments",
     "References"
    ]
   },
   {
    "text": "Tables and Figures should be placed at the end of the document and must be cited in the order they appear in the text."
   },
   {
    "text": "Reference style within the text:",
    "sub": [
     "According to Bol et al. (2016), N addition can increase forest soil N availability, which may stimulate microbial activity…",
     "…subsequent release of DOP (Goller et al., 2006; Weand et al., 2010)."
    ]
   },
   {
    "text": "Keywords: 4 to 7"
   },
   {
    "text": "Highlights: 3 to 5 bullet points, each a maximum of 90 characters, including spaces."
   }
  ]
 },
 {
  "t": "h",
  "l": 4,
  "text": "References style in the reference section"
 },
 {
  "t": "h",
  "l": 5,
  "text": "Single author"
 },
 {
  "t": "ref",
  "text": "Asaf Y. (2017). Syrian Women and the Refugee Crisis: Surviving the Conflict, Building Peace, and Taking New Gender Roles. *Social Sciences*, **6(3)**, 110."
 },
 {
  "t": "h",
  "l": 5,
  "text": "Two authors"
 },
 {
  "t": "ref",
  "text": "Yoo G. and Kang H. (2012). Effects of biochar addition on greenhouse gas emissions and microbial responses in a short-term laboratory experiment. *Journal of Environmental Quality*, **41(4)**, 1193–1202."
 },
 {
  "t": "h",
  "l": 5,
  "text": "Up to 5 authors"
 },
 {
  "t": "ref",
  "text": "Goller R., Wilcke W., Fleischbein K., Valarezo C. and Zech W. (2006). Dissolved nitrogen, phosphorus, and sulfur forms in the ecosystem fluxes of a montane forest in Ecuador. *Biogeochemistry*, **77(4)**, 57–89."
 },
 {
  "t": "h",
  "l": 5,
  "text": "More than 5 authors"
 },
 {
  "t": "ref",
  "text": "Bol R., Julich D., Brödlin D. et al. (2016). Dissolved and colloidal phosphorus fluxes in forest ecosystems — an almost blind spot in ecosystem research. *Journal of Plant Nutrition and Soil Science*, **179(4)**, 425–438."
 },
 {
  "t": "ul",
  "items": [
   {
    "text": "Formulae and equations must be numbered"
   },
   {
    "text": "Article sections (JAEI does not allow more than three heading levels)"
   }
  ]
 },
 {
  "t": "example",
  "lines": [
   "**1. Materials and methods**",
   "***1.1. Measurements***",
   "*1.1.1. Plant growth*"
  ]
 }
];

// Point 5 des statuts — Guide for authors - Article formats (writing and formatting).
export const GUIDE_FOR_AUTHORS = [
 {
  "t": "h",
  "l": 3,
  "text": "Article structure"
 },
 {
  "t": "ul",
  "items": [
   {
    "text": "Abstract"
   },
   {
    "text": "Introduction"
   },
   {
    "text": "Materials and methods"
   },
   {
    "text": "Results"
   },
   {
    "text": "Discussion (the authors can merge the Results and Discussion sections)"
   },
   {
    "text": "Conclusion"
   },
   {
    "text": "CRediT authorship contribution statement"
   },
   {
    "text": "Availability of data and material",
    "sub": [
     "Data will be made available on request.",
     "All data generated or analyzed during this study are included in this published article (and its supplementary information files).",
     "The datasets used and/or analyzed during the current study are available from the corresponding author on reasonable request.",
     "The datasets generated during and/or analyzed during the current study are available in the [repository name] repository, [DOI/link].",
     "The datasets generated during the current study are not publicly available due to [reason, e.g., privacy/ethical restrictions] but are available from the corresponding author on reasonable request."
    ]
   },
   {
    "text": "Compliance with ethics requirements: This article does not contain any studies involving human or animal subjects."
   },
   {
    "text": "Funding"
   },
   {
    "text": "Declaration of competing interests"
   },
   {
    "text": "Acknowledgments"
   },
   {
    "text": "References"
   }
  ]
 },
 {
  "t": "h",
  "l": 3,
  "text": "File format"
 },
 {
  "t": "p",
  "text": "We ask you to provide editable source files for your entire submission (including figures, tables and text graphics). Some guidelines:"
 },
 {
  "t": "ul",
  "items": [
   {
    "text": "Save files in an editable format, using the extension .doc/.docx for Word files and .tex for LaTeX files. **A PDF is not an acceptable source file.**"
   },
   {
    "text": "Format Word files in a **single-column layout and line spacing 2**"
   },
   {
    "text": "Font size 12 and justified text"
   },
   {
    "text": "Remove any strikethrough and underlined text from your manuscript, unless it has scientific significance related to your article."
   },
   {
    "text": "Use spell-check and grammar-check functions to avoid errors."
   }
  ]
 },
 {
  "t": "note",
  "text": "On this platform, files must be uploaded as Word (.docx) files; figures and the graphical abstract may also be TIFF, EPS, JPEG or PNG images (see “Additional requirements” below)."
 },
 {
  "t": "h",
  "l": 3,
  "text": "Title page"
 },
 {
  "t": "p",
  "text": "You are required to include the following details in the title page information:"
 },
 {
  "t": "ul",
  "items": [
   {
    "text": "*Article title.* Article titles should be concise and informative. Please avoid abbreviations and formulae, where possible, unless they are established and widely understood, e.g. DNA."
   },
   {
    "text": "*Author names*. Provide the given name(s) and family name(s) of each author. The order of authors should match the order in the submission system. Carefully check that all names are accurately spelled. If needed, you can add your name between parentheses in your own script after the English transliteration."
   },
   {
    "text": "*Affiliations.* Add affiliation addresses, referring to where the work was carried out, below the author names. Indicate affiliations using a lower-case superscript letter immediately after the author’s name and in front of the corresponding address. Ensure that you provide the full postal address of each affiliation, including the country name and, if available, the email address of each author."
   },
   {
    "text": "*Corresponding author (up to 2).* Clearly indicate who will handle correspondence for your article at all stages of the refereeing and publication process and also post-publication. This responsibility includes answering any future queries about your results, data, methodology and materials. It is important that the email address and contact details of your corresponding author are kept up to date during the submission and publication process."
   },
   {
    "text": "*Present/permanent address.* If an author has moved since the work described in your article was carried out, or the author was visiting during that time, a “present address” (or “permanent address”) can be indicated by a footnote to the author’s name. The address where the author carried out the work must be retained as their main affiliation address. Use superscript Arabic numerals for such footnotes."
   }
  ]
 },
 {
  "t": "h",
  "l": 3,
  "text": "Abstract"
 },
 {
  "t": "p",
  "text": "You are required to provide a concise and factual abstract which does not exceed **250 words.** The abstract should briefly state the purpose of your research, principal results and major conclusions. Some guidelines:"
 },
 {
  "t": "ul",
  "items": [
   {
    "text": "Abstracts must be able to stand alone as abstracts are often presented separately from the article."
   },
   {
    "text": "Avoid references. If any are essential to include, ensure that you cite the author(s) and year(s)."
   },
   {
    "text": "Avoid non-standard or uncommon abbreviations. If any are essential to include, ensure they are defined within your abstract at first mention."
   }
  ]
 },
 {
  "t": "h",
  "l": 3,
  "text": "Keywords"
 },
 {
  "t": "p",
  "text": "You are required to provide **4 to 7 keywords** for indexing purposes. Keywords should be written in English. Please try to avoid keywords consisting of multiple words (using “and” or “of”)."
 },
 {
  "t": "p",
  "text": "We recommend that you only use abbreviations in keywords if they are firmly established in the field."
 },
 {
  "t": "h",
  "l": 3,
  "text": "Highlights"
 },
 {
  "t": "p",
  "text": "You are required to provide article highlights at submission. Highlights are a short collection of bullet points that should capture the novel results of your research as well as any new methods used during your study. Highlights will help increase the discoverability of your article via search engines. Some guidelines:"
 },
 {
  "t": "ul",
  "items": [
   {
    "text": "Highlights should consist of **3 to 5 bullet points**, each a maximum of **90 characters,** including spaces."
   },
   {
    "text": "Submit highlights as a separate editable file in the online submission system with the word “highlights” included in the file name."
   }
  ]
 },
 {
  "t": "h",
  "l": 3,
  "text": "Graphical abstract"
 },
 {
  "t": "p",
  "text": "You are encouraged to provide a graphical abstract at submission."
 },
 {
  "t": "p",
  "text": "The graphical abstract should summarize the contents of your article in a concise, pictorial form which is designed to capture the attention of a wide readership. A graphical abstract will help draw more attention to your online article and support readers in digesting your research. Some guidelines:"
 },
 {
  "t": "ul",
  "items": [
   {
    "text": "Submit your graphical abstract as a separate file in the online submission system."
   },
   {
    "text": "Ensure the image is a minimum of 531 x 1328 pixels (h x w) or proportionally more and is readable at a size of 5 x 13 cm using a regular screen resolution of 96 dpi."
   },
   {
    "text": "Our preferred file types for graphical abstracts are TIFF, EPS, PDF or MS Office files."
   }
  ]
 },
 {
  "t": "h",
  "l": 3,
  "text": "Math formulae"
 },
 {
  "t": "ul",
  "items": [
   {
    "text": "Submit math equations as editable text, not as images."
   },
   {
    "text": "Present simple formulae in line with normal text, where possible."
   },
   {
    "text": "Use the solidus (/) instead of a horizontal line for small fractional terms such as X/Y."
   },
   {
    "text": "Present variables in italics."
   },
   {
    "text": "Denote powers of e by exp."
   },
   {
    "text": "Display equations separately from your text, numbering them consecutively in the order they are referred to within your text."
   }
  ]
 },
 {
  "t": "h",
  "l": 3,
  "text": "Tables"
 },
 {
  "t": "p",
  "text": "Tables must be submitted as editable text, not as images **at the end of the document**. Some guidelines:"
 },
 {
  "t": "ul",
  "items": [
   {
    "text": "Place tables next to the relevant text or on a separate page(s) at the end of your article."
   },
   {
    "text": "Cite all tables in the manuscript text."
   },
   {
    "text": "Number tables consecutively according to their appearance in the text."
   },
   {
    "text": "Please provide captions along with the tables."
   },
   {
    "text": "Place any table notes below the table body."
   },
   {
    "text": "Avoid vertical rules and shading within table cells."
   }
  ]
 },
 {
  "t": "p",
  "text": "We recommend that you use tables sparingly, ensuring that any data presented in tables is not duplicating results described elsewhere in the article."
 },
 {
  "t": "h",
  "l": 3,
  "text": "Figures, images and artwork"
 },
 {
  "t": "p",
  "text": "Figures, images, artwork, diagrams and other graphical media must be supplied as separate files along with the manuscript **at the end of the document after the Tables**. Some guidelines:"
 },
 {
  "t": "p",
  "text": "When submitting artwork:"
 },
 {
  "t": "ul",
  "items": [
   {
    "text": "Cite all images in the manuscript text."
   },
   {
    "text": "Number images according to the sequence they appear within your article."
   },
   {
    "text": "Submit each image as a separate file using a logical naming convention for your files (for example, Figure_1, Figure_2 etc)."
   },
   {
    "text": "Please provide captions for all figures, images, and artwork."
   },
   {
    "text": "Text graphics may be embedded in the text at the appropriate position. If you are working with LaTeX, text graphics may also be embedded in the file."
   }
  ]
 },
 {
  "t": "p",
  "text": "Please do not submit:"
 },
 {
  "t": "ul",
  "items": [
   {
    "text": "files that are too low in resolution (for example, files optimized for screen use such as GIF, BMP, PICT or WPG files)."
   },
   {
    "text": "disproportionally large images compared to font size, as text may become unreadable."
   }
  ]
 },
 {
  "t": "h",
  "l": 3,
  "text": "Figure captions"
 },
 {
  "t": "p",
  "text": "All images must have a caption. A caption should consist of a brief title (not displayed on the figure itself) and a description of the image. We advise you to keep the amount of text in any image to a minimum, though any symbols and abbreviations used should be explained."
 },
 {
  "t": "p",
  "text": "Provide captions in a separate file."
 },
 {
  "t": "h",
  "l": 3,
  "text": "References style within the text"
 },
 {
  "t": "p",
  "text": "Any references cited within your article should also be present in your reference list and vice versa. Some guidelines:"
 },
 {
  "t": "ul",
  "items": [
   {
    "text": "References cited in your abstract must be given in full."
   }
  ]
 },
 {
  "t": "h",
  "l": 4,
  "text": "Examples in the text:"
 },
 {
  "t": "ref",
  "text": "According to Bol et al. (2016), N addition can increase forest soil N availability, which may stimulate microbial activity…"
 },
 {
  "t": "ref",
  "text": "N addition can stimulate microbial activity, resulting in increased OM decomposition and subsequent release of DOP (Goller et al., 2006; Weand et al., 2010)."
 },
 {
  "t": "ul",
  "items": [
   {
    "text": "We recommend that you do not include unpublished results and personal communications in your reference list, though you may mention them in the text of your article."
   },
   {
    "text": "Any unpublished results and personal communications included in your reference list must follow the standard reference style of the journal. In substitution of the publication date add “unpublished results” or “personal communication.”"
   },
   {
    "text": "References cited as “in press” imply that the item has been accepted for publication."
   }
  ]
 },
 {
  "t": "p",
  "text": "Linking to cite sources will increase the discoverability of your research."
 },
 {
  "t": "p",
  "text": "Before submission, check that all data provided in your reference list are correct, including any references which have been copied. Providing correct reference data allows us to link to abstracting and indexing services such as Scopus, Crossref and PubMed. Any incorrect surnames, journal or book titles, publication years or pagination within your references may prevent link creation. We encourage the use of Digital Object Identifiers (DOIs) as reference links as they provide a permanent link to the electronic article referenced."
 },
 {
  "t": "h",
  "l": 3,
  "text": "References style in the reference section"
 },
 {
  "t": "p",
  "text": "All citations in the text should refer to:"
 },
 {
  "t": "h",
  "l": 5,
  "text": "Single author"
 },
 {
  "t": "ref",
  "text": "Asaf Y. (2017). Syrian Women and the Refugee Crisis: Surviving the Conflict, Building Peace, and Taking New Gender Roles. *Social Sciences*, **6(3)**, 110."
 },
 {
  "t": "h",
  "l": 5,
  "text": "Two authors"
 },
 {
  "t": "ref",
  "text": "Yoo G. and Kang H. (2012). Effects of biochar addition on greenhouse gas emissions and microbial responses in a short-term laboratory experiment. *Journal of Environmental Quality*, **41(4)**, 1193–1202."
 },
 {
  "t": "ref",
  "text": "Biswal BK. and Balasubramanian R. (2025). Use of biomass-derived biochar as a sustainable material for carbon sequestration in soil: recent advancements and future perspectives. *npj Materials Sustainability*, **3(1)**, 26."
 },
 {
  "t": "ref",
  "text": "Patel MR. and Panwar NL. (2023). Biochar from agricultural crop residues: Environmental, production, and life cycle assessment overview. *Resources, Conservation & Recycling Advances*, **19**, 200173."
 },
 {
  "t": "h",
  "l": 5,
  "text": "Up to 5 authors"
 },
 {
  "t": "ref",
  "text": "Goller R., Wilcke W., Fleischbein K., Valarezo C. and Zech W. (2006). Dissolved nitrogen, phosphorus, and sulfur forms in the ecosystem fluxes of a montane forest in Ecuador. *Biogeochemistry*, **77(4)**, 57–89."
 },
 {
  "t": "ref",
  "text": "Clough TJ., Condron LM., Kammann C. and Müller C. (2013). A review of biochar and soil nitrogen dynamics. *Agronomy*, **3(2)**, 275–293."
 },
 {
  "t": "h",
  "l": 5,
  "text": "More than 5 authors"
 },
 {
  "t": "ref",
  "text": "Bol R., Julich D., Brödlin D. et al. (2016). Dissolved and colloidal phosphorus fluxes in forest ecosystems — an almost blind spot in ecosystem research. *Journal of Plant Nutrition and Soil Science*, **179(4)**, 425–438."
 },
 {
  "t": "ref",
  "text": "Feng J., Yu D., Sinsabaugh RL. et al. (2023). Trade-offs in carbon-degrading enzyme activities limit long-term soil carbon sequestration with biochar addition. *Biological Reviews*, **98(4)**, 1184–1199."
 },
 {
  "t": "p",
  "text": "The list of references should be arranged alphabetically and then chronologically if necessary. More than one reference from the same author(s) in the same year must be identified by the letters ‘a’, ‘b’, ‘c’, etc., placed after the year of publication."
 },
 {
  "t": "h",
  "l": 4,
  "text": "Reference to a journal publication with an article number:"
 },
 {
  "t": "ref",
  "text": "Van der Geer J., Handgraaf T. and Lupton RA. (2022). The art of writing a scientific article. *Heliyon*, **19**, e00205."
 },
 {
  "t": "h",
  "l": 4,
  "text": "Reference to a book:"
 },
 {
  "t": "ref",
  "text": "Strunk JW. and White EB. (2000). The Elements of Style, fourth ed. Longman, New York."
 },
 {
  "t": "h",
  "l": 4,
  "text": "Reference to a chapter in a book:"
 },
 {
  "t": "ref",
  "text": "Mettam GR. and Adams LB. (2023). How to prepare an electronic version of your article, in: Jones BS. and Smith RZ. (Eds.), Introduction to the Electronic Age. E-Publishing Inc., New York, pp. 281–304."
 },
 {
  "t": "h",
  "l": 4,
  "text": "Reference to a website:"
 },
 {
  "t": "ref",
  "text": "Cancer Research UK (2023). Cancer statistics reports for the UK. http://www.cancerresearchuk.org/aboutcancer/statistics/cancerstatsreport/ (accessed 13 March 2023)."
 },
 {
  "t": "h",
  "l": 4,
  "text": "Reference to a dataset:"
 },
 {
  "t": "ref",
  "text": "Oguro M., Imahiro S., Saito S. and Nakashizuka T. (2015). Mortality data for Japanese oak wilt disease and surrounding forest compositions [dataset]. Mendeley Data, v1."
 },
 {
  "t": "h",
  "l": 4,
  "text": "Reference to software:"
 },
 {
  "t": "ref",
  "text": "Coon E., Berndt M., Jan A. et al. (2020). Advanced Terrestrial Simulator (ATS) v0.88 (Version 0.88) [software]. Zenodo."
 },
 {
  "t": "h",
  "l": 4,
  "text": "Web references"
 },
 {
  "t": "p",
  "text": "When listing web references, as a minimum you should provide the full URL and the date when the reference was last accessed. Additional information (e.g. DOI, author names, dates or reference to a source publication) should also be provided, if known."
 },
 {
  "t": "p",
  "text": "You can list web references separately under a new heading directly after your reference list or include them in your reference list."
 },
 {
  "t": "h",
  "l": 4,
  "text": "Data references"
 },
 {
  "t": "p",
  "text": "We encourage you to cite underlying or relevant datasets within article text and to list data references in the reference list."
 },
 {
  "t": "p",
  "text": "When citing data references, you should include:"
 },
 {
  "t": "ul",
  "items": [
   {
    "text": "Author name(s)"
   },
   {
    "text": "Dataset title"
   },
   {
    "text": "Data repository"
   },
   {
    "text": "Version (where available)"
   },
   {
    "text": "Year"
   },
   {
    "text": "Global persistent identifier"
   }
  ]
 },
 {
  "t": "p",
  "text": "Add [dataset] immediately before your reference. This will help us to properly identify the dataset. The [dataset] identifier will not appear in your published article."
 },
 {
  "t": "h",
  "l": 3,
  "text": "Generative AI and Figures, images and artwork"
 },
 {
  "t": "p",
  "text": "Please read our policy on the use of generative AI and AI-assisted tools in figures, images and artwork. This policy states:"
 },
 {
  "t": "ul",
  "items": [
   {
    "text": "We do not permit the use of Generative AI or AI-assisted tools to create or alter images in submitted manuscripts."
   },
   {
    "text": "The only exception is if the use of AI or AI-assisted tools is part of the research design or methods (for example, in the field of biomedical imaging). If this is the case, such use must be described in a reproducible manner in the methods section, including the name of the model or tool, version and extension numbers, and manufacturer."
   },
   {
    "text": "The use of generative AI or AI-assisted tools in the production of artwork such as for graphical abstracts is not permitted. The use of generative AI in the production of cover art may in some cases be allowed, if the author obtains prior permission from the journal editor and publisher, can demonstrate that all necessary rights have been cleared for the use of the relevant material, and ensures that there is correct content attribution."
   }
  ]
 },
 {
  "t": "h",
  "l": 3,
  "text": "Supplementary material"
 },
 {
  "t": "p",
  "text": "We encourage the use of supplementary materials such as applications, images and sound clips to enhance research. Some guidelines:"
 },
 {
  "t": "ul",
  "items": [
   {
    "text": "Supplementary material should be accurate and relevant to the research."
   },
   {
    "text": "Cite all supplementary files in the manuscript text."
   },
   {
    "text": "Submit supplementary materials at the same time as your article. Be aware that all supplementary materials provided will appear online in the exact same file type as received. These files will not be formatted or typeset by the production team."
   },
   {
    "text": "Include a concise, descriptive caption for each supplementary file describing its content."
   },
   {
    "text": "Provide updated files if at any stage of the publication process you wish to make changes to submitted supplementary materials."
   },
   {
    "text": "Do not make annotations or corrections to a previous version of a supplementary file."
   },
   {
    "text": "Switch off the option to track changes in Microsoft Office files. If tracked changes are left on, they will appear in your published version."
   }
  ]
 },
 {
  "t": "h",
  "l": 3,
  "text": "Research data"
 },
 {
  "t": "p",
  "text": "We are committed to supporting the storage of, access to and discovery of research data, and our research data policy sets out the principles guiding how we work with the research community to support a more efficient and transparent research process."
 },
 {
  "t": "p",
  "text": "Research data refers to the results of observations or experimentation that validate research findings, which may also include software, code, models, algorithms, protocols, methods and other useful materials related to the project. Please read our guidelines on sharing research data for more information on depositing, sharing and using research data and other relevant research materials."
 },
 {
  "t": "h",
  "l": 4,
  "text": "Research data deposit, citation and linking"
 },
 {
  "t": "p",
  "text": "For this journal, **Option D** instructions from our research data guidelines apply. This means that you are **required** to:"
 },
 {
  "t": "ul",
  "items": [
   {
    "text": "Deposit your research data in a relevant data repository."
   },
   {
    "text": "Cite and link to this dataset in your article."
   }
  ]
 },
 {
  "t": "h",
  "l": 3,
  "text": "Data statement"
 },
 {
  "t": "p",
  "text": "To foster transparency, you are required to state the availability of any data at submission."
 },
 {
  "t": "p",
  "text": "Ensuring data is available may be a requirement of your funding body or institution. If your data is unavailable to access or unsuitable to post, you can state the reason why (e.g., your research data includes sensitive or confidential information such as patient data) during the submission process."
 },
 {
  "t": "h",
  "l": 3,
  "text": "Data linking"
 },
 {
  "t": "p",
  "text": "Linking to the data underlying your work increases your exposure and may lead to new collaborations. It also provides readers with a better understanding of the described research."
 },
 {
  "t": "p",
  "text": "If your research data has been made available in a data repository there are a number of ways your article can be linked directly to the dataset:"
 },
 {
  "t": "ul",
  "items": [
   {
    "text": "Provide a link to your dataset when prompted during the online submission process."
   },
   {
    "text": "For some data repositories, a repository banner will automatically appear next to your published article."
   },
   {
    "text": "You can also link relevant data or entities within the text of your article through the use of identifiers. Use the following format: Database: 12345 (e.g. TAIR: AT1G01020; CCDC: 734053; PDB: 1XFN)."
   }
  ]
 },
 {
  "t": "h",
  "l": 3,
  "text": "Article sections"
 },
 {
  "t": "ul",
  "items": [
   {
    "text": "Divide your article into clearly defined and numbered sections. Number subsections 1.1 (then 1.1.1, 1.1.2, ...), then 1.2, etc."
   },
   {
    "text": "Use the numbering format when cross-referencing within your article. Do not just refer to “the text.”"
   },
   {
    "text": "You may give subsections a brief heading. Headings should appear on a separate line."
   },
   {
    "text": "Do not include the article abstract within section numbering."
   }
  ]
 },
 {
  "t": "p",
  "text": "Examples:"
 },
 {
  "t": "example",
  "lines": [
   "**1. Materials and methods (for heading 1)**",
   "***1.1. Measurements*** **(for heading 2)**",
   "*1.1.1. Plant growth* (for heading 3)"
  ]
 },
 {
  "t": "p",
  "text": "**JAEI does not allow more than three heading levels.**"
 },
 {
  "t": "h",
  "l": 3,
  "text": "Glossary"
 },
 {
  "t": "p",
  "text": "Please provide definitions of field-specific terms used in your article, in a separate list."
 },
 {
  "t": "h",
  "l": 3,
  "text": "Footnotes"
 },
 {
  "t": "p",
  "text": "We advise you to use footnotes sparingly. If you include footnotes in your article, ensure that they are numbered consecutively. You may use system features that automatically build footnotes into text. Alternatively, you can indicate the position of footnotes within the text and present them in a separate section at the end of your article."
 },
 {
  "t": "h",
  "l": 3,
  "text": "Acknowledgments"
 },
 {
  "t": "p",
  "text": "Include any individuals who provided you with help during your research, such as help with language, writing or proof reading, in the acknowledgements section. Acknowledgements should be placed in a separate section which appears directly before the reference list. Do not include acknowledgements on your title page, as a footnote to your title, or anywhere else in your article other than in the separate acknowledgements section."
 },
 {
  "t": "h",
  "l": 3,
  "text": "Author contributions: CRediT"
 },
 {
  "t": "p",
  "text": "Corresponding authors are required to acknowledge co-author contributions using CRediT (Contributor Roles Taxonomy) roles:"
 },
 {
  "t": "ul",
  "items": [
   {
    "text": "Conceptualization"
   },
   {
    "text": "Data curation"
   },
   {
    "text": "Formal analysis"
   },
   {
    "text": "Funding acquisition"
   },
   {
    "text": "Investigation"
   },
   {
    "text": "Methodology"
   },
   {
    "text": "Project administration"
   },
   {
    "text": "Resources"
   },
   {
    "text": "Software"
   },
   {
    "text": "Supervision"
   },
   {
    "text": "Validation"
   },
   {
    "text": "Visualization"
   },
   {
    "text": "Writing – original draft"
   },
   {
    "text": "Writing – review and editing"
   }
  ]
 },
 {
  "t": "p",
  "text": "Not all CRediT roles will apply to every manuscript and some authors may contribute through multiple roles."
 },
 {
  "t": "h",
  "l": 3,
  "text": "Funding sources"
 },
 {
  "t": "p",
  "text": "Authors must disclose any funding sources that provided financial support for the conduct of the research and/or preparation of the article. The role of sponsors, if any, should be declared in relation to the study design, collection, analysis and interpretation of data, writing of the report and decision to submit the article for publication. If funding sources had no such involvement this should be stated in your submission."
 },
 {
  "t": "h",
  "l": 3,
  "text": "Appendices"
 },
 {
  "t": "p",
  "text": "We ask you to use the following format for appendices:"
 },
 {
  "t": "ul",
  "items": [
   {
    "text": "Identify individual appendices within your article using the format: A, B, etc."
   },
   {
    "text": "Give separate numbering to formulae and equations within appendices using formats such as Eq. (A.1), Eq. (A.2), or Eq. (a.1), Eq. (a.2), etc. and in subsequent appendices, Eq. (B.1), Eq. (B.2) etc. In a similar way, give separate numbering to tables and figures using formats such as Table A.1; Fig. A.1, etc."
   }
  ]
 }
];
