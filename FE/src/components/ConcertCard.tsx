import { Link } from 'react-router-dom';
import type { Concert } from '../types';
import { IconCalendar, IconLocation } from './fan/FanIcons';
import { concertArtistsLabel, formatDateTime } from '../utils/format';
import './ConcertCard.css';

const PLACEHOLDER = 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600';

export function ConcertCard({ concert, badge }: { concert: Concert; badge?: string }) {
  const dateLabel = formatDateTime(concert.start_time);

  return (
    <Link to={`/concerts/${concert.id}`} className="concert-card card">
      <div className="concert-card__img-wrap">
        <img src={concert.banner_url || PLACEHOLDER} alt={concert.title} loading="lazy" />
        <div className="concert-card__overlay" aria-hidden />
        {badge ? <span className="concert-card__badge">{badge}</span> : null}
        <span className="concert-card__date">
          <IconCalendar size={13} />
          {dateLabel}
        </span>
      </div>
      <div className="concert-card__body">
        <h3>{concert.title}</h3>
        <p className="concert-card__artist">{concertArtistsLabel(concert)}</p>
        <p className="concert-card__venue">
          <IconLocation size={13} />
          {concert.venue?.name ?? concert.venue?.city ?? 'Địa điểm sắp cập nhật'}
        </p>
      </div>
    </Link>
  );
}
