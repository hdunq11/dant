from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('concerts', '0003_concert_service_fee_percent'),
    ]

    operations = [
        migrations.AddField(
            model_name='concert',
            name='stage_template',
            field=models.CharField(
                blank=True,
                choices=[
                    ('auditorium_336', 'Hội trường 336 ghế'),
                    ('stage1_1000', 'Sân khấu 1000 ghế'),
                ],
                max_length=32,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name='concert',
            name='desired_seat_count',
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
    ]
