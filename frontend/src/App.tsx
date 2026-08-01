import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { store } from './store/store';
import theme from './theme';
import { wsService } from './services/websocket';
import { useSelector } from 'react-redux';
import { RootState } from './store/store';

// Error Boundary
import ErrorBoundary from './components/ErrorBoundary';
import ErrorFallback from './components/ErrorFallback';

// Error Pages
import NotFound from './pages/Errors/NotFound';
import ServerError from './pages/Errors/ServerError';

// Layout
import Layout from './components/Layout/Layout';
import { MessageList } from './components/Messages/MessageList';
import { MessageForm } from './components/Messages/MessageForm';
import { MessageDetail } from './components/Messages/MessageDetail';

// Auth Pages
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import RegisterStep1 from './pages/Auth/RegisterStep1';
import VerifyPage from './pages/Auth/VerifyPage';
import CreateUsername from './pages/Auth/CreateUsername';

// Dashboard Pages
import Dashboard from './pages/Dashboard/Dashboard';
import Campaigns from './pages/Campaigns/Campaigns';
import CreateCampaign from './pages/Campaigns/CreateCampaign';
import CampaignDetails from './pages/Campaigns/CampaignDetails';
import Contacts from './pages/Contacts/Contacts';
import Analytics from './pages/Analytics/Analytics';
import Settings from './pages/Settings/Settings';
import BillingSettings from './pages/Settings/BillingSettings';
import BuyCredits from './pages/Billing/BuyCredits';
import Transactions from './pages/Billing/Transactions';
import ForgotPassword from './pages/Auth/ForgotPassword';
import ResetPassword from './pages/Auth/ResetPassword';
import NotificationsPage from './pages/Notifications/NotificationsPage';
import GroupsPage from './pages/Groups/GroupsPage';
import GroupDetails from './pages/Groups/GroupDetails';
import UsageLimits from './pages/Settings/UsageLimits';
import TwoFactorAuth from './pages/Settings/TwoFactorAuth';

// NEW: Template Pages
import Templates from './pages/Templates/Templates';
import TemplateForm from './pages/Templates/TemplateForm';
import TemplateDetails from './pages/Templates/TemplateDetails';

// Auth Guard
const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('token');
  return token ? <>{children}</> : <Navigate to="/login" />;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('token');
  return !token ? <>{children}</> : <Navigate to="/dashboard" />;
};

// WebSocket connection manager
const WebSocketManager: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = React.useState<string | null>(localStorage.getItem('token'));
  const isAuthenticated = !!token;

  // Listen for storage events (for multi-tab support)
  useEffect(() => {
    const handleStorageChange = () => {
      setToken(localStorage.getItem('token'));
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    if (isAuthenticated && token) {
      console.log('🔌 Connecting WebSocket...');
      wsService.connect(token);

      const handleConnectionStatus = (status: any) => {
        console.log('📡 WebSocket status:', status);
      };

      const handleConnectionError = (error: any) => {
        console.error('❌ WebSocket error:', error);
      };

      wsService.on('connection:status', handleConnectionStatus);
      wsService.on('connection:error', handleConnectionError);

      return () => {
        console.log('🔌 Disconnecting WebSocket...');
        wsService.off('connection:status', handleConnectionStatus);
        wsService.off('connection:error', handleConnectionError);
        wsService.disconnect();
      };
    }
  }, [isAuthenticated, token]);

  return <>{children}</>;
};

