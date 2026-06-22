from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('concerts', '0002_concert_organizer_workflow'),
    ]

    operations = [
        migrations.AddField(
            model_name='concert',
            name='service_fee_percent',
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text='Phí dịch vụ (%) riêng cho concert — ưu tiên hơn mức mặc định của organizer.',
                max_digits=5,
                null=True,
            ),
        ),
    ]
