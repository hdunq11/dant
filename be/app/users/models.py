import uuid
from django.db import models
from django.contrib.auth.models import AbstractUser


class User(AbstractUser):
    ROLE_CHOICES = [
        ('user', 'User'),
        ('admin', 'Admin'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    password_hash = models.CharField(max_length=255)
    full_name = models.CharField(max_length=255)
    avatar_url = models.TextField(null=True, blank=True)
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='user')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'users'
        verbose_name_plural = 'Users'

    def __str__(self):
        return self.email
