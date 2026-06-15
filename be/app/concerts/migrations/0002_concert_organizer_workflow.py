import uuid
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('concerts', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='concert',
            name='event_source',
            field=models.CharField(
                choices=[('internal', 'Internal'), ('external', 'External')],
                default='internal',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='concert',
            name='organizer',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='organized_concerts',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name='concert',
            name='status',
            field=models.CharField(
                choices=[
                    ('draft', 'Draft'),
                    ('pending_review', 'Pending Review'),
                    ('approved', 'Approved'),
                    ('rejected', 'Rejected'),
                    ('published', 'Published'),
                    ('cancelled', 'Cancelled'),
                    ('completed', 'Completed'),
                ],
                default='published',
                max_length=20,
            ),
        ),
    ]
