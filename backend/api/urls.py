from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
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
    get_battery_stats,
    get_device_groups,
    get_multi_device_data,
    get_latest_dates,
    create_device_group,
    add_device_to_group,
    UserListView,
    UserDetailView
)

urlpatterns = [
    path('register/', UserRegistrationView.as_view(), name='register'),
    path('login/', CustomTokenObtainPairView.as_view(), name='login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('protected/', ProtectedView.as_view(), name='protected'),
    path('health/', HealthCheck.as_view(), name='health'),
    
    # User management endpoints (superadmin only)
    path('users/', UserListView.as_view(), name='user-list'),
    path('users/<int:pk>/', UserDetailView.as_view(), name='user-detail'),
    
    # Air quality data endpoints
    path('devices/', get_devices, name='get_devices'),
    path('pollutants/', get_pollutants, name='get_pollutants'),
    path('air-quality/<str:device>/<str:pollutant>/', get_air_quality_data, name='get_air_quality_data'),
    path('battery/<str:device>/', get_battery_data, name='get_battery_data'),
    path('weather/', get_weather_data, name='get_weather_data'),
    path('stats/air-quality/<str:device>/', get_pollutant_stats, name='get_pollutant_stats'),
    path('stats/battery/<str:device>/', get_battery_stats, name='get_battery_stats'),
    
    # New endpoints for advanced features
    path('device-groups/', get_device_groups, name='get_device_groups'),
    path('multi-device-data/', get_multi_device_data, name='get_multi_device_data'),
    path('latest-dates/', get_latest_dates, name='get_latest_dates'),
    path('device-groups/create/', create_device_group, name='create_device_group'),
    path('device-groups/<int:group_id>/add-device/', add_device_to_group, name='add_device_to_group'),
]