import React, { useState } from 'react';
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
  Grid,
  InputAdornment,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { Email, Phone, Lock, Person, Business } from '@mui/icons-material';
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

const RegisterStep1: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    company: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [field]: e.target.value });
  };

  const validateForm = () => {
    if (!formData.email || !formData.phone || !formData.password || !formData.firstName || !formData.lastName) {
      setError('All fields except company are required');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError('');

    try {
      const response = await api.post('/verification/register/initiate', {
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        company: formData.company || undefined,
      });

      // Store userId in session storage
      sessionStorage.setItem('verificationUserId', response.data.data.userId);
      
      // Navigate to verification page
      navigate('/verify');

    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="md">
      <GradientBar />
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', py: 4 }}>
        <Paper sx={{ p: 4, width: '100%', position: 'relative', overflow: 'hidden' }}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <img src={logo} alt="SENDORA" style={{ height: 80, marginBottom: 16 }} />
            <Typography variant="h4" sx={{ color: colors.navy, fontWeight: 700 }}>
              Create Account
            </Typography>
            <Typography sx={{ color: colors.slate }}>
              Step 1 of 3: Enter your details
            </Typography>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

          <form onSubmit={handleSubmit}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="First Name"
                  value={formData.firstName}
                  onChange={handleChange('firstName')}
                  InputProps={{ startAdornment: <InputAdornment position="start"><Person sx={{ color: colors.teal }} /></InputAdornment> }}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Last Name"
                  value={formData.lastName}
                  onChange={handleChange('lastName')}
                  InputProps={{ startAdornment: <InputAdornment position="start"><Person sx={{ color: colors.teal }} /></InputAdornment> }}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Email Address"
                  type="email"
                  value={formData.email}
                  onChange={handleChange('email')}
                  InputProps={{ startAdornment: <InputAdornment position="start"><Email sx={{ color: colors.teal }} /></InputAdornment> }}
                  required
                  helperText="You'll receive a verification code here"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Phone Number"
                  value={formData.phone}
                  onChange={handleChange('phone')}
                  placeholder="+255712345678"
                  InputProps={{ startAdornment: <InputAdornment position="start"><Phone sx={{ color: colors.teal }} /></InputAdornment> }}
                  required
                  helperText="Include country code (e.g., +255 for Tanzania)"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange('password')}
                  InputProps={{ startAdornment: <InputAdornment position="start"><Lock sx={{ color: colors.teal }} /></InputAdornment> }}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Confirm Password"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleChange('confirmPassword')}
                  InputProps={{ startAdornment: <InputAdornment position="start"><Lock sx={{ color: colors.teal }} /></InputAdornment> }}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Company (Optional)"
                  value={formData.company}
                  onChange={handleChange('company')}
                  InputProps={{ startAdornment: <InputAdornment position="start"><Business sx={{ color: colors.teal }} /></InputAdornment> }}
                />
              </Grid>
            </Grid>

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              sx={{ mt: 3, mb: 2, py: 1.5, bgcolor: colors.navy, '&:hover': { bgcolor: '#1E3A5F' } }}
            >
              {loading ? <CircularProgress size={24} /> : 'Continue'}
            </Button>
          </form>
        </Paper>
      </Box>
    </Container>
  );
};

export default RegisterStep1;