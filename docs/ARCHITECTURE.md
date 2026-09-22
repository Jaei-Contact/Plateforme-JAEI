# Architecture technique — Plateforme JAEI

> Document de maintenance. Décrit l'architecture réellement déployée, le modèle
> de données, les workflows métier et les mécanismes de sécurité.
> Version du code de référence : branche `main`, commit `1599152` (remarques client du 22/09).

---

## 1. Vue d'ensemble

La plateforme est une application **trois tiers** à couplage faible : le
frontend est un site statique qui consomme une API REST, elle-même adossée à une
base PostgreSQL managée. Les trois composants sont déployés indépendamment.

```
   Navigateur
       │
       │  HTTPS
       ▼
┌──────────────────────┐        ┌──────────────────────────┐
│  FRONTEND (statique) │  HTTPS │  BACKEND (Node/Express)  │
│  React 19 + Vite     │───────▶│  jaei-backend.onrender   │
│  jaei-journal.org    │  /api  │  .com                    │
│  Render Static       │        │  Render Web Service      │
└──────────────────────┘        └───────────┬──────────────┘
                                            │
                        ┌───────────────────┼───────────────────┐
                        │                   │                   │
                        ▼                   ▼                   ▼
                 ┌─────────────┐    ┌──────────────┐   ┌─────────────────┐
                 │   Neon      │    │  Cloudinary  │   │  Services tiers │
                 │ PostgreSQL  │    │  (fichiers)  │   │  Resend (email) │
                 │  Frankfurt  │    │              │   │  Gemini (IA)    │
                 └─────────────┘    └──────────────┘   │  CinetPay (pay) │
                                                       └─────────────────┘
```

**Principes structurants**

| Choix | Motif |
|---|---|
| Pas d'ORM (`pg` en direct) | Requêtes SQL explicites, lisibles et auditables ; aucune couche d'abstraction à maintenir |
| Migrations au démarrage (`db/init.js`) | Le schéma se répare seul à chaque déploiement, sans commande manuelle ni outil externe |
| Frontend statique | Aucun serveur de rendu à maintenir, coût d'hébergement nul, CDN natif |
| JWT sans session serveur | Le backend reste sans état : il peut redémarrer ou être redimensionné sans déconnecter personne |
| Dégradation contrôlée | Chaque service externe absent désactive proprement sa fonctionnalité au lieu de faire tomber l'application (voir §7) |

---

## 2. Backend

### 2.1 Chaîne de traitement d'une requête

Ordre des middlewares dans [`backend/server.js`](../backend/server.js) :

1. `dns.setDefaultResultOrder('ipv4first')` — Render (plan gratuit) ne route pas
   l'IPv6 sortant ; sans cela les appels aux services tiers échouent en `ENETUNREACH`.
2. `app.set('trust proxy', 1)` — **critique** : derrière le proxy inverse de Render,
   sans cette ligne toutes les requêtes partagent l'IP du proxy et les limiteurs de
   débit bloquent tous les utilisateurs simultanément.
3. `helmet` — en-têtes de sécurité HTTP. CSP désactivée (le frontend est servi par
   un autre domaine), `frameguard: sameorigin`.
4. `cors` — liste blanche d'origines : `localhost:3000`, `localhost:5173`,
   `jaei-frontend.onrender.com`, `jaei-journal.org`, `www.jaei-journal.org`, plus
   `FRONTEND_URL`.
