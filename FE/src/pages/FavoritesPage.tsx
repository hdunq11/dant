import { useCallback, useEffect, useState } from 'react';
import { concertApi } from '../api/concertApi';
import { ConcertCard } from '../components/ConcertCard';
import { EmptyState } from '../components/EmptyState';
import { ProfileShell } from '../components/ProfileShell';
import { Spinner } from '../components/Spinner';
import { getApiErrorMessage } from '../context/AuthContext';
import type { Concert } from '../types';
import { extractList } from '../utils/apiData';

export function FavoritesPage() {
  const [items, setItems] = useState<Concert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await concertApi.getFavorites();
      setItems(extractList<Concert>(res.data));
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
    <ProfileShell
      title="Yêu thích"
      subtitle="Các concert bạn đã lưu để xem và đặt vé sau."
    >
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
        <EmptyState
          icon="heart"
          title="Danh sách yêu thích trống"
          description="Nhấn ♥ trên concert bạn thích để lưu và đặt vé sau."
          action={{ label: 'Khám phá concert', to: '/' }}
        />
      )}
    </ProfileShell>
  );
}
