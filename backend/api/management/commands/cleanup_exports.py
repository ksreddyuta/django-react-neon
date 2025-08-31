from django.core.management.base import BaseCommand
from django.utils import timezone
from api.models import ExportedFile
import os

class Command(BaseCommand):
    help = 'Clean up expired exported files'

    def handle(self, *args, **options):
        # Find expired files
        expired_files = ExportedFile.objects.filter(expires_at__lt=timezone.now())
        count = expired_files.count()
        
        # Delete files from disk and database
        for exported_file in expired_files:
            if os.path.exists(exported_file.file_path):
                os.remove(exported_file.file_path)
            exported_file.delete()
        
        self.stdout.write(
            self.style.SUCCESS(f'Successfully cleaned up {count} expired export files')
        )