// In development, default to localhost. In production, default to same-origin (empty string).
const isDev = import.meta.env.MODE === 'development';
export const API_URL = import.meta.env.VITE_API_URL || (isDev ? 'http://localhost:5000' : '');