function App() {
  return (
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter>
          <ErrorBoundary>
            <WebSocketManager>
              <Routes>
                {/* Public Routes */}
                <Route
                  path="/login"
                  element={
                    <PublicRoute>
                      <ErrorBoundary fallback={<ErrorFallback message="Failed to load login page" />}>
                        <Login />
                      </ErrorBoundary>
                    </PublicRoute>
                  }
                />
                <Route 
                  path="/register" 
                  element={
                    <PublicRoute>
                      <ErrorBoundary fallback={<ErrorFallback message="Failed to load registration page" />}>
                        <RegisterStep1 />
                      </ErrorBoundary>
                    </PublicRoute>
                  } 
                />
                <Route 
                  path="/verify" 
                  element={
                    <PublicRoute>
                      <ErrorBoundary fallback={<ErrorFallback message="Failed to load verification page" />}>
                        <VerifyPage />
                      </ErrorBoundary>
                    </PublicRoute>
                  } 
                />
                <Route 
                  path="/create-username" 
                  element={
                    <PublicRoute>
                      <ErrorBoundary fallback={<ErrorFallback message="Failed to load username creation page" />}>
                        <CreateUsername />
                      </ErrorBoundary>
                    </PublicRoute>
                  } 
                />
                <Route
                  path="/register"
                  element={
                    <PublicRoute>
                      <ErrorBoundary fallback={<ErrorFallback message="Failed to load registration page" />}>
                        <Register />
                      </ErrorBoundary>
                    </PublicRoute>
                  }
                />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />

                {/* Private Routes */}
                <Route
                  path="/"
                  element={
                    <PrivateRoute>
                      <ErrorBoundary fallback={<ErrorFallback message="Failed to load layout" />}>
                        <Layout />
                      </ErrorBoundary>
                    </PrivateRoute>
                  }
                >
                  <Route index element={<Navigate to="/dashboard" />} />
                  
                  {/* Dashboard */}
                  <Route 
                    path="dashboard" 
                    element={
                      <ErrorBoundary fallback={<ErrorFallback message="Failed to load dashboard" />}>
                        <Dashboard />
                      </ErrorBoundary>
                    } 
                  />
                  
                  {/* Campaign Routes */}
                  <Route 
                    path="campaigns" 
                    element={
                      <ErrorBoundary fallback={<ErrorFallback message="Failed to load campaigns" />}>
                        <Campaigns />
                      </ErrorBoundary>
                    } 
                  />
                  <Route 
                    path="campaigns/create" 
                    element={
                      <ErrorBoundary fallback={<ErrorFallback message="Failed to load campaign creator" />}>
                        <CreateCampaign />
                      </ErrorBoundary>
                    } 
                  />
                  <Route 
                    path="campaigns/:id" 
                    element={
                      <ErrorBoundary fallback={<ErrorFallback message="Failed to load campaign details" />}>
                        <CampaignDetails />
                      </ErrorBoundary>
                    } 
                  />
                  
                  {/* Contact Routes */}
                  <Route 
                    path="contacts" 
                    element={
                      <ErrorBoundary fallback={<ErrorFallback message="Failed to load contacts" />}>
                        <Contacts />
                      </ErrorBoundary>
                    } 
                  />
                  
                  {/* Group Routes */}
                  <Route 
                    path="groups" 
                    element={
                      <ErrorBoundary fallback={<ErrorFallback message="Failed to load groups" />}>
                        <GroupsPage />
                      </ErrorBoundary>
                    } 
                  />
                  <Route 
                    path="groups/:id" 
                    element={
                      <ErrorBoundary fallback={<ErrorFallback message="Failed to load group details" />}>
                        <GroupDetails />
                      </ErrorBoundary>
                    } 
                  />
                  
                  {/* Analytics */}
                  <Route 
                    path="analytics" 
                    element={
                      <ErrorBoundary fallback={<ErrorFallback message="Failed to load analytics" />}>
                        <Analytics />
                      </ErrorBoundary>
                    } 
                  />
                  
                  {/* NEW: Template Routes */}
                  <Route 
                    path="templates" 
                    element={
                      <ErrorBoundary fallback={<ErrorFallback message="Failed to load templates" />}>
                        <Templates />
                      </ErrorBoundary>
                    } 
                  />
                  <Route 
                    path="templates/create" 
                    element={
                      <ErrorBoundary fallback={<ErrorFallback message="Failed to load template form" />}>
                        <TemplateForm />
                      </ErrorBoundary>
                    } 
                  />
                  <Route 
                    path="templates/edit/:id" 
                    element={
                      <ErrorBoundary fallback={<ErrorFallback message="Failed to load template form" />}>
                        <TemplateForm />
                      </ErrorBoundary>
                    } 
                  />
                  <Route 
                    path="templates/:id" 
                    element={
                      <ErrorBoundary fallback={<ErrorFallback message="Failed to load template details" />}>
                        <TemplateDetails />
                      </ErrorBoundary>
                    } 
                  />
                  
                  {/* Settings Routes */}
                  <Route 
                    path="settings" 
                    element={
                      <ErrorBoundary fallback={<ErrorFallback message="Failed to load settings" />}>
                        <Settings />
                      </ErrorBoundary>
                    } 
                  />
                  <Route 
                    path="settings/usage" 
                    element={
                      <ErrorBoundary fallback={<ErrorFallback message="Failed to load usage limits" />}>
                        <UsageLimits />
                      </ErrorBoundary>
                    } 
                  />
                  <Route 
                    path="settings/2fa" 
                    element={
                      <ErrorBoundary fallback={<ErrorFallback message="Failed to load 2FA settings" />}>
                        <TwoFactorAuth />
                      </ErrorBoundary>
                    } 
                  />
                  
                  {/* Billing Routes */}
                  <Route 
                    path="billing" 
                    element={
                      <ErrorBoundary fallback={<ErrorFallback message="Failed to load billing" />}>
                        <BillingSettings />
                      </ErrorBoundary>
                    } 
                  />
                  <Route 
                    path="settings/billing" 
                    element={
                      <ErrorBoundary fallback={<ErrorFallback message="Failed to load billing settings" />}>
                        <BillingSettings />
                      </ErrorBoundary>
                    } 
                  />
                  <Route 
                    path="buy-credits" 
                    element={
                      <ErrorBoundary fallback={<ErrorFallback message="Failed to load buy credits page" />}>
                        <BuyCredits />
                      </ErrorBoundary>
                    } 
                  />
                  <Route 
                    path="transactions" 
                    element={
                      <ErrorBoundary fallback={<ErrorFallback message="Failed to load transactions" />}>
                        <Transactions />
                      </ErrorBoundary>
                    } 
                  />
                  
                  {/* Notifications */}
                  <Route 
                    path="notifications" 
                    element={
                      <ErrorBoundary fallback={<ErrorFallback message="Failed to load notifications" />}>
                        <NotificationsPage />
                      </ErrorBoundary>
                    } 
                  />
                  
                  {/* Message Routes */}
                  <Route 
                    path="messages" 
                    element={
                      <ErrorBoundary fallback={<ErrorFallback message="Failed to load messages" />}>
                        <MessageList />
                      </ErrorBoundary>
                    } 
                  />
                  <Route 
                    path="messages/new" 
                    element={
                      <ErrorBoundary fallback={<ErrorFallback message="Failed to load message form" />}>
                        <MessageForm />
                      </ErrorBoundary>
                    } 
                  />
                  <Route 
                    path="messages/edit/:id" 
                    element={
                      <ErrorBoundary fallback={<ErrorFallback message="Failed to load message form" />}>
                        <MessageForm />
                      </ErrorBoundary>
                    } 
                  />
                  <Route 
                    path="messages/:id" 
                    element={
                      <ErrorBoundary fallback={<ErrorFallback message="Failed to load message details" />}>
                        <MessageDetail />
                      </ErrorBoundary>
                    } 
                  />
                </Route>

                {/* Error Routes */}
                <Route path="/404" element={<NotFound />} />
                <Route path="/500" element={<ServerError />} />
                
                {/* Catch-all route - 404 */}
                <Route path="*" element={<Navigate to="/404" replace />} />
              </Routes>
            </WebSocketManager>
          </ErrorBoundary>
        </BrowserRouter>
      </ThemeProvider>
    </Provider>
  );
}

export default App;