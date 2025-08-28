from django.core.management.base import BaseCommand
from api.models import DeviceGroup, DeviceGroupMember

class Command(BaseCommand):
    help = 'Populate initial device groups'

    def handle(self, *args, **options):
        # Create device groups
        groups_data = {
            "all_voc_devices": ["UTIS0001-VOC-V6_1"],
            "all_battery_devices": [
                "UTIS0001-battery-V6_1", "UTIS0002-battery-V6_1", "UTIS0003-battery-V6_1",
                "UTIS0004-battery-V6_1", "UTIS0005-battery-V6_1", "UTIS0006-battery-V6_1",
                "UTIS0007-battery-V6_1", "UTIS0008-battery-V6_1", "UTIS0009-battery-V6_1",
                "UTIS0010-battery-V6_1", "UTIS0011-battery-V6_1"
            ],
            "all_devices": [
                "UTIS0001-VOC-V6_1", "UTIS0001-battery-V6_1", "UTIS0002-battery-V6_1",
                "UTIS0003-battery-V6_1", "UTIS0004-battery-V6_1", "UTIS0005-battery-V6_1",
                "UTIS0006-battery-V6_1", "UTIS0007-battery-V6_1", "UTIS0008-battery-V6_1",
                "UTIS0009-battery-V6_1", "UTIS0010-battery-V6_1", "UTIS0011-battery-V6_1"
            ]
        }

        for group_name, devices in groups_data.items():
            group, created = DeviceGroup.objects.get_or_create(
                name=group_name,
                defaults={'description': f'{group_name} device group'}
            )
            
            if created:
                self.stdout.write(
                    self.style.SUCCESS(f'Created device group: {group_name}')
                )
            
            # Add devices to group
            for device in devices:
                member, created = DeviceGroupMember.objects.get_or_create(
                    group=group,
                    device_name=device
                )
                
                if created:
                    self.stdout.write(
                        self.style.SUCCESS(f'Added device {device} to group {group_name}')
                    )

        self.stdout.write(
            self.style.SUCCESS('Successfully populated device groups')
        )