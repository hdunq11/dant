import { useEffect, useState } from 'react';
import { adminApi, type AdminReports } from '../../api/adminApi';
import { getApiErrorMessage } from '../../context/AuthContext';
import { formatVnd } from '../../utils/format';
import { CONCERT_STATUS_LABEL, ORGANIZER_STATUS_LABEL, concertStatusClass } from './adminUtils';

export function AdminReportsPage() {
  const [data, setData] = useState<AdminReports | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi
      .getReports()
      .then((res) => setData(res.data))
      .catch((e) => setError(getApiErrorMessage(e)));
  }, []);

  if (!data) {
    return (
      <div>
        <h1 className="page-title">Reports</h1>
        {error ? <div className="alert alert-error">{error}</div> : <p>Đang tải...</p>}
      </div>
    );
  }

  return (
    <div>
      <h1 className="page-title">Reports</h1>
      {error ? <div className="alert alert-error">{error}</div> : null}

      <div className="admin-stats">
        {Object.entries(data.users_by_role).map(([role, count]) => (
          <div key={role} className="admin-stat"><strong>{count}</strong><span>User · {role}</span></div>
        ))}
        {Object.entries(data.orders_by_status).map(([st, count]) => (
          <div key={st} className="admin-stat"><strong>{count}</strong><span>Đơn · {st}</span></div>
        ))}
      </div>

      <div className="admin-card" style={{ marginBottom: 20 }}>
        <h2 style={{ marginTop: 0 }}>Concert theo trạng thái</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {Object.entries(data.concerts_by_status).map(([st, count]) => (
            <span key={st} className={concertStatusClass(st)}>
              {CONCERT_STATUS_LABEL[st] ?? st}: {count}
            </span>
          ))}
        </div>
      </div>

      <div className="admin-card" style={{ marginBottom: 20 }}>
        <h2 style={{ marginTop: 0 }}>Doanh nghiệp theo trạng thái</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {Object.entries(data.organizers_by_status).map(([st, count]) => (
            <span key={st}>
              {ORGANIZER_STATUS_LABEL[st] ?? st}: <strong>{count}</strong>
            </span>
          ))}
        </div>
      </div>

      <div className="admin-card admin-table-wrap">
        <h2 style={{ marginTop: 0 }}>Top concert theo doanh thu</h2>
        <table className="admin-table">
          <thead>
            <tr><th>Concert</th><th>Trạng thái</th><th>Nguồn</th><th>Đơn</th><th>Vé</th><th>Doanh thu</th></tr>
          </thead>
          <tbody>
            {data.top_concerts.map((c) => (
              <tr key={c.concert_id}>
                <td>{c.title}</td>
                <td><span className={concertStatusClass(c.status)}>{CONCERT_STATUS_LABEL[c.status] ?? c.status}</span></td>
                <td>{c.event_source === 'external' ? 'Đối tác' : 'Platform'}</td>
                <td>{c.orders}</td>
                <td>{c.tickets_sold}</td>
                <td>{formatVnd(c.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
