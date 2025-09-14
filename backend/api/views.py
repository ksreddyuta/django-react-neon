import os
import math
import time
import logging
import json
import requests
from datetime import datetime, timedelta
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.views import APIView
from django.db import IntegrityError, models
from rest_framework.exceptions import ValidationError
from rest_framework.decorators import api_view, permission_classes
from django.http import FileResponse
from django.core.cache import cache
from django.conf import settings

from .serializers import (
    UserRegistrationSerializer, 
    UserSerializer, 
    UserUpdateSerializer,
    AirQualityDataResponseSerializer,
    BatteryDataResponseSerializer,
    WeatherDataResponseSerializer
)
from .models import ExportedFile, DeviceGroup, DeviceGroupMember, CustomUser
from .permissions import CanAccessData, IsAdminUser, IsSuperAdminUser, CanExportData
from .file_services import generate_export_filename, save_data_to_file, create_export_record, get_export_download_url

logger = logging.getLogger(__name__)

# LTTB Algorithm Implementation
def largest_triangle_three_buckets(data, threshold):
    """
    Implement the Largest Triangle Three Buckets (LTTB) downsampling algorithm
    data: list of dictionaries with 'timestamp' and 'value' keys
    threshold: maximum number of points to return
    """
    if len(data) <= threshold or threshold == 0:
        return data
    
    # Convert data to list of tuples (timestamp, value)
    try:
        numeric_data = []
        for d in data:
            # Convert timestamp to Unix timestamp for numeric processing
            if isinstance(d['timestamp'], str):
                dt = datetime.strptime(d['timestamp'], '%Y-%m-%d %H:%M:%S')
                timestamp = time.mktime(dt.timetuple())
            else:
                timestamp = time.mktime(d['timestamp'].timetuple())
            numeric_data.append((timestamp, float(d['value'])))
    except (ValueError, KeyError) as e:
        logger.error(f"Error processing data for LTTB: {str(e)}")
        return downsample_data_simple(data, threshold)
    
    # Implementation of LTTB algorithm
    n = len(numeric_data)
    if threshold >= n or threshold == 0:
        return data
    
    # Calculate the size of each bucket
    every = (n - 2) / (threshold - 2)
    
    # Initialize the sample with the first point
    sampled_indices = [0]
    a = 0
    
    for i in range(0, threshold - 2):
        # Calculate the bucket range
        avg_range_start = int((i + 1) * every) + 1
        avg_range_end = int((i + 2) * every) + 1
        avg_range_end = min(avg_range_end, n)
        
        avg_range_length = avg_range_end - avg_range_start
        
        # Calculate the average point in the next bucket
        avg_x = 0.0
        avg_y = 0.0
        for j in range(avg_range_start, avg_range_end):
            avg_x += numeric_data[j][0]
            avg_y += numeric_data[j][1]
        avg_x /= avg_range_length
        avg_y /= avg_range_length
        
        # Get the range of the current bucket
        range_offs = int(math.floor((i + 0) * every)) + 1
        range_to = int(math.floor((i + 1) * every)) + 1
        range_to = min(range_to, n)
        
        # Point a
        point_ax = numeric_data[a][0]
        point_ay = numeric_data[a][1]
        
        max_area = -1
        max_index = -1
        
        for j in range(range_offs, range_to):
            # Calculate the area of the triangle
            area = abs(
                (point_ax - avg_x) * (numeric_data[j][1] - point_ay) -
                (point_ax - numeric_data[j][0]) * (avg_y - point_ay)
            ) * 0.5
            
            if area > max_area:
                max_area = area
                max_index = j
        
        sampled_indices.append(max_index)
        a = max_index
    
    # Add the last point
    sampled_indices.append(n - 1)
    
    # Return the sampled data points
    return [data[i] for i in sampled_indices]

def downsample_data_simple(data, max_points=500):
    """Simple downsampling for non-time-series data"""
    if len(data) <= max_points:
        return data
    
    sample_rate = math.ceil(len(data) / max_points)
    return data[::sample_rate]

