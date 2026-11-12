// ============================================================
// JAEI — Rôles des comptes
//
// Un seul type de compte « membre » : toute personne inscrite peut soumettre
// des articles ET être invitée à relire. Le rôle de relecteur n'est plus un
// type de compte : c'est une mission donnée par l'éditeur sur un article
// (table `reviews`, invitation par la plateforme ou par e-mail).
//
//   • 'author' = valeur stockée pour un MEMBRE (l'interface dit « Member ») ;
//   • 'admin'  = équipe éditoriale (co-éditeurs), promue depuis le tableau de bord.
//
// L'ancienne valeur 'reviewer' (comptes de test créés avant ce changement) est
// traitée comme un membre : normalizeRole() est appliquée à la connexion et à
// chaque requête authentifiée, sans toucher aux lignes déjà en base.
// ============================================================

const MEMBER_ROLE = 'author';
const ADMIN_ROLE  = 'admin';

/** 'admin' reste 'admin' ; tout le reste (author, ancien reviewer…) est un membre. */
const normalizeRole = (role) => (role === ADMIN_ROLE ? ADMIN_ROLE : MEMBER_ROLE);

module.exports = { MEMBER_ROLE, ADMIN_ROLE, normalizeRole };
