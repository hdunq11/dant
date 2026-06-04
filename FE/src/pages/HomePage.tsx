import { useCallback, useEffect, useState } from 'react';
import { concertApi } from '../api/concertApi';
import { ConcertCard } from '../components/ConcertCard';
import { Spinner } from '../components/Spinner';
import { getApiErrorMessage } from '../context/AuthContext';
import type { Concert } from '../types';
import { CITIES, GENRES, mapCity, mapGenre } from '../utils/mappers';
import './HomePage.css';

export function HomePage() {
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('Tất cả');
  const [genre, setGenre] = useState('Tất cả');
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [recommended, setRecommended] = useState<Concert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [listRes, recRes] = await Promise.all([
        concertApi.getConcerts({
          search: search.trim() || undefined,
          city: mapCity(city),
          genre: mapGenre(genre),
        }),
        concertApi.getRecommendations(),
      ]);
      setConcerts(listRes.data.results ?? []);
      setRecommended(recRes.data.recommendedConcerts ?? []);
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [search, city, genre]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="page">
      <div className="container">
        <section className="hero">
          <div>
            <h1 className="hero__title">Đặt vé concert dễ dàng</h1>
            <p className="hero__sub">Khám phá sự kiện, chọn ghế và thanh toán an toàn trên web.</p>
          </div>
          <form
            className="search-bar"
            onSubmit={(e) => {
              e.preventDefault();
              load();
            }}
          >
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm concert, nghệ sĩ..."
            />
            <button type="submit" className="btn btn-primary">
              Tìm kiếm
            </button>
          </form>
        </section>

        <div className="filters">
          <div>
            <span className="filter-label">Thành phố</span>
            <div className="chips">
              {CITIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`chip ${city === c ? 'active' : ''}`}
                  onClick={() => setCity(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="filter-label">Thể loại</span>
            <div className="chips">
              {GENRES.map((g) => (
                <button
                  key={g}
                  type="button"
                  className={`chip ${genre === g ? 'active' : ''}`}
                  onClick={() => setGenre(g)}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error ? <div className="alert alert-error">{error}</div> : null}
        {loading ? (
          <Spinner />
        ) : (
          <>
            {recommended.length > 0 && (
              <section className="section">
                <h2 className="section-title">Gợi ý cho bạn</h2>
                <div className="grid-concerts">
                  {recommended.slice(0, 3).map((c) => (
                    <ConcertCard key={c.id} concert={c} badge="Đề xuất" />
                  ))}
                </div>
              </section>
            )}
            <section className="section">
              <h2 className="section-title">Tất cả sự kiện</h2>
              {concerts.length ? (
                <div className="grid-concerts">
                  {concerts.map((c) => (
                    <ConcertCard key={c.id} concert={c} />
                  ))}
                </div>
              ) : (
                <p className="empty">Không có concert phù hợp.</p>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
