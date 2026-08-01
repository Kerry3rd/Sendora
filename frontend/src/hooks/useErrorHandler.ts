import { useState, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { addNotification } from '../store/slices/uiSlice';
import { handleApiError, isValidationError } from '../utils/errorHandler';

interface UseErrorHandlerReturn {
  error: string | null;
  setError: (error: any) => void;
  clearError: () => void;
  handleError: (error: any, options?: { showNotification?: boolean; fallback?: string }) => void;
}

export const useErrorHandler = (): UseErrorHandlerReturn => {
  const [error, setErrorState] = useState<string | null>(null);
  const dispatch = useDispatch();

  const handleError = useCallback(
    (error: any, options: { showNotification?: boolean; fallback?: string } = {}) => {
      const { showNotification = true, fallback } = options;
      
      // Handle API errors
      const apiError = handleApiError(error);
      
      // Set error message
      const errorMessage = fallback || apiError.message;
      setErrorState(errorMessage);
      
      // Show notification if needed
      if (showNotification) {
        dispatch(
          addNotification({
            type: 'error',
            message: errorMessage,
          })
        );
      }

      // Log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Error caught:', error);
      }
    },
    [dispatch]
  );

  const clearError = useCallback(() => {
    setErrorState(null);
  }, []);

  const setError = useCallback((error: any) => {
    if (typeof error === 'string') {
      setErrorState(error);
    } else {
      handleError(error);
    }
  }, [handleError]);

  return {
    error,
    setError,
    clearError,
    handleError,
  };
};