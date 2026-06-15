import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { concertApi } from '../api/concertApi';
import { ConcertCard } from '../components/ConcertCard';
import { EmptyState } from '../components/EmptyState';
import { Spinner } from '../components/Spinner';
import { getApiErrorMessage, useAuth } from '../context/AuthContext';
import type { Concert } from '../types';
import { extractList } from '../utils/apiData';
import { concertArtistsLabel, formatDateTime } from '../utils/format';
import { IconCalendar, IconLocation } from '../components/fan/FanIcons';
import './ConcertDetailPage.css';

const PLACEHOLDER = 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1200';

export function ConcertDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [concert, setConcert] = useState<Concert | null>(null);
  const [related, setRelated] = useState<Concert[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      try {
        const [detailRes, recRes] = await Promise.all([
          concertApi.getConcertDetail(id),
          concertApi.getRecommendations(id),
        ]);
        setConcert(detailRes.data);
        setRelated(recRes.data.recommendedConcerts ?? []);
        if (isAuthenticated) {
          await concertApi.logBehavior(id, 'view').catch(() => {});
          try {
            const favRes = await concertApi.getFavorites();
            setIsFavorite(extractList<Concert>(favRes.data).some((c) => c.id === id));
          } catch {
            setIsFavorite(false);
          }
        }
      } catch (e) {
        setMsg(getApiErrorMessage(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isAuthenticated]);

  const toggleFavorite = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/concerts/${id}` } });
      return;
    }
    if (!id) return;
    try {
      if (isFavorite) {
        await concertApi.removeFavorite(id);
        setIsFavorite(false);
      } else {
        await concertApi.addFavorite(id);
        await concertApi.logBehavior(id, 'favorite');
        setIsFavorite(true);
      }
    } catch (e) {
      setMsg(getApiErrorMessage(e));
    }
  };

  const book = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/concerts/${id}/seats` } });
      return;
    }
    navigate(`/concerts/${id}/seats`);
  };

  const previewVr = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/concerts/${id}/vr-preview` } });
      return;
    }
    navigate(`/concerts/${id}/vr-preview`);
  };

  const hasVr = !!concert?.venue?.model_glb_path;

  if (loading) return <Spinner />;
  if (!concert) {
    return (
      <div className="container page">
        <EmptyState
          icon="concert"
          title="Không tìm thấy concert"
          description={msg ?? 'Sự kiện có thể đã bị gỡ hoặc chưa được publish.'}
          action={{ label: 'Về trang chủ', to: '/' }}
        />
      </div>
    );
  }

  return (
    <div className="page detail-page">
      <div className="container">
        {msg ? <div className="alert alert-error">{msg}</div> : null}
        <div className="detail-hero card">
          <div className="detail-hero__media">
            <img src={concert.banner_url || PLACEHOLDER} alt={concert.title} className="detail-hero__img" />
          </div>
          <div className="detail-hero__body">
            <h1>{concert.title}</h1>
            <div className="detail-meta-row">
              <span className="detail-pill">{concertArtistsLabel(concert)}</span>
              <span className="detail-pill">
                <IconCalendar />
                {formatDateTime(concert.start_time)}
              </span>
              <span className="detail-pill">
                <IconLocation />
                {concert.venue?.name} · {concert.venue?.city}
              </span>
            </div>
            <p className="detail-desc">{concert.description || 'Sự kiện âm nhạc đặc sắc — đặt vé ngay để không bỏ lỡ.'}</p>
            <div className="detail-actions">
              <button
                type="button"
                className={`btn btn-outline ${isFavorite ? 'is-fav' : ''}`}
                onClick={toggleFavorite}
              >
                {isFavorite ? '♥ Đã yêu thích' : '♡ Thêm yêu thích'}
              </button>
              {hasVr ? (
                <button type="button" className="btn btn-outline" onClick={previewVr}>
                  Xem trước 3D / VR
                </button>
              ) : null}
              <button type="button" className="btn btn-primary" onClick={book}>
                Chọn ghế & đặt vé
              </button>
            </div>
          </div>
        </div>

        {related.length > 0 && (
          <section className="section">
            <h2 className="section-title">Concert liên quan</h2>
            <div className="grid-concerts">
              {related.map((c) => (
                <ConcertCard key={c.id} concert={c} />
              ))}
            </div>
          </section>
        )}

        <Link to="/" className="back-link">← Quay lại danh sách</Link>
      </div>
    </div>
  );
}
