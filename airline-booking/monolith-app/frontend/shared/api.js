/**
 * API Service Layer
 */
import axios from 'axios';

// API base URL - uses relative path to work with Flask backend
const API_BASE_URL = '';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear token and redirect to login
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      // You may want to emit an event or redirect here
    }
    return Promise.reject(error);
  }
);

/**
 * API Service Object
 */
export const API = {
  // Auth endpoints
  auth: {
    register: (email, password, userId) => 
      apiClient.post('/auth/register', { email, password, userId }),
    
    login: (email, password) => 
      apiClient.post('/auth/login', { email, password }),
    
    getCurrentUser: () => 
      apiClient.get('/auth/me'),
    
    listUsers: () => 
      apiClient.get('/auth/users')
  },

  // Flight catalog endpoints
  flights: {
    search: (departureCode, arrivalCode, departureDate) => 
      apiClient.get('/flights/search', {
        params: { departureCode, arrivalCode, departureDate }
      }),
    
    getById: (flightId) => 
      apiClient.get(`/flights/${flightId}`),
    
    reserve: (flightId) => 
      apiClient.post(`/flights/${flightId}/reserve`),
    
    release: (flightId) => 
      apiClient.post(`/flights/${flightId}/release`)
  },

  // Booking endpoints
  bookings: {
    create: (outboundFlightId, chargeId, name) => 
      apiClient.post('/bookings', { outboundFlightId, chargeId, name }),
    
    getById: (bookingId) => 
      apiClient.get(`/bookings/${bookingId}`),
    
    confirm: (bookingId) => 
      apiClient.post(`/bookings/${bookingId}/confirm`),
    
    cancel: (bookingId) => 
      apiClient.post(`/bookings/${bookingId}/cancel`),
    
    getByCustomer: (customerId, status) => 
      apiClient.get(`/customers/${customerId}/bookings`, {
        params: status ? { status } : {}
      })
  },

  // Payment endpoints
  payments: {
    collect: (chargeId) => 
      apiClient.post('/payments/collect', { chargeId }),
    
    refund: (chargeId) => 
      apiClient.post('/payments/refund', { chargeId }),
    
    getById: (chargeId) => 
      apiClient.get(`/payments/${chargeId}`)
  },

  // Loyalty endpoints
  loyalty: {
    getByCustomer: (customerId) => 
      apiClient.get(`/loyalty/${customerId}`),
    
    addPoints: (customerId, points) => 
      apiClient.post(`/loyalty/${customerId}/points`, { points })
  }
};

/**
 */
export const Auth = {
  /**
   * Sign in user
   */
  signIn: async (username, password) => {
    try {
      const response = await API.auth.login(username, password);
      const { access_token, user } = response.data;
      
      // Store token and user info
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('user', JSON.stringify(user));
      
      return {
        attributes: {
          sub: user.sub,
          email: user.email
        },
        username: user.email,
        signInUserSession: {
          accessToken: {
            jwtToken: access_token
          }
        }
      };
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Login failed');
    }
  },

  /**
   * Sign out user
   */
  signOut: async () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
  },

  /**
   * Get current authenticated user
   */
  currentAuthenticatedUser: async () => {
    const token = localStorage.getItem('access_token');
    const userStr = localStorage.getItem('user');
    
    if (!token || !userStr) {
      throw new Error('No current user');
    }

    try {
      // Verify token is still valid by calling the backend
      const response = await API.auth.getCurrentUser();
      const user = response.data;
      
      return {
        attributes: {
          sub: user.sub,
          email: user.email
        },
        username: user.email,
        signInUserSession: {
          accessToken: {
            jwtToken: token
          }
        }
      };
    } catch (error) {
      // Token expired or invalid
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      throw new Error('Session expired');
    }
  },

  /**
   * Sign up new user
   */
  signUp: async ({ username, password, attributes }) => {
    try {
      const response = await API.auth.register(username, password, attributes?.sub);
      return {
        user: response.data,
        userConfirmed: true
      };
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Registration failed');
    }
  }
};

export default API;
