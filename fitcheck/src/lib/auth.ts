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
      console.log('[Auth] Generating user token...');
      const { data, userErrors } = await generateUserToken();

      if (userErrors && userErrors.length > 0) {
        console.warn('[Auth] Failed to generate user token:', userErrors);
        console.warn('[Auth] This is expected in local development - backend will skip auth');
        // Return dummy headers for local development
        return {
          'Authorization': 'Bearer dev-token',
          'X-User-State': 'DEVELOPMENT',
        };
      }

      if (!data.token) {
        console.warn('[Auth] No token received - using development mode');
        // Return dummy headers for local development
        return {
          'Authorization': 'Bearer dev-token',
          'X-User-State': 'DEVELOPMENT',
        };
      }

      console.log('[Auth] Token generated successfully, userState:', data.userState);
      return {
        'Authorization': `Bearer ${data.token}`,
        'X-User-State': data.userState || 'UNKNOWN',
      };
    } catch (error) {
      console.warn('[Auth] Error getting auth headers (using dev mode):', error);
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
