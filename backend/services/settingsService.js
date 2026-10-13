// ============================================================
// JAEI — Réglages modifiables par l'administrateur
//
// Aujourd'hui : le montant de l'APC (en USD). Priorité :
//   1. valeur saisie par l'admin (table app_settings) ;
//   2. à défaut (rien de saisi), APC_DEFAULT_USD (config/fees.js).
// Chaque changement est journalisé (app_settings_history : qui, quand, ancienne/nouvelle valeur).
// ============================================================

const pool = require('../db/connection');
const { APC_DEFAULT_USD, APC_MIN_USD, APC_MAX_USD, parseApcAmount, priceList } = require('../config/fees');

const APC_KEY = 'apc_amount_usd';
const TTL_MS = 30 * 1000;        // les pages publiques lisent ce montant : on évite une requête à chaque affichage
let cached = null;               // { amount, at }

const invalidate = () => { cached = null; };

/**
 * Montant effectif de l'APC en USD : valeur saisie par l'admin (si valide), sinon défaut du code.
 * Si la base ne répond pas, on retombe sur le défaut (affichage), SAUF avec { strict: true } où l'erreur
 * est propagée : le débit d'une carte ne doit jamais se faire sur un montant que l'on n'a pas pu lire.
 */
const getApcAmountUsd = async ({ strict = false } = {}) => {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.amount;
  try {
    const r = await pool.query('SELECT value FROM app_settings WHERE key = $1', [APC_KEY]);
    let amount = APC_DEFAULT_USD;
    if (r.rows.length > 0) {
      const p = parseApcAmount(r.rows[0].value);
      if (p.ok) amount = p.value;          // valeur illisible en base → défaut, jamais un montant incohérent
    }
    cached = { amount, at: Date.now() };
    return amount;
  } catch (e) {
    if (strict) throw e;
    console.error("⚠️  Lecture du montant de l'APC impossible — valeur par défaut utilisée :", e.message);
    return APC_DEFAULT_USD;                 // pas de mise en cache : on relit dès que la base répond
  }
};

/**
 * Valeur d'avant le dernier changement journalisé, pour proposer « Restore previous value » à l'admin.
 * null s'il n'y a eu aucun changement, ou si cette valeur vaut déjà le montant actuel (rien à restaurer).
 * `isDefault` : rien n'était saisi avant (le défaut du code s'appliquait) ; restaurer revient alors à vider le champ.
 */
const getPreviousApc = async (currentAmount) => {
  try {
    const r = await pool.query(
      'SELECT old_value FROM app_settings_history WHERE key = $1 ORDER BY id DESC LIMIT 1',
      [APC_KEY]
    );
    if (r.rows.length === 0) return null;
    const parsed = r.rows[0].old_value === null ? null : parseApcAmount(r.rows[0].old_value);
    const isDefault = !(parsed && parsed.ok);          // valeur absente ou illisible → défaut du code
    const amount = isDefault ? APC_DEFAULT_USD : parsed.value;
    return amount === currentAmount ? null : { amount, isDefault };
  } catch (e) {
    console.error("⚠️  Lecture de l'historique du montant de l'APC impossible :", e.message);
    return null;
  }
};

/** État du réglage pour l'écran admin. */
const getApcSetting = async () => {
  let row = null;
  try {
    const r = await pool.query(
      `SELECT s.value, s.updated_at, u.first_name, u.last_name
         FROM app_settings s LEFT JOIN users u ON u.id = s.updated_by
        WHERE s.key = $1`,
      [APC_KEY]
    );
    row = r.rows[0] || null;
  } catch (e) {
    console.error("⚠️  Lecture du réglage de l'APC impossible :", e.message);
  }
  const amount = await getApcAmountUsd();
  const parsed = row ? parseApcAmount(row.value) : null;
  const isCustom = !!(parsed && parsed.ok);
  return {
    amount,
    defaultAmount: APC_DEFAULT_USD,
    isCustom,
    minAmount: APC_MIN_USD,
    maxAmount: APC_MAX_USD,
    updatedAt: isCustom ? row.updated_at : null,
    updatedBy: isCustom ? [row.first_name, row.last_name].filter(Boolean).join(' ').trim() || null : null,
    previous: await getPreviousApc(amount),
    prices: priceList(amount),
  };
};

/**
 * Enregistre le montant de l'APC. `input` vide/null = retour à la valeur par défaut du code.
 * @returns {Promise<{ok: true} | {ok: false, message: string}>}
 */
const setApcAmountUsd = async (input, userId) => {
  const isReset = input === null || input === undefined || String(input).trim() === '';
  let value = null;
  if (!isReset) {
    const p = parseApcAmount(input);
    if (!p.ok) return { ok: false, message: p.message };
    value = String(p.value);
  }
  try {
    const old = await pool.query('SELECT value FROM app_settings WHERE key = $1', [APC_KEY]);
    const oldValue = old.rows.length > 0 ? old.rows[0].value : null;
    if (isReset) {
      await pool.query('DELETE FROM app_settings WHERE key = $1', [APC_KEY]);
    } else {
      await pool.query(
        `INSERT INTO app_settings (key, value, updated_by, updated_at) VALUES ($1, $2, $3, NOW())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = NOW()`,
        [APC_KEY, value, userId]
      );
    }
    await pool.query(
      'INSERT INTO app_settings_history (key, old_value, new_value, changed_by) VALUES ($1, $2, $3, $4)',
      [APC_KEY, oldValue, value, userId]
    );
    return { ok: true };
  } finally {
    invalidate();   // même si l'historique échoue : ne jamais servir un montant périmé
  }
};

module.exports = { getApcAmountUsd, getApcSetting, setApcAmountUsd };
