import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  Alert,
  Button,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  IconButton,
  CircularProgress,
} from '@mui/material';
import {
  Speed as SpeedIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,
  CalendarToday as CalendarIcon,
  Sms as SmsIcon,
} from '@mui/icons-material';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import smsService from '../../services/sms';
import { PRICING } from '../../config/pricing';
import { formatCostInTZS, formatAvgCostInTZS } from '../../utils/currency';
import { useNavigate } from 'react-router-dom';

interface UsageStats {
  currentMonth: {
    sent: number;
    delivered: number;
    failed: number;
    cost: number;
    estimatedCost: number;
  };
  previousMonth: {
    sent: number;
    delivered: number;
    failed: number;
    cost: number;
  };
  limits: {
    monthlyQuota: number;
    dailyQuota: number;
    concurrentCampaigns: number;
    contactsPerList: number;
    apiCallsPerMinute: number;
  };
  usage: Array<{
    date: string;
    sent: number;
    delivered: number;
    cost: number;
  }>;
}

const UsageLimits: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  
  const user = useSelector((state: RootState) => state.auth.user) as any;
  const navigate = useNavigate();

  useEffect(() => {
    fetchUsageStats();
  }, [selectedMonth]);

  const fetchUsageStats = async () => {
    try {
      setLoading(true);
      
      // In a real app, you would fetch this from your API
      // For now, we'll use mock data
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockStats: UsageStats = {
        currentMonth: {
          sent: 15420,
          delivered: 14850,
          failed: 570,
          cost: 15420 * PRICING.tanzania.payg,
          estimatedCost: 15420 * PRICING.tanzania.payg,
        },
        previousMonth: {
          sent: 12350,
          delivered: 11980,
          failed: 370,
          cost: 12350 * PRICING.tanzania.payg,
        },
        limits: {
          monthlyQuota: 50000,
          dailyQuota: 5000,
          concurrentCampaigns: 10,
          contactsPerList: 100000,
          apiCallsPerMinute: 60,
        },
        usage: Array.from({ length: 30 }, (_, i) => ({
          date: format(subMonths(new Date(), 0), 'yyyy-MM-dd'),
          sent: Math.floor(Math.random() * 1000 + 500),
          delivered: Math.floor(Math.random() * 950 + 450),
          cost: Math.floor(Math.random() * 50000 + 10000),
        })),
      };
      
      setStats(mockStats);
    } catch (error) {
      console.error('Failed to fetch usage stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculatePercentage = (used: number, total: number) => {
    return Math.min((used / total) * 100, 100);
  };

  const getProgressColor = (percentage: number) => {
    if (percentage < 50) return 'success';
    if (percentage < 75) return 'info';
    if (percentage < 90) return 'warning';
    return 'error';
  };

  const formatLargeNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (loading || !stats) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  const currentUsagePercentage = calculatePercentage(
    stats.currentMonth.sent,
    stats.limits.monthlyQuota
  );

  const daysLeftInMonth = Math.max(
    0,
    endOfMonth(selectedMonth).getDate() - new Date().getDate()
  );

  const projectedMonthlyUsage = stats.currentMonth.sent + 
    (stats.currentMonth.sent / (new Date().getDate())) * daysLeftInMonth;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Usage & Limits
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Monitor your SMS usage and account limits
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={fetchUsageStats}
        >
          Refresh
        </Button>
      </Box>

      {/* Current Plan Info */}
      <Paper sx={{ p: 3, mb: 4, bgcolor: 'primary.light', color: 'white' }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={6}>
            <Typography variant="body2" gutterBottom sx={{ opacity: 0.8 }}>
              Current Plan
            </Typography>
            <Typography variant="h4" fontWeight="bold">
              {user?.role === 'super_admin' ? 'Enterprise Plan' : 'Professional Plan'}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.8, mt: 1 }}>
              Monthly quota: {formatLargeNumber(stats.limits.monthlyQuota)} SMS
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Box sx={{ textAlign: 'right' }}>
              <Chip 
                label="Active" 
                sx={{ bgcolor: 'white', color: 'primary.main', fontWeight: 'bold' }}
              />
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Usage Overview Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <SmsIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">Monthly Usage</Typography>
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="h3" fontWeight="bold" color="primary.main">
                  {formatLargeNumber(stats.currentMonth.sent)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  of {formatLargeNumber(stats.limits.monthlyQuota)} SMS limit
                </Typography>
              </Box>

              <Box sx={{ position: 'relative', mb: 1 }}>
                <LinearProgress
                  variant="determinate"
                  value={currentUsagePercentage}
                  color={getProgressColor(currentUsagePercentage)}
                  sx={{ height: 10, borderRadius: 5 }}
                />
              </Box>

              <Grid container spacing={2} sx={{ mt: 2 }}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Delivered
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {formatLargeNumber(stats.currentMonth.delivered)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Failed
                  </Typography>
                  <Typography variant="body1" fontWeight="medium" color="error">
                    {formatLargeNumber(stats.currentMonth.failed)}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TrendingUpIcon sx={{ mr: 1, color: 'success.main' }} />
                <Typography variant="h6">Projections</Typography>
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Projected month-end usage
                </Typography>
                <Typography variant="h4" fontWeight="bold" color="warning.main">
                  {formatLargeNumber(projectedMonthlyUsage)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {((projectedMonthlyUsage / stats.limits.monthlyQuota) * 100).toFixed(1)}% of quota
                </Typography>
              </Box>

              <Alert 
                severity={projectedMonthlyUsage > stats.limits.monthlyQuota ? 'error' : 'info'}
                icon={<InfoIcon />}
                sx={{ mt: 2 }}
              >
                {projectedMonthlyUsage > stats.limits.monthlyQuota ? (
                  <Typography variant="body2">
                    You're projected to exceed your monthly quota. Consider upgrading your plan.
                  </Typography>
                ) : (
                  <Typography variant="body2">
                    You have {formatLargeNumber(stats.limits.monthlyQuota - stats.currentMonth.sent)} SMS remaining this month.
                  </Typography>
                )}
              </Alert>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Limits Cards */}
      <Typography variant="h5" fontWeight="bold" sx={{ mb: 3 }}>
        Account Limits
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Daily SMS Limit
              </Typography>
              <Typography variant="h5" fontWeight="bold">
                {formatLargeNumber(stats.limits.dailyQuota)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                per day
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Concurrent Campaigns
              </Typography>
              <Typography variant="h5" fontWeight="bold">
                {stats.limits.concurrentCampaigns}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                at the same time
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Contacts per List
              </Typography>
              <Typography variant="h5" fontWeight="bold">
                {formatLargeNumber(stats.limits.contactsPerList)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                maximum
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                API Rate Limit
              </Typography>
              <Typography variant="h5" fontWeight="bold">
                {stats.limits.apiCallsPerMinute}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                calls per minute
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Cost Breakdown */}
      <Typography variant="h5" fontWeight="bold" sx={{ mb: 3 }}>
        Cost Breakdown
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                This Month
              </Typography>
              <Divider sx={{ my: 2 }} />
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Total Cost
                </Typography>
                <Typography variant="h4" color="primary.main" fontWeight="bold">
                  {formatCostInTZS(stats.currentMonth.cost)}
                </Typography>
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Average per SMS
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {formatAvgCostInTZS(stats.currentMonth.cost / stats.currentMonth.sent)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    vs Previous Month
                  </Typography>
                  <Typography 
                    variant="body1" 
                    fontWeight="medium"
                    color={stats.currentMonth.cost > stats.previousMonth.cost ? 'error' : 'success'}
                  >
                    {((stats.currentMonth.cost - stats.previousMonth.cost) / stats.previousMonth.cost * 100).toFixed(1)}%
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Rate Information
              </Typography>
              <Divider sx={{ my: 2 }} />

              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Current PAYG Rate
                </Typography>
                <Typography variant="h5" fontWeight="bold" color="success.main">
                  {formatAvgCostInTZS(PRICING.tanzania.payg)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  per SMS
                </Typography>
              </Box>

              <Typography variant="body2" color="text.secondary" gutterBottom>
                Volume Discounts
              </Typography>
              <Grid container spacing={1}>
                <Grid item xs={6}>
                  <Typography variant="caption" display="block">
                    1-500 SMS:
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" fontWeight="medium">
                    {formatAvgCostInTZS(PRICING.tanzania.tier1.price)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" display="block">
                    501-2,500 SMS:
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" fontWeight="medium">
                    {formatAvgCostInTZS(PRICING.tanzania.tier2.price)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" display="block">
                    2,501-10,000 SMS:
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" fontWeight="medium">
                    {formatAvgCostInTZS(PRICING.tanzania.tier3.price)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" display="block">
                    10,000+ SMS:
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" fontWeight="medium">
                    {formatAvgCostInTZS(PRICING.tanzania.tier4.price)}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Upgrade Notice */}
      <Alert 
        severity="info"
        action={
          <Button color="inherit" size="small" onClick={() => navigate('/billing')}>
            View Plans
          </Button>
        }
        sx={{ mt: 2 }}
      >
        <Typography variant="body2">
          <strong>Need higher limits?</strong> Upgrade your plan to increase your monthly quota 
          and get better rates. Current plan: {formatLargeNumber(stats.limits.monthlyQuota)} SMS/month.
        </Typography>
      </Alert>
    </Box>
  );
};

export default UsageLimits;