import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  withCredentials: true,
  xsrfCookieName: 'csrftoken',
  xsrfHeaderName: 'X-CSRFToken',
});

// Add interceptor to handle global errors if needed
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If not logged in and not on login page, we can handle it
    if (error.response && error.response.status === 401 && !window.location.pathname.endsWith('/login')) {
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
