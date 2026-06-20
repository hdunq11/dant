from datetime import datetime, time, timedelta

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from app.artists.models import Artist
from app.concerts.models import Concert, ConcertArtist
from app.orders.models import Order

# Concert 91: nhieu don nhat, giu lai + cap nhat noi dung BELOVED
KEEP_CONCERT_91_ID = '3d47bed2-e2a9-415f-8c05-73f2281e6de3'
# Concert 76: nhieu don nhat
KEEP_CONCERT_76_ID = '187a451d-f89d-444d-9e99-0179fe0c1c39'

CONCERT_91_DATA = {
    'title': 'BELOVED 2nd Fan Meeting',
    'artist_name': 'Bùi Công Nam',
    'date': '2026-08-28',
    'banner_url': 'https://i.ytimg.com/vi/k5-o720MECI/maxresdefault.jpg',
}


class Command(BaseCommand):
    help = 'Giu 2 concert (91 + 76), xoa tat ca concert khac.'

    @transaction.atomic
    def handle(self, *args, **options):
        keep_ids = [KEEP_CONCERT_91_ID, KEEP_CONCERT_76_ID]
        concerts_before = Concert.objects.count()
        orders_before = Order.objects.count()

        c91 = Concert.objects.filter(id=KEEP_CONCERT_91_ID).first()
        c76 = Concert.objects.filter(id=KEEP_CONCERT_76_ID).first()
        if not c91 or not c76:
            self.stderr.write('Khong tim thay Concert 91 hoac Concert 76 can giu.')
            return

        day = datetime.strptime(CONCERT_91_DATA['date'], '%Y-%m-%d').date()
        start = timezone.make_aware(datetime.combine(day, time(13, 0)))
        end = start + timedelta(hours=10, minutes=59)
        c91.title = CONCERT_91_DATA['title']
        c91.banner_url = CONCERT_91_DATA['banner_url']
        c91.start_time = start
        c91.end_time = end
        c91.save()

        ConcertArtist.objects.filter(concert=c91).delete()
        artist, _ = Artist.objects.get_or_create(
            name=CONCERT_91_DATA['artist_name'],
            defaults={'genre': 'pop', 'image_url': CONCERT_91_DATA['banner_url']},
        )
        ConcertArtist.objects.create(concert=c91, artist=artist)

        deleted_count, _ = Concert.objects.exclude(id__in=keep_ids).delete()

        concerts_after = Concert.objects.count()
        orders_after = Order.objects.count()

        self.stdout.write(self.style.SUCCESS(f'Concert truoc: {concerts_before}, sau: {concerts_after}'))
        self.stdout.write(self.style.SUCCESS(f'Don hang truoc: {orders_before}, sau: {orders_after}'))
        self.stdout.write(self.style.SUCCESS(f'Da xoa {deleted_count} record lien quan concert khac.'))
        self.stdout.write(self.style.SUCCESS(f'Giu lai: {c91.title} ({c91.id})'))
        self.stdout.write(self.style.SUCCESS(f'Giu lai: {c76.title} ({c76.id})'))
