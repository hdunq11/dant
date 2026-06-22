import uuid
from django.db import models
from django.conf import settings
from app.venues.models import Venue
from app.artists.models import Artist


class Concert(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('pending_review', 'Pending Review'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('published', 'Published'),
        ('cancelled', 'Cancelled'),
        ('completed', 'Completed'),
    ]
    EVENT_SOURCE_CHOICES = [
        ('internal', 'Internal'),
        ('external', 'External'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    venue = models.ForeignKey(Venue, on_delete=models.CASCADE, related_name='concerts')
    organizer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='organized_concerts',
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='published')
    event_source = models.CharField(max_length=20, choices=EVENT_SOURCE_CHOICES, default='internal')
    banner_url = models.TextField(null=True, blank=True)
    service_fee_percent = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Phí dịch vụ (%) riêng cho concert — ưu tiên hơn mức mặc định của organizer.',
    )
    STAGE_TEMPLATE_CHOICES = [
        ('auditorium_336', 'Hội trường 336 ghế'),
        ('stage1_1000', 'Sân khấu 1000 ghế'),
    ]
    stage_template = models.CharField(
        max_length=32,
        choices=STAGE_TEMPLATE_CHOICES,
        null=True,
        blank=True,
    )
    desired_seat_count = models.PositiveIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'concerts'
        ordering = ['-start_time']

    def __str__(self):
        return self.title


class ConcertArtist(models.Model):
    concert = models.ForeignKey(Concert, on_delete=models.CASCADE, related_name='concert_artists')
    artist = models.ForeignKey(Artist, on_delete=models.CASCADE, related_name='artist_concerts')

    class Meta:
        db_table = 'concert_artists'
        unique_together = ('concert', 'artist')

    def __str__(self):
        return f"{self.concert.title} - {self.artist.name}"

