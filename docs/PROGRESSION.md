# Progression du projet JAEI

## Phase 1 — Semaine 1 : Setup + BDD + Auth ✅

### Backend
- [x] Initialisation projet Node.js/Express
- [x] Connexion PostgreSQL (`pg`)
- [x] Route `POST /api/auth/register`
- [x] Route `POST /api/auth/login`
- [x] JWT + Bcrypt opérationnels

### Base de données
- [x] Base `jaei_db` créée
- [x] Table `users` (4 rôles : author, reviewer, admin, reader)
- [x] Table `submissions` (6 statuts : pending → under_review → revised → accepted → published / rejected)
- [x] Table `reviews` (4 recommandations)
- [x] Table `payments` (Stripe)
- [x] Table `research_areas` (4 domaines pré-remplis)
- [x] Table `published_articles`
- [x] Schéma sauvegardé dans `database/schema.sql`

### Sécurité
- [x] Middleware RBAC (roles: admin, reviewer, author, reader)
- [x] Configuration CORS stricte (liste blanche)

---

## Phase 2 — Semaine 2 : Dashboards + Soumissions + Upload ✅

### Backend
- [x] Middleware auth JWT (`middleware/auth.js`)
- [x] Route `GET /api/auth/me`
- [x] Route `POST /api/auth/logout`
- [x] Routes `submissions` (créer, lister, changer statut, upload PDF Cloudinary)
- [x] Routes `reviews` (assigner, soumettre évaluation, lister)
- [x] Route `PATCH /api/submissions/:id/status` (transitions de statut)
- [x] Notifications email Nodemailer (7 templates HTML)
- [x] Infrastructure paiement Stripe backend (6 routes)

### Frontend
- [x] Page Login / Register (design ScienceDirect)
- [x] Dashboard Auteur — stats, soumissions par onglets
- [x] Dashboard Admin — KPI, gestion soumissions + utilisateurs
- [x] Dashboard Reviewer — articles assignés, formulaire évaluation
- [x] Layout commun DashboardLayout (sidebar, header, menu profil)
- [x] Modal d'assignation reviewer (Admin)
- [x] Page détail soumission (auteur + admin + reviewer)

### Sauvegarde
- [x] Commit GitHub — https://github.com/McWyz05/jaei-plateform

---

## Phase 3 — Semaine 3 : Site public ✅

- [x] Page d'accueil (HomePage) — design ScienceDirect, stats temps réel, publications récentes
- [x] Page catalogue articles (ArticlesPage) — filtres multi-domaines, recherche full-text, pagination
- [x] Page détail article (ArticleDetail) — redesign complet ScienceDirect, onglets, métriques
- [x] Page À propos (AboutPage) — sommaire interactif sticky, scrollspy
- [x] Pages légales (TermsPage, PrivacyPage, CookiesPage)
- [x] Backend : endpoints publics articles (`GET /api/articles`, stats, détail)
- [x] Support fichiers Word (.docx) en soumission
- [x] Corrections filtres recherche par domaine (22 valeurs harmonisées)

---

## Phase 4 — Semaine 4 (1–7 Avril 2026) ✅

- [x] Système notifications email — 7 templates HTML responsives (Nodemailer)
- [x] Infrastructure IA — OpenAI GPT-4o-mini (suggestions mots-clés, amélioration résumé, analyse pertinence)
- [x] Infrastructure paiement Stripe backend complet (6 routes, table payments)
- [x] Correction 6 bugs critiques (statuts, CORS, middleware webhook, reset-password, logout)

---

## Phase 5 — Semaine 5 (8–14 Avril 2026) ✅

- [x] Wizard soumission 3 étapes (refonte complète SubmitArticle.jsx)
  - Étape 1 : Informations générales
  - Étape 2 : Fichier PDF + Analyse IA
  - Étape 3 : Paiement
- [x] Intégration IA Gemini 1.5 Flash (extraction PDF via pdf-parse + génération abstract/mots-clés)
- [x] Mode paiement dev — formulaire fictif visible (démo client) + bypass Stripe
- [x] Boutons d'action admin directement dans SubmissionDetail (assigner, révision, accepter, rejeter, publier)
- [x] Correction dashboard Reviewer :
  - Endpoint GET /api/reviews/by-submission/:submissionId (fix "Unable to load article")
  - Bouton "Review" masqué pour articles publiés/acceptés/rejetés
- [x] Corrections UI : sidebar (espace blanc 56px), scroll inter-étapes, débordement texte, avatars cassés
- [x] Achat nom de domaine jaei-journal.org (Infomaniak, 9,20€/an)
- [x] Création adresse email contact@jaei-journal.org + configuration SMTP Infomaniak
- [x] Unification toutes les adresses email → contact@jaei-journal.org
- [x] Fichier .env.production préparé pour déploiement Render

---

## Phase 6 — Semaine 6 : Déploiement production ⏳

- [ ] Déploiement PostgreSQL sur Render
- [ ] Déploiement backend Node.js sur Render
- [ ] Déploiement frontend React sur Render
- [ ] Pointage DNS Infomaniak → Render
- [ ] Configuration Stripe production (clés client)
- [ ] Tests end-to-end complets en production
- [ ] Livraison finale au client
