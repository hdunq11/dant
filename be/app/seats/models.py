import uuid
from django.db import models
from app.venues.models import Venue
from app.concerts.models import Concert


class SeatZone(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    venue = models.ForeignKey(Venue, on_delete=models.CASCADE, related_name='seat_zones')
    concert = models.ForeignKey(
        Concert,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='seat_zones',
        help_text='Null = zone dùng chung venue (BELOVED/76). Có giá trị = sơ đồ riêng concert.',
    )
    name = models.CharField(max_length=100)  # VIP, A, B, C
    price = models.DecimalField(max_digits=10, decimal_places=2)
    color = models.CharField(max_length=20)  # hex color code
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'seat_zones'
        constraints = [
            models.UniqueConstraint(
                fields=['venue', 'name'],
                condition=models.Q(concert__isnull=True),
                name='seatzone_venue_name_unique',
            ),
            models.UniqueConstraint(
                fields=['concert', 'name'],
                condition=models.Q(concert__isnull=False),
                name='seatzone_concert_name_unique',
            ),
        ]

    def __str__(self):
        return f"{self.venue.name} - {self.name}"


class Seat(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    venue = models.ForeignKey(Venue, on_delete=models.CASCADE, related_name='seats')
    concert = models.ForeignKey(
        Concert,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='seats',
        help_text='Null = ghế venue (legacy). Có giá trị = ghế riêng của concert.',
    )
    zone = models.ForeignKey(SeatZone, on_delete=models.CASCADE, related_name='seats')
    row_label = models.CharField(max_length=5)  # A, B, C, ...
    seat_number = models.IntegerField()  # 1, 2, 3, ...
    pos_x = models.FloatField()  # map 2D / trục X trong scene 3D
    pos_y = models.FloatField()  # map 2D / trục Z (chiều sâu) trong scene 3D
    pos_z = models.FloatField(default=0.0)  # độ cao Y trong scene 3D (từ GLTF)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'seats'
        constraints = [
            models.UniqueConstraint(
                fields=['venue', 'row_label', 'seat_number'],
                condition=models.Q(concert__isnull=True),
                name='seat_venue_row_num_unique',
            ),
            models.UniqueConstraint(
                fields=['concert', 'row_label', 'seat_number'],
                condition=models.Q(concert__isnull=False),
                name='seat_concert_row_num_unique',
            ),
        ]

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
    reserved_until = models.DateTimeField(null=True, blank=True)  # TTL giữ chỗ 10 phút; trạng thái hiển thị tính real-time
    reserved_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reserved_concert_seats',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'concert_seats'
        unique_together = ('concert', 'seat')

    def __str__(self):
        return f"{self.concert.title} - {self.seat} - {self.status}"
