import { useGenerateUserToken } from '@shopify/shop-minis-react';

/**
 * Hook to manage Shop Minis user authentication
 * Generates and caches user tokens for API requests
 */
export function useShopAuth() {
  const { generateUserToken } = useGenerateUserToken();

  /**
   * Get authentication headers for API requests
   * Generates a fresh token if needed (cached internally by Shop Minis SDK)
   */
  const getAuthHeaders = async (): Promise<Record<string, string>> => {
    try {
      const { data, userErrors } = await generateUserToken();

      if (userErrors && userErrors.length > 0) {
        // Return dummy headers for local development
        return {
          'Authorization': 'Bearer dev-token',
          'X-User-State': 'DEVELOPMENT',
        };
      }

      if (!data.token) {
        // Return dummy headers for local development
        return {
          'Authorization': 'Bearer dev-token',
          'X-User-State': 'DEVELOPMENT',
        };
      }

      return {
        'Authorization': `Bearer ${data.token}`,
        'X-User-State': data.userState || 'UNKNOWN',
      };
    } catch (error) {
      // Return dummy headers for local development
      return {
        'Authorization': 'Bearer dev-token',
        'X-User-State': 'DEVELOPMENT',
      };
    }
  };

  /**
   * Make an authenticated fetch request
   */
  const authenticatedFetch = async (
    url: string,
    options: RequestInit = {}
  ): Promise<Response> => {
    const authHeaders = await getAuthHeaders();

    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        ...authHeaders,
      },
    });

    return response;
  };

  /**
   * Make an authenticated fetch request with timeout
   */
  const authenticatedFetchWithTimeout = async (
    url: string,
    options: RequestInit = {},
    timeoutMs: number = 15000
  ): Promise<Response> => {
    const authHeaders = await getAuthHeaders();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          ...authHeaders,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeoutMs}ms`);
      }
      throw error;
    }
  };

  return {
    getAuthHeaders,
    authenticatedFetch,
    authenticatedFetchWithTimeout,
  };
}