5. Fichiers statiques : `/uploads/avatars` (public) et `/uploads/submissions`
   (contrôle d'accès, voir §6.3).
6. `express.json()` — parseur de corps de requête.
7. Routeurs `/api/*`.
8. Gestionnaire d'erreurs global — en production le message d'erreur interne
   n'est jamais renvoyé au client (`Internal server error`).

### 2.2 Routeurs

| Préfixe | Fichier | Responsabilité |
|---|---|---|
| `/api/auth` | `routes/auth.js` | Inscription, vérification email, connexion, mot de passe oublié, profil, avatar |
| `/api/submissions` | `routes/submissions.js` | Cycle de vie des soumissions, fichiers, statuts, APC, messages de l'éditeur, versions révisées, retrait |
| `/api/reviews` | `routes/reviews.js` | Assignation éditeurs et reviewers, invitations externes, dépôt des évaluations |
| `/api/articles` | `routes/articles.js` | Catalogue public, détail, compteurs, notation |
| `/api/users` | `routes/users.js` | Administration des comptes |
| `/api/editorial-board` | `routes/editorial.js` | Comité éditorial (lecture publique, écriture admin) |
| `/api/payments` | `routes/payments.js` | CinetPay : initiation, IPN, vérification, historique |
| `/api/ai` | `routes/ai.js` | Assistance Gemini (mots-clés, résumé, pertinence, extraction Word/PDF) |
| `/api/notifications` | `routes/notifications.js` | Cloche de notifications in-app |
| `/api/admin` | `routes/admin.js` | Diagnostic du schéma, migration et audit des domaines |

Référence exhaustive des 64 endpoints : [`API.md`](API.md).

### 2.3 Services

| Service | Rôle | Dégradation si non configuré |
|---|---|---|
| `emailService.js` | 19 modèles d'emails HTML+texte ; envoi via **Resend** (API HTTPS) en priorité, repli **SMTP** en local | Les envois sont ignorés et journalisés ; aucune requête n'échoue |
| `aiService.js` | Gemini `gemini-2.5-flash` : résumé d'article, extraction de métadonnées, analyse de pertinence | `/api/ai/status` renvoie `available: false`, l'interface masque les boutons IA |
| `cloudinaryService.js` | Upload et suppression des fichiers ; URL de téléchargement authentifiée pour les PDF dont Cloudinary bloque la diffusion publique | Repli automatique sur le disque local (voir §7) |
| `notificationService.js` | `notify()` / `notifyAdmins()` — écriture dans la table `notifications` | — |

> **Pourquoi Resend et non SMTP en production** : le plan gratuit de Render bloque
> les ports SMTP sortants (25, 465, 587). Resend passe par HTTPS/443. Le code
> conserve le chemin SMTP pour le développement local.

---

## 3. Frontend

Application React mono-page, construite par Vite vers `frontend/build/`.

### 3.1 Organisation

```
src/
├── App.jsx              # Déclaration des routes et des gardes de rôle
├── context/AuthContext  # Utilisateur courant, token, connexion/déconnexion
├── utils/api.js         # Instance axios : baseURL, injection du token, timeout 60 s
├── utils/fileUrl.js     # Résolution des URL de fichiers (Cloudinary ou backend)
├── components/          # Navbar, Footer, ProtectedRoute, cartes, modales…
├── hooks/               # useCountUp, useScrollReveal
├── data/                # Référentiels statiques (domaines, universités)
└── pages/
    ├── public/    (12)  # Accueil, catalogue, détail, à propos, guides, mentions
    ├── auth/      (6)   # Connexion, inscription, vérification, mot de passe
    ├── author/    (5)   # Tableau de bord, soumission, portail, paiement
    ├── reviewer/  (3)   # Tableau de bord, assignations, évaluation
    ├── admin/     (5)   # Tableau de bord, soumissions, utilisateurs, comité, stats
    └── shared/    (1)   # Détail de soumission (admin et auteur)
```

### 3.2 Contrôle d'accès côté client

`ProtectedRoute` vérifie la présence du token et le rôle avant d'afficher une page.
**Ce contrôle est un confort d'interface, pas une sécurité** : toute donnée sensible
est re-vérifiée côté serveur par `verifyToken` et les gardes de rôle.

Le timeout axios est fixé à **60 secondes** : il couvre le réveil à froid de
l'instance Render gratuite (~50 s après une période d'inactivité).

---

## 4. Modèle de données

10 tables. Toutes les clés étrangères portent une règle `ON DELETE` explicite,
à une exception près signalée au §8 (`submissions.editor_id`).

### 4.1 `users`
Comptes de la plateforme.

