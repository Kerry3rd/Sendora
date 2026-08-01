import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  Radio,
  RadioGroup,
  FormControl,
  FormControlLabel,
  TextField,
  Alert,
  Snackbar,
  LinearProgress,
  Divider,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  InputLabel,
  FormHelperText,
  Skeleton,
  Fade,
  Zoom,
  CircularProgress,
  Backdrop,
} from '@mui/material';
import {
  Payment as PaymentIcon,
  Phone as PhoneIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
  AccountBalanceWallet as WalletIcon,
  Lock as LockIcon,
  Verified as VerifiedIcon,
} from '@mui/icons-material';
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import api from '../../services/api';
import { addNotification } from '../../store/slices/uiSlice';
import { PRICING } from '../../config/pricing';
import { 
  formatCostInTZS, 
  formatAvgCostInTZS,
  formatCostInTZSCompact
} from '../../utils/currency';
import CreditPackages from './CreditPackages';

interface Package {
  id: string;
  credits: number;
  price: number;
  pricePerSMS: number;
}

// Loading skeleton for packages
const PackageSkeleton = () => (
  <Grid container spacing={3} sx={{ mb: 4 }}>
    {[1, 2, 3, 4].map((i) => (
      <Grid item xs={12} sm={6} md={3} key={i}>
        <Card>
          <CardContent>
            <Skeleton variant="text" width="60%" height={30} />
            <Skeleton variant="text" width="80%" height={40} sx={{ my: 1 }} />
            <Skeleton variant="text" width="40%" />
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
              <Skeleton variant="circular" width={20} height={20} />
            </Box>
          </CardContent>
        </Card>
      </Grid>
    ))}
  </Grid>
);

