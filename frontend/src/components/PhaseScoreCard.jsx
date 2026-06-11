/**
 * PhaseScoreCard — displays one of the 4 defence phase results.
 * Props:
 *   phase     {number}  — 1–4
 *   title     {string}
 *   icon      {string}  — emoji
 *   score     {number}  — 0.0 – 1.0  (null while loading)
 *   label     {string}  — human label for the score (e.g. "Jaccard: 0.12")
 *   isFlag    {boolean} — show boolean flag instead of numeric score
 *   flagValue {boolean} — value when isFlag=true
 *   tech      {string[]}— tech stack labels (e.g. ["NetworkX", "Jaccard"])
 *   loading   {boolean}
 */
export default function PhaseScoreCard({
  phase,
  title,
  icon,
  score = null,
  label = '',
  isFlag = false,
  flagValue = false,
  tech = [],
  loading = false,
}) {
  // Determine colour tier for numeric scores
  const getScoreTier = (s) => {
    if (s === null) return 'neutral';
    if (s <= 0.25) return 'safe';
    if (s <= 0.55) return 'warning';
    return 'danger';
  };

  const tier = isFlag
    ? (flagValue ? 'danger' : 'safe')
    : getScoreTier(score);

  const tierColour = {
    safe:    'var(--color-success)',
    warning: 'var(--color-warning)',
    danger:  'var(--color-danger)',
    neutral: 'var(--color-border-strong)',
  }[tier];

  const borderMap = { 1: '#4F46E5', 2: '#0284C7', 3: '#059669', 4: '#D97706' };
  const accentColor = borderMap[phase] || 'var(--color-primary)';

  return (
    <div
      className="card animate-fade-in"
      style={{ borderTop: `3px solid ${accentColor}` }}
    >
      <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
        <div className="flex items-center gap-2">
          <span style={{ fontSize: '1.5rem' }}>{icon}</span>
          <div>
            <p className="text-xs text-muted" style={{ fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 1 }}>
              Layer {phase}
            </p>
            <h4 style={{ fontSize: '0.9375rem', margin: 0 }}>{title}</h4>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2" style={{ padding: '8px 0' }}>
          <div className="spinner spinner--sm" />
          <small>Analysing…</small>
        </div>
      ) : (
        <>
          {/* Score display */}
          <div style={{ marginBottom: 10 }}>
            {isFlag ? (
              <div className="flex items-center gap-2">
                <span style={{ fontSize: '1.5rem', fontWeight: 800, color: tierColour }}>
                  {flagValue ? 'FLAGGED' : '✓ CLEAN'}
                </span>
              </div>
            ) : score !== null ? (
              <>
                <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
                  <span style={{ fontSize: '1.625rem', fontWeight: 800, color: tierColour, letterSpacing: '-0.03em' }}>
                    {(score * 100).toFixed(1)}%
                  </span>
                  <small className="text-muted">{label}</small>
                </div>
                <div className="score-bar">
                  <div
                    className={`score-bar__fill score-bar__fill--${tier}`}
                    style={{ width: `${(score * 100).toFixed(1)}%` }}
                  />
                </div>
              </>
            ) : (
              <small className="text-muted">Awaiting data…</small>
            )}
          </div>

          {/* Tech stack tags */}
          {tech.length > 0 && (
            <div className="phase-card__tech" style={{ marginTop: 12 }}>
              {tech.map((t) => (
                <span key={t} className="tag">{t}</span>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
