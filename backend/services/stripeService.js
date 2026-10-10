// ============================================================
// JAEI — Lectures Stripe côté serveur (hors Checkout)
// ============================================================

const stripeClient = process.env.STRIPE_SECRET_KEY
  ? require('stripe')(process.env.STRIPE_SECRET_KEY)
  : null;

/**
 * Pays d'émission de la carte (code ISO-2, ex. 'FR') d'un paiement Stripe, ou null si
 * indisponible. Sert à afficher la facture dans la devise du pays de la carte : Stripe ne
 * donne ce pays qu'APRÈS le paiement. Ne lève jamais d'exception (un échec ici ne doit pas
 * empêcher d'enregistrer le paiement : la facture reste alors en FCFA).
 */
const getCardCountry = async (paymentIntentId) => {
  if (!stripeClient || !paymentIntentId) return null;
  try {
    const pi = await stripeClient.paymentIntents.retrieve(paymentIntentId, { expand: ['latest_charge'] });
    return pi.latest_charge?.payment_method_details?.card?.country || null;
  } catch (e) {
    console.error('⚠️  Stripe : pays de la carte indisponible —', e.message);
    return null;
  }
};

module.exports = { getCardCountry };
