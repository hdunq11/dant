import { useCallback, useEffect, useState } from 'react';
import type { SeatZone } from '../../api/adminApi';
import { organizerApi } from '../../api/organizerApi';
import { EmptyState } from '../../components/EmptyState';
import { LoadingState } from '../../components/LoadingState';
import { PageHeader } from '../../components/portal/PageHeader';
import { getApiErrorMessage } from '../../context/AuthContext';
import type { Venue } from '../../types';
import { formatVnd } from '../../utils/format';
import { VENUE_DEFAULT_ROWS, VENUE_SEATS_PER_ROW } from '../../utils/seatGrid';

const empty: SeatZone = { name: '', price: 250000, color: '#5b4dff', venue_id: '' };

export function OrganizerSeatMapPage() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [venueId, setVenueId] = useState('');
  const [items, setItems] = useState<SeatZone[]>([]);
  const [venuesLoading, setVenuesLoading] = useState(true);
  const [zonesLoading, setZonesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<SeatZone | null>(null);
  const [genZone, setGenZone] = useState<SeatZone | null>(null);
  const [rows, setRows] = useState(VENUE_DEFAULT_ROWS);
  const [seatsPerRow, setSeatsPerRow] = useState(VENUE_SEATS_PER_ROW);
  const [saving, setSaving] = useState(false);

  const loadVenues = useCallback(async () => {
    setVenuesLoading(true);
    try {
      const res = await organizerApi.getVenues(true);
      const data = res.data as Venue[] | { results?: Venue[] };
      const list = Array.isArray(data) ? data : data.results ?? [];
      setVenues(list);
      setVenueId((prev) => {
        if (prev && list.some((v) => v.id === prev)) return prev;
        return list[0]?.id ?? '';
      });
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setVenuesLoading(false);
    }
  }, []);

  const loadZones = useCallback(async () => {
    if (!venueId) {
      setItems([]);
      setZonesLoading(false);
      return;
    }
    setZonesLoading(true);
    try {
      const res = await organizerApi.getSeatZones(venueId);
      const data = res.data as SeatZone[] | { results?: SeatZone[] };
      setItems(Array.isArray(data) ? data : data.results ?? []);
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setZonesLoading(false);
    }
  }, [venueId]);

  useEffect(() => { loadVenues().catch((e) => setError(getApiErrorMessage(e))); }, [loadVenues]);
  useEffect(() => { loadZones(); }, [loadZones]);

  const save = async () => {
    if (!form?.name?.trim() || !form.venue_id) return;
    setSaving(true);
    try {
      if (form.id) await organizerApi.updateSeatZone(form.id, form);
      else await organizerApi.createSeatZone(form);
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
      const res = await organizerApi.generateSeats(genZone.id, rowList, seatsPerRow);
      alert(res.data.message ?? `Đã sinh ${res.data.count} ghế`);
      setGenZone(null);
    } catch (e) {
      setError(getApiErrorMessage(e));
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Xóa khu ghế?')) return;
    try {
      await organizerApi.deleteSeatZone(id);
      await loadZones();
    } catch (e) {
      setError(getApiErrorMessage(e));
    }
  };

  const pageLoading = venuesLoading || (Boolean(venueId) && zonesLoading);
  const noVenues = !venuesLoading && !venues.length;

  return (
    <div>
      <PageHeader
        title="Seat Map"
        subtitle="Thiết lập khu vực và giá vé cho venue do bạn tạo."
        actions={(
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={!venueId || noVenues}
            onClick={() => setForm({ ...empty, venue_id: venueId })}
          >
            + Thêm khu ghế
          </button>
        )}
      />
      {error ? <div className="alert alert-error">{error}</div> : null}
      <div className="admin-toolbar">
        <label>
          Venue{' '}
          <select
            value={venueId}
            disabled={venuesLoading || noVenues}
            onChange={(e) => setVenueId(e.target.value)}
          >
            {noVenues ? (
              <option value="">Chưa có venue</option>
            ) : (
              venues.map((v) => (
                <option key={v.id} value={v.id}>{v.name} ({v.city})</option>
              ))
            )}
          </select>
        </label>
      </div>
      <div className="admin-card admin-table-wrap">
        {pageLoading ? (
          <LoadingState compact label="Đang tải sơ đồ ghế..." />
        ) : noVenues ? (
          <EmptyState
            compact
            icon="venue"
            title="Chưa có địa điểm"
            description="Tạo concert và thêm venue riêng trong form Create Concert — sau đó quay lại đây để thiết lập khu ghế."
            action={{ label: 'Tạo concert & venue', to: '/organizer/concerts/create' }}
          />
        ) : items.length ? (
          <table className="admin-table">
            <thead><tr><th>Khu</th><th>Giá vé</th><th>Màu</th><th></th></tr></thead>
            <tbody>
              {items.map((z) => (
                <tr key={z.id}>
                  <td>{z.name}</td>
                  <td>{formatVnd(z.price)}</td>
                  <td><span style={{ color: z.color }}>{z.color}</span></td>
                  <td className="admin-actions">
                    <button type="button" className="btn btn-outline btn-xs" onClick={() => setForm({ ...z, venue_id: venueId })}>Sửa giá</button>
                    <button type="button" className="btn btn-outline btn-xs" onClick={() => setGenZone(z)}>Sinh ghế</button>
                    <button type="button" className="btn btn-danger btn-xs" onClick={() => z.id && remove(z.id)}>Xóa</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState
            compact
            icon="seat"
            title="Chưa có khu ghế"
            description="Venue đã sẵn sàng — thêm khu vực, đặt giá vé và sinh ghế cho sự kiện của bạn."
            action={{ label: '+ Thêm khu ghế', onClick: () => setForm({ ...empty, venue_id: venueId }) }}
          />
        )}
      </div>
      {form ? (
        <div className="admin-modal-backdrop" onClick={() => setForm(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h2>{form.id ? 'Sửa khu ghế' : 'Thêm khu ghế'}</h2>
            <div className="admin-form">
              <label>Tên khu<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
              <label>Giá vé<input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} /></label>
              <label>Màu<input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} /></label>
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
              <label>Hàng (cách nhau dấu phẩy)<input value={rows} onChange={(e) => setRows(e.target.value)} /></label>
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
