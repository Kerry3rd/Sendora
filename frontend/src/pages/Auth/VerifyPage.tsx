// frontend/src/pages/Auth/VerifyPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { Email, Phone } from '@mui/icons-material';
import api from '../../services/api';
import logo from '../../assets/images/SENDORA-logo.png';

const colors = {
  navy: '#0B1F3A',
  teal: '#00C2A8',
  softTeal: '#E6F7F5',
  slate: '#1A1F2B',
};

const GradientBar = styled(Box)({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  height: '4px',
  background: `linear-gradient(90deg, ${colors.teal} 0%, ${colors.navy} 100%)`,
});

const VerifyPage: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [emailCode, setEmailCode] = useState('');
  const [phoneCode, setPhoneCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [emailVerified, setEmailVerified] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const storedUserId = sessionStorage.getItem('verificationUserId');
    if (!storedUserId) {
      navigate('/register');
    } else {
      setUserId(storedUserId);
    }
  }, [navigate]);

  const steps = ['Verify Email', 'Verify Phone'];

  const handleVerifyEmail = async () => {
    if (!emailCode || emailCode.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.post('/verification/verify/email', {
        userId,
        code: emailCode,
      });

      setSuccess('Email verified successfully!');
      setEmailVerified(true);
      
      if (response.data.data.bothVerified) {
        // Both already verified, go to username
        navigate('/create-username');
      } else {
        setActiveStep(1);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPhone = async () => {
    if (!phoneCode || phoneCode.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.post('/verification/verify/phone', {
        userId,
        code: phoneCode,
      });

      setSuccess('Phone verified successfully!');
      setPhoneVerified(true);
      
      if (response.data.data.bothVerified) {
        navigate('/create-username');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async (type: 'email' | 'phone') => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await api.post('/verification/resend-code', {
        userId,
        type,
      });
      setSuccess(`New verification code sent to your ${type}`);
    } catch (err: any) {
      setError(err.response?.data?.message || `Failed to resend ${type} code`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="sm">
      <GradientBar />
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', py: 4 }}>
        <Paper sx={{ p: 4, width: '100%', position: 'relative' }}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <img src={logo} alt="SENDORA" style={{ height: 60, marginBottom: 16 }} />
            <Typography variant="h5" sx={{ color: colors.navy, fontWeight: 700 }}>
              Verify Your Identity
            </Typography>
          </Box>

          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

          {activeStep === 0 && !emailVerified && (
            <Box>
              <Typography gutterBottom sx={{ color: colors.slate }}>
                We've sent a 6-digit code to your email address.
              </Typography>
              <TextField
                fullWidth
                label="Email Verification Code"
                value={emailCode}
                onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                inputProps={{ maxLength: 6 }}
                sx={{ mb: 2 }}
              />
              <Button
                fullWidth
                variant="contained"
                onClick={handleVerifyEmail}
                disabled={loading || emailCode.length !== 6}
                sx={{ mb: 2, bgcolor: colors.navy }}
              >
                {loading ? <CircularProgress size={24} /> : 'Verify Email'}
              </Button>
              <Button
                fullWidth
                variant="text"
                onClick={() => handleResendCode('email')}
                disabled={loading}
                sx={{ color: colors.teal }}
              >
                Resend Code
              </Button>
            </Box>
          )}

          {activeStep === 1 && !phoneVerified && (
            <Box>
              <Typography gutterBottom sx={{ color: colors.slate }}>
                We've sent a 6-digit code to your phone number.
              </Typography>
              <TextField
                fullWidth
                label="Phone Verification Code"
                value={phoneCode}
                onChange={(e) => setPhoneCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                inputProps={{ maxLength: 6 }}
                sx={{ mb: 2 }}
              />
              <Button
                fullWidth
                variant="contained"
                onClick={handleVerifyPhone}
                disabled={loading || phoneCode.length !== 6}
                sx={{ mb: 2, bgcolor: colors.navy }}
              >
                {loading ? <CircularProgress size={24} /> : 'Verify Phone'}
              </Button>
              <Button
                fullWidth
                variant="text"
                onClick={() => handleResendCode('phone')}
                disabled={loading}
                sx={{ color: colors.teal }}
              >
                Resend Code
              </Button>
            </Box>
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default VerifyPage;