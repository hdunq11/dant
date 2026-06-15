import './LoadingState.css';

interface LoadingStateProps {
  variant?: 'table' | 'inline';
  rows?: number;
  label?: string;
  compact?: boolean;
  className?: string;
}

export function LoadingState({
  variant = 'table',
  rows = 4,
  label = 'Đang tải dữ liệu...',
  compact = false,
  className = '',
}: LoadingStateProps) {
  if (variant === 'inline') {
    return (
      <div className={`loading-state loading-state--inline ${compact ? 'loading-state--compact' : ''} ${className}`.trim()}>
        <span className="loading-state__spinner" aria-hidden />
        <span className="loading-state__label">{label}</span>
      </div>
    );
  }

  return (
    <div className={`loading-state loading-state--table ${compact ? 'loading-state--compact' : ''} ${className}`.trim()} role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      <div className="loading-state__table-head">
        <span className="loading-state__bar loading-state__bar--md" />
        <span className="loading-state__bar loading-state__bar--sm" />
        <span className="loading-state__bar loading-state__bar--xs" />
        <span className="loading-state__bar loading-state__bar--xs" />
      </div>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="loading-state__row" style={{ animationDelay: `${i * 80}ms` }}>
          <span className="loading-state__bar loading-state__bar--lg" />
          <span className="loading-state__bar loading-state__bar--md" />
          <span className="loading-state__bar loading-state__bar--sm" />
          <span className="loading-state__bar loading-state__bar--xs" />
        </div>
      ))}
      <p className="loading-state__hint">{label}</p>
    </div>
  );
}
