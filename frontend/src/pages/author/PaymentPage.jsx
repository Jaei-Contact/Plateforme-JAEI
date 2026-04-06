import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../utils/api';

// ============================================================
// PaymentPage — Submission fee payment (Stripe)
// Route : /author/submissions/:id/payment
// ============================================================

// ── Icons ───────────────────────────────────────────────────
const IconLock = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
  </svg>
);
const IconCheck = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
  </svg>
);
const IconCard = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
  </svg>
);

// ── Stripe Elements loaded dynamically ─────────────────────
// To avoid an unnecessary dependency if Stripe is not configured,
// @stripe/react-stripe-js and @stripe/stripe-js are loaded on demand.
let loadStripe = null;
let Elements = null;
let CardElement = null;
let useStripe = null;
let useElements = null;

const loadStripeModules = async () => {
  try {
    const stripeJs = await import('@stripe/stripe-js');
    const stripeReact = await import('@stripe/react-stripe-js');
    loadStripe = stripeJs.loadStripe;
    Elements = stripeReact.Elements;
    CardElement = stripeReact.CardElement;
    useStripe = stripeReact.useStripe;
    useElements = stripeReact.useElements;
    return true;
  } catch {
    return false;
  }
};

// ── Payment form (rendered only when Stripe is loaded) ──
const StripeForm = ({ clientSecret, submissionId, articleTitle, onSuccess }) => {
  const stripe = useStripe ? useStripe() : null;
  const elements = useElements ? useElements() : null;
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements || !CardElement) return;

    setPaying(true);
    setError('');

    try {
      const card = elements.getElement(CardElement);
      const { error: stripeErr, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card },
      });

      if (stripeErr) {
        setError(stripeErr.message || 'Payment error');
        setPaying(false);
        return;
      }

      if (paymentIntent?.status === 'succeeded') {
        // Confirm server-side
        await api.post('/payments/confirm', {
          payment_intent_id: paymentIntent.id,
          submission_id: submissionId,
        });
        onSuccess();
      }
    } catch (err) {
      setError('Unexpected error. Please try again.');
      setPaying(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: '#374151' }}>
          Card details
        </label>
        {CardElement && (
          <div className="px-4 py-3 rounded-sm border" style={{ borderColor: '#E5E7EB', background: '#fff' }}>
            <CardElement options={{
              style: {
                base: {
                  fontSize: '14px',
                  color: '#374151',
                  fontFamily: 'Inter, Arial, sans-serif',
                  '::placeholder': { color: '#9CA3AF' },
                },
                invalid: { color: '#DC2626' },
              },
            }} />
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm px-3 py-2 rounded-sm" style={{ background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA' }}>
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={paying || !stripe}
        className="w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold text-white rounded-sm transition-opacity"
        style={{ background: '#1B4427', opacity: paying ? 0.7 : 1 }}
      >
        {paying ? (
          <>
            <div className="w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: '#fff', borderTopColor: 'transparent' }} />
            Processing…
          </>
        ) : (
          <>
            <IconLock />
            Pay now
          </>
        )}
      </button>

      <p className="text-xs text-center" style={{ color: '#9CA3AF' }}>
        Secured by Stripe · Your card details never pass through our servers
      </p>
    </form>
  );
};

