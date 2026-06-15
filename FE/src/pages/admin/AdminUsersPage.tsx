import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { adminApi, type AdminUser } from '../../api/adminApi';
import { EmptyState } from '../../components/EmptyState';
import { getApiErrorMessage } from '../../context/AuthContext';
import { formatDateTime } from '../../utils/format';
import { ORGANIZER_STATUS_LABEL, organizerStatusClass } from './adminUtils';

type Tab = 'all' | 'organizer_pending' | 'organizer' | 'fan';

export function AdminUsersPage() {
  const [params, setParams] = useSearchParams();
  const initialTab = (params.get('organizer_status') === 'pending' ? 'organizer_pending' : 'all') as Tab;

  const [tab, setTab] = useState<Tab>(initialTab);
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const query: { role?: string; organizer_status?: string; search?: string } = {};
      if (tab === 'organizer_pending') query.organizer_status = 'pending';
      if (tab === 'organizer') query.role = 'organizer';
      if (tab === 'fan') query.role = 'user';
      if (search.trim()) query.search = search.trim();
      const res = await adminApi.getUsers(query);
      setItems(res.data);
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [tab, search]);

  useEffect(() => { load(); }, [load]);

  const setTabAndUrl = (t: Tab) => {
    setTab(t);
    if (t === 'organizer_pending') setParams({ organizer_status: 'pending' });
    else setParams({});
  };

  const approveOrg = async (profileId: string) => {
    try {
      await adminApi.approveOrganizer(profileId);
      await load();
    } catch (e) {
      setError(getApiErrorMessage(e));
    }
  };

  const rejectOrg = async () => {
    if (!rejectId) return;
    try {
      await adminApi.rejectOrganizer(rejectId, rejectReason);
      setRejectId(null);
      setRejectReason('');
      await load();
    } catch (e) {
      setError(getApiErrorMessage(e));
    }
  };

  const toggleActive = async (user: AdminUser) => {
    if (!user.id) return;
    try {
      await adminApi.updateUser(user.id, { is_active: !user.is_active });
      await load();
    } catch (e) {
      setError(getApiErrorMessage(e));
    }
  };

  return (
    <div>
      <h1 className="page-title">Users</h1>
      <p style={{ color: 'var(--text-secondary)', marginTop: 0 }}>
        Quản lý người dùng và duyệt hồ sơ doanh nghiệp đăng ký bán vé.
      </p>
      {error ? <div className="alert alert-error">{error}</div> : null}

      <div className="admin-tabs">
        {([
          ['all', 'Tất cả'],
          ['organizer_pending', 'DN chờ duyệt'],
          ['organizer', 'Doanh nghiệp'],
          ['fan', 'Fan / User'],
        ] as const).map(([id, label]) => (
          <button key={id} type="button" className={tab === id ? 'active' : ''} onClick={() => setTabAndUrl(id)}>
            {label}
          </button>
        ))}
      </div>

      <div className="admin-toolbar">
        <input
          placeholder="Tìm email, tên..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ minHeight: 40, padding: '0 12px', borderRadius: 10, border: '1px solid var(--divider)' }}
        />
        <button type="button" className="btn btn-outline btn-sm" onClick={load}>Tìm</button>
      </div>

      <div className="admin-card admin-table-wrap">
        {loading ? <p>Đang tải...</p> : items.length ? (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Tên</th>
                <th>Role</th>
                <th>Doanh nghiệp</th>
                <th>Trạng thái DN</th>
                <th>Active</th>
                <th>Ngày tạo</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((u) => {
                const profile = u.organizer_profile;
                return (
                  <tr key={u.id}>
                    <td>{u.email}</td>
                    <td>{u.full_name}</td>
                    <td>{u.role}</td>
                    <td>{profile?.company_name ?? '—'}</td>
                    <td>
                      {profile?.status ? (
                        <span className={organizerStatusClass(profile.status)}>
                          {ORGANIZER_STATUS_LABEL[profile.status] ?? profile.status}
                        </span>
                      ) : '—'}
                    </td>
                    <td>{u.is_active === false ? 'Khóa' : 'Hoạt động'}</td>
                    <td>{formatDateTime(u.created_at)}</td>
                    <td className="admin-actions">
                      {profile?.status === 'pending' && profile.id ? (
                        <>
                          <button type="button" className="btn btn-primary btn-xs" onClick={() => approveOrg(profile.id!)}>Duyệt</button>
                          <button type="button" className="btn btn-danger btn-xs" onClick={() => setRejectId(profile.id!)}>Từ chối</button>
                        </>
                      ) : null}
                      <button type="button" className="btn btn-outline btn-xs" onClick={() => toggleActive(u)}>
                        {u.is_active === false ? 'Mở khóa' : 'Khóa'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <EmptyState
            compact
            icon="users"
            title="Không có user"
            description={tab === 'organizer_pending' ? 'Không có doanh nghiệp nào đang chờ duyệt.' : 'Thử đổi bộ lọc hoặc từ khóa tìm kiếm.'}
          />
        )}
      </div>

      {rejectId ? (
        <div className="admin-modal-backdrop" onClick={() => setRejectId(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Từ chối hồ sơ doanh nghiệp</h2>
            <div className="admin-form">
              <label>
                Lý do (tuỳ chọn)
                <textarea rows={3} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
              </label>
            </div>
            <div className="admin-modal__actions">
              <button type="button" className="btn btn-danger" onClick={rejectOrg}>Xác nhận từ chối</button>
              <button type="button" className="btn btn-outline" onClick={() => setRejectId(null)}>Hủy</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
