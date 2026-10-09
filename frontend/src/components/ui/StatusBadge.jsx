// ============================================================
// StatusBadge — pastille de statut d'un manuscrit (source unique des styles :
// utils/statuses.js)
// ============================================================
import { statusStyle } from '../../utils/statuses';

const StatusBadge = ({ status }) => {
  const cfg = statusStyle(status);
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-sm text-xs font-medium"
          style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
      {cfg.label}
    </span>
  );
};

export default StatusBadge;
