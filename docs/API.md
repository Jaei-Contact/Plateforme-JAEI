# Référence de l'API REST — Plateforme JAEI

> 68 endpoints répartis en 11 groupes (contrôle de santé compris).
> Version du code de référence : branche `main`, commit `865c204` (Stripe + facturation, 01/10).

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

Le token est délivré par `POST /auth/login` (l'inscription n'en délivre pas : l'email
doit d'abord être vérifié). Le rôle requis, quand il y en a un, est indiqué entre
crochets : 🔒 `[admin]`.

### Comptes et droits (compte unique — 11/2026)
Il n'existe que **deux valeurs de rôle** : `author` (le **membre** — c'est le nom
technique conservé en base, l'interface dit « Member ») et `admin` (équipe éditoriale).
« Reviewer » n'est **plus un type de compte** : c'est une mission confiée à un membre
sur un article donné (ligne de `reviews`). Tout membre peut donc soumettre **et** être
invité à relire. Un ancien rôle `reviewer` encore présent en base (ou dans un JWT
émis avant la bascule) est traité comme `author` (`utils/roles.js › normalizeRole`).

Les droits sur un manuscrit dépendent du **lien** de la personne avec lui, pas de son
type de compte :

| Lien avec le manuscrit | Droits |
|---|---|
| Soumetteur (`submissions.author_id`) | Vue « auteur » : détail, messages de l'éditeur, version révisée, retrait, paiement de l'APC. Jamais l'identité des relecteurs |
| **Co-auteur déclaré**, non soumetteur — membre **ou** administrateur | Vue « auteur » en **consultation seule** (`read_only: true`, retour client du 13/11/2026) : statut, étapes, fichiers, messages et décisions de l'éditeur — exactement ce que voit le soumetteur, sans la facture ni les coordonnées des autres personnes (`author_email`, `authors`) et **sans aucune action** (retrait, révision, paiement). Aucune notification ni e-mail dédié |
| Relecteur invité (`reviews.reviewer_id`) | Vue anonymisée via `/reviews/*` (après acceptation) ; aucun accès à `/submissions/:id` |
| Administrateur **non auteur** du manuscrit | Vue « éditeur » : tout, y compris l'historique (`history`) |
| Administrateur **auteur ou co-auteur** (verrou éditorial) | Aucun accès **éditorial** : toute route d'action éditoriale répond **403** `{ "message": "You are an author of this manuscript, so it must be handled by another editor.", "editorial_lock": true }` ; ne reçoit pas les notifications éditoriales de ce manuscrit ; ne peut pas en être l'éditeur en charge (409). **L'article reste visible** : dans la liste (`editorial_lock: true`) et en détail, en vue « auteur » (consultation seule s'il n'est que co-auteur) |

Auteur ou co-auteur = soumetteur (id ou email) **ou** adresse email listée dans
`submissions.authors` (`utils/authorship.js`). Un auteur ne peut jamais évaluer son
propre manuscrit (409), mais reste invitable sur tous les autres. **Règle de
fonctionnement** : la détection se fait par adresse email, donc un membre du comité
co-auteur doit saisir l'adresse de **son compte JAEI** dans le formulaire ; une autre
adresse ne serait pas reconnue.

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
| POST | `/auth/register` | — | Créer un compte (membre — un seul type de compte) |
| GET | `/auth/verify-email` | — | Valider l'adresse email via le jeton du lien |
| POST | `/auth/resend-verification` | — | Renvoyer l'email de confirmation |
| POST | `/auth/login` | — | Se connecter |
| GET | `/auth/me` | 🔒 | Profil de l'utilisateur courant |
| PATCH | `/auth/me` | 🔒 | Mettre à jour le profil (avatar accepté) |
| POST | `/auth/me/avatar` | 🔒 | Téléverser une photo de profil |
| POST | `/auth/complete-profile` | 🔒 | Fiche obligatoire d'un compte créé par invitation (27/09) — voir plus bas |
| POST | `/auth/forgot-password` | — | Demander un lien de réinitialisation |
| POST | `/auth/reset-password` | — | Définir un nouveau mot de passe via le jeton |
| POST | `/auth/change-password` | 🔒 | Changer son mot de passe (ancien requis) |
| POST | `/auth/logout` | 🔒 | Déconnexion (journalisation ; le JWT reste valide jusqu'à expiration) |

### POST `/auth/register`
```json
{
  "email": "chercheur@univ.cm",
  "password": "MotDePasseFort",
  "first_name": "Jean",
  "last_name": "Dupont",
  "institution": "University of Yaoundé I",
  "country": "Cameroon",
  "research_area": "Agroecology, Soil science, Plant pathology",
  "available_to_review": true
}
```
**Aucun choix de rôle** : tout compte créé est un membre (`role = 'author'`). Un champ
`role` éventuellement envoyé est **ignoré** — `{"role":"admin"}` donne un membre ;
les administrateurs sont promus depuis le tableau de bord (`PATCH /users/:id/role`).

`available_to_review` (facultatif, défaut `false`) : case « I am available to review
articles for JAEI ». Si elle est cochée, `research_area` doit lister **au moins 3
domaines séparés par des virgules** (**400** sinon). Les membres disponibles alimentent
la liste « Potential reviewers » des éditeurs (`GET /reviews/reviewers`).

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
`institution`, `country`, `research_area`, `available_to_review` (au moins 3
domaines dans `research_area` si la disponibilité est cochée, **400** sinon) et
fichier `avatar`. `GET /auth/me`, `POST /auth/login` et cet endpoint renvoient un
`role` normalisé (`admin` ou `author`), et `/auth/me` renvoie aussi
`available_to_review`.

### POST `/auth/complete-profile` 🔒
Remarque 4 (27/09), étendue au compte unique (11/2026) — fiche obligatoire pour
tout compte créé par invitation (`POST /reviews/invite-external`), afin de
constituer une vraie base de données de chercheurs (avant : seuls nom et email
étaient connus). JSON — tous les champs sont **requis** (contrairement à
`PATCH /auth/me`, où ils sont facultatifs) : `title` (`Mr.`, `Ms.`, `Dr.` ou
`Prof.`), `first_name`, `last_name`, `institution`, `country`, `research_area`
(au moins 3 domaines séparés par des virgules). Au succès,
`users.profile_completed` passe à `TRUE`.

Tant que `profile_completed` vaut `FALSE` (uniquement les comptes créés
par une invitation externe, jamais un compte existant ni un membre
auto-inscrit), le membre :
- est redirigé vers `/complete-profile` par le frontend (`ProtectedRoute`)
  dès qu'il tente d'accéder à n'importe quelle page ;
- reçoit **403** de `POST /submissions`, `GET /reviews/by-submission/:submissionId`,
  `GET /reviews/:id/submission` et `POST /reviews/:id/submit`, même s'il a
  déjà accepté l'invitation — même logique défensive que le verrou
  d'acceptation (23/09), pour couvrir un appel direct de l'API.

`GET /auth/me` et `POST /auth/login` renvoient désormais `title` (le
second uniquement `profile_completed`) pour piloter cette redirection.

---

## 3. Soumissions — `/submissions`

| Méthode | Chemin | Auth | Description |
|---|---|---|---|
| POST | `/submissions` | 🔒 tout compte | Déposer un manuscrit (multi-fichiers) — le soumetteur devient l'auteur |
| GET | `/submissions` | 🔒 | Lister : un membre ses articles ; un admin **tous** les articles (ceux dont il est auteur/co-auteur portent `editorial_lock: true` et `relation` : `submitter` ou `co_author`) ; `?scope=mine` = mes propres articles, quel que soit le rôle ; `?scope=coauthored` = les articles dont je suis co-auteur sans en être le soumetteur (consultation seule, `read_only: true`, sans `author_email` ni `authors`). Chaque ligne porte `stage` (étape affichée) et, pour un admin, `editor_id` / `editor_name` (éditeur en charge) |
| GET | `/submissions/:id` | 🔒 soumetteur, co-auteur ou admin non auteur | Détail d'une soumission (`submission` — avec `stage` —, `files`, `messages`, `invoice` — facture d'APC `{ id, invoice_number, issued_at }` ou `null` —, `published_files`, `view`, `relation`, `read_only`, `editorial_lock`, `history` pour l'éditeur) |
| GET | `/submissions/file` | — | Proxy de téléchargement / aperçu des fichiers Cloudinary |
| PATCH | `/submissions/:id` | 🔒 soumetteur | Modifier les métadonnées avant décision |
| PATCH | `/submissions/:id/status` | 🔒 `[admin]` + verrou | Changer le statut et notifier |
| PATCH | `/submissions/:id/apc` | 🔒 `[admin]` + verrou | Marquer les frais de publication payés |
| POST | `/submissions/:id/publication-pdf` | 🔒 `[admin]` + verrou | Déposer le PDF mis en page |
| PUT | `/submissions/:id/supplementary` | 🔒 `[admin]` + verrou | Choisir, parmi les fichiers de l'auteur, les documents supplémentaires publiés |
| POST | `/submissions/:id/supplementary` | 🔒 `[admin]` + verrou | Déposer ses propres documents supplémentaires (multipart `files`) |
| DELETE | `/submissions/:id/supplementary/:fileId` | 🔒 `[admin]` + verrou | Retirer un document de la liste publique |
| POST | `/submissions/:id/messages` | 🔒 `[admin]` + verrou | Envoyer un message de l'éditeur à l'auteur |
| POST | `/submissions/:id/revision` | 🔒 auteur du manuscrit | Déposer une version révisée |
| POST | `/submissions/:id/withdraw` | 🔒 soumetteur | Retirer sa soumission |
| DELETE | `/submissions/:id` | 🔒 `[admin]` + verrou | Supprimer une soumission (l'auteur, lui, la retire) |

« + verrou » : refusé (**403**, `editorial_lock: true`) à un administrateur qui est
auteur ou co-auteur du manuscrit (voir *Comptes et droits*).

### GET `/submissions/:id` 🔒
Renvoie `{ submission, files, messages, invoice, view, relation, read_only, editorial_lock, history? }`.
- `view` : `"editor"` (administrateur non auteur) ou `"author"` (soumetteur ou co-auteur). L'interface
  choisit ses actions d'après ce champ, pas d'après le type de compte.
- `relation` : `"editor"`, `"submitter"` ou `"co_author"`.
- `read_only` : `true` pour un **co-auteur non soumetteur** (membre ou administrateur) — consultation
  seule : l'interface n'affiche ni retrait, ni révision, ni paiement ; la réponse ne contient ni
  `invoice` (`null`), ni `author_email`, ni `authors`.
- `editorial_lock` : `true` quand un administrateur consulte un manuscrit dont il est **auteur ou
  co-auteur** (vue « auteur », aucune action éditoriale).
- `history` (éditeur seulement, il nomme les relecteurs) : événements `{ at, type, title, detail }`
  du plus récent au plus ancien, construits à partir des dates déjà enregistrées (soumission, éditeur
  désigné, relecteurs invités / acceptés / déclinés / évaluation rendue, messages et décisions,
  versions révisées, APC, facture, publication) — `utils/history.js`. Une décision prise sans
  message n'a pas de date propre.
- **403** pour toute autre personne. Un relecteur lit le manuscrit par `/reviews/*`, jamais ici.
- `files` porte `revision_round` : `0` = soumission initiale, `1, 2…` = versions révisées.
- `messages` : fil des messages de l'éditeur, réservé à l'éditeur et au soumetteur.
- `published_files` : documents supplémentaires déjà publiés avec l'article (voir plus bas) ;
  renvoyés à l'éditeur seulement (liste vide pour l'auteur).

### Étape affichée — `stage`
Le statut enregistré (`status`) pilote la logique (onglets, e-mails, droits) et ne change
qu'aux moments définis avec le client. La pastille affichée doit pourtant suivre la
**timeline** (Submission received → Editor assigned → Reviewer assigned → Under review →
Review completed → Editorial decision → APC payment received → Publication). Le serveur calcule donc `stage`
(`utils/stage.js`), sans toucher à `status` :

| Statut enregistré | Avancement | `stage` (libellé affiché) |
|---|---|---|
| `submitted` / `pending` | aucun éditeur ni relecteur | `submitted` (Submitted) |
| | un éditeur en charge (`editor_id` ou `editor_assigned_at`) | `editor_assigned` (Editor assigned) |
| | au moins un relecteur invité (pas de réponse) | `reviewer_assigned` (Reviewer assigned) |
| | un relecteur a accepté | `under_review` (Under review) |
| | au moins une évaluation rendue | `review_completed` (Review completed) |
| `under_review` | même calcul, au minimum `under_review` | |
| `accepted` | APC réglée | `apc_paid` (APC paid) ; sinon `accepted` |
| autres (`revision_needed`, `major_revision`, `minor_revision`, `sent_back`, `revised`, `published`, `rejected`, `withdrawn`) | — | inchangé |

Les relecteurs comptés sont ceux du **tour d'évaluation en cours** (`reviews.round` =
nombre de versions révisées + 1) ; les invitations déclinées ne comptent pas. Inviter un
relecteur désigne d'office l'éditeur en charge (si personne ne l'était) : l'étape saute alors
directement à `reviewer_assigned`.

**Affichage (interface uniquement)** : quand `stage` est `minor_revision`, `major_revision`,
`revision_needed` ou `sent_back` (décision de l'éditeur : l'article reste en cours d'évaluation), la
pastille « Under review » s'affiche devant la décision (`utils/statuses.js` → `displayStatuses`).
L'étape « Under review » de la timeline est cochée dès qu'un relecteur a accepté, que l'éditeur a
commenté l'article ou qu'une étape ultérieure est faite. Aucun champ d'API supplémentaire.

### POST `/submissions` 🔒 (tout compte)
Plus aucun filtre par rôle : un membre, un ancien « reviewer » ou un administrateur
peuvent soumettre. **403** si la fiche du compte est incomplète
(`profile_completed = FALSE`). Un administrateur qui soumet n'est pas alerté
personnellement de son propre article (ni email, ni notification in-app ; la boîte
partagée `ADMIN_EMAIL` reste, elle, prévenue).

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
| `declaration_of_interest` | `"1"` — case à cocher, remplace l'ancien type de fichier dédié | ✔ |
| `file_types` | JSON, un libellé par fichier (`Blinded Manuscript`, `Title page`, `Cover Letter`, `Figure`…) | |
| `file_descriptions` | JSON, une description par fichier | |
| *fichiers* | **`.docx`**, plus images (`.tif`, `.tiff`, `.eps`, `.jpg`, `.jpeg`, `.png`) **uniquement** pour les types `Figure` et `Graphical Abstract (for review)` ; `MAX_UPLOAD_MB` (10 Mo) max par fichier, 12 fichiers max | ✔ |

Chaque fichier est vérifié par son extension **et** par sa signature binaire
(`utils/uploadRules.js`) : un fichier renommé est refusé (**400**). Un fichier
trop volumineux renvoie **413** (« File too large: each file must be under
10 MB. »).

Parmi `file_types`, deux valeurs sont **obligatoires** (409 sinon) :
`Blinded Manuscript` (texte anonymisé — c'est le seul document qu'un reviewer
verra) et `Title page` (titre, noms et affiliations des auteurs — **jamais
servie à un reviewer**, voir `ARCHITECTURE.md` §6.2). `declaration_of_interest`
doit valoir vrai, sans quoi la requête est refusée (400).

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

Chaque changement envoie un email — **au soumetteur ET à chaque co-auteur ayant
un email déclaré** (remarque du 23/09 : revirement assumé par rapport au
comportement précédent, qui limitait l'envoi au seul soumetteur) — et crée une
notification in-app. Si `editor_comment` est fourni, il est :
- ajouté au fil des messages de l'éditeur (avec la décision associée) ;
- inclus dans l'email de décision, sous « Editors' and Reviewers' Comments »
  (25/09 — libellé uniquement ; le contenu reste ce que l'éditeur rédige
  dans « Editor comments », jamais les commentaires bruts des reviewers).

Pour les décisions de révision (`major_revision`, `minor_revision`,
`revision_needed`, `sent_back`), l'email contient en plus : le lien de dépôt de
la version révisée, la liste des documents attendus (réponse aux reviewers,
version avec suivi des modifications, version propre), un rappel que seuls les
fichiers Word sont acceptés à ce stade (pas de PDF), une date limite (2
semaines) et un lien de réinitialisation du mot de passe.

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
| `other_documents` | `.docx`, `.pdf`, `.xlsx`, `.png`, `.jpg`, `.jpeg`, `.tif`, `.tiff` — 5 fichiers max | |

`MAX_UPLOAD_MB` (10 Mo) maximum par fichier (**413** au-delà). Un format refusé
renvoie **400** avec un message lisible (« Revised Manuscript (clean version):
accepted formats are .docx »).

Effets : fichiers enregistrés avec `revision_round = n`, manuscrit principal
remplacé par la version propre, statut `revised`, accusé de réception à
l'auteur, alerte email et in-app à l'équipe éditoriale. L'accusé de réception
ne mentionne **pas** de numéro de révision quand le dépôt fait suite à un
simple `sent_back` (renvoi pour format non conforme, avant toute évaluation) :
ce n'est pas une révision scientifique.

### PATCH `/submissions/:id/apc` 🔒 `[admin]`
```json
{ "paid": true }
```
Marque l'APC comme payée (ou annule ce marquage).
Au **premier** passage à « payée » d'un article `accepted` ou `published`
(`services/apcService.js`) : ligne `payments` (`payment_method='offline'`),
facture PDF numérotée, email de confirmation à l'auteur **avec la facture
jointe**, notification in-app. Décocher puis recocher ne ré-émet rien.

**200**
```json
{ "message": "APC marked as paid", "submission": { "id": 7, "apc_paid": true, "apc_paid_at": "…" },
  "invoice": { "number": "JAEI-INV-000001" }, "emailed": true }
```
`invoice` vaut `null` si aucune facture n'a été émise (marquage « non payée »,
ou facture déjà existante) ; `emailed: false` signale que l'email n'a pas pu
partir (la facture existe quand même).

### POST `/submissions/:id/publication-pdf` 🔒 `[admin]`
`multipart/form-data`, champ `pdf`. Alimente `published_pdf_url` : c'est ce
fichier qui sera servi au public, et non le manuscrit Word d'origine. Le fichier
doit être un vrai PDF (signature `%PDF-`, **400** sinon) de `MAX_UPLOAD_MB` max.

### Documents supplémentaires publiés — `/submissions/:id/supplementary` 🔒 `[admin]` + verrou
Figures, tableaux en plus, jeux de données… rendus **publics** sur la page de l'article
(`GET /articles/:id` → `supplementary_files`) en plus du PDF de publication. Table
`published_files` (une ligne = un document public). Gérés par l'éditeur quand l'article est
**accepté** (préparation) ou **publié** (compléments) ; autre statut → **409**.

- **`PUT`** `{ "source_file_ids": [12, 15] }` — choisit parmi les fichiers déposés par l'auteur ;
  la liste envoyée **remplace** la sélection précédente (les fichiers déposés par l'éditeur ne
  sont pas touchés). Seuls les types `Supplementary Material`, `Figure`, `Table`, `Dataset`,
  `Video`, `e-component` sont publiables ; `Blinded Manuscript`, `Title page`, `Cover Letter`,
  `Author Agreement`, `Detailed Response to Reviewers`, `Highlights` / `Graphical Abstract (for review)`
  et `Macro and style files` ne le sont **jamais** (**400**), pas plus qu'un fichier d'un autre
  article. Le fichier n'est pas copié : la ligne publiée pointe vers le même stockage.
- **`POST`** `multipart/form-data` — champ `files` (10 max par envoi, 30 par article) ; `descriptions`
  et `types` : tableaux JSON facultatifs. Formats : `.pdf .docx .xlsx .csv .txt .zip .png .jpg .jpeg .tif
  .tiff .eps`, `MAX_UPLOAD_MB` max chacun, contrôle de l'extension **et** du contenu réel
  (signature) — **400** sinon (`utils/supplementary.js`). Les lignes créées ont
  `uploaded_by_editor = true`.
- **`DELETE`** `/:fileId` — retire un document de la liste publique ; un fichier déposé par l'éditeur
  est aussi supprimé du stockage, un fichier de l'auteur reste intact.

Réponse des trois : `{ message, published_files: [{ id, file_url, file_type, description,
original_name, file_size, source_file_id, uploaded_by_editor, created_at }] }`.

Tant que l'article n'est pas `published`, ces fichiers ne sont servis qu'à l'admin et à l'auteur ;
une fois publié, ils sont publics (fichiers servis comme le PDF de publication : proxy
`/submissions/file` en production, `/uploads/submissions/…` en local).

### POST `/submissions/:id/withdraw` 🔒 (soumetteur)
Possible uniquement depuis les statuts `pending`, `submitted`, `under_review`,
`revision_needed`, `revised`. Sinon **403**.

---

## 4. Évaluations — `/reviews`

| Méthode | Chemin | Auth | Description |
|---|---|---|---|
| GET | `/reviews/invitation/:token/:action` | — | Accepter ou décliner une invitation externe |
| GET | `/reviews/editors` | 🔒 `[admin]` | Éditeurs disponibles |
| POST | `/reviews/assign-editor` | 🔒 `[admin]` | Assigner un éditeur à une soumission |
| GET | `/reviews/reviewers` | 🔒 `[admin]` | Relecteurs potentiels (membres disponibles + historique ; recherche sur tous les membres) |
| POST | `/reviews/assign` | 🔒 `[admin]` + verrou | Inviter un membre à relire |
| POST | `/reviews/invite-external` | 🔒 `[admin]` + verrou | Inviter un expert par email (membre existant ou compte créé) |
| GET | `/reviews/my-assignments` | 🔒 | Mes évaluations à réaliser (tout compte) |
| GET | `/reviews/:id/submission` | 🔒 | Manuscrit lié à une évaluation |
| GET | `/reviews/submission/:submissionId` | 🔒 | Évaluations d'une soumission |
| GET | `/reviews/by-submission/:submissionId` | 🔒 | Variante compacte (tableau de bord) |
| POST | `/reviews/:id/submit` | 🔒 | Déposer son évaluation |

### GET `/reviews/reviewers` 🔒 `[admin]` — Potential reviewers
Il n'y a plus de comptes « reviewer » : la liste réunit les **membres vérifiés** (email
confirmé, hors administrateurs)
- qui ont coché *available to review* ;
- ou qui ont déjà été invités à relire / ont relu (historique).

| Paramètre | Effet |
|---|---|
| `q` | Recherche sur **tous** les membres vérifiés : nom, email, institution, domaines |
| `submission_id` | Ajoute `is_author_of_submission` (auteur ou co-auteur : non invitable) et `already_invited` (invitation active) |

Chaque entrée : `id`, `title`, `first_name`, `last_name`, `email`, `institution`,
`country`, `research_area`, `available_to_review`, `profile_completed`,
`reviews_total`, `reviews_completed`. 200 résultats au plus, triés par nombre
d'évaluations rendues.

### POST `/reviews/assign-editor` 🔒 `[admin]`
```json
{ "submission_id": 7, "editor_id": 3 }
```
**409** si l'éditeur désigné est auteur ou co-auteur du manuscrit.

### POST `/reviews/assign` 🔒 `[admin]`
```json
{ "submission_id": 7, "reviewer_id": 15 }
```
Crée la ligne `reviews` au statut `assigned` et envoie l'invitation.
**Le statut de l'article ne change pas** : il passe `under_review` seulement
quand un reviewer accepte (voir ci-dessous).

Refuse (**409**) uniquement si ce reviewer a déjà une invitation **active**
(`assigned` ou `accepted`, pas encore rendue) sur ce manuscrit. Un reviewer dont
l'évaluation est `completed` (ou qui a `declined`) peut être **réinvité** :
c'est le mécanisme de ré-évaluation après une version révisée (round 2+, voir
`reviews.round` dans `ARCHITECTURE.md`). L'email envoyé diffère alors
(« Revised manuscript ready for your review » plutôt que l'invitation
initiale), et le délai passe de 30 à 14 jours.

### POST `/reviews/invite-external` 🔒 `[admin]`
```json
{ "submission_id": 7, "name": "Pr. A. Mbarga", "email": "expert@univ.org" }
```
Même mécanique que `/assign` (y compris la ré-invitation round 2+), pour un
expert identifié par son email. Si l'adresse correspond déjà à un membre, ce
compte est réutilisé (**un chercheur = un compte**) ; sinon un compte membre est
créé. Envoie une invitation contenant deux liens à jeton unique. **L'expert n'a
besoin ni de compte actif, ni de connexion** pour répondre.

`name` est découpé naïvement sur les espaces (`first_name` = premier mot,
`last_name` = le reste) — c'est pourquoi une civilité tapée dans `name`
(ex. `"Pr. A. Mbarga"`) s'y retrouve littéralement. Remarque 3 (27/09) :
les emails de ce reviewer utilisent `first_name + last_name` tels quels
dans la salutation, **sans plus jamais préfixer "Dr."** — l'ancien code le
faisait systématiquement, produisant parfois "Dear Dr. Dr. …" quand
l'admin avait déjà tapé une civilité. Un compte créé ici démarre avec
`profile_completed = FALSE` (voir `POST /auth/complete-profile` plus haut).

### GET `/reviews/invitation/:token/:action`
`:action` vaut `accept` ou `decline`. Renseigne `accepted_at` / `declined_at`,
**envoie au reviewer un email de confirmation** (`reviewAccepted` ou
`reviewDeclined` — avant le 23/09, seule une page web de confirmation
existait, aucun email ne partait), et notifie l'administration.

**Réponse définitive (25/09)** : une fois `accept` ou `decline` traité une
première fois (`reviews.status` quitte `assigned`), tout nouveau clic sur
l'un ou l'autre lien — y compris dans l'autre sens — est bloqué (200, page
« This invitation has already been answered », aucune ré-écriture en base,
aucun nouvel email ni notification). Avant ce correctif, le lien restait
actif indéfiniment et permettait de changer d'avis à volonté. Un reviewer
qui doit revenir sur une décision déjà enregistrée est géré manuellement
par l'éditeur (retrait/réassignation), il n'existe pas de libre-service.

