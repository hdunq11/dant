import { useCallback, useEffect, useState } from 'react';
import { adminApi } from '../../api/adminApi';
import { getApiErrorMessage } from '../../context/AuthContext';
import type { Artist } from '../../types';

const empty: Artist = { name: '', genre: '', description: '', image_url: '' };

export function AdminArtistsPage() {
  const [items, setItems] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<Artist | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getArtists();
      setItems(res.data.results ?? []);
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!form?.name?.trim()) return;
    setSaving(true);
    try {
      if (form.id) await adminApi.updateArtist(form.id, form);
      else await adminApi.createArtist(form);
      setForm(null);
      await load();
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Xóa nghệ sĩ này?')) return;
    try {
      await adminApi.deleteArtist(id);
      await load();
    } catch (e) {
      setError(getApiErrorMessage(e));
    }
  };

  return (
    <div>
      <div className="admin-topbar">
        <h1 className="page-title">Nghệ sĩ</h1>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => setForm({ ...empty })}>
          + Thêm nghệ sĩ
        </button>
      </div>
      {error ? <div className="alert alert-error">{error}</div> : null}
      <div className="admin-card admin-table-wrap">
        {loading ? <p>Đang tải...</p> : (
          <table className="admin-table">
            <thead><tr><th>Tên</th><th>Thể loại</th><th></th></tr></thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.id}>
                  <td>{a.name}</td>
                  <td>{a.genre}</td>
                  <td className="admin-actions">
                    <button type="button" className="btn btn-outline btn-xs" onClick={() => setForm(a)}>Sửa</button>
                    <button type="button" className="btn btn-danger btn-xs" onClick={() => a.id && remove(a.id)}>Xóa</button>
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
            <h2>{form.id ? 'Sửa nghệ sĩ' : 'Thêm nghệ sĩ'}</h2>
            <div className="admin-form">
              <label>Tên<input value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
              <label>Thể loại<input value={form.genre ?? ''} onChange={(e) => setForm({ ...form, genre: e.target.value })} /></label>
              <label>Mô tả<textarea rows={3} value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
              <label>Ảnh URL<input value={form.image_url ?? ''} onChange={(e) => setForm({ ...form, image_url: e.target.value })} /></label>
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
