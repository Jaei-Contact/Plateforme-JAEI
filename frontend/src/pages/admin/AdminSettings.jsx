import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../utils/api';
import { fmtNum, priceListFor } from '../../utils/apcPrice';

// ============================================================
// AdminSettings — JAEI Platform
// Réglages modifiables par l'administrateur : montant de l'APC (en USD).
// Priorité : valeur saisie ici > valeur par défaut du code (200 USD, champ vide).
// ============================================================

const CONFIRM_ABOVE = 1000;   // simple message de confirmation (pas une limite) pour éviter une faute de frappe

const parseInput = (s) => {
  const t = String(s).trim().replace(',', '.');
  if (t === '' || !/^\d+(\.\d{1,2})?$/.test(t)) return null;
  const v = Number(t);
  return v > 0 ? v : null;
};

export default function AdminSettings() {
  const [setting, setSetting] = useState(null);
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [notice, setNotice]   = useState(null);   // { ok, text }

  const apply = (data) => {
    setSetting(data);
    setInput(data.isCustom ? String(data.amount) : '');
  };

  useEffect(() => {
    api.get('/admin/settings/apc')
      .then((res) => apply(res.data))
      .catch(() => setNotice({ ok: false, text: 'Unable to load the settings. Please try again.' }))
      .finally(() => setLoading(false));
  }, []);

  const save = async (value, { restore = false } = {}) => {
    const wanted = parseInput(value);
    if (!restore && wanted && wanted > CONFIRM_ABOVE &&
        !window.confirm(`You are about to set the APC to $${fmtNum(wanted)} USD. Is this amount correct?`)) {
      return;
    }
    setSaving(true);
    setNotice(null);
    try {
      const res = await api.put('/admin/settings/apc', { amount: value === '' ? null : value });
      apply(res.data);
      setNotice({
        ok: true,
        text: restore
          ? `Previous amount restored: authors will now be charged $${fmtNum(res.data.amount)} USD.`
          : res.data.isCustom
            ? `Saved. Authors will now be charged $${fmtNum(res.data.amount)} USD.`
            : `Default amount applied: authors will be charged $${fmtNum(res.data.amount)} USD.`,
      });
    } catch (err) {
      setNotice({ ok: false, text: err.response?.data?.message || 'Unable to save the amount. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const typed = parseInput(input);
  const preview = typed ? priceListFor(typed) : null;
  const unchanged = setting && (input.trim() === '' ? !setting.isCustom : Number(input.replace(',', '.')) === setting.amount && setting.isCustom);

  return (
    <DashboardLayout title="Settings">
      <div className="max-w-2xl mx-auto space-y-5">

        {notice && (
          <div className="px-4 py-3 rounded-sm text-sm"
               style={notice.ok
                 ? { background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#15803D' }
                 : { background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C' }}>
            {notice.text}
          </div>
        )}

        <div className="bg-white rounded-sm" style={{ border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div className="px-5 py-4" style={{ borderBottom: '1px solid #F3F4F6' }}>
            <h2 className="text-sm font-bold" style={{ color: '#1B4427' }}>Article Processing Charge (APC)</h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 rounded-full border-2 animate-spin"
                   style={{ borderColor: '#1E88C8', borderTopColor: 'transparent' }} />
            </div>
          ) : setting && (
            <div className="px-5 py-5 space-y-4">
              <p className="text-xs leading-relaxed" style={{ color: '#6B7280' }}>
                Amount charged to authors once their article is accepted, in US dollars. Leave the field empty to use
                the default amount (${fmtNum(setting.defaultAmount)} USD). The new amount applies to the next payment:
                payments already made and invoices already issued do not change.
              </p>

              <div className="rounded-sm px-4 py-3" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                <p className="text-xs" style={{ color: '#15803D' }}>
                  Current amount{setting.isCustom ? '' : ' (default)'}
                </p>
                <p className="text-lg font-bold" style={{ color: '#1B4427' }}>${fmtNum(setting.prices.USD)} USD</p>
                <p className="text-xs mt-1" style={{ color: '#6B7280' }}>
                  Shown on the site as: {fmtNum(setting.prices.EUR)} € · {fmtNum(setting.prices.FCFA)} FCFA · ¥{fmtNum(setting.prices.RMB)} RMB
                  {' '}(indicative equivalents)
                </p>
                {setting.isCustom && setting.updatedAt && (
                  <p className="text-xs mt-1" style={{ color: '#6B7280' }}>
                    Set{setting.updatedBy ? ` by ${setting.updatedBy}` : ''} on{' '}
                    {new Date(setting.updatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="apc-amount" className="block text-xs font-semibold mb-1.5" style={{ color: '#374151' }}>
                  New amount (USD)
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold" style={{ color: '#6B7280' }}>$</span>
                  <input id="apc-amount" type="text" inputMode="decimal" value={input}
                         onChange={(e) => { setInput(e.target.value); setNotice(null); }}
                         placeholder={`${fmtNum(setting.defaultAmount)} (default)`}
                         className="flex-1 px-3 py-2 text-sm rounded-sm outline-none"
                         style={{ border: '1px solid #D1D5DB', color: '#111827' }} />
                  <span className="text-sm font-semibold" style={{ color: '#6B7280' }}>USD</span>
                </div>
                {preview && (
                  <p className="text-xs mt-2" style={{ color: '#6B7280' }}>
                    Would be shown as: ${fmtNum(preview.USD)} USD · {fmtNum(preview.EUR)} € · {fmtNum(preview.FCFA)} FCFA · ¥{fmtNum(preview.RMB)} RMB
                  </p>
                )}
                <p className="text-xs mt-2" style={{ color: '#9CA3AF' }}>
                  Minimum ${fmtNum(setting.minAmount)} USD (the lowest amount Stripe accepts), up to two decimals.
                </p>
              </div>

              <div className="flex flex-wrap gap-3 pt-1">
                <button onClick={() => save(input.trim())} disabled={saving || unchanged}
                        className="px-4 py-2 rounded-sm text-xs font-semibold text-white"
                        style={{ background: '#1B4427', opacity: (saving || unchanged) ? 0.5 : 1,
                                 cursor: (saving || unchanged) ? 'not-allowed' : 'pointer' }}>
                  {saving ? 'Saving…' : 'Save'}
                </button>
                {setting.previous && (
                  <button onClick={() => save(setting.previous.isDefault ? '' : String(setting.previous.amount), { restore: true })}
                          disabled={saving}
                          className="px-4 py-2 rounded-sm text-xs font-semibold"
                          style={{ background: '#fff', color: '#1B4427', border: '1px solid #BBF7D0',
                                   opacity: saving ? 0.5 : 1, cursor: saving ? 'not-allowed' : 'pointer' }}>
                    Restore previous value (${fmtNum(setting.previous.amount)} USD)
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

      </div>
    </DashboardLayout>
  );
}
