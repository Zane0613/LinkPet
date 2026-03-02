import axios from 'axios';
import { Capacitor } from '@capacitor/core';

function getBaseURL() {
  if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:7860/api/v1';
  }
  return process.env.NEXT_PUBLIC_API_URL || '/api/v1';
}

const api = axios.create({
  baseURL: getBaseURL(),
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