// ── Main page ───────────────────────────────────────────────
const PaymentPage = () => {
  const { id: submissionId } = useParams();
  const navigate = useNavigate();

  const [config, setConfig]     = useState(null);
  const [submission, setSubmission] = useState(null);
  const [clientSecret, setClientSecret] = useState('');
  const [stripePromise, setStripePromise] = useState(null);
  const [stripeReady, setStripeReady]   = useState(false);
  const [loading, setLoading]   = useState(true);
  const [creating, setCreating] = useState(false);
  const [success, setSuccess]   = useState(false);
  const [error, setError]       = useState('');

  useEffect(() => {
    const init = async () => {
      try {
        // 1. Check if Stripe is configured
        const cfgRes = await api.get('/payments/config');
        setConfig(cfgRes.data);

        if (!cfgRes.data.available) {
          setLoading(false);
          return;
        }

        // 2. Load Stripe modules
        const loaded = await loadStripeModules();
        if (loaded && loadStripe) {
          const sp = loadStripe(cfgRes.data.publishableKey);
          setStripePromise(sp);
          setStripeReady(true);
        }

        // 3. Load submission info
        const subRes = await api.get(`/submissions/${submissionId}`);
        setSubmission(subRes.data.submission);

      } catch (err) {
        setError('Unable to load the payment page.');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [submissionId]);

  const handleCreateIntent = async () => {
    setCreating(true);
    setError('');
    try {
      const res = await api.post('/payments/create-intent', {
        submission_id: parseInt(submissionId),
      });
      setClientSecret(res.data.clientSecret);
    } catch (err) {
      setError(err.response?.data?.message || 'Error initializing payment.');
    } finally {
      setCreating(false);
    }
  };

  const handleSuccess = () => setSuccess(true);

  if (loading) return (
    <DashboardLayout title="Payment">
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: '#1E88C8', borderTopColor: 'transparent' }} />
      </div>
    </DashboardLayout>
  );

  // ── Success ────────────────────────────────────────────
  if (success) return (
    <DashboardLayout title="Payment completed">
      <div className="max-w-md mx-auto mt-8 text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
             style={{ background: '#F0FDF4', color: '#15803D' }}>
          <IconCheck />
        </div>
        <h2 className="text-xl font-bold mb-2" style={{ color: '#111827' }}>Payment confirmed!</h2>
        <p className="text-sm mb-6" style={{ color: '#6B7280' }}>
          Your article is now submitted and awaiting review by our scientific committee.
          You will be notified by email at each step.
        </p>
        <Link to="/author/dashboard"
              className="inline-block px-6 py-2.5 text-sm font-medium text-white rounded-sm no-underline"
              style={{ background: '#1B4427' }}>
          Back to dashboard
        </Link>
      </div>
    </DashboardLayout>
  );

  // ── Stripe not configured ──────────────────────────────────
  if (config && !config.available) return (
    <DashboardLayout title="Payment">
      <div className="max-w-md mx-auto mt-8 text-center">
        <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
             style={{ background: '#FEF3C7', color: '#92400E' }}>
          <IconCard />
        </div>
        <h2 className="text-lg font-bold mb-2" style={{ color: '#111827' }}>Online payment unavailable</h2>
        <p className="text-sm mb-4" style={{ color: '#6B7280' }}>
          The online payment module is being configured. Please contact the editorial office to proceed with the submission fee payment.
        </p>
        <a href={`mailto:${import.meta.env.VITE_CONTACT_EMAIL || 'contact@jaei-journal.org'}`}
           className="inline-block px-5 py-2 text-sm font-medium text-white rounded-sm no-underline"
           style={{ background: '#1E88C8' }}>
          Contact the editorial office
        </a>
      </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout title="Submission fee">
      <div className="max-w-lg mx-auto space-y-5">

        {/* Summary */}
        <div className="bg-white rounded-sm p-6" style={{ border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <h2 className="text-base font-bold mb-4" style={{ color: '#111827' }}>Your submission summary</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span style={{ color: '#6B7280' }}>Article</span>
              <span className="font-medium text-right max-w-xs truncate" style={{ color: '#111827' }}>
                {submission?.title || `Submission #${submissionId}`}
              </span>
            </div>
            <div className="flex justify-between pt-2 mt-2" style={{ borderTop: '1px solid #F3F4F6' }}>
              <span className="font-semibold" style={{ color: '#374151' }}>Submission fee</span>
              <span className="font-bold text-base" style={{ color: '#1B4427' }}>
                {config?.fee?.toLocaleString('fr-FR')} {config?.currencyLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Stripe form */}
        <div className="bg-white rounded-sm p-6" style={{ border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div className="flex items-center gap-2 mb-4">
            <IconCard />
            <h2 className="text-base font-bold" style={{ color: '#111827' }}>Card payment</h2>
          </div>

          {error && (
            <p className="text-sm px-3 py-2 rounded-sm mb-4" style={{ background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA' }}>
              {error}
            </p>
          )}

          {!clientSecret ? (
            <button
              onClick={handleCreateIntent}
              disabled={creating}
              className="w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold text-white rounded-sm"
              style={{ background: '#1E88C8', opacity: creating ? 0.7 : 1 }}
            >
              {creating ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: '#fff', borderTopColor: 'transparent' }} />
                  Initializing…
                </>
              ) : (
                <>
                  <IconLock />
                  Proceed to payment
                </>
              )}
            </button>
          ) : (
            stripeReady && Elements && stripePromise ? (
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <StripeForm
                  clientSecret={clientSecret}
                  submissionId={submissionId}
                  articleTitle={submission?.title}
                  onSuccess={handleSuccess}
                />
              </Elements>
            ) : (
              <p className="text-sm text-center py-4" style={{ color: '#6B7280' }}>
                Loading payment module…
              </p>
            )
          )}
        </div>

        {/* Security info */}
        <div className="flex items-start gap-3 px-4 py-3 rounded-sm text-xs"
             style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#15803D' }}>
          <IconLock />
          <p>
            Your card details are encrypted and processed directly by Stripe.
            JAEI never stores your card data.
          </p>
        </div>

      </div>
    </DashboardLayout>
  );
};

export default PaymentPage;
