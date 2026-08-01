import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  LinearProgress,
  Pagination,
  Alert,
} from '@mui/material';
import api from '../../services/api';
import { formatCostInTZS, formatCostInTZSCompact } from '../../utils/currency';
import { PRICING } from '../../config/pricing';

interface Transaction {
  id: string;
  type: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed';
  paymentMethod: string;
  description: string;
  creditsBefore: number;
  creditsAfter: number;
  createdAt: string;
}

const Transactions: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState('');

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/payments/transactions', {
        params: { page, limit: 20 }
      });
      
      setTransactions(response.data.data.transactions);
      setTotalPages(response.data.data.pagination.pages);
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'pending': return 'warning';
      case 'failed': return 'error';
      default: return 'default';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-TZ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Format amount based on currency
  const formatAmount = (amount: number, currency: string, type: string) => {
    // If currency is TZS or not specified, use TZS formatting
    if (!currency || currency === 'TZS') {
      return formatCostInTZS(amount);
    }
    
    // For USD, convert to TZS using exchange rate from pricing
    if (currency === 'USD') {
      const tzsAmount = amount * PRICING.exchangeRate.USD_TO_TZS;
      return formatCostInTZS(tzsAmount);
    }
    
    // Fallback for other currencies
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Calculate the value of credits in TZS
  const calculateCreditsValue = (credits: number): string => {
    // Use PAYG rate to estimate value
    const value = credits * PRICING.tanzania.payg;
    return formatCostInTZSCompact(value);
  };

  // Get transaction icon/description based on type
  const getTransactionDescription = (tx: Transaction) => {
    const descriptions: Record<string, string> = {
      'credit_purchase': 'Credit Purchase',
      'sms_charge': 'SMS Usage Charge',
      'refund': 'Refund',
      'bonus': 'Bonus Credits',
      'subscription': 'Subscription Payment',
    };
    
    return tx.description || descriptions[tx.type] || tx.type.replace(/_/g, ' ');
  };

  if (loading) {
    return <LinearProgress />;
  }

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Transaction History
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Summary Stats */}
      {transactions.length > 0 && (
        <Paper sx={{ p: 2, mb: 3, bgcolor: 'grey.50' }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Quick Stats
          </Typography>
          <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Total Credits Purchased
              </Typography>
              <Typography variant="body1" fontWeight="medium">
                {transactions
                  .filter(tx => tx.type === 'credit_purchase')
                  .reduce((sum, tx) => sum + (tx.creditsAfter - tx.creditsBefore), 0)
                  .toLocaleString()} credits
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Estimated Value
              </Typography>
              <Typography variant="body1" fontWeight="medium" color="primary">
                {calculateCreditsValue(
                  transactions
                    .filter(tx => tx.type === 'credit_purchase')
                    .reduce((sum, tx) => sum + (tx.creditsAfter - tx.creditsBefore), 0)
                )}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Total Spent
              </Typography>
              <Typography variant="body1" fontWeight="medium" color="primary">
                {formatCostInTZS(
                  transactions
                    .filter(tx => tx.type === 'credit_purchase')
                    .reduce((sum, tx) => sum + tx.amount, 0) * PRICING.exchangeRate.USD_TO_TZS
                )}
              </Typography>
            </Box>
          </Box>
        </Paper>
      )}

      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Method</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell align="right">Credits</TableCell>
                <TableCell align="right">Value</TableCell>
                <TableCell align="center">Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">
                      No transactions found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((tx) => {
                  const isCredit = tx.type === 'credit_purchase' || tx.type === 'bonus' || tx.type === 'refund';
                  const isDebit = tx.type === 'sms_charge';
                  
                  return (
                    <TableRow key={tx.id} hover>
                      <TableCell>{formatDate(tx.createdAt)}</TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {getTransactionDescription(tx)}
                          </Typography>
                          {tx.type === 'credit_purchase' && (
                            <Typography variant="caption" color="text.secondary">
                              {tx.creditsAfter - tx.creditsBefore} credits added
                            </Typography>
                          )}
                          {tx.type === 'sms_charge' && (
                            <Typography variant="caption" color="text.secondary">
                              {tx.creditsBefore - tx.creditsAfter} messages sent
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={tx.paymentMethod}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography
                          fontWeight="bold"
                          color={isDebit ? 'error.main' : 'success.main'}
                        >
                          {isDebit ? '−' : '+'}
                          {formatAmount(tx.amount, tx.currency, tx.type)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          {tx.creditsBefore.toLocaleString()} → {tx.creditsAfter.toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" color="text.secondary">
                          {calculateCreditsValue(
                            isCredit 
                              ? tx.creditsAfter - tx.creditsBefore 
                              : tx.creditsBefore - tx.creditsAfter
                          )}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={tx.status}
                          color={getStatusColor(tx.status)}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(e, value) => setPage(value)}
              color="primary"
            />
          </Box>
        )}
      </Paper>

      {/* Info Alert */}
      <Alert severity="info" sx={{ mt: 3 }}>
        <Typography variant="body2">
          <strong>Note:</strong> Credit values are estimated at {formatCostInTZSCompact(PRICING.tanzania.payg)} per SMS (PAYG rate). 
          Actual value may vary based on volume discounts.
        </Typography>
      </Alert>
    </Box>
  );
};

export default Transactions;