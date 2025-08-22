import axios from 'axios';
import type { AirQualityResponse, MapLocation } from '../types/airQuality';

// Create axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://django-react-neon.onrender.com',
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
  getAirQualityData: async (city: string, days: number = 30): Promise<AirQualityResponse> => {
    const response = await api.get(`/api/air-quality/${city}?days=${days}`);
    return response.data;
  },

  getMapLocations: async (): Promise<MapLocation[]> => {
    const response = await api.get('/api/map-locations/');
    return response.data;
  },
};


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

// Auth service methods - updated to match your Django API
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
    // Your Django API might not have a logout endpoint
    // Just clear local storage
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  },

  getCurrentUser: async () => {
    // Use your protected endpoint to get user data
    const response = await api.get('/api/protected/');
    return response.data;
  },

  // Health check
  health: async () => {
    const response = await api.get('/api/health/');
    return response.data;
  }
};

export default api;