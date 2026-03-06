import axios from 'axios';

// Default to localhost for dev if env var not set
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002/api/v1';

export const getBaseURL = () => {
    return API_BASE_URL;
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add interceptor for auth token if needed
api.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
        const userId = localStorage.getItem('linkpet_user_id');
        if (userId) {
            config.headers['X-User-ID'] = userId;
        }
    }
    return config;
});

export default api;
