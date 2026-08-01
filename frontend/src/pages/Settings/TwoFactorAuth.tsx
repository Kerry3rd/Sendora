import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  Divider,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton
} from '@mui/material';
import {
  QrCode as QrCodeIcon,
  Security as SecurityIcon,
  CheckCircle as CheckCircleIcon,
  ContentCopy as CopyIcon,
  Download as DownloadIcon,
  PhoneIphone as PhoneIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import api from '../../services/api';
import { addNotification } from '../../store/slices/uiSlice';

const steps = ['Scan QR Code', 'Enter Verification Code', 'Save Backup Codes'];

const TwoFactorAuth: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [disableCode, setDisableCode] = useState('');

  const user = useSelector((state: RootState) => state.auth.user);
  const dispatch = useDispatch();

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await api.get('/2fa/status');
      if (response.data.data.enabled) {
        setActiveStep(3); // Already enabled
      }
    } catch (error) {
      console.error('Failed to fetch 2FA status:', error);
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.post('/2fa/generate');
      setQrCode(response.data.data.qrCode);
      setSecret(response.data.data.secret);
      setActiveStep(1);
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to generate 2FA secret');
    } finally {
      setLoading(false);
    }
  };

  const handleEnable = async () => {
    if (!verificationCode) {
      setError('Please enter the verification code');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await api.post('/2fa/enable', { token: verificationCode });
      setBackupCodes(response.data.data.backupCodes);
      setActiveStep(2);
      dispatch(addNotification({
        type: 'success',
        message: '2FA enabled successfully'
      }));
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to enable 2FA');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    setLoading(true);
    setError('');
    try {
      await api.post('/2fa/disable', { token: disableCode });
      setShowDisableDialog(false);
      setActiveStep(0);
      setQrCode('');
      setSecret('');
      setVerificationCode('');
      setBackupCodes([]);
      dispatch(addNotification({
        type: 'success',
        message: '2FA disabled successfully'
      }));
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to disable 2FA');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    dispatch(addNotification({
      type: 'success',
      message: 'Copied to clipboard'
    }));
  };

  const downloadBackupCodes = () => {
    const content = backupCodes.join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sendora-2fa-backup-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (activeStep === 3) {
    return (
      <Paper sx={{ p: 4 }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <SecurityIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
          <Typography variant="h5" gutterBottom>
            Two-Factor Authentication is Enabled
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Your account is protected with an extra layer of security
          </Typography>
        </Box>

        <Button
          variant="outlined"
          color="error"
          onClick={() => setShowDisableDialog(true)}
          sx={{ mt: 2 }}
        >
          Disable 2FA
        </Button>

        <Dialog open={showDisableDialog} onClose={() => setShowDisableDialog(false)}>
          <DialogTitle>Disable Two-Factor Authentication</DialogTitle>
          <DialogContent>
            <Typography variant="body2" paragraph>
              Enter your verification code to disable 2FA.
            </Typography>
            <TextField
              fullWidth
              label="Verification Code"
              value={disableCode}
              onChange={(e) => setDisableCode(e.target.value)}
              placeholder="000000"
              sx={{ mt: 2 }}
            />
            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowDisableDialog(false)}>Cancel</Button>
            <Button
              onClick={handleDisable}
              color="error"
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Disable'}
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 4 }}>
      <Typography variant="h5" gutterBottom>
        Two-Factor Authentication (2FA)
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        Add an extra layer of security to your account
      </Typography>

      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {activeStep === 0 && (
        <Box sx={{ textAlign: 'center' }}>
          <SecurityIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
          <Typography variant="body1" paragraph>
            Two-factor authentication adds an extra layer of security to your account
            by requiring a verification code from your mobile device.
          </Typography>
          <Button
            variant="contained"
            onClick={handleGenerate}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <QrCodeIcon />}
            size="large"
            sx={{ mt: 2 }}
          >
            Set Up 2FA
          </Button>
        </Box>
      )}

      {activeStep === 1 && (
        <Box>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              Scan QR Code
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
            </Typography>
            
            <Card sx={{ display: 'inline-block', p: 2, mb: 2 }}>
              {qrCode && (
                <img 
                  src={qrCode} 
                  alt="2FA QR Code" 
                  style={{ width: 200, height: 200 }}
                />
              )}
            </Card>

            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mb: 3 }}>
              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                Secret: {secret}
              </Typography>
              <IconButton size="small" onClick={() => copyToClipboard(secret)}>
                <CopyIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>

          <TextField
            fullWidth
            label="Verification Code"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value)}
            placeholder="Enter 6-digit code"
            sx={{ mb: 2 }}
          />

          <Button
            fullWidth
            variant="contained"
            onClick={handleEnable}
            disabled={loading || !verificationCode}
          >
            {loading ? <CircularProgress size={24} /> : 'Verify & Enable'}
          </Button>
        </Box>
      )}

      {activeStep === 2 && (
        <Box>
          <Alert severity="success" sx={{ mb: 3 }}>
            Two-factor authentication has been enabled successfully!
          </Alert>

          <Typography variant="h6" gutterBottom>
            Save Your Backup Codes
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            These backup codes can be used to access your account if you lose your device.
            Store them in a safe place.
          </Typography>

          <Card variant="outlined" sx={{ mb: 3 }}>
            <CardContent>
              <List dense>
                {backupCodes.map((code, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <CheckCircleIcon color="success" />
                    </ListItemIcon>
                    <ListItemText 
                      primary={code}
                      sx={{ fontFamily: 'monospace' }}
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={downloadBackupCodes}
            >
              Download
            </Button>
            <Button
              variant="outlined"
              startIcon={<CopyIcon />}
              onClick={() => copyToClipboard(backupCodes.join('\n'))}
            >
              Copy All
            </Button>
          </Box>
        </Box>
      )}
    </Paper>
  );
};

export default TwoFactorAuth;