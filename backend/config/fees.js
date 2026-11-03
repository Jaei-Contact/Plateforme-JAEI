// ============================================================
// JAEI — Montant de l'APC (Article Processing Charge)
//
// Le débit réel (Stripe) et les factures se font en DOLLARS US, et le montant n'est
// JAMAIS affiché dans une autre devise (demande du client : aucune conversion).
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

// Nombre lisible : « 1 250 » (milliers séparés par une espace), décimales seulement si nécessaires
const fmtNum = (n) => {
  const v = Number(n) || 0;
  const dec = Number.isInteger(v) ? 0 : 2;
  return v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }).replace(/,/g, ' ');
};

/** « $200 USD » (même style que sur le site). */
const priceLine = (amountUsd) => `$${fmtNum(amountUsd)} USD`;

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

module.exports = {
  APC_DEFAULT_USD, APC_MIN_USD, APC_MAX_USD,
  priceLine, fmtNum, parseApcAmount, toMinorUnits, fromMinorUnits,
};
