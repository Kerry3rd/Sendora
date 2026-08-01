import { AxiosError } from 'axios';

export interface ApiError {
  status: number;
  message: string;
  errors?: any[];
  data?: any;
}

export class AppError extends Error {
  status: number;
  errors?: any[];

  constructor(message: string, status: number = 500, errors?: any[]) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.errors = errors;
  }
}

export const handleApiError = (error: any): ApiError => {
  // Axios error
  if (error.isAxiosError) {
    const axiosError = error as AxiosError<any>;
    
    if (axiosError.response) {
      // Server responded with error
      return {
        status: axiosError.response.status,
        message: axiosError.response.data?.message || 'Server error occurred',
        errors: axiosError.response.data?.errors,
        data: axiosError.response.data,
      };
    } else if (axiosError.request) {
      // Request made but no response
      return {
        status: 503,
        message: 'Unable to connect to server. Please check your internet connection.',
      };
    }
  }

  // Network error
  if (error.message === 'Network Error') {
    return {
      status: 503,
      message: 'Network error. Please check your internet connection.',
    };
  }

  // Timeout error
  if (error.code === 'ECONNABORTED') {
    return {
      status: 408,
      message: 'Request timeout. Please try again.',
    };
  }

  // Unknown error
  return {
    status: 500,
    message: error.message || 'An unexpected error occurred',
  };
};

export const isNetworkError = (error: any): boolean => {
  return !error.response && error.message === 'Network Error';
};

export const isAuthError = (error: any): boolean => {
  return error.response?.status === 401 || error.response?.status === 403;
};

export const isValidationError = (error: any): boolean => {
  return error.response?.status === 400 && error.response?.data?.errors;
};

export const getErrorMessage = (error: any, fallback: string = 'An error occurred'): string => {
  const apiError = handleApiError(error);
  return apiError.message || fallback;
};