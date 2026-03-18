# JAEI Platform

**Journal of Agricultural and Environmental Innovation**

Plateforme web de publication d'articles scientifiques avec système de révision par les pairs.

---

## Stack technique

| Couche | Technologie |
|---|---|
| Frontend | React 19, Tailwind CSS, React Router 7, Axios |
| Backend | Node.js, Express 5, JWT, Bcrypt, Multer, Nodemailer |
| Base de données | PostgreSQL 18 (pg direct) |
| Stockage PDF | Cloudinary |
| Paiements | Stripe + Orange Money + MTN MoMo |
| IA | OpenAI GPT-4 |
| Hébergement | Vercel (front) + Railway/Render (back) |

---

## Lancer le projet en local

### Prérequis
- Node.js 20+
- PostgreSQL 18 avec la base `jaei_db` créée
- Fichier `.env` configuré (voir `.env.example`)

### Backend
```bash
cd backend
npm install
npm run dev   # démarre sur http://localhost:5000
```

### Frontend
```bash
cd frontend
npm install
npm start     # démarre sur http://localhost:3000
```

---

## Structure du projet

```
jaei-plateform/
├── backend/
│   ├── db/             # Connexion PostgreSQL
│   ├── routes/         # Routes API
│   ├── middleware/      # Auth JWT, upload, etc.
│   └── server.js
├── frontend/
│   └── src/
│       ├── components/  # Composants réutilisables
│       ├── pages/       # Pages de l'application
│       ├── context/     # AuthContext (état global)
│       └── services/    # Appels API (axios)
├── database/
│   └── schema.sql       # Schéma complet de la BDD
└── docs/
    ├── API.md           # Documentation des endpoints
    └── PROGRESSION.md   # Suivi d'avancement du projet
```

---

## Rôles utilisateurs

| Rôle | Accès |
|---|---|
| `admin` | Gestion complète de la plateforme |
| `reviewer` | Évaluation des articles assignés |
| `author` | Soumission et suivi d'articles |
| `reader` | Consultation du catalogue, achat d'articles |

---

## Variables d'environnement

Copier `.env.example` en `.env` et remplir les valeurs :

```
DATABASE_USER=
DATABASE_HOST=
DATABASE_NAME=jaei_db
DATABASE_PASSWORD=
DATABASE_PORT=5432
JWT_SECRET=
PORT=5000
```
