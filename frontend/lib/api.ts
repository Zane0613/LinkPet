import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to inject the user ID
api.interceptors.request.use(
  (config) => {
    // Only access localStorage in client-side
    if (typeof window !== 'undefined') {
      const userId = localStorage.getItem('linkpet_user_id');
      if (userId) {
        config.headers['X-User-ID'] = userId;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
