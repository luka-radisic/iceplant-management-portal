# Generated by Django 5.1.7 on 2025-03-30 06:12

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('attendance', '0015_attendance_duration'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='attendance',
            name='duration',
        ),
    ]
