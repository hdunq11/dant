import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

interface QuickActionProps {
  to: string;
  title: string;
  description: string;
  icon: ReactNode;
}

export function QuickAction({ to, title, description, icon }: QuickActionProps) {
  return (
    <Link to={to} className="portal-quick-action">
      <span className="portal-quick-action__icon">{icon}</span>
      <span className="portal-quick-action__body">
        <strong>{title}</strong>
        <span>{description}</span>
      </span>
      <span className="portal-quick-action__arrow" aria-hidden>→</span>
    </Link>
  );
}
