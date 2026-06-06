import { useCallback, useEffect, useState } from 'react';
import { adminApi } from '../../api/adminApi';
import { getApiErrorMessage } from '../../context/AuthContext';
import type { Artist, Concert, Venue } from '../../types';
import { formatDateTime } from '../../utils/format';

function toLocalInput(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface ConcertForm {
  id?: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  venue_id: string;
  banner_url: string;
  artistIds: string[];
}

const emptyForm = (): ConcertForm => ({
  title: '',
  description: '',
  start_time: '',
  end_time: '',
  venue_id: '',
  banner_url: '',
  artistIds: [],
});

export function AdminConcertsPage() {
  const [items, setItems] = useState<Concert[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<ConcertForm | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, v, a] = await Promise.all([
        adminApi.getConcerts(),
        adminApi.getVenues(),
        adminApi.getArtists(),
      ]);
      setItems(c.data.results ?? []);
      setVenues(v.data.results ?? []);
      setArtists(a.data.results ?? []);
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openEdit = (c: Concert) => {
    setForm({
      id: c.id,
      title: c.title ?? '',
      description: c.description ?? '',
      start_time: toLocalInput(c.start_time),
      end_time: toLocalInput(c.end_time),
      venue_id: c.venue?.id ?? '',
      banner_url: c.banner_url ?? '',
      artistIds: c.concert_artists?.map((ca) => ca.artist?.id!).filter(Boolean) ?? [],
    });
  };

  const save = async () => {
    if (!form?.title.trim() || !form.venue_id) return;
    setSaving(true);
    try {
      const body = {
        title: form.title,
        description: form.description,
        start_time: new Date(form.start_time).toISOString(),
        end_time: new Date(form.end_time).toISOString(),
        venue_id: form.venue_id,
        banner_url: form.banner_url,
        artists: form.artistIds,
      };
      if (form.id) await adminApi.updateConcert(form.id, body);
      else await adminApi.createConcert(body);
      setForm(null);
      await load();
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Xóa concert này?')) return;
    try {
      await adminApi.deleteConcert(id);
      await load();
    } catch (e) {
      setError(getApiErrorMessage(e));
    }
  };

  const syncSeats = async (id: string) => {
    try {
      const res = await adminApi.syncConcertSeats(id);
      alert(`Đồng bộ xong: +${res.data.created} ghế (tổng ${res.data.total})`);
    } catch (e) {
      setError(getApiErrorMessage(e));
    }
  };

  return (
    <div>
      <div className="admin-topbar">
        <h1 className="page-title">Concert</h1>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => setForm(emptyForm())}>+ Thêm concert</button>
      </div>
      {error ? <div className="alert alert-error">{error}</div> : null}
      <div className="admin-card admin-table-wrap">
        {loading ? <p>Đang tải...</p> : (
          <table className="admin-table">
            <thead><tr><th>Tiêu đề</th><th>Địa điểm</th><th>Thời gian</th><th></th></tr></thead>
            <tbody>
              {items.slice(0, 40).map((c) => (
                <tr key={c.id}>
                  <td>{c.title}</td>
                  <td>{c.venue?.name}</td>
                  <td>{formatDateTime(c.start_time)}</td>
                  <td className="admin-actions">
                    <button type="button" className="btn btn-outline btn-xs" onClick={() => openEdit(c)}>Sửa</button>
                    <button type="button" className="btn btn-outline btn-xs" onClick={() => c.id && syncSeats(c.id)}>Sync ghế</button>
                    <button type="button" className="btn btn-danger btn-xs" onClick={() => c.id && remove(c.id)}>Xóa</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {form ? (
        <div className="admin-modal-backdrop" onClick={() => setForm(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h2>{form.id ? 'Sửa concert' : 'Thêm concert'}</h2>
            <div className="admin-form">
              <label>Tiêu đề<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
              <label>Mô tả<textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
              <label>Địa điểm
                <select value={form.venue_id} onChange={(e) => setForm({ ...form, venue_id: e.target.value })}>
                  <option value="">— Chọn —</option>
                  {venues.map((v) => <option key={v.id} value={v.id}>{v.name} ({v.city})</option>)}
                </select>
              </label>
              <label>Bắt đầu<input type="datetime-local" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} /></label>
              <label>Kết thúc<input type="datetime-local" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} /></label>
              <label>Banner URL<input value={form.banner_url} onChange={(e) => setForm({ ...form, banner_url: e.target.value })} /></label>
              <label>Nghệ sĩ
                <select
                  multiple
                  value={form.artistIds}
                  onChange={(e) => setForm({ ...form, artistIds: Array.from(e.target.selectedOptions, (o) => o.value) })}
                  style={{ minHeight: 100 }}
                >
                  {artists.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </label>
            </div>
            <div className="admin-modal__actions">
              <button type="button" className="btn btn-primary" disabled={saving} onClick={save}>Lưu</button>
              <button type="button" className="btn btn-outline" onClick={() => setForm(null)}>Hủy</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
