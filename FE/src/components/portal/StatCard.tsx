import type { ReactNode } from 'react';

type StatTone = 'primary' | 'success' | 'warning' | 'info' | 'neutral';

interface StatCardProps {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  tone?: StatTone;
}

const toneClass: Record<StatTone, string> = {
  primary: 'portal-stat--primary',
  success: 'portal-stat--success',
  warning: 'portal-stat--warning',
  info: 'portal-stat--info',
  neutral: 'portal-stat--neutral',
};

export function StatCard({ label, value, icon, tone = 'primary' }: StatCardProps) {
  return (
    <div className={`portal-stat ${toneClass[tone]}`}>
      <div className="portal-stat__top">
        <span className="portal-stat__label">{label}</span>
        {icon ? <span className="portal-stat__icon">{icon}</span> : null}
      </div>
      <strong className="portal-stat__value">{value}</strong>
    </div>
  );
}
