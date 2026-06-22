import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import type { StageTemplateOption } from '../../api/adminApi';
import { organizerApi } from '../../api/organizerApi';
import { getApiErrorMessage } from '../../context/AuthContext';
import type { Venue } from '../../types';
import './OrganizerCreateConcertPage.css';

function toLocalInput(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function parseArtistNames(raw: string): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const part of raw.split(/[,;|/]+/)) {
    const name = part.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    names.push(name);
  }
  return names;
}

export function OrganizerCreateConcertPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const editId = params.get('edit');

  const [venues, setVenues] = useState<Venue[]>([]);
  const [stageTemplates, setStageTemplates] = useState<StageTemplateOption[]>([]);
  const [stageTemplate, setStageTemplate] = useState<'auditorium_336' | 'stage1_1000' | ''>('');
  const [desiredSeats, setDesiredSeats] = useState<number | ''>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [venueId, setVenueId] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [artistInput, setArtistInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showVenueForm, setShowVenueForm] = useState(false);
  const [newVenue, setNewVenue] = useState({ name: '', city: '', address: '' });

  const artistNames = useMemo(() => parseArtistNames(artistInput), [artistInput]);
  const selectedTemplate = useMemo(
    () => stageTemplates.find((t) => t.id === stageTemplate),
    [stageTemplates, stageTemplate]
  );
  const maxSeats = selectedTemplate?.capacity ?? null;

  const loadVenues = useCallback(async () => {
    const res = await organizerApi.getVenues(true);
    const venueList = res.data as Venue[] | { results?: Venue[] };
    setVenues(Array.isArray(venueList) ? venueList : venueList.results ?? []);
  }, []);

  useEffect(() => {
    Promise.all([loadVenues(), organizerApi.getStageTemplates()])
      .then(([, templatesRes]) => {
        setStageTemplates(templatesRes.data ?? []);
      })
      .catch((e) => setError(getApiErrorMessage(e)));
  }, [loadVenues]);

  useEffect(() => {
    if (!selectedTemplate) return;
    setDesiredSeats((prev) => (prev === '' ? selectedTemplate.capacity : prev));
  }, [selectedTemplate]);

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
        const names =
          c.concert_artists?.map((ca) => ca.artist?.name).filter(Boolean).join(', ') ?? '';
        setArtistInput(names);
        if (c.stage_template === 'auditorium_336' || c.stage_template === 'stage1_1000') {
          setStageTemplate(c.stage_template);
        }
        if (c.desired_seat_count != null) {
          setDesiredSeats(c.desired_seat_count);
        }
      })
      .catch((e) => setError(getApiErrorMessage(e)));
  }, [editId]);

  const createVenue = async () => {
    if (!newVenue.name.trim()) return;
    if (!selectedTemplate) {
      setError('Chọn sân khấu trước khi tạo venue.');
      return;
    }
    try {
      const res = await organizerApi.createVenue({
        ...newVenue,
        capacity: selectedTemplate.capacity,
      });
      await loadVenues();
      setVenueId(res.data.id!);
      setShowVenueForm(false);
      setNewVenue({ name: '', city: '', address: '' });
    } catch (e) {
      setError(getApiErrorMessage(e));
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !venueId || !startTime || !endTime || !stageTemplate) {
      setError('Vui lòng điền đủ thông tin bắt buộc (gồm sân khấu).');
      return;
    }
    if (desiredSeats === '' || maxSeats == null) {
      setError('Vui lòng nhập số ghế mong muốn.');
      return;
    }
    if (desiredSeats < 1) {
      setError('Số ghế mong muốn phải >= 1.');
      return;
    }
    if (desiredSeats > maxSeats) {
      setError(`Sân khấu này chỉ có tối đa ${maxSeats} ghế.`);
      return;
    }
    if (new Date(endTime).getTime() <= new Date(startTime).getTime()) {
      setError('Thời gian kết thúc phải sau thời gian bắt đầu.');
      return;
    }

    setSaving(true);
    setError(null);
    const body = {
      title: title.trim(),
      description: description.trim(),
      start_time: new Date(startTime).toISOString(),
      end_time: new Date(endTime).toISOString(),
      venue_id: venueId,
      banner_url: bannerUrl.trim() || undefined,
      artist_names: artistNames,
      stage_template: stageTemplate,
      desired_seat_count: desiredSeats,
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
    <div className="org-concert-form-page">
      <header className="org-concert-form-page__header">
        <h1>{editId ? 'Sửa concert' : 'Tạo concert mới'}</h1>
        <p>Điền thông tin sự kiện — sau khi tạo có thể cấu hình sơ đồ ghế và gửi duyệt.</p>
      </header>

      {error ? <div className="alert alert-error">{error}</div> : null}

      <form className="org-concert-form" onSubmit={submit}>
        <section className="org-concert-section">
          <header className="org-concert-section__head">
            <h2>Thông tin cơ bản</h2>
            <p>Tên và mô tả hiển thị trên trang đặt vé.</p>
          </header>
          <div className="org-concert-grid">
            <div className="org-concert-field org-concert-field--full">
              <label htmlFor="title">Tiêu đề *</label>
              <input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="VD: ALL-ROUNDER Live Concert"
                required
              />
            </div>
            <div className="org-concert-field org-concert-field--full">
              <label htmlFor="description">Mô tả</label>
              <textarea
                id="description"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Giới thiệu ngắn về chương trình, lineup, lưu ý khi tham dự..."
              />
            </div>
          </div>
        </section>

        <section className="org-concert-section">
          <header className="org-concert-section__head">
            <h2>Sân khấu & số ghế</h2>
            <p>Chọn sân khấu và số ghế — mỗi hàng 28 ghế (14 trái + 14 phải), thêm hàng từ gần sân khấu.</p>
          </header>
          <div className="org-concert-stage-grid">
            {stageTemplates.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                className={`org-concert-stage-card ${stageTemplate === tpl.id ? 'is-active' : ''}`}
                onClick={() => setStageTemplate(tpl.id)}
              >
                <strong>{tpl.label}</strong>
                <span>{tpl.description}</span>
                <em>{tpl.capacity} ghế</em>
              </button>
            ))}
          </div>
          <div className="org-concert-grid" style={{ marginTop: 16 }}>
            <div className="org-concert-field">
              <label htmlFor="desired-seats">Số ghế mong muốn *</label>
              <input
                id="desired-seats"
                type="number"
                min={1}
                max={maxSeats ?? undefined}
                value={desiredSeats}
                onChange={(e) => {
                  const val = e.target.value;
                  setDesiredSeats(val === '' ? '' : Number(val));
                }}
                disabled={!stageTemplate}
                required
              />
              {maxSeats ? (
                <small>
                  Tối đa <strong>{maxSeats}</strong> ghế · mỗi hàng 28 ghế (336) hoặc 50 ghế (1000).
                  Zone giá theo hàng (VIP gần sân khấu trước).
                </small>
              ) : (
                <small>Chọn sân khấu trước.</small>
              )}
            </div>
          </div>
        </section>

        <section className="org-concert-section">
          <header className="org-concert-section__head">
            <h2>Thời gian & địa điểm</h2>
            <p>Chọn địa điểm — mỗi concert có sơ đồ ghế riêng theo concert ID, tự sync 2D/3D khi admin duyệt.</p>
          </header>
          <div className="org-concert-grid">
            <div className="org-concert-field">
              <label htmlFor="start">Bắt đầu *</label>
              <input
                id="start"
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>
            <div className="org-concert-field">
              <label htmlFor="end">Kết thúc *</label>
              <input
                id="end"
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>
            <div className="org-concert-field org-concert-field--full">
              <div className="org-concert-venue-row">
                <div className="org-concert-field">
                  <label htmlFor="venue">Địa điểm *</label>
                  <select
                    id="venue"
                    value={venueId}
                    onChange={(e) => setVenueId(e.target.value)}
                    required
                  >
                    <option value="">— Chọn venue của bạn —</option>
                    {venues.length === 0 ? (
                      <option value="" disabled>
                        Chưa có venue — bấm + Venue mới
                      </option>
                    ) : null}
                    {venues.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.city})
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  className="btn btn-outline btn-sm org-concert-venue-toggle"
                  onClick={() => setShowVenueForm((v) => !v)}
                >
                  {showVenueForm ? 'Đóng' : '+ Venue mới'}
                </button>
              </div>
              {showVenueForm ? (
                <div className="org-concert-venue-panel">
                  <div className="org-concert-grid">
                    <div className="org-concert-field">
                      <label htmlFor="vn">Tên venue</label>
                      <input
                        id="vn"
                        value={newVenue.name}
                        onChange={(e) => setNewVenue({ ...newVenue, name: e.target.value })}
                      />
                    </div>
                    <div className="org-concert-field">
                      <label htmlFor="vc">Thành phố</label>
                      <input
                        id="vc"
                        value={newVenue.city}
                        onChange={(e) => setNewVenue({ ...newVenue, city: e.target.value })}
                      />
                    </div>
                    <div className="org-concert-field org-concert-field--full">
                      <label htmlFor="va">Địa chỉ</label>
                      <input
                        id="va"
                        value={newVenue.address}
                        onChange={(e) => setNewVenue({ ...newVenue, address: e.target.value })}
                      />
                    </div>
                  </div>
                  <button type="button" className="btn btn-primary btn-sm" onClick={createVenue}>
                    Lưu venue
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section className="org-concert-section">
          <header className="org-concert-section__head">
            <h2>Hình ảnh & nghệ sĩ</h2>
            <p>Ảnh banner và tên nghệ sĩ biểu diễn.</p>
          </header>
          <div className="org-concert-grid">
            <div className="org-concert-field org-concert-field--full">
              <label htmlFor="banner">Banner URL</label>
              <input
                id="banner"
                value={bannerUrl}
                onChange={(e) => setBannerUrl(e.target.value)}
                placeholder="https://..."
                inputMode="url"
              />
              {bannerUrl.trim() ? (
                <div className="org-concert-banner-preview">
                  <img src={bannerUrl.trim()} alt="" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                </div>
              ) : null}
            </div>
            <div className="org-concert-field org-concert-field--full">
              <label htmlFor="artists">Nghệ sĩ</label>
              <input
                id="artists"
                value={artistInput}
                onChange={(e) => setArtistInput(e.target.value)}
                placeholder="VD: Taylor Swift, The Weeknd, Sơn Tùng M-TP"
              />
              <small>Nhập tên nghệ sĩ, cách nhau bởi dấu phẩy.</small>
              {artistNames.length ? (
                <div className="org-concert-tags" aria-label="Danh sách nghệ sĩ">
                  {artistNames.map((name) => (
                    <span key={name} className="org-concert-tag">
                      {name}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <div className="org-concert-form__actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Đang lưu...' : editId ? 'Cập nhật' : 'Tạo concert'}
          </button>
          <Link to="/organizer/concerts" className="btn btn-outline">
            Hủy
          </Link>
        </div>
      </form>
    </div>
  );
}
