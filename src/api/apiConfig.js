/**
 * BiteBox Centralized API Configuration & Client
 * Provides consistent base URL, auth token handling, and robust fetch utilities.
 */

// Normalize base URL: strip trailing slashes
const rawApiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5002/api/v1').replace(/\/+$/, '');

// Canonical API_BASE_URL (defaults to http://localhost:5002/api/v1)
export const API_BASE_URL = rawApiUrl;

// Base root without /v1 (e.g. http://localhost:5002/api)
export const API_ROOT = API_BASE_URL.replace(/\/v1$/, '');

/**
 * Retrieve saved auth token from localStorage or sessionStorage
 */
export function getAuthToken() {
  try {
    return localStorage.getItem('bitebox_token') || sessionStorage.getItem('bitebox_token') || null;
  } catch {
    return null;
  }
}

/**
 * Save auth token
 */
export function setAuthToken(token) {
  try {
    if (token) {
      localStorage.setItem('bitebox_token', token);
      sessionStorage.setItem('bitebox_token', token);
    } else {
      clearAuthToken();
    }
  } catch (err) {
    console.warn('Unable to persist auth token:', err);
  }
}

/**
 * Clear auth token
 */
export function clearAuthToken() {
  try {
    localStorage.removeItem('bitebox_token');
    sessionStorage.removeItem('bitebox_token');
  } catch (err) {
    console.warn('Unable to remove auth token:', err);
  }
}

/**
 * Build request headers with JSON and Bearer auth token if present
 */
export function getAuthHeaders(customHeaders = {}) {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...customHeaders,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

/**
 * Centralized fetch helper for BiteBox API endpoints.
 * Automatically handles baseUrl, prevents double /v1 prefixes, attaches credentials, and adds auth token.
 *
 * @param {string} endpoint - Relative path (e.g. '/orders', '/v1/orders', '/auth/login')
 * @param {RequestInit} [options] - Standard fetch options
 * @returns {Promise<Response>}
 */
export async function apiFetch(endpoint, options = {}) {
  let cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  // If API_BASE_URL already ends with /v1 and endpoint starts with /v1/, remove the redundant /v1
  if (API_BASE_URL.endsWith('/v1') && cleanEndpoint.startsWith('/v1/')) {
    cleanEndpoint = cleanEndpoint.slice(3); // leaves '/...'
  }

  const url = `${API_BASE_URL}${cleanEndpoint}`;

  const headers = getAuthHeaders(options.headers || {});

  const config = {
    ...options,
    credentials: options.credentials || 'include',
    headers,
  };

  return fetch(url, config);
}
