from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0003_voucher_order_pricing_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='stripe_payment_intent_id',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
    ]
