from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

urlpatterns = [
    path('register/', views.UserRegistrationView.as_view(), name='register'),
    path('login/', views.CustomTokenObtainPairView.as_view(), name='login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('protected/', views.ProtectedView.as_view(), name='protected'),
    path('health/', views.HealthCheck.as_view(), name='health'),
    
    # User management endpoints (superadmin only)
    path('users/', views.UserListView.as_view(), name='user-list'),
    path('users/<int:pk>/', views.UserDetailView.as_view(), name='user-detail'),
    
    # Air quality data endpoints - updated to use device_id instead of device
    path('devices/', views.get_devices, name='get_devices'),
    path('pollutants/', views.get_pollutants, name='get_pollutants'),
    path('air-quality/<str:device_id>/<str:pollutant>/', views.get_air_quality_data, name='get_air_quality_data'),
    path('battery/<str:device_id>/', views.get_battery_data, name='get_battery_data'),
    path('weather/', views.get_weather_data, name='get_weather_data'),
    path('stats/air-quality/<str:device>/', views.get_pollutant_stats, name='get_pollutant_stats'),
    path('stats/battery/<str:device>/', views.get_battery_stats, name='get_battery_stats'),
    
    # New endpoints for advanced features
    path('device-groups/', views.get_device_groups, name='get_device_groups'),
    path('multi-device-data/', views.get_multi_device_data, name='get_multi_device_data'),
    path('latest-dates/', views.get_latest_dates, name='get_latest_dates'),
    path('device-groups/create/', views.create_device_group, name='create_device_group'),
    path('device-groups/<int:group_id>/add-device/', views.add_device_to_group, name='add_device_to_group'),

    # File Exports
    path('download-export/<int:file_id>/', views.download_exported_file, name='download_exported_file'),
]

# Serve exported files in development
from django.conf import settings
from django.conf.urls.static import static

if settings.DEBUG:
    urlpatterns += static(settings.EXPORT_URL, document_root=settings.EXPORT_ROOT)