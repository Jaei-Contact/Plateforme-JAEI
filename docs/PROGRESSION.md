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
- [x] Table `payments` (Orange Money, MTN MoMo, Stripe)
- [x] Table `research_areas` (4 domaines pré-remplis)
- [x] Table `published_articles`
- [x] Schéma sauvegardé dans `database/schema.sql`

### Sécurité
- [x] Route debug `GET /api/auth/users` supprimée
- [x] Prisma désinstallé (stack 100% `pg`)

---

## Phase 2 — Semaine 2 : Dashboards + Soumissions + Upload ✅

### Backend
- [x] Middleware auth JWT (protection des routes) — `middleware/auth.js`
- [x] Route `GET /api/auth/me` (profil connecté)
- [x] Route `POST /api/auth/logout` (déconnexion stateless)
- [x] Routes `submissions` (créer, lister, changer statut, upload PDF local)
- [x] Routes `reviews` (assigner reviewer, soumettre évaluation, lister par soumission)
- [x] Route `GET /api/users` + `PATCH /api/users/:id/role` (admin)
- [x] Notifications email — Nodemailer (`services/emailService.js`)
  - Email de bienvenue (inscription)
  - Confirmation de soumission
  - Assignation d'un reviewer
  - Décision éditoriale (accepté / révision / rejeté)

### Frontend
- [x] Structure React + Vite + Tailwind (migration depuis react-scripts)
- [x] Page Login (design inspiré ScienceDirect)
- [x] Page Register (2 étapes, liste déroulante spécialités)
- [x] Dashboard Auteur — données réelles API, stats, soumissions filtrées par onglets
- [x] Dashboard Admin — données réelles API, KPI, gestion soumissions + utilisateurs
- [x] Dashboard Reviewer — données réelles API, articles assignés
- [x] Layout commun DashboardLayout (sidebar, header, menu profil, déconnexion)
- [x] Formulaire de soumission d'article (3 étapes, upload PDF)
- [x] Formulaire d'évaluation Reviewer (`/reviewer/assignments/:id`)
- [x] Modal d'assignation reviewer (Admin — sélection visuelle + confirmation)
- [x] Page détail soumission (`/author/submissions/:id` + `/admin/submissions/:id`)
  - Affiche résumé, mots-clés, PDF, statut, timeline
  - Commentaires reviewer visibles (anonymat auteur préservé)
- [x] Barres de défilement supprimées (sidebar, main, onglets)
- [x] AuthContext + gestion erreurs unifiée
- [x] Intercepteur Axios anti-boucle

### Sauvegarde
- [x] Premier commit GitHub — https://github.com/McWyz05/jaei-plateform

---

## Phase 3 — Semaine 3 : Site public + Paiements + IA ⏳

- [ ] Site public & catalogue d'articles
- [ ] Recherche et filtres
- [ ] Paiement Orange Money + MTN MoMo + Stripe
- [ ] Assistant IA (résumés automatiques + aide à la révision)

---

## Phase 4-5 — Semaines 4-5 : Design + Tests + Staging ⏳

- [ ] Design complet & responsive
- [ ] Tests unitaires et d'intégration
- [ ] Corrections de bugs
- [ ] Déploiement staging

---

## Phase 5 — Semaine 6 : Production ⏳

- [ ] Documentation finale
- [ ] Formation client
- [ ] Déploiement production
- [ ] Mise en ligne avec nom de domaine
