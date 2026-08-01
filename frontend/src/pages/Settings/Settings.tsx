import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  Divider,
  Switch,
  FormControlLabel,
  Alert,
  Snackbar,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tab,
  Tabs,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  InputAdornment,
  LinearProgress,
  Card,
  IconButton,
} from '@mui/material';
import {
  Person as PersonIcon,
  Security as SecurityIcon,
  Notifications as NotificationsIcon,
  Sms as SmsIcon,
  Api as ApiIcon,
  VpnKey as VpnKeyIcon,
  Save as SaveIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import SpeedIcon from '@mui/icons-material/Speed';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import UsageLimits from './UsageLimits';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const Settings: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ 
    open: false, 
    message: '', 
    severity: 'success' as 'success' | 'error' | 'info' | 'warning' 
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKeyDialogOpen, setApiKeyDialogOpen] = useState(false);
  
  // Get user from Redux store
  const reduxUser = useSelector((state: RootState) => state.auth.user);
  
  // Cast to any to avoid TypeScript errors (temporary fix)
  const user = reduxUser as any;

  // Profile form
  const [profile, setProfile] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    company: user?.company || '',
  });

  // Password form
  const [password, setPassword] = useState({
    current: '',
    new: '',
    confirm: '',
  });

  // Notification settings
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    smsNotifications: false,
    campaignUpdates: true,
    billingUpdates: true,
    systemUpdates: true,
  });

  // SMS settings
  const [smsSettings, setSmsSettings] = useState({
    defaultSenderId: 'AFRICASTKNG',
    smsSignature: '',
    allowInternational: true,
    autoRetryFailed: true,
    maxRetries: 3,
    deliveryReports: true,
  });

  useEffect(() => {
    if (user) {
      setProfile({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
        company: user.company || '',
      });
      
      setSmsSettings(prev => ({
        ...prev,
        defaultSenderId: user.settings?.preferences?.defaultSenderId || 'AFRICASTKNG',
        smsSignature: user.settings?.preferences?.smsSignature || '',
      }));
      
      setNotifications(prev => ({
        ...prev,
        ...user.settings?.notifications,
      }));
    }
  }, [user]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // API call would go here
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSnackbar({
        open: true,
        message: 'Profile updated successfully',
        severity: 'success',
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Failed to update profile',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.new !== password.confirm) {
      setSnackbar({
        open: true,
        message: 'New passwords do not match',
        severity: 'error',
      });
      return;
    }
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setPassword({ current: '', new: '', confirm: '' });
      setSnackbar({
        open: true,
        message: 'Password updated successfully',
        severity: 'success',
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Failed to update password',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationsSubmit = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSnackbar({
        open: true,
        message: 'Notification preferences updated',
        severity: 'success',
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Failed to update notification preferences',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSmsSettingsSubmit = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSnackbar({
        open: true,
        message: 'SMS settings updated',
        severity: 'success',
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Failed to update SMS settings',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateApiKey = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setApiKeyDialogOpen(false);
      setSnackbar({
        open: true,
        message: 'New API key generated successfully',
        severity: 'success',
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Failed to generate API key',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Settings
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 4 }}>
        Manage your account settings and preferences
      </Typography>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      <Paper sx={{ width: '100%' }}>
        <Tabs
          value={tabValue}
          onChange={(e, v) => setTabValue(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab icon={<PersonIcon />} label="Profile" iconPosition="start" />
          <Tab icon={<SecurityIcon />} label="Security" iconPosition="start" />
          <Tab icon={<NotificationsIcon />} label="Notifications" iconPosition="start" />
          <Tab icon={<SmsIcon />} label="SMS Settings" iconPosition="start" />
          <Tab icon={<ApiIcon />} label="API" iconPosition="start" />
          <Tab icon={<SpeedIcon />} label="Usage Limits" iconPosition="start" />
        </Tabs>

        {/* Profile Tab */}
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ maxWidth: 600 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
              <Avatar
                sx={{
                  width: 80,
                  height: 80,
                  bgcolor: 'primary.main',
                  fontSize: 32,
                  mr: 3,
                }}
              >
                {profile.firstName?.charAt(0)}{profile.lastName?.charAt(0)}
              </Avatar>
              <Box>
                <Typography variant="h6">
                  {profile.firstName} {profile.lastName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {profile.email}
                </Typography>
                <Chip
                  label={user?.role || 'user'}
                  size="small"
                  color="primary"
                  sx={{ mt: 1, textTransform: 'capitalize' }}
                />
              </Box>
            </Box>

            <form onSubmit={handleProfileSubmit}>
              <Grid container spacing={3}>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="First Name"
                    value={profile.firstName}
                    onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                    required
                    disabled={loading}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Last Name"
                    value={profile.lastName}
                    onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                    required
                    disabled={loading}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Email"
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    required
                    disabled={loading}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Phone Number"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    required
                    disabled={loading}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Company"
                    value={profile.company}
                    onChange={(e) => setProfile({ ...profile, company: e.target.value })}
                    disabled={loading}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={<SaveIcon />}
                    disabled={loading}
                  >
                    Save Changes
                  </Button>
                </Grid>
              </Grid>
            </form>
          </Box>
        </TabPanel>

        {/* Security Tab */}
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ maxWidth: 600 }}>
            <Typography variant="h6" gutterBottom>
              Change Password
            </Typography>
            <form onSubmit={handlePasswordSubmit}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Current Password"
                    type="password"
                    value={password.current}
                    onChange={(e) => setPassword({ ...password, current: e.target.value })}
                    required
                    disabled={loading}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="New Password"
                    type="password"
                    value={password.new}
                    onChange={(e) => setPassword({ ...password, new: e.target.value })}
                    required
                    disabled={loading}
                    helperText="Minimum 8 characters, at least one uppercase letter, one lowercase letter, and one number"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Confirm New Password"
                    type="password"
                    value={password.confirm}
                    onChange={(e) => setPassword({ ...password, confirm: e.target.value })}
                    required
                    disabled={loading}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={loading}
                  >
                    Update Password
                  </Button>
                </Grid>
              </Grid>
            </form>

            <Divider sx={{ my: 4 }} />

            <Typography variant="h6" gutterBottom>
              Two-Factor Authentication
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Add an extra layer of security to your account by enabling two-factor authentication.
            </Typography>
            <Button
              variant="outlined"
              startIcon={<VpnKeyIcon />}
              disabled
            >
              Enable 2FA (Coming Soon)
            </Button>
          </Box>
        </TabPanel>

        {/* Notifications Tab */}
        <TabPanel value={tabValue} index={2}>
          <Box sx={{ maxWidth: 600 }}>
            <Typography variant="h6" gutterBottom>
              Notification Preferences
            </Typography>
            
            <List>
              <ListItem>
                <ListItemText
                  primary="Email Notifications"
                  secondary="Receive notifications via email"
                />
                <ListItemSecondaryAction>
                  <Switch
                    edge="end"
                    checked={notifications.emailNotifications}
                    onChange={(e) => setNotifications({
                      ...notifications,
                      emailNotifications: e.target.checked,
                    })}
                    disabled={loading}
                  />
                </ListItemSecondaryAction>
              </ListItem>
              
              <ListItem>
                <ListItemText
                  primary="SMS Notifications"
                  secondary="Receive notifications via SMS"
                />
                <ListItemSecondaryAction>
                  <Switch
                    edge="end"
                    checked={notifications.smsNotifications}
                    onChange={(e) => setNotifications({
                      ...notifications,
                      smsNotifications: e.target.checked,
                    })}
                    disabled={loading}
                  />
                </ListItemSecondaryAction>
              </ListItem>
              
              <Divider sx={{ my: 2 }} />
              
              <ListItem>
                <ListItemText
                  primary="Campaign Updates"
                  secondary="Get notified when campaigns start, complete, or fail"
                />
                <ListItemSecondaryAction>
                  <Switch
                    edge="end"
                    checked={notifications.campaignUpdates}
                    onChange={(e) => setNotifications({
                      ...notifications,
                      campaignUpdates: e.target.checked,
                    })}
                    disabled={loading}
                  />
                </ListItemSecondaryAction>
              </ListItem>
              
              <ListItem>
                <ListItemText
                  primary="Billing Updates"
                  secondary="Receive invoices, payment confirmations, and low balance alerts"
                />
                <ListItemSecondaryAction>
                  <Switch
                    edge="end"
                    checked={notifications.billingUpdates}
                    onChange={(e) => setNotifications({
                      ...notifications,
                      billingUpdates: e.target.checked,
                    })}
                    disabled={loading}
                  />
                </ListItemSecondaryAction>
              </ListItem>
              
              <ListItem>
                <ListItemText
                  primary="System Updates"
                  secondary="Get notified about platform maintenance and new features"
                />
                <ListItemSecondaryAction>
                  <Switch
                    edge="end"
                    checked={notifications.systemUpdates}
                    onChange={(e) => setNotifications({
                      ...notifications,
                      systemUpdates: e.target.checked,
                    })}
                    disabled={loading}
                  />
                </ListItemSecondaryAction>
              </ListItem>
            </List>

            <Button
              variant="contained"
              onClick={handleNotificationsSubmit}
              disabled={loading}
              sx={{ mt: 2 }}
            >
              Save Preferences
            </Button>
          </Box>
        </TabPanel>

        {/* SMS Settings Tab */}
        <TabPanel value={tabValue} index={3}>
          <Box sx={{ maxWidth: 600 }}>
            <Typography variant="h6" gutterBottom>
              SMS Configuration
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Default Sender ID"
                  value={smsSettings.defaultSenderId}
                  onChange={(e) => setSmsSettings({
                    ...smsSettings,
                    defaultSenderId: e.target.value,
                  })}
                  helperText="Max 11 characters, letters and numbers only"
                  inputProps={{ maxLength: 11 }}
                  disabled={loading}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="SMS Signature (Optional)"
                  value={smsSettings.smsSignature}
                  onChange={(e) => setSmsSettings({
                    ...smsSettings,
                    smsSignature: e.target.value,
                  })}
                  helperText="This will be appended to all outgoing messages"
                  disabled={loading}
                />
              </Grid>
              
              <Grid item xs={12}>
                <FormControl fullWidth disabled={loading}>
                  <InputLabel>Maximum Retries</InputLabel>
                  <Select
                    value={smsSettings.maxRetries}
                    label="Maximum Retries"
                    onChange={(e) => setSmsSettings({
                      ...smsSettings,
                      maxRetries: e.target.value as number,
                    })}
                  >
                    <MenuItem value={0}>No retries</MenuItem>
                    <MenuItem value={1}>1 retry</MenuItem>
                    <MenuItem value={2}>2 retries</MenuItem>
                    <MenuItem value={3}>3 retries</MenuItem>
                    <MenuItem value={5}>5 retries</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={smsSettings.allowInternational}
                      onChange={(e) => setSmsSettings({
                        ...smsSettings,
                        allowInternational: e.target.checked,
                      })}
                      disabled={loading}
                    />
                  }
                  label="Allow International SMS"
                />
              </Grid>
              
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={smsSettings.autoRetryFailed}
                      onChange={(e) => setSmsSettings({
                        ...smsSettings,
                        autoRetryFailed: e.target.checked,
                      })}
                      disabled={loading}
                    />
                  }
                  label="Automatically retry failed messages"
                />
              </Grid>
              
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={smsSettings.deliveryReports}
                      onChange={(e) => setSmsSettings({
                        ...smsSettings,
                        deliveryReports: e.target.checked,
                      })}
                      disabled={loading}
                    />
                  }
                  label="Enable delivery reports"
                />
              </Grid>
            </Grid>

            <Button
              variant="contained"
              onClick={handleSmsSettingsSubmit}
              disabled={loading}
              sx={{ mt: 2 }}
            >
              Save SMS Settings
            </Button>
          </Box>
        </TabPanel>

        {/* API Tab */}
        <TabPanel value={tabValue} index={4}>
          <Box sx={{ maxWidth: 600 }}>
            <Typography variant="h6" gutterBottom>
              API Credentials
            </Typography>
            
            <Card variant="outlined" sx={{ mb: 3, p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  API Key
                </Typography>
                <Chip label="Production" size="small" color="success" />
              </Box>
              
              <TextField
                fullWidth
                value="••••••••••••••••••••••••"
                type={showApiKey ? 'text' : 'password'}
                InputProps={{
                  readOnly: true,
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowApiKey(!showApiKey)} edge="end">
                        {showApiKey ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                size="small"
                sx={{ mb: 2 }}
                disabled={loading}
              />
              
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="outlined"
                  onClick={() => setApiKeyDialogOpen(true)}
                  disabled={loading}
                >
                  Generate New Key
                </Button>
                <Button variant="outlined" disabled={loading}>
                  Copy
                </Button>
              </Box>
            </Card>

            <Typography variant="subtitle2" gutterBottom sx={{ mt: 3 }}>
              API Documentation
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Access our comprehensive API documentation to integrate your applications with our platform.
            </Typography>
            <Button
              variant="outlined"
              component="a"
              href="#"
              target="_blank"
              disabled={loading}
            >
              View API Documentation
            </Button>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={5}>
          <UsageLimits />
        </TabPanel>
      </Paper>

      {/* Generate API Key Dialog */}
      <Dialog open={apiKeyDialogOpen} onClose={() => setApiKeyDialogOpen(false)}>
        <DialogTitle>Generate New API Key</DialogTitle>
        <DialogContent>
          <Typography variant="body2" paragraph>
            Generating a new API key will invalidate your existing key. This action cannot be undone.
          </Typography>
          <Typography variant="body2" color="error">
            Are you sure you want to continue?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApiKeyDialogOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleGenerateApiKey}
            color="error"
            variant="contained"
            disabled={loading}
          >
            Generate New Key
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Settings;