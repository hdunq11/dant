import uuid
from django.db import models


class Venue(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    city = models.CharField(max_length=100)
    address = models.TextField()
    capacity = models.IntegerField()
    model_glb_path = models.CharField(
        max_length=500,
        blank=True,
        default='',
        help_text='Đường dẫn file GLB venue, vd: models/venue.glb',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'venues'

    def __str__(self):
        return self.name
