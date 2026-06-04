import uuid
from django.db import models
from app.users.models import User
from app.concerts.models import Concert


class UserBehavior(models.Model):
    ACTION_CHOICES = [
        ('view', 'View'),
        ('click', 'Click'),
        ('favorite', 'Favorite'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='behaviors')
    concert = models.ForeignKey(Concert, on_delete=models.CASCADE, related_name='behaviors')
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'user_behaviors'
        indexes = [
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['concert', 'action']),
        ]

    def __str__(self):
        return f"{self.user.email} - {self.action} - {self.concert.title}"


class Favorite(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='favorites')
    concert = models.ForeignKey(Concert, on_delete=models.CASCADE, related_name='favorited_by')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'favorites'
        unique_together = ('user', 'concert')

    def __str__(self):
        return f"{self.user.email} - {self.concert.title}"
