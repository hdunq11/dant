import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { organizerApi } from '../../api/organizerApi';
import { getApiErrorMessage } from '../../context/AuthContext';
import type { Artist, Venue } from '../../types';

function toLocalInput(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function OrganizerCreateConcertPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const editId = params.get('edit');

  const [venues, setVenues] = useState<Venue[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [venueId, setVenueId] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [artistIds, setArtistIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showVenueForm, setShowVenueForm] = useState(false);
  const [newVenue, setNewVenue] = useState({ name: '', city: '', address: '', capacity: 1000 });

  const loadMeta = useCallback(async () => {
    const [v, a] = await Promise.all([organizerApi.getVenues(), organizerApi.getArtists()]);
    const venueList = v.data as Venue[] | { results?: Venue[] };
    const artistData = a.data as Artist[] | { results?: Artist[] };
    setVenues(Array.isArray(venueList) ? venueList : venueList.results ?? []);
    setArtists(Array.isArray(artistData) ? artistData : artistData.results ?? []);
  }, []);

  useEffect(() => {
    loadMeta().catch((e) => setError(getApiErrorMessage(e)));
  }, [loadMeta]);

  useEffect(() => {
    if (!editId) return;
    organizerApi
      .getConcert(editId)
      .then((res) => {
        const c = res.data;
        setTitle(c.title ?? '');
        setDescription(c.description ?? '');
        setStartTime(toLocalInput(c.start_time));
        setEndTime(toLocalInput(c.end_time));
        setVenueId(c.venue?.id ?? '');
        setBannerUrl(c.banner_url ?? '');
        setArtistIds(c.concert_artists?.map((ca) => ca.artist?.id!).filter(Boolean) ?? []);
      })
      .catch((e) => setError(getApiErrorMessage(e)));
  }, [editId]);

  const createVenue = async () => {
    if (!newVenue.name.trim()) return;
    try {
      const res = await organizerApi.createVenue(newVenue);
      await loadMeta();
      setVenueId(res.data.id!);
      setShowVenueForm(false);
    } catch (e) {
      setError(getApiErrorMessage(e));
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !venueId || !startTime || !endTime) {
      setError('Vui lòng điền đủ thông tin bắt buộc.');
      return;
    }
    setSaving(true);
    setError(null);
    const body = {
      title,
      description,
      start_time: new Date(startTime).toISOString(),
      end_time: new Date(endTime).toISOString(),
      venue_id: venueId,
      banner_url: bannerUrl,
      artists: artistIds,
    };
    try {
      if (editId) await organizerApi.updateConcert(editId, body);
      else await organizerApi.createConcert(body);
      navigate('/organizer/concerts');
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1 className="page-title">{editId ? 'Sửa Concert' : 'Create Concert'}</h1>
      {error ? <div className="alert alert-error">{error}</div> : null}
      <div className="admin-card">
        <form className="admin-form" onSubmit={submit}>
          <label>Tiêu đề<input value={title} onChange={(e) => setTitle(e.target.value)} required /></label>
          <label>Mô tả<textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} /></label>
          <label>
            Địa điểm (Venue)
            <select value={venueId} onChange={(e) => setVenueId(e.target.value)} required>
              <option value="">— Chọn venue —</option>
              {venues.map((v) => (
                <option key={v.id} value={v.id}>{v.name} ({v.city})</option>
              ))}
            </select>
          </label>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowVenueForm((v) => !v)}>
            {showVenueForm ? 'Ẩn form venue mới' : '+ Tạo venue riêng'}
          </button>
          {showVenueForm ? (
            <div className="organizer-zone-card">
              <label>Tên<input value={newVenue.name} onChange={(e) => setNewVenue({ ...newVenue, name: e.target.value })} /></label>
              <label>Thành phố<input value={newVenue.city} onChange={(e) => setNewVenue({ ...newVenue, city: e.target.value })} /></label>
              <label>Địa chỉ<input value={newVenue.address} onChange={(e) => setNewVenue({ ...newVenue, address: e.target.value })} /></label>
              <label>Sức chứa<input type="number" value={newVenue.capacity} onChange={(e) => setNewVenue({ ...newVenue, capacity: Number(e.target.value) })} /></label>
              <button type="button" className="btn btn-primary btn-sm" onClick={createVenue}>Lưu venue</button>
            </div>
          ) : null}
          <label>Bắt đầu<input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} required /></label>
          <label>Kết thúc<input type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} required /></label>
          <label>Banner URL<input value={bannerUrl} onChange={(e) => setBannerUrl(e.target.value)} /></label>
          <label>
            Nghệ sĩ
            <select
              multiple
              value={artistIds}
              onChange={(e) => setArtistIds(Array.from(e.target.selectedOptions, (o) => o.value))}
              style={{ minHeight: 100 }}
            >
              {artists.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </label>
          <div className="admin-modal__actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Đang lưu...' : editId ? 'Cập nhật' : 'Tạo concert'}
            </button>
            <Link to="/organizer/concerts" className="btn btn-outline">Hủy</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
