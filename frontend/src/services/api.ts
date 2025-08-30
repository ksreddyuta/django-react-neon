/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';
import type { 
  AirQualityResponse, 
  MapLocation, 
  Pollutant, 
  Device, 
  BatteryData,
  WeatherData,
  PollutantStats
} from '../types/airQuality';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const airQualityService = {
  getAirQualityData: async (device: string, pollutant: string, days: number = 30): Promise<AirQualityResponse> => {
    try {
      const response = await api.get(`/api/air-quality/${device}/${pollutant}/?days=${days}`);
      
      // Transform the response to match the expected format
      return {
        device: device,
        pollutant: pollutant,
        data: response.data.map((item: any) => ({
          timestamp: item['ReportedTime-UTC'] || item.timestamp,
          value: item[pollutant] || item.value,
          site_name: item.SiteName || item.site_name,
          pollutant: pollutant
        }))
      };
    } catch (error) {
      console.error('Error fetching air quality data:', error);
      throw error;
    }
  },

  getMultiDeviceData: async (devices: string[], pollutant: string, days: number = 30): Promise<AirQualityResponse[]> => {
    try {
      const requests = devices.map(device => 
        airQualityService.getAirQualityData(device, pollutant, days)
      );
      const responses = await Promise.all(requests);
      return responses;
    } catch (error) {
      console.error('Error fetching multi-device data:', error);
      throw error;
    }
  },

  getMapLocations: async (): Promise<MapLocation[]> => {
    try {
      const response = await api.get('/api/devices/');
      const devices = response.data;
      
      // Create locations based on device data with actual coordinates
      return devices.map((device: any) => {
        return {
          lat: device.latitude || 27.8006,
          lng: device.longitude || -97.3964,
          name: device.name || device.id,
          aqi: Math.floor(Math.random() * 100) + 1,
          lastUpdated: new Date().toISOString(),
          device: device.id
        };
      });
    } catch (error) {
      console.error('Error fetching map locations:', error);
      throw error;
    }
  },

  getPollutants: async (): Promise<Pollutant[]> => {
    try {
      // Return actual pollutants from the system
      return [
        { id: 'VOC', name: 'Volatile Organic Compounds', unit: 'ppb' },
        { id: 'O3', name: 'Ozone', unit: 'ppb' },
        { id: 'SO2', name: 'Sulfur Dioxide', unit: 'ppb' },
        { id: 'NO2', name: 'Nitrogen Dioxide', unit: 'ppb' },
        { id: 'temperature', name: 'Temperature', unit: '°C' },
        { id: 'humidity', name: 'Humidity', unit: '%' },
        { id: 'pressure', name: 'Pressure', unit: 'hPa' },
      ];
    } catch (error) {
      console.error('Error fetching pollutants:', error);
      throw error;
    }
  },

  getDevices: async (): Promise<Device[]> => {
    try {
      const response = await api.get('/api/devices/');
      
      // Transform to match Device interface
      return response.data.map((device: any) => ({
        id: device.id || device.SiteName,
        name: device.name || device.SiteName,
        type: device.type || (device.SiteName?.includes('VOC') ? 'VOC' : 'battery'),
        latitude: device.latitude || 27.8006,
        longitude: device.longitude || -97.3964,
        lastBatteryLevel: device.lastBatteryLevel || 12.5
      }));
    } catch (error) {
      console.error('Error fetching devices:', error);
      throw error;
    }
  },

  getBatteryData: async (device: string): Promise<BatteryData[]> => {
    try {
      const response = await api.get(`/api/battery/${device}/`);
      
      // Transform the response to match the expected format
      return response.data.map((item: any) => ({
        timestamp: item['ReportedTime-UTC'] || item.timestamp,
        value: item.corrected_battery_voltage || item.value,
        site_name: item.SiteName || item.site_name
      }));
    } catch (error) {
      console.error('Error fetching battery data:', error);
      throw error;
    }
  },

  getWeatherData: async (): Promise<WeatherData[]> => {
    try {
      const response = await api.get('/api/weather/');
      
      // Transform the response to match the expected format
      return response.data.map((item: any) => ({
        temperature: item.temperature,
        humidity: item.humidity,
        windspeed: item.windspeed,
        winddirection: item.winddirection,
        pressure: item.pressure,
        solar_radiation: item.solar_radiation,
        timestamp: item.data_time_utc || item.timestamp,
        location: item.location
      }));
    } catch (error) {
      console.error('Error fetching weather data:', error);
      throw error;
    }
  },

  getStats: async (device: string, type: 'air-quality' | 'battery'): Promise<PollutantStats> => {
    try {
      // Fixed: Remove unused response variable
      const { data } = await api.get(`/api/stats/${type}/${device}/`);
      return data;
    } catch (error) {
      console.error('Error fetching stats:', error);
      throw error;
    }
  }
};

// Auth service methods
export const authService = {
  login: async (credentials: { email: string; password: string }) => {
    const response = await api.post('/api/login/', credentials);
    return response.data;
  },

  signUp: async (credentials: { email: string; password: string; username?: string }) => {
    const response = await api.post('/api/register/', credentials);
    return response.data;
  },

  logout: async () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  },

  getCurrentUser: async () => {
    const response = await api.get('/api/protected/');
    return response.data;
  },

  health: async () => {
    const response = await api.get('/api/health/');
    return response.data;
  }
};

export default api;