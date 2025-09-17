/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from 'react';

const API_BASE_URL = 'https://django-react-neon.onrender.com/api';

const fetchData = async (url: string) => {
  try {
    console.log('API Request:', url);
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
      },
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/signin';
        throw new Error('Authentication failed. Please sign in again.');
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.indexOf('application/json') !== -1) {
      return await response.json();
    } else {
      const text = await response.text();
      if (text.startsWith('<!DOCTYPE') || text.startsWith('<html')) {
        console.error('HTML response received:', text.substring(0, 500));
        throw new Error('Server returned HTML instead of JSON. The API might be misconfigured.');
      }
      throw new Error('Server returned non-JSON response');
    }
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
};

export const useMultiDeviceDataFetch = (deviceIds: string[], metric: string, timeRange: string = 'week') => {
  const [data, setData] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate start and end times based on timeRange
  const getTimeRangeParams = useCallback(() => {
    const now = new Date();
    const startTime = new Date();
    
    switch (timeRange) {
      case 'day':
        // Correct 24-hour calculation - subtract exactly 24 hours from now
        startTime.setTime(now.getTime() - (24 * 60 * 60 * 1000));
        break;
      case 'week':
        startTime.setDate(now.getDate() - 7);
        break;
      case 'month':
        startTime.setMonth(now.getMonth() - 1);
        break;
      default:
        startTime.setDate(now.getDate() - 7);
    }
    
    // Format dates as YYYY-MM-DD HH:MM:SS
    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    };
    
    return {
      start_time: formatDate(startTime),
      end_time: formatDate(now)
    };
  }, [timeRange]);

  const loadData = useCallback(async (currentMetric: string) => {
    if (!deviceIds || deviceIds.length === 0 || !currentMetric) {
      setData({});
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Get time range parameters
      const timeParams = getTimeRangeParams();
      
      // Fetch data for all devices
      const deviceData: Record<string, any[]> = {};
      
      await Promise.all(deviceIds.map(async (deviceId) => {
        try {
          // Construct the proper URL with time range
          const baseUrl = `${API_BASE_URL}/air-quality/${deviceId}/${currentMetric}/`;
          const queryParams = new URLSearchParams({
            start_time: timeParams.start_time,
            end_time: timeParams.end_time,
            page: '1',
            limit: '500',
          });
          
          const url = `${baseUrl}?${queryParams.toString()}`;
          console.log('Fetching from URL:', url);
          
          const response = await fetchData(url);
          deviceData[deviceId] = Array.isArray(response) ? response : [];
        } catch (err) {
          console.error(`Failed to fetch data for device ${deviceId}:`, err);
          deviceData[deviceId] = [];
        }
      }));
      
      setData(deviceData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch data';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [deviceIds, getTimeRangeParams]);

  const changeMetric = useCallback((newMetric: string) => {
    setData({});
    loadData(newMetric);
  }, [loadData]);

  useEffect(() => {
    setData({});
    if (deviceIds.length > 0 && metric) {
      loadData(metric);
    }
  }, [deviceIds, metric, timeRange, loadData]);

  return { data, loading, error, changeMetric };
};