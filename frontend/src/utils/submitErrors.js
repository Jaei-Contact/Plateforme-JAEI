// ============================================================
// JAEI — Messages précis quand le dépôt d'un manuscrit échoue
//
// Retour du client (13/11/2026) : le formulaire affichait toujours « Error creating submission. Please try
// again. », sans dire pourquoi. Ce texte ne venait que d'un échec SANS réponse exploitable du serveur : un fichier
// joint que le navigateur ne peut plus lire (modifié, déplacé ou supprimé après avoir été attaché), une coupure
// réseau, un serveur qui se réveille… Ici on distingue ces cas pour dire quoi faire.
// ============================================================

/**
 * Vérifie que le navigateur peut encore LIRE chaque fichier joint avant d'envoyer quoi que ce soit.
 * @param {{file?: File, name?: string}[]} files  entrées `form.files` du formulaire
 * @returns {Promise<string|null>} le nom du premier fichier illisible, sinon null
 */
export const findUnreadableFile = async (files = []) => {
  for (const entry of files) {
    const file = entry?.file;
    if (!file) return entry?.name || 'an attached file';
    // Navigateur trop ancien pour Blob.arrayBuffer : on n'invente pas d'erreur
    if (typeof file.slice !== 'function' || typeof file.slice(0, 1).arrayBuffer !== 'function') continue;
    try {
      await file.slice(0, 16).arrayBuffer();
    } catch {
      return file.name || 'an attached file';
    }
  }
  return null;
};

export const unreadableFileMessage = (name) =>
  `Your browser can no longer read the file "${name}": it was probably modified, moved, renamed or deleted after you attached it. `
  + 'Please remove it in step 2 (Attach Files), attach it again, then submit.';

/**
 * Message à afficher quand l'envoi a échoué : celui du serveur s'il en a envoyé un, sinon une explication
 * selon la nature de l'échec.
 * @param {any} err  erreur axios
 */
export const describeSubmitError = (err) => {
  const serverMessage = err?.response?.data?.message;
  if (serverMessage) return serverMessage;

  if (err?.code === 'ECONNABORTED') {
    return 'The upload took too long. Please check your internet connection and click "Submit Manuscript" again. '
      + 'Your information is still on this page: do not reload it.';
  }

  const status = err?.response?.status;
  if (status === 502 || status === 503 || status === 504) {
    return 'The server is not available for a moment (it may be waking up). Please wait one minute, then click '
      + '"Submit Manuscript" again. Your information is still on this page: do not reload it.';
  }
  if (status) {
    return `The server could not process your submission (error ${status}). Please try again in a minute. `
      + 'Your information is still on this page: do not reload it.';
  }

  // Aucune réponse : le navigateur n'a pas pu envoyer la requête (réseau, fichier illisible, extension qui bloque…)
  return 'Your browser could not send the manuscript. Please check your internet connection and try again in a minute. '
    + 'If it keeps failing, remove and re-attach your files (step 2) or try another browser. '
    + 'Your information is still on this page: do not reload it.';
};
