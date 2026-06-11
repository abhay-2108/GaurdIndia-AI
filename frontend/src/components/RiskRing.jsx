/**
 * RiskRing — SVG circular gauge displaying an overall risk score (0–1).
 */
export default function RiskRing({ score = 0 }) {
  const RADIUS = 38;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const fill = Math.max(0, Math.min(1, score));
  const dashOffset = CIRCUMFERENCE * (1 - fill);

  const colour =
    fill >= 0.70 ? '#DC2626' :
    fill >= 0.40 ? '#D97706' :
    '#059669';

  const label =
    fill >= 0.70 ? 'CRITICAL' :
    fill >= 0.40 ? 'REVIEW'   :
    'LOW';

  return (
    <div className="risk-ring-container">
      <div className="risk-ring">
        <svg viewBox="0 0 100 100">
          {/* Track */}
          <circle
            cx="50" cy="50" r={RADIUS}
            fill="none"
            stroke="var(--color-surface-2)"
            strokeWidth="8"
          />
          {/* Fill */}
          <circle
            cx="50" cy="50" r={RADIUS}
            fill="none"
            stroke={colour}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            style={{ transition: 'stroke-dashoffset 0.9s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
          />
        </svg>
        <div className="risk-ring__label" style={{ color: colour }}>
          {(fill * 100).toFixed(0)}
          <small style={{ color: 'var(--color-text-3)' }}>{label}</small>
        </div>
      </div>
      <p className="text-xs text-muted text-bold" style={{ letterSpacing: '0.05em', textTransform: 'uppercase' }}>Risk Score</p>
    </div>
  );
}
