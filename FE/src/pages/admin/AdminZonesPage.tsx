import { useCallback, useEffect, useState } from 'react';
import { adminApi, type SeatZone } from '../../api/adminApi';
import { getApiErrorMessage } from '../../context/AuthContext';
import type { Venue } from '../../types';
import { formatVnd } from '../../utils/format';
import { VENUE_DEFAULT_ROWS, VENUE_SEATS_PER_ROW } from '../../utils/seatGrid';

const empty: SeatZone = { name: '', price: 250000, color: '#5b4dff', venue_id: '' };

export function AdminZonesPage() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [venueId, setVenueId] = useState('');
  const [items, setItems] = useState<SeatZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<SeatZone | null>(null);
  const [genZone, setGenZone] = useState<SeatZone | null>(null);
  const [rows, setRows] = useState(VENUE_DEFAULT_ROWS);
  const [seatsPerRow, setSeatsPerRow] = useState(VENUE_SEATS_PER_ROW);
  const [saving, setSaving] = useState(false);

  const loadVenues = useCallback(async () => {
    const res = await adminApi.getVenues();
    const list = res.data.results ?? [];
    setVenues(list);
    if (!venueId && list[0]?.id) setVenueId(list[0].id!);
  }, [venueId]);

  const loadZones = useCallback(async () => {
    if (!venueId) return;
    setLoading(true);
    try {
      const res = await adminApi.getSeatZones(venueId);
      const data = res.data as SeatZone[] | { results?: SeatZone[] };
      setItems(Array.isArray(data) ? data : data.results ?? []);
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [venueId]);

  useEffect(() => { loadVenues(); }, [loadVenues]);
  useEffect(() => { loadZones(); }, [loadZones]);

  const save = async () => {
    if (!form?.name?.trim() || !form.venue_id) return;
    setSaving(true);
    try {
      if (form.id) await adminApi.updateSeatZone(form.id, form);
      else await adminApi.createSeatZone(form);
      setForm(null);
      await loadZones();
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const generate = async () => {
    if (!genZone?.id) return;
    try {
      const rowList = rows.split(',').map((r) => r.trim()).filter(Boolean);
      const res = await adminApi.generateSeats(genZone.id, rowList, seatsPerRow);
      alert(res.data.message ?? `Đã sinh ${res.data.count} ghế`);
      setGenZone(null);
    } catch (e) {
      setError(getApiErrorMessage(e));
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Xóa khu ghế?')) return;
    try {
      await adminApi.deleteSeatZone(id);
      await loadZones();
    } catch (e) {
      setError(getApiErrorMessage(e));
    }
  };

  return (
    <div>
      <div className="admin-topbar">
        <h1 className="page-title">Khu ghế</h1>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={!venueId}
          onClick={() => setForm({ ...empty, venue_id: venueId })}
        >
          + Thêm khu
        </button>
      </div>
      {error ? <div className="alert alert-error">{error}</div> : null}
      <div className="admin-toolbar">
        <label>
          Địa điểm{' '}
          <select value={venueId} onChange={(e) => setVenueId(e.target.value)}>
            {venues.slice(0, 30).map((v) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="admin-card admin-table-wrap">
        {loading ? <p>Đang tải...</p> : (
          <table className="admin-table">
            <thead><tr><th>Tên</th><th>Giá</th><th>Màu</th><th></th></tr></thead>
            <tbody>
              {items.map((z) => (
                <tr key={z.id}>
                  <td>{z.name}</td>
                  <td>{formatVnd(z.price)}</td>
                  <td><span style={{ color: z.color }}>{z.color}</span></td>
                  <td className="admin-actions">
                    <button type="button" className="btn btn-outline btn-xs" onClick={() => setForm({ ...z, venue_id: venueId })}>Sửa</button>
                    <button type="button" className="btn btn-outline btn-xs" onClick={() => setGenZone(z)}>Sinh ghế</button>
                    <button type="button" className="btn btn-danger btn-xs" onClick={() => z.id && remove(z.id)}>Xóa</button>
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
            <h2>{form.id ? 'Sửa khu ghế' : 'Thêm khu ghế'}</h2>
            <div className="admin-form">
              <label>Tên<input value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
              <label>Giá<input type="number" value={form.price ?? 0} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} /></label>
              <label>Màu<input value={form.color ?? '#5b4dff'} onChange={(e) => setForm({ ...form, color: e.target.value })} /></label>
            </div>
            <div className="admin-modal__actions">
              <button type="button" className="btn btn-primary" disabled={saving} onClick={save}>Lưu</button>
              <button type="button" className="btn btn-outline" onClick={() => setForm(null)}>Hủy</button>
            </div>
          </div>
        </div>
      ) : null}
      {genZone ? (
        <div className="admin-modal-backdrop" onClick={() => setGenZone(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Sinh ghế — {genZone.name}</h2>
            <p style={{ margin: '0 0 14px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Mặc định: 12 hàng (A–L) × 28 ghế/hàng (14 trái + lối đi + 14 phải).
            </p>
            <div className="admin-form">
              <label>Hàng (cách nhau bởi dấu phẩy)<input value={rows} onChange={(e) => setRows(e.target.value)} /></label>
              <label>Ghế mỗi hàng (28 = 14+14)<input type="number" value={seatsPerRow} onChange={(e) => setSeatsPerRow(Number(e.target.value))} /></label>
            </div>
            <div className="admin-modal__actions">
              <button type="button" className="btn btn-primary" onClick={generate}>Sinh ghế</button>
              <button type="button" className="btn btn-outline" onClick={() => setGenZone(null)}>Hủy</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
