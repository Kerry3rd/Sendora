import React, { useState, useEffect } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
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
  Stepper,
  Step,
  StepLabel,
  IconButton,
  InputAdornment,
  FormHelperText,
  Divider,
  Checkbox,
  FormControlLabel,
  Chip,
  Grid,
  Fade,
  Grow,
  Zoom,
  Slide,
  Skeleton,
  Backdrop,
  LinearProgress,
} from '@mui/material';
import { styled, keyframes } from '@mui/material/styles';
import {
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  Lock as LockIcon,
  ArrowForward as ArrowForwardIcon,
  ArrowBack as ArrowBackIcon,
  Check as CheckIcon,
} from '@mui/icons-material';
import { register } from '../../store/slices/authSlice';
import { AppDispatch } from '../../store/store';
import { addNotification } from '../../store/slices/uiSlice';
import logo from '../../assets/images/SENDORA-logo.png';

// Animations
const pulse = keyframes`
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
  100% {
    transform: scale(1);
  }
`;

const shimmer = keyframes`
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
`;

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
  success: '#00C853',
  warning: '#FFAB00',
  gray: {
    200: '#E5E7EB',
    400: '#9CA3AF',
    500: '#6B7280',
  },
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
  transition: 'all 0.3s ease-in-out',
  '&:focus-within': {
    transform: 'translateY(-2px)',
  },
});

