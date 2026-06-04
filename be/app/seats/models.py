import uuid
from django.db import models
from app.venues.models import Venue
from app.concerts.models import Concert


class SeatZone(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    venue = models.ForeignKey(Venue, on_delete=models.CASCADE, related_name='seat_zones')
    name = models.CharField(max_length=100)  # VIP, A, B, C
    price = models.DecimalField(max_digits=10, decimal_places=2)
    color = models.CharField(max_length=20)  # hex color code
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'seat_zones'
        unique_together = ('venue', 'name')

    def __str__(self):
        return f"{self.venue.name} - {self.name}"


class Seat(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    venue = models.ForeignKey(Venue, on_delete=models.CASCADE, related_name='seats')
    zone = models.ForeignKey(SeatZone, on_delete=models.CASCADE, related_name='seats')
    row_label = models.CharField(max_length=5)  # A, B, C, ...
    seat_number = models.IntegerField()  # 1, 2, 3, ...
    pos_x = models.FloatField()  # for 2D map
    pos_y = models.FloatField()  # for 2D map
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'seats'
        unique_together = ('venue', 'row_label', 'seat_number')

    def __str__(self):
        return f"{self.venue.name} - {self.row_label}{self.seat_number}"


class ConcertSeat(models.Model):
    STATUS_CHOICES = [
        ('available', 'Available'),
        ('reserved', 'Reserved'),
        ('sold', 'Sold'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    concert = models.ForeignKey(Concert, on_delete=models.CASCADE, related_name='concert_seats')
    seat = models.ForeignKey(Seat, on_delete=models.CASCADE)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='available')
    reserved_until = models.DateTimeField(null=True, blank=True)  # for reservation timeout
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'concert_seats'
        unique_together = ('concert', 'seat')

    def __str__(self):
        return f"{self.concert.title} - {self.seat} - {self.status}"
