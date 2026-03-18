# API Documentation — JAEI Platform

Base URL : `http://localhost:5000/api`

---

## Auth `/api/auth`

### POST `/register`
Créer un compte utilisateur.

**Body :**
```json
{
  "email": "user@example.com",
  "password": "motdepasse",
  "role": "author",
  "firstName": "Jean",
  "lastName": "Dupont"
}
```

**Réponse 201 :**
```json
{
  "message": "Compte créé avec succès",
  "user": { "id": 1, "email": "...", "role": "author", ... },
  "token": "eyJ..."
}
```

---

### POST `/login`
Se connecter.

**Body :**
```json
{
  "email": "user@example.com",
  "password": "motdepasse"
}
```

**Réponse 200 :**
```json
{
  "message": "Connexion réussie",
  "user": { "id": 1, "email": "...", "role": "author", ... },
  "token": "eyJ..."
}
```

---

## Submissions `/api/submissions`
> À documenter — Phase 2

---

## Reviews `/api/reviews`
> À documenter — Phase 2

---

## Articles `/api/articles`
> À documenter — Phase 3

---

## Payments `/api/payments`
> À documenter — Phase 3
