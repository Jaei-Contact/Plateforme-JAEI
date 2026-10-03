// ============================================================
// JAEI — Montant de l'APC (Article Processing Charge)
//
// APC_FEE_XAF est le nom à utiliser. SUBMISSION_FEE_XAF (ancien nom, de
// l'époque où les frais étaient demandés à la soumission) reste lu pour ne
// pas casser une configuration existante sur Render.
// ============================================================

const APC_FEE_XAF = parseInt(process.env.APC_FEE_XAF || process.env.SUBMISSION_FEE_XAF, 10) || 100000;

module.exports = { APC_FEE_XAF };
