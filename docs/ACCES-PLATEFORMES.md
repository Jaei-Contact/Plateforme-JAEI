# Accès aux plateformes — JAEI

> Liste des services utilisés par la plateforme JAEI et des accès nécessaires
> pour les administrer. Colonnes pré-remplies quand l'information est déjà
> connue/documentée ailleurs ; le reste (mots de passe, 2FA, propriétaire du
> compte) est à compléter.
>
> ⚠️ Avant de remplir les mots de passe : ce fichier est suivi par Git comme le
> reste du dépôt. S'il doit contenir de vrais secrets, vérifier que le dépôt
> est privé, ou préférer un gestionnaire de mots de passe partagé et ne garder
> ici que le renvoi vers celui-ci (voir colonne "Où se trouve le secret").

---

## Plateformes

| Plateforme | Rôle | URL de connexion | Compte / email utilisé | Identifiant du service | Où se trouve le secret | 2FA |
|---|---|---|---|---|---|---|
| GitHub | Dépôt de code, Actions (sauvegarde) | https://github.com/login | | `Jaei-Contact/Plateforme-JAEI` (remote `jaei`) | | |
| Render | Hébergement frontend + backend | https://dashboard.render.com | | `jaei-frontend`, `jaei-backend` | | |
| Neon | Base de données PostgreSQL | https://console.neon.tech | probable : `contact@jaei-journal.org` (emails de compte Neon reçus à cette adresse) | région Frankfurt | | |
| Infomaniak | Domaine, DNS, boîte mail | https://manager.infomaniak.com | `contact@jaei-journal.org` | `jaei-journal.org` | | |
| Resend | Envoi d'emails transactionnels | https://resend.com/login | | domaine `jaei-journal.org` vérifié (DKIM/SPF) | | |
| Cloudinary | Stockage des fichiers (manuscrits, factures) | https://cloudinary.com/users/login | probable : `contact@jaei-journal.org` | cloud name `dkskhvmxm` | | |
| Google (Gemini API) | Fonctions IA | https://aistudio.google.com | | `gemini-2.5-flash` | | |
| CinetPay | Paiement en ligne (non activé) | https://app.cinetpay.com/auth/login | | — | | |
| Stripe | Paiement en ligne (choix retenu, non activé) | https://dashboard.stripe.com/login | | — | | |

*Colonne "Compte / email utilisé" pré-remplie seulement quand observée
directement dans des emails de compte (Neon, Cloudinary) ou dans la
configuration existante (Infomaniak) — à confirmer, pas une certitude absolue.*

## Variables d'environnement liées (rappel)

Le détail de chaque variable est dans `EXPLOITATION.md` §2. Ce tableau ne
fait que relier chaque plateforme à l'endroit où sa clé vit en production :

| Plateforme | Variable(s) | Où la renseigner |
|---|---|---|
| Neon | `DATABASE_URL` | Render → `jaei-backend` → Environment |
| Resend | `RESEND_API_KEY` | idem |
| Cloudinary | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | idem |
| Google Gemini | `GEMINI_API_KEY` | idem |
| CinetPay | `CINETPAY_API_KEY`, `CINETPAY_SITE_ID`, `CINETPAY_NOTIFY_URL` | idem |
| Stripe | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | idem |
| GitHub Actions (sauvegarde) | `DATABASE_URL` | GitHub → Settings du dépôt → Secrets and variables → Actions |

## À faire

- [ ] Renseigner compte/email, 2FA et emplacement du secret pour chaque ligne
- [ ] Confirmer ou corriger les comptes marqués "probable"
- [ ] Décider où vivent les mots de passe eux-mêmes (gestionnaire partagé recommandé plutôt qu'en clair ici)
- [ ] Vérifier la visibilité du dépôt GitHub (privé/public) si ce fichier finit par contenir des secrets
