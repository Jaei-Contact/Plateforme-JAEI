// ============================================================
// JAEI — Montant de l'APC (Article Processing Charge)
//
// Le débit réel (Stripe) et les factures se font en DOLLARS US.
// Le montant effectif est, par ordre de priorité :
//   1. celui que l'administrateur saisit dans son tableau de bord (Settings → APC) ;
//   2. à défaut (champ vide), la valeur par défaut du code : APC_DEFAULT_USD.
// La lecture se fait dans services/settingsService.js. Plus aucune variable d'environnement n'intervient.
// ============================================================

const APC_DEFAULT_USD = 200;

// Limites TECHNIQUES seulement, pas de plafond arbitraire : Stripe refuse un débit inférieur à
// l'équivalent de 0,50 USD ou supérieur à 999 999,99 USD ; les montants sont en cents (2 décimales).
const APC_MIN_USD = 0.5;
const APC_MAX_USD = 999999.99;

// ── Équivalents affichés (indicatifs, pas de débit dans ces devises) ───────────
// Rapports de la grille publiée jusqu'ici : 100 000 FCFA = 155 € = 180 $ = 1 300 RMB.
// L'auteur est débité en USD ; sa banque applique son propre taux de change.
const EQUIVALENT_PER_USD = { EUR: 155 / 180, FCFA: 100000 / 180, RMB: 1300 / 180 };

// Arrondi « lisible » à 3 chiffres significatifs (111 111 → 111 000 ; 172,2 → 172 ; 1 444 → 1 440)
const roundNice = (v) => {
  if (!(v > 0)) return 0;
  const step = Math.max(Math.pow(10, Math.floor(Math.log10(v)) - 2), 0.01);
  return Math.round(v / step) * step;
};

/** Équivalents { EUR, FCFA, RMB } d'un montant en USD. */
const equivalentsFor = (amountUsd) => {
  const a = Number(amountUsd) || 0;
  return {
    EUR:  roundNice(a * EQUIVALENT_PER_USD.EUR),
    FCFA: roundNice(a * EQUIVALENT_PER_USD.FCFA),
    RMB:  roundNice(a * EQUIVALENT_PER_USD.RMB),
  };
};

/** { USD, EUR, FCFA, RMB } : le montant débité et ses équivalents. */
const priceList = (amountUsd) => ({ USD: Number(amountUsd) || 0, ...equivalentsFor(amountUsd) });

// Nombre lisible : « 111 000 » (milliers séparés par une espace), décimales seulement si nécessaires
const fmtNum = (n) => {
  const v = Number(n) || 0;
  const dec = Number.isInteger(v) ? 0 : 2;
  return v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }).replace(/,/g, ' ');
};

/** « $200 USD · 172 € · 111 000 FCFA · ¥1 440 RMB » (même style que sur le site). */
const priceLine = (amountUsd) => {
  const p = priceList(amountUsd);
  return `$${fmtNum(p.USD)} USD · ${fmtNum(p.EUR)} € · ${fmtNum(p.FCFA)} FCFA · ¥${fmtNum(p.RMB)} RMB`;
};

/**
 * Valide un montant saisi (nombre ou texte, virgule acceptée).
 * @returns {{ok: true, value: number} | {ok: false, message: string}}
 */
const parseApcAmount = (input) => {
  const s = String(input === null || input === undefined ? '' : input).trim().replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(s)) {
    return { ok: false, message: 'Enter an amount in US dollars with at most two decimals (for example 200 or 249.50).' };
  }
  const value = Number(s);
  if (value < APC_MIN_USD) {
    return { ok: false, message: `The amount must be at least ${APC_MIN_USD.toFixed(2)} USD, the minimum that Stripe accepts.` };
  }
  if (value > APC_MAX_USD) {
    return { ok: false, message: `The amount cannot exceed ${fmtNum(APC_MAX_USD)} USD, the maximum that Stripe accepts.` };
  }
  return { ok: true, value };
};

// Devises sans décimales chez Stripe (le montant est transmis tel quel) ; les autres comptent en centimes.
const ZERO_DECIMAL = new Set(['xaf', 'xof', 'jpy', 'krw', 'vnd', 'clp']);

/** Montant en unités minimales Stripe (USD : cents ; XAF : inchangé). */
const toMinorUnits = (amount, currency) =>
  ZERO_DECIMAL.has(String(currency || '').toLowerCase()) ? Math.round(Number(amount)) : Math.round(Number(amount) * 100);

/** Inverse de toMinorUnits : unités minimales Stripe → montant (25050 cents → 250.5 USD). */
const fromMinorUnits = (minor, currency) =>
  ZERO_DECIMAL.has(String(currency || '').toLowerCase()) ? Number(minor) : Number(minor) / 100;

// ── Devise d'affichage selon le pays de la carte ─────────────────────────────
const FCFA_COUNTRIES = ['CM', 'CF', 'TD', 'CG', 'GQ', 'GA', 'BJ', 'BF', 'CI', 'GW', 'ML', 'NE', 'SN', 'TG'];
const EUR_COUNTRIES = ['AT', 'BE', 'CY', 'DE', 'EE', 'ES', 'FI', 'FR', 'GR', 'HR', 'IE', 'IT', 'LT', 'LU', 'LV',
                       'MT', 'NL', 'PT', 'SI', 'SK', 'AD', 'MC', 'SM', 'VA', 'ME', 'XK'];

/**
 * Devise d'affichage (FCFA | EUR | USD | RMB) pour le pays d'émission d'une carte (ISO-2),
 * ou null si le pays est inconnu. Les autres pays (États-Unis, Canada, Royaume-Uni…) sont en USD.
 */
const displayCurrencyForCountry = (country) => {
  const c = String(country || '').trim().toUpperCase();
  if (!c) return null;
  if (FCFA_COUNTRIES.includes(c)) return 'FCFA';
  if (EUR_COUNTRIES.includes(c)) return 'EUR';
  if (c === 'CN') return 'RMB';
  return 'USD';
};

/**
 * Montant à afficher sur la facture dans la devise du pays de la carte : { currency, amount },
 * ou null quand la facture reste en USD (pays inconnu, pays en USD, ou paiement hors USD).
 */
const invoiceDisplayFor = (amountUsd, cardCountry, currency = 'USD') => {
  if (String(currency).toUpperCase() !== 'USD') return null;
  const target = displayCurrencyForCountry(cardCountry);
  if (!target || target === 'USD') return null;
  return { currency: target, amount: equivalentsFor(amountUsd)[target] };
};

module.exports = {
  APC_DEFAULT_USD, APC_MIN_USD, APC_MAX_USD,
  equivalentsFor, priceList, priceLine, fmtNum, parseApcAmount, toMinorUnits, fromMinorUnits,
  displayCurrencyForCountry, invoiceDisplayFor,
};
