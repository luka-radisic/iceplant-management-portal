import os
from django.core.management.base import BaseCommand, CommandError
from django.conf import settings
from django.apps import apps

class Command(BaseCommand):
    help = 'Finds and optionally deletes orphaned media files (files not referenced by any model).'

    def add_arguments(self, parser):
        parser.add_argument(
            '--delete',
            action='store_true',
            help='Actually delete the orphaned files found.',
        )
        parser.add_argument(
            '--confirm',
            action='store_true',
            help='Skip confirmation prompt when deleting files (use with caution!). Requires --delete.',
        )

    def handle(self, *args, **options):
        delete_files = options['delete']
        skip_confirmation = options['confirm']
        media_root = settings.MEDIA_ROOT

        if not media_root or not os.path.isdir(media_root):
            raise CommandError(f"MEDIA_ROOT ('{media_root}') is not configured or does not exist.")

        self.stdout.write(f"Scanning MEDIA_ROOT: {media_root}")

        # 1. Gather all file paths referenced in the database
        referenced_files = set()
        model_list = apps.get_models()
        models_with_files = 0

        for model in model_list:
            file_fields = [f for f in model._meta.get_fields()
                           if isinstance(f, (models.FileField, models.ImageField))]

            if not file_fields:
                continue

            models_with_files += 1
            self.stdout.write(f"  Checking model: {model._meta.label}...")
            queryset = model.objects.all()
            field_names = [f.name for f in file_fields]

            for instance in queryset.values(*field_names):
                for field_name in field_names:
                    file_path = instance.get(field_name)
                    if file_path:
                        # Store the path relative to MEDIA_ROOT
                        referenced_files.add(str(file_path))

        self.stdout.write(f"Found {len(referenced_files)} referenced files across {models_with_files} models.")

        # 2. Walk through the media directory and find all files
        disk_files = set()
        for root, _, files in os.walk(media_root):
            for filename in files:
                full_path = os.path.join(root, filename)
                # Get path relative to media_root
                relative_path = os.path.relpath(full_path, media_root)
                disk_files.add(relative_path)

        self.stdout.write(f"Found {len(disk_files)} files on disk in MEDIA_ROOT.")

        # 3. Find orphaned files (on disk but not referenced)
        orphaned_files = disk_files - referenced_files
        orphaned_count = len(orphaned_files)

        if orphaned_count == 0:
            self.stdout.write(self.style.SUCCESS("No orphaned files found."))
            return

        self.stdout.write(self.style.WARNING(f"Found {orphaned_count} orphaned files:"))
        for file_path in sorted(list(orphaned_files)):
            self.stdout.write(f"  - {file_path}")

        # 4. Optionally delete orphaned files
        if delete_files:
            if not skip_confirmation:
                confirm = input(f"Are you sure you want to delete these {orphaned_count} files? (yes/no): ")
                if confirm.lower() != 'yes':
                    self.stdout.write("Deletion cancelled.")
                    return

            deleted_count = 0
            error_count = 0
            self.stdout.write("Deleting orphaned files...")
            for file_path in sorted(list(orphaned_files)):
                full_path = os.path.join(media_root, file_path)
                try:
                    os.remove(full_path)
                    self.stdout.write(f"  Deleted: {file_path}")
                    deleted_count += 1
                except OSError as e:
                    self.stderr.write(self.style.ERROR(f"  Error deleting {file_path}: {e}"))
                    error_count += 1

            self.stdout.write(self.style.SUCCESS(f"Successfully deleted {deleted_count} orphaned files."))
            if error_count > 0:
                self.stdout.write(self.style.WARNING(f"Failed to delete {error_count} files."))
        else:
            self.stdout.write("Run with the --delete flag to remove these files.") 