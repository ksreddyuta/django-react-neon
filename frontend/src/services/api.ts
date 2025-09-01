/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';
import type { 
  AirQualityResponse, 
  MapLocation, 
  Pollutant, 
  Device, 
  BatteryData,
  WeatherData,
  PollutantStats,
  ExportFile
} from '../types/airQuality';

const api = axios.create({
  // baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  baseURL: import.meta.env.VITE_API_URL || 'https://django-react-neon.onrender.com/api',
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

// Add response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const response = await api.post('/token/refresh/', {
          refresh: refreshToken,
        });

        const { access } = response.data;
        localStorage.setItem('accessToken', access);
        originalRequest.headers.Authorization = `Bearer ${access}`;

        return api(originalRequest);
      } catch (refreshError) {
        // Refresh token failed, redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/signin';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export const airQualityService = {
  getAirQualityData: async (device_id: string, pollutant: string, days: number = 30): Promise<AirQualityResponse> => {
    try {
      console.log(`Fetching air quality data for device: ${device_id}, pollutant: ${pollutant}, days: ${days}`);
      const response = await api.get(`/air-quality/${device_id}/${pollutant}/?days=${days}`);
      console.log('Air quality data response:', response.data);
      
      return {
        device: device_id,
        pollutant: pollutant,
        data: response.data.map((item: any) => ({
          timestamp: item.timestamp,
          value: item.value,
          site_name: item.site_name,
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
      console.log(`Fetching multi-device data for devices: ${devices.join(', ')}, pollutant: ${pollutant}`);
      const requests = devices.map(device => 
        airQualityService.getAirQualityData(device, pollutant, days)
      );
      const responses = await Promise.all(requests);
      console.log('Multi-device data response:', responses);
      return responses;
    } catch (error) {
      console.error('Error fetching multi-device data:', error);
      throw error;
    }
  },

  getMapLocations: async (): Promise<MapLocation[]> => {
    try {
      console.log('Fetching map locations');
      const response = await api.get('/devices/');
      console.log('Map locations response:', response.data);
      
      // Create locations based on device data with actual coordinates
      return response.data.map((device: any) => {
        return {
          lat: device.latitude || 27.8006, // Default to Corpus Christi
          lng: device.longitude || -97.3964, // Default to Corpus Christi
          name: device.name || device.display_name,
          aqi: Math.floor(Math.random() * 100) + 1,
          lastUpdated: new Date().toISOString(),
          device: device.id
        };
      });
    } catch (error) {
      console.error('Error fetching map locations:', error);
      // Fallback to Corpus Christi data if API fails
      return [
        {
          lat: 27.8006,
          lng: -97.3964,
          name: "Corpus Christi Downtown",
          aqi: 38,
          lastUpdated: new Date().toISOString(),
          device: "cc-downtown"
        },
        {
          lat: 27.7609,
          lng: -97.4350,
          name: "Corpus Christi South",
          aqi: 42,
          lastUpdated: new Date().toISOString(),
          device: "cc-south"
        },
        {
          lat: 27.8500,
          lng: -97.1500,
          name: "Corpus Christi North",
          aqi: 35,
          lastUpdated: new Date().toISOString(),
          device: "cc-north"
        },
      ];
    }
  },

  getPollutants: async (): Promise<Pollutant[]> => {
    try {
      console.log('Fetching pollutants');
      const response = await api.get('/pollutants/');
      console.log('Pollutants response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching pollutants:', error);
      // Return default pollutants if API fails
      return [
        { id: 'VOC', name: 'Volatile Organic Compounds', unit: 'ppb' },
        { id: 'O3', name: 'Ozone', unit: 'ppb' },
        { id: 'SO2', name: 'Sulfur Dioxide', unit: 'ppb' },
        { id: 'NO2', name: 'Nitrogen Dioxide', unit: 'ppb' },
      ];
    }
  },

  getDevices: async (): Promise<Device[]> => {
    try {
      console.log('Fetching devices');
      const response = await api.get('/devices/');
      console.log('Devices response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching devices:', error);
      // Return default devices if API fails
      return [
        { 
          id: 'aq_CC-VOC-V6_1', 
          name: 'CC-VOC-V6_1', 
          type: 'air_quality', 
          latitude: 27.8006, 
          longitude: -97.3964, 
          lastBatteryLevel: 12.5,
          display_name: 'Corpus Christi VOC'
        },
        { 
          id: 'bat_CC-battery-V6_1', 
          name: 'CC-battery-V6_1', 
          type: 'battery', 
          latitude: 27.7609, 
          longitude: -97.4350, 
          lastBatteryLevel: 12.2,
          display_name: 'Corpus Christi Battery'
        },
      ];
    }
  },

  getBatteryData: async (device_id: string): Promise<BatteryData[]> => {
    try {
      console.log(`Fetching battery data for device: ${device_id}`);
      const response = await api.get(`/battery/${device_id}/`);
      console.log('Battery data response:', response.data);
      
      return response.data.map((item: any) => ({
        timestamp: item.timestamp,
        value: item.value,
        site_name: item.site_name
      }));
    } catch (error) {
      console.error('Error fetching battery data:', error);
      throw error;
    }
  },

  getWeatherData: async (): Promise<WeatherData[]> => {
    try {
      console.log('Fetching weather data');
      const response = await api.get('/weather/');
      console.log('Weather data response:', response.data);
      
      return response.data.map((item: any) => ({
        temperature: item.temperature,
        humidity: item.humidity,
        windspeed: item.windspeed,
        winddirection: item.winddirection,
        pressure: item.pressure,
        solar_radiation: item.solar_radiation,
        timestamp: item.timestamp,
        location: item.location
      }));
    } catch (error) {
      console.error('Error fetching weather data:', error);
      throw error;
    }
  },

  getStats: async (device: string, type: 'air-quality' | 'battery'): Promise<PollutantStats> => {
    try {
      console.log(`Fetching stats for device: ${device}, type: ${type}`);
      const response = await api.get(`/stats/${type}/${device}/`);
      console.log('Stats response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching stats:', error);
      throw error;
    }
  },

  getExportedFiles: async (): Promise<ExportFile[]> => {
    try {
      console.log('Fetching exported files');
      // This endpoint would need to be created in your Django backend
      const response = await api.get('/exported-files/');
      console.log('Exported files response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching exported files:', error);
      // Return empty array if API fails
      return [];
    }
  },

  downloadExport: async (fileId: number): Promise<Blob> => {
    try {
      console.log(`Downloading export file with ID: ${fileId}`);
      const response = await api.get(`/download-export/${fileId}/`, {
        responseType: 'blob'
      });
      console.log('Download export response:', response);
      return response.data;
    } catch (error) {
      console.error('Error downloading export:', error);
      throw error;
    }
  }
};

// Auth service methods
export const authService = {
  login: async (credentials: { email: string; password: string }) => {
    console.log('Logging in with credentials:', credentials);
    const response = await api.post('/login/', credentials);
    console.log('Login response:', response.data);
    return response.data;
  },

  signUp: async (credentials: { email: string; password: string; username?: string }) => {
    console.log('Signing up with credentials:', credentials);
    const response = await api.post('/register/', credentials);
    console.log('Signup response:', response.data);
    return response.data;
  },

  logout: async () => {
    console.log('Logging out');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  },

  getCurrentUser: async () => {
    console.log('Fetching current user');
    const response = await api.get('/protected/');
    console.log('Current user response:', response.data);
    return response.data;
  },

  health: async () => {
    console.log('Checking health');
    const response = await api.get('/health/');
    console.log('Health response:', response.data);
    return response.data;
  }
};

export default api;