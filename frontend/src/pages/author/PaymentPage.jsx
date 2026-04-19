import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../utils/api';

// ============================================================
// PaymentPage — Frais de soumission via CinetPay
// Route : /author/submissions/:id/payment
// ============================================================

const FEE = 200000;

// ── Icons ────────────────────────────────────────────────────
const IconLock = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
  </svg>
);
const IconCheck = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
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

// ── Dev simulation form ──────────────────────────────────────
const DevSimForm = ({ submissionId, onSuccess }) => {
  const [paying, setPaying] = useState(false);
  const [error,  setError]  = useState('');

  const handlePay = async (e) => {
    e.preventDefault();
    setPaying(true);
    setError('');
    try {
      await api.post('/payments/dev-confirm', { submission_id: parseInt(submissionId) });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'Simulation error.');
      setPaying(false);
    }
  };

  return (
    <form onSubmit={handlePay} className="space-y-4">
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: '#6B7280' }}>Card number</label>
          <input disabled defaultValue="4242 4242 4242 4242"
            className="w-full px-3 py-2.5 text-sm rounded-sm"
            style={{ border: '1px solid #E5E7EB', color: '#9CA3AF', background: '#F9FAFB' }} />
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium mb-1" style={{ color: '#6B7280' }}>Expiry</label>
            <input disabled defaultValue="12 / 28"
              className="w-full px-3 py-2.5 text-sm rounded-sm"
              style={{ border: '1px solid #E5E7EB', color: '#9CA3AF', background: '#F9FAFB' }} />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium mb-1" style={{ color: '#6B7280' }}>CVC</label>
            <input disabled defaultValue="123"
              className="w-full px-3 py-2.5 text-sm rounded-sm"
              style={{ border: '1px solid #E5E7EB', color: '#9CA3AF', background: '#F9FAFB' }} />
          </div>
        </div>
      </div>

      <div className="px-3 py-2 rounded-sm text-xs"
           style={{ background: '#FEF3C7', border: '1px solid #FDE68A', color: '#92400E' }}>
        🧪 <strong>Dev mode</strong> — Simulated payment, no real transaction
      </div>

      {error && (
        <p className="text-sm px-3 py-2 rounded-sm"
           style={{ background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA' }}>
          {error}
        </p>
      )}

      <button type="submit" disabled={paying}
        className="w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold text-white rounded-sm transition-opacity"
        style={{ background: '#1B4427', opacity: paying ? 0.7 : 1 }}>
        {paying
          ? <><div className="w-4 h-4 rounded-full border-2 animate-spin"
                   style={{ borderColor: '#fff', borderTopColor: 'transparent' }} /> Processing…</>
          : <>Confirm payment</>}
      </button>
    </form>
  );
};

// ── CinetPay button ──────────────────────────────────────────
const CinetPayButton = ({ submissionId }) => {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const handlePay = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/payments/initiate', {
        submission_id: parseInt(submissionId),
      });
      // Redirection vers la page de paiement CinetPay
      window.location.href = res.data.payment_url;
    } catch (err) {
      setError(err.response?.data?.message || 'Error initializing payment. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm" style={{ color: '#6B7280' }}>
        Pay securely via CinetPay. Accepted: Visa, Mastercard, MTN Mobile Money, Orange Money.
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
          : <><IconExternalLink /> Pay {FEE.toLocaleString('fr-FR')} FCFA via CinetPay</>}
      </button>

      <div className="flex flex-wrap gap-2 justify-center">
        {['Visa', 'Mastercard', 'MTN MoMo', 'Orange Money'].map(m => (
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
  const [success,      setSuccess]      = useState(false);
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

  if (loading) return (
    <DashboardLayout title="Submission fee">
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 rounded-full border-2 animate-spin"
             style={{ borderColor: '#1E88C8', borderTopColor: 'transparent' }} />
      </div>
    </DashboardLayout>
  );

  if (success) return (
    <DashboardLayout title="Payment confirmed">
      <div className="max-w-md mx-auto mt-8 text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
             style={{ background: '#F0FDF4', color: '#15803D' }}>
          <IconCheck />
        </div>
        <h2 className="text-xl font-bold mb-2" style={{ color: '#111827' }}>Payment confirmed!</h2>
        <p className="text-sm mb-6" style={{ color: '#6B7280', maxWidth: 360, margin: '8px auto 24px' }}>
          Your article is now in the editorial queue. You will be notified by email at each step of the review process.
        </p>
        <div className="flex gap-3 justify-center">
          <Link to="/author/dashboard"
                className="px-6 py-2.5 text-sm font-semibold text-white rounded-sm no-underline"
                style={{ background: '#1B4427' }}>
            Back to dashboard
          </Link>
          <Link to="/author/submissions"
                className="px-5 py-2.5 text-sm font-medium rounded-sm no-underline"
                style={{ border: '1px solid #E5E7EB', color: '#374151' }}>
            My submissions
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout title="Submission fee">
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
          <p className="text-sm mb-4" style={{ color: '#6B7280' }}>Article Processing Charge (APC)</p>
          <div className="flex justify-end pt-3" style={{ borderTop: '1px solid #F3F4F6' }}>
            <div className="text-right">
              <p className="text-lg font-bold leading-tight" style={{ color: '#1B4427' }}>
                {FEE.toLocaleString('fr-FR')} FCFA
              </p>
            </div>
          </div>
        </div>

        {/* Formulaire paiement */}
        <div className="bg-white rounded-sm p-6"
             style={{ border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div className="flex items-center gap-2 mb-5">
            <IconCard />
            <h2 className="text-base font-bold" style={{ color: '#111827' }}>Payment</h2>
          </div>

          {paymentConfig?.devMode
            ? <DevSimForm submissionId={submissionId} onSuccess={() => setSuccess(true)} />
            : <CinetPayButton submissionId={submissionId} />
          }
        </div>

        {/* Sécurité */}
        <div className="flex items-start gap-3 px-4 py-3 rounded-sm text-xs"
             style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#15803D' }}>
          <IconLock />
          <p>
            Your payment is processed securely by CinetPay. Once confirmed, your article immediately enters the editorial review process.
          </p>
        </div>

      </div>
    </DashboardLayout>
  );
};

export default PaymentPage;
