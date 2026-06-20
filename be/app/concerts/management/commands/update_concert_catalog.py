from datetime import datetime, time, timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from app.artists.models import Artist
from app.concerts.models import Concert, ConcertArtist

# Chi cap nhat concert CO SAN (doi ten + nghe si + banner), KHONG tao them record moi.
CONCERT_UPDATES = [
    {
        'concert_name': 'Bùi Công Nam 1st Fan Meeting',
        'artist_name': 'Bùi Công Nam',
        'date': '2026-08-12',
        'image_url': 'https://i.ytimg.com/vi/BjtTL_kxKfY/maxresdefault.jpg',
    },
    {
        'concert_name': 'BELOVED 2nd Fan Meeting',
        'artist_name': 'Bùi Công Nam',
        'date': '2026-08-28',
        'image_url': 'https://i.ytimg.com/vi/k5-o720MECI/maxresdefault.jpg',
    },
    {
        'concert_name': 'Mơ Màng Men Say Live Show',
        'artist_name': 'Bùi Công Nam, Tăng Phúc',
        'date': '2026-09-10',
        'image_url': 'https://ticketgo.vn/uploads/event/mo-mang-men-say-poster.webp',
    },
    {
        'concert_name': 'Hải Ly Phiêu Lưu Ký Fan Meeting',
        'artist_name': 'Tăng Phúc',
        'date': '2026-09-24',
        'image_url': 'https://cticket.vn/uploads/events/tang-phuc-fanmeeting-2025.webp',
    },
    {
        'concert_name': 'Hội Trăng Hải Ly Fan Meeting',
        'artist_name': 'Tăng Phúc',
        'date': '2026-10-08',
        'image_url': 'https://media.yan.vn/tang-phuc-hoi-trang-hai-ly.jpg',
    },
    {
        'concert_name': 'RHYMeeting',
        'artist_name': 'Rhymastic',
        'date': '2026-10-21',
        'image_url': 'https://image.tuoitre.vn/1200x630/471584752817336320/2025/10/20/rhymeeting-poster.jpg',
    },
    {
        'concert_name': 'PROMise To My KINGDOM',
        'artist_name': 'Soobin Hoàng Sơn',
        'date': '2026-11-05',
        'image_url': 'https://cms.yan.vn/uploads/soobin-promise-concert-poster.jpg',
    },
    {
        'concert_name': 'ALL-ROUNDER Live Concert',
        'artist_name': 'Soobin Hoàng Sơn',
        'date': '2026-11-18',
        'image_url': 'https://images.vietcetera.com/uploads/soobin-all-rounder-poster.jpg',
    },
    {
        'concert_name': 'Trạm Yêu Live Concert',
        'artist_name': 'Soobin Hoàng Sơn, Rhymastic, Cường Seven',
        'date': '2026-12-02',
        'image_url': 'https://image.thethaovanhoa.vn/tram-yeu-live-concert-soobin.jpg',
    },
    {
        'concert_name': 'Anh Trai Vượt Ngàn Chông Gai Encore',
        'artist_name': 'Bùi Công Nam, Soobin Hoàng Sơn, Rhymastic, Binz',
        'date': '2026-12-20',
        'image_url': 'https://media.tuoitre.vn/atvncg-encore-poster.jpg',
    },
]


def _parse_show_datetime(date_str: str) -> tuple[datetime, datetime]:
    day = datetime.strptime(date_str, '%Y-%m-%d').date()
    start = timezone.make_aware(datetime.combine(day, time(13, 0)))
    end = start + timedelta(hours=10, minutes=59)
    return start, end


def _parse_artist_names(raw: str) -> list[str]:
    return [name.strip() for name in raw.split(',') if name.strip()]


def _pick_concert(payload: dict, used_ids: set, slot_index: int) -> Concert | None:
    """Lay concert co san theo thu tu, khong tao moi."""
    by_title = (
        Concert.objects.filter(status='published', title=payload['concert_name'])
        .exclude(id__in=used_ids)
        .first()
    )
    if by_title:
        return by_title

    pool = list(
        Concert.objects.filter(status='published', title__regex=r'^Concert \d+$')
        .exclude(id__in=used_ids)
        .order_by('start_time')
    )
    if slot_index < len(pool):
        return pool[slot_index]
    return None


def _sync_artists(concert: Concert, artist_names: list[str], image_url: str) -> None:
    ConcertArtist.objects.filter(concert=concert).delete()
    for name in artist_names:
        artist, created = Artist.objects.get_or_create(
            name=name,
            defaults={'genre': 'pop', 'image_url': image_url},
        )
        if created or not artist.image_url:
            artist.image_url = image_url
            artist.save(update_fields=['image_url', 'updated_at'])
        ConcertArtist.objects.create(concert=concert, artist=artist)


class Command(BaseCommand):
    help = 'Doi ten + nghe si + banner tren concert co san (khong them concert moi).'

    def handle(self, *args, **options):
        total_before = Concert.objects.count()
        used_ids: set = set()
        updated = 0

        for index, payload in enumerate(CONCERT_UPDATES):
            concert = _pick_concert(payload, used_ids, index)
            if not concert:
                self.stderr.write(f'Khong tim thay concert co san cho slot {index + 1}')
                continue

            used_ids.add(concert.id)
            start_time, end_time = _parse_show_datetime(payload['date'])
            concert.title = payload['concert_name']
            concert.banner_url = payload['image_url']
            concert.start_time = start_time
            concert.end_time = end_time
            concert.save(
                update_fields=['title', 'banner_url', 'start_time', 'end_time', 'updated_at']
            )

            artist_names = _parse_artist_names(payload.get('artist_name') or '')
            if artist_names:
                _sync_artists(concert, artist_names, payload['image_url'])

            updated += 1
            self.stdout.write(
                self.style.SUCCESS(f'OK slot {index + 1} | artists={len(artist_names)}')
            )

        total_after = Concert.objects.count()
        if total_before != total_after:
            raise RuntimeError(f'Loi: so concert thay doi ({total_before} -> {total_after})')

        self.stdout.write(
            self.style.SUCCESS(
                f'Da doi ten {updated}/{len(CONCERT_UPDATES)} concert. Tong concert van la {total_after}.'
            )
        )
