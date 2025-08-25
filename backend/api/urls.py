from django.urls import path
from .views import (
    UserRegistrationView, 
    CustomTokenObtainPairView, 
    ProtectedView, 
    HealthCheck,
    get_devices,
    get_pollutants,
    get_air_quality_data,
    get_battery_data,
    get_weather_data,
    get_pollutant_stats,
    get_battery_stats
)

urlpatterns = [
    path('register/', UserRegistrationView.as_view(), name='register'),
    path('login/', CustomTokenObtainPairView.as_view(), name='login'),
    path('protected/', ProtectedView.as_view(), name='protected'),
    path('health/', HealthCheck.as_view(), name='health'),
    
    # Air quality data endpoints
    path('devices/', get_devices, name='get_devices'),
    path('pollutants/', get_pollutants, name='get_pollutants'),
    path('air-quality/<str:device>/<str:pollutant>/', get_air_quality_data, name='get_air_quality_data'),
    path('battery/<str:device>/', get_battery_data, name='get_battery_data'),
    path('weather/', get_weather_data, name='get_weather_data'),
    path('stats/air-quality/<str:device>/', get_pollutant_stats, name='get_pollutant_stats'),
    path('stats/battery/<str:device>/', get_battery_stats, name='get_battery_stats'),
]