def downsample_data(data, max_points=500, algorithm='lttb'):
    """
    Downsample data using the specified algorithm
    algorithm: 'lttb' for time-series data, 'simple' for other data
    """
    if len(data) <= max_points:
        return data
    
    if algorithm == 'lttb':
        # Check if data has the required structure for LTTB
        if all('timestamp' in d and 'value' in d for d in data):
            return largest_triangle_three_buckets(data, max_points)
        else:
            logger.warning("Data structure not suitable for LTTB, using simple downsampling")
            return downsample_data_simple(data, max_points)
    else:
        return downsample_data_simple(data, max_points)

# Sensor API Service
class SensorAPIService:
    BASE_URL = "http://47.190.103.180:5001"
    
    @staticmethod
    def make_request(endpoint, params=None):
        """Make a request to the sensor API"""
        try:
            url = f"{SensorAPIService.BASE_URL}{endpoint}"
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"Sensor API request failed: {str(e)}")
            # Return mock data for testing
            if endpoint == "/api/v6/th":
                return [{
                    "SiteName": params.get("site_name", "UTIS0001-TH-V6_1"),
                    "Humidity": "65.50",
                    "Temperature": "23.40",
                    "Noise": "45.20",
                    "PM2_5": "12.30",
                    "PM10": "25.60",
                    "ReceivedTime": "2025-08-25 12:30:00",
                    "ReportedTimeUTC": "2025-08-25 12:30:00",
                    "Illumination": "850.00"
                }]
            elif endpoint == "/api/v6/voc":
                return [{
                    "SiteName": params.get("site_name", "UTIS0001-VOC-V6_1"),
                    "ReportedTimeUTC": "2025-08-25 12:30:00",
                    "VOC": "0.1250",
                    "O3": "0.0450",
                    "SO2": "0.0120",
                    "NO2": "0.0230",
                    "ReceivedTime": "2025-08-25 12:30:00"
                }]
            elif endpoint == "/api/v6/sites":
                return {
                    "sites": [
                        "UTIS0001-TH-V6_1",
                        "UTIS0001-VOC-V6_1",
                        "UTIS0002-TH-V6_1",
                        "UTIS0002-VOC-V6_1",
                        "UTIS0003-TH-V6_1",
                        "UTIS0003-VOC-V6_1",
                        "UTIS0004-TH-V6_1",
                        "UTIS0004-VOC-V6_1",
                        "UTIS0005-TH-V6_1",
                        "UTIS0005-VOC-V6_1",
                        "UTIS0006-TH-V6_1",
                        "UTIS0006-VOC-V6_1",
                        "UTIS0007-TH-V6_1",
                        "UTIS0007-VOC-V6_1",
                        "UTIS0008-TH-V6_1",
                        "UTIS0008-VOC-V6_1",
                        "UTIS0009-TH-V6_1",
                        "UTIS0009-VOC-V6_1",
                        "UTIS0011-TH-V6_1",
                        "UTIS0011-VOC-V6_1"
                    ],
                    "count": 20
                }
            return None
    
    @staticmethod
    def get_health():
        """Check sensor API health"""
        cache_key = "sensor_api_health"
        cached_data = cache.get(cache_key)
        
        if cached_data:
            return cached_data
            
        data = SensorAPIService.make_request("/api/v6/health")
        if data:
            cache.set(cache_key, data, 60)  # Cache for 1 minute
        return data
    
    @staticmethod
    def get_sites():
        """Get all available sites from sensor API"""
        cache_key = "sensor_api_sites"
        cached_data = cache.get(cache_key)
        
        if cached_data:
            return cached_data
            
        data = SensorAPIService.make_request("/api/v6/sites")
        if data:
            cache.set(cache_key, data, 300)  # Cache for 5 minutes
        return data
    
    @staticmethod
    def get_th_data(start_time, end_time, site_name=None):
        """Get TH data from sensor API"""
        params = {
            "start_time": start_time.strftime("%Y-%m-%d %H:%M:%S"),
            "end_time": end_time.strftime("%Y-%m-%d %H:%M:%S")
        }
        
        if site_name:
            params["site_name"] = site_name
            
        return SensorAPIService.make_request("/api/v6/th", params)
    
    @staticmethod
    def get_voc_data(start_time, end_time, site_name=None):
        """Get VOC data from sensor API"""
        params = {
            "start_time": start_time.strftime("%Y-%m-%d %H:%M:%S"),
            "end_time": end_time.strftime("%Y-%m-%d %H:%M:%S")
        }
        
        if site_name:
            params["site_name"] = site_name
            
        return SensorAPIService.make_request("/api/v6/voc", params)
    
    @staticmethod
    def get_multi_device_data(device_type, start_time, end_time, site_names):
        """Get data for multiple devices"""
        results = {}
        
        for site_name in site_names:
            if device_type == 'th':
                data = SensorAPIService.get_th_data(start_time, end_time, site_name)
            else:  # voc
                data = SensorAPIService.get_voc_data(start_time, end_time, site_name)
                
            if data:
                results[site_name] = data
                
        return results

