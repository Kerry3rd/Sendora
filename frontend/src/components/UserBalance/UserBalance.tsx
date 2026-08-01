// src/components/UserBalance/UserBalance.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Chip,
  Tooltip,
  IconButton,
  Menu,
  MenuItem,
  Button,
  CircularProgress,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  AccountBalanceWallet as WalletIcon,
  Add as AddIcon,
  Info as InfoIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import smsService from '../../services/sms';
import { wsService } from '../../services/websocket';
import { formatCostInTZS, formatAvgCostInTZS } from '../../utils/currency';
import { PRICING } from '../../config/pricing';
import { colors } from '../../theme/colors';
import { updateUserCredits } from '../../store/slices/authSlice'; // FIXED: Use correct export name

const UserBalance: React.FC = () => {
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [messageEstimate, setMessageEstimate] = useState<number>(0);
  const [showBalanceAlert, setShowBalanceAlert] = useState(false);
  const [lastChange, setLastChange] = useState<number | null>(null);
  
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);

  // Initial fetch
  useEffect(() => {
    fetchBalance();
  }, []);

  // WebSocket real-time balance updates
  useEffect(() => {
    // Listen for real-time balance updates
    const handleBalanceUpdate = (data: any) => {
      console.log('💰 Real-time balance update:', data);
      
      // Calculate change if not provided
      const change = data.change || data.balance - balance;
      
      // Update local state
      setBalance(data.balance);
      setMessageEstimate(Math.floor(data.balance / PRICING.tanzania.payg));
      setLastChange(change);
      
      // Update Redux store using authSlice - FIXED: Use updateUserCredits
      dispatch(updateUserCredits(data.balance));
      
      // Show alert for significant changes
      if (Math.abs(change) > 0) {
        setShowBalanceAlert(true);
        setTimeout(() => setShowBalanceAlert(false), 5000);
      }
    };

    // Listen for credit purchase completion
    const handleCreditPurchase = (data: any) => {
      console.log('💳 Credits purchased:', data);
    };

    // Register WebSocket event listeners
    wsService.on('balance:update', handleBalanceUpdate);
    wsService.on('credits:purchased', handleCreditPurchase);

    // Cleanup
    return () => {
      wsService.off('balance:update', handleBalanceUpdate);
      wsService.off('credits:purchased', handleCreditPurchase);
    };
  }, [balance, dispatch]);

  const fetchBalance = async () => {
    try {
      setLoading(true);
      const response = await smsService.getBalance();
      if (response.success) {
        const credits = response.data.user.credits;
        setBalance(credits);
        setMessageEstimate(Math.floor(credits / PRICING.tanzania.payg));
        
        // Update Redux store - FIXED: Use updateUserCredits
        dispatch(updateUserCredits(credits));
      }
    } catch (error) {
      console.error('Failed to fetch balance:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleBuyCredits = () => {
    handleMenuClose();
    navigate('/buy-credits');
  };

  const handleTransactions = () => {
    handleMenuClose();
    navigate('/transactions');
  };

  const handleRefresh = () => {
    fetchBalance();
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <CircularProgress size={20} />
      </Box>
    );
  }

  return (
    <>
      <Tooltip title="Click for more options">
        <Chip
          icon={<WalletIcon />}
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography variant="body2" fontWeight="bold">
                {balance.toLocaleString()}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                credits
              </Typography>
            </Box>
          }
          onClick={handleMenuOpen}
          color={balance < 100 ? 'warning' : 'default'}
          variant="outlined"
          sx={{
            borderColor: colors.gray[300],
            '&:hover': {
              borderColor: colors.teal,
              backgroundColor: colors.softTeal,
            },
            cursor: 'pointer',
            transition: 'all 0.2s',
            animation: lastChange ? 'pulse 1s' : 'none',
            '@keyframes pulse': {
              '0%': { transform: 'scale(1)' },
              '50%': { transform: 'scale(1.05)', backgroundColor: colors.softTeal },
              '100%': { transform: 'scale(1)' }
            }
          }}
        />
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            minWidth: 320,
            p: 2,
            mt: 1,
          },
        }}
      >
        <Box sx={{ px: 1, py: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Your Balance
            </Typography>
            <Tooltip title="Refresh balance">
              <IconButton size="small" onClick={handleRefresh}>
                <TrendingUpIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
          
          <Typography variant="h5" fontWeight="bold" color={colors.navy}>
            {balance.toLocaleString()} credits
          </Typography>
          
          {lastChange && lastChange !== 0 && (
            <Typography 
              variant="caption" 
              color={lastChange > 0 ? 'success.main' : 'error.main'}
              sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}
            >
              {lastChange > 0 ? '↑' : '↓'} {Math.abs(lastChange).toLocaleString()} credits just now
            </Typography>
          )}
          
          <Box sx={{ mt: 2, mb: 2 }}>
            <Typography variant="caption" color="text.secondary" display="block">
              Estimated messages you can send:
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
              <Typography variant="body2" fontWeight="medium">
                ~{messageEstimate.toLocaleString()} messages
              </Typography>
              <Tooltip title={`At PAYG rate of ${formatAvgCostInTZS(PRICING.tanzania.payg)} per SMS`}>
                <InfoIcon fontSize="small" sx={{ color: colors.gray[400], cursor: 'help' }} />
              </Tooltip>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
            <Button
              variant="contained"
              size="small"
              fullWidth
              startIcon={<AddIcon />}
              onClick={handleBuyCredits}
              sx={{ bgcolor: colors.teal, '&:hover': { bgcolor: colors.navy } }}
            >
              Buy Credits
            </Button>
            <Button
              variant="outlined"
              size="small"
              fullWidth
              onClick={handleTransactions}
            >
              History
            </Button>
          </Box>

          {balance < 500 && (
            <Box sx={{ mt: 2, p: 1, bgcolor: colors.warning + '20', borderRadius: 1 }}>
              <Typography variant="caption" color="warning.main">
                ⚠️ Low balance. Consider buying more credits to avoid service interruption.
              </Typography>
            </Box>
          )}
        </Box>
      </Menu>

      <Snackbar
        open={showBalanceAlert}
        autoHideDuration={5000}
        onClose={() => setShowBalanceAlert(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          severity={lastChange && lastChange > 0 ? 'success' : 'info'}
          variant="filled"
          onClose={() => setShowBalanceAlert(false)}
        >
          {lastChange && lastChange > 0 
            ? `💰 ${lastChange.toLocaleString()} credits added!`
            : lastChange && lastChange < 0
            ? `📤 ${Math.abs(lastChange).toLocaleString()} credits used`
            : ''}
        </Alert>
      </Snackbar>
    </>
  );
};

export default UserBalance;