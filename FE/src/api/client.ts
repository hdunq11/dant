import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL } from '../config';

const STORAGE_ACCESS = 'concert_access';
const STORAGE_REFRESH = 'concert_refresh';

export function getStoredTokens() {
  return {
    access: localStorage.getItem(STORAGE_ACCESS),
    refresh: localStorage.getItem(STORAGE_REFRESH),
  };
}

export function setStoredTokens(access: string, refresh: string) {
  localStorage.setItem(STORAGE_ACCESS, access);
  localStorage.setItem(STORAGE_REFRESH, refresh);
}

export function clearStoredTokens() {
  localStorage.removeItem(STORAGE_ACCESS);
  localStorage.removeItem(STORAGE_REFRESH);
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const { refresh } = getStoredTokens();
  if (!refresh) return null;
  try {
    const res = await axios.post(`${API_BASE_URL}api/token/refresh/`, { refresh });
    const access = res.data.access as string;
    localStorage.setItem(STORAGE_ACCESS, access);
    return access;
  } catch {
    clearStoredTokens();
    return null;
  }
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const { access } = getStoredTokens();
  if (access && config.headers) {
    config.headers.Authorization = `Bearer ${access}`;
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }
      const newAccess = await refreshPromise;
      if (newAccess && original.headers) {
        original.headers.Authorization = `Bearer ${newAccess}`;
        return api(original);
      }
    }
    return Promise.reject(error);
  }
);

export function getApiErrorMessage(err: unknown, fallback = 'Đã có lỗi xảy ra'): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as Record<string, unknown> | undefined;
    if (data?.error && typeof data.error === 'string') return data.error;
    if (data?.detail && typeof data.detail === 'string') return data.detail;
    if (typeof data === 'object' && data) {
      const first = Object.values(data)[0];
      if (Array.isArray(first) && typeof first[0] === 'string') return first[0];
      if (typeof first === 'string') return first;
    }
    return err.message || fallback;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}
