/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from 'react';

const API_BASE_URL = 'https://django-react-neon.onrender.com';

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

export const useOptimizedDataFetch = (endpoint: string, deviceId: string, pollutant: string) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextPage, setNextPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState(true);

  const loadData = useCallback(async (page: number, currentPollutant: string, reset: boolean = false) => {
    if (!deviceId || !currentPollutant) {
      setData([]);
      setHasMore(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Construct the proper URL
      const baseUrl = `${API_BASE_URL}/api/air-quality/${deviceId}/${currentPollutant}/`;
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: '500',
        downsample: 'true'
      });
      const url = `${baseUrl}?${queryParams.toString()}`;
      
      const response = await fetchData(url);
      
      // Handle response
      if (response && response.data && Array.isArray(response.data)) {
        if (reset) {
          setData(response.data);
        } else {
          setData(prev => [...prev, ...response.data]);
        }
        
        // Update pagination info
        const { pagination } = response;
        const hasMoreData = pagination.page < pagination.pages;
        setHasMore(hasMoreData);
        setNextPage(hasMoreData ? page + 1 : page);
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
  }, [deviceId]);

  const changePollutant = useCallback((newPollutant: string) => {
    setData([]);
    setNextPage(1);
    setHasMore(true);
    loadData(1, newPollutant, true);
  }, [loadData]);

  const loadMore = useCallback(() => {
    if (hasMore && !loading) {
      loadData(nextPage, pollutant, false);
    }
  }, [hasMore, loading, nextPage, pollutant, loadData]);

  useEffect(() => {
    setData([]);
    setNextPage(1);
    setHasMore(true);
    loadData(1, pollutant, true);
  }, [deviceId, pollutant, loadData]);

  return { data, loading, error, hasMore, loadMore, changePollutant };
};