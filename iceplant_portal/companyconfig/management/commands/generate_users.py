from django.core.management.base import BaseCommand
from django.contrib.auth.models import User

class Command(BaseCommand):
    help = 'Generate superuser and staff users'

    def add_arguments(self, parser):
        parser.add_argument('--reset', action='store_true', help='Delete all non-superuser users before generation')

    def handle(self, *args, **options):
        if options['reset']:
            self.stdout.write('Resetting users...')
            User.objects.filter(is_superuser=False).delete()

        # Create superuser if not exists
        if not User.objects.filter(username='admin_gensan').exists():
            User.objects.create_superuser('admin_gensan', 'admin@iceplantgensan.ph', 'adminpass')

        staff_users = [
            ('jose.delacruz', 'jose.delacruz@iceplantgensan.ph'),
            ('maria.santos', 'maria.santos@iceplantgensan.ph'),
            ('juan.reyes', 'juan.reyes@iceplantgensan.ph'),
            ('ana.bautista', 'ana.bautista@iceplantgensan.ph'),
            ('carlo.mendoza', 'carlo.mendoza@iceplantgensan.ph'),
        ]

        for username, email in staff_users:
            User.objects.get_or_create(
                username=username,
                defaults={
                    'email': email,
                    'is_staff': True,
                    'is_superuser': False
                }
            )

        self.stdout.write(self.style.SUCCESS('Users generated successfully.'))