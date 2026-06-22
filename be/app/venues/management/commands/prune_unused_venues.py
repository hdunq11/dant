from django.core.management.base import BaseCommand
from django.db import transaction

from app.concerts.models import Concert
from app.venues.models import Venue


class Command(BaseCommand):
    help = 'Xóa venue không gắn concert nào (dữ liệu mẫu / venue organizer bỏ).'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Chỉ liệt kê venue sẽ xóa, không xóa thật.',
        )

    @transaction.atomic
    def handle(self, *args, **options):
        used_ids = set(Concert.objects.exclude(venue_id__isnull=True).values_list('venue_id', flat=True))
        qs = Venue.objects.exclude(id__in=used_ids)
        names = list(qs.values_list('name', flat=True)[:20])
        total = qs.count()

        if options['dry_run']:
            self.stdout.write(f'Se xoa {total} venue (giu {len(used_ids)} venue dang co concert).')
            for name in names:
                self.stdout.write(f'  - {name}')
            if total > len(names):
                self.stdout.write(f'  ... và {total - len(names)} venue khác')
            return

        deleted, detail = qs.delete()
        self.stdout.write(
            self.style.SUCCESS(
                f'Da xoa {total} venue khong dung (giu {len(used_ids)}). Detail: {detail}'
            )
        )
