import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  Card,
  CardContent,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  Alert,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
} from '@mui/material';
import {
  Add as AddIcon,
  History as HistoryIcon,
  Payment as PaymentIcon,
  Receipt as ReceiptIcon,
  Download as DownloadIcon,
  CreditCard as CreditCardIcon,
  Phone as PhoneIcon,
} from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { format, subMonths } from 'date-fns';
import { RootState } from '../../store/store';
import { PRICING } from '../../config/pricing';
import { formatCostInTZS, formatAvgCostInTZS } from '../../utils/currency';

interface Invoice {
  id: string;
  date: Date;
  description: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed';
  paymentMethod: string;
}

const BillingSettings: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [buyCreditsDialog, setBuyCreditsDialog] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState('popular');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('mpesa');
  
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user) as any;

  // Sample invoices data
  const [invoices, setInvoices] = useState<Invoice[]>([
    {
      id: 'inv_001',
      date: new Date(),
      description: 'Credit Purchase - 10,000 SMS',
      amount: 100000,
      status: 'paid',
      paymentMethod: 'M-Pesa',
    },
    {
      id: 'inv_002',
      date: subMonths(new Date(), 1),
      description: 'Monthly Subscription',
      amount: 49000,
      status: 'paid',
      paymentMethod: 'M-Pesa',
    },
    {
      id: 'inv_003',
      date: subMonths(new Date(), 2),
      description: 'Credit Purchase - 5,000 SMS',
      amount: 55000,
      status: 'paid',
      paymentMethod: 'AzamPay',
    },
  ]);

  const creditPackages = PRICING.packages;

  const handleBuyCredits = () => {
    setBuyCreditsDialog(false);
    navigate('/buy-credits');
  };

  const handleDownloadInvoice = (invoiceId: string) => {
    console.log('Download invoice:', invoiceId);
    // Implementation for downloading invoice
  };

  // Calculate message estimates
  const getMessageEstimate = (credits: number) => {
    return Math.floor(credits / PRICING.tanzania.payg);
  };

  const getDiscountedMessageEstimate = (credits: number) => {
    return Math.floor(credits / PRICING.tanzania.tier4.price);
  };

  const userCredits = Number(user?.credits) || 0;

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Billing & Credits
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 4 }}>
        Manage your credits, view invoices, and handle payments
      </Typography>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Current Balance Card */}
      <Card sx={{ mb: 4, bgcolor: 'primary.main', color: 'white' }}>
        <CardContent>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={4}>
              <Typography variant="body2" gutterBottom sx={{ opacity: 0.8 }}>
                Available Credits
              </Typography>
              <Typography variant="h2" fontWeight="bold">
                {userCredits.toLocaleString()}
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="body2" gutterBottom sx={{ opacity: 0.8 }}>
                Value in TZS
              </Typography>
              <Typography variant="h4" fontWeight="bold">
                {formatCostInTZS(userCredits)}
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="body2" gutterBottom sx={{ opacity: 0.8 }}>
                Messages You Can Send
              </Typography>
              <Typography variant="h4" fontWeight="bold">
                ~{getMessageEstimate(userCredits).toLocaleString()}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.7 }}>
                at {formatAvgCostInTZS(PRICING.tanzania.payg)} each
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <PaymentIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">Buy Credits</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" paragraph>
                Purchase SMS credits to keep your campaigns running. Volume discounts available.
              </Typography>
              <Grid container spacing={2} sx={{ mt: 2 }}>
                {creditPackages.slice(0, 2).map((pkg) => (
                  <Grid item xs={6} key={pkg.id}>
                    <Card variant="outlined" sx={{ p: 1, textAlign: 'center' }}>
                      <Typography variant="subtitle2">{pkg.credits.toLocaleString()} Credits</Typography>
                      <Typography variant="h6" color="primary.main">
                        {formatCostInTZS(pkg.price)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatAvgCostInTZS(pkg.pricePerSMS)}/SMS
                      </Typography>
                    </Card>
                  </Grid>
                ))}
              </Grid>
              <Button
                variant="contained"
                fullWidth
                startIcon={<AddIcon />}
                onClick={() => navigate('/buy-credits')}
                sx={{ mt: 2 }}
              >
                Buy Credits
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <HistoryIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">Transaction History</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" paragraph>
                View your complete transaction history and download receipts.
              </Typography>
              <Button
                variant="outlined"
                fullWidth
                startIcon={<ReceiptIcon />}
                onClick={() => navigate('/transactions')}
              >
                View All Transactions
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Pricing Information */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Current Pricing
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Our volume-based pricing ensures you get the best rates for your SMS campaigns.
          </Typography>
          
          <Grid container spacing={2} sx={{ mt: 2 }}>
            <Grid item xs={12} md={3}>
              <Card variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="subtitle2" color="text.secondary">PAYG</Typography>
                <Typography variant="h5" color="primary.main" fontWeight="bold">
                  {formatAvgCostInTZS(PRICING.tanzania.payg)}
                </Typography>
                <Typography variant="caption">per SMS</Typography>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card variant="outlined" sx={{ p: 2, textAlign: 'center', bgcolor: 'primary.light', color: 'white' }}>
                <Typography variant="subtitle2" sx={{ opacity: 0.8 }}>Tier 1</Typography>
                <Typography variant="h5" fontWeight="bold">
                  {formatAvgCostInTZS(PRICING.tanzania.tier1.price)}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.8 }}>1-500 SMS</Typography>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card variant="outlined" sx={{ p: 2, textAlign: 'center', bgcolor: 'success.light', color: 'white' }}>
                <Typography variant="subtitle2" sx={{ opacity: 0.8 }}>Tier 2</Typography>
                <Typography variant="h5" fontWeight="bold">
                  {formatAvgCostInTZS(PRICING.tanzania.tier2.price)}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.8 }}>501-2,500 SMS</Typography>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card variant="outlined" sx={{ p: 2, textAlign: 'center', bgcolor: 'warning.light', color: 'white' }}>
                <Typography variant="subtitle2" sx={{ opacity: 0.8 }}>Tier 3+</Typography>
                <Typography variant="h5" fontWeight="bold">
                  {formatAvgCostInTZS(PRICING.tanzania.tier3.price)}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.8 }}>2,500+ SMS</Typography>
              </Card>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Typography variant="h6" gutterBottom>
        Recent Invoices
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Payment Method</TableCell>
              <TableCell align="right">Amount</TableCell>
              <TableCell align="center">Status</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {invoices.map((invoice) => (
              <TableRow key={invoice.id} hover>
                <TableCell>{format(invoice.date, 'MMM dd, yyyy')}</TableCell>
                <TableCell>{invoice.description}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {invoice.paymentMethod === 'M-Pesa' ? <PhoneIcon fontSize="small" /> : <CreditCardIcon fontSize="small" />}
                    {invoice.paymentMethod}
                  </Box>
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 'medium' }}>
                  {formatCostInTZS(invoice.amount)}
                </TableCell>
                <TableCell align="center">
                  <Chip
                    label={invoice.status}
                    size="small"
                    color={
                      invoice.status === 'paid' ? 'success' :
                      invoice.status === 'pending' ? 'warning' : 'error'
                    }
                  />
                </TableCell>
                <TableCell align="center">
                  <IconButton
                    size="small"
                    onClick={() => handleDownloadInvoice(invoice.id)}
                    title="Download Invoice"
                  >
                    <DownloadIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Buy Credits Dialog */}
      <Dialog open={buyCreditsDialog} onClose={() => setBuyCreditsDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Buy Credits</DialogTitle>
        <DialogContent>
          <Typography variant="body2" paragraph sx={{ mt: 1 }}>
            Select a credit package to purchase. All prices include VAT.
          </Typography>
          
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {creditPackages.map((pkg) => (
              <Grid item xs={12} sm={6} key={pkg.id}>
                <Card
                  variant={selectedPackage === pkg.id ? 'outlined' : 'outlined'}
                  sx={{
                    cursor: 'pointer',
                    border: selectedPackage === pkg.id ? 2 : 1,
                    borderColor: selectedPackage === pkg.id ? 'primary.main' : 'divider',
                  }}
                  onClick={() => setSelectedPackage(pkg.id)}
                >
                  <CardContent>
                    <Typography variant="h6" align="center">
                      {pkg.credits.toLocaleString()} Credits
                    </Typography>
                    <Typography variant="h5" align="center" color="primary.main" fontWeight="bold" sx={{ my: 1 }}>
                      {formatCostInTZS(pkg.price)}
                    </Typography>
                    <Typography variant="caption" align="center" display="block" color="text.secondary">
                      {formatAvgCostInTZS(pkg.pricePerSMS)} per SMS
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          <TextField
            fullWidth
            label="Phone Number"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="e.g., 0712345678"
            sx={{ mb: 2 }}
          />

          <FormControl fullWidth>
            <InputLabel>Payment Method</InputLabel>
            <Select
              value={paymentMethod}
              label="Payment Method"
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              <MenuItem value="mpesa">M-Pesa</MenuItem>
              <MenuItem value="tigo">TigoPesa</MenuItem>
              <MenuItem value="airtel">Airtel Money</MenuItem>
              <MenuItem value="azampay">AzamPay</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBuyCreditsDialog(false)}>Cancel</Button>
          <Button
            onClick={handleBuyCredits}
            variant="contained"
            disabled={!phoneNumber}
          >
            Proceed to Payment
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BillingSettings;