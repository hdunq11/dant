import { Link } from 'react-router-dom';
import './EmptyState.css';

export type EmptyIcon =
  | 'ticket'
  | 'heart'
  | 'concert'
  | 'search'
  | 'order'
  | 'users'
  | 'seat'
  | 'venue'
  | 'voucher'
  | 'chart'
  | 'inbox';

interface EmptyAction {
  label: string;
  to?: string;
  onClick?: () => void;
}

interface EmptyStateProps {
  icon?: EmptyIcon;
  title: string;
  description?: string;
  action?: EmptyAction;
  compact?: boolean;
  className?: string;
}

function EmptyIconSvg({ name }: { name: EmptyIcon }) {
  const common = { width: 48, height: 48, viewBox: '0 0 48 48', fill: 'none', 'aria-hidden': true as const };

  switch (name) {
    case 'ticket':
      return (
        <svg {...common}>
          <rect x="8" y="12" width="32" height="24" rx="4" stroke="currentColor" strokeWidth="2" />
          <path d="M16 12v24M32 12v24" stroke="currentColor" strokeWidth="2" strokeDasharray="3 3" />
          <circle cx="24" cy="24" r="4" fill="currentColor" opacity="0.35" />
        </svg>
      );
    case 'heart':
      return (
        <svg {...common}>
          <path
            d="M24 34s-12-7.2-12-16a6.5 6.5 0 0112-3.5A6.5 6.5 0 0136 18c0 8.8-12 16-12 16z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'search':
      return (
        <svg {...common}>
          <circle cx="22" cy="22" r="10" stroke="currentColor" strokeWidth="2" />
          <path d="M30 30l8 8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      );
    case 'order':
      return (
        <svg {...common}>
          <rect x="10" y="8" width="28" height="32" rx="3" stroke="currentColor" strokeWidth="2" />
          <path d="M16 18h16M16 24h16M16 30h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'users':
      return (
        <svg {...common}>
          <circle cx="18" cy="18" r="5" stroke="currentColor" strokeWidth="2" />
          <path d="M8 36c0-6 4.5-9 10-9s10 3 10 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <circle cx="34" cy="20" r="4" stroke="currentColor" strokeWidth="2" />
          <path d="M28 36c.5-4 3-6.5 7-6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'seat':
      return (
        <svg {...common}>
          <rect x="10" y="14" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="2" />
          <rect x="26" y="14" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="2" />
          <rect x="10" y="30" width="12" height="8" rx="2" stroke="currentColor" strokeWidth="2" />
          <rect x="26" y="30" width="12" height="8" rx="2" stroke="currentColor" strokeWidth="2" />
        </svg>
      );
    case 'venue':
      return (
        <svg {...common}>
          <path d="M24 6L8 18v22h32V18L24 6z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          <rect x="18" y="26" width="12" height="14" stroke="currentColor" strokeWidth="2" />
        </svg>
      );
    case 'voucher':
      return (
        <svg {...common}>
          <path
            d="M10 16h28a2 2 0 012 2v4a3 3 0 100 6v4a2 2 0 01-2 2H10a2 2 0 01-2-2v-4a3 3 0 000-6v-4a2 2 0 012-2z"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path d="M20 16v16" stroke="currentColor" strokeWidth="2" strokeDasharray="3 3" />
        </svg>
      );
    case 'chart':
      return (
        <svg {...common}>
          <path d="M10 38V22M20 38V14M30 38V26M38 38V10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          <path d="M8 38h34" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'concert':
    default:
      return (
        <svg {...common}>
          <circle cx="24" cy="24" r="14" stroke="currentColor" strokeWidth="2" />
          <circle cx="24" cy="24" r="4" fill="currentColor" />
          <path d="M24 10v4M24 34v4M10 24h4M34 24h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
  }
}

export function EmptyState({
  icon = 'inbox',
  title,
  description,
  action,
  compact = false,
  className = '',
}: EmptyStateProps) {
  const iconName = icon === 'inbox' ? 'concert' : icon;

  return (
    <div className={`empty-state ${compact ? 'empty-state--compact' : ''} ${className}`.trim()}>
      <div className="empty-state__glow" aria-hidden />
      <div className="empty-state__icon">
        <EmptyIconSvg name={iconName} />
      </div>
      <h3 className="empty-state__title">{title}</h3>
      {description ? <p className="empty-state__desc">{description}</p> : null}
      {action ? (
        action.to ? (
          <Link to={action.to} className="btn btn-primary btn-sm empty-state__btn">
            {action.label}
          </Link>
        ) : (
          <button type="button" className="btn btn-primary btn-sm empty-state__btn" onClick={action.onClick}>
            {action.label}
          </button>
        )
      ) : null}
    </div>
  );
}
