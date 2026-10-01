# Paiements & facturation — état de préparation

> Destiné à la personne qui activera les paiements en ligne, que ce soit
> l'équipe actuelle ou quelqu'un d'autre à qui le client confierait la suite.
> Répond au Commentaire 2 du client (28/09, fichier `Comment 28.09.2026.pdf`)
> et au choix de prestataire acté avec le client : **Stripe**, pas PayPal
> (indisponible pour une entreprise basée au Cameroun).
>
> ⚠️ **Ce document ne contient aucun secret.** Les clés sont à obtenir depuis
> les tableaux de bord des prestataires eux-mêmes et à renseigner dans les
> variables d'environnement listées ci-dessous.

---

## 1. Prérequis administratif (pas technique)

Stripe n'ouvre pas de compte pour une entité basée au Cameroun. Il faut une
personne ou structure résidant dans un pays supporté (Canada, France,
États-Unis, UE/UK, et une partie de l'Asie — Japon, Singapour, Hong Kong,
Malaisie, Thaïlande ; la Chine continentale n'est pas supportée) pour ouvrir
et détenir le compte Stripe. C'est la seule chose qui bloque l'activation —
le code, lui, est prêt.

## 2. Variables d'environnement à renseigner

Une fois le compte Stripe ouvert (`backend/.env` en local, variables
d'environnement Render en production) :

| Variable | Où l'obtenir | Obligatoire |
|---|---|---|
| `STRIPE_SECRET_KEY` | dashboard.stripe.com → Developers → API keys | Oui |
| `STRIPE_WEBHOOK_SECRET` | dashboard.stripe.com → Developers → Webhooks → créer un endpoint `https://<backend>/api/payments/stripe/webhook`, événements `checkout.session.completed` + `checkout.session.expired` | Oui |
| `BACKEND_URL` | URL publique du backend (déjà généralement configurée) | Oui si Cloudinary absent (fallback factures locales) |
| `FX_RATE_XAF_TO_USD` / `_EUR` / `_CAD` | taux manuel, à vérifier avant mise en prod | Non — affichage seulement, masqué si vide |

Rien d'autre à modifier : dès que `STRIPE_SECRET_KEY` est présent, le bouton
Stripe apparaît automatiquement sur la page de paiement (`isDevMode()` bascule
tout seul), et toute la chaîne ci-dessous s'active avec.

## 3. Ce qui est prêt, par tâche du Commentaire 2 client

| Tâche (Commentaire 2) | État | Détail |
|---|---|---|
| Accepter paiements en ligne | ✅ Prêt | Stripe Checkout Session (`routes/payments.js`), même schéma que l'intégration CinetPay existante |
| Sécuriser les transactions (PCI DSS, tokenisation, 3D Secure) | ✅ Prêt (natif Stripe) | Géré par Stripe Checkout, aucun code à écrire |
| Émettre des reçus | ✅ Prêt (natif Stripe) + partiel | Stripe envoie un reçu par email par défaut (à vérifier/activer dans le dashboard) ; en plus, chaque paiement génère une facture PDF téléchargeable (voir ci-dessous) |
| Générer des factures | ✅ Prêt, taxe non configurée | PDF séquentiel (`JAEI-INV-000001`…) auto-généré à chaque paiement complété (`services/invoiceService.js`), stocké sur Cloudinary (ou disque local en dev). **Ligne de taxe volontairement vide** — voir section 5 |
| Rembourser | ✅ Prêt (Stripe uniquement) | `POST /api/payments/:id/refund` (admin). Pour CinetPay : non implémenté, à traiter manuellement via leur support — pas d'API de remboursement en libre-service dans leur doc standard |
| Concilier les paiements | ✅ Prêt | `GET /api/payments/reconciliation` (admin) — liste paiements/factures et signale les écarts |
| Convertir les devises (affichage) | ✅ Prêt, taux à saisir | Affichage `≈ montant USD/EUR/CAD` sous le prix FCFA, taux manuels via env (pas d'appel API de change externe) |
| Proposer paiements internationaux (Wise, PayPal, SWIFT) | ❌ Non fait | PayPal explicitement écarté (client). Wise/SWIFT sont des processus bancaires manuels, pas un produit "paiement en ligne" à intégrer par API de la même façon que Stripe |
| Offrir paiement échelonné | ❌ Non fait | Les règles métier ne sont pas spécifiées (montant du dépôt ? nombre de versements ? échéances ?) — à définir avec le client avant tout développement |
| Gérer les abonnements | ❌ Non fait | Aucun produit récurrent n'existe actuellement dans JAEI (frais de soumission = paiement unique) — rien à quoi rattacher un abonnement pour l'instant |

Non demandé dans le Commentaire 2 mais mentionné par le client en réunion :
Square et Moneris ne sont pas intégrés — redondants avec Stripe (même
contrainte de pays éligible), et le choix du client s'est porté sur Stripe
spécifiquement.

## 4. Ce qui existe déjà à côté — ne pas confondre

Le paiement Stripe ci-dessus concerne le **frais de soumission**
(`SUBMISSION_FEE_XAF`, table `payments`, déclenché à la soumission). Il existe
un second mécanisme, indépendant, pour l'**APC** (Article Processing Charge) :
Remarque 16 du client précise qu'il doit être encaissé **après acceptation,
hors ligne** (Mobile Money / virement), marqué manuellement par l'admin via
`PATCH /api/submissions/:id/apc`. Ce document ne change rien à ce second
circuit.

## 5. Facturation — la case taxe est vide, volontairement

`invoiceService.js` génère des factures sans taxe (`tax_label`/`tax_amount`
= vide/0). Impossible de renseigner un régime fiscal correct sans savoir
quelle entité détient le compte Stripe et dans quel pays — JAEI est basé au
Cameroun, mais le Commentaire 2 mentionne TPS/TVQ (fiscalité canadienne), ce
qui suppose que la personne trouvée pour ouvrir le compte serait canadienne.
**À trancher avec qui gère la suite** avant de coder une ligne de taxe :
c'est une décision fiscale/légale, pas technique.

## 6. Checklist de mise en route (une fois le compte Stripe ouvert)

1. Renseigner `STRIPE_SECRET_KEY` et `STRIPE_WEBHOOK_SECRET` (section 2).
2. Configurer l'endpoint webhook dans le dashboard Stripe (section 2).
3. Faire un paiement test en mode Stripe test (carte `4242 4242 4242 4242`)
   et vérifier : statut `completed` en base, email de confirmation reçu,
   facture PDF téléchargeable depuis l'écran de retour de paiement.
4. Décider du régime de taxe (section 5) et l'ajouter dans
   `invoiceService.js` si nécessaire.
5. Si besoin d'afficher les montants convertis : renseigner les `FX_RATE_*`.
6. Repasser en Stripe **live keys** pour la production.
