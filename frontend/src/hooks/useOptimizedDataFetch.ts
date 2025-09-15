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

export const useOptimizedDataFetch = (deviceId: string, metric: string, timeRange: string = 'week') => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextPage, setNextPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState(true);

  // Calculate start and end times based on timeRange
  const getTimeRangeParams = () => {
    const now = new Date();
    const startTime = new Date();
    
    switch (timeRange) {
      case 'day':
        startTime.setDate(now.getDate() - 1);
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
  };

  const loadData = useCallback(async (page: number, currentMetric: string, reset: boolean = false) => {
    if (!deviceId || !currentMetric) {
      setData([]);
      setHasMore(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Get time range parameters
      const timeParams = getTimeRangeParams();
      
      // Construct the proper URL with time range
      const baseUrl = `${API_BASE_URL}/air-quality/${deviceId}/${currentMetric}/`;
      const queryParams = new URLSearchParams({
        start_time: timeParams.start_time,
        end_time: timeParams.end_time,
        page: page.toString(),
        limit: '500',
      });
      
      const url = `${baseUrl}?${queryParams.toString()}`;
      console.log('Fetching from URL:', url);
      
      const response = await fetchData(url);
      
      // Handle response
      if (response && Array.isArray(response)) {
        if (reset) {
          setData(response);
        } else {
          setData(prev => [...prev, ...response]);
        }
        
        // Update pagination info
        // Assuming the API returns all data at once for now
        setHasMore(false);
        setNextPage(page);
      } else {
        console.error('Unexpected API response format:', response);
        setError('Unexpected data format from server');
        setHasMore(false);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch data';
      setError(errorMessage);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [deviceId, timeRange]);

  const changeMetric = useCallback((newMetric: string) => {
    setData([]);
    setNextPage(1);
    setHasMore(true);
    loadData(1, newMetric, true);
  }, [loadData]);

  const loadMore = useCallback(() => {
    if (hasMore && !loading) {
      loadData(nextPage, metric, false);
    }
  }, [hasMore, loading, nextPage, metric, loadData]);

  useEffect(() => {
    setData([]);
    setNextPage(1);
    setHasMore(true);
    loadData(1, metric, true);
  }, [deviceId, metric, timeRange, loadData]);

  return { data, loading, error, hasMore, loadMore, changeMetric };
};