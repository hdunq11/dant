import { Link } from 'react-router-dom';
import type { Concert } from '../types';
import { concertArtistsLabel, formatDateTime } from '../utils/format';
import './ConcertCard.css';

const PLACEHOLDER = 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600';

export function ConcertCard({ concert, badge }: { concert: Concert; badge?: string }) {
  return (
    <Link to={`/concerts/${concert.id}`} className="concert-card card">
      <div className="concert-card__img-wrap">
        <img src={concert.banner_url || PLACEHOLDER} alt={concert.title} loading="lazy" />
        {badge ? <span className="concert-card__badge">{badge}</span> : null}
      </div>
      <div className="concert-card__body">
        <h3>{concert.title}</h3>
        <p className="muted">{concertArtistsLabel(concert)}</p>
        <p className="muted">{formatDateTime(concert.start_time)}</p>
        <p className="venue">{concert.venue?.name ?? concert.venue?.city}</p>
      </div>
    </Link>
  );
}
