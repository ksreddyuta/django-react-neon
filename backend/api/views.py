from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.permissions import IsAuthenticated
from .serializers import UserRegistrationSerializer, AirQualityDataResponseSerializer, BatteryDataResponseSerializer, WeatherDataResponseSerializer
from rest_framework.views import APIView
from django.db import IntegrityError, connection, models
from rest_framework.exceptions import ValidationError
from .models import AirQualityData, BatteryData, WeatherData, DeviceGroup, DeviceGroupMember
from datetime import datetime, timedelta
from rest_framework.decorators import api_view, permission_classes
import logging
import csv
from django.http import HttpResponse
from io import StringIO
import json

logger = logging.getLogger(__name__)

class UserRegistrationView(generics.CreateAPIView):
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
            # Handle serializer validation errors
            return Response(
                {"error": str(e.detail)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except IntegrityError:
            # Handle duplicate email error
            return Response(
                {"error": "Email already exists"},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            # Handle other unexpected errors
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
            "message": f"Hello {request.user.email}! This is a protected endpoint."
        })

class HealthCheck(APIView):
    def get(self, request):
        return Response({"status": "ok", "service": "Django API"})

# Helper function for date parsing
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

# Helper function to get the latest date from a model
def get_latest_date(model, date_field):
    try:
        # Use aggregation to get the maximum date more efficiently
        latest_date = model.objects.aggregate(
            max_date=models.Max(date_field)
        )['max_date']
        
        if latest_date:
            return latest_date
        return datetime.now()
    except Exception as e:
        logger.error(f"Error getting latest date from {model.__name__}: {str(e)}")
        return datetime.now()

# Helper function for export with admin check
# Helper function for export with admin check
def export_data(request, data, format_type, filename_prefix):
    # Check if user is admin
    if not request.user.is_staff and not request.user.is_superuser:
        return Response(
            {'error': 'Permission denied. Admin access required for export.'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    if format_type == 'csv':
        if not data:
            return Response({'error': 'No data to export'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Create CSV response
            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = f'attachment; filename="{filename_prefix}_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv"'
            
            # Write CSV data
            writer = csv.writer(response)
            
            # Write headers
            if data and len(data) > 0:
                # Get all unique keys from all objects
                all_keys = set()
                for item in data:
                    all_keys.update(item.keys())
                writer.writerow(all_keys)
                
                # Write data rows
                for item in data:
                    row = []
                    for key in all_keys:
                        value = item.get(key, '')
                        # Convert datetime objects to string
                        if isinstance(value, datetime):
                            value = value.isoformat()
                        row.append(value)
                    writer.writerow(row)
            
            return response
            
        except Exception as e:
            logger.error(f"Error generating CSV: {str(e)}")
            return Response(
                {'error': f'Failed to generate CSV: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
    elif format_type == 'json':
        try:
            # Create JSON response
            response = HttpResponse(
                json.dumps(data, indent=2, default=str),
                content_type='application/json'
            )
            response['Content-Disposition'] = f'attachment; filename="{filename_prefix}_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json"'
            return response
            
        except Exception as e:
            logger.error(f"Error generating JSON: {str(e)}")
            return Response(
                {'error': f'Failed to generate JSON: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    return Response({'error': 'Invalid format'}, status=status.HTTP_400_BAD_REQUEST)
@api_view(['GET'])
def get_devices(request):
    """Get all unique devices from all tables"""
    try:
        # Get devices from VOC table
        voc_devices = AirQualityData.objects.values_list('site_name', flat=True).distinct()
        
        # Get devices from battery table
        battery_devices = BatteryData.objects.values_list('site_name', flat=True).distinct()
        
        # Combine and deduplicate
        all_devices = list(set(list(voc_devices) + list(battery_devices)))
        all_devices.sort()
        
        return Response(all_devices)
    except Exception as e:
        logger.error(f"Error in get_devices: {str(e)}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def get_pollutants(request):
    """Get available pollutants"""
    pollutants = [
        {'id': 'VOC', 'name': 'Volatile Organic Compounds', 'unit': 'ppb'},
        {'id': 'O3', 'name': 'Ozone', 'unit': 'ppb'},
        {'id': 'SO2', 'name': 'Sulfur Dioxide', 'unit': 'ppb'},
        {'id': 'NO2', 'name': 'Nitrogen Dioxide', 'unit': 'ppb'},
    ]
    return Response(pollutants)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_air_quality_data(request, device, pollutant):
    """Get air quality data for a specific device and pollutant with advanced filtering"""
    try:
        # Get filter parameters
        days = request.GET.get('days')
        start_date_str = request.GET.get('start_date')
        end_date_str = request.GET.get('end_date')
        min_value = request.GET.get('min')
        max_value = request.GET.get('max')
        format_type = request.GET.get('format', 'json')
        
        # Get the latest date from the table
        latest_date = get_latest_date(AirQualityData, 'reported_time_utc')
        
        # Parse date parameters
        if days:
            end_date = latest_date
            start_date = end_date - timedelta(days=int(days))
        elif start_date_str and end_date_str:
            start_date = parse_date_param(start_date_str)
            end_date = parse_date_param(end_date_str)
        else:
            # Default to 30 days from latest date if no date range specified
            end_date = latest_date
            start_date = end_date - timedelta(days=30)
        
        if not start_date or not end_date:
            return Response({'error': 'Invalid date format. Use YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS'}, 
                           status=status.HTTP_400_BAD_REQUEST)
        
        # Map pollutant parameter to actual field name
        field_mapping = {
            'VOC': 'voc',
            'O3': 'o3', 
            'SO2': 'so2',
            'NO2': 'no2'
        }
        
        if pollutant not in field_mapping:
            return Response({'error': 'Invalid pollutant'}, status=status.HTTP_400_BAD_REQUEST)
        
        field_name = field_mapping[pollutant]
        
        # Build query
        query = AirQualityData.objects.filter(
            site_name=device,
            reported_time_utc__range=(start_date, end_date)
        )
        
        # Apply value filters
        if min_value:
            query = query.filter(**{f"{field_name}__gte": float(min_value)})
        if max_value:
            query = query.filter(**{f"{field_name}__lte": float(max_value)})
        
        # Execute query
        data = query.values('reported_time_utc', field_name, 'site_name').order_by('reported_time_utc')
        
        # Format response
        formatted_data = [
            {
                'timestamp': item['reported_time_utc'],
                'value': float(item[field_name]) if item[field_name] is not None else None,
                'site_name': item['site_name'],
                'pollutant': pollutant
            }
            for item in data
        ]
        
        # Handle export requests
        if format_type in ['csv', 'json'] and format_type != 'json':
            return export_data(request, formatted_data, format_type, f"air_quality_{device}_{pollutant}")
        
        serializer = AirQualityDataResponseSerializer(formatted_data, many=True)
        return Response(serializer.data)
    except Exception as e:
        logger.error(f"Error in get_air_quality_data: {str(e)}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_battery_data(request, device):
    """Get battery data for a specific device with advanced filtering"""
    try:
        # Get filter parameters
        days = request.GET.get('days')
        start_date_str = request.GET.get('start_date')
        end_date_str = request.GET.get('end_date')
        min_value = request.GET.get('min')
        max_value = request.GET.get('max')
        format_type = request.GET.get('format', 'json')
        
        # Get the latest date from the table
        latest_date = get_latest_date(BatteryData, 'reported_time_utc')
        
        # Parse date parameters
        if days:
            end_date = latest_date
            start_date = end_date - timedelta(days=int(days))
        elif start_date_str and end_date_str:
            start_date = parse_date_param(start_date_str)
            end_date = parse_date_param(end_date_str)
        else:
            # Default to 30 days from latest date if no date range specified
            end_date = latest_date
            start_date = end_date - timedelta(days=30)
        
        if not start_date or not end_date:
            return Response({'error': 'Invalid date format. Use YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS'}, 
                           status=status.HTTP_400_BAD_REQUEST)
        
        # Build query
        query = BatteryData.objects.filter(
            site_name=device,
            reported_time_utc__range=(start_date, end_date)
        )
        
        # Apply value filters
        if min_value:
            query = query.filter(corrected_battery_voltage__gte=float(min_value))
        if max_value:
            query = query.filter(corrected_battery_voltage__lte=float(max_value))
        
        # Execute query
        data = query.values('reported_time_utc', 'corrected_battery_voltage', 'site_name').order_by('reported_time_utc')
        
        # Format response
        formatted_data = [
            {
                'timestamp': item['reported_time_utc'],
                'value': float(item['corrected_battery_voltage']) if item['corrected_battery_voltage'] is not None else None,
                'site_name': item['site_name']
            }
            for item in data
        ]
        
        # Handle export requests
        if format_type in ['csv', 'json'] and format_type != 'json':
            return export_data(request, formatted_data, format_type, f"battery_{device}")
        
        serializer = BatteryDataResponseSerializer(formatted_data, many=True)
        return Response(serializer.data)
    except Exception as e:
        logger.error(f"Error in get_battery_data: {str(e)}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_weather_data(request):
    """Get weather data with advanced filtering"""
    try:
        # Get filter parameters
        days = request.GET.get('days')
        start_date_str = request.GET.get('start_date')
        end_date_str = request.GET.get('end_date')
        min_temp = request.GET.get('min_temp')
        max_temp = request.GET.get('max_temp')
        min_humidity = request.GET.get('min_humidity')
        max_humidity = request.GET.get('max_humidity')
        format_type = request.GET.get('format', 'json')
        
        # Get the latest date from the table
        latest_date = get_latest_date(WeatherData, 'data_time_utc')
        
        # Parse date parameters
        if days:
            end_date = latest_date
            start_date = end_date - timedelta(days=int(days))
        elif start_date_str and end_date_str:
            start_date = parse_date_param(start_date_str)
            end_date = parse_date_param(end_date_str)
        else:
            # Default to 30 days from latest date if no date range specified
            end_date = latest_date
            start_date = end_date - timedelta(days=30)
        
        if not start_date or not end_date:
            return Response({'error': 'Invalid date format. Use YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS'}, 
                           status=status.HTTP_400_BAD_REQUEST)
        
        # Build query
        query = WeatherData.objects.filter(
            data_time_utc__range=(start_date, end_date)
        )
        
        # Apply value filters
        if min_temp:
            query = query.filter(temperature__gte=float(min_temp))
        if max_temp:
            query = query.filter(temperature__lte=float(max_temp))
        if min_humidity:
            query = query.filter(humidity__gte=float(min_humidity))
        if max_humidity:
            query = query.filter(humidity__lte=float(max_humidity))
        
        # Execute query
        data = query.values(
            'data_time_utc', 'temperature', 'humidity', 
            'windspeed', 'winddirection', 'pressure', 'solar_radiation'
        ).order_by('data_time_utc')
        
        # Format response
        formatted_data = [
            {
                'timestamp': item['data_time_utc'],
                'temperature': float(item['temperature']) if item['temperature'] is not None else None,
                'humidity': float(item['humidity']) if item['humidity'] is not None else None,
                'windspeed': float(item['windspeed']) if item['windspeed'] is not None else None,
                'winddirection': float(item['winddirection']) if item['winddirection'] is not None else None,
                'pressure': float(item['pressure']) if item['pressure'] is not None else None,
                'solar_radiation': float(item['solar_radiation']) if item['solar_radiation'] is not None else None,
            }
            for item in data
        ]
        
        # Handle export requests
        if format_type in ['csv', 'json'] and format_type != 'json':
            return export_data(request, formatted_data, format_type, "weather_data")
        
        serializer = WeatherDataResponseSerializer(formatted_data, many=True)
        return Response(serializer.data)
    except Exception as e:
        logger.error(f"Error in get_weather_data: {str(e)}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def get_pollutant_stats(request, device):
    """Get statistics for all pollutants for a device"""
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT 
                    MIN("VOC") as min_voc,
                    MAX("VOC") as max_voc,
                    AVG("VOC") as avg_voc,
                    MIN("O3") as min_o3,
                    MAX("O3") as max_o3,
                    AVG("O3") as avg_o3,
                    MIN("SO2") as min_so2,
                    MAX("SO2") as max_so2,
                    AVG("SO2") as avg_so2,
                    MIN("NO2") as min_no2,
                    MAX("NO2") as max_no2,
                    AVG("NO2") as avg_no2
                FROM "AirQualityData-VOC-V6_1" 
                WHERE "SiteName" = %s
            """, [device])
            
            row = cursor.fetchone()
            stats = {
                'VOC': {'min': float(row[0]) if row[0] is not None else None, 
                        'max': float(row[1]) if row[1] is not None else None, 
                        'avg': float(row[2]) if row[2] is not None else None},
                'O3': {'min': float(row[3]) if row[3] is not None else None, 
                       'max': float(row[4]) if row[4] is not None else None, 
                       'avg': float(row[5]) if row[5] is not None else None},
                'SO2': {'min': float(row[6]) if row[6] is not None else None, 
                        'max': float(row[7]) if row[7] is not None else None, 
                        'avg': float(row[8]) if row[8] is not None else None},
                'NO2': {'min': float(row[9]) if row[9] is not None else None, 
                        'max': float(row[10]) if row[10] is not None else None, 
                        'avg': float(row[11]) if row[11] is not None else None},
            }
            
            return Response(stats)
    except Exception as e:
        logger.error(f"Error in get_pollutant_stats: {str(e)}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def get_battery_stats(request, device):
    """Get statistics for battery voltage for a device"""
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT 
                    MIN("corrected_battery_voltage") as min_voltage,
                    MAX("corrected_battery_voltage") as max_voltage,
                    AVG("corrected_battery_voltage") as avg_voltage
                FROM "AirQualityData-battery-V6_1" 
                WHERE "SiteName" = %s
            """, [device])
            
            row = cursor.fetchone()
            stats = {
                'min': float(row[0]) if row[0] is not None else None,
                'max': float(row[1]) if row[1] is not None else None,
                'avg': float(row[2]) if row[2] is not None else None,
            }
            
            return Response(stats)
    except Exception as e:
        logger.error(f"Error in get_battery_stats: {str(e)}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# Device Group Views
@api_view(['GET'])
def get_device_groups(request):
    """Get device groups from database"""
    try:
        # Get all device groups
        groups = DeviceGroup.objects.all()
        device_groups = {}
        
        for group in groups:
            # Get all device names for this group
            device_names = list(DeviceGroupMember.objects.filter(
                group=group
            ).values_list('device_name', flat=True))
            
            device_groups[group.name] = device_names
        
        return Response(device_groups)
    except Exception as e:
        logger.error(f"Error in get_device_groups: {str(e)}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_device_group(request):
    """Create a new device group"""
    try:
        name = request.data.get('name')
        description = request.data.get('description', '')
        devices = request.data.get('devices', [])
        
        if not name:
            return Response({'error': 'Group name is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Create the group
        group, created = DeviceGroup.objects.get_or_create(
            name=name,
            defaults={'description': description}
        )
        
        if not created:
            return Response({'error': 'Group already exists'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Add devices to the group
        for device in devices:
            DeviceGroupMember.objects.get_or_create(
                group=group,
                device_name=device
            )
        
        return Response({'message': f'Device group {name} created successfully'}, status=status.HTTP_201_CREATED)
    
    except Exception as e:
        logger.error(f"Error in create_device_group: {str(e)}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_device_to_group(request, group_id):
    """Add a device to a group"""
    try:
        device_name = request.data.get('device_name')
        
        if not device_name:
            return Response({'error': 'Device name is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Get the group
        try:
            group = DeviceGroup.objects.get(id=group_id)
        except DeviceGroup.DoesNotExist:
            return Response({'error': 'Device group not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Add the device to the group
        member, created = DeviceGroupMember.objects.get_or_create(
            group=group,
            device_name=device_name
        )
        
        if created:
            return Response({'message': f'Device {device_name} added to group {group.name}'}, status=status.HTTP_201_CREATED)
        else:
            return Response({'message': f'Device {device_name} already in group {group.name}'}, status=status.HTTP_200_OK)
    
    except Exception as e:
        logger.error(f"Error in add_device_to_group: {str(e)}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# New endpoint for multi-device data
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_multi_device_data(request):
    """Get data for multiple devices"""
    try:
        devices = request.GET.get('devices', '').split(',')
        pollutant = request.GET.get('pollutant', 'VOC')
        days = request.GET.get('days', 30)
        format_type = request.GET.get('format', 'json')
        
        if not devices or not devices[0]:
            return Response({'error': 'No devices specified'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Get the latest date from the table
        latest_date = get_latest_date(AirQualityData, 'reported_time_utc')
        end_date = latest_date
        start_date = end_date - timedelta(days=int(days))
        
        # Map pollutant parameter to actual field name
        field_mapping = {
            'VOC': 'voc',
            'O3': 'o3', 
            'SO2': 'so2',
            'NO2': 'no2'
        }
        
        if pollutant not in field_mapping:
            return Response({'error': 'Invalid pollutant'}, status=status.HTTP_400_BAD_REQUEST)
        
        field_name = field_mapping[pollutant]
        
        # Query data for all devices
        all_data = []
        for device in devices:
            data = AirQualityData.objects.filter(
                site_name=device.strip(),
                reported_time_utc__range=(start_date, end_date)
            ).values('reported_time_utc', field_name, 'site_name').order_by('reported_time_utc')
            
            # Format response
            formatted_data = [
                {
                    'timestamp': item['reported_time_utc'],
                    'value': float(item[field_name]) if item[field_name] is not None else None,
                    'site_name': item['site_name'],
                    'pollutant': pollutant
                }
                for item in data
            ]
            
            all_data.extend(formatted_data)  # Fixed the typo here
        
        # Handle export requests
        if format_type in ['csv', 'json'] and format_type != 'json':
            return export_data(request, all_data, format_type, f"multi_device_{pollutant}")
        
        return Response(all_data)
    except Exception as e:
        logger.error(f"Error in get_multi_device_data: {str(e)}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
# New endpoint to get the latest date for each table
@api_view(['GET'])
def get_latest_dates(request):
    """Get the latest date available in each table"""
    try:
        latest_dates = {
            "air_quality": get_latest_date(AirQualityData, 'reported_time_utc'),
            "battery": get_latest_date(BatteryData, 'reported_time_utc'),
            "weather": get_latest_date(WeatherData, 'data_time_utc')
        }
        
        # Format dates for response
        formatted_dates = {}
        for key, value in latest_dates.items():
            if isinstance(value, datetime):
                formatted_dates[key] = value.isoformat()
            else:
                formatted_dates[key] = value
        
        return Response(formatted_dates)
    except Exception as e:
        logger.error(f"Error in get_latest_dates: {str(e)}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)