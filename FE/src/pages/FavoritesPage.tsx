import { useCallback, useEffect, useState } from 'react';
import { concertApi } from '../api/concertApi';
import { ConcertCard } from '../components/ConcertCard';
import { Spinner } from '../components/Spinner';
import { getApiErrorMessage } from '../context/AuthContext';
import type { Concert } from '../types';

export function FavoritesPage() {
  const [items, setItems] = useState<Concert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await concertApi.getFavorites();
      setItems(res.data ?? []);
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="page">
      <div className="container">
        <h1 className="page-title">Yêu thích</h1>
        {error ? <div className="alert alert-error">{error}</div> : null}
        {loading ? (
          <Spinner />
        ) : items.length ? (
          <div className="grid-concerts">
            {items.map((c) => (
              <ConcertCard key={c.id} concert={c} />
            ))}
          </div>
        ) : (
          <p className="empty">Chưa có concert yêu thích.</p>
        )}
      </div>
    </div>
  );
}
