# JAEI Platform

**Journal of Agricultural and Environmental Innovation**

Plateforme web de publication d'articles scientifiques avec évaluation par les pairs
(soumission auteur → révision experts → décision éditoriale → publication).

- **Site public** : https://jaei-journal.org
- **API** : https://jaei-backend.onrender.com/api

---

## Documentation

| Document | Contenu |
|---|---|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Architecture, modèle de données, workflows métier, sécurité |
| [`docs/API.md`](docs/API.md) | Référence complète des 64 endpoints de l'API REST |
| [`docs/EXPLOITATION.md`](docs/EXPLOITATION.md) | Déploiement, variables d'environnement, sauvegardes, incidents |
| [`docs/PROGRESSION.md`](docs/PROGRESSION.md) | Historique d'avancement du projet |

---

## Stack technique

| Couche | Technologie | Version |
|---|---|---|
| Frontend | React + React Router + Tailwind CSS, build Vite | React 19, Router 7, Vite 5 |
| Backend | Node.js + Express | Express 5 |
| Base de données | PostgreSQL (client `pg`, sans ORM) | pg 8 |
| Authentification | JWT (`jsonwebtoken`) + Bcrypt (coût 12) | — |
| Stockage fichiers | Cloudinary si configuré, sinon disque local | cloudinary 2 |
| Emails | Resend (API HTTP) en production, SMTP en local | nodemailer 8 |
| Paiement | CinetPay (Mobile Money / carte, Afrique de l'Ouest et Centrale) | — |
| IA | Google Gemini `gemini-2.5-flash` | @google/generative-ai 0.24 |
| Hébergement | Render (backend Node + frontend statique) | plan gratuit |
| Base hébergée | Neon PostgreSQL (région Frankfurt) | — |

> Le `README` précédent mentionnait Stripe, OpenAI et Vercel : ces technologies
> ont été envisagées au démarrage mais **ne sont pas** celles retenues. Le tableau
> ci-dessus reflète le code réellement déployé.

---

## Lancer le projet en local

### Prérequis
- **Node.js 20+** (développé et testé sous Node 24)
- **PostgreSQL 14+** avec une base `jaei_db`, ou une chaîne `DATABASE_URL` vers Neon
- Un fichier `backend/.env` (voir [`docs/EXPLOITATION.md`](docs/EXPLOITATION.md#variables-denvironnement))

### Backend
```bash
cd backend
npm install
npm run dev
```
→ http://localhost:5000 — health check sur `/api/health`

Au démarrage, `db/init.js` crée les tables manquantes et applique les migrations
idempotentes : **aucune commande de migration manuelle n'est nécessaire**.

### Frontend
```bash
cd frontend
npm install
npm start
```
→ http://localhost:3000 (Vite ; `/api` est proxifié vers le port 5000)

### Build de production
```bash
cd frontend
npm run build
```
→ dossier `frontend/build/`

---

## Structure du projet

```
jaei-plateform/
├── backend/
│   ├── db/
│   │   ├── connection.js       # Pool PostgreSQL (DATABASE_URL ou variables séparées)
│   │   ├── init.js             # Création des tables + migrations au démarrage
│   │   └── seed-editorial-board.js
│   ├── middleware/
│   │   ├── auth.js             # verifyToken (JWT)
│   │   └── rateLimiter.js      # 7 limiteurs (login, register, IPN…)
│   ├── routes/                 # 10 routeurs Express (voir docs/API.md)
│   ├── services/
│   │   ├── emailService.js     # 19 modèles d'emails + envoi Resend/SMTP
│   │   ├── aiService.js        # Gemini (résumé, extraction, pertinence)
│   │   ├── notificationService.js
│   │   └── cloudinaryService.js
│   ├── utils/articleTypes.js   # Numérotation des manuscrits
│   ├── uploads/                # Stockage local (dev) — non versionné
│   └── server.js
├── frontend/
│   └── src/
│       ├── components/         # Composants réutilisables
│       ├── pages/              # public / auth / author / reviewer / admin / shared
│       ├── context/AuthContext.jsx
│       ├── hooks/              # useCountUp, useScrollReveal
│       ├── utils/api.js        # Client axios + intercepteurs
│       └── App.jsx             # Routage et gardes de rôle
├── database/schema.sql
├── docs/
└── render.yaml                 # Blueprint Render (historique — voir EXPLOITATION.md)
```

---

## Rôles utilisateurs

| Rôle | Accès | Création |
|---|---|---|
| `admin` | Gestion complète : soumissions, utilisateurs, comité éditorial, paiements, statistiques | Promotion en base uniquement |
| `reviewer` | Évaluation des articles assignés | Inscription publique ou invitation par email |
| `author` | Soumission et suivi d'articles, paiement des APC | Inscription publique |

La consultation du catalogue, la lecture des résumés et le téléchargement des
articles publiés sont **libres et sans compte** : il n'existe pas de rôle `reader`.

Un auteur peut aussi être reviewer (demande client du 28/07) : les espaces
`/reviewer/*` sont ouverts aux rôles `author`, `reviewer` et `admin`, l'accès aux
données restant filtré côté serveur sur `reviewer_id`.

---

## Licence et propriété

Code livré au client dans le cadre du *Contrat de Prestation JAEI*.
Dépôt de déploiement : `Jaei-Contact/Plateforme-JAEI`.
