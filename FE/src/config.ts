/** Dev: dùng proxy Vite (để trống). Prod: set VITE_API_URL=http://host:8000/ */
export const API_BASE_URL: string = import.meta.env.VITE_API_URL ?? '';
