# Generated by Django 5.1.7 on 2025-03-30 09:24

from django.db import migrations, models

def update_active_to_processed(apps, schema_editor):
    Sale = apps.get_model('sales', 'Sale')
    Sale.objects.filter(status='active').update(status='processed')

class Migration(migrations.Migration):

    dependencies = [
        ('sales', '0004_sale_buyer'),
    ]

    operations = [
        migrations.AlterField(
            model_name='sale',
            name='status',
            field=models.CharField(choices=[('processed', 'Processed'), ('canceled', 'Canceled'), ('error', 'Error/Mistake')], default='processed', help_text='The current status of the sale record', max_length=10),
        ),
        migrations.RunPython(update_active_to_processed, reverse_code=migrations.RunPython.noop),
    ]
