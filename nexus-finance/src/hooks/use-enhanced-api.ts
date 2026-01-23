'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient, type APIResponse, type APIOptions } from '@/lib/enhanced-api-client';

// Hook state
interface UseAPIState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  cached: boolean;
  fromCache: boolean;
  lastUpdated: number | null;
  refetching: boolean;
}

// Hook options
interface UseAPIHookOptions<T> extends APIOptions {
  initialData?: T;
  refetchInterval?: number;
  refetchOnWindowFocus?: boolean;
  refetchOnReconnect?: boolean;
  onSuccess?: (data: T, response: APIResponse<T>) => void;
  onError?: (error: string, response?: APIResponse<T>) => void;
  transform?: (data: any) => T;
  enabled?: boolean;
  staleWhileRevalidate?: boolean;
}

// Enhanced API hook
export function useAPI<T = any>(
  endpoint: string,
  options: UseAPIHookOptions<T> = {}
) {
  const {
    initialData,
    refetchInterval,
    refetchOnWindowFocus = true,
    refetchOnReconnect = true,
    onSuccess,
    onError,
    transform,
    enabled = true,
    staleWhileRevalidate = true,
    ...apiOptions
  } = options;

  // State
  const [state, setState] = useState<UseAPIState<T>>({
    data: (initialData ?? null) as T | null,
    loading: enabled,
    error: null,
    cached: false,
    fromCache: false,
    lastUpdated: null,
    refetching: false
  });

  // Refs for cleanup
  const abortControllerRef = useRef<AbortController | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // Transform data if transformer provided
  const transformData = useCallback((data: any): T => {
    if (transform) {
      return transform(data);
    }
    return data;
  }, [transform]);

  // Execute API request
  const execute = useCallback(async (
    customOptions?: APIOptions,
    isRefetch = false
  ): Promise<T | null> => {
    if (!enabled) return null;

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    try {
      setState(prev => ({
        ...prev,
        loading: !isRefetch,
        refetching: isRefetch,
        error: null
      }));

      const response = await apiClient.request<T>(endpoint, {
        ...apiOptions,
        ...customOptions,
        signal: abortControllerRef.current.signal
      });

      const transformedData = transformData(response.data);

      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          data: transformedData as T | null,
          loading: false,
          refetching: false,
          error: null,
          cached: response.cached,
          fromCache: response.fromCache,
          lastUpdated: response.timestamp
        }));

        onSuccess?.(transformedData, response);
      }

      return transformedData;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return null; // Request was cancelled
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          loading: false,
          refetching: false,
          error: errorMessage
        }));

        onError?.(errorMessage);
      }

      return null;
    }
  }, [endpoint, apiOptions, enabled, transformData, onSuccess, onError]);

  // Initial fetch
  useEffect(() => {
    if (enabled) {
      execute();
    }
  }, [execute, enabled]);

  // Refetch interval
  useEffect(() => {
    if (refetchInterval && enabled) {
      intervalRef.current = setInterval(() => {
        execute(undefined, true);
      }, refetchInterval);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [refetchInterval, execute, enabled]);

  // Refetch on window focus
  useEffect(() => {
    if (refetchOnWindowFocus && enabled) {
      const handleFocus = () => {
        execute(undefined, true);
      };

      window.addEventListener('focus', handleFocus);
      return () => window.removeEventListener('focus', handleFocus);
    }
  }, [refetchOnWindowFocus, execute, enabled]);

  // Refetch on reconnect
  useEffect(() => {
    if (refetchOnReconnect && enabled) {
      const handleOnline = () => {
        execute(undefined, true);
      };

      window.addEventListener('online', handleOnline);
      return () => window.removeEventListener('online', handleOnline);
    }
  }, [refetchOnReconnect, execute, enabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Manual refetch
  const refetch = useCallback((customOptions?: APIOptions) => {
    return execute(customOptions, true);
  }, [execute]);

  // Mutate data locally
  const mutate = useCallback((newData: T | null | ((prev: T | null) => T | null)) => {
    setState(prev => {
      const value = typeof newData === 'function' 
        ? (newData as any)(prev.data) 
        : newData;
      
      return {
        ...prev,
        data: value as T | null,
        lastUpdated: Date.now()
      };
    });
  }, []);

  // Reset state
  const reset = useCallback(() => {
    setState({
      data: (initialData ?? null) as T | null,
      loading: false,
      error: null,
      cached: false,
      fromCache: false,
      lastUpdated: null,
      refetching: false
    });
  }, [initialData]);

  return {
    ...state,
    execute,
    refetch,
    mutate,
    reset
  };
}

// Hook for multiple API calls
export function useMultiAPI<T = any>(
  endpoints: string[],
  options: UseAPIHookOptions<T[]> = {}
) {
  const [state, setState] = useState<{
    data: (T | null)[] | null;
    loading: boolean;
    errors: string[];
    completed: number;
    total: number;
  }>({
    data: null,
    loading: true,
    errors: [],
    completed: 0,
    total: endpoints.length
  });

  const execute = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, errors: [], completed: 0 }));

    const promises = endpoints.map(async (endpoint, index) => {
      try {
        const response = await apiClient.request<T>(endpoint, options);
        return { index, data: response.data, error: null };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return { index, data: null, error: errorMessage };
      }
    });

    const results = await Promise.allSettled(promises);
    
    const data: (T | null)[] = new Array(endpoints.length).fill(null);
    const errors: string[] = [];
    let completed = 0;

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const { index: resultIndex, data: resultData, error } = result.value;
        data[resultIndex] = resultData;
        if (error) errors.push(`Endpoint ${endpoints[resultIndex]}: ${error}`);
        completed++;
      } else {
        errors.push(`Endpoint ${endpoints[index]}: Request failed`);
      }
    });

    setState({
      data,
      loading: false,
      errors,
      completed,
      total: endpoints.length
    });

    return { data, errors, completed };
  }, [endpoints, options]);

  useEffect(() => {
    execute();
  }, [execute]);

  const refetch = useCallback(() => {
    return execute();
  }, [execute]);

  return {
    ...state,
    execute,
    refetch
  };
}

