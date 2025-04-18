# Generated by Django 5.1.7 on 2025-04-02 11:44

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('maintenance', '0001_initial'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='maintenancerecord',
            name='description',
        ),
        migrations.RemoveField(
            model_name='maintenancerecord',
            name='equipment',
        ),
        migrations.RemoveField(
            model_name='maintenancerecord',
            name='next_maintenance_date',
        ),
        migrations.RemoveField(
            model_name='maintenancerecord',
            name='notes',
        ),
        migrations.RemoveField(
            model_name='maintenancerecord',
            name='parts_used',
        ),
        migrations.RemoveField(
            model_name='maintenancerecord',
            name='technician',
        ),
        migrations.AddField(
            model_name='maintenancerecord',
            name='actions_taken',
            field=models.TextField(blank=True, default='Routine maintenance performed', null=True),
        ),
        migrations.AddField(
            model_name='maintenancerecord',
            name='duration',
            field=models.FloatField(blank=True, default=1.0, null=True),
        ),
        migrations.AddField(
            model_name='maintenancerecord',
            name='issues_found',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='maintenancerecord',
            name='maintenance_item',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='records', to='maintenance.maintenanceitem'),
        ),
        migrations.AddField(
            model_name='maintenancerecord',
            name='parts_replaced',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='maintenancerecord',
            name='performed_by',
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
        migrations.AddField(
            model_name='maintenancerecord',
            name='recommendations',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='maintenanceitem',
            name='created_at',
            field=models.DateTimeField(auto_now_add=True),
        ),
        migrations.AlterField(
            model_name='maintenanceitem',
            name='equipment_name',
            field=models.CharField(max_length=100),
        ),
        migrations.AlterField(
            model_name='maintenanceitem',
            name='equipment_type',
            field=models.CharField(max_length=50),
        ),
        migrations.AlterField(
            model_name='maintenanceitem',
            name='frequency_unit',
            field=models.CharField(choices=[('days', 'Days'), ('weeks', 'Weeks'), ('months', 'Months'), ('hours', 'Hours')], default='months', max_length=10),
        ),
        migrations.AlterField(
            model_name='maintenanceitem',
            name='installation_date',
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='maintenanceitem',
            name='location',
            field=models.CharField(max_length=100),
        ),
        migrations.AlterField(
            model_name='maintenanceitem',
            name='maintenance_frequency',
            field=models.IntegerField(default=3),
        ),
        migrations.AlterField(
            model_name='maintenanceitem',
            name='model_number',
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
        migrations.AlterField(
            model_name='maintenanceitem',
            name='next_maintenance_date',
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='maintenanceitem',
            name='notes',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='maintenanceitem',
            name='serial_number',
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
        migrations.AlterField(
            model_name='maintenanceitem',
            name='status',
            field=models.CharField(choices=[('operational', 'Operational'), ('requires_maintenance', 'Requires Maintenance'), ('under_maintenance', 'Under Maintenance'), ('not_operational', 'Not Operational')], default='operational', max_length=20),
        ),
        migrations.AlterField(
            model_name='maintenancerecord',
            name='cost',
            field=models.DecimalField(blank=True, decimal_places=2, default=0, max_digits=10, null=True),
        ),
        migrations.AlterField(
            model_name='maintenancerecord',
            name='created_at',
            field=models.DateTimeField(auto_now_add=True),
        ),
        migrations.AlterField(
            model_name='maintenancerecord',
            name='maintenance_date',
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='maintenancerecord',
            name='maintenance_type',
            field=models.CharField(blank=True, choices=[('scheduled', 'Scheduled'), ('emergency', 'Emergency'), ('preventive', 'Preventive'), ('corrective', 'Corrective')], default='scheduled', max_length=20, null=True),
        ),
        migrations.AlterField(
            model_name='maintenancerecord',
            name='status',
            field=models.CharField(blank=True, choices=[('scheduled', 'Scheduled'), ('in_progress', 'In Progress'), ('completed', 'Completed')], default='scheduled', max_length=20, null=True),
        ),
    ]
