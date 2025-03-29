import { useEffect, useState, createContext, useContext, ReactNode } from 'react';
import { Snackbar, Alert, AlertColor } from '@mui/material';

// Define the notification types
interface Notification {
  id: number;
  message: string;
  severity: AlertColor;
  autoHideDuration?: number;
}

// Define the context interface
interface ErrorHandlerContextType {
  notifications: Notification[];
  showNotification: (message: string, severity?: AlertColor, autoHideDuration?: number) => void;
  showError: (message: string, autoHideDuration?: number) => void;
  showSuccess: (message: string, autoHideDuration?: number) => void;
  showWarning: (message: string, autoHideDuration?: number) => void;
  showInfo: (message: string, autoHideDuration?: number) => void;
  clearNotifications: () => void;
}

// Create the context with a default value
const ErrorHandlerContext = createContext<ErrorHandlerContextType>({
  notifications: [],
  showNotification: () => {},
  showError: () => {},
  showSuccess: () => {},
  showWarning: () => {},
  showInfo: () => {},
  clearNotifications: () => {},
});

// Custom hook to use the context
export const useErrorHandler = () => useContext(ErrorHandlerContext);

interface ErrorHandlerProviderProps {
  children: ReactNode;
}

/**
 * Global error handler provider component
 */
export const ErrorHandlerProvider = ({ children }: ErrorHandlerProviderProps) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [nextId, setNextId] = useState(1);

  // Add a new notification
  const showNotification = (
    message: string, 
    severity: AlertColor = 'info',
    autoHideDuration = 6000
  ) => {
    const notification: Notification = {
      id: nextId,
      message,
      severity,
      autoHideDuration,
    };
    
    setNotifications(prev => [...prev, notification]);
    setNextId(prevId => prevId + 1);
    
    return notification.id;
  };

  // Shorthand methods for different notification types
  const showError = (message: string, autoHideDuration = 6000) => 
    showNotification(message, 'error', autoHideDuration);
    
  const showSuccess = (message: string, autoHideDuration = 4000) => 
    showNotification(message, 'success', autoHideDuration);
    
  const showWarning = (message: string, autoHideDuration = 5000) => 
    showNotification(message, 'warning', autoHideDuration);
    
  const showInfo = (message: string, autoHideDuration = 4000) => 
    showNotification(message, 'info', autoHideDuration);

  // Clear all notifications
  const clearNotifications = () => {
    setNotifications([]);
  };

  // Remove a notification when it's closed
  const handleClose = (id: number) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  // Listen for unhandled promise rejections
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled Promise Rejection:', event.reason);
      showError(`Unhandled error: ${event.reason?.message || 'Unknown error'}`);
      event.preventDefault();
    };

    // Listen for auth events
    const handleSessionExpired = () => {
      showWarning('Your session has expired. Please login again.');
    };

    // Add event listeners
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('auth:sessionExpired', handleSessionExpired);

    // Clean up event listeners
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('auth:sessionExpired', handleSessionExpired);
    };
  }, []);

  return (
    <ErrorHandlerContext.Provider
      value={{
        notifications,
        showNotification,
        showError,
        showSuccess,
        showWarning,
        showInfo,
        clearNotifications,
      }}
    >
      {children}
      
      {/* Display notifications as Snackbars */}
      {notifications.map((notification) => (
        <Snackbar
          key={notification.id}
          open={true}
          autoHideDuration={notification.autoHideDuration}
          onClose={() => handleClose(notification.id)}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          sx={{ mt: 8, mr: 2 }} // Add top margin to avoid overlap with AppBar
        >
          <Alert
            onClose={() => handleClose(notification.id)}
            severity={notification.severity}
            variant="filled"
            sx={{ width: '100%', maxWidth: '400px' }}
          >
            {notification.message}
          </Alert>
        </Snackbar>
      ))}
    </ErrorHandlerContext.Provider>
  );
};

/**
 * Standalone component for global notifications
 */
export default function GlobalErrorHandler() {
  // Setup global handlers for unexpected errors
  useEffect(() => {
    const originalConsoleError = console.error;
    
    // Override console.error to catch unhandled errors
    console.error = (...args) => {
      // Call the original console.error
      originalConsoleError.apply(console, args);
      
      // Don't show UI error for React internal errors
      const errorString = args.join(' ');
      if (errorString.includes('React does not recognize the')) {
        return;
      }
    };
    
    return () => {
      // Restore the original console.error when component unmounts
      console.error = originalConsoleError;
    };
  }, []);
  
  return null; // This component doesn't render anything
} 