// Password strength indicator component
const PasswordStrength: React.FC<{ password: string }> = ({ password }) => {
  const getStrength = (pwd: string): { score: number; label: string; color: string } => {
    let score = 0;
    if (!pwd) return { score: 0, label: 'No password', color: colors.gray[400] };
    
    if (pwd.length >= 8) score += 1;
    if (pwd.match(/[a-z]/)) score += 1;
    if (pwd.match(/[A-Z]/)) score += 1;
    if (pwd.match(/[0-9]/)) score += 1;
    if (pwd.match(/[^a-zA-Z0-9]/)) score += 1;
    
    switch (score) {
      case 0: return { score: 0, label: 'Very Weak', color: '#f44336' };
      case 1: return { score: 1, label: 'Weak', color: '#ff9800' };
      case 2: return { score: 2, label: 'Fair', color: '#ffc107' };
      case 3: return { score: 3, label: 'Good', color: '#2196f3' };
      case 4: return { score: 4, label: 'Strong', color: colors.success };
      case 5: return { score: 5, label: 'Very Strong', color: '#2e7d32' };
      default: return { score: 0, label: 'Very Weak', color: '#f44336' };
    }
  };

  const strength = getStrength(password);

  return (
    <Box sx={{ mt: 1, mb: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
        <Typography variant="caption" sx={{ color: colors.slate }}>
          Password Strength:
        </Typography>
        <Fade in={!!password} key={strength.label}>
          <Typography variant="caption" sx={{ color: strength.color, fontWeight: 'bold' }}>
            {strength.label}
          </Typography>
        </Fade>
      </Box>
      <Box sx={{ display: 'flex', gap: 0.5, height: 4 }}>
        {[1, 2, 3, 4, 5].map((level) => (
          <Box
            key={level}
            sx={{
              flex: 1,
              backgroundColor: level <= strength.score ? strength.color : colors.gray[200],
              borderRadius: 2,
              transition: 'background-color 0.3s',
              animation: level === strength.score ? `${pulse} 1s ease-in-out` : 'none',
            }}
          />
        ))}
      </Box>
    </Box>
  );
};

// Password requirements checklist
const PasswordRequirements: React.FC<{ password: string }> = ({ password }) => {
  const requirements = [
    { text: 'At least 8 characters', test: (p: string) => p.length >= 8 },
    { text: 'At least 1 lowercase letter', test: (p: string) => /[a-z]/.test(p) },
    { text: 'At least 1 uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
    { text: 'At least 1 number', test: (p: string) => /[0-9]/.test(p) },
  ];

  return (
    <Box sx={{ mt: 1, mb: 2 }}>
      {requirements.map((req, index) => {
        const isValid = req.test(password);
        return (
          <Grow in={true} key={index} style={{ transformOrigin: '0 0 0' }} timeout={300 + index * 100}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                color: isValid ? colors.success : colors.slate,
                fontSize: '0.75rem',
                mb: 0.5,
              }}
            >
              {isValid ? (
                <Zoom in={isValid}>
                  <CheckCircleIcon sx={{ fontSize: 16, color: colors.success }} />
                </Zoom>
              ) : (
                <ErrorIcon sx={{ fontSize: 16, color: colors.gray[400] }} />
              )}
              <Typography variant="caption" sx={{ color: isValid ? colors.success : colors.slate }}>
                {req.text}
              </Typography>
            </Box>
          </Grow>
        );
      })}
    </Box>
  );
};

const steps = ['Account Details', 'Personal Information', 'Company Info', 'Review'];

const Register: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [phoneCode, setPhoneCode] = useState('+255');
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [stepValid, setStepValid] = useState(true);

  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();

  // Form state
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
    company: '',
  });

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Handle input changes with validation
  const handleChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setFormData({
      ...formData,
      [field]: value,
    });
    
    // Clear error for this field
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
    
    // Real-time validation for certain fields
    if (field === 'email' && value) {
      if (!/\S+@\S+\.\S+/.test(value)) {
        setErrors({ ...errors, email: 'Please enter a valid email address' });
      }
    }
    
    if (field === 'phone' && value) {
      if (!/^[0-9]{7,12}$/.test(value)) {
        setErrors({ ...errors, phone: 'Please enter a valid phone number (7-12 digits)' });
      }
    }
  };

  // Validate current step
  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 0) {
      if (!formData.email) {
        newErrors.email = 'Email is required';
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = 'Please enter a valid email address';
      }
      
      if (!formData.password) {
        newErrors.password = 'Password is required';
      } else {
        if (formData.password.length < 8) {
          newErrors.password = 'Password must be at least 8 characters';
        }
        if (!/[a-z]/.test(formData.password)) {
          newErrors.password = 'Password must contain at least one lowercase letter';
        }
        if (!/[A-Z]/.test(formData.password)) {
          newErrors.password = 'Password must contain at least one uppercase letter';
        }
        if (!/[0-9]/.test(formData.password)) {
          newErrors.password = 'Password must contain at least one number';
        }
      }
      
      if (!formData.confirmPassword) {
        newErrors.confirmPassword = 'Please confirm your password';
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    if (step === 1) {
      if (!formData.firstName) {
        newErrors.firstName = 'First name is required';
      }
      if (!formData.lastName) {
        newErrors.lastName = 'Last name is required';
      }
      if (!formData.phone) {
        newErrors.phone = 'Phone number is required';
      } else if (!/^[0-9]{7,12}$/.test(formData.phone)) {
        newErrors.phone = 'Please enter a valid phone number (7-12 digits)';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle next step
  const handleNext = () => {
    if (validateStep(activeStep)) {
      setActiveStep((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Handle back step
  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateStep(1) || !acceptTerms) {
      if (!acceptTerms) {
        setErrors({ ...errors, terms: 'You must accept the terms and conditions' });
      }
      return;
    }

    setLoading(true);
    setError('');

    try {
      const registrationData = {
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: `${phoneCode}${formData.phone.replace(/^0+/, '')}`,
        ...(formData.company && { company: formData.company }),
      };

      console.log('📝 Attempting registration:', { ...registrationData, password: '[REDACTED]' });
      
      const result = await dispatch(register(registrationData)).unwrap();
      console.log('✅ Registration successful:', result);
      
      setRegistrationSuccess(true);
      
      dispatch(addNotification({
        type: 'success',
        message: 'Account created successfully! Welcome to SENDORA!',
      }));
      
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 2000);
      
    } catch (err: any) {
      console.error('❌ Registration failed:', err);
      setError(err?.message || 'Registration failed. Please try again.');
      
      dispatch(addNotification({
        type: 'error',
        message: err?.message || 'Registration failed',
      }));
    } finally {
      setLoading(false);
    }
  };

  // Render step content
  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Slide direction="right" in={true} mountOnEnter unmountOnExit>
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', color: colors.navy }}>
                Create your account
              </Typography>
              
              <AnimatedInput>
                <TextField
                  fullWidth
                  label="Email Address"
                  type="email"
                  value={formData.email}
                  onChange={handleChange('email')}
                  error={!!errors.email}
                  helperText={errors.email}
                  disabled={loading || registrationSuccess}
                  sx={{ mb: 2 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailIcon sx={{ color: colors.gray[400] }} />
                      </InputAdornment>
                    ),
                  }}
                  placeholder="your@email.com"
                />
              </AnimatedInput>

              <AnimatedInput>
                <TextField
                  fullWidth
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleChange('password')}
                  error={!!errors.password}
                  helperText={errors.password}
                  disabled={loading || registrationSuccess}
                  sx={{ mb: 1 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockIcon sx={{ color: colors.gray[400] }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                          {showPassword ? 
                            <VisibilityOffIcon sx={{ color: colors.gray[400] }} /> : 
                            <VisibilityIcon sx={{ color: colors.gray[400] }} />
                          }
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </AnimatedInput>

              <PasswordStrength password={formData.password} />
              <PasswordRequirements password={formData.password} />

              <AnimatedInput>
                <TextField
                  fullWidth
                  label="Confirm Password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={handleChange('confirmPassword')}
                  error={!!errors.confirmPassword}
                  helperText={errors.confirmPassword}
                  disabled={loading || registrationSuccess}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockIcon sx={{ color: colors.gray[400] }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowConfirmPassword(!showConfirmPassword)} edge="end">
                          {showConfirmPassword ? 
                            <VisibilityOffIcon sx={{ color: colors.gray[400] }} /> : 
                            <VisibilityIcon sx={{ color: colors.gray[400] }} />
                          }
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </AnimatedInput>
            </Box>
          </Slide>
        );

      case 1:
        return (
          <Slide direction="left" in={true} mountOnEnter unmountOnExit>
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', color: colors.navy }}>
                Personal Information
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <AnimatedInput>
                    <TextField
                      fullWidth
                      label="First Name"
                      value={formData.firstName}
                      onChange={handleChange('firstName')}
                      error={!!errors.firstName}
                      helperText={errors.firstName}
                      disabled={loading || registrationSuccess}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <PersonIcon sx={{ color: colors.gray[400] }} />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </AnimatedInput>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <AnimatedInput>
                    <TextField
                      fullWidth
                      label="Last Name"
                      value={formData.lastName}
                      onChange={handleChange('lastName')}
                      error={!!errors.lastName}
                      helperText={errors.lastName}
                      disabled={loading || registrationSuccess}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <PersonIcon sx={{ color: colors.gray[400] }} />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </AnimatedInput>
                </Grid>
              </Grid>

              <Box sx={{ mt: 2, display: 'flex', alignItems: 'flex-start' }}>
                <AnimatedInput>
                  <TextField
                    select
                    value={phoneCode}
                    onChange={(e) => setPhoneCode(e.target.value)}
                    sx={{ width: 120, mr: 1 }}
                    SelectProps={{
                      native: true,
                    }}
                    disabled={loading || registrationSuccess}
                  >
                    <option value="+255">+255 (TZ)</option>
                    <option value="+254">+254 (KE)</option>
                    <option value="+256">+256 (UG)</option>
                    <option value="+250">+250 (RW)</option>
                    <option value="+257">+257 (BI)</option>
                    <option value="+27">+27 (ZA)</option>
                    <option value="+1">+1 (US/CA)</option>
                    <option value="+44">+44 (UK)</option>
                  </TextField>
                </AnimatedInput>
                <AnimatedInput>
                  <TextField
                    fullWidth
                    label="Phone Number"
                    value={formData.phone}
                    onChange={handleChange('phone')}
                    error={!!errors.phone}
                    helperText={errors.phone || 'Enter numbers only'}
                    disabled={loading || registrationSuccess}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PhoneIcon sx={{ color: colors.gray[400] }} />
                        </InputAdornment>
                      ),
                    }}
                  />
                </AnimatedInput>
              </Box>
            </Box>
          </Slide>
        );

      case 2:
        return (
          <Slide direction="left" in={true} mountOnEnter unmountOnExit>
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', color: colors.navy }}>
                Company Information (Optional)
              </Typography>
              
              <AnimatedInput>
                <TextField
                  fullWidth
                  label="Company Name"
                  value={formData.company}
                  onChange={handleChange('company')}
                  disabled={loading || registrationSuccess}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <BusinessIcon sx={{ color: colors.gray[400] }} />
                      </InputAdornment>
                    ),
                  }}
                  placeholder="e.g., Your Company Ltd."
                  helperText="Leave blank if you're registering as an individual"
                  sx={{ mb: 2 }}
                />
              </AnimatedInput>

              <Fade in={true} timeout={500}>
                <Alert 
                  severity="info" 
                  sx={{ 
                    mt: 2,
                    bgcolor: colors.softTeal,
                    color: colors.navy,
                    '& .MuiAlert-icon': {
                      color: colors.teal,
                    },
                  }}
                >
                  <Typography variant="body2">
                    <strong>Why add your company?</strong><br />
                    • Get 100 free credits on company registration<br />
                    • Access team management features<br />
                    • Receive volume discounts
                  </Typography>
                </Alert>
              </Fade>
            </Box>
          </Slide>
        );

      case 3:
        return (
          <Slide direction="left" in={true} mountOnEnter unmountOnExit>
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', color: colors.navy }}>
                Review Your Information
              </Typography>
              
              <Paper variant="outlined" sx={{ p: 3, bgcolor: colors.softTeal, mb: 3, borderColor: colors.gray[200] }}>
                <Typography variant="subtitle2" sx={{ color: colors.teal, fontWeight: 600 }} gutterBottom>
                  Account Details
                </Typography>
                <Typography variant="body2" sx={{ mb: 2, color: colors.slate }}>
                  <strong>Email:</strong> {formData.email}
                </Typography>

                <Typography variant="subtitle2" sx={{ color: colors.teal, fontWeight: 600 }} gutterBottom>
                  Personal Information
                </Typography>
                <Typography variant="body2" sx={{ color: colors.slate }}>
                  <strong>Name:</strong> {formData.firstName} {formData.lastName}<br />
                  <strong>Phone:</strong> {phoneCode}{formData.phone}
                </Typography>

                {formData.company && (
                  <>
                    <Typography variant="subtitle2" sx={{ color: colors.teal, fontWeight: 600, mt: 2 }} gutterBottom>
                      Company Information
                    </Typography>
                    <Typography variant="body2" sx={{ color: colors.slate }}>
                      <strong>Company:</strong> {formData.company}
                    </Typography>
                  </>
                )}
              </Paper>

              <FormControlLabel
                control={
                  <Checkbox
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    sx={{
                      color: colors.gray[400],
                      '&.Mui-checked': {
                        color: colors.teal,
                      },
                    }}
                    disabled={loading || registrationSuccess}
                  />
                }
                label={
                  <Typography variant="body2" sx={{ color: colors.slate }}>
                    I agree to the{' '}
                    <Link 
                      href="#" 
                      sx={{ 
                        color: colors.teal,
                        textDecoration: 'none',
                        '&:hover': { textDecoration: 'underline' },
                      }}
                    >
                      Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link 
                      href="#" 
                      sx={{ 
                        color: colors.teal,
                        textDecoration: 'none',
                        '&:hover': { textDecoration: 'underline' },
                      }}
                    >
                      Privacy Policy
                    </Link>
                  </Typography>
                }
              />
              {errors.terms && (
                <FormHelperText error sx={{ color: colors.error }}>{errors.terms}</FormHelperText>
              )}

              <Zoom in={true}>
                <Box sx={{ mt: 3 }}>
                  <Chip
                    icon={<CheckCircleIcon />}
                    label="Your account will be created immediately"
                    sx={{
                      bgcolor: colors.success,
                      color: colors.white,
                      '& .MuiChip-icon': {
                        color: colors.white,
                      },
                    }}
                  />
                </Box>
              </Zoom>
            </Box>
          </Slide>
        );

      default:
        return null;
    }
  };

  // Loading skeleton for form
  if (loading && activeStep === 0) {
    return (
      <Container component="main" maxWidth="md">
        <GradientBar />
        <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', py: 4 }}>
          <Paper sx={{ p: 4, width: '100%' }}>
            <Skeleton variant="rectangular" height={180} sx={{ mb: 2 }} />
            <Skeleton variant="text" height={40} sx={{ mb: 1 }} />
            <Skeleton variant="text" height={40} sx={{ mb: 1 }} />
            <Skeleton variant="text" height={40} sx={{ mb: 1 }} />
            <Skeleton variant="rectangular" height={48} sx={{ mt: 2 }} />
          </Paper>
        </Box>
      </Container>
    );
  }

  return (
    <Container component="main" maxWidth="md">
      <GradientBar />
      
      {/* Success overlay */}
      <Backdrop
        sx={{ 
          color: '#fff', 
          zIndex: (theme) => theme.zIndex.drawer + 1,
          backdropFilter: 'blur(4px)',
        }}
        open={registrationSuccess}
      >
        <Box sx={{ textAlign: 'center' }}>
          <Zoom in={registrationSuccess}>
            <CheckCircleIcon sx={{ fontSize: 80, color: colors.success, mb: 2 }} />
          </Zoom>
          <Typography variant="h4" sx={{ mb: 2, color: colors.white }}>
            Registration Successful!
          </Typography>
          <Typography variant="body1" sx={{ mb: 3, color: colors.white }}>
            Welcome to SENDORA! Redirecting to dashboard...
          </Typography>
          <CircularProgress sx={{ color: colors.white }} />
        </Box>
      </Backdrop>

      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          py: 4,
        }}
      >
        <Grow in={true} timeout={500}>
          <Paper
            elevation={3}
            sx={{
              p: 4,
              width: '100%',
              borderRadius: 2,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Loading bar for async operations */}
            {loading && (
              <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
                <LinearProgress sx={{ height: 2 }} />
              </Box>
            )}

            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Zoom in={true} timeout={800}>
                <Box
                  component="img"
                  src={logo}
                  alt="SENDORA"
                  sx={{
                    height: 180,
                    width: 'auto',
                    maxWidth: '100%',
                    objectFit: 'contain',
                    mb: 0,
                    padding: 0,
                    transition: 'transform 0.3s',
                    '&:hover': {
                      transform: 'scale(1.05)',
                    },
                  }}
                />
              </Zoom>
              <Typography variant="body2" sx={{ color: colors.slate, mt: -2 }}>
                Join thousands of businesses using SENDORA Platform
              </Typography>
            </Box>

            {error && (
              <Fade in={!!error} timeout={300}>
                <Alert 
                  severity="error" 
                  sx={{ 
                    mb: 3,
                    bgcolor: colors.error,
                    color: colors.white,
                    '& .MuiAlert-icon': {
                      color: colors.white,
                    },
                  }}
                  onClose={() => setError('')}
                >
                  {error}
                </Alert>
              </Fade>
            )}

            <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
              {steps.map((label, index) => (
                <Step key={label}>
                  <StepLabel
                    sx={{
                      '& .MuiStepLabel-label': {
                        color: index <= activeStep ? colors.teal : colors.slate,
                      },
                      '& .MuiStepIcon-root': {
                        color: index < activeStep ? colors.success : (index === activeStep ? colors.teal : colors.gray[400]),
                        transition: 'color 0.3s',
                      },
                    }}
                  >
                    {label}
                  </StepLabel>
                </Step>
              ))}
            </Stepper>

            <form onSubmit={activeStep === steps.length - 1 ? handleSubmit : (e) => e.preventDefault()}>
              {renderStepContent(activeStep)}

              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
                <Button
                  variant="outlined"
                  onClick={handleBack}
                  disabled={activeStep === 0 || loading || registrationSuccess}
                  startIcon={<ArrowBackIcon />}
                  sx={{
                    borderColor: colors.teal,
                    color: colors.teal,
                    '&:hover': {
                      borderColor: colors.tealLight,
                      backgroundColor: colors.softTeal,
                    },
                    '&.Mui-disabled': {
                      borderColor: colors.gray[400],
                      color: colors.gray[400],
                    },
                    transition: 'all 0.3s',
                  }}
                >
                  Back
                </Button>
                
                <Box>
                  {activeStep === steps.length - 1 ? (
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={loading || registrationSuccess || !acceptTerms}
                      sx={{
                        bgcolor: colors.navy,
                        color: colors.white,
                        position: 'relative',
                        overflow: 'hidden',
                        '&:hover': {
                          bgcolor: colors.navyLight,
                        },
                        '&.Mui-disabled': {
                          bgcolor: colors.gray[400],
                        },
                        '&::after': loading ? {
                          content: '""',
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)`,
                          animation: `${shimmer} 1.5s infinite`,
                        } : {},
                      }}
                    >
                      {loading ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CircularProgress size={20} sx={{ color: colors.white }} />
                          <Typography>Creating Account...</Typography>
                        </Box>
                      ) : registrationSuccess ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CheckIcon />
                          <Typography>Success!</Typography>
                        </Box>
                      ) : (
                        'Create Account'
                      )}
                    </Button>
                  ) : (
                    <Button
                      variant="contained"
                      onClick={handleNext}
                      disabled={loading || registrationSuccess}
                      endIcon={<ArrowForwardIcon />}
                      sx={{
                        bgcolor: colors.teal,
                        color: colors.navy,
                        '&:hover': {
                          bgcolor: colors.tealLight,
                        },
                        '&.Mui-disabled': {
                          bgcolor: colors.gray[400],
                          color: colors.white,
                        },
                        transition: 'all 0.3s',
                      }}
                    >
                      Continue
                    </Button>
                  )}
                </Box>
              </Box>
            </form>

            <Divider sx={{ my: 4, borderColor: colors.gray[200] }}>
              <Chip 
                label="Already have an account?" 
                size="small"
                sx={{
                  bgcolor: colors.softTeal,
                  color: colors.navy,
                }}
              />
            </Divider>

            <Box sx={{ textAlign: 'center' }}>
              <Link
                component={RouterLink}
                to="/login"
                variant="body2"
                sx={{
                  color: colors.teal,
                  textDecoration: 'none',
                  fontWeight: 500,
                  '&:hover': {
                    textDecoration: 'underline',
                  },
                }}
              >
                Sign in to your existing account
              </Link>
            </Box>

            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center', gap: 2 }}>
              <Zoom in={true} style={{ transitionDelay: '100ms' }}>
                <Chip
                  label="Free Trial Credits"
                  size="small"
                  sx={{
                    bgcolor: colors.softTeal,
                    color: colors.teal,
                    borderColor: colors.teal,
                  }}
                  variant="outlined"
                />
              </Zoom>
              <Zoom in={true} style={{ transitionDelay: '200ms' }}>
                <Chip
                  label="No Credit Card Required"
                  size="small"
                  sx={{
                    bgcolor: colors.softTeal,
                    color: colors.navy,
                    borderColor: colors.navy,
                  }}
                  variant="outlined"
                />
              </Zoom>
            </Box>
          </Paper>
        </Grow>
      </Box>
    </Container>
  );
};

export default Register;