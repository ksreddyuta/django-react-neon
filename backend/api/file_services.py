import os
import csv
import json
from datetime import datetime, timedelta
from django.conf import settings
from django.utils import timezone
from .models import ExportedFile

def generate_export_filename(prefix, file_format='csv'):
    """Generate a unique filename for exports"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    return f"{prefix}_{timestamp}.{file_format}"

def save_data_to_file(data, filename, file_format='csv', directory=''):
    """Save data to a file on disk in the specified format"""
    # Create directory if it doesn't exist
    export_dir = os.path.join(settings.EXPORT_ROOT, directory)
    os.makedirs(export_dir, exist_ok=True)
    
    file_path = os.path.join(export_dir, filename)
    
    try:
        if file_format == 'csv':
            with open(file_path, 'w', newline='', encoding='utf-8') as csvfile:
                if data and len(data) > 0:
                    writer = csv.DictWriter(csvfile, fieldnames=data[0].keys())
                    writer.writeheader()
                    for item in data:
                        writer.writerow(item)
        elif file_format == 'json':
            with open(file_path, 'w', encoding='utf-8') as jsonfile:
                json.dump(data, jsonfile, indent=2, ensure_ascii=False, default=str)
        else:
            return None
        
        return file_path
    except Exception as e:
        print(f"Error saving {file_format} file: {e}")
        return None

def create_export_record(request, file_path, filename, file_type, device_id=None, pollutant=None):
    """Create a record of the exported file in the database"""
    # Set expiration time (e.g., 24 hours from now)
    expires_at = timezone.now() + timedelta(hours=24)
    
    exported_file = ExportedFile.objects.create(
        filename=filename,
        file_path=file_path,
        file_type=file_type,
        device_id=device_id,
        pollutant=pollutant,
        created_by=request.user,
        expires_at=expires_at
    )
    
    return exported_file

def get_export_download_url(exported_file):
    """Generate a download URL for an exported file"""
    # Remove the base directory from the path to get a relative path
    relative_path = exported_file.file_path.replace(settings.EXPORT_ROOT, '')
    return f"{settings.EXPORT_URL}{relative_path.lstrip('/')}"