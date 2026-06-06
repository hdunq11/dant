/**
 * Dev: để trống → request `/api/...` qua Vite proxy → Django :8000
 * Prod: set VITE_API_URL=http://your-be-host:8000/
 */
export const API_BASE_URL: string = import.meta.env.VITE_API_URL ?? '';