from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0002_organizer_profile'),
    ]

    operations = [
        migrations.AddField(
            model_name='organizerprofile',
            name='service_fee_percent',
            field=models.DecimalField(
                decimal_places=2,
                default=5,
                help_text='Phí dịch vụ nền tảng (%) — chiết khấu trên doanh thu vé của concert.',
                max_digits=5,
            ),
        ),
    ]
