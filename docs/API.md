# Référence de l'API REST — Plateforme JAEI

> 64 endpoints répartis en 11 groupes.
> Version du code de référence : branche `main`, commit `1599152` (remarques client du 22/09).

**Base URL**

| Environnement | URL |
|---|---|
| Production | `https://jaei-backend.onrender.com/api` |
| Local | `http://localhost:5000/api` |

---

## Conventions

### Authentification
Les endpoints marqués 🔒 exigent un en-tête :

```
Authorization: Bearer <token JWT>
```

Le token est délivré par `POST /auth/login` et par `POST /auth/register`.
Le rôle requis, quand il y en a un, est indiqué entre crochets : 🔒 `[admin]`.

### Format
Toutes les requêtes et réponses sont en JSON (`Content-Type: application/json`),
sauf les envois de fichiers qui utilisent `multipart/form-data`.

### Codes de retour

| Code | Signification |
|---|---|
| 200 | Succès |
| 201 | Ressource créée |
| 400 | Requête invalide (champ manquant, valeur hors domaine) |
| 401 | Token absent, invalide ou expiré — ou email non vérifié |
| 403 | Authentifié mais non autorisé (rôle ou propriété) |
| 404 | Ressource inexistante ou hors du périmètre de l'utilisateur |
| 409 | Conflit métier (doublon, publication sans APC payée) |
| 429 | Quota de requêtes dépassé (voir les limiteurs dans `ARCHITECTURE.md` §6.4) |
| 500 | Erreur serveur — le détail n'est jamais exposé en production |

Les erreurs ont toutes la même forme :
```json
{ "message": "Description lisible de l'erreur" }
```

---

## 1. Santé du service

### `GET /health`
Aucune authentification. Utilisé par le health check Render.

```json
{ "status": "ok", "message": "JAEI Backend is running", "timestamp": "2026-09-17T…" }
```

---

## 2. Authentification — `/auth`

