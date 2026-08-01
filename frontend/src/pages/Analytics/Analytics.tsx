import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Divider,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  Alert,
  Avatar,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,
  Send as SendIcon,
  CheckCircle as CheckCircleIcon,
  AttachMoney as AttachMoneyIcon,
} from '@mui/icons-material';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { format } from 'date-fns';
import { formatCostInTZS, formatAvgCostInTZS, formatTZSCompact } from '../../utils/currency';
import { PRICING } from '../../config/pricing';

interface AnalyticsData {
  overview: {
    totalMessages: number;
    totalCampaigns: number;
    totalContacts: number;
    totalCost: number;
    deliveryRate: number;
    averageCostPerMessage: number;
  };
  timeline: Array<{
    date: string;
    sent: number;
    delivered: number;
    failed: number;
    cost: number;
  }>;
  campaignPerformance: Array<{
    id: string;
    name: string;
    sent: number;
    delivered: number;
    failed: number;
    cost: number;
    deliveryRate: number;
    costPerMessage: number;
  }>;
  gatewayPerformance: Array<{
    gateway: string;
    sent: number;
    delivered: number;
    failed: number;
    successRate: number;
    averageCost: number;
  }>;
}

const COLORS = ['#1976d2', '#2e7d32', '#ed6c02', '#d32f2f', '#9c27b0', '#0288d1'];

