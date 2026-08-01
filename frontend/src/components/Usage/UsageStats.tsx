import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Grid,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
} from '@mui/material';
import {
  Send as SendIcon,
  People as PeopleIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import api from '../../services/api';
import { format } from 'date-fns';

interface UsageData {
  tier: string;
  limits: {
    dailySMS: number;
    monthlySMS: number;
    maxContacts: number;
  };
  usage: {
    today: number;
    month: number;
    contacts: number;
  };
  remaining: {
    today: number;
    month: number;
    contacts: number;
  };
  recentActivity: any[];
}

// Helper function to safely format currency
const formatCost = (cost: any): string => {
  if (cost === null || cost === undefined) return '0.00';
  const num = typeof cost === 'string' ? parseFloat(cost) : Number(cost);
  return isNaN(num) ? '0.00' : num.toFixed(4);
};

const UsageStats: React.FC = () => {
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUsage();
  }, []);

  const fetchUsage = async () => {
    try {
      const response = await api.get('/usage');
      setData(response.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load usage data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LinearProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!data) return null;

  const todayPercentage = (data.usage.today / data.limits.dailySMS) * 100;
  const monthPercentage = (data.usage.month / data.limits.monthlySMS) * 100;
  const contactsPercentage = (data.usage.contacts / data.limits.maxContacts) * 100;

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'error';
    if (percentage >= 70) return 'warning';
    return 'success';
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight="bold">
          Usage Dashboard
        </Typography>
        <Chip
          label={`${data.tier} Plan`}
          color="primary"
          sx={{ fontWeight: 'bold' }}
        />
      </Box>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <SendIcon sx={{ color: '#00C2A8', mr: 1 }} />
                <Typography variant="h6">Daily SMS</Typography>
              </Box>
              <Typography variant="h3" sx={{ mb: 1 }}>
                {data.usage.today} / {data.limits.dailySMS}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={Math.min(todayPercentage, 100)}
                color={getProgressColor(todayPercentage)}
                sx={{ height: 10, borderRadius: 5 }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                {data.remaining.today} remaining today
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <SendIcon sx={{ color: '#00C2A8', mr: 1 }} />
                <Typography variant="h6">Monthly SMS</Typography>
              </Box>
              <Typography variant="h3" sx={{ mb: 1 }}>
                {data.usage.month} / {data.limits.monthlySMS}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={Math.min(monthPercentage, 100)}
                color={getProgressColor(monthPercentage)}
                sx={{ height: 10, borderRadius: 5 }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                {data.remaining.month} remaining this month
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <PeopleIcon sx={{ color: '#00C2A8', mr: 1 }} />
                <Typography variant="h6">Contacts</Typography>
              </Box>
              <Typography variant="h3" sx={{ mb: 1 }}>
                {data.usage.contacts} / {data.limits.maxContacts}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={Math.min(contactsPercentage, 100)}
                color={getProgressColor(contactsPercentage)}
                sx={{ height: 10, borderRadius: 5 }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                {data.remaining.contacts} remaining
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {data.remaining.today < 10 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <WarningIcon sx={{ mr: 1 }} />
          You're running low on daily SMS credits ({data.remaining.today} remaining). Consider upgrading your plan.
        </Alert>
      )}

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Recent Activity
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Phone Number</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Cost</TableCell>
                <TableCell>Date</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.recentActivity.map((msg) => (
                <TableRow key={msg.id}>
                  <TableCell>{msg.phoneNumber}</TableCell>
                  <TableCell>
                    <Chip
                      label={msg.status}
                      size="small"
                      color={
                        msg.status === 'delivered' ? 'success' :
                        msg.status === 'failed' ? 'error' : 'warning'
                      }
                    />
                  </TableCell>
                  <TableCell>${formatCost(msg.cost)}</TableCell>
                  <TableCell>{format(new Date(msg.createdAt), 'MMM dd, HH:mm')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default UsageStats;
