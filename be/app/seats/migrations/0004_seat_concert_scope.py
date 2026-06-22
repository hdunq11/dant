import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('concerts', '0004_concert_stage_fields'),
        ('seats', '0003_concertseat_reserved_by'),
    ]

    operations = [
        migrations.AddField(
            model_name='seatzone',
            name='concert',
            field=models.ForeignKey(
                blank=True,
                help_text='Null = zone dùng chung venue (BELOVED/76). Có giá trị = sơ đồ riêng concert.',
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='seat_zones',
                to='concerts.concert',
            ),
        ),
        migrations.AddField(
            model_name='seat',
            name='concert',
            field=models.ForeignKey(
                blank=True,
                help_text='Null = ghế venue (legacy). Có giá trị = ghế riêng của concert.',
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='seats',
                to='concerts.concert',
            ),
        ),
        migrations.AlterUniqueTogether(
            name='seatzone',
            unique_together=set(),
        ),
        migrations.AlterUniqueTogether(
            name='seat',
            unique_together=set(),
        ),
        migrations.AddConstraint(
            model_name='seatzone',
            constraint=models.UniqueConstraint(
                condition=models.Q(('concert__isnull', True)),
                fields=('venue', 'name'),
                name='seatzone_venue_name_unique',
            ),
        ),
        migrations.AddConstraint(
            model_name='seatzone',
            constraint=models.UniqueConstraint(
                condition=models.Q(('concert__isnull', False)),
                fields=('concert', 'name'),
                name='seatzone_concert_name_unique',
            ),
        ),
        migrations.AddConstraint(
            model_name='seat',
            constraint=models.UniqueConstraint(
                condition=models.Q(('concert__isnull', True)),
                fields=('venue', 'row_label', 'seat_number'),
                name='seat_venue_row_num_unique',
            ),
        ),
        migrations.AddConstraint(
            model_name='seat',
            constraint=models.UniqueConstraint(
                condition=models.Q(('concert__isnull', False)),
                fields=('concert', 'row_label', 'seat_number'),
                name='seat_concert_row_num_unique',
            ),
        ),
    ]
