from django.urls import path
from .views import UserRegistrationView, CustomTokenObtainPairView, ProtectedView, HealthCheck

urlpatterns = [
    path('register/', UserRegistrationView.as_view(), name='register'),
    path('login/', CustomTokenObtainPairView.as_view(), name='login'),
    path('protected/', ProtectedView.as_view(), name='protected'),
    path('health/', HealthCheck.as_view(), name='health'),
]