import uuid
from decimal import Decimal

from django.db import migrations, models


def seed_vouchers(apps, schema_editor):
    Voucher = apps.get_model('orders', 'Voucher')
    defaults = [
        ('DATN10', Decimal('10'), 'Giảm 10% giá vé'),
        ('CONCERT20', Decimal('20'), 'Giảm 20% giá vé'),
    ]
    for code, percent, description in defaults:
        Voucher.objects.get_or_create(
            code=code,
            defaults={
                'discount_percent': percent,
                'description': description,
                'is_active': True,
            },
        )


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0002_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Voucher',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('code', models.CharField(max_length=50, unique=True)),
                ('discount_percent', models.DecimalField(decimal_places=2, max_digits=5)),
                ('description', models.CharField(blank=True, default='', max_length=255)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'db_table': 'vouchers',
                'ordering': ['code'],
            },
        ),
        migrations.AddField(
            model_name='order',
            name='seat_subtotal',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=12),
        ),
        migrations.AddField(
            model_name='order',
            name='booking_fee',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=10),
        ),
        migrations.AddField(
            model_name='order',
            name='delivery_fee',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=10),
        ),
        migrations.AddField(
            model_name='order',
            name='insurance_fee',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=10),
        ),
        migrations.AddField(
            model_name='order',
            name='discount_amount',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=10),
        ),
        migrations.AddField(
            model_name='order',
            name='voucher_code',
            field=models.CharField(blank=True, max_length=50, null=True),
        ),
        migrations.AddField(
            model_name='order',
            name='delivery_method',
            field=models.CharField(choices=[('e_ticket', 'E-Ticket'), ('paper', 'Paper Ticket')], default='e_ticket', max_length=20),
        ),
        migrations.AddField(
            model_name='order',
            name='has_insurance',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='order',
            name='payment_method',
            field=models.CharField(blank=True, default='momo', max_length=30),
        ),
        migrations.RunPython(seed_vouchers, migrations.RunPython.noop),
    ]
