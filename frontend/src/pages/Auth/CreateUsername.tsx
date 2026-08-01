// frontend/src/pages/Auth/CreateUsername.tsx
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
  InputAdornment,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { Person } from '@mui/icons-material';
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

const CreateUsername: React.FC = () => {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const storedUserId = sessionStorage.getItem('verificationUserId');
    if (!storedUserId) {
      navigate('/register');
    } else {
      setUserId(storedUserId);
    }
  }, [navigate]);

  const validateUsername = (value: string) => {
    const regex = /^[a-zA-Z0-9_]{3,20}$/;
    return regex.test(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateUsername(username)) {
      setError('Username must be 3-20 characters and can only contain letters, numbers, and underscores');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.post('/verification/register/username', {
        userId,
        username,
      });

      // Store token and user data
      localStorage.setItem('token', response.data.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.data.user));
      
      // Clear session storage
      sessionStorage.removeItem('verificationUserId');
      
      // Navigate to dashboard
      navigate('/dashboard');

    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create username');
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
            <img src={logo} alt="SENDORA" style={{ height: 80, marginBottom: 16 }} />
            <Typography variant="h5" sx={{ color: colors.navy, fontWeight: 700 }}>
              Almost There!
            </Typography>
            <Typography sx={{ color: colors.slate }}>
              Choose your unique username
            </Typography>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              InputProps={{
                startAdornment: <InputAdornment position="start"><Person sx={{ color: colors.teal }} /></InputAdornment>,
              }}
              helperText="3-20 characters: letters, numbers, underscores only"
              sx={{ mb: 3 }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading || !username}
              sx={{ py: 1.5, bgcolor: colors.navy, '&:hover': { bgcolor: '#1E3A5F' } }}
            >
              {loading ? <CircularProgress size={24} /> : 'Complete Registration'}
            </Button>
          </form>
        </Paper>
      </Box>
    </Container>
  );
};

export default CreateUsername;