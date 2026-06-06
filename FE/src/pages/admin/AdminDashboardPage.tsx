import { useEffect, useState } from 'react';
import { adminApi } from '../../api/adminApi';
import { getApiErrorMessage } from '../../context/AuthContext';

export function AdminDashboardPage() {
  const [stats, setStats] = useState({ concerts: 0, venues: 0, artists: 0, orders: 0, vouchers: 0 });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [c, v, a, o, vc] = await Promise.all([
          adminApi.getConcerts(),
          adminApi.getVenues(),
          adminApi.getArtists(),
          adminApi.getOrders(),
          adminApi.getVouchers(),
        ]);
        setStats({
          concerts: c.data.count ?? c.data.results?.length ?? 0,
          venues: v.data.count ?? v.data.results?.length ?? 0,
          artists: a.data.count ?? a.data.results?.length ?? 0,
          orders: o.data.length ?? 0,
          vouchers: vc.data.length ?? 0,
        });
      } catch (e) {
        setError(getApiErrorMessage(e));
      }
    })();
  }, []);

  return (
    <div>
      <h1 className="page-title">Tổng quan</h1>
      {error ? <div className="alert alert-error">{error}</div> : null}
      <div className="admin-stats">
        <div className="admin-stat"><strong>{stats.concerts}</strong><span>Concert</span></div>
        <div className="admin-stat"><strong>{stats.venues}</strong><span>Địa điểm</span></div>
        <div className="admin-stat"><strong>{stats.artists}</strong><span>Nghệ sĩ</span></div>
        <div className="admin-stat"><strong>{stats.orders}</strong><span>Đơn hàng</span></div>
        <div className="admin-stat"><strong>{stats.vouchers}</strong><span>Voucher</span></div>
      </div>
      <div className="admin-card">
        <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
          Đăng nhập bằng tài khoản <strong>admin</strong> để quản lý concert, địa điểm, ghế và đơn hàng.
          Tài khoản mẫu: <code>admin@example.com</code> / <code>admin123</code>
        </p>
      </div>
    </div>
  );
}
