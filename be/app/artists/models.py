import uuid
from django.db import models


class Artist(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    genre = models.CharField(max_length=100)  # pop, kpop, rock, ...
    description = models.TextField(null=True, blank=True)
    image_url = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'artists'

    def __str__(self):
        return self.name
