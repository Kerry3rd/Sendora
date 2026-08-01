import React, { useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Alert,
  CircularProgress,
  Link,
  InputAdornment,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { Email, ArrowBack } from '@mui/icons-material';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import api from '../../services/api';
import logo from '../../assets/images/SENDORA-logo.png';

const colors = {
  navy: '#0B1F3A',
  teal: '#00C2A8',
  slate: '#1A1F2B',
  error: '#D32F2F',
  success: '#00C853',
};

const GradientBar = styled(Box)({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  height: '4px',
  background: `linear-gradient(90deg, ${colors.teal} 0%, ${colors.navy} 100%)`,
});

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.post('/password-reset/request', { email });
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <GradientBar />
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', py: 4 }}>
        <Paper sx={{ p: 4, width: '100%', position: 'relative', overflow: 'hidden' }}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <img src={logo} alt="SENDORA" style={{ height: 80, marginBottom: 16 }} />
            <Typography variant="h5" sx={{ color: colors.navy, fontWeight: 700 }}>
              Reset Password
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {success ? (
            <Box sx={{ textAlign: 'center' }}>
              <Alert severity="success" sx={{ mb: 3 }}>
                Reset link sent! Check your email.
              </Alert>
              <Typography variant="body2" sx={{ color: colors.slate, mb: 3 }}>
                We've sent a password reset link to {email}. Please check your inbox and spam folder.
              </Typography>
              <Button
                variant="outlined"
                startIcon={<ArrowBack />}
                onClick={() => navigate('/login')}
                sx={{ borderColor: colors.teal, color: colors.teal }}
              >
                Back to Login
              </Button>
            </Box>
          ) : (
            <form onSubmit={handleSubmit}>
              <Typography variant="body2" sx={{ color: colors.slate, mb: 3 }}>
                Enter your email address and we'll send you a link to reset your password.
              </Typography>

              <TextField
                fullWidth
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email sx={{ color: colors.teal }} />
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 3 }}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={loading}
                sx={{
                  py: 1.5,
                  bgcolor: colors.navy,
                  '&:hover': { bgcolor: '#1E3A5F' },
                  mb: 2,
                }}
              >
                {loading ? <CircularProgress size={24} /> : 'Send Reset Link'}
              </Button>

              <Box sx={{ textAlign: 'center' }}>
                <Link
                  component={RouterLink}
                  to="/login"
                  variant="body2"
                  sx={{ color: colors.teal, textDecoration: 'none' }}
                >
                  Back to Login
                </Link>
              </Box>
            </form>
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default ForgotPassword;
