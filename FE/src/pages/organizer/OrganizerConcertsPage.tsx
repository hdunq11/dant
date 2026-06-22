import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { organizerApi } from '../../api/organizerApi';
import { EmptyState } from '../../components/EmptyState';
import { LoadingState } from '../../components/LoadingState';
import { PageHeader } from '../../components/portal/PageHeader';
import { getApiErrorMessage } from '../../context/AuthContext';
import type { Concert } from '../../types';
import { formatDateTime } from '../../utils/format';
import { CONCERT_STATUS_LABEL, canOrganizerDeleteConcert, concertStatusClass, isUnapprovedConcert } from './organizerUtils';

export function OrganizerConcertsPage() {
  const [items, setItems] = useState<Concert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const unapprovedCount = items.filter((c) => isUnapprovedConcert(c.status)).length;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await organizerApi.getConcerts();
      const data = res.data as Concert[] | { results?: Concert[] };
      setItems(Array.isArray(data) ? data : data.results ?? []);
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const submit = async (id: string) => {
    try {
      await organizerApi.submitConcert(id);
      await load();
    } catch (e) {
      setError(getApiErrorMessage(e));
    }
  };

  const publish = async (id: string) => {
    try {
      await organizerApi.publishConcert(id);
      await load();
    } catch (e) {
      setError(getApiErrorMessage(e));
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Xóa concert này?')) return;
    try {
      await organizerApi.deleteConcert(id);
      await load();
    } catch (e) {
      setError(getApiErrorMessage(e));
    }
  };

  const removeUnapproved = async () => {
    if (!unapprovedCount) return;
    if (!confirm(`Xóa ${unapprovedCount} concert chưa duyệt (nháp / chờ duyệt / từ chối)?`)) return;
    try {
      const res = await organizerApi.deleteUnapprovedConcerts();
      await load();
      setError(null);
      if (res.data.deleted) {
        alert(res.data.message ?? `Đã xóa ${res.data.deleted} concert.`);
      }
    } catch (e) {
      setError(getApiErrorMessage(e));
    }
  };

  return (
    <div>
      <PageHeader
        title="My Concerts"
        actions={
          <>
            {unapprovedCount > 0 ? (
              <button type="button" className="btn btn-danger btn-sm" onClick={removeUnapproved}>
                Xóa chưa duyệt ({unapprovedCount})
              </button>
            ) : null}
            <Link to="/organizer/concerts/create" className="btn btn-primary btn-sm">
              + Create Concert
            </Link>
          </>
        }
      />
      {error ? <div className="alert alert-error">{error}</div> : null}
      <div className="admin-card admin-table-wrap">
        {loading ? (
          <LoadingState compact label="Đang tải danh sách concert..." />
        ) : items.length ? (
          <table className="admin-table">
            <thead>
              <tr><th>Tiêu đề</th><th>Địa điểm</th><th>Thời gian</th><th>Trạng thái</th><th></th></tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id}>
                  <td>{c.title}</td>
                  <td>{c.venue?.name}</td>
                  <td>{formatDateTime(c.start_time)}</td>
                  <td>
                    <span className={concertStatusClass(c.status)}>
                      {CONCERT_STATUS_LABEL[c.status ?? 'draft'] ?? c.status}
                    </span>
                  </td>
                  <td className="admin-actions">
                    {(c.status === 'draft' || c.status === 'rejected') && (
                      <Link to={`/organizer/concerts/create?edit=${c.id}`} className="btn btn-outline btn-xs">Sửa</Link>
                    )}
                    {(c.status === 'draft' || c.status === 'rejected') && (
                      <button type="button" className="btn btn-primary btn-xs" onClick={() => c.id && submit(c.id)}>Gửi duyệt</button>
                    )}
                    {c.status === 'approved' && (
                      <button type="button" className="btn btn-primary btn-xs" onClick={() => c.id && publish(c.id)}>Publish</button>
                    )}
                    {canOrganizerDeleteConcert(c.status) && (
                      <button type="button" className="btn btn-danger btn-xs" onClick={() => c.id && remove(c.id!)}>Xóa</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState
            compact
            icon="concert"
            title="Chưa có concert"
            description="Tạo sự kiện đầu tiên, thiết lập ghế và gửi admin duyệt."
            action={{ label: 'Create Concert', to: '/organizer/concerts/create' }}
          />
        )}
      </div>
    </div>
  );
}
