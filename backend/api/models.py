from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.core.exceptions import ValidationError
import re
from django.conf import settings

class CustomUserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('The Email must be set')
        
        # Validate email format
        if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email):
            raise ValueError('Enter a valid email address')
            
        email = self.normalize_email(email)
        
        # Check for duplicate email
        if self.model.objects.filter(email=email).exists():
            raise ValueError('Email already exists')
        
        # Validate password
        if password:
            if len(password) < 8:
                raise ValueError('Password must be at least 8 characters long')
            if not re.search(r'[A-Z]', password):
                raise ValueError('Password must contain at least one uppercase letter')
            if not re.search(r'[0-9]', password):
                raise ValueError('Password must contain at least one number')
            if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
                raise ValueError('Password must contain at least one special character')
        
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save()
        return user

    def create_superuser(self, email, password, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        extra_fields.setdefault('role', 'superadmin')

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')
        return self.create_user(email, password, **extra_fields)

class CustomUser(AbstractBaseUser, PermissionsMixin):
    ROLE_CHOICES = (
        ('user', 'Normal User'),
        ('admin', 'Admin'),
        ('superadmin', 'Super Admin'),
    )
    
    email = models.EmailField('email address', unique=True)
    is_staff = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    date_joined = models.DateTimeField(auto_now_add=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='user')

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    objects = CustomUserManager()

    def __str__(self):
        return self.email

    def is_admin(self):
        return self.role in ['admin', 'superadmin']
    
    def is_superadmin(self):
        return self.role == 'superadmin'

    def clean(self):
        # Validate email format
        if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', self.email):
            raise ValidationError('Enter a valid email address')
        
        # Check for duplicate email
        if CustomUser.objects.filter(email=self.email).exclude(pk=self.pk).exists():
            raise ValidationError('Email already exists')

# Air Quality Data Model
class AirQualityData(models.Model):
    site_name = models.CharField(max_length=50, db_column='SiteName')
    reported_time_utc = models.DateTimeField(db_column='ReportedTime-UTC')
    voc = models.DecimalField(max_digits=8, decimal_places=4, null=True, blank=True, db_column='VOC')
    o3 = models.DecimalField(max_digits=8, decimal_places=4, null=True, blank=True, db_column='O3')
    so2 = models.DecimalField(max_digits=8, decimal_places=4, null=True, blank=True, db_column='SO2')
    no2 = models.DecimalField(max_digits=8, decimal_places=4, null=True, blank=True, db_column='NO2')
    received_time = models.DateTimeField(null=True, blank=True, db_column='ReceivedTime')
    
    class Meta:
        db_table = '"AirQualityData-VOC-V6_1"'
        managed = False

# Battery Data Model
class BatteryData(models.Model):
    site_name = models.CharField(max_length=50, db_column='SiteName')
    reported_time_utc = models.DateTimeField(db_column='ReportedTime-UTC')
    corrected_battery_voltage = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, db_column='corrected_battery_voltage')
    received_time = models.DateTimeField(null=True, blank=True, db_column='ReceivedTime')
    
    class Meta:
        db_table = '"AirQualityData-battery-V6_1"'
        managed = False

# Weather Data Model
class WeatherData(models.Model):
    location = models.CharField(max_length=100, null=True, blank=True, db_column='location')
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True, db_column='latitude')
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True, db_column='longitude')
    elevation = models.IntegerField(null=True, blank=True, db_column='elevation')
    temperature = models.DecimalField(max_digits=5, decimal_places=1, null=True, blank=True, db_column='temperature')
    windspeed = models.DecimalField(max_digits=5, decimal_places=1, null=True, blank=True, db_column='windspeed')
    winddirection = models.SmallIntegerField(null=True, blank=True, db_column='winddirection')
    is_day = models.CharField(max_length=10, null=True, blank=True, db_column='is_day')
    weathercode = models.SmallIntegerField(null=True, blank=True, db_column='weathercode')
    humidity = models.SmallIntegerField(null=True, blank=True, db_column='humidity')
    solar_radiation = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, db_column='solar_radiation')
    pressure = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True, db_column='pressure')
    data_time_local = models.DateTimeField(null=True, blank=True, db_column='data_time_local')
    data_time_utc = models.DateTimeField(null=True, blank=True, db_column='data_time_utc')
    fetch_time = models.DateTimeField(null=True, blank=True, db_column='fetch_time')
    
    class Meta:
        db_table = '"AirQualityData-CorpusChristiWeather-V6_1"'
        managed = False

class THData(models.Model):
    site_name = models.CharField(max_length=50, db_column='SiteName')
    time = models.DateTimeField(db_column='Time')
    humidity = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, db_column='humidity')
    temperature = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, db_column='temperature')
    noise = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, db_column='noise')
    pm2_5 = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, db_column='PM2_5')
    pm10 = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, db_column='PM10')
    illumination = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, db_column='Illumination')
    mqtt_sent = models.IntegerField(default=0, db_column='mqttSent')
    
    class Meta:
        db_table = '"AirQualityData-TH-V6_1"'
        managed = False

# Device Group Models
class DeviceGroup(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class DeviceGroupMember(models.Model):
    group = models.ForeignKey(DeviceGroup, on_delete=models.CASCADE, related_name='members')
    device_name = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('group', 'device_name')

    def __str__(self):
        return f"{self.device_name} in {self.group.name}"

# Exported File Model
class ExportedFile(models.Model):
    FILE_TYPES = (
        ('air_quality', 'Air Quality'),
        ('battery', 'Battery'),
        ('weather', 'Weather'),
    )
    
    filename = models.CharField(max_length=255)
    file_path = models.CharField(max_length=500)
    file_type = models.CharField(max_length=20, choices=FILE_TYPES)
    device_id = models.CharField(max_length=100, blank=True, null=True)
    pollutant = models.CharField(max_length=10, blank=True, null=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    
    def __str__(self):
        return self.filename
    
    def is_expired(self):
        from django.utils import timezone
        return timezone.now() > self.expires_at