// Hook for API cache management
export function useAPICache() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const getStats = useCallback(async () => {
    setLoading(true);
    try {
      const cacheStats = await (apiClient as any).getCacheStats();
      setStats(cacheStats);
    } catch (error) {
      console.error('Failed to get cache stats:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearCache = useCallback(async (tags?: string[]) => {
    try {
      await apiClient.clearCache(tags);
      await getStats(); // Refresh stats
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }, [getStats]);

  const warmCache = useCallback(async (endpoints: string[]) => {
    try {
      await (apiClient as any).warmCache(endpoints);
      await getStats(); // Refresh stats
    } catch (error) {
      console.error('Failed to warm cache:', error);
    }
  }, [getStats]);

  useEffect(() => {
    getStats();
  }, [getStats]);

  return {
    stats,
    loading,
    getStats,
    clearCache,
    warmCache
  };
}

// Hook for paginated API calls
export function usePaginatedAPI<T = any>(
  endpoint: string,
  options: UseAPIHookOptions<{
    data: T[];
    pagination: {
      page: number;
      totalPages: number;
      totalItems: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> & {
    pageSize?: number;
    initialPage?: number;
  } = {}
) {
  const { pageSize = 10, initialPage = 1, ...apiOptions } = options;
  
  const [page, setPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);

  const paginatedEndpoint = `${endpoint}?page=${page}&limit=${pageSize}`;
  
  const apiState = useAPI<{
    data: T[];
    pagination: {
      page: number;
      totalPages: number;
      totalItems: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }>(paginatedEndpoint, {
    ...apiOptions,
    onSuccess: (data, response) => {
      setTotalPages(data.pagination.totalPages);
      setTotalItems(data.pagination.totalItems);
      (apiOptions as any).onSuccess?.(data, response);
    }
  });

  const nextPage = useCallback(() => {
    if (page < totalPages) {
      setPage(prev => prev + 1);
    }
  }, [page, totalPages]);

  const prevPage = useCallback(() => {
    if (page > 1) {
      setPage(prev => prev - 1);
    }
  }, [page]);

  const goToPage = useCallback((newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  }, [totalPages]);

  return {
    ...apiState,
    page,
    totalPages,
    totalItems,
    pageSize,
    nextPage,
    prevPage,
    goToPage,
    setPage
  };
}

// Export types
export type { UseAPIState, UseAPIHookOptions };