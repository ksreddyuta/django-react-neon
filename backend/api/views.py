import os
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.views import APIView
from django.db import IntegrityError, connection, models
from rest_framework.exceptions import ValidationError
from rest_framework.decorators import api_view, permission_classes
import logging
import csv
from django.http import FileResponse, HttpResponse
from datetime import datetime, timedelta
import time

from .serializers import (
    UserRegistrationSerializer, 
    UserSerializer, 
    UserUpdateSerializer,
    AirQualityDataResponseSerializer,
    BatteryDataResponseSerializer,
    WeatherDataResponseSerializer
)
from .models import AirQualityData, BatteryData, ExportedFile, WeatherData, DeviceGroup, DeviceGroupMember, CustomUser
from .permissions import IsAdminUser, IsSuperAdminUser, CanExportData
from .file_services import generate_export_filename, save_data_to_csv, create_export_record, get_export_download_url

logger = logging.getLogger(__name__)

class UserRegistrationView(generics.CreateAPIView):
    permission_classes = [AllowAny] 
    serializer_class = UserRegistrationSerializer
    
    def create(self, request, *args, **kwargs):
        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            self.perform_create(serializer)
            return Response(
                {"message": "User created successfully"},
                status=status.HTTP_201_CREATED
            )
        except ValidationError as e:
            return Response(
                {"error": str(e.detail)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except IntegrityError:
            return Response(
                {"error": "Email already exists"},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class CustomTokenObtainPairView(TokenObtainPairView):
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            response.data['message'] = "Login successful"
        return response

class ProtectedView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        return Response({
            "message": f"Hello {request.user.email}! This is a protected endpoint.",
            "user": {
                "email": request.user.email,
                "role": request.user.role
            }
        })

class HealthCheck(APIView):
    permission_classes = [AllowAny] 
    def get(self, request):
        return Response({"status": "ok", "service": "Django API"})

class UserListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated, IsSuperAdminUser]
    serializer_class = UserSerializer
    queryset = CustomUser.objects.all()

class UserDetailView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated, IsSuperAdminUser]
    serializer_class = UserUpdateSerializer
    queryset = CustomUser.objects.all()

    def update(self, request, *args, **kwargs):
        try:
            user = self.get_object()
            if 'role' in request.data and not request.user.is_superadmin():
                return Response(
                    {'error': 'Only superadmin can change user roles'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            serializer = self.get_serializer(user, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            
            return Response(UserSerializer(user).data)
        except Exception as e:
            logger.error(f"Error updating user: {str(e)}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

def parse_date_param(date_str, default=None):
    if not date_str:
        return default
    try:
        return datetime.strptime(date_str, '%Y-%m-%d')
    except ValueError:
        try:
            return datetime.strptime(date_str, '%Y-%m-%dT%H:%M:%S')
        except ValueError:
            return default

def get_latest_date(model, date_field):
    try:
        latest_date = model.objects.aggregate(
            max_date=models.Max(date_field)
        )['max_date']
        
        if latest_date:
            return latest_date
        return datetime.now()
    except Exception as e:
        logger.error(f"Error getting latest date from {model.__name__}: {str(e)}")
        return datetime.now()

# Replace the export_data function with this new version
def export_data(request, data, filename_prefix, file_type, device_id=None, pollutant=None):
    """Save data to a physical CSV file and return download information"""
    if not request.user.is_admin():
        logger.warning(f"Export denied for user {request.user.email} - admin required")
        return Response(
            {'error': 'Permission denied. Admin access required for export.'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    if not data:
        logger.warning(f"Export failed: No data to export for {filename_prefix}")
        return Response({'error': 'No data to export'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Generate filename and save data
        filename = generate_export_filename(filename_prefix)
        file_path = save_data_to_csv(data, filename, file_type)
        
        if not file_path:
            return Response({'error': 'Failed to create CSV file'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Create export record
        exported_file = create_export_record(
            request, file_path, filename, file_type, device_id, pollutant
        )
        
        # Return download information instead of the file content
        download_url = get_export_download_url(exported_file)
        
        logger.info(f"CSV export completed successfully for {filename_prefix}, file ID: {exported_file.id}")
        
        return Response({
            'message': 'Export completed successfully',
            'file_id': exported_file.id,
            'filename': filename,
            'download_url': download_url,
            'expires_at': exported_file.expires_at
        })
            
    except Exception as e:
        logger.error(f"Error generating CSV for {filename_prefix}: {str(e)}", exc_info=True)
        return Response(
            {'error': f'Failed to generate CSV: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def download_exported_file(request, file_id):
    """Serve an exported file for download"""
    try:
        exported_file = ExportedFile.objects.get(id=file_id, created_by=request.user)
        
        # Check if file exists and hasn't expired
        if exported_file.is_expired():
            return Response({'error': 'File has expired'}, status=status.HTTP_410_GONE)
        
        if not os.path.exists(exported_file.file_path):
            return Response({'error': 'File not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Serve the file for download
        response = FileResponse(open(exported_file.file_path, 'rb'))
        response['Content-Disposition'] = f'attachment; filename="{exported_file.filename}"'
        response['Content-Type'] = 'text/csv'
        
        return response
    except ExportedFile.DoesNotExist:
        return Response({'error': 'File not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['GET'])
@permission_classes([AllowAny])
def get_devices(request):
    try:
        # Get devices from both tables
        voc_devices = AirQualityData.objects.values_list('site_name', flat=True).distinct()
        battery_devices = BatteryData.objects.values_list('site_name', flat=True).distinct()
        
        # Combine and deduplicate
        all_devices = list(set(list(voc_devices) + list(battery_devices)))
        all_devices.sort()
        
        # Create unique device objects with type information
        device_objects = []
        for device in all_devices:
            # Determine device type based on name pattern
            if 'VOC' in device:
                device_type = 'air_quality'
                unique_id = f"aq_{device}"  # Prefix for air quality devices
            elif 'battery' in device:
                device_type = 'battery'
                unique_id = f"bat_{device}"  # Prefix for battery devices
            else:
                device_type = 'unknown'
                unique_id = f"unk_{device}"  # Prefix for unknown devices
                
            device_objects.append({
                'id': unique_id,           # Unique identifier for React keys
                'name': device,            # Original device name
                'type': device_type,       # Device type for frontend filtering
                'display_name': device.replace('-VOC-V6_1', '').replace('-battery-V6_1', '')  # Clean name for UI
            })
        
        return Response(device_objects)
    except Exception as e:
        logger.error(f"Error in get_devices: {str(e)}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def get_pollutants(request):
    pollutants = [
        {'id': 'VOC', 'name': 'Volatile Organic Compounds', 'unit': 'ppb'},
        {'id': 'O3', 'name': 'Ozone', 'unit': 'ppb'},
        {'id': 'SO2', 'name': 'Sulfur Dioxide', 'unit': 'ppb'},
        {'id': 'NO2', 'name': 'Nitrogen Dioxide', 'unit': 'ppb'},
    ]
    return Response(pollutants)

@api_view(['GET'])
@permission_classes([CanExportData])
def get_air_quality_data(request, device_id, pollutant):
    try:
        # Extract the actual device name from the ID
        if device_id.startswith('aq_'):
            device_name = device_id[3:]  # Remove the "aq_" prefix
        else:
            # Handle invalid device IDs
            return Response({'error': 'Invalid device ID for air quality data'}, 
                           status=status.HTTP_400_BAD_REQUEST)
        
        logger.info(f"Air quality data request - Device: {device_name}, Pollutant: {pollutant}")
        
        # Start timing the request
        start_time = time.time()
        
        days = request.GET.get('days')
        start_date_str = request.GET.get('start_date')
        end_date_str = request.GET.get('end_date')
        min_value = request.GET.get('min')
        max_value = request.GET.get('max')
        format_type = request.GET.get('format', 'json')
        
        latest_date = get_latest_date(AirQualityData, 'reported_time_utc')
        
        if days:
            end_date = latest_date
            start_date = end_date - timedelta(days=int(days))
        elif start_date_str and end_date_str:
            start_date = parse_date_param(start_date_str)
            end_date = parse_date_param(end_date_str)
        else:
            end_date = latest_date
            start_date = end_date - timedelta(days=30)
        
        if not start_date or not end_date:
            logger.warning(f"Invalid date format - start_date: {start_date_str}, end_date: {end_date_str}")
            return Response({'error': 'Invalid date format. Use YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS'}, 
                           status=status.HTTP_400_BAD_REQUEST)
        
        field_mapping = {
            'VOC': 'voc',
            'O3': 'o3', 
            'SO2': 'so2',
            'NO2': 'no2'
        }
        
        if pollutant not in field_mapping:
            logger.warning(f"Invalid pollutant requested: {pollutant}")
            return Response({'error': 'Invalid pollutant'}, status=status.HTTP_400_BAD_REQUEST)
        
        field_name = field_mapping[pollutant]
        
        # Use device_name in the query
        query = AirQualityData.objects.filter(
            site_name=device_name,
            reported_time_utc__range=(start_date, end_date)
        )
        
        if min_value:
            query = query.filter(**{f"{field_name}__gte": float(min_value)})
        if max_value:
            query = query.filter(**{f"{field_name}__lte": float(max_value)})
        
        # Time the database query
        query_start = time.time()
        data = query.values('reported_time_utc', field_name, 'site_name').order_by('reported_time_utc')
        query_time = time.time() - query_start
        
        formatted_data = [
            {
                'timestamp': item['reported_time_utc'],
                'value': float(item[field_name]) if item[field_name] is not None else None,
                'site_name': item['site_name'],
                'pollutant': pollutant,
                'device_id': device_id  # Include the device ID in the response
            }
            for item in data
        ]
        
        # Log performance
        total_time = time.time() - start_time
        logger.info(
            f"Air quality query - Device: {device_name}, Pollutant: {pollutant}, "
            f"Total time: {total_time:.3f}s, Query time: {query_time:.3f}s, "
            f"Records: {len(data)}"
        )
        
        if format_type == 'csv':
            logger.info(f"Processing CSV export for {device_name} {pollutant}")
            return export_data(
                request, 
                formatted_data, 
                f"air_quality_{device_name}_{pollutant}",
                'air_quality',
                device_id,
                pollutant
            )
        
        serializer = AirQualityDataResponseSerializer(formatted_data, many=True)
        return Response(serializer.data)
    except Exception as e:
        logger.error(f"Error in get_air_quality_data: {str(e)}", exc_info=True)
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
@api_view(['GET'])
@permission_classes([CanExportData])
def get_battery_data(request, device_id):
    try:
        # Extract the actual device name from the ID
        if device_id.startswith('bat_'):
            device_name = device_id[4:]  # Remove the "bat_" prefix
        else:
            return Response({'error': 'Invalid device ID for battery data'}, 
                           status=status.HTTP_400_BAD_REQUEST)
        
        logger.info(f"Battery data request - Device: {device_name}")
        
        # Start timing the request
        start_time = time.time()
        
        days = request.GET.get('days')
        start_date_str = request.GET.get('start_date')
        end_date_str = request.GET.get('end_date')
        min_value = request.GET.get('min')
        max_value = request.GET.get('max')
        format_type = request.GET.get('format', 'json')
        
        latest_date = get_latest_date(BatteryData, 'reported_time_utc')
        
        if days:
            end_date = latest_date
            start_date = end_date - timedelta(days=int(days))
        elif start_date_str and end_date_str:
            start_date = parse_date_param(start_date_str)
            end_date = parse_date_param(end_date_str)
        else:
            end_date = latest_date
            start_date = end_date - timedelta(days=30)
        
        if not start_date or not end_date:
            logger.warning(f"Invalid date format - start_date: {start_date_str}, end_date: {end_date_str}")
            return Response({'error': 'Invalid date format. Use YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS'}, 
                           status=status.HTTP_400_BAD_REQUEST)
        
        # Use device_name in the query
        query = BatteryData.objects.filter(
            site_name=device_name,
            reported_time_utc__range=(start_date, end_date)
        )
        
        if min_value:
            query = query.filter(corrected_battery_voltage__gte=float(min_value))
        if max_value:
            query = query.filter(corrected_battery_voltage__lte=float(max_value))
        
        # Time the database query
        query_start = time.time()
        data = query.values('reported_time_utc', 'corrected_battery_voltage', 'site_name').order_by('reported_time_utc')
        query_time = time.time() - query_start
        
        formatted_data = [
            {
                'timestamp': item['reported_time_utc'],
                'value': float(item['corrected_battery_voltage']) if item['corrected_battery_voltage'] is not None else None,
                'site_name': item['site_name'],
                'device_id': device_id  # Include the device ID in the response
            }
            for item in data
        ]
        
        # Log performance
        total_time = time.time() - start_time
        logger.info(
            f"Battery query - Device: {device_name}, "
            f"Total time: {total_time:.3f}s, Query time: {query_time:.3f}s, "
            f"Records: {len(data)}"
        )
        
        if format_type == 'csv':
            logger.info(f"Processing CSV export for {device_name}")
            return export_data(
                request, 
                formatted_data, 
                f"battery_{device_name}",
                'battery',
                device_id
            )
        
        serializer = BatteryDataResponseSerializer(formatted_data, many=True)
        return Response(serializer.data)
        
    except Exception as e:
        logger.error(f"Error in get_battery_data: {str(e)}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
@api_view(['GET'])
@permission_classes([CanExportData])
def get_weather_data(request):
    try:
        logger.info(f"Weather data request")
        
        # Start timing the request
        start_time = time.time()
        
        days = request.GET.get('days')
        start_date_str = request.GET.get('start_date')
        end_date_str = request.GET.get('end_date')
        min_temp = request.GET.get('min_temp')
        max_temp = request.GET.get('max_temp')
        min_humidity = request.GET.get('min_humidity')
        max_humidity = request.GET.get('max_humidity')
        format_type = request.GET.get('format', 'json')
        
        latest_date = get_latest_date(WeatherData, 'data_time_utc')
        
        if days:
            end_date = latest_date
            start_date = end_date - timedelta(days=int(days))
        elif start_date_str and end_date_str:
            start_date = parse_date_param(start_date_str)
            end_date = parse_date_param(end_date_str)
        else:
            end_date = latest_date
            start_date = end_date - timedelta(days=30)
        
        if not start_date or not end_date:
            logger.warning(f"Invalid date format - start_date: {start_date_str}, end_date: {end_date_str}")
            return Response({'error': 'Invalid date format. Use YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS'}, 
                           status=status.HTTP_400_BAD_REQUEST)
        
        query = WeatherData.objects.filter(data_time_utc__range=(start_date, end_date))
        
        if min_temp:
            query = query.filter(temperature__gte=float(min_temp))
        if max_temp:
            query = query.filter(temperature__lte=float(max_temp))
        if min_humidity:
            query = query.filter(humidity__gte=float(min_humidity))
        if max_humidity:
            query = query.filter(humidity__lte=float(max_humidity))
        
        # Time the database query
        query_start = time.time()
        data = query.values('data_time_utc', 'temperature', 'humidity', 'windspeed', 
                           'winddirection', 'pressure', 'solar_radiation').order_by('data_time_utc')
        query_time = time.time() - query_start
        
        formatted_data = [
            {
                'timestamp': item['data_time_utc'],
                'temperature': float(item['temperature']) if item['temperature'] is not None else None,
                'humidity': float(item['humidity']) if item['humidity'] is not None else None,
                'windspeed': float(item['windspeed']) if item['windspeed'] is not None else None,
                'winddirection': float(item['winddirection']) if item['winddirection'] is not None else None,
                'pressure': float(item['pressure']) if item['pressure'] is not None else None,
                'solar_radiation': float(item['solar_radiation']) if item['solar_radiation'] is not None else None
            }
            for item in data
        ]
        
        # Log performance
        total_time = time.time() - start_time
        logger.info(
            f"Weather query - Total time: {total_time:.3f}s, Query time: {query_time:.3f}s, "
            f"Records: {len(data)}"
        )
        
        if format_type == 'csv':
            logger.info("Processing CSV export for weather data")
            return export_data(
                request, 
                formatted_data, 
                "weather_data",
                'weather'
            )
        
        serializer = WeatherDataResponseSerializer(formatted_data, many=True)
        return Response(serializer.data)
    except Exception as e:
        logger.error(f"Error in get_weather_data: {str(e)}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def get_pollutant_stats(request, device):
    try:
        # Get statistics for a specific device
        stats = AirQualityData.objects.filter(site_name=device).aggregate(
            avg_voc=models.Avg('voc'),
            max_voc=models.Max('voc'),
            min_voc=models.Min('voc'),
            avg_o3=models.Avg('o3'),
            max_o3=models.Max('o3'),
            min_o3=models.Min('o3'),
            avg_so2=models.Avg('so2'),
            max_so2=models.Max('so2'),
            min_so2=models.Min('so2'),
            avg_no2=models.Avg('no2'),
            max_no2=models.Max('no2'),
            min_no2=models.Min('no2')
        )
        
        # Format the response
        formatted_stats = {
            'device': device,
            'VOC': {
                'average': float(stats['avg_voc']) if stats['avg_voc'] else None,
                'max': float(stats['max_voc']) if stats['max_voc'] else None,
                'min': float(stats['min_voc']) if stats['min_voc'] else None
            },
            'O3': {
                'average': float(stats['avg_o3']) if stats['avg_o3'] else None,
                'max': float(stats['max_o3']) if stats['max_o3'] else None,
                'min': float(stats['min_o3']) if stats['min_o3'] else None
            },
            'SO2': {
                'average': float(stats['avg_so2']) if stats['avg_so2'] else None,
                'max': float(stats['max_so2']) if stats['max_so2'] else None,
                'min': float(stats['min_so2']) if stats['min_so2'] else None
            },
            'NO2': {
                'average': float(stats['avg_no2']) if stats['avg_no2'] else None,
                'max': float(stats['max_no2']) if stats['max_no2'] else None,
                'min': float(stats['min_no2']) if stats['min_no2'] else None
            }
        }
        
        return Response(formatted_stats)
    except Exception as e:
        logger.error(f"Error in get_pollutant_stats: {str(e)}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def get_battery_stats(request, device):
    try:
        # Get statistics for a specific battery device
        stats = BatteryData.objects.filter(site_name=device).aggregate(
            avg_voltage=models.Avg('corrected_battery_voltage'),
            max_voltage=models.Max('corrected_battery_voltage'),
            min_voltage=models.Min('corrected_battery_voltage')
        )
        
        # Format the response
        formatted_stats = {
            'device': device,
            'voltage': {
                'average': float(stats['avg_voltage']) if stats['avg_voltage'] else None,
                'max': float(stats['max_voltage']) if stats['max_voltage'] else None,
                'min': float(stats['min_voltage']) if stats['min_voltage'] else None
            }
        }
        
        return Response(formatted_stats)
    except Exception as e:
        logger.error(f"Error in get_battery_stats: {str(e)}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_device_groups(request):
    try:
        groups = DeviceGroup.objects.all()
        result = []
        
        for group in groups:
            devices = group.members.values_list('device_name', flat=True)
            result.append({
                'id': group.id,
                'name': group.name,
                'description': group.description,
                'device_count': len(devices),
                'devices': list(devices),
                'created_at': group.created_at,
                'updated_at': group.updated_at
            })
        
        return Response(result)
    except Exception as e:
        logger.error(f"Error in get_device_groups: {str(e)}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def get_multi_device_data(request):
    try:
        devices = request.GET.getlist('devices')
        pollutant = request.GET.get('pollutant', 'VOC')
        days = request.GET.get('days', 7)
        
        if not devices:
            return Response({'error': 'No devices specified'}, status=status.HTTP_400_BAD_REQUEST)
        
        end_date = get_latest_date(AirQualityData, 'reported_time_utc')
        start_date = end_date - timedelta(days=int(days))
        
        field_mapping = {
            'VOC': 'voc',
            'O3': 'o3', 
            'SO2': 'so2',
            'NO2': 'no2'
        }
        
        if pollutant not in field_mapping:
            return Response({'error': 'Invalid pollutant'}, status=status.HTTP_400_BAD_REQUEST)
        
        field_name = field_mapping[pollutant]
        
        data = AirQualityData.objects.filter(
            site_name__in=devices,
            reported_time_utc__range=(start_date, end_date)
        ).values('reported_time_utc', field_name, 'site_name').order_by('reported_time_utc')
        
        # Group data by device
        result = {}
        for device in devices:
            result[device] = []
        
        for item in data:
            device_name = item['site_name']
            result[device_name].append({
                'timestamp': item['reported_time_utc'],
                'value': float(item[field_name]) if item[field_name] is not None else None
            })
        
        return Response(result)
    except Exception as e:
        logger.error(f"Error in get_multi_device_data: {str(e)}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def get_latest_dates(request):
    try:
        latest_air_quality = get_latest_date(AirQualityData, 'reported_time_utc')
        latest_battery = get_latest_date(BatteryData, 'reported_time_utc')
        latest_weather = get_latest_date(WeatherData, 'data_time_utc')
        
        return Response({
            'air_quality': latest_air_quality,
            'battery': latest_battery,
            'weather': latest_weather
        })
    except Exception as e:
        logger.error(f"Error in get_latest_dates: {str(e)}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdminUser])
def create_device_group(request):
    try:
        name = request.data.get('name')
        description = request.data.get('description', '')
        
        if not name:
            return Response({'error': 'Group name is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        group = DeviceGroup.objects.create(
            name=name,
            description=description
        )
        
        return Response({
            'id': group.id,
            'name': group.name,
            'description': group.description,
            'message': 'Device group created successfully'
        }, status=status.HTTP_201_CREATED)
    except IntegrityError:
        return Response({'error': 'Device group with this name already exists'}, 
                       status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logger.error(f"Error in create_device_group: {str(e)}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdminUser])
def add_device_to_group(request, group_id):
    try:
        device_name = request.data.get('device_name')
        
        if not device_name:
            return Response({'error': 'Device name is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        group = DeviceGroup.objects.get(id=group_id)
        
        # Check if device already exists in the group
        if DeviceGroupMember.objects.filter(group=group, device_name=device_name).exists():
            return Response({'error': 'Device already exists in this group'}, 
                           status=status.HTTP_400_BAD_REQUEST)
        
        DeviceGroupMember.objects.create(
            group=group,
            device_name=device_name
        )
        
        return Response({'message': 'Device added to group successfully'})
    except DeviceGroup.DoesNotExist:
        return Response({'error': 'Device group not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Error in add_device_to_group: {str(e)}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)