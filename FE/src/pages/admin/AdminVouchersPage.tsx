import { useCallback, useEffect, useState } from 'react';
import { adminApi, type Voucher } from '../../api/adminApi';
import { EmptyState } from '../../components/EmptyState';
import { getApiErrorMessage } from '../../context/AuthContext';

const empty: Voucher = { code: '', discount_percent: 10, description: '', is_active: true };

export function AdminVouchersPage() {
  const [items, setItems] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<Voucher | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getVouchers();
      const data = res.data as Voucher[] | { results?: Voucher[] };
      setItems(Array.isArray(data) ? data : data.results ?? []);
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!form?.code?.trim()) return;
    setSaving(true);
    try {
      if (form.id) await adminApi.updateVoucher(form.id, form);
      else await adminApi.createVoucher(form);
      setForm(null);
      await load();
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Xóa voucher?')) return;
    try {
      await adminApi.deleteVoucher(id);
      await load();
    } catch (e) {
      setError(getApiErrorMessage(e));
    }
  };

  return (
    <div>
      <div className="admin-topbar">
        <h1 className="page-title">Voucher</h1>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => setForm({ ...empty })}>+ Thêm voucher</button>
      </div>
      {error ? <div className="alert alert-error">{error}</div> : null}
      <div className="admin-card admin-table-wrap">
        {loading ? <p>Đang tải...</p> : items.length ? (
          <table className="admin-table">
            <thead><tr><th>Mã</th><th>Giảm %</th><th>Mô tả</th><th>Active</th><th></th></tr></thead>
            <tbody>
              {items.map((v) => (
                <tr key={v.id}>
                  <td><strong>{v.code}</strong></td>
                  <td>{v.discount_percent}%</td>
                  <td>{v.description}</td>
                  <td>{v.is_active ? 'Có' : 'Không'}</td>
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
            icon="voucher"
            title="Chưa có voucher"
            description="Tạo mã giảm giá để khuyến mãi cho người mua vé."
            action={{ label: '+ Thêm voucher', onClick: () => setForm({ ...empty }) }}
          />
        )}
      </div>
      {form ? (
        <div className="admin-modal-backdrop" onClick={() => setForm(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h2>{form.id ? 'Sửa voucher' : 'Thêm voucher'}</h2>
            <div className="admin-form">
              <label>Mã<input value={form.code ?? ''} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} /></label>
              <label>Giảm %<input type="number" value={form.discount_percent ?? 0} onChange={(e) => setForm({ ...form, discount_percent: Number(e.target.value) })} /></label>
              <label>Mô tả<input value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
              <label>
                <input type="checkbox" checked={form.is_active ?? true} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
                {' '}Đang hoạt động
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
