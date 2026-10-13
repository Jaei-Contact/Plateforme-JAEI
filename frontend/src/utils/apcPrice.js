import { useState, useEffect } from 'react';
import api from './api';

// ============================================================
// Prix de l'APC affiché sur le site
//
// Le montant réel (en USD) vient du serveur : valeur saisie par l'administrateur (Settings),
// sinon 200 USD (valeur du code). Les équivalents sont indicatifs (mêmes rapports que
// backend/config/fees.js). Tant que le serveur n'a pas répondu (réveil du serveur gratuit),
// on affiche la valeur par défaut calculée localement.
// ============================================================

const DEFAULT_USD = 200;
const PER_USD = { EUR: 155 / 180, FCFA: 100000 / 180, RMB: 1300 / 180 };

// Arrondi lisible à 3 chiffres significatifs (111 111 → 111 000)
const roundNice = (v) => {
  if (!(v > 0)) return 0;
  const step = Math.max(Math.pow(10, Math.floor(Math.log10(v)) - 2), 0.01);
  return Math.round(v / step) * step;
};

/** { USD, EUR, FCFA, RMB } pour un montant en USD. */
export const priceListFor = (usd) => {
  const a = Number(usd) || 0;
  return {
    USD: a,
    EUR: roundNice(a * PER_USD.EUR),
    FCFA: roundNice(a * PER_USD.FCFA),
    RMB: roundNice(a * PER_USD.RMB),
  };
};

/** « 111 000 » ; décimales seulement si nécessaires (249.50). */
export const fmtNum = (n) => {
  const v = Number(n) || 0;
  const dec = Number.isInteger(v) ? 0 : 2;
  return v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }).replace(/,/g, ' ');
};

/** « $200 USD · 172 € · 111 000 FCFA · ¥1 440 RMB » */
export const priceLineFor = (p) =>
  `$${fmtNum(p.USD)} USD · ${fmtNum(p.EUR)} € · ${fmtNum(p.FCFA)} FCFA · ¥${fmtNum(p.RMB)} RMB`;

let cache = null;      // dernière réponse du serveur (partagée entre les pages)
let inflight = null;

/** Hook : { prices, line } — prix courant de l'APC (USD + équivalents). */
export const useApcPrice = () => {
  const [prices, setPrices] = useState(cache || priceListFor(DEFAULT_USD));

  useEffect(() => {
    if (cache) { setPrices(cache); return undefined; }
    let alive = true;
    if (!inflight) {
      inflight = api.get('/payments/config')
        // Réponse d'un ancien serveur (pas encore redéployé : montant en FCFA, pas de `prices`) → on garde le prix par défaut
        .then((r) => { cache = r.data.currency === 'USD' && r.data.prices ? r.data.prices : null; return cache; })
        .catch(() => { inflight = null; return null; });
    }
    inflight.then((p) => { if (alive && p) setPrices(p); });
    return () => { alive = false; };
  }, []);

  return { prices, line: priceLineFor(prices) };
};
