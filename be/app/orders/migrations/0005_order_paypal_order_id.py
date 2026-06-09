from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0004_order_stripe_payment_intent'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='paypal_order_id',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
    ]