| Colonne | Type | Remarques |
|---|---|---|
| `id` | SERIAL PK | |
| `email` | VARCHAR(255) UNIQUE | Identifiant de connexion |
| `password` | VARCHAR(255) | Hash bcrypt, coût 12 — **jamais réversible** |
| `role` | VARCHAR(50) | `admin` \| `reviewer` \| `author` |
| `first_name`, `last_name`, `institution`, `country`, `research_area` | | Profil |
| `avatar_url` | TEXT | Cloudinary ou `/uploads/avatars/…` |
| `email_verified` | BOOLEAN | **Bloque la connexion tant que faux** |
| `verification_token`, `verification_token_expires` | | Lien de confirmation, 24 h |
| `reset_token`, `reset_token_expires` | | Réinitialisation de mot de passe, 1 h |
| `created_at`, `updated_at` | TIMESTAMP | |

### 4.2 `submissions`
Manuscrits soumis. Table centrale.

| Colonne | Type | Remarques |
|---|---|---|
| `id` | SERIAL PK | |
| `title`, `abstract`, `keywords`, `research_area` | | Métadonnées |
| `pdf_url` | VARCHAR(500) | Fichier **manuscrit principal** |
| `published_pdf_url` | VARCHAR(500) | PDF mis en page par la maison d'édition — c'est **ce fichier** qui est servi au public une fois l'article publié |
| `author_id` | FK → `users` | `ON DELETE CASCADE` |
| `status` | VARCHAR(50) | Voir §5.1 — contrainte `CHECK` |
| `article_type`, `manuscript_number` | | Ex. `JAEI-RA-2026-0007` |
| `authors` | JSONB | Liste structurée (titre, nom, affiliation, `is_submitter`) |
| `co_authors`, `cover_letter`, `comments` | TEXT | |
| `ai_declaration` | BOOLEAN | Conservé pour l'historique ; retiré du formulaire à la demande du client |
| `ai_summary` | TEXT | Résumé généré par Gemini |
| `editor_id`, `editor_assigned_at` | | Éditeur en charge |
| `editor_comment` | TEXT | Dernier commentaire éditorial (historique). La source de vérité est désormais la table `editor_messages` |
| `revision_count`, `revised_at` | | Nombre de versions révisées déposées, date de la dernière |
| `apc_paid`, `apc_paid_at` | | **Verrou de publication** (voir §5.2) |
| `download_count`, `rating_sum`, `rating_count` | | Statistiques publiques |
| `submitted_at`, `updated_at` | TIMESTAMP | `updated_at` pilote le tri du catalogue |

### 4.3 `submission_files`
Une soumission porte plusieurs fichiers (manuscrit, lettre d'accompagnement,
figures, tableaux). `submissions.pdf_url` reste le pointeur vers le manuscrit.

`id`, `submission_id` (FK CASCADE), `file_url`, `file_type` (défaut `Manuscript`),
`original_name`, `file_size`, `description`, `sort_order`, `revision_round`,
`created_at`.

`revision_round` vaut `0` pour la soumission initiale, puis `1, 2…` pour chaque
version révisée. Les fichiers d'une révision portent les types *Response to the
reviewer*, *Revised Manuscript (clean version)*, *Revised Manuscript (with track
change)* et *Other documents*.

### 4.3 bis `editor_messages`
Fil des messages de l'éditeur à l'auteur — **seul contenu éditorial visible par
l'auteur**, sur sa plateforme comme dans ses emails.

`id`, `submission_id` (FK CASCADE), `sender_id` (FK users, `ON DELETE SET NULL`),
`body`, `decision` (renseigné quand le message accompagne une décision),
`created_at`.

À sa création, la table a repris le dernier `submissions.editor_comment` de
chaque soumission, afin qu'aucun message déjà écrit par l'éditeur ne soit perdu.

### 4.4 `reviews`
Une ligne par couple (soumission, reviewer).

