import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
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
  Fade,
  Zoom,
  Slide,
  Grow,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { 
  Person, 
  Email, 
  Phone, 
  Lock,
  Login as LoginIcon,
  ArrowForward,
  CheckCircle,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { login } from '../../store/slices/authSlice';
import { AppDispatch } from '../../store/store';
import logo from '../../assets/images/SENDORA-logo.png';
import { Link as RouterLink } from 'react-router-dom';

// SENDORA Color Palette
const colors = {
  navy: '#0B1F3A',
  navyLight: '#1E3A5F',
  teal: '#00C2A8',
  tealLight: '#5DDFCF',
  softTeal: '#E6F7F5',
  slate: '#1A1F2B',
  lightGray: '#F4F6F8',
  white: '#FFFFFF',
  error: '#D32F2F',
  gray: '#9CA3AF',
};

// Styled gradient bar
const GradientBar = styled(Box)({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  height: '4px',
  background: `linear-gradient(90deg, ${colors.teal} 0%, ${colors.navy} 100%)`,
});

// Animated input wrapper
const AnimatedInput = styled(Box)({
  transition: 'transform 0.3s ease-in-out',
  '&:focus-within': {
    transform: 'scale(1.02)',
  },
});

// Helper to determine input type based on identifier
const getIdentifierIcon = (identifier: string) => {
  if (identifier.includes('@')) return <Email sx={{ color: colors.teal }} />;
  if (identifier.startsWith('+') || /^[0-9]+$/.test(identifier)) return <Phone sx={{ color: colors.teal }} />;
  return <Person sx={{ color: colors.teal }} />;
};

const getIdentifierLabel = (identifier: string) => {
  if (identifier.includes('@')) return 'Email Address';
  if (identifier.startsWith('+') || /^[0-9]+$/.test(identifier)) return 'Phone Number';
  return 'Username';
};

const Login: React.FC = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [identifierValid, setIdentifierValid] = useState(true);
  const [passwordValid, setPasswordValid] = useState(true);

  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();

  // Validate identifier as user types
  useEffect(() => {
    if (identifier && identifier.length > 0) {
      setIdentifierValid(true);
    }
  }, [identifier]);

  // Validate password as user types
  useEffect(() => {
    if (password && password.length > 0) {
      setPasswordValid(password.length >= 6);
    }
  }, [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!identifier.trim()) {
      setIdentifierValid(false);
      setError('Please enter your username, email, or phone number');
      return;
    }
    
    if (!password.trim()) {
      setPasswordValid(false);
      setError('Please enter your password');
      return;
    }
    
    if (password.length < 6) {
      setPasswordValid(false);
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('🔐 Submitting login with identifier:', identifier);
      
      const credentials: any = { password };
      
      if (identifier.includes('@')) {
        credentials.email = identifier;
      } else if (identifier.startsWith('+') || /^[0-9]+$/.test(identifier)) {
        credentials.phone = identifier;
      } else {
        credentials.username = identifier;
      }
      
      console.log('📦 Sending credentials:', { ...credentials, password: '***' });
      
      const result = await dispatch(login(credentials)).unwrap();
      console.log('✅ Login successful, user:', result);
      
      setLoginSuccess(true);
      
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 1500);
      
    } catch (err: any) {
      console.error('❌ Login failed - Full error:', err);
      
      let errorMessage = 'Login failed. Please check your credentials.';
      
      if (err?.message) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      } else if (err?.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err?.data?.message) {
        errorMessage = err.data.message;
      }
      
      console.log('🔴 Displaying error:', errorMessage);
      setError(errorMessage);
      setLoginSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <GradientBar />
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          py: 4,
        }}
      >
        <Slide direction="up" in={true} mountOnEnter unmountOnExit>
          <Paper
            elevation={3}
            sx={{
              p: 4,
              width: '100%',
              borderRadius: 2,
              position: 'relative',
              overflow: 'hidden',
              transition: 'all 0.3s ease-in-out',
              ...(loginSuccess && {
                bgcolor: colors.tealLight,
                transform: 'scale(1.02)',
              }),
            }}
          >
            {/* Success overlay */}
            {loginSuccess && (
              <Fade in={loginSuccess} timeout={500}>
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    bgcolor: 'rgba(0, 194, 168, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column',
                    zIndex: 10,
                    backdropFilter: 'blur(4px)',
                  }}
                >
                  <Zoom in={loginSuccess}>
                    <CheckCircle sx={{ fontSize: 80, color: colors.teal, mb: 2 }} />
                  </Zoom>
                  <Typography variant="h5" sx={{ color: colors.navy, fontWeight: 'bold' }}>
                    Login Successful!
                  </Typography>
                  <Typography variant="body2" sx={{ color: colors.slate, mt: 1 }}>
                    Redirecting to dashboard...
                  </Typography>
                  <CircularProgress size={24} sx={{ mt: 2, color: colors.teal }} />
                </Box>
              </Fade>
            )}

            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Grow in={true} timeout={800}>
                <Box 
                  component="img"
                  src={logo}
                  alt="SENDORA"
                  sx={{
                    height: 150,
                    width: 'auto',
                    maxWidth: '100%',
                    objectFit: 'contain',
                    mb: 2,
                    marginBottom: 0,
                    marginTop: 0,
                    padding: 0,
                    transition: 'transform 0.3s ease-in-out',
                    '&:hover': {
                      transform: 'scale(1.05)',
                    },
                  }}
                />
              </Grow>
              <Typography variant="body2" sx={{ color: colors.slate }}>
                Sign in with your username, email, or phone
              </Typography>
            </Box>

            {error && (
              <Fade in={!!error} timeout={300}>
                <Alert 
                  severity="error" 
                  sx={{ 
                    mb: 2,
                    bgcolor: colors.error,
                    color: colors.white,
                    '& .MuiAlert-icon': {
                      color: colors.white,
                    },
                    animation: 'shake 0.5s ease-in-out',
                    '@keyframes shake': {
                      '0%, 100%': { transform: 'translateX(0)' },
                      '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-5px)' },
                      '20%, 40%, 60%, 80%': { transform: 'translateX(5px)' },
                    },
                  }}
                  icon={<ErrorIcon />}
                >
                  <Typography variant="body2" fontWeight="bold">
                    Login Failed:
                  </Typography>
                  {error}
                </Alert>
              </Fade>
            )}

            <Box component="form" onSubmit={handleSubmit}>
              <AnimatedInput>
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  id="identifier"
                  label={identifier ? getIdentifierLabel(identifier) : 'Username, Email, or Phone'}
                  name="identifier"
                  autoComplete="username"
                  autoFocus
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  disabled={loading || loginSuccess}
                  error={!identifierValid}
                  helperText={!identifierValid ? 'This field is required' : ''}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        {identifier ? getIdentifierIcon(identifier) : <Person sx={{ color: colors.gray }} />}
                      </InputAdornment>
                    ),
                  }}
                  placeholder="e.g., john_doe, john@email.com, +255712345678"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      transition: 'all 0.3s ease-in-out',
                      '&:hover fieldset': {
                        borderColor: colors.teal,
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: colors.teal,
                        borderWidth: '2px',
                      },
                      '&.Mui-error fieldset': {
                        borderColor: colors.error,
                      },
                    },
                    '& .MuiInputLabel-root.Mui-focused': {
                      color: colors.teal,
                    },
                  }}
                />
              </AnimatedInput>

              <AnimatedInput>
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  name="password"
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading || loginSuccess}
                  error={!passwordValid}
                  helperText={!passwordValid ? 'Password must be at least 6 characters' : ''}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock sx={{ color: colors.teal }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <Button
                          onClick={() => setShowPassword(!showPassword)}
                          size="small"
                          sx={{
                            color: colors.teal,
                            '&:hover': {
                              backgroundColor: 'transparent',
                              textDecoration: 'underline',
                            },
                          }}
                        >
                          {showPassword ? 'Hide' : 'Show'}
                        </Button>
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      transition: 'all 0.3s ease-in-out',
                      '&:hover fieldset': {
                        borderColor: colors.teal,
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: colors.teal,
                        borderWidth: '2px',
                      },
                      '&.Mui-error fieldset': {
                        borderColor: colors.error,
                      },
                    },
                    '& .MuiInputLabel-root.Mui-focused': {
                      color: colors.teal,
                    },
                  }}
                />
              </AnimatedInput>

              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{
                  mt: 3,
                  mb: 2,
                  py: 1.5,
                  bgcolor: colors.navy,
                  color: colors.white,
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 0.3s ease-in-out',
                  '&:hover': {
                    bgcolor: colors.navyLight,
                    transform: 'translateY(-2px)',
                    boxShadow: 4,
                  },
                  '&:disabled': {
                    bgcolor: colors.gray,
                  },
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)`,
                    transform: 'translateX(-100%)',
                    animation: loading ? 'shimmer 1.5s infinite' : 'none',
                  },
                  '@keyframes shimmer': {
                    '100%': {
                      transform: 'translateX(100%)',
                    },
                  },
                }}
                disabled={loading || loginSuccess}
                endIcon={!loading && !loginSuccess ? <ArrowForward /> : null}
              >
                {loading ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CircularProgress size={20} sx={{ color: colors.white }} />
                    <Typography>Signing in...</Typography>
                  </Box>
                ) : loginSuccess ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckCircle sx={{ fontSize: 20 }} /> {/* FIXED: Changed size to fontSize */}
                    <Typography>Success!</Typography>
                  </Box>
                ) : (
                  'Sign In'
                )}
              </Button>

              <Box sx={{ textAlign: 'right', mb: 2 }}>
                <Link
                  component={RouterLink}
                  to="/forgot-password"
                  variant="body2"
                  sx={{
                    color: colors.teal,
                    textDecoration: 'none',
                    transition: 'all 0.3s ease-in-out',
                    '&:hover': { 
                      textDecoration: 'underline',
                      color: colors.navy,
                    },
                  }}
                >
                  Forgot Password?
                </Link>
              </Box>

              <Box sx={{ mt: 2, textAlign: 'center' }}>
                <Typography variant="caption" sx={{ color: colors.slate, display: 'block', mb: 1 }}>
                  You can sign in with:
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
                  {['Username', 'Email', 'Phone'].map((item, index) => (
                    <Zoom in={true} style={{ transitionDelay: `${index * 100}ms` }} key={item}>
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          color: colors.teal,
                          px: 1,
                          py: 0.5,
                          borderRadius: 1,
                          bgcolor: colors.softTeal,
                        }}
                      >
                        {item}
                      </Typography>
                    </Zoom>
                  ))}
                </Box>
              </Box>

              <Box sx={{ mt: 3, textAlign: 'center' }}>
                <Link 
                  href="/register" 
                  variant="body2"
                  sx={{
                    color: colors.teal,
                    textDecoration: 'none',
                    fontWeight: 500,
                    transition: 'all 0.3s ease-in-out',
                    '&:hover': {
                      textDecoration: 'underline',
                      color: colors.navy,
                    },
                  }}
                >
                  {"Don't have an account? Sign Up"}
                </Link>
              </Box>
            </Box>
          </Paper>
        </Slide>
      </Box>
    </Container>
  );
};

export default Login;