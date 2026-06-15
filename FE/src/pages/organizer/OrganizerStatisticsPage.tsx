import { useEffect, useState } from 'react';
import { organizerApi, type OrganizerStatistics } from '../../api/organizerApi';
import { LoadingState } from '../../components/LoadingState';
import { PageHeader } from '../../components/portal/PageHeader';
import { StatCard } from '../../components/portal/StatCard';
import { getApiErrorMessage } from '../../context/AuthContext';
import { formatVnd } from '../../utils/format';
import { CONCERT_STATUS_LABEL } from './organizerUtils';

const statusTone: Record<string, 'neutral' | 'warning' | 'info' | 'success' | 'primary'> = {
  draft: 'neutral',
  pending_review: 'warning',
  approved: 'info',
  published: 'success',
  rejected: 'primary',
};

export function OrganizerStatisticsPage() {
  const [stats, setStats] = useState<OrganizerStatistics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    organizerApi
      .getStatistics()
      .then((res) => setStats(res.data))
      .catch((e) => setError(getApiErrorMessage(e)));
  }, []);

  return (
    <div>
      <PageHeader title="Statistics" subtitle="Doanh thu và hiệu suất bán vé theo từng concert." />
      {error ? <div className="alert alert-error">{error}</div> : null}
      {stats ? (
        <>
          <div className="portal-stats">
            {Object.entries(stats.by_status).map(([key, val]) => (
              <StatCard
                key={key}
                label={CONCERT_STATUS_LABEL[key] ?? key}
                value={val}
                tone={statusTone[key] ?? 'neutral'}
              />
            ))}
          </div>
          <div className="admin-card admin-table-wrap">
            <h2>Doanh thu theo concert</h2>
            <table className="admin-table">
              <thead>
                <tr><th>Concert</th><th>Trạng thái</th><th>Đơn</th><th>Vé bán</th><th>Doanh thu</th></tr>
              </thead>
              <tbody>
                {stats.concerts.map((c) => (
                  <tr key={c.concert_id}>
                    <td>{c.title}</td>
                    <td>{CONCERT_STATUS_LABEL[c.status] ?? c.status}</td>
                    <td>{c.orders}</td>
                    <td>{c.tickets_sold}</td>
                    <td>{formatVnd(c.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="admin-card">
          <LoadingState compact label="Đang tải thống kê..." />
        </div>
      )}
    </div>
  );
}
