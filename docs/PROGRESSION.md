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

## Phase 2 — Semaine 2 : Dashboards + Soumissions + Upload ⏳

### Backend
- [ ] Middleware auth JWT (protection des routes)
- [ ] Routes `submissions` (créer, lister, changer statut)
- [ ] Upload PDF (Multer + Cloudinary)
- [ ] Routes `reviews` (assigner reviewer, soumettre révision)
- [ ] Notifications email (Nodemailer)

### Frontend
- [ ] Structure React (pages, composants, context, services)
- [ ] Page Login / Register
- [ ] Dashboard Auteur
- [ ] Dashboard Admin
- [ ] Dashboard Reviewer

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
