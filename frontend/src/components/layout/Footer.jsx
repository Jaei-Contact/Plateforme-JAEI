import { Link } from 'react-router-dom';

// ============================================================
// Footer — ScienceDirect / Elsevier style
// ============================================================

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-neutral-800 text-neutral-300 mt-auto">
      {/* Main content */}
      <div className="page-container py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">

          {/* Column 1 — About the journal */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <img src="/logo-jaei.jpeg" alt="JAEI" className="h-8 w-auto object-contain flex-shrink-0" />
              <div>
                <div className="text-white font-bold text-sm">JAEI</div>
              </div>
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed mb-3">
              Journal of Agricultural and Environmental Innovation — peer-reviewed scientific
              journal dedicated to innovations in agriculture and the environment.
            </p>
            <p className="text-xs text-neutral-500">
              ISSN: to be defined
            </p>
          </div>

          {/* Column 2 — Navigation */}
          <div>
            <h4 className="text-white text-sm font-semibold mb-4 uppercase tracking-wider">
              Navigation
            </h4>
            <ul className="space-y-2">
              {[
                { label: 'Home',                 path: '/' },
                { label: 'Published articles',   path: '/articles' },
                { label: 'Submit an article',    path: '/author/submit' },
                { label: 'About the journal',    path: '/about' },
              ].map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className="text-xs text-neutral-400 hover:text-white no-underline
                               transition-colors duration-150"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3 — For authors */}
          <div>
            <h4 className="text-white text-sm font-semibold mb-4 uppercase tracking-wider">
              For Authors
            </h4>
            <ul className="space-y-2">
              {[
                { label: 'Submission Guide',          path: '/guide-submission' },
                { label: 'Author Guidelines',         path: '/author-instructions' },
                { label: 'Editorial policy',          path: '/editorial-policy' },
                { label: 'Review process',            path: '/review-process' },
              ].map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className="text-xs text-neutral-400 hover:text-white no-underline
                               transition-colors duration-150"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4 — Contact */}
          <div>
            <h4 className="text-white text-sm font-semibold mb-4 uppercase tracking-wider">
              Contact
            </h4>
            <ul className="space-y-2">
              <li className="text-xs text-neutral-400">
                <span className="block text-neutral-500 text-xxs uppercase tracking-wide mb-0.5">
                  Editorial email
                </span>
                <a href="mailto:contact@jaei-journal.org"
                   className="text-accent-300 hover:text-white no-underline transition-colors">
                  contact@jaei-journal.org
                </a>
              </li>
              <li className="text-xs text-neutral-400 mt-3">
                <span className="block text-neutral-500 text-xxs uppercase tracking-wide mb-0.5">
                  Technical support
                </span>
                <a href="mailto:contact@jaei-journal.org"
                   className="text-accent-300 hover:text-white no-underline transition-colors">
                  contact@jaei-journal.org
                </a>
              </li>
              <li className="mt-4">
                <Link
                  to="/login"
                  className="inline-block px-4 py-2 text-xs font-semibold text-white
                             bg-primary rounded hover:bg-primary-600 no-underline
                             transition-colors duration-150"
                >
                  Submit an article
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-neutral-700">
        <div className="page-container py-4 flex flex-col md:flex-row items-center
                        justify-between gap-3">
          <p className="text-xs text-neutral-500 text-center md:text-left">
            &copy; {currentYear} JAEI — Journal of Agricultural and Environmental Innovation.
            All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link to="/privacy"
                  className="text-xs text-neutral-500 hover:text-neutral-300 no-underline transition-colors">
              Privacy policy
            </Link>
            <span className="text-neutral-600">|</span>
            <Link to="/terms"
                  className="text-xs text-neutral-500 hover:text-neutral-300 no-underline transition-colors">
              Terms of use
            </Link>
            <span className="text-neutral-600">|</span>
            <Link to="/cookies"
                  className="text-xs text-neutral-500 hover:text-neutral-300 no-underline transition-colors">
              Cookies
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
