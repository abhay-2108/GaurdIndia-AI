/**
 * RiskBadge — shows ONBOARDED / PROCESSING / NEEDS_MANUAL_REVIEW / REJECTED_BY_AI
 *             / SUSPICIOUS_LOGIN_ATTEMPT / APPROVED / BLOCKED_BY_AI statuses.
 */
export default function RiskBadge({ status }) {
  const map = {
    ONBOARDED:                { cls: 'badge--success', icon: '✓', label: 'Onboarded' },
    APPROVED:                 { cls: 'badge--success', icon: '✓', label: 'Approved' },
    PROCESSING:               { cls: 'badge--info badge--pulse', icon: '', label: 'Processing' },
    NEEDS_MANUAL_REVIEW:      { cls: 'badge--warning', icon: '⚠', label: 'Manual Review' },
    SUSPICIOUS_LOGIN_ATTEMPT: { cls: 'badge--warning', icon: '⚠', label: 'Suspicious Login' },
    REJECTED_BY_AI:           { cls: 'badge--danger', icon: '✕', label: 'Rejected by AI' },
    BLOCKED_BY_AI:            { cls: 'badge--danger', icon: '✕', label: 'Blocked by AI' },
    SUCCESS:                  { cls: 'badge--success', icon: '✓', label: 'Success' },
  };

  const cfg = map[status] || { cls: 'badge--neutral', icon: '–', label: status };

  return (
    <span className={`badge ${cfg.cls}`}>
      {cfg.icon && <span>{cfg.icon}</span>}
      {cfg.label}
    </span>
  );
}
