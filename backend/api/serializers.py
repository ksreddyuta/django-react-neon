from django.contrib.auth import get_user_model
from django.db import IntegrityError
from rest_framework import serializers
from .models import ExportedFile
import re

User = get_user_model()

class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    email = serializers.EmailField()

    class Meta:
        model = User
        fields = ('email', 'password')
        
    def validate_email(self, value):
        """
        Check if email already exists and validate format
        """
        # Fixed regex pattern (removed extra '00')
        if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', value):
            raise serializers.ValidationError("Enter a valid email address")
        
        # Check if email already exists
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Email already exists")
        return value

    def validate_password(self, value):
        """
        Validate password strength
        """
        if len(value) < 8:
            raise serializers.ValidationError("Password must be at least 8 characters long")
        if not re.search(r'[A-Z]', value):
            raise serializers.ValidationError("Password must contain at least one uppercase letter")
        if not re.search(r'[0-9]', value):
            raise serializers.ValidationError("Password must contain at least one number")
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', value):
            raise serializers.ValidationError("Password must contain at least one special character")
        return value

    def create(self, validated_data):
        try:
            return User.objects.create_user(
                email=validated_data['email'],
                password=validated_data['password']
            )
        except IntegrityError:
            raise serializers.ValidationError("Email already exists")
        except ValueError as e:
            raise serializers.ValidationError(str(e))

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'email', 'role', 'date_joined', 'is_active')
        read_only_fields = ('id', 'date_joined')

class UserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('role', 'is_active')

# Response serializers for air quality, battery, and weather data
class AirQualityDataResponseSerializer(serializers.Serializer):
    timestamp = serializers.DateTimeField()
    value = serializers.FloatField(allow_null=True)
    site_name = serializers.CharField()
    pollutant = serializers.CharField()
    device_id = serializers.CharField()  # Added device_id field

class BatteryDataResponseSerializer(serializers.Serializer):
    timestamp = serializers.DateTimeField()
    value = serializers.FloatField(allow_null=True)
    site_name = serializers.CharField()
    device_id = serializers.CharField()  # Added device_id field

class WeatherDataResponseSerializer(serializers.Serializer):
    timestamp = serializers.DateTimeField()
    temperature = serializers.FloatField(allow_null=True)
    humidity = serializers.FloatField(allow_null=True)
    windspeed = serializers.FloatField(allow_null=True)
    winddirection = serializers.FloatField(allow_null=True)
    pressure = serializers.FloatField(allow_null=True)
    solar_radiation = serializers.FloatField(allow_null=True)

# Serializer for exported files
class ExportedFileSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExportedFile
        fields = ('id', 'filename', 'file_type', 'device_id', 'pollutant', 'created_at', 'expires_at')
        read_only_fields = ('id', 'created_at')