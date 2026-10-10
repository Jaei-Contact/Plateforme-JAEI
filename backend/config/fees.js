// ============================================================
// JAEI — Montant de l'APC (Article Processing Charge)
//
// APC_FEE_XAF est le nom à utiliser. SUBMISSION_FEE_XAF (ancien nom, de
// l'époque où les frais étaient demandés à la soumission) reste lu pour ne
// pas casser une configuration existante sur Render.
// ============================================================

const APC_FEE_XAF = parseInt(process.env.APC_FEE_XAF || process.env.SUBMISSION_FEE_XAF, 10) || 100000;

// ── Tarif publié de l'APC dans les 4 devises affichées ───────────────────
// Même grille que le site et l'email d'acceptation : 100 000 FCFA · 155 € · $180 USD · ¥1 300 RMB.
// Seul le FCFA (XAF) est réellement débité par Stripe : les autres montants servent à l'AFFICHAGE
// de la facture, selon le pays d'émission de la carte. La grille n'a de sens que pour le montant de
// référence (100 000 FCFA) : pour tout autre montant, la facture reste en FCFA seul.
const APC_PRICE_LIST_BASE_XAF = 100000;
const APC_PRICE_LIST = { FCFA: 100000, EUR: 155, USD: 180, RMB: 1300 };

const FCFA_COUNTRIES = ['CM', 'CF', 'TD', 'CG', 'GQ', 'GA', 'BJ', 'BF', 'CI', 'GW', 'ML', 'NE', 'SN', 'TG'];
const EUR_COUNTRIES = ['AT', 'BE', 'CY', 'DE', 'EE', 'ES', 'FI', 'FR', 'GR', 'HR', 'IE', 'IT', 'LT', 'LU', 'LV',
                       'MT', 'NL', 'PT', 'SI', 'SK', 'AD', 'MC', 'SM', 'VA', 'ME', 'XK'];

/**
 * Devise d'affichage (FCFA | EUR | USD | RMB) pour le pays d'émission d'une carte (ISO-2),
 * ou null si le pays est inconnu. Les pays hors zone FCFA / euro / Chine (États-Unis, Canada,
 * Royaume-Uni…) sont affichés en USD, la devise internationale de la grille.
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
 * ou null quand la facture reste en FCFA (pays inconnu, zone FCFA, ou montant hors grille).
 */
const invoiceDisplayFor = (amountXaf, cardCountry) => {
  if (Number(amountXaf) !== APC_PRICE_LIST_BASE_XAF) return null;
  const currency = displayCurrencyForCountry(cardCountry);
  if (!currency || currency === 'FCFA') return null;
  return { currency, amount: APC_PRICE_LIST[currency] };
};

module.exports = { APC_FEE_XAF, APC_PRICE_LIST, displayCurrencyForCountry, invoiceDisplayFor };
