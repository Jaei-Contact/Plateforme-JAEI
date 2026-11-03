import { useState, useEffect } from 'react';
import api from './api';

// ============================================================
// Prix de l'APC affiché sur le site — UNIQUEMENT en dollars US (aucune conversion)
//
// Le montant réel vient du serveur : valeur saisie par l'administrateur (Settings),
// sinon 200 USD (valeur du code). Tant que le serveur n'a pas répondu (réveil du serveur
// gratuit), on affiche la valeur par défaut.
// ============================================================

export const DEFAULT_USD = 200;

/** « 200 », « 1 250 » ; décimales seulement si nécessaires (249.50). */
export const fmtNum = (n) => {
  const v = Number(n) || 0;
  const dec = Number.isInteger(v) ? 0 : 2;
  return v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }).replace(/,/g, ' ');
};

/** « $200 USD » */
export const priceLineFor = (usd) => `$${fmtNum(usd)} USD`;

/**
 * Montant en USD d'une réponse de /payments/config, ou null si elle n'est pas exploitable
 * (réponse d'un ancien serveur en FCFA, erreur…) : on garde alors la valeur par défaut.
 */
export const usdFromConfig = (cfg) => {
  const v = Number(cfg?.fee);
  return cfg?.currency === 'USD' && v > 0 ? v : null;
};

let cache = null;      // dernier montant renvoyé par le serveur (partagé entre les pages)
let inflight = null;

/** Hook : { amount, line } — prix courant de l'APC (montant en USD et « $200 USD »). */
export const useApcPrice = () => {
  const [amount, setAmount] = useState(cache || DEFAULT_USD);

  useEffect(() => {
    if (cache) { setAmount(cache); return undefined; }
    let alive = true;
    if (!inflight) {
      inflight = api.get('/payments/config')
        .then((r) => { cache = usdFromConfig(r.data); return cache; })
        .catch(() => { inflight = null; return null; });
    }
    inflight.then((v) => { if (alive && v) setAmount(v); });
    return () => { alive = false; };
  }, []);

  return { amount, line: priceLineFor(amount) };
};
