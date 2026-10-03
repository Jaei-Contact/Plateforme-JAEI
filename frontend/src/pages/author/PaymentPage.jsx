import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../utils/api';

// ============================================================
// PaymentPage — Article Processing Charge (APC) par carte, via Stripe
// Route : /author/submissions/:id/payment
// Accessible depuis le bloc « Payment — APC » de la page de l'article
// (bouton « Pay by card », visible une fois l'article accepté).
// ============================================================

const DEFAULT_FEE = 100000;

// ── Icons ────────────────────────────────────────────────────
const IconLock = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
  </svg>
);
const IconCard = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
  </svg>
);
const IconExternalLink = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
  </svg>
);

// ── Stripe button ─────────────────────────────────────────────
const StripeButton = ({ submissionId, fee }) => {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const handlePay = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/payments/stripe/create-checkout-session', {
        submission_id: parseInt(submissionId),
      });
      const checkoutUrl = res.data.checkout_url;
      if (!checkoutUrl || !checkoutUrl.startsWith('https://')) {
        setError('Invalid payment URL received. Please contact support.');
        setLoading(false);
        return;
      }
      window.location.href = checkoutUrl;
    } catch (err) {
      setError(err.response?.data?.message || 'Error initializing payment. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm" style={{ color: '#6B7280' }}>
        Pay securely via Stripe. Accepted: Visa, Mastercard, and other major cards.
      </p>

      {error && (
        <p className="text-sm px-3 py-2 rounded-sm"
           style={{ background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA' }}>
          {error}
        </p>
      )}

      <button
        onClick={handlePay}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold text-white rounded-sm transition-opacity"
        style={{ background: '#1B4427', opacity: loading ? 0.7 : 1 }}>
        {loading
          ? <><div className="w-4 h-4 rounded-full border-2 animate-spin"
                   style={{ borderColor: '#fff', borderTopColor: 'transparent' }} /> Redirecting…</>
          : <><IconExternalLink /> Pay {fee.toLocaleString('fr-FR')} FCFA via Stripe</>}
      </button>

      <div className="flex flex-wrap gap-2 justify-center">
        {['Visa', 'Mastercard', 'Amex'].map(m => (
          <span key={m} className="text-xs px-2 py-0.5 rounded-sm font-medium"
                style={{ background: '#F3F4F6', color: '#6B7280', border: '1px solid #E5E7EB' }}>
            {m}
          </span>
        ))}
      </div>
    </div>
  );
};

// ── Page principale ──────────────────────────────────────────
const PaymentPage = () => {
  const { id: submissionId } = useParams();
  const [submission,   setSubmission]   = useState(null);
  const [paymentConfig, setPaymentConfig] = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');

  useEffect(() => {
    const init = async () => {
      try {
        const [subRes, cfgRes] = await Promise.all([
          api.get(`/submissions/${submissionId}`),
          api.get('/payments/config'),
        ]);
        setSubmission(subRes.data.submission);
        setPaymentConfig(cfgRes.data);
      } catch {
        setError('Unable to load the payment page. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [submissionId]);

  const fee = paymentConfig?.fee || DEFAULT_FEE;

  if (loading) return (
    <DashboardLayout title="Article Processing Charge">
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 rounded-full border-2 animate-spin"
             style={{ borderColor: '#1E88C8', borderTopColor: 'transparent' }} />
      </div>
    </DashboardLayout>
  );

  // Ce que la page peut proposer selon l'état de l'article et de la configuration
  let blocker = null;
  if (submission?.apc_paid) {
    blocker = 'The Article Processing Charge has already been paid for this article. Thank you!';
  } else if (submission && submission.status !== 'accepted') {
    blocker = 'The Article Processing Charge is due once your article has been accepted.';
  } else if (paymentConfig && !paymentConfig.stripeAvailable) {
    blocker = 'Online card payment is not available yet. You can pay by Mobile Money or bank transfer: please contact contact@jaei-journal.org with your manuscript number.';
  }

  return (
    <DashboardLayout title="Article Processing Charge">
      <div className="max-w-lg mx-auto space-y-5">

        {error && (
          <div className="px-4 py-3 rounded-sm text-sm"
               style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C' }}>
            {error}
          </div>
        )}

        {/* Résumé soumission */}
        <div className="bg-white rounded-sm p-5"
             style={{ border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <p className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: '#9CA3AF' }}>
            Submission summary
          </p>
          <p className="text-base font-semibold mb-1" style={{ color: '#111827' }}>
            {submission?.title || 'Your article'}
          </p>
          <p className="text-sm mb-4" style={{ color: '#6B7280' }}>
            Article Processing Charge (APC){submission?.manuscript_number ? ` — ${submission.manuscript_number}` : ''}
          </p>
          <div className="flex justify-end pt-3" style={{ borderTop: '1px solid #F3F4F6' }}>
            <div className="text-right">
              <p className="text-lg font-bold leading-tight" style={{ color: '#1B4427' }}>
                {fee.toLocaleString('fr-FR')} FCFA
              </p>
              {paymentConfig?.displayAmounts && Object.keys(paymentConfig.displayAmounts).length > 0 && (
                <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
                  {Object.entries(paymentConfig.displayAmounts)
                    .map(([ccy, amt]) => `≈ ${amt.toLocaleString('fr-FR')} ${ccy}`)
                    .join('  ·  ')}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Paiement */}
        <div className="bg-white rounded-sm p-6"
             style={{ border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div className="flex items-center gap-2 mb-5">
            <IconCard />
            <h2 className="text-base font-bold" style={{ color: '#111827' }}>Payment</h2>
          </div>

          {blocker
            ? <p className="text-sm" style={{ color: '#6B7280', lineHeight: 1.6 }}>{blocker}</p>
            : <StripeButton submissionId={submissionId} fee={fee} />
          }
        </div>

        {/* Sécurité */}
        {!blocker && (
          <div className="flex items-start gap-3 px-4 py-3 rounded-sm text-xs"
               style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#15803D' }}>
            <IconLock />
            <p>
              Your payment is processed securely by Stripe. Once it is confirmed, the editorial office is notified
              and you receive an email with your invoice (PDF).
            </p>
          </div>
        )}

        <div className="text-center">
          <Link to={`/author/submissions/${submissionId}`} className="text-xs no-underline" style={{ color: '#1E88C8' }}>
            ← Back to my article
          </Link>
        </div>

      </div>
    </DashboardLayout>
  );
};

export default PaymentPage;
