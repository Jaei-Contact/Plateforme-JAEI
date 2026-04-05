import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';

// ============================================================
// ForgotPassword — JAEI Platform
// ============================================================

const ForgotPassword = () => {
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) { setError('Veuillez saisir votre adresse email.'); return; }
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/forgot-password', { email: email.trim() });
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col page-enter" style={{ background: '#F5F7FA' }}>

      {/* Header */}
      <header style={{ background: '#1B4427', borderBottom: '3px solid #1E88C8' }}>
        <div className="h-14 flex items-center px-6">
          <Link to="/" className="flex items-center gap-2.5 no-underline">
            <img src="/logo-jaei-white.png" alt="JAEI" className="w-7 h-7 object-contain flex-shrink-0" />
            <span className="text-white font-bold text-sm tracking-wide">JAEI</span>
          </Link>
        </div>
      </header>

      {/* Card */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">

          {!sent ? (
            <div className="bg-white rounded-sm px-8 py-10"
                 style={{ border: '1px solid #E5E7EB', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>

              {/* Logo */}
              <div className="text-center mb-8">
                <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                     style={{ background: '#1B4427' }}>
                  <svg className="w-7 h-7" fill="none" stroke="white" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                      d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/>
                  </svg>
                </div>
                <h1 className="text-xl font-bold" style={{ color: '#111827' }}>Mot de passe oublié</h1>
                <p className="text-sm mt-2" style={{ color: '#6B7280' }}>
                  Saisissez votre adresse email et nous vous enverrons un lien de réinitialisation.
                </p>
              </div>

              {/* Erreur */}
              {error && (
                <div className="mb-4 px-4 py-3 rounded-sm text-sm"
                     style={{ background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA' }}>
                  {error}
                </div>
              )}

              {/* Formulaire */}
              <form onSubmit={handleSubmit}>
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-1.5" style={{ color: '#374151' }}>
                    Adresse email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="votre@email.com"
                    autoComplete="email"
                    autoFocus
                    className="w-full px-3 py-2.5 text-sm rounded-sm outline-none"
                    style={{ border: '1px solid #E5E7EB', color: '#111827' }}
                    onFocus={e => { e.target.style.borderColor = '#1E88C8'; e.target.style.boxShadow = '0 0 0 3px rgba(30,136,200,0.1)'; }}
                    onBlur={e => { e.target.style.borderColor = '#E5E7EB'; e.target.style.boxShadow = 'none'; }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-sm text-sm font-semibold transition-opacity"
                  style={{
                    background: loading ? '#6B7280' : 'linear-gradient(90deg, #1B4427 0%, #1E88C8 100%)',
                    color: '#fff',
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  {loading ? 'Envoi en cours…' : 'Envoyer le lien de réinitialisation'}
                </button>
              </form>

              <p className="text-center text-sm mt-6" style={{ color: '#6B7280' }}>
                Vous vous souvenez de votre mot de passe ?{' '}
                <Link to="/login" className="font-medium no-underline" style={{ color: '#1E88C8' }}>
                  Se connecter
                </Link>
              </p>
            </div>

          ) : (

            /* Confirmation envoi */
            <div className="bg-white rounded-sm px-8 py-10 text-center"
                 style={{ border: '1px solid #E5E7EB', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                   style={{ background: '#F0FDF4', border: '2px solid #BBF7D0' }}>
                <svg className="w-7 h-7" fill="none" stroke="#15803D" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                </svg>
              </div>
              <h2 className="text-lg font-bold mb-2" style={{ color: '#111827' }}>Email envoyé</h2>
              <p className="text-sm mb-1" style={{ color: '#6B7280' }}>
                Si un compte est associé à <strong>{email}</strong>, vous recevrez dans quelques minutes
                un email contenant un lien de réinitialisation.
              </p>
              <p className="text-sm mb-6" style={{ color: '#9CA3AF' }}>
                Vérifiez également vos spams.
              </p>
              <Link to="/login"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-sm text-sm font-semibold no-underline"
                    style={{ background: '#1B4427', color: '#fff' }}>
                Retour à la connexion
              </Link>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
