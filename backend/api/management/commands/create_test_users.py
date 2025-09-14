from django.core.management.base import BaseCommand
from django.contrib.auth.hashers import make_password
from api.models import CustomUser

class Command(BaseCommand):
    help = 'Create test users for different roles'

    def handle(self, *args, **options):
        # Create normal user
        normal_user, created = CustomUser.objects.get_or_create(
            email='normaluser@example.com',
            defaults={
                'password': make_password('NormalPass123!'),
                'role': 'user'
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS('Normal user created successfully'))
        else:
            self.stdout.write(self.style.WARNING('Normal user already exists'))

        # Create admin user
        admin_user, created = CustomUser.objects.get_or_create(
            email='adminuser@example.com',
            defaults={
                'password': make_password('AdminPass123!'),
                'role': 'admin',
                'is_staff': True
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS('Admin user created successfully'))
        else:
            self.stdout.write(self.style.WARNING('Admin user already exists'))

        # Create superadmin user
        superadmin_user, created = CustomUser.objects.get_or_create(
            email='admin@example.com',
            defaults={
                'password': make_password('Admin@123'),
                'role': 'superadmin',
                'is_staff': True,
                'is_superuser': True
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS('Superadmin user created successfully'))
        else:
            self.stdout.write(self.style.WARNING('Superadmin user already exists'))