| Méthode | Chemin | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | — | Créer un compte (auteur ou reviewer) |
| GET | `/auth/verify-email` | — | Valider l'adresse email via le jeton du lien |
| POST | `/auth/resend-verification` | — | Renvoyer l'email de confirmation |
| POST | `/auth/login` | — | Se connecter |
| GET | `/auth/me` | 🔒 | Profil de l'utilisateur courant |
| PATCH | `/auth/me` | 🔒 | Mettre à jour le profil (avatar accepté) |
| POST | `/auth/me/avatar` | 🔒 | Téléverser une photo de profil |
| POST | `/auth/forgot-password` | — | Demander un lien de réinitialisation |
| POST | `/auth/reset-password` | — | Définir un nouveau mot de passe via le jeton |
| POST | `/auth/change-password` | 🔒 | Changer son mot de passe (ancien requis) |
| POST | `/auth/logout` | 🔒 | Déconnexion (journalisation ; le JWT reste valide jusqu'à expiration) |

### POST `/auth/register`
```json
{
  "email": "chercheur@univ.cm",
  "password": "MotDePasseFort",
  "role": "author",
  "first_name": "Jean",
  "last_name": "Dupont",
  "institution": "Université de Yaoundé I",
  "country": "Cameroun",
  "research_area": "Agroecology and Sustainable Land Use"
}
```
Seuls `author` et `reviewer` sont acceptés comme rôle. Toute autre valeur est
ramenée à `author` : **un compte administrateur ne peut pas être créé par
inscription publique.**

Réponse **201** — le compte est créé mais **non vérifié** ; un email de
confirmation valable 24 h est envoyé. Limite : 20 inscriptions/heure/IP.

### GET `/auth/verify-email?token=…`
Valide le compte et redirige vers le frontend. Le jeton est à usage unique.

### POST `/auth/login`
```json
{ "email": "chercheur@univ.cm", "password": "MotDePasseFort" }
```
**200**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOi…",
  "user": { "id": 12, "email": "…", "role": "author", "first_name": "…", … }
}
```
**401** si les identifiants sont faux **ou si l'email n'est pas vérifié**.
Limite : 10 tentatives échouées / 15 min / IP.

### POST `/auth/forgot-password`
```json
{ "email": "chercheur@univ.cm" }
```
Renvoie **toujours 200** avec le même message, que le compte existe ou non
(protection contre l'énumération de comptes). Jeton valable 1 h.
Limite : 5 demandes/heure/IP.

### POST `/auth/reset-password`
```json
{ "token": "…", "password": "NouveauMotDePasse" }
```

### POST `/auth/change-password` 🔒
```json
{ "currentPassword": "…", "newPassword": "…" }
```

### PATCH `/auth/me` 🔒
`multipart/form-data` ou JSON — champs : `first_name`, `last_name`,
`institution`, `country`, et fichier `avatar`.

---

## 3. Soumissions — `/submissions`

| Méthode | Chemin | Auth | Description |
|---|---|---|---|
| POST | `/submissions` | 🔒 `[author]` | Déposer un manuscrit (multi-fichiers) |
| GET | `/submissions` | 🔒 | Lister ses soumissions (toutes, pour un admin) |
| GET | `/submissions/:id` | 🔒 | Détail d'une soumission |
| GET | `/submissions/file` | — | Proxy de téléchargement / aperçu des fichiers Cloudinary |
| PATCH | `/submissions/:id` | 🔒 `[author]` | Modifier les métadonnées avant décision |
| PATCH | `/submissions/:id/status` | 🔒 `[admin]` | Changer le statut et notifier |
| PATCH | `/submissions/:id/apc` | 🔒 `[admin]` | Marquer les frais de publication payés |
| POST | `/submissions/:id/publication-pdf` | 🔒 `[admin]` | Déposer le PDF mis en page |
| POST | `/submissions/:id/messages` | 🔒 `[admin]` | Envoyer un message de l'éditeur à l'auteur |
| POST | `/submissions/:id/revision` | 🔒 auteur du manuscrit | Déposer une version révisée |
| POST | `/submissions/:id/withdraw` | 🔒 `[author]` | Retirer sa soumission |
| DELETE | `/submissions/:id` | 🔒 `[admin]` | Supprimer une soumission (l'auteur, lui, la retire) |

### GET `/submissions/:id` 🔒
Renvoie `{ submission, files, messages }`.
- `files` porte `revision_round` : `0` = soumission initiale, `1, 2…` = versions révisées.
- `messages` : fil des messages de l'éditeur, réservé à l'administration et à
  l'auteur du manuscrit. Un reviewer reçoit une liste vide.

### POST `/submissions` 🔒 `[author]`
`multipart/form-data`.

| Champ | Type | Obligatoire |
|---|---|---|
| `title` | texte | ✔ |
| `abstract` | texte (250 mots max, structuré) | ✔ |
| `keywords` | texte, séparés par des virgules | ✔ |
| `research_area` | un des 8 domaines officiels | ✔ |
| `article_type` | ex. `Research Article` | ✔ |
| `authors` | JSON : `[{ title, name, email, affiliation, is_submitter }]` | ✔ |
| `co_authors` | texte libre | |
| `cover_letter` | texte | |
| `comments` | message à l'éditeur | |
| `file_types` | JSON, un libellé par fichier (`Manuscript`, `Cover Letter`, `Figure`…) | |
| `file_descriptions` | JSON, une description par fichier | |
| *fichiers* | **`.docx` uniquement**, 10 Mo max par fichier, 12 fichiers max | ✔ |

Effets : création de la soumission au statut `pending`, attribution d'un numéro
de manuscrit (`JAEI-RA-2026-0007`), génération d'un résumé IA si Gemini est
configuré, email de confirmation à l'auteur, email aux co-auteurs déclarés,
alerte à l'administration.

### GET `/submissions?status=…` 🔒
Un auteur ne voit que ses soumissions, un admin les voit toutes. Filtre
facultatif sur le statut.

### PATCH `/submissions/:id/status` 🔒 `[admin]`
```json
{ "status": "accepted", "editor_comment": "Congratulations…" }
```
Statuts acceptés : `pending`, `submitted`, `under_review`, `revised`,
`published`, `withdrawn`, `sent_back`, `revision_needed`, `major_revision`,
`minor_revision`, `accepted`, `rejected`.

⚠️ `status = "published"` renvoie **409** si `apc_paid` est faux, **ou si le PDF
de publication n'a pas été déposé** : un article publié est toujours servi en PDF.

Chaque changement envoie un email à l'auteur et crée une notification in-app.
Si `editor_comment` est fourni, il est :
- ajouté au fil des messages de l'éditeur (avec la décision associée) ;
- inclus dans l'email de décision envoyé à l'auteur, sous « Editor's comments ».

Pour les décisions de révision (`major_revision`, `minor_revision`,
`revision_needed`, `sent_back`), l'email contient aussi le lien de dépôt de la
version révisée.

### POST `/submissions/:id/messages` 🔒 `[admin]`
```json
{ "body": "Please rectify the document format according to the author guidelines." }
```
Message seul, **sans changement de statut**. Enregistré dans le fil, envoyé par
email à l'auteur et signalé par une notification in-app.

**201**
```json
{ "message": "Message sent to the author", "item": { "id": 3, "body": "…", "created_at": "…", "sender_name": "…" }, "emailed": true }
```
`emailed: false` signale que le message est enregistré et visible sur la
plateforme, mais que l'email n'a pas pu partir.

> C'est le **seul canal éditorial visible par l'auteur**. Les commentaires des
> reviewers ne lui sont jamais transmis, ni sur la plateforme, ni par l'API, ni
> par email : l'éditeur en reprend ce qu'il juge utile.

### POST `/submissions/:id/revision` 🔒 auteur du manuscrit
`multipart/form-data`. Autorisé uniquement si le statut est `revision_needed`,
`major_revision`, `minor_revision` ou `sent_back` (sinon **409**).

| Champ | Formats | Obligatoire |
|---|---|---|
| `response_to_reviewer` | `.docx`, `.pdf` | ✔ (sauf après `sent_back`) |
| `revised_clean` | `.docx` | ✔ |
| `revised_tracked` | `.docx` | ✔ (sauf après `sent_back`) |
| `other_documents` | `.docx`, `.pdf`, `.xlsx`, `.png`, `.jpg`, `.tif` — 5 fichiers max | |

15 Mo maximum par fichier. Un format refusé renvoie **400** avec un message
lisible (« Revised Manuscript (clean version): accepted formats are .docx »).

Effets : fichiers enregistrés avec `revision_round = n`, manuscrit principal
remplacé par la version propre, statut `revised`, accusé de réception à
l'auteur, alerte email et in-app à l'équipe éditoriale.

### PATCH `/submissions/:id/apc` 🔒 `[admin]`
```json
{ "paid": true }
```

### POST `/submissions/:id/publication-pdf` 🔒 `[admin]`
`multipart/form-data`, champ `pdf`. Alimente `published_pdf_url` : c'est ce
fichier qui sera servi au public, et non le manuscrit Word d'origine.

### POST `/submissions/:id/withdraw` 🔒 `[author]`
Possible uniquement depuis les statuts `pending`, `submitted`, `under_review`,
`revision_needed`, `revised`. Sinon **403**.

---

## 4. Évaluations — `/reviews`

| Méthode | Chemin | Auth | Description |
|---|---|---|---|
| GET | `/reviews/invitation/:token/:action` | — | Accepter ou décliner une invitation externe |
| GET | `/reviews/editors` | 🔒 `[admin]` | Éditeurs disponibles |
| POST | `/reviews/assign-editor` | 🔒 `[admin]` | Assigner un éditeur à une soumission |
| GET | `/reviews/reviewers` | 🔒 `[admin]` | Reviewers disponibles |
| POST | `/reviews/assign` | 🔒 `[admin]` | Assigner un reviewer interne |
| POST | `/reviews/invite-external` | 🔒 `[admin]` | Inviter un expert externe par email |
| GET | `/reviews/my-assignments` | 🔒 | Mes évaluations à réaliser |
| GET | `/reviews/:id/submission` | 🔒 | Manuscrit lié à une évaluation |
| GET | `/reviews/submission/:submissionId` | 🔒 | Évaluations d'une soumission |
| GET | `/reviews/by-submission/:submissionId` | 🔒 | Variante compacte (tableau de bord) |
| POST | `/reviews/:id/submit` | 🔒 | Déposer son évaluation |

### POST `/reviews/assign-editor` 🔒 `[admin]`
```json
{ "submission_id": 7, "editor_id": 3 }
```

### POST `/reviews/assign` 🔒 `[admin]`
```json
{ "submission_id": 7, "reviewer_id": 15 }
```
Crée la ligne `reviews` au statut `assigned` et envoie l'invitation.
**Le statut de l'article ne change pas** : il passe `under_review` seulement
quand un reviewer accepte (voir ci-dessous).

### POST `/reviews/invite-external` 🔒 `[admin]`
```json
{ "submission_id": 7, "name": "Pr. A. Mbarga", "email": "expert@univ.org" }
```
Crée un compte reviewer si nécessaire et envoie une invitation contenant deux
liens à jeton unique. **L'expert n'a besoin ni de compte actif, ni de connexion**
pour répondre.

### GET `/reviews/invitation/:token/:action`
`:action` vaut `accept` ou `decline`. Renseigne `accepted_at` / `declined_at` et
notifie l'administration.

À l'acceptation :
- l'article passe `under_review` s'il était `pending`, `submitted` ou `revised`,
  et l'auteur en est prévenu ;
- le reviewer est **redirigé (302)** vers `/reviewer/dashboard?invitation=accepted`,
  sa page « Articles to review », en passant par la connexion s'il n'est pas
  connecté. Seul un compte invité qui n'a pas encore de mot de passe voit
  d'abord une page l'invitant à le définir.

### POST `/reviews/:id/submit` 🔒
`multipart/form-data`.

| Champ | Description |
|---|---|
| `comments` | Commentaires transmis à l'auteur |
| `confidential_comments` | Réservés à l'éditeur — **jamais visibles de l'auteur** |
| `recommendation` | `accept` \| `reject` \| `revise` \| `minor_revision` \| `major_revision` |
| `review_file` | Fichier annoté (facultatif) |

Dès qu'un reviewer a rendu ses commentaires, l'article passe `revision_needed`
(onglet « Revisions » de l'auteur), quelle que soit la recommandation. Une
décision déjà prise par l'éditeur n'est jamais écrasée.

### GET `/reviews/submission/:submissionId` 🔒
La réponse dépend du lien réel entre l'utilisateur et le manuscrit :

| Vue | Contenu |
|---|---|
| Administration | Tout : identité des reviewers, commentaires, commentaires confidentiels, fichier annoté |
| Reviewer assigné | Évaluations sans identité ni commentaires confidentiels |
| Auteur du manuscrit | **Avancement seulement** : `id`, `status`, `created_at`, `accepted_at`, `reviewed_at`. Ni commentaire, ni recommandation, ni fichier |

---

## 5. Catalogue public — `/articles`

Aucune authentification, sauf la notation. Limiteur public : 200 requêtes/15 min/IP.

| Méthode | Chemin | Auth | Description |
|---|---|---|---|
| GET | `/articles/stats` | — | Compteurs publics |
| GET | `/articles` | — | Liste paginée des articles publiés |
| GET | `/articles/:id` | — | Détail, auteur, statistiques et articles connexes |
| POST | `/articles/:id/download` | — | Incrémenter le compteur de téléchargements |
| POST | `/articles/:id/rate` | 🔒 | Noter un article (1 à 5) |

### GET `/articles`

| Paramètre | Défaut | Description |
|---|---|---|
| `q` | — | Recherche plein texte sur titre, résumé, mots-clés, domaine **et nom d'auteur** |
| `domain` | — | Filtre par domaine scientifique |
| `page` | 1 | Numéro de page |
| `limit` | 12 | Taille de page, **plafonnée à 100** |

Tri : `updated_at` décroissant (les plus récents d'abord).

```json
{
  "articles": [
    { "id": 4, "title": "…", "abstract": "…", "keywords": "…",
      "research_area": "…", "pdf_url": "https://…", "author_name": "…",
      "download_count": 12, "rating_sum": 18, "rating_count": 4,
      "submitted_at": "…", "updated_at": "…" }
  ],
  "pagination": { "total": 37, "page": 1, "limit": 12, "pages": 4 }
}
```

`pdf_url` renvoie le PDF de publication s'il existe, et retombe sur le manuscrit
d'origine pour les articles antérieurs à cette règle.

### GET `/articles/stats`
```json
{ "articles": 37, "authors": 21, "domains": 6, "reviewers": 9 }
```

### POST `/articles/:id/rate` 🔒
```json
{ "rating": 4 }
```
Authentification exigée pour empêcher la manipulation anonyme des notes.
Limite : 30 notations/heure/IP.

---

## 6. Utilisateurs — `/users`

| Méthode | Chemin | Auth | Description |
|---|---|---|---|
| GET | `/users` | 🔒 `[admin]` | Lister les comptes (filtre `?research_area=`) |
| PATCH | `/users/:id/role` | 🔒 `[admin]` | Changer le rôle d'un compte |
| DELETE | `/users/:id` | 🔒 `[admin]` | Supprimer un compte |

```json
{ "role": "reviewer" }
```
⚠️ La suppression d'un compte supprime en cascade ses soumissions, ses
évaluations et ses notifications.

---

## 7. Comité éditorial — `/editorial-board`

| Méthode | Chemin | Auth | Description |
|---|---|---|---|
| GET | `/editorial-board` | — | Liste publique, triée par `sort_order` |
| POST | `/editorial-board` | 🔒 `[admin]` | Ajouter un membre |
| PUT | `/editorial-board/:id` | 🔒 `[admin]` | Modifier un membre |
| DELETE | `/editorial-board/:id` | 🔒 `[admin]` | Retirer un membre |

```json
{ "role": "Co-Editor-in-Chief", "name": "Dr. …", "affiliation": "…", "sort_order": 2 }
```
C'est cette table qui alimente la page **About** du site public.

---

## 8. Paiements — `/payments`

| Méthode | Chemin | Auth | Description |
|---|---|---|---|
| GET | `/payments/config` | — | Configuration publique (montant, devise, disponibilité) |
| POST | `/payments/initiate` | 🔒 `[author]` | Créer une transaction CinetPay |
| POST | `/payments/notify` | — | **IPN CinetPay** (serveur à serveur) |
| GET | `/payments/verify/:transactionId` | 🔒 | Vérifier l'état d'une transaction |
| GET | `/payments/my-payments` | 🔒 `[author]` | Historique de ses paiements |
| GET | `/payments` | 🔒 `[admin]` | Tous les paiements |
| POST | `/payments/dev-confirm` | 🔒 `[author]` | Simuler un règlement (mode hors ligne) |

### GET `/payments/config`
```json
{ "devMode": true, "available": false, "fee": 100000, "currency": "XAF" }
```
`available: false` signifie que les clés CinetPay ne sont pas renseignées : le
frontend affiche alors la procédure de paiement hors ligne. **C'est l'état actuel
de la production.**

### POST `/payments/initiate` 🔒 `[author]`
```json
{ "submission_id": 7 }
```
Renvoie l'URL de la page de paiement CinetPay (Mobile Money ou carte).

### POST `/payments/notify`
Appelé par CinetPay, jamais par le navigateur. Le backend re-interroge CinetPay
pour connaître le statut réel, puis, en cas de succès, passe le paiement à
`completed`, positionne `apc_paid = true` sur la soumission et envoie les emails
de confirmation. Limite : 100 appels/heure. La contrainte d'unicité
`(submission_id, payment_method)` neutralise les notifications rejouées.

---

## 9. Assistance IA — `/ai`

Google Gemini `gemini-2.5-flash`. Si `GEMINI_API_KEY` est absent, `/ai/status`
renvoie `available: false` et l'interface masque les fonctions correspondantes.

| Méthode | Chemin | Auth | Description |
|---|---|---|---|
| GET | `/ai/status` | — | Disponibilité du service |
| POST | `/ai/suggest-keywords` | 🔒 | Proposer des mots-clés |
| POST | `/ai/improve-abstract` | 🔒 | Suggérer une amélioration du résumé |
| POST | `/ai/analyze-relevance` | 🔒 | Évaluer l'adéquation au périmètre du journal |
| POST | `/ai/extract-pdf` | 🔒 | Extraire titre, résumé et mots-clés d'un fichier |

```json
{ "title": "…", "abstract": "…", "research_area": "…" }
```
`extract-pdf` prend un `multipart/form-data` avec le champ `pdf` (traitement en
mémoire, aucun fichier n'est conservé).

---

## 10. Notifications — `/notifications`

| Méthode | Chemin | Auth | Description |
|---|---|---|---|
| GET | `/notifications` | 🔒 | Mes notifications + nombre de non lues |
| PATCH | `/notifications/read` | 🔒 | Tout marquer comme lu |
| PATCH | `/notifications/:id/read` | 🔒 | Marquer une notification comme lue |

Alimente la cloche du tableau de bord : toute action d'un éditeur, d'un auteur ou
d'un reviewer génère une notification pour les personnes concernées.

---

## 11. Administration technique — `/admin`

Outils de diagnostic destinés au mainteneur.

| Méthode | Chemin | Auth | Description |
|---|---|---|---|
| GET | `/admin/schema-health` | 🔒 `[admin]` | Vérifier que le schéma en base correspond à celui attendu |
| GET | `/admin/domain-audit` | 🔒 `[admin]` | Lister les domaines de recherche non normalisés |
| POST | `/admin/migrate-domains` | 🔒 `[admin]` | Normaliser les domaines historiques |

---

## 12. Fichiers statiques

| Chemin | Accès |
|---|---|
| `/uploads/avatars/*` | Public |
| `/uploads/submissions/*` | Public si l'article est publié ; sinon admin, auteur ou reviewer assigné uniquement (voir `ARCHITECTURE.md` §6.3) |

### GET `/submissions/file?u=…&name=…&mode=inline|download`
Proxy utilisé par tous les liens de fichiers du site. Il impose le bon
`Content-Type` et un nom de fichier propre, et n'accepte que les URL du compte
Cloudinary de la plateforme.

Le compte Cloudinary gratuit **refuse la diffusion publique des PDF** (401
« deny or ACL failure »), alors que les `.docx` passent. Sur un 401/403, le proxy
retélécharge le fichier par l'API Cloudinary authentifiée
(`private_download_url`, signée, valable 5 minutes). Ne jamais faire pointer un
lien du site directement vers `res.cloudinary.com` pour un PDF.

---

## Annexe — Emails envoyés automatiquement

19 modèles dans `backend/services/emailService.js` :

| Modèle | Déclencheur | Destinataire |
|---|---|---|
| `emailVerification` | Inscription | Nouvel inscrit |
| `welcome` | Email confirmé | Utilisateur |
| `submissionReceived` | Dépôt d'un manuscrit | Auteur |
| `coAuthorNotice` | Dépôt d'un manuscrit | Co-auteurs déclarés |
| `newSubmissionAlert` | Dépôt d'un manuscrit | Administration |
| `reviewInvitation` | Assignation d'un reviewer | Reviewer |
| `reviseBeforeReview` | Manuscrit renvoyé pour mise en forme (avec message de l'éditeur + lien de dépôt) | Auteur |
| `editorMessage` | Message envoyé depuis « Editor comments » | Auteur |
| `revisionReceived` | Version révisée déposée | Auteur |
| `revisionSubmittedAlert` | Version révisée déposée | Administration |
| `reviewerThanks` | Évaluation déposée | Reviewer |
| `reviewCompleted` | Évaluation déposée | Éditeur |
| `reviewSubmittedAlert` | Évaluation déposée | Administration |
| `finalDecisionReviewer` | Décision finale | Reviewers |
| `decisionAuthor` | Décision (avec « Editor's comments » et, pour une révision, lien de dépôt) | Auteur |
| `statusChanged` | Passage « Under review » (acceptation d'un reviewer) | Auteur |
| `articlePublished` | Publication | Auteur |
| `paymentConfirmedAuthor` | Paiement validé | Auteur |
| `paymentReceivedAdmin` | Paiement validé | Administration |