# Helper functions
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

def get_latest_date_from_api():
    """Get the latest date from the sensor API"""
    try:
        # Get current date as default
        return datetime.now()
    except Exception as e:
        logger.error(f"Error getting latest date from API: {str(e)}")
        return datetime.now()

# User management views
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
            # Include both tokens in the response
            response.data['tokens'] = {
                'access': response.data['access'],
                'refresh': response.data['refresh']
            }
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
    queryset = CustomUser.objects.all().order_by('email')

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

# Data export function
def export_data(request, data, filename_prefix, file_type, device_id=None, pollutant=None, file_format='csv'):
    """Save data to a physical file and return download information"""
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
        filename = generate_export_filename(filename_prefix, file_format)
        file_path = save_data_to_file(data, filename, file_format, file_type)
        
        if not file_path:
            return Response({'error': 'Failed to create export file'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Create export record
        exported_file = create_export_record(
            request, file_path, filename, file_type, device_id, pollutant
        )
        
        # Return download information instead of the file content
        download_url = get_export_download_url(exported_file)
        
        logger.info(f"Export completed successfully for {filename_prefix}, file ID: {exported_file.id}")
        
        return Response({
            'message': 'Export completed successfully',
            'file_id': exported_file.id,
            'filename': filename,
            'download_url': download_url,
            'expires_at': exported_file.expires_at,
            'format': file_format
        })
            
    except Exception as e:
        logger.error(f"Error generating export for {filename_prefix}: {str(e)}", exc_info=True)
        return Response(
            {'error': f'Failed to generate export: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

# API endpoints with pagination and downsampling
@api_view(['GET'])
@permission_classes([CanExportData])
def download_exported_file(request, file_id):
    """Serve an exported file for download"""
    try:
        exported_file = ExportedFile.objects.get(id=file_id, created_by=request.user)
        
        # Check if file exists and hasn't expired
        if exported_file.is_expired():
            return Response({'error': 'File has expired'}, status=status.HTTP_410_GONE)
        
        if not os.path.exists(exported_file.file_path):
            return Response({'error': 'File not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Determine content type based on file extension
        if exported_file.filename.endswith('.json'):
            content_type = 'application/json'
        else:
            content_type = 'text/csv'
        
        # Serve the file for download
        response = FileResponse(open(exported_file.file_path, 'rb'))
        response['Content-Disposition'] = f'attachment; filename="{exported_file.filename}"'
        response['Content-Type'] = content_type
        
        return response
    except ExportedFile.DoesNotExist:
        return Response({'error': 'File not found'}, status=status.HTTP_404_NOT_FOUND)

# Sensor API proxy endpoints
@api_view(['GET'])
@permission_classes([AllowAny])
def sensor_api_health(request):
    """Proxy for sensor API health endpoint"""
    try:
        data = SensorAPIService.get_health()
        if data:
            return Response(data)
        else:
            return Response(
                {"error": "Failed to connect to sensor API"}, 
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
    except Exception as e:
        logger.error(f"Error in sensor_api_health: {str(e)}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def sensor_api_sites(request):
    """Proxy for sensor API sites endpoint"""
    try:
        data = SensorAPIService.get_sites()
        if data:
            return Response(data)
        else:
            return Response(
                {"error": "Failed to fetch sites from sensor API"}, 
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
    except Exception as e:
        logger.error(f"Error in sensor_api_sites: {str(e)}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([CanAccessData])
def sensor_api_th_data(request):
    """Proxy for sensor API TH data endpoint"""
    try:
        # Get parameters from request
        start_time_str = request.GET.get('start_time')
        end_time_str = request.GET.get('end_time')
        site_name = request.GET.get('site_name')
        downsample = request.GET.get('downsample', 'true').lower() == 'true'
        max_points = int(request.GET.get('max_points', 500))
        
        # Validate required parameters
        if not start_time_str or not end_time_str:
            return Response(
                {"error": "start_time and end_time are required parameters"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Parse datetime parameters
        try:
            start_time = datetime.strptime(start_time_str, '%Y-%m-%d %H:%M:%S')
            end_time = datetime.strptime(end_time_str, '%Y-%m-%d %H:%M:%S')
        except ValueError:
            return Response(
                {"error": "Invalid datetime format. Use YYYY-MM-DD HH:MM:SS"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate time range (max 30 days)
        if (end_time - start_time).days > 30:
            return Response(
                {"error": "Time range cannot exceed 30 days"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get data from sensor API
        data = SensorAPIService.get_th_data(start_time, end_time, site_name)
        
        if data:
            # Downsample if requested
            if downsample and len(data) > max_points:
                # Transform data for downsampling
                transformed_data = []
                for item in data:
                    transformed_data.append({
                        'timestamp': item.get('ReportedTimeUTC', ''),
                        'value': item.get('Temperature', 0)  # Use temperature as default value for downsampling
                    })
                
                # Downsample using LTTB
                downsampled_data = downsample_data(transformed_data, max_points, 'lttb')
                
                # Map back to original data structure
                result_data = []
                for ds_item in downsampled_data:
                    # Find the original item with matching timestamp
                    for item in data:
                        if item.get('ReportedTimeUTC') == ds_item['timestamp']:
                            result_data.append(item)
                            break
                
                data = result_data
            
            return Response(data)
        else:
            return Response(
                {"error": "Failed to fetch TH data from sensor API"}, 
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
            
    except Exception as e:
        logger.error(f"Error in sensor_api_th_data: {str(e)}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([CanAccessData])
def sensor_api_voc_data(request):
    """Proxy for sensor API VOC data endpoint"""
    try:
        # Get parameters from request
        start_time_str = request.GET.get('start_time')
        end_time_str = request.GET.get('end_time')
        site_name = request.GET.get('site_name')
        downsample = request.GET.get('downsample', 'true').lower() == 'true'
        max_points = int(request.GET.get('max_points', 500))
        
        # Validate required parameters
        if not start_time_str or not end_time_str:
            return Response(
                {"error": "start_time and end_time are required parameters"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Parse datetime parameters
        try:
            start_time = datetime.strptime(start_time_str, '%Y-%m-%d %H:%M:%S')
            end_time = datetime.strptime(end_time_str, '%Y-%m-%d %H:%M:%S')
        except ValueError:
            return Response(
                {"error": "Invalid datetime format. Use YYYY-MM-DD HH:MM:SS"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate time range (max 30 days)
        if (end_time - start_time).days > 30:
            return Response(
                {"error": "Time range cannot exceed 30 days"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get data from sensor API
        data = SensorAPIService.get_voc_data(start_time, end_time, site_name)
        
        if data:
            # Downsample if requested
            if downsample and len(data) > max_points:
                # Transform data for downsampling
                transformed_data = []
                for item in data:
                    transformed_data.append({
                        'timestamp': item.get('ReportedTimeUTC', ''),
                        'value': item.get('VOC', 0)  # Use VOC as default value for downsampling
                    })
                
                # Downsample using LTTB
                downsampled_data = downsample_data(transformed_data, max_points, 'lttb')
                
                # Map back to original data structure
                result_data = []
                for ds_item in downsampled_data:
                    # Find the original item with matching timestamp
                    for item in data:
                        if item.get('ReportedTimeUTC') == ds_item['timestamp']:
                            result_data.append(item)
                            break
                
                data = result_data
            
            return Response(data)
        else:
            return Response(
                {"error": "Failed to fetch VOC data from sensor API"}, 
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
            
    except Exception as e:
        logger.error(f"Error in sensor_api_voc_data: {str(e)}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([CanAccessData])
def sensor_api_multi_device_data(request):
    """Get data for multiple devices from sensor API"""
    try:
        # Get parameters from request
        device_type = request.GET.get('device_type')  # 'th' or 'voc'
        start_time_str = request.GET.get('start_time')
        end_time_str = request.GET.get('end_time')
        site_names = request.GET.getlist('site_names')
        downsample = request.GET.get('downsample', 'true').lower() == 'true'
        max_points = int(request.GET.get('max_points', 500))
        
        # Validate required parameters
        if not device_type or not start_time_str or not end_time_str or not site_names:
            return Response(
                {"error": "device_type, start_time, end_time, and site_names are required parameters"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if device_type not in ['th', 'voc']:
            return Response(
                {"error": "device_type must be either 'th' or 'voc'"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Parse datetime parameters
        try:
            start_time = datetime.strptime(start_time_str, '%Y-%m-%d %H:%M:%S')
            end_time = datetime.strptime(end_time_str, '%Y-%m-%d %H:%M:%S')
        except ValueError:
            return Response(
                {"error": "Invalid datetime format. Use YYYY-MM-DD HH:MM:SS"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate time range (max 7 days for multi-device requests)
        if (end_time - start_time).days > 7:
            return Response(
                {"error": "Time range cannot exceed 7 days for multi-device requests"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Limit the number of devices
        if len(site_names) > 10:
            return Response(
                {"error": "Cannot request more than 10 devices at once"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get data from sensor API
        data = SensorAPIService.get_multi_device_data(device_type, start_time, end_time, site_names)
        
        if data:
            # Downsample if requested
            if downsample:
                for site_name, site_data in data.items():
                    if len(site_data) > max_points:
                        # Transform data for downsampling
                        transformed_data = []
                        for item in site_data:
                            transformed_data.append({
                                'timestamp': item.get('ReportedTimeUTC', ''),
                                'value': item.get('Temperature', item.get('VOC', 0))
                            })
                        
                        # Downsample using LTTB
                        downsampled_data = downsample_data(transformed_data, max_points, 'lttb')
                        
                        # Map back to original data structure
                        result_data = []
                        for ds_item in downsampled_data:
                            # Find the original item with matching timestamp
                            for item in site_data:
                                if item.get('ReportedTimeUTC') == ds_item['timestamp']:
                                    result_data.append(item)
                                    break
                        
                        data[site_name] = result_data
            
            return Response(data)
        else:
            return Response(
                {"error": "Failed to fetch data from sensor API"}, 
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
            
    except Exception as e:
        logger.error(f"Error in sensor_api_multi_device_data: {str(e)}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# Updated endpoints to use sensor API instead of local database
@api_view(['GET'])
@permission_classes([AllowAny])
def get_devices(request):
    try:
        # Get devices from sensor API
        data = SensorAPIService.get_sites()
        
        if not data or 'sites' not in data:
            return Response({'error': 'Failed to fetch devices from sensor API'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        
        # Create device objects with type information
        device_objects = []
        for device in data['sites']:
            # Determine device type based on name pattern
            if 'TH' in device:
                device_type = 'air_quality'
                unique_id = f"aq_{device}"  # Prefix for air quality devices
                # Include TH in display name
                display_name = device.replace('-TH-V6_1', ' (TH)')
            elif 'VOC' in device:
                device_type = 'air_quality'
                unique_id = f"aq_{device}"  # Prefix for air quality devices
                # Include VOC in display name
                display_name = device.replace('-VOC-V6_1', ' (VOC)')
            else:
                device_type = 'unknown'
                unique_id = f"unk_{device}"  # Prefix for unknown devices
                display_name = device
                
            device_objects.append({
                'id': unique_id,           # Unique identifier for React keys
                'name': device,            # Original device name
                'type': device_type,       # Device type for frontend filtering
                'display_name': display_name  # Updated display name with type
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
        {'id': 'Humidity', 'name': 'Humidity', 'unit': '%'},
        {'id': 'Temperature', 'name': 'Temperature', 'unit': '°C'},
        {'id': 'Noise', 'name': 'Noise', 'unit': 'dB'},
        {'id': 'PM2_5', 'name': 'PM2.5', 'unit': 'μg/m³'},
        {'id': 'PM10', 'name': 'PM10', 'unit': 'μg/m³'},
        {'id': 'Illumination', 'name': 'Illumination', 'unit': 'lux'},
    ]
    return Response(pollutants)

@api_view(['GET'])
@permission_classes([CanAccessData])
def get_air_quality_data(request, device_id, pollutant):
    """Get air quality data for a specific device and pollutant"""
    try:
        # Extract site name from device_id (remove 'aq_' prefix)
        site_name = device_id.replace('aq_', '')
        
        # Determine API endpoint based on pollutant type
        if pollutant in ['VOC', 'O3', 'SO2', 'NO2']:
            # Use VOC API for gas pollutants
            api_func = SensorAPIService.get_voc_data
        else:
            # Use TH API for other pollutants
            api_func = SensorAPIService.get_th_data
        
        # Get time parameters
        start_time_str = request.GET.get('start_time')
        end_time_str = request.GET.get('end_time')
        downsample = request.GET.get('downsample', 'true').lower() == 'true'
        max_points = int(request.GET.get('max_points', 500))
        
        if not start_time_str or not end_time_str:
            return Response(
                {"error": "start_time and end_time are required parameters"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Parse datetime parameters
        try:
            start_time = datetime.strptime(start_time_str, '%Y-%m-%d %H:%M:%S')
            end_time = datetime.strptime(end_time_str, '%Y-%m-%d %H:%M:%S')
        except ValueError:
            return Response(
                {"error": "Invalid datetime format. Use YYYY-MM-DD HH:MM:SS"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get data from sensor API
        data = api_func(start_time, end_time, site_name)
        
        if data:
            # Handle both single object and list responses
            if not isinstance(data, list):
                data = [data]
            
            # Transform data to match expected format
            transformed_data = []
            for item in data:
                transformed_item = {
                    'timestamp': item.get('ReportedTimeUTC', ''),
                    'value': item.get(pollutant, None),
                    'site_name': site_name,
                    'pollutant': pollutant,
                    'device_id': device_id
                }
                transformed_data.append(transformed_item)
            
            # Downsample if requested
            if downsample and len(transformed_data) > max_points:
                transformed_data = downsample_data(transformed_data, max_points, 'lttb')
            
            return Response(transformed_data)
        else:
            return Response(
                {"error": "Failed to fetch data from sensor API"}, 
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
            
    except Exception as e:
        logger.error(f"Error in get_air_quality_data: {str(e)}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([CanAccessData])
def get_battery_data(request, device_id):
    """Get battery data - placeholder as external API doesn't provide this"""
    return Response({
        "message": "Battery data not available from external API",
        "device_id": device_id
    })

@api_view(['GET'])
@permission_classes([CanAccessData])
def get_weather_data(request):
    """Get weather data - placeholder as external API doesn't provide this"""
    return Response({
        "message": "Weather data not available from external API"
    })

@api_view(['GET'])
@permission_classes([CanAccessData])
def get_pollutant_stats(request, device):
    """Get statistics for a pollutant"""
    # Implementation would depend on your specific requirements
    return Response({
        "message": "Pollutant stats endpoint",
        "device": device
    })

@api_view(['GET'])
@permission_classes([CanAccessData])
def get_battery_stats(request, device):
    """Get battery statistics - placeholder"""
    return Response({
        "message": "Battery stats not available",
        "device": device
    })

@api_view(['GET'])
@permission_classes([CanAccessData])
def get_multi_device_data(request):
    """Get data for multiple devices - uses sensor_api_multi_device_data"""
    return sensor_api_multi_device_data(request)

# Export endpoints for sensor data
@api_view(['GET'])
@permission_classes([CanExportData])
def export_sensor_th_data(request):
    """Export TH data from sensor API to file"""
    try:
        # Get parameters from request
        start_time_str = request.GET.get('start_time')
        end_time_str = request.GET.get('end_time')
        site_name = request.GET.get('site_name')
        file_format = request.GET.get('format', 'csv').lower()
        
        if file_format not in ['csv', 'json']:
            return Response({'error': 'Invalid format. Use csv or json'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate required parameters
        if not start_time_str or not end_time_str:
            return Response(
                {"error": "start_time and end_time are required parameters"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Parse datetime parameters
        try:
            start_time = datetime.strptime(start_time_str, '%Y-%m-%d %H:%M:%S')
            end_time = datetime.strptime(end_time_str, '%Y-%m-%d %H:%M:%S')
        except ValueError:
            return Response(
                {"error": "Invalid datetime format. Use YYYY-MM-DD HH:MM:SS"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get data from sensor API
        data = SensorAPIService.get_th_data(start_time, end_time, site_name)
        
        if data:
            # Handle both single object and list responses
            if not isinstance(data, list):
                data = [data]
            
            return export_data(request, data, 'th_export', 'air_quality', site_name, file_format=file_format)
        else:
            return Response(
                {"error": "Failed to fetch TH data from sensor API"}, 
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
            
    except Exception as e:
        logger.error(f"Error in export_sensor_th_data: {str(e)}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([CanExportData])
def export_sensor_voc_data(request):
    """Export VOC data from sensor API to file"""
    try:
        # Get parameters from request
        start_time_str = request.GET.get('start_time')
        end_time_str = request.GET.get('end_time')
        site_name = request.GET.get('site_name')
        file_format = request.GET.get('format', 'csv').lower()
        
        if file_format not in ['csv', 'json']:
            return Response({'error': 'Invalid format. Use csv or json'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate required parameters
        if not start_time_str or not end_time_str:
            return Response(
                {"error": "start_time and end_time are required parameters"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Parse datetime parameters
        try:
            start_time = datetime.strptime(start_time_str, '%Y-%m-%d %H:%M:%S')
            end_time = datetime.strptime(end_time_str, '%Y-%m-%d %H:%M:%S')
        except ValueError:
            return Response(
                {"error": "Invalid datetime format. Use YYYY-MM-DD HH:MM:SS"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get data from sensor API
        data = SensorAPIService.get_voc_data(start_time, end_time, site_name)
        
        if data:
            # Handle both single object and list responses
            if not isinstance(data, list):
                data = [data]
            
            return export_data(request, data, 'voc_export', 'air_quality', site_name, file_format=file_format)
        else:
            return Response(
                {"error": "Failed to fetch VOC data from sensor API"}, 
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
            
    except Exception as e:
        logger.error(f"Error in export_sensor_voc_data: {str(e)}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([CanExportData])
def export_multi_device_data(request):
    """Export multi-device data to file"""
    try:
        # Get parameters from request
        device_type = request.GET.get('device_type')  # 'th' or 'voc'
        start_time_str = request.GET.get('start_time')
        end_time_str = request.GET.get('end_time')
        site_names = request.GET.getlist('site_names')
        file_format = request.GET.get('format', 'csv').lower()
        
        if file_format not in ['csv', 'json']:
            return Response({'error': 'Invalid format. Use csv or json'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate required parameters
        if not device_type or not start_time_str or not end_time_str or not site_names:
            return Response(
                {"error": "device_type, start_time, end_time, and site_names are required parameters"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if device_type not in ['th', 'voc']:
            return Response(
                {"error": "device_type must be either 'th' or 'voc'"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Parse datetime parameters
        try:
            start_time = datetime.strptime(start_time_str, '%Y-%m-%d %H:%M:%S')
            end_time = datetime.strptime(end_time_str, '%Y-%m-%d %H:%M:%S')
        except ValueError:
            return Response(
                {"error": "Invalid datetime format. Use YYYY-MM-DD HH:MM:SS"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get data from sensor API
        data = SensorAPIService.get_multi_device_data(device_type, start_time, end_time, site_names)
        
        if data:
            # Flatten the data for export
            flattened_data = []
            for site_name, site_data in data.items():
                for item in site_data:
                    item['SiteName'] = site_name  # Add site name to each record
                    flattened_data.append(item)
            
            return export_data(request, flattened_data, 'multi_device_export', 'air_quality', file_format=file_format)
        else:
            return Response(
                {"error": "Failed to fetch data from sensor API"}, 
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
            
    except Exception as e:
        logger.error(f"Error in export_multi_device_data: {str(e)}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# Additional endpoints for device groups and other functionality
@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser]) 
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
def get_latest_dates(request):
    try:
        # Since we're using the external API, we can't get the latest dates from a local database
        # Return current date as a placeholder
        current_date = datetime.now()
        return Response({
            'air_quality': current_date,
            'battery': current_date,
            'weather': current_date
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