const BuyCredits: React.FC = () => {
  const [packages, setPackages] = useState<Package[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<string>('popular');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [currentTransaction, setCurrentTransaction] = useState<any>(null);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'pending' | 'success' | 'failed'>('idle');
  const [phoneError, setPhoneError] = useState('');
  const [paymentProcessing, setPaymentProcessing] = useState(false);

  // New state for AzamPay
  const [paymentMethod, setPaymentMethod] = useState<'mpesa' | 'azampay'>('mpesa');
  const [mobileProvider, setMobileProvider] = useState('Mpesa');
  const [bankProvider, setBankProvider] = useState('CRDB');
  const [paymentType, setPaymentType] = useState<'mobile' | 'bank'>('mobile');

  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);

  // Use packages from PRICING if API fails or as fallback
  const defaultPackages: Package[] = PRICING.packages.map(pkg => ({
    id: pkg.id,
    credits: pkg.credits,
    price: pkg.price,
    pricePerSMS: pkg.pricePerSMS
  }));

  // Providers lists
  const mobileProviders = [
    { name: 'M-Pesa', value: 'Mpesa' },
    { name: 'TigoPesa', value: 'Tigo' },
    { name: 'Airtel Money', value: 'Airtel' },
    { name: 'AzamPesa', value: 'Azampesa' },
    { name: 'HaloPesa', value: 'Halopesa' }
  ];

  const bankProviders = [
    { name: 'CRDB Bank', value: 'CRDB' },
    { name: 'NMB Bank', value: 'NMB' }
  ];

  useEffect(() => {
    fetchPackages();
    if (user?.phone) {
      setPhoneNumber(user.phone);
    }
  }, [user]);

  const fetchPackages = async () => {
    try {
      setInitialLoading(true);
      const response = await api.get('/payments/packages');
      setPackages(response.data.data);
    } catch (error) {
      console.error('Failed to fetch packages, using default pricing:', error);
      setPackages(defaultPackages);
    } finally {
      setInitialLoading(false);
    }
  };

  const selectedPkg = packages.find(p => p.id === selectedPackage) || 
                     defaultPackages.find(p => p.id === selectedPackage);

  const formatPhoneNumber = (phone: string): string => {
    const cleaned = phone.replace(/\D/g, '');
    
    if (cleaned.length === 9 && (cleaned.startsWith('7') || cleaned.startsWith('6'))) {
      return `255${cleaned}`;
    }
    if (cleaned.length === 10 && cleaned.startsWith('0')) {
      return `255${cleaned.substring(1)}`;
    }
    if (cleaned.length === 12 && cleaned.startsWith('255')) {
      return cleaned;
    }
    return cleaned;
  };

  const validatePhoneNumber = (phone: string): { isValid: boolean; formatted: string; error: string } => {
    const cleaned = phone.replace(/\D/g, '');
    
    if (!cleaned) {
      return { isValid: false, formatted: '', error: 'Phone number is required' };
    }
    
    if (cleaned.length === 9 && (cleaned.startsWith('7') || cleaned.startsWith('6'))) {
      return { isValid: true, formatted: `255${cleaned}`, error: '' };
    }
    if (cleaned.length === 10 && cleaned.startsWith('0')) {
      return { isValid: true, formatted: `255${cleaned.substring(1)}`, error: '' };
    }
    if (cleaned.length === 12 && cleaned.startsWith('255')) {
      return { isValid: true, formatted: cleaned, error: '' };
    }
    
    return { 
      isValid: false, 
      formatted: cleaned, 
      error: 'Please enter a valid Tanzanian phone number (e.g., 0712345678 or 712345678)' 
    };
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPhoneNumber(value);
    const validation = validatePhoneNumber(value);
    setPhoneError(validation.error);
  };

  const handlePayment = async () => {
    if (!selectedPkg) {
      dispatch(addNotification({
        type: 'error',
        message: 'Please select a package',
      }));
      return;
    }

    const validation = validatePhoneNumber(phoneNumber);
    if (!validation.isValid) {
      setPhoneError(validation.error);
      dispatch(addNotification({
        type: 'error',
        message: validation.error,
      }));
      return;
    }

    setPaymentProcessing(true);
    setLoading(true);
    
    try {
      let response;
      const formattedPhone = validation.formatted;
      
      console.log('📤 Payment request details:', {
        method: paymentMethod,
        packageId: selectedPackage,
        phoneNumber: formattedPhone,
        amount: selectedPkg.price,
        provider: paymentMethod === 'azampay' ? (paymentType === 'mobile' ? mobileProvider : bankProvider) : undefined
      });
      
      if (paymentMethod === 'mpesa') {
        response = await api.post('/payments/mpesa/initiate', {
          packageId: selectedPackage,
          phoneNumber: formattedPhone,
        });
      } else {
        const payload = {
          packageId: selectedPackage,
          phoneNumber: formattedPhone,
          provider: paymentType === 'mobile' ? mobileProvider : bankProvider,
        };
        
        console.log('📤 AzamPay payload:', JSON.stringify(payload, null, 2));
        
        response = await api.post('/azampay/mobile/initiate', payload);
      }

      console.log('📥 Payment response:', response.data);

      if (response.data.success) {
        setCurrentTransaction(response.data.data);
        setPaymentDialogOpen(true);
        setPaymentStatus('pending');
        
        const transactionId = response.data.data.transactionId || 
                            response.data.data.reference ||
                            response.data.data.checkoutRequestID;
                            
        if (transactionId) {
          pollTransactionStatus(transactionId);
        }
      } else {
        dispatch(addNotification({
          type: 'error',
          message: response.data.message || 'Payment initiation failed',
        }));
        setPaymentProcessing(false);
        setLoading(false);
      }
    } catch (error: any) {
      console.error('❌ Payment error:', error);
      
      let errorMessage = 'Payment failed';
      if (error.response) {
        console.error('❌ Error status:', error.response.status);
        console.error('❌ Error data:', error.response.data);
        
        if (error.response.data?.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.data?.error) {
          errorMessage = error.response.data.error;
        } else if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        } else {
          errorMessage = JSON.stringify(error.response.data);
        }
      } else if (error.request) {
        errorMessage = 'No response from server. Please check your connection.';
      } else {
        errorMessage = error.message || 'Payment failed';
      }
      
      dispatch(addNotification({
        type: 'error',
        message: errorMessage,
      }));
      setPaymentProcessing(false);
      setLoading(false);
    }
  };

  const pollTransactionStatus = async (transactionId: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await api.get(`/payments/transaction/${transactionId}`);
        
        if (response.data.data?.status === 'completed') {
          setPaymentStatus('success');
          setPaymentProcessing(false);
          setLoading(false);
          clearInterval(interval);
          setTimeout(() => window.location.reload(), 2000);
        } else if (response.data.data?.status === 'failed') {
          setPaymentStatus('failed');
          setPaymentProcessing(false);
          setLoading(false);
          clearInterval(interval);
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 3000);

    setTimeout(() => {
      clearInterval(interval);
      if (paymentStatus === 'pending') {
        setPaymentStatus('failed');
        setPaymentProcessing(false);
        setLoading(false);
      }
    }, 120000);
  };

  const getMessageEstimate = (credits: number) => {
    const paygRate = PRICING.tanzania.payg;
    return Math.floor(credits / paygRate);
  };

  if (initialLoading) {
    return (
      <Box>
        <Skeleton variant="text" width={300} height={50} sx={{ mb: 2 }} />
        <Skeleton variant="text" width={500} height={30} sx={{ mb: 4 }} />
        
        {/* Balance Skeleton */}
        <Paper sx={{ p: 3, mb: 4, bgcolor: 'primary.main' }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Skeleton variant="text" width={150} height={20} sx={{ bgcolor: 'rgba(255,255,255,0.3)' }} />
              <Skeleton variant="text" width={200} height={60} sx={{ bgcolor: 'rgba(255,255,255,0.3)' }} />
            </Grid>
            <Grid item xs={12} md={6}>
              <Skeleton variant="text" width={150} height={20} sx={{ bgcolor: 'rgba(255,255,255,0.3)' }} />
              <Skeleton variant="text" width={200} height={40} sx={{ bgcolor: 'rgba(255,255,255,0.3)' }} />
            </Grid>
          </Grid>
        </Paper>

        {/* Packages Skeleton */}
        <Skeleton variant="text" width={200} height={40} sx={{ mb: 3 }} />
        <PackageSkeleton />
      </Box>
    );
  }

  return (
    <Box>
      {/* Loading Backdrop for payment processing */}
      <Backdrop
        sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={paymentProcessing}
      >
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress color="inherit" size={60} sx={{ mb: 2 }} />
          <Typography variant="h6">
            {paymentStatus === 'pending' ? 'Processing Payment...' : 'Initiating Payment...'}
          </Typography>
          <Typography variant="body2" sx={{ mt: 1, opacity: 0.8 }}>
            Please wait while we process your request
          </Typography>
        </Box>
      </Backdrop>

      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Buy Credits
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Purchase SMS credits to start sending messages. All prices include VAT.
      </Typography>

      {/* Current Balance with loading state */}
      <Paper sx={{ p: 3, mb: 4, bgcolor: 'primary.main', color: 'white' }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <WalletIcon />
              <Typography variant="body2" gutterBottom>
                Your Current Balance
              </Typography>
            </Box>
            <Typography variant="h3" fontWeight="bold">
              {user?.credits?.toLocaleString() || 0} credits
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" gutterBottom>
              Approximate SMS volume
            </Typography>
            <Typography variant="h5">
              ≈ {getMessageEstimate(user?.credits || 0).toLocaleString()} messages
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.8 }}>
              at {formatAvgCostInTZS(PRICING.tanzania.payg)} per SMS (PAYG)
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Credit Packages */}
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        Choose a Package
      </Typography>
      
      <Fade in={!initialLoading}>
        <div>
          <CreditPackages
            packages={packages}
            selectedPackage={selectedPackage}
            onSelect={setSelectedPackage}
            showSavings={true}
          />
        </div>
      </Fade>

      {/* Payment Method Selection */}
      <Paper sx={{ p: 4, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          <PaymentIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Select Payment Method
        </Typography>
        <Divider sx={{ my: 2 }} />

        <FormControl component="fieldset" sx={{ mb: 3 }}>
          <RadioGroup
            row
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as 'mpesa' | 'azampay')}
          >
            <FormControlLabel 
              value="mpesa" 
              control={<Radio />} 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <PhoneIcon sx={{ mr: 1, color: 'primary.main' }} />
                  M-Pesa
                </Box>
              } 
            />
            <FormControlLabel 
              value="azampay" 
              control={<Radio />} 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <PaymentIcon sx={{ mr: 1, color: 'primary.main' }} />
                  AzamPay (All Networks & Banks)
                </Box>
              } 
            />
          </RadioGroup>
        </FormControl>

        {paymentMethod === 'azampay' && (
          <Zoom in={paymentMethod === 'azampay'}>
            <Box sx={{ mb: 3 }}>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Payment Type</InputLabel>
                <Select
                  value={paymentType}
                  label="Payment Type"
                  onChange={(e) => setPaymentType(e.target.value as 'mobile' | 'bank')}
                >
                  <MenuItem value="mobile">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PhoneIphoneIcon />
                      Mobile Money
                    </Box>
                  </MenuItem>
                  <MenuItem value="bank">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AccountBalanceIcon />
                      Bank Transfer
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>

              {paymentType === 'mobile' ? (
                <FormControl fullWidth>
                  <InputLabel>Mobile Network</InputLabel>
                  <Select
                    value={mobileProvider}
                    label="Mobile Network"
                    onChange={(e) => setMobileProvider(e.target.value)}
                  >
                    {mobileProviders.map(provider => (
                      <MenuItem key={provider.value} value={provider.value}>
                        {provider.name}
                      </MenuItem>
                    ))}
                  </Select>
                  <FormHelperText>
                    Select your mobile money provider
                  </FormHelperText>
                </FormControl>
              ) : (
                <FormControl fullWidth>
                  <InputLabel>Bank</InputLabel>
                  <Select
                    value={bankProvider}
                    label="Bank"
                    onChange={(e) => setBankProvider(e.target.value)}
                  >
                    {bankProviders.map(provider => (
                      <MenuItem key={provider.value} value={provider.value}>
                        {provider.name}
                      </MenuItem>
                    ))}
                  </Select>
                  <FormHelperText>
                    You'll need OTP from your bank app
                  </FormHelperText>
                </FormControl>
              )}
            </Box>
          </Zoom>
        )}

        {/* Phone Number Input */}
        <TextField
          fullWidth
          label="Phone Number"
          value={phoneNumber}
          onChange={handlePhoneChange}
          error={!!phoneError}
          helperText={phoneError || (paymentMethod === 'mpesa' 
            ? "Enter the M-Pesa registered phone number"
            : "Enter your phone number for payment")}
          placeholder="e.g., 0712345678 or 712345678"
          InputProps={{
            startAdornment: <PhoneIcon sx={{ mr: 1, color: 'text.secondary' }} />,
          }}
          sx={{ mb: 3 }}
          disabled={paymentProcessing}
        />

        {selectedPkg && (
          <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="subtitle1" gutterBottom>
              Payment Summary
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography>Package:</Typography>
              <Typography fontWeight="bold">{selectedPkg.credits.toLocaleString()} Credits</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography>Amount:</Typography>
              <Typography fontWeight="bold" color="primary.main">
                {formatCostInTZS(selectedPkg.price)}
              </Typography>
            </Box>
            <Divider sx={{ my: 1 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography>PAYG rate:</Typography>
              <Typography>{formatAvgCostInTZS(PRICING.tanzania.payg)} per SMS</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography>This package rate:</Typography>
              <Typography color="success.main">
                {formatAvgCostInTZS(selectedPkg.pricePerSMS)} per SMS
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography>You save:</Typography>
              <Typography color="success.main" fontWeight="bold">
                {formatCostInTZS((selectedPkg.credits * PRICING.tanzania.payg) - selectedPkg.price)}
              </Typography>
            </Box>
          </Box>
        )}

        <Button
          variant="contained"
          size="large"
          fullWidth
          sx={{ 
            mt: 3, 
            height: 48,
            position: 'relative',
            '&.Mui-disabled': {
              backgroundColor: 'action.disabledBackground',
            }
          }}
          onClick={handlePayment}
          disabled={loading || !phoneNumber || !!phoneError || !selectedPkg || paymentProcessing}
        >
          {loading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <CircularProgress size={24} color="inherit" />
              <Typography>
                {paymentStatus === 'pending' ? 'Processing...' : 'Initiating...'}
              </Typography>
            </Box>
          ) : (
            `Pay ${selectedPkg ? formatCostInTZS(selectedPkg.price) : ''} with ${paymentMethod === 'mpesa' ? 'M-Pesa' : 'AzamPay'}`
          )}
        </Button>
      </Paper>

      {/* Payment Status Dialog */}
      <Dialog 
        open={paymentDialogOpen} 
        onClose={() => !paymentProcessing && setPaymentDialogOpen(false)}
        TransitionComponent={Fade}
      >
        <DialogTitle>
          {paymentStatus === 'pending' && 'Processing Payment'}
          {paymentStatus === 'success' && 'Payment Successful!'}
          {paymentStatus === 'failed' && 'Payment Failed'}
        </DialogTitle>
        <DialogContent>
          {paymentStatus === 'pending' && (
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <CircularProgress size={64} sx={{ mb: 3 }} />
              <Typography variant="body1" gutterBottom>
                Please check your phone and complete the payment
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Amount: {selectedPkg && formatCostInTZS(selectedPkg.price)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Reference: {currentTransaction?.reference || currentTransaction?.transactionId}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                This may take a few moments...
              </Typography>
            </Box>
          )}

          {paymentStatus === 'success' && (
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <Zoom in={paymentStatus === 'success'}>
                <CheckCircleIcon color="success" sx={{ fontSize: 64, mb: 2 }} />
              </Zoom>
              <Typography variant="h6" gutterBottom>
                {selectedPkg?.credits.toLocaleString()} Credits Added Successfully!
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Your new balance will update in a moment.
              </Typography>
            </Box>
          )}

          {paymentStatus === 'failed' && (
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <Zoom in={paymentStatus === 'failed'}>
                <InfoIcon color="error" sx={{ fontSize: 64, mb: 2 }} />
              </Zoom>
              <Typography variant="h6" gutterBottom>
                Payment Failed
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Please try again or contact support.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setPaymentDialogOpen(false);
              if (paymentStatus === 'success') {
                navigate('/dashboard');
              }
            }}
            disabled={paymentStatus === 'pending'}
          >
            {paymentStatus === 'success' ? 'Go to Dashboard' : 'Close'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Info Alert about pricing */}
      <Alert severity="info" sx={{ mt: 2 }}>
        <Typography variant="body2">
          <strong>PAYG Rate:</strong> {formatAvgCostInTZS(PRICING.tanzania.payg)} per SMS for first 500 messages.
          Volume discounts apply for larger purchases.
        </Typography>
      </Alert>
    </Box>
  );
};

export default BuyCredits;