const Analytics: React.FC = () => {
  const [dateRange, setDateRange] = useState('30');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      // Mock data for now
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockData: AnalyticsData = {
        overview: {
          totalMessages: 15789,
          totalCampaigns: 24,
          totalContacts: 3421,
          totalCost: 157.89,
          deliveryRate: 94.2,
          averageCostPerMessage: 0.0095,
        },
        timeline: Array.from({ length: 30 }, (_, i) => ({
          date: format(new Date(Date.now() - (29 - i) * 86400000), 'yyyy-MM-dd'),
          sent: Math.floor(Math.random() * 500 + 300),
          delivered: Math.floor(Math.random() * 450 + 250),
          failed: Math.floor(Math.random() * 50 + 10),
          cost: Number((Math.random() * 5 + 2).toFixed(2)),
        })),
        campaignPerformance: Array.from({ length: 10 }, (_, i) => ({
          id: `campaign-${i}`,
          name: `Campaign ${i + 1}`,
          sent: Math.floor(Math.random() * 1000 + 500),
          delivered: Math.floor(Math.random() * 900 + 450),
          failed: Math.floor(Math.random() * 100 + 20),
          cost: Number((Math.random() * 10 + 5).toFixed(2)),
          deliveryRate: Math.random() * 15 + 80,
          costPerMessage: Number((Math.random() * 0.005 + 0.008).toFixed(4)),
        })),
        gatewayPerformance: [
          { gateway: 'Virtual', sent: 15000, delivered: 14250, failed: 750, successRate: 95, averageCost: 0.01 },
          { gateway: 'Twilio', sent: 5000, delivered: 4900, failed: 100, successRate: 98, averageCost: 0.0079 },
          { gateway: 'MessageBird', sent: 3000, delivered: 2940, failed: 60, successRate: 98, averageCost: 0.005 },
        ],
      };
      
      setData(mockData);
    } catch (error) {
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  // Format currency in TZS
  const formatCurrency = (value: number) => {
    return formatCostInTZS(value * PRICING.exchangeRate.USD_TO_TZS);
  };

  // Format currency without symbol for tables
  const formatCurrencyCompact = (value: number) => {
    return formatTZSCompact(value * PRICING.exchangeRate.USD_TO_TZS);
  };

  // Format average cost per message
  const formatAvgCost = (value: number) => {
    return formatAvgCostInTZS(value * PRICING.exchangeRate.USD_TO_TZS);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  // Calculate total cost in TZS
  const calculateTotalCostInTZS = (usdCost: number) => {
    return usdCost * PRICING.exchangeRate.USD_TO_TZS;
  };

  // Calculate messages that can be sent with equivalent cost
  const getMessageEquivalent = (costInTZS: number) => {
    return Math.floor(costInTZS / PRICING.tanzania.payg);
  };

  if (loading) {
    return (
      <Box sx={{ width: '100%', mt: 4 }}>
        <LinearProgress />
        <Typography align="center" sx={{ mt: 2 }} color="text.secondary">
          Loading analytics data...
        </Typography>
      </Box>
    );
  }

  if (error || !data) {
    return (
      <Box sx={{ mt: 4 }}>
        <Alert severity="error">{error || 'Failed to load analytics'}</Alert>
        <Button
          startIcon={<RefreshIcon />}
          onClick={fetchAnalytics}
          sx={{ mt: 2 }}
        >
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Analytics & Reports
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Track your messaging performance and campaign effectiveness
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Date Range</InputLabel>
            <Select
              value={dateRange}
              label="Date Range"
              onChange={(e) => setDateRange(e.target.value)}
            >
              <MenuItem value="7">Last 7 days</MenuItem>
              <MenuItem value="30">Last 30 days</MenuItem>
              <MenuItem value="90">Last 90 days</MenuItem>
              <MenuItem value="365">Last 12 months</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
          >
            Export Report
          </Button>
          <Button onClick={fetchAnalytics}>
            <RefreshIcon />
          </Button>
        </Box>
      </Box>

      {/* Overview Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Total Messages
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {formatNumber(data.overview.totalMessages)}
                  </Typography>
                  <Typography variant="caption" color="success.main" sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                    <TrendingUpIcon fontSize="small" /> +12.3% vs last period
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'primary.light', width: 48, height: 48 }}>
                  <SendIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Delivery Rate
                  </Typography>
                  <Typography variant="h4" fontWeight="bold" color="success.main">
                    {formatPercentage(data.overview.deliveryRate)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                    <CheckCircleIcon fontSize="small" sx={{ mr: 0.5 }} />
                    {formatNumber(data.overview.totalMessages - (data.overview.totalMessages * (1 - data.overview.deliveryRate / 100)))} delivered
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'success.light', width: 48, height: 48 }}>
                  <CheckCircleIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Total Cost
                  </Typography>
                  <Typography variant="h4" fontWeight="bold" color="warning.main">
                    {formatCurrency(data.overview.totalCost)}
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {formatAvgCost(data.overview.averageCostPerMessage)} avg per message
                    </Typography>
                    <Typography variant="caption" color="success.main" display="block">
                      ≈ {getMessageEquivalent(calculateTotalCostInTZS(data.overview.totalCost)).toLocaleString()} messages at PAYG
                    </Typography>
                  </Box>
                </Box>
                <Avatar sx={{ bgcolor: 'warning.light', width: 48, height: 48 }}>
                  <AttachMoneyIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Message Volume Chart */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom fontWeight="bold">
          Message Volume & Delivery
        </Typography>
        <Box sx={{ height: 400 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.timeline}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tickFormatter={(date) => format(new Date(date), 'MMM dd')} />
              <YAxis />
              <RechartsTooltip
                formatter={(value: number, name: string) => {
                  if (name === 'cost') {
                    return [formatCurrency(value), 'Cost'];
                  }
                  return [formatNumber(value), name];
                }}
                labelFormatter={(label) => format(new Date(label), 'MMM dd, yyyy')}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="sent"
                stackId="1"
                stroke="#1976d2"
                fill="#1976d2"
                fillOpacity={0.3}
                name="Sent"
              />
              <Area
                type="monotone"
                dataKey="delivered"
                stackId="2"
                stroke="#2e7d32"
                fill="#2e7d32"
                fillOpacity={0.3}
                name="Delivered"
              />
              <Area
                type="monotone"
                dataKey="failed"
                stackId="3"
                stroke="#d32f2f"
                fill="#d32f2f"
                fillOpacity={0.3}
                name="Failed"
              />
            </AreaChart>
          </ResponsiveContainer>
        </Box>
      </Paper>

      <Grid container spacing={4}>
        {/* Campaign Performance */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              Campaign Performance
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Campaign</TableCell>
                    <TableCell align="right">Sent</TableCell>
                    <TableCell align="right">Delivered</TableCell>
                    <TableCell align="right">Failed</TableCell>
                    <TableCell align="right">Delivery Rate</TableCell>
                    <TableCell align="right">Cost</TableCell>
                    <TableCell align="right">Cost/Message</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.campaignPerformance.map((campaign) => (
                    <TableRow key={campaign.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {campaign.name}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">{formatNumber(campaign.sent)}</TableCell>
                      <TableCell align="right">{formatNumber(campaign.delivered)}</TableCell>
                      <TableCell align="right">{formatNumber(campaign.failed)}</TableCell>
                      <TableCell align="right">
                        <Chip
                          label={formatPercentage(campaign.deliveryRate)}
                          size="small"
                          color={campaign.deliveryRate > 90 ? 'success' : campaign.deliveryRate > 70 ? 'warning' : 'error'}
                        />
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'medium', color: 'warning.main' }}>
                        {formatCurrency(campaign.cost)}
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="caption" color="text.secondary">
                          {formatAvgCost(campaign.costPerMessage)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Gateway Performance */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              Gateway Performance
            </Typography>
            <Box sx={{ mt: 2 }}>
              {data.gatewayPerformance.map((gateway, index) => (
                <Box key={gateway.gateway} sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="body2" fontWeight="medium">
                      {gateway.gateway}
                    </Typography>
                    <Chip
                      label={`${gateway.successRate}%`}
                      size="small"
                      color={gateway.successRate > 95 ? 'success' : gateway.successRate > 90 ? 'warning' : 'error'}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">
                      Sent
                    </Typography>
                    <Typography variant="body2">
                      {formatNumber(gateway.sent)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">
                      Delivered
                    </Typography>
                    <Typography variant="body2" color="success.main">
                      {formatNumber(gateway.delivered)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">
                      Failed
                    </Typography>
                    <Typography variant="body2" color="error">
                      {formatNumber(gateway.failed)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption" color="text.secondary">
                      Avg Cost
                    </Typography>
                    <Typography variant="body2" color="warning.main">
                      {formatAvgCost(gateway.averageCost)}
                    </Typography>
                  </Box>
                  {index < data.gatewayPerformance.length - 1 && <Divider sx={{ mt: 2 }} />}
                </Box>
              ))}
            </Box>

            {/* Cost Comparison */}
            <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Cost Comparison
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                PAYG Rate: {formatAvgCostInTZS(PRICING.tanzania.payg)}
              </Typography>
              <Typography variant="caption" color="success.main" display="block">
                Best Gateway: {formatAvgCost(Math.min(...data.gatewayPerformance.map(g => g.averageCost)))}
              </Typography>
            </Box>
          </Paper>
        </Grid>

        {/* Delivery Status Distribution */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              Delivery Status Distribution
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
                <Box sx={{ height: 300, mt: 2 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Delivered', value: data.overview.totalMessages * (data.overview.deliveryRate / 100) },
                          { name: 'Failed', value: data.overview.totalMessages * (1 - data.overview.deliveryRate / 100) },
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        fill="#8884d8"
                        paddingAngle={5}
                        dataKey="value"
                        label={(entry) => `${entry.name}: ${((entry.value / data.overview.totalMessages) * 100).toFixed(1)}%`}
                      >
                        <Cell fill={COLORS[0]} />
                        <Cell fill={COLORS[3]} />
                      </Pie>
                      <RechartsTooltip
                        formatter={(value: number) => formatNumber(value)}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box sx={{ p: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Cost Efficiency
                  </Typography>
                  <Divider sx={{ my: 1 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="caption">Total Spent:</Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {formatCurrency(data.overview.totalCost)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="caption">Cost per 1000 messages:</Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {formatAvgCost(data.overview.averageCostPerMessage * 1000)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption">vs PAYG:</Typography>
                    <Typography variant="body2" color="success.main">
                      {formatAvgCostInTZS(PRICING.tanzania.payg * 1000)}/1000
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>

      {/* Info Alert */}
      <Alert severity="info" sx={{ mt: 3 }}>
        <Typography variant="body2">
          <strong>Note:</strong> All costs are displayed in Tanzanian Shillings (TSh) at the rate of 
          1 USD = {formatNumber(PRICING.exchangeRate.USD_TO_TZS)} TSh. 
          PAYG rate: {formatAvgCostInTZS(PRICING.tanzania.payg)} per SMS.
        </Typography>
      </Alert>
    </Box>
  );
};

export default Analytics;