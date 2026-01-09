/**
 * Authentication utility functions for token-based auth
 */

export interface AuthHeaders {
  'Authorization'?: string;
  'X-User-Email'?: string;
}

/**
 * Get authentication headers for API requests
 * Returns headers with Bearer token and email if available in localStorage
 */
export function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') {
    return {};
  }

  const token = localStorage.getItem('auth_token');
  const userEmail = localStorage.getItem('user_email');

  const headers: Record<string, string> = {};

  if (token && userEmail) {
    headers['Authorization'] = `Bearer ${token}`;
    headers['X-User-Email'] = userEmail;
  }

  return headers;
}

/**
 * Fetch current user with authentication headers
 */
export async function fetchCurrentUser(): Promise<any> {
  const headers = getAuthHeaders();

  const response = await fetch('/api/user/current', {
    credentials: 'include',
    cache: 'no-store',
    headers
  });

  if (response.ok) {
    const data = await response.json();
    return data.user || null;
  }

  return null;
}

/**
 * Check if user is logged in (has valid token)
 */
export function isLoggedIn(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const token = localStorage.getItem('auth_token');
  const userEmail = localStorage.getItem('user_email');

  return !!(token && userEmail);
}

/**
 * Clear authentication data (logout)
 */
export function clearAuth(): void {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.removeItem('auth_token');
  localStorage.removeItem('user_email');
}

/**
 * Store authentication data (login)
 */
export function storeAuth(token: string, email: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.setItem('auth_token', token);
  localStorage.setItem('user_email', email.toLowerCase());
}