À l'acceptation :
- l'article passe `under_review` s'il était `pending`, `submitted` ou `revised`,
  et l'auteur en est prévenu ;
- le reviewer est **redirigé (302)** vers `/reviewer/dashboard?invitation=accepted`,
  sa page « My reviews », en passant par la connexion s'il n'est pas
  connecté. Seul un compte invité qui n'a pas encore de mot de passe voit
  d'abord une page l'invitant à le définir.

### POST `/reviews/:id/submit` 🔒
`multipart/form-data`. **Refusé (403)** tant que l'invitation n'a pas été
acceptée (`reviews.status` doit être `accepted`) — avant le 23/09, cet appel
(et la lecture du manuscrit via les deux endpoints ci-dessous) n'était pas
verrouillé, un reviewer pouvait accéder aux fichiers sans avoir accepté.

| Champ | Description |
|---|---|
| `comments` | Commentaires transmis à l'auteur |
| `confidential_comments` | Réservés à l'éditeur — **jamais visibles de l'auteur** |
| `recommendation` | `accept` \| `reject` \| `revise` \| `minor_revision` \| `major_revision` |
| `review_file` | Fichier annoté (facultatif) — `.doc`, `.docx` ou `.pdf`, `MAX_UPLOAD_MB` (10 Mo) max, **413** au-delà |

