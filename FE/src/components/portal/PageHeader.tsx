import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <header className="portal-page-header">
      <div className="portal-page-header__text">
        <h1 className="portal-page-header__title">{title}</h1>
        {subtitle ? <p className="portal-page-header__subtitle">{subtitle}</p> : null}
      </div>
      {actions ? <div className="portal-page-header__actions">{actions}</div> : null}
    </header>
  );
}
