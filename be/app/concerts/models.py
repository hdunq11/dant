import uuid
from django.db import models
from app.venues.models import Venue
from app.artists.models import Artist


class Concert(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    venue = models.ForeignKey(Venue, on_delete=models.CASCADE, related_name='concerts')
    banner_url = models.TextField(null=True, blank=True)
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

