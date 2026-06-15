import { useCallback, useEffect, useState } from 'react';
import { adminApi } from '../../api/adminApi';
import { EmptyState } from '../../components/EmptyState';
import { getApiErrorMessage } from '../../context/AuthContext';
import type { Venue } from '../../types';

const empty: Venue = { name: '', city: '', address: '', capacity: 1000, model_glb_path: '' };

export function AdminVenuesPage() {
  const [items, setItems] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<Venue | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getVenues();
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
      if (form.id) await adminApi.updateVenue(form.id, form);
      else await adminApi.createVenue(form);
      setForm(null);
      await load();
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Xóa địa điểm này?')) return;
    try {
      await adminApi.deleteVenue(id);
      await load();
    } catch (e) {
      setError(getApiErrorMessage(e));
    }
  };

  return (
    <div>
      <div className="admin-topbar">
        <h1 className="page-title">Địa điểm</h1>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => setForm({ ...empty })}>+ Thêm địa điểm</button>
      </div>
      {error ? <div className="alert alert-error">{error}</div> : null}
      <div className="admin-card admin-table-wrap">
        {loading ? <p>Đang tải...</p> : items.length ? (
          <table className="admin-table">
            <thead><tr><th>Tên</th><th>Thành phố</th><th>Sức chứa</th><th>Model VR</th><th></th></tr></thead>
            <tbody>
              {items.slice(0, 50).map((v) => (
                <tr key={v.id}>
                  <td>{v.name}</td>
                  <td>{v.city}</td>
                  <td>{v.capacity}</td>
                  <td style={{ fontSize: '0.78rem' }}>{v.model_glb_path || '—'}</td>
                  <td className="admin-actions">
                    <button type="button" className="btn btn-outline btn-xs" onClick={() => setForm(v)}>Sửa</button>
                    <button type="button" className="btn btn-danger btn-xs" onClick={() => v.id && remove(v.id)}>Xóa</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState
            compact
            icon="venue"
            title="Chưa có địa điểm"
            description="Thêm venue để gắn concert và cấu hình sơ đồ ghế VR."
            action={{ label: '+ Thêm địa điểm', onClick: () => setForm({ ...empty }) }}
          />
        )}
      </div>
      {form ? (
        <div className="admin-modal-backdrop" onClick={() => setForm(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h2>{form.id ? 'Sửa địa điểm' : 'Thêm địa điểm'}</h2>
            <div className="admin-form">
              <label>Tên<input value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
              <label>Thành phố<input value={form.city ?? ''} onChange={(e) => setForm({ ...form, city: e.target.value })} /></label>
              <label>Địa chỉ<textarea rows={2} value={form.address ?? ''} onChange={(e) => setForm({ ...form, address: e.target.value })} /></label>
              <label>Sức chứa<input type="number" value={form.capacity ?? 0} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} /></label>
              <label>Đường dẫn model GLTF<input value={form.model_glb_path ?? ''} onChange={(e) => setForm({ ...form, model_glb_path: e.target.value })} placeholder="models/venue_stage_1/scene.gltf" /></label>
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
