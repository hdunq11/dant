from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('venues', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='venue',
            name='model_glb_path',
            field=models.CharField(
                blank=True,
                default='',
                help_text='Đường dẫn file GLB venue, vd: models/venue.glb',
                max_length=500,
            ),
        ),
    ]
