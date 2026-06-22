from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0005_order_paypal_order_id'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='platform_commission',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=12),
        ),
        migrations.AddField(
            model_name='order',
            name='service_fee_percent_snapshot',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=5),
        ),
    ]
