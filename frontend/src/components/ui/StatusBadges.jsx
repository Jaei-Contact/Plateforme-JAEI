// ============================================================
// StatusBadges — pastille(s) de statut d'un manuscrit.
// « Under review » s'ajoute devant une décision de l'éditeur qui laisse l'article en cours
// d'évaluation (révision mineure / majeure, renvoi aux auteurs) : voir utils/statuses.js.
// Dans tous les autres cas : une seule pastille (l'étape affichée).
// ============================================================
import StatusBadge from './StatusBadge';
import { displayStatuses } from '../../utils/statuses';

const StatusBadges = ({ submission }) => (
  <span className="inline-flex flex-wrap items-center gap-2">
    {displayStatuses(submission).map(key => <StatusBadge key={key} status={key} />)}
  </span>
);

export default StatusBadges;
