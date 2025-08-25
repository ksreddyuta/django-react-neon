from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager

class CustomUserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('The Email must be set')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save()
        return user

    def create_superuser(self, email, password, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')
        return self.create_user(email, password, **extra_fields)

class CustomUser(AbstractBaseUser, PermissionsMixin):
    email = models.EmailField('email address', unique=True)
    is_staff = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    date_joined = models.DateTimeField(auto_now_add=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    objects = CustomUserManager()

    def __str__(self):
        return self.email

# Air Quality Data Model
class AirQualityData(models.Model):
    site_name = models.CharField(max_length=50)
    reported_time_utc = models.DateTimeField()
    voc = models.DecimalField(max_digits=8, decimal_places=4, null=True, blank=True)
    o3 = models.DecimalField(max_digits=8, decimal_places=4, null=True, blank=True)
    so2 = models.DecimalField(max_digits=8, decimal_places=4, null=True, blank=True)
    no2 = models.DecimalField(max_digits=8, decimal_places=4, null=True, blank=True)
    received_time = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = '"AirQualityData-VOC-V6_1"'
        managed = False

# Battery Data Model
class BatteryData(models.Model):
    site_name = models.CharField(max_length=50)
    reported_time_utc = models.DateTimeField()
    corrected_battery_voltage = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    received_time = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = '"AirQualityData-battery-V6_1"'
        managed = False

# Weather Data Model
class WeatherData(models.Model):
    location = models.CharField(max_length=100, null=True, blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    elevation = models.IntegerField(null=True, blank=True)
    temperature = models.DecimalField(max_digits=5, decimal_places=1, null=True, blank=True)
    windspeed = models.DecimalField(max_digits=5, decimal_places=1, null=True, blank=True)
    winddirection = models.SmallIntegerField(null=True, blank=True)
    is_day = models.CharField(max_length=10, null=True, blank=True)
    weathercode = models.SmallIntegerField(null=True, blank=True)
    humidity = models.SmallIntegerField(null=True, blank=True)
    solar_radiation = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    pressure = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True)
    data_time_local = models.DateTimeField(null=True, blank=True)
    data_time_utc = models.DateTimeField(null=True, blank=True)
    fetch_time = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = '"AirQualityData-CorpusChristiWeather-V6_1"'
        managed = False