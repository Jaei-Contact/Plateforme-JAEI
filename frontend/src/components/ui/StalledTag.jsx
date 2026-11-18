// Repère « No action for N days » (surveillance des 14 jours, 17/11/2026) : l'éditeur en chef voit d'un coup d'œil
// les articles dont l'éditeur en charge n'a pas réagi depuis 14 jours ou plus. Réservé à l'éditeur en chef.
// Les données viennent du serveur (backend/utils/waiting.js) : `stalled`, `waiting_days`, `waiting_step`.

// Ce que l'éditeur en charge doit faire à chaque étape (même formulation partout : liste, fiche, e-mails)
export const WAITING_STEPS = {
  editorial_check: 'Waiting for the editorial check (invite a reviewer, send the manuscript back or reject it)',
  invite_reviewer: 'All the reviewer invitations were declined: another reviewer must be invited',
  decision:        'All the expected reviews are in: an editorial decision is due',
  revised_version: 'A revised version was received: it must be examined',
};

const StalledTag = ({ submission, isChief }) => {
  if (!isChief || !submission?.stalled) return null;
  const days = submission.waiting_days;
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-semibold whitespace-nowrap"
          data-testid="stalled-tag"
          style={{ background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA' }}
          title={WAITING_STEPS[submission.waiting_step] || 'The editor in charge has not reacted'}>
      No action for {days} day{days === 1 ? '' : 's'}
    </span>
  );
};

export default StalledTag;
