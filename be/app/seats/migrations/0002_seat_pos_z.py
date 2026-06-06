from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('seats', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='seat',
            name='pos_z',
            field=models.FloatField(default=0.0),
        ),
    ]