Le statut de la soumission **n'est plus modifié automatiquement** ici (avant
le 23/09, il passait à `revision_needed`, ce qui rendait la révision visible de
l'auteur avant même que l'éditeur ait tranché). Il reste `under_review` jusqu'à
une décision explicite de l'éditeur (`PATCH /submissions/:id/status`).

### GET `/reviews/:id/submission` 🔒 et GET `/reviews/by-submission/:submissionId` 🔒
Réservés au reviewer assigné, **et seulement une fois l'invitation acceptée**
(403 sinon). `by-submission` renvoie en plus `round` (round courant) et
`accepted_at`.

**Double anonymat** (`utils/reviewerView.js`) : ces deux endpoints, ainsi que
`/reviews/my-assignments`, ne renvoient au reviewer qu'une **liste blanche** de
colonnes de la soumission — `id`, `title`, `abstract`, `keywords`,
`research_area`, `pdf_url`, `status`, `submitted_at`, `updated_at`,
`article_type`, `manuscript_number`, `revision_count`, `revised_at`. Ni le nom de
l'auteur, ni les co-auteurs, ni `authors`, `cover_letter`, `comments`,
`editor_comment`, `apc_paid`, `author_id`. Côté fichiers, les types `Title page`,
`Cover Letter` et `Author Agreement` sont exclus. Toute nouvelle colonne de
`submissions` est donc **invisible des reviewers par défaut** : il faut l'ajouter
explicitement à la liste blanche pour l'exposer.

