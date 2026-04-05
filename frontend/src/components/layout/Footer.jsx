import { Link } from 'react-router-dom';

// ============================================================
// Footer — style ScienceDirect / Elsevier
// ============================================================

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-neutral-800 text-neutral-300 mt-auto">
      {/* Contenu principal */}
      <div className="page-container py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">

          {/* Colonne 1 — À propos du journal */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <img src="/logo-jaei-white.png" alt="JAEI" className="w-8 h-8 object-contain flex-shrink-0" />
              <div>
                <div className="text-white font-bold text-sm">JAEI</div>
              </div>
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed mb-3">
              Journal of Agricultural and Environmental Innovation — revue scientifique
              à comité de lecture dédiée aux innovations en agriculture et environnement.
            </p>
            <p className="text-xs text-neutral-500">
              ISSN : à définir
            </p>
          </div>

          {/* Colonne 2 — Navigation */}
          <div>
            <h4 className="text-white text-sm font-semibold mb-4 uppercase tracking-wider">
              Navigation
            </h4>
            <ul className="space-y-2">
              {[
                { label: 'Accueil',           path: '/' },
                { label: 'Articles publiés',  path: '/articles' },
                { label: 'Soumettre un article', path: '/author/submit' },
                { label: 'À propos du journal',  path: '/about' },
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

          {/* Colonne 3 — Pour les auteurs */}
          <div>
            <h4 className="text-white text-sm font-semibold mb-4 uppercase tracking-wider">
              Pour les Auteurs
            </h4>
            <ul className="space-y-2">
              {[
                { label: 'Guide de soumission',       path: '/guide-submission' },
                { label: 'Instructions aux auteurs',  path: '/author-instructions' },
                { label: 'Politique éditoriale',      path: '/editorial-policy' },
                { label: 'Processus de révision',     path: '/review-process' },
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

          {/* Colonne 4 — Contact */}
          <div>
            <h4 className="text-white text-sm font-semibold mb-4 uppercase tracking-wider">
              Contact
            </h4>
            <ul className="space-y-2">
              <li className="text-xs text-neutral-400">
                <span className="block text-neutral-500 text-xxs uppercase tracking-wide mb-0.5">
                  Email éditorial
                </span>
                <a href="mailto:editorial@jaei-journal.com"
                   className="text-accent-300 hover:text-white no-underline transition-colors">
                  editorial@jaei-journal.com
                </a>
              </li>
              <li className="text-xs text-neutral-400 mt-3">
                <span className="block text-neutral-500 text-xxs uppercase tracking-wide mb-0.5">
                  Support technique
                </span>
                <a href="mailto:support@jaei-journal.com"
                   className="text-accent-300 hover:text-white no-underline transition-colors">
                  support@jaei-journal.com
                </a>
              </li>
              <li className="mt-4">
                <Link
                  to="/login"
                  className="inline-block px-4 py-2 text-xs font-semibold text-white
                             bg-primary rounded hover:bg-primary-600 no-underline
                             transition-colors duration-150"
                >
                  Soumettre un article
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Barre du bas */}
      <div className="border-t border-neutral-700">
        <div className="page-container py-4 flex flex-col md:flex-row items-center
                        justify-between gap-3">
          <p className="text-xs text-neutral-500 text-center md:text-left">
            &copy; {currentYear} JAEI — Journal of Agricultural and Environmental Innovation.
            Tous droits réservés.
          </p>
          <div className="flex items-center gap-4">
            <Link to="/privacy"
                  className="text-xs text-neutral-500 hover:text-neutral-300 no-underline transition-colors">
              Politique de confidentialité
            </Link>
            <span className="text-neutral-600">|</span>
            <Link to="/terms"
                  className="text-xs text-neutral-500 hover:text-neutral-300 no-underline transition-colors">
              Conditions d'utilisation
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
