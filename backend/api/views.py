from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.permissions import IsAuthenticated
from .serializers import UserRegistrationSerializer, AirQualityDataResponseSerializer, BatteryDataResponseSerializer, WeatherDataResponseSerializer
from rest_framework.views import APIView
from django.db import IntegrityError, connection
from rest_framework.exceptions import ValidationError
from .models import AirQualityData, BatteryData, WeatherData
from datetime import datetime, timedelta
from rest_framework.decorators import api_view

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

# Air Quality Data Views
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
def get_air_quality_data(request, device, pollutant):
    """Get air quality data for a specific device and pollutant"""
    try:
        # Get days parameter or default to 30
        days = int(request.GET.get('days', 30))
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        # Validate pollutant
        valid_pollutants = ['VOC', 'O3', 'SO2', 'NO2']
        if pollutant not in valid_pollutants:
            return Response({'error': 'Invalid pollutant'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Query data
        data = AirQualityData.objects.filter(
            site_name=device,
            reported_time_utc__range=(start_date, end_date)
        ).values('reported_time_utc', pollutant, 'site_name').order_by('reported_time_utc')
        
        # Format response
        formatted_data = [
            {
                'timestamp': item['reported_time_utc'],
                'value': float(item[pollutant]) if item[pollutant] is not None else None,
                'site_name': item['site_name'],
                'pollutant': pollutant
            }
            for item in data
        ]
        
        serializer = AirQualityDataResponseSerializer(formatted_data, many=True)
        return Response(serializer.data)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def get_battery_data(request, device):
    """Get battery data for a specific device"""
    try:
        # Get days parameter or default to 30
        days = int(request.GET.get('days', 30))
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        # Query data
        data = BatteryData.objects.filter(
            site_name=device,
            reported_time_utc__range=(start_date, end_date)
        ).values('reported_time_utc', 'corrected_battery_voltage', 'site_name').order_by('reported_time_utc')
        
        # Format response
        formatted_data = [
            {
                'timestamp': item['reported_time_utc'],
                'value': float(item['corrected_battery_voltage']) if item['corrected_battery_voltage'] is not None else None,
                'site_name': item['site_name']
            }
            for item in data
        ]
        
        serializer = BatteryDataResponseSerializer(formatted_data, many=True)
        return Response(serializer.data)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def get_weather_data(request):
    """Get weather data"""
    try:
        # Get days parameter or default to 30
        days = int(request.GET.get('days', 30))
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        # Query data
        data = WeatherData.objects.filter(
            data_time_utc__range=(start_date, end_date)
        ).values(
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
        
        serializer = WeatherDataResponseSerializer(formatted_data, many=True)
        return Response(serializer.data)
    except Exception as e:
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
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)