`id`, `submission_id` (FK CASCADE), `reviewer_id` (FK CASCADE), `status`,
`comments`, `confidential_comments` (visible de l'éditeur seul), `recommendation`
(`accept` | `reject` | `revise` | `minor_revision` | `major_revision`),
`review_file_url`, `invitation_token`, `accepted_at`, `declined_at`,
`created_at` (date d'assignation), `reviewed_at`, `updated_at`.

### 4.5 `payments`
`id`, `user_id`, `submission_id`, `amount`, `currency` (défaut `XAF`),
`payment_method` (défaut `cinetpay`), `transaction_id` UNIQUE, `status`,
`paid_at`, `created_at`, `updated_at`.

Contrainte `payments_submission_method_unique (submission_id, payment_method)` :
elle empêche le double enregistrement d'un même paiement lorsque l'IPN CinetPay
est rejoué (les passerelles renvoient la notification plusieurs fois).

### 4.6 Tables annexes

| Table | Contenu |
|---|---|
| `research_areas` | Les 8 domaines scientifiques officiels du journal (seed idempotent) |
| `published_articles` | DOI et compteur de vues, une ligne par article publié |
| `editorial_members` | Comité éditorial : `role`, `name`, `affiliation`, `sort_order` |
| `notifications` | Cloche in-app : `user_id`, `type`, `title`, `body`, `submission_id`, `link`, `read_at` |

### 4.7 Migrations

[`backend/db/init.js`](../backend/db/init.js) s'exécute à **chaque démarrage** du
serveur et est **idempotent** :

- `CREATE TABLE IF NOT EXISTS` pour les 10 tables ;
- `ALTER TABLE … ADD COLUMN IF NOT EXISTS` pour toute colonne ajoutée depuis ;
- reconstruction des contraintes `CHECK` héritées (les bases anciennes portaient
  des listes de statuts figées qui rejetaient les valeurs ajoutées depuis) ;
- correctifs de données ponctuels (renommage de domaines, normalisation) ;
- chaque migration est encapsulée : une migration en échec est **journalisée puis
  ignorée**, elle n'interrompt pas le démarrage.

`initDB()` est appelé **sans bloquer** l'écoute HTTP : si la base est injoignable,
le serveur reste en ligne et répond au health check au lieu de redémarrer en boucle.

> **Conséquence pour la maintenance** : pour faire évoluer le schéma, ajoutez un
> bloc idempotent dans `init.js` et déployez. N'exécutez pas de DDL manuelle en
> production — elle serait invisible pour les autres environnements.

---

## 5. Workflows métier

### 5.1 Cycle de vie d'un manuscrit

Les onglets de l'auteur suivent la définition donnée par le client (remarques du
22/09) : chaque onglet est une **étape**, qui regroupe plusieurs statuts
techniques (`frontend/src/utils/statusGroups.js`).

| Onglet auteur | Déclencheur | Statuts regroupés |
|---|---|---|
| Submitted | L'auteur soumet | `pending`, `submitted` |
| Under review | Un reviewer **accepte** l'invitation | `under_review` |
| Revisions | Un reviewer **a envoyé ses commentaires**, ou l'éditeur demande des corrections | `revision_needed`, `major_revision`, `minor_revision`, `sent_back`, `revised` |
| Accepted | Décision « Accept » | `accepted` |
| Published | Publication sur le site | `published` |
| Rejected | Décision « Reject » | `rejected` |

```
 Auteur ──▶ submitted ──(un reviewer ACCEPTE)──▶ under_review
     │           │                                    │
     │           │ Send back (format non conforme)    │ un reviewer ENVOIE ses commentaires
     │           ▼                                    ▼
     │      sent_back                          revision_needed
     │           │                                    │ décision de l'éditeur
     │           │              ┌─────────────────────┼──────────────────────┐
     │           │              ▼                     ▼                      ▼
     │           │       major / minor_revision    accepted               rejected
     │           │              │                     │
     │           └──────┬───────┘                     │ APC réglée + PDF de publication déposé
     │                  ▼                             ▼
     │     l'auteur dépose sa version révisée     published
     │                  ▼
     │               revised ──(un reviewer accepte)──▶ under_review  (nouvelle évaluation)
     │                  └──(ou décision directe de l'éditeur)
     ▼
 withdrawn : retrait à l'initiative de l'auteur
```

Points clés :
- **Inviter** un reviewer ne change pas le statut ; c'est son **acceptation** qui
  fait passer l'article « Under review ».
- Le premier jeu de commentaires fait passer l'article dans « Revisions »,
  quelle que soit la recommandation. Une décision déjà prise par l'éditeur n'est
  jamais écrasée.
- Le bouton « Review » du reviewer dépend de **sa propre** évaluation
  (`reviews.status`), et non du statut de l'article : un deuxième reviewer garde
  son accès quand le premier a déjà rendu ses commentaires.

Statuts acceptés par l'API (`VALID_STATUSES`) : `pending`, `submitted`,
`under_review`, `revised`, `published`, `withdrawn`, `sent_back`,
`revision_needed`, `major_revision`, `minor_revision`, `accepted`, `rejected`.

Chaque décision déclenche un email à l'auteur **et** une notification in-app.
Les libellés envoyés à l'auteur sont ceux demandés par le client : *Accept*,
*Reject*, *Major revision*, *Minor revision*, *Revision requested*, *Sent back
to the authors*.

### 5.2 Règle de publication

`PATCH /api/submissions/:id/status` avec `status = published` renvoie **409
Conflict** tant que :
- les frais de publication ne sont pas constatés (`apc_paid`) — l'admin bascule
  ce drapeau via `PATCH /api/submissions/:id/apc`, ou le paiement CinetPay le
  positionne automatiquement ;
- **le PDF de publication n'a pas été déposé** (`published_pdf_url`) : un article
  publié est toujours servi en PDF mis en page, jamais en Word.

### 5.3 Parcours d'évaluation et communication avec l'auteur

1. L'admin assigne un **éditeur** (`POST /api/reviews/assign-editor`).
2. Il assigne des **reviewers internes** (`POST /api/reviews/assign`) ou invite un
   **expert externe** par email (`POST /api/reviews/invite-external`).
3. L'invitation contient deux liens signés par un jeton à usage unique :
   `GET /api/reviews/invitation/:token/accept` et `/decline`. Après acceptation,
   le reviewer est redirigé vers sa page « Articles to review ».
4. Le reviewer dépose son évaluation (`POST /api/reviews/:id/submit`) :
   commentaires, commentaires confidentiels réservés à l'éditeur,
   recommandation, et éventuellement un fichier annoté.
5. **L'auteur ne voit jamais les commentaires des reviewers.** L'éditeur lui
   écrit dans la fenêtre « Editor comments » : message seul
   (`POST /api/submissions/:id/messages`) ou message joint à une décision. Ce fil
   (`editor_messages`) est le seul contenu éditorial visible par l'auteur, sur sa
   plateforme comme dans ses emails.
6. L'auteur dépose sa version révisée (`POST /api/submissions/:id/revision`) :
   réponse aux reviewers, manuscrit révisé propre, manuscrit avec suivi des
   modifications, autres documents. L'équipe éditoriale est alertée, puis relance
   une évaluation ou décide directement.

### 5.4 Paiement des frais de publication (APC)

Montant : **100 000 FCFA** (`SUBMISSION_FEE_XAF`), soit ~155 € / 180 USD / 1 300 RMB.

```
Auteur → POST /payments/initiate → CinetPay → page de paiement (Mobile Money / carte)
                                        │
                     ┌──────────────────┴───────────────────┐
                     ▼                                      ▼
     POST /payments/notify (IPN serveur à serveur)   retour navigateur
     → vérification du statut auprès de CinetPay     → /payment/return
     → payments.status = 'completed'                 → GET /payments/verify/:id
     → submissions.apc_paid = true
     → emails auteur + admin
```

L'IPN fait **foi** : le retour navigateur ne sert qu'à afficher le résultat. Le
statut réel est toujours re-vérifié auprès de CinetPay, jamais déduit des
paramètres d'URL.

**Mode développement** : si `CINETPAY_API_KEY` ou `CINETPAY_SITE_ID` est absent,
`GET /api/payments/config` renvoie `devMode: true, available: false`, l'interface
affiche la procédure de paiement hors ligne et `POST /payments/dev-confirm`
permet de simuler un règlement en recette. **C'est l'état actuel de la production**
(voir [`EXPLOITATION.md`](EXPLOITATION.md#activer-le-paiement-en-ligne)).

---

## 6. Sécurité

### 6.1 Authentification

- Mots de passe hachés avec **bcrypt, coût 12**. Le hachage est à sens unique :
  un mot de passe perdu ne peut être que **réinitialisé**, jamais retrouvé.
- **JWT** signé avec `JWT_SECRET`, transmis en `Authorization: Bearer …`.
- La connexion est **refusée tant que `email_verified` est faux**.
- Jeton de vérification valable 24 h, jeton de réinitialisation 1 h.
- `POST /api/auth/forgot-password` renvoie toujours la même réponse, que le
  compte existe ou non : aucune énumération d'adresses possible.

### 6.2 Autorisation

Deux niveaux successifs :

1. `verifyToken` (`middleware/auth.js`) — valide la signature et l'expiration.
2. `requireRole(...)` / `requireAdmin` — contrôle le rôle.

À cela s'ajoute un **contrôle de propriété** dans les requêtes SQL elles-mêmes :
un auteur ne lit que ses soumissions (`author_id = $user`), un reviewer que ses
assignations (`reviewer_id = $user`). Le rôle seul ne donne jamais accès aux
données d'autrui.

Confidentialité de l'évaluation, imposée **côté serveur** et pas seulement à
l'affichage :
- l'auteur ne reçoit des évaluations que leur avancement (dates, statut) : ni
  commentaire, ni recommandation, ni fichier annoté ;
- les commentaires confidentiels et l'identité des reviewers ne sont servis qu'à
  l'administration ;
- les messages de l'éditeur à l'auteur ne sont servis qu'à l'administration et à
  l'auteur du manuscrit, jamais aux reviewers.

Les comptes `admin` ne peuvent **pas** être créés par inscription publique
(`SELF_REGISTER_ROLES = ['author', 'reviewer']`) : la promotion se fait en base
ou via `PATCH /api/users/:id/role` par un admin existant.

### 6.3 Protection des fichiers

`/uploads/submissions/*` est servi derrière un middleware qui :

- rejette tout nom de fichier hors du motif `^[\w-]+\.(pdf|docx)$` — **pas de
  traversée de répertoire** (`../`) possible ;
- laisse passer les manuscrits dont la soumission est `published` ;
- exige sinon un JWT valide et n'autorise que : l'**admin**, l'**auteur** de la
  soumission, ou un **reviewer effectivement assigné** (vérifié en base) ;
- renvoie 403 dans tous les autres cas.

En production, les fichiers sont sur Cloudinary. Tous les liens du site passent
par le proxy `GET /api/submissions/file`, qui impose le bon type et un nom de
fichier propre. Le compte Cloudinary gratuit **bloque la diffusion publique des
PDF** (401) : le proxy les récupère alors par l'API Cloudinary authentifiée.
Le middleware ci-dessus protège, lui, le stockage disque utilisé en
développement et en repli.

### 6.4 Limitation de débit

Sept limiteurs (`middleware/rateLimiter.js`), par adresse IP :

| Limiteur | Fenêtre | Quota |
|---|---|---|
| Connexion | 15 min | 10 tentatives (les succès ne comptent pas) |
| Inscription | 1 h | 20 comptes |
| Mot de passe oublié / renvoi de vérification | 1 h | 5 demandes |
| Notation d'article | 1 h | 30 |
| Compteur de téléchargements | 1 h | 60 |
| IPN CinetPay | 1 h | 100 |
| API publique (catalogue, comité) | 15 min | 200 requêtes |

Ces compteurs sont **en mémoire** : ils repartent de zéro à chaque redémarrage du
backend. C'est acceptable pour une instance unique ; en cas de passage à
plusieurs instances, il faudra un magasin partagé (Redis).

### 6.5 Autres protections

- `helmet` : anti-clickjacking, anti-MIME-sniffing, masquage de la signature serveur.
- CORS en liste blanche stricte.
- Requêtes SQL **exclusivement paramétrées** (`$1, $2…`) : pas d'injection SQL.
- Upload limité à **10 Mo par fichier, 12 fichiers par soumission**, et filtré sur
  le type MIME (`.docx` uniquement pour les manuscrits, conformément à la demande
  client).
- Aucun secret dans le dépôt : `.env`, `backend/uploads/` et les notes internes
  contenant la chaîne de connexion sont exclus par `.gitignore`.
- HTTPS et certificat TLS gérés par Render, renouvellement automatique.

---

## 7. Comportement en mode dégradé

La plateforme est conçue pour rester **fonctionnelle** quand un service tiers
manque. C'est ce qui permet de la faire tourner aujourd'hui sans clés CinetPay.

| Service absent | Conséquence |
|---|---|
| `DATABASE_URL` injoignable | Le serveur démarre quand même, `/api/health` répond ; les routes de données renvoient 500 jusqu'au rétablissement |
| `RESEND_API_KEY` et SMTP | Les emails sont ignorés et journalisés ; inscriptions et soumissions continuent de fonctionner |
| `GEMINI_API_KEY` | Fonctions IA masquées dans l'interface (`/api/ai/status` → `available: false`) |
| `CLOUDINARY_*` | Bascule automatique sur le disque local du serveur |
| `CINETPAY_*` | Mode hors ligne : instructions de paiement affichées, validation manuelle par l'admin |

> ⚠️ **Le repli Cloudinary → disque local n'est pas viable en production sur
> Render** : le système de fichiers est éphémère, tout fichier écrit est perdu au
> redéploiement ou au réveil de l'instance. Cloudinary doit rester configuré.

---

## 8. Points d'attention pour le mainteneur

1. **`trust proxy`** — ne jamais retirer la ligne `app.set('trust proxy', 1)` :
   les limiteurs de débit bloqueraient l'ensemble des utilisateurs.
2. **Webhook Stripe éventuel** — si un webhook à signature est ajouté un jour, il
   doit être monté **avant** `express.json()` avec `express.raw()`, sinon la
   signature ne peut plus être vérifiée (un commentaire le rappelle dans `server.js`).
3. **`init.js` est le seul point d'entrée du schéma** — toute modification de
   structure passe par un bloc idempotent dans ce fichier.
4. **Compteurs en mémoire** — limiteurs de débit et anti-spam ne survivent pas à
   un redémarrage, et ne sont pas partagés entre instances.
5. **Instance gratuite en veille** — premier appel après inactivité ≈ 50 s. Le
   frontend est réglé sur un timeout de 60 s ; ne pas le réduire sans changer de plan.
6. **Contraintes `CHECK` héritées** — ajouter un statut ou une recommandation
   impose de mettre à jour la contrainte correspondante dans `init.js`, sinon la
   base rejettera la nouvelle valeur.
7. **PDF sur Cloudinary** — le compte gratuit refuse la diffusion publique des
   PDF. Tout lien vers un fichier doit passer par `fileUrl()` côté frontend
   (proxy backend), jamais par l'URL `res.cloudinary.com` brute. Alternative :
   cocher « Allow delivery of PDF and ZIP files » dans Cloudinary → Settings →
   Security.
8. **Suppression d'un compte éditeur** — `submissions.editor_id` n'a pas de règle
   `ON DELETE` : supprimer un administrateur désigné éditeur d'un manuscrit
   échoue. Réassigner ses manuscrits avant, ou ajouter `ON DELETE SET NULL` à
   cette contrainte dans `init.js`.
9. **Statuts de l'auteur** — les onglets et compteurs de l'auteur passent par
   `frontend/src/utils/statusGroups.js`. Tout nouveau statut doit y être rangé
   dans une étape, sinon l'article n'apparaîtra dans aucun onglet.
