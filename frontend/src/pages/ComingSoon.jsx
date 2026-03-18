import { Link } from 'react-router-dom';
import Layout from '../components/layout/Layout';

// ============================================================
// Placeholder — page en cours de construction
// ============================================================

const ComingSoon = ({ title = 'Page en construction' }) => {
  return (
    <Layout>
      <div className="page-container py-20 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 bg-jaei-gradient rounded-xl flex items-center justify-center mb-6 shadow-card">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-neutral-800 mb-3">{title}</h1>
        <p className="text-neutral-500 text-sm max-w-md mb-8">
          Cette section est en cours de développement. Elle sera disponible très prochainement.
        </p>
        <Link
          to="/"
          className="px-6 py-2.5 bg-jaei-gradient text-white rounded font-medium text-sm
                     hover:opacity-90 transition-opacity no-underline shadow-card"
        >
          Retour à l'accueil
        </Link>
      </div>
    </Layout>
  );
};

export default ComingSoon;
