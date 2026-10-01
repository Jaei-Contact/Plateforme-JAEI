import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../utils/api';

// ============================================================
// PaymentReturn — Page de retour après paiement Stripe
// Route : /payment/return?transaction_id=JAEI_xxx
// Stripe redirige ici après le paiement (succès ou échec)
// ============================================================

const IconCheck = () => (
  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
  </svg>
);
const IconX = () => (
  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
  </svg>
);
const IconClock = () => (
  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
  </svg>
);

const IconDownload = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3"/>
  </svg>
);

// Téléchargement authentifié (le PDF de facture n'est pas servi en accès
// public) : fetch avec l'en-tête Authorization déjà posé par `api`, puis
// déclenchement du download via un blob — un <a href> direct ne porterait
// pas le token.
const InvoiceDownloadButton = ({ invoiceId }) => {
  const [downloading, setDownloading] = useState(false);
  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await api.get(`/payments/invoices/${invoiceId}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'invoice.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      // silencieux — l'utilisateur peut réessayer, pas critique pour ce flux
    } finally {
      setDownloading(false);
    }
  };
  return (
    <button onClick={handleDownload} disabled={downloading}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-sm transition-opacity"
            style={{ border: '1px solid #E5E7EB', color: '#374151', opacity: downloading ? 0.6 : 1 }}>
      <IconDownload /> {downloading ? 'Preparing…' : 'Download invoice'}
    </button>
  );
};

const PaymentReturn = () => {
  const [searchParams] = useSearchParams();
  const transactionId   = searchParams.get('transaction_id');

  const [status,    setStatus]    = useState('loading'); // loading | success | pending | failed | error
  const [retries,   setRetries]   = useState(0);
  const [invoiceId, setInvoiceId] = useState(null);

  useEffect(() => {
    if (!transactionId) { setStatus('error'); return; }

    // Vérification avec retry (l'IPN peut arriver quelques secondes après le retour)
    const verify = async (attempt = 0) => {
      try {
        const res = await api.get(`/payments/verify/${transactionId}`);
        const payStatus = res.data.status;
        if (payStatus === 'completed') {
          setInvoiceId(res.data.invoice_id || null);
          setStatus('success');
        } else if (attempt < 4) {
          // Réessayer jusqu'à 4 fois toutes les 2 secondes
          setTimeout(() => { setRetries(attempt + 1); verify(attempt + 1); }, 2000);
        } else {
          // Après 4 tentatives, on considère "en attente"
          setStatus('pending');
        }
      } catch {
        setStatus('error');
      }
    };

    verify();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactionId]);

  const renderContent = () => {
    switch (status) {

      case 'loading':
        return (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="w-12 h-12 rounded-full border-4 animate-spin mb-4"
                 style={{ borderColor: '#1E88C8', borderTopColor: 'transparent' }} />
            <p className="text-base font-semibold mb-1" style={{ color: '#111827' }}>
              Verifying your payment…
            </p>
            <p className="text-sm" style={{ color: '#6B7280' }}>
              {retries > 0 ? `Attempt ${retries + 1}/5…` : 'Please wait a moment.'}
            </p>
          </div>
        );

      case 'success':
        return (
          <div className="flex flex-col items-center py-12 text-center">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mb-5"
                 style={{ background: '#F0FDF4', color: '#15803D' }}>
              <IconCheck />
            </div>
            <h2 className="text-xl font-bold mb-2" style={{ color: '#111827' }}>
              Payment confirmed!
            </h2>
            <p className="text-sm mb-6" style={{ color: '#6B7280', maxWidth: 360 }}>
              Your article is now in the editorial queue. You will be notified by email at each step of the review process.
            </p>
            {invoiceId
              ? <div className="mb-6"><InvoiceDownloadButton invoiceId={invoiceId} /></div>
              : <p className="text-xs mb-6" style={{ color: '#9CA3AF' }}>
                  Your invoice is being generated — it will also be available from your payment history shortly.
                </p>
            }
            <div className="flex gap-3">
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
        );

      case 'pending':
        return (
          <div className="flex flex-col items-center py-12 text-center">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mb-5"
                 style={{ background: '#FEF3C7', color: '#D97706' }}>
              <IconClock />
            </div>
            <h2 className="text-xl font-bold mb-2" style={{ color: '#111827' }}>
              Payment being processed
            </h2>
            <p className="text-sm mb-4" style={{ color: '#6B7280', maxWidth: 380 }}>
              Your payment is being verified. This may take a few minutes. You will receive a confirmation email once it is validated.
            </p>
            <p className="text-xs mb-8 px-3 py-2 rounded-sm"
               style={{ background: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A' }}>
              Reference: <strong>{transactionId}</strong>
            </p>
            <Link to="/author/dashboard"
                  className="px-6 py-2.5 text-sm font-semibold text-white rounded-sm no-underline"
                  style={{ background: '#1B4427' }}>
              Back to dashboard
            </Link>
          </div>
        );

      case 'failed':
        return (
          <div className="flex flex-col items-center py-12 text-center">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mb-5"
                 style={{ background: '#FEF2F2', color: '#B91C1C' }}>
              <IconX />
            </div>
            <h2 className="text-xl font-bold mb-2" style={{ color: '#111827' }}>
              Payment failed
            </h2>
            <p className="text-sm mb-8" style={{ color: '#6B7280', maxWidth: 360 }}>
              Your payment could not be completed. No amount has been charged. Please try again.
            </p>
            <div className="flex gap-3">
              <Link to="/author/submit"
                    className="px-6 py-2.5 text-sm font-semibold text-white rounded-sm no-underline"
                    style={{ background: '#1E88C8' }}>
                Try again
              </Link>
              <Link to="/author/dashboard"
                    className="px-5 py-2.5 text-sm font-medium rounded-sm no-underline"
                    style={{ border: '1px solid #E5E7EB', color: '#374151' }}>
                Dashboard
              </Link>
            </div>
          </div>
        );

      default: // error
        return (
          <div className="flex flex-col items-center py-12 text-center">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mb-5"
                 style={{ background: '#FEF2F2', color: '#B91C1C' }}>
              <IconX />
            </div>
            <h2 className="text-xl font-bold mb-2" style={{ color: '#111827' }}>
              Verification error
            </h2>
            <p className="text-sm mb-8" style={{ color: '#6B7280', maxWidth: 360 }}>
              We could not verify your payment. Please contact us at{' '}
              <a href="mailto:contact@jaei-journal.org" style={{ color: '#1E88C8' }}>
                contact@jaei-journal.org
              </a>{' '}
              with your reference: <strong>{transactionId || 'N/A'}</strong>
            </p>
            <Link to="/author/dashboard"
                  className="px-6 py-2.5 text-sm font-semibold text-white rounded-sm no-underline"
                  style={{ background: '#1B4427' }}>
              Back to dashboard
            </Link>
          </div>
        );
    }
  };

  return (
    <DashboardLayout title="Payment confirmation">
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-sm"
             style={{ border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          {renderContent()}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PaymentReturn;
