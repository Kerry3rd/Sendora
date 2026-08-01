import api from './api';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  company: string | null;           // ✅ Add this
  username?: string | null;
  role: 'super_admin' | 'admin' | 'user';
  credits: number;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  isActive: boolean;
  settings?: {                       // ✅ Add this
    notifications?: {
      emailNotifications?: boolean;
      smsNotifications?: boolean;
      campaignUpdates?: boolean;
      billingUpdates?: boolean;
      systemUpdates?: boolean;
    };
    preferences?: {
      defaultSenderId?: string;
      smsSignature?: string;
      language?: string;
      timezone?: string;
    };
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface LoginCredentials {
  username?: string;
  email?: string;
  phone?: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  company?: string;
}

class AuthService {
  async login(credentials: LoginCredentials) {
    try {
      console.log('🔐 Attempting login with:', credentials);
      
      const response = await api.post('/verification/login', credentials);
      console.log('📦 Login response:', response.data);
      
      if (response.data.success) {
        const { token, user } = response.data.data;
        
        // Ensure user object has all fields
        const userWithDefaults = {
          company: null,
          settings: {},
          ...user
        };
        
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userWithDefaults));
        
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        return response.data;
      }
      
      throw new Error(response.data.message || 'Login failed');
    } catch (error: any) {
      console.error('❌ Login error:', error.response?.data || error.message);
      throw error;
    }
  }

  async register(data: RegisterData) {
    try {
      console.log('📝 Attempting registration for:', data.email);
      
      const response = await api.post('/verification/register/initiate', data);
      console.log('📦 Register response:', response.data);
      
      return response.data;
    } catch (error: any) {
      console.error('❌ Register error:', error.response?.data || error.message);
      throw error;
    }
  }

  async logout() {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.clear();
      delete api.defaults.headers.common['Authorization'];
      window.location.href = '/login';
    }
  }

  async getCurrentUser() {
    try {
      const token = this.getToken();
      if (!token) return null;
      
      const response = await api.get('/auth/me');
      if (response.data.success) {
        const user = response.data.data.user;
        // Ensure user has all fields
        const userWithDefaults = {
          company: null,
          settings: {},
          ...user
        };
        localStorage.setItem('user', JSON.stringify(userWithDefaults));
        return userWithDefaults;
      }
      return null;
    } catch (error) {
      console.error('Failed to get current user:', error);
      return null;
    }
  }

  isAuthenticated() {
    const token = this.getToken();
    if (!token) return false;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      
      if (payload.exp < currentTime) {
        this.logout();
        return false;
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }

  getUser(): User | null {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        // Ensure user has default fields
        return {
          company: null,
          settings: {},
          ...user
        };
      } catch {
        return null;
      }
    }
    return null;
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  hasRole(roles: string | string[]) {
    const user = this.getUser();
    if (!user) return false;
    
    if (Array.isArray(roles)) {
      return roles.includes(user.role);
    }
    return user.role === roles;
  }
}

const authService = new AuthService();
export default authService;