Remarque 1 (28/09) : `files[].revision_round` est désormais inclus (`0` =
soumission initiale, `1`, `2`… = versions révisées), et la liste est triée
par round croissant. Avant, cette information manquait à `by-submission` —
le reviewer voyait tous les fichiers de toutes les révisions mélangés, sans
moyen de distinguer lesquels appartiennent à quelle version (les révisions
successives réutilisent les mêmes libellés de type : "Response to the
reviewer", "Revised Manuscript…"). Le frontend (`ReviewArticle.jsx`) groupe
maintenant l'affichage par round, même présentation que `SubmissionDetail.jsx`
(admin/auteur) : un bandeau "Revised version N" / "Original submission" par
groupe.

### GET `/reviews/submission/:submissionId` 🔒
La réponse dépend du lien réel entre l'utilisateur et le manuscrit :

| Vue | Contenu |
|---|---|
| Éditeur (administrateur non auteur du manuscrit) | Tout : identité des reviewers, commentaires, commentaires confidentiels, fichier annoté, `round` |
| Reviewer assigné (n'importe quel membre invité) | Évaluations sans identité ni commentaires confidentiels |
| Auteur du manuscrit : soumetteur (y compris un administrateur qui a soumis le sien) **ou co-auteur déclaré**, membre ou administrateur | **Avancement seulement** : `id`, `status`, `created_at`, `accepted_at`, `reviewed_at`. Ni commentaire, ni recommandation, ni fichier |
| Toute autre personne | **403** |

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

### GET `/articles/:id`
Renvoie `{ article, related, authorStats, supplementary_files }`. `supplementary_files` :
documents supplémentaires que l'éditeur a choisi de publier (`{ id, file_url, file_type,
description, original_name, file_size }`, liste vide s'il n'y en a pas). La page publique les
affiche dans « Supplementary material » (aperçu pour les PDF et images, téléchargement pour tous).

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
| GET | `/users` | 🔒 `[admin]` | Lister les comptes (filtre `?research_area=`) : `role` normalisé, `available_to_review`, `profile_completed`, `reviews_count`, `submissions_count` |
| PATCH | `/users/:id/role` | 🔒 `[admin]` | Promouvoir en administrateur / repasser en membre |
| DELETE | `/users/:id` | 🔒 `[admin]` | Supprimer un compte |

```json
{ "role": "admin" }
```
Deux valeurs seulement : `admin`, ou `author` (alias `member`) pour un membre. Toute autre
valeur — y compris l'ancien `reviewer` — donne **400**. Côté interface, « Reviewers » n'est
qu'un filtre : les membres disponibles ou ayant déjà relu.
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

Prestataire : **Stripe** (choix retenu avec le client — voir
`docs/PAIEMENTS-PREPARATION.md` pour la démarche et ce qui est volontairement
hors périmètre). Ce qui est payé est l'**APC** (Article Processing Charge), due
après acceptation de l'article. Le règlement par carte et le règlement hors
ligne (`PATCH /submissions/:id/apc` au §7) aboutissent au même résultat
(`services/apcService.js`) : `apc_paid`, facture PDF, email avec facture jointe.

| Méthode | Chemin | Auth | Description |
|---|---|---|---|
| GET | `/payments/config` | — | Configuration publique (montant en USD, disponibilité du paiement par carte) |
| POST | `/payments/stripe/create-checkout-session` | 🔒 soumetteur | Créer une session Stripe Checkout |
| POST | `/payments/stripe/webhook` | — | Webhook Stripe (`checkout.session.completed`/`.expired`), body brut |
| POST | `/payments/:id/refund` | 🔒 `[admin]` + verrou | Rembourser un paiement complété |
| GET | `/payments/invoices/:id/download` | 🔒 | Télécharger la facture PDF (auteur du paiement ou de l'article, ou admin) — le PDF est relayé par l'API (pas de redirection vers Cloudinary) |
| GET | `/payments/reconciliation` | 🔒 `[admin]` | Rapport paiements vs factures |
| GET | `/payments/verify/:transactionId` | 🔒 | Vérifier l'état d'une transaction |
| GET | `/payments/my-payments` | 🔒 | Historique de ses paiements (tout compte) |
| GET | `/payments` | 🔒 `[admin]` | Tous les paiements |

L'ancienne route `POST /payments/dev-confirm` (simulation de règlement) a été
**supprimée**.

### GET `/payments/config`
```json
{ "available": true, "stripeAvailable": true, "fee": 200, "currency": "USD", "currencyLabel": "USD" }
```
`stripeAvailable: false` signifie que `STRIPE_SECRET_KEY` n'est pas renseignée :
le bouton « Pay by card » n'est alors pas affiché (l'auteur voit un message
d'indisponibilité). `fee` est le montant **débité, en USD** : la valeur saisie par
l'administrateur (`PUT /admin/settings/apc`), sinon 200 (valeur par défaut du code).
C'est ce montant, **en USD uniquement** (aucune conversion), que le site affiche partout.

### POST `/payments/stripe/create-checkout-session` 🔒 (soumetteur de l'article)
```json
{ "submission_id": 7 }
```
Renvoie `{ checkout_url, transaction_id }` — redirection vers la page Stripe
Checkout hébergée. Réservé à l'auteur d'un article **`accepted`** dont l'APC n'est
pas encore réglée (**409** sinon ; **503** si Stripe n'est pas configuré).

### POST `/payments/stripe/webhook`
Appelé par Stripe, jamais par le navigateur — signature vérifiée via
`STRIPE_WEBHOOK_SECRET` (body monté en raw dans `server.js`, avant
`express.json()`). Sur `checkout.session.completed` (règlement encaissé) : passe
le paiement à `completed`, marque `submissions.apc_paid`, génère la facture PDF,
envoie à l'auteur l'email de confirmation avec la facture jointe et alerte
l'administration. **Idempotent** : seule la première notification d'un paiement
`pending`/`failed` déclenche ces effets ; un événement rejoué est ignoré. Le montant et la
devise réellement débités par Stripe (`amount_total`, `currency` de la session) font foi : si
la ligne `payments` diffère (l'admin a changé le montant de l'APC pendant qu'un auteur payait
depuis un ancien onglet), elle est alignée sur Stripe avant l'émission de la facture.
`checkout.session.expired` passe seulement un paiement `pending` à `failed`.

### POST `/payments/:id/refund` 🔒 `[admin]`
```json
{ "amount": 100, "reason": "..." }
```
`amount` (dans la devise du paiement, USD pour les paiements actuels) omis = remboursement total. Renvoie 501 pour toute méthode de
paiement autre que `stripe`. Un remboursement **total** remet `apc_paid` à faux
(la publication est de nouveau bloquée), sauf si l'article est déjà publié.

**Verrou éditorial** : **403** `{ "editorial_lock": true }` pour un administrateur qui est auteur
ou co-auteur de l'article concerné, ou qui a lui-même effectué ce paiement — un autre éditeur
procède au remboursement.

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

**Notifications éditoriales ciblées (11/2026).** Celles destinées à l'équipe éditoriale
(`new_submission`, `invitation_accepted` / `invitation_declined`, `review_submitted`, `decision`,
`withdrawn`, `revision_submitted`, `apc_paid` — `services/notificationService.js`) suivent
l'**éditeur en charge** (`submissions.editor_id`) :
- tant qu'aucun éditeur n'est en charge (ex. nouvelle soumission), **tous** les administrateurs
  sont prévenus : n'importe lequel peut s'en saisir ;
- dès qu'un éditeur est en charge, **lui seul** est prévenu (sauf s'il n'est plus administrateur :
  retour à « tous ») ; le verrou éditorial exclut toujours les auteurs et co-auteurs du manuscrit.

**Passage de main.** Quand un éditeur prend (ou reçoit) la charge d'un article —
`POST /reviews/assign-editor`, ou invitation d'un premier relecteur par `/reviews/assign` /
`/reviews/invite-external` qui le désigne d'office — les notifications éditoriales **non lues**
des autres administrateurs sur cet article passent en « lues » : la pastille de la cloche baisse
chez celui qui s'en dessaisit. Les notifications de l'auteur et celles adressées à un relecteur ne
sont pas touchées. Au démarrage, un **nettoyage unique** (`app_settings`, clé
`migration_notifications_assigned_v1`) applique la même règle aux notifications déjà en base.

---

## 11. Administration technique — `/admin`

Outils de diagnostic destinés au mainteneur.

| Méthode | Chemin | Auth | Description |
|---|---|---|---|
| GET | `/admin/schema-health` | 🔒 `[admin]` | Vérifier que le schéma en base correspond à celui attendu |
| GET | `/admin/domain-audit` | 🔒 `[admin]` | Lister les domaines de recherche non normalisés |
| POST | `/admin/migrate-domains` | 🔒 `[admin]` | Normaliser les domaines historiques |
| GET | `/admin/settings/apc` | 🔒 `[admin]` | Montant actuel de l'APC (USD), défaut, bornes, auteur de la dernière modification |
| PUT | `/admin/settings/apc` | 🔒 `[admin]` | Fixer le montant de l'APC (USD) ; vide ou `null` = retour au défaut (200 USD) |

### `/admin/settings/apc`
`GET` renvoie :
```json
{ "amount": 250, "defaultAmount": 200, "isCustom": true, "minAmount": 0.5, "maxAmount": 999999.99,
  "updatedAt": "2026-10-13T11:04:24Z", "updatedBy": "Prénom Nom",
  "previous": { "amount": 200, "isDefault": true } }
```
`PUT` prend `{ "amount": 250 }` (nombre ou texte, virgule acceptée) et renvoie la même
structure. `{ "amount": null }` ou `""` supprime la valeur saisie : le défaut du code
s'applique de nouveau. `previous` est la valeur d'avant le dernier changement (`null` s'il n'y en a
pas, ou si elle vaut déjà le montant actuel) : le tableau de bord s'en sert pour « Restore previous
value » (`isDefault: true` = rien n'était saisi, restaurer revient à envoyer un montant vide). **400** si le montant n'est pas un nombre positif à 2 décimales au
plus, s'il est inférieur à 0,50 USD ou supérieur à 999 999,99 USD (limites techniques de
Stripe, pas un plafond arbitraire). Le nouveau montant vaut pour le **prochain** paiement ;
les paiements déjà faits et les factures émises ne changent pas. Chaque changement est
journalisé dans `app_settings_history`.
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

22 modèles dans `backend/services/emailService.js` :

| Modèle | Déclencheur | Destinataire |
|---|---|---|
| `emailVerification` | Inscription | Nouvel inscrit |
| `welcome` | Email confirmé | Utilisateur |
| `submissionReceived` | Dépôt d'un manuscrit | Auteur |
| `coAuthorNotice` | Dépôt d'un manuscrit | Co-auteurs déclarés |
| `newSubmissionAlert` | Dépôt d'un manuscrit | Administration |
| `reviewInvitation` | Assignation d'un reviewer (1ère évaluation, délai 30 j) | Reviewer |
| `reviewReinvitation` | Ré-assignation d'un reviewer déjà intervenu (round 2+, délai 14 j) | Reviewer |
| `reviewAccepted` | Le reviewer accepte l'invitation | Reviewer |
| `reviewDeclined` | Le reviewer décline l'invitation | Reviewer |
| `reviseBeforeReview` | Manuscrit renvoyé pour mise en forme (avec message de l'éditeur + lien de dépôt) | Auteur |
| `editorMessage` | Message envoyé depuis « Editor comments » | Auteur |
| `revisionReceived` | Version révisée déposée | Auteur |
| `revisionSubmittedAlert` | Version révisée déposée | Administration |
| `reviewerThanks` | Évaluation déposée | Reviewer |
| `reviewCompleted` | Évaluation déposée | Éditeur |
| `reviewSubmittedAlert` | Évaluation déposée | Administration |
| `finalDecisionReviewer` | Décision finale | Reviewers |
| `decisionAuthor` | Décision (avec « Editors' and Reviewers' Comments » et, pour une révision, checklist + lien de dépôt) | Auteur **et co-auteurs** |
| `statusChanged` | Passage « Under review » (acceptation d'un reviewer) | Auteur |
| `articlePublished` | Publication | Auteur |
| `paymentConfirmedAuthor` | Paiement validé | Auteur |
| `paymentReceivedAdmin` | Paiement validé | Administration |
