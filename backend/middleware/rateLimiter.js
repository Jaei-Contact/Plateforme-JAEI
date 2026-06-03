const rateLimit = require('express-rate-limit');

// ============================================================
// JAEI — Rate Limiters
// Protège les routes sensibles contre le brute-force et l'abus
// ============================================================

// ── Auth : login ─────────────────────────────────────────────
// 10 tentatives max par 15 minutes par IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login attempts. Please try again in 15 minutes.' },
  skipSuccessfulRequests: true, // ne compte pas les connexions réussies
});

// ── Auth : register ──────────────────────────────────────────
// 5 inscriptions max par heure par IP
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many accounts created. Please try again in 1 hour.' },
});

// ── Auth : forgot-password & resend-verification ─────────────
// 5 demandes max par heure par IP
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many reset requests. Please try again in 1 hour.' },
});

// ── API publique : notation articles ─────────────────────────
// 30 notations max par heure par IP (1 par article en pratique,
// mais on reste souples pour les tests)
const ratingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many ratings. Please try again later.' },
});

// ── API publique : download counter ──────────────────────────
// 60 incréments max par heure par IP
const downloadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests.' },
});

// ── IPN paiements (CinetPay notify) ──────────────────────────
// 100 appels max par heure (suffisant pour les IPN légitimes)
const ipnLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests.',
});

module.exports = {
  loginLimiter,
  registerLimiter,
  passwordResetLimiter,
  ratingLimiter,
  downloadLimiter,
  ipnLimiter,
};
