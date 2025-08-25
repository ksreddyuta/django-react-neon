from django.contrib.auth import get_user_model
from django.db import IntegrityError
from rest_framework import serializers
from .models import AirQualityData, BatteryData, WeatherData

User = get_user_model()

class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    email = serializers.EmailField()

    class Meta:
        model = User
        fields = ('email', 'password')
        
    def validate_email(self, value):
        """
        Check if email already exists
        """
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Email already exists")
        return value

    def create(self, validated_data):
        try:
            return User.objects.create_user(
                email=validated_data['email'],
                password=validated_data['password']
            )
        except IntegrityError:
            raise serializers.ValidationError("Email already exists")

# Response serializers for air quality, battery, and weather data
class AirQualityDataResponseSerializer(serializers.Serializer):
    timestamp = serializers.DateTimeField()
    value = serializers.FloatField(allow_null=True)
    site_name = serializers.CharField()
    pollutant = serializers.CharField()

class BatteryDataResponseSerializer(serializers.Serializer):
    timestamp = serializers.DateTimeField()
    value = serializers.FloatField(allow_null=True)
    site_name = serializers.CharField()

class WeatherDataResponseSerializer(serializers.Serializer):
    timestamp = serializers.DateTimeField()
    temperature = serializers.FloatField(allow_null=True)
    humidity = serializers.FloatField(allow_null=True)
    windspeed = serializers.FloatField(allow_null=True)
    winddirection = serializers.FloatField(allow_null=True)
    pressure = serializers.FloatField(allow_null=True)
    solar_radiation = serializers.FloatField(allow_null=True)