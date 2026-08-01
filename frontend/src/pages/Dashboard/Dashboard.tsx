import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Chip,
  Divider,
  Alert,
  Skeleton,
} from '@mui/material';
import {
  Send as SendIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  AccessTime as AccessTimeIcon,
  Add as AddIcon,
  Email as EmailIcon,
  Money as MoneyIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import smsService from '../../services/sms';
import campaignService from '../../services/campaign';
import { RootState } from '../../store/store';
import { formatCostInTZS, formatAvgCostInTZS } from '../../utils/currency';
import { PRICING } from '../../config/pricing';

const COLORS = ['#1976d2', '#2e7d32', '#ed6c02', '#d32f2f'];

interface DashboardStats {
  totalCampaigns: number;
  totalMessages: number;
  totalDelivered: number;
  totalFailed: number;
  credits: number;
  deliveryRate: number;
  totalSpent?: number;
  estimatedValue?: number;
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentCampaigns, setRecentCampaigns] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('📊 Fetching dashboard data...');
      
      // Fetch campaigns using campaign service
      const campaignsResponse = await campaignService.getCampaigns(1, 5);
      console.log('✅ Campaigns fetched:', campaignsResponse);
      
      const campaigns = campaignsResponse.data?.campaigns || [];
      setRecentCampaigns(campaigns);
      
      // Fetch balance using sms service
      const balanceResponse = await smsService.getBalance();
      console.log('✅ Balance fetched:', balanceResponse);
      
      // Calculate stats
      let totalSent = 0;
      let totalDelivered = 0;
      let totalFailed = 0;
      let totalSpent = 0;
      
      campaigns.forEach((campaign: any) => {
        totalSent += Number(campaign.sentCount || 0);
        totalDelivered += Number(campaign.deliveredCount || 0);
        totalFailed += Number(campaign.failedCount || 0);
        
        // Calculate estimated cost based on message parts
        if (campaign.sentCount) {
          const messageParts = campaign.isUnicode 
            ? Math.ceil(campaign.message?.length * 2 / 70) 
            : Math.ceil(campaign.message?.length / 160);
          // Use actual cost if available, otherwise estimate
          const costPerMessage = campaign.actualCost 
            ? Number(campaign.actualCost) / campaign.sentCount
            : PRICING.tanzania.payg;
          totalSpent += (campaign.sentCount * messageParts * costPerMessage);
        }
      });

      const totalCampaigns = campaignsResponse.data?.pagination?.total || 0;
      const credits = Number(balanceResponse.data?.user?.credits || 0);
      const deliveryRate = totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0;

      // Calculate estimated value of credits
      const estimatedValue = credits * PRICING.tanzania.payg;

      setStats({
        totalCampaigns,
        totalMessages: totalSent,
        totalDelivered,
        totalFailed,
        credits,
        deliveryRate,
        totalSpent,
        estimatedValue,
      });
      
      console.log('📈 Dashboard stats:', { 
        totalCampaigns, 
        totalMessages: totalSent, 
        totalDelivered, 
        totalFailed, 
        credits, 
        deliveryRate,
        totalSpent,
        estimatedValue 
      });
      
    } catch (error: any) {
      console.error('❌ Failed to fetch dashboard data:', error);
      setError(error?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Sample chart data for now (you can replace with real data later)
  const chartData = [
    { name: 'Mon', sent: 400, delivered: 380 },
    { name: 'Tue', sent: 300, delivered: 290 },
    { name: 'Wed', sent: 200, delivered: 195 },
    { name: 'Thu', sent: 278, delivered: 270 },
    { name: 'Fri', sent: 189, delivered: 180 },
    { name: 'Sat', sent: 239, delivered: 235 },
    { name: 'Sun', sent: 349, delivered: 340 },
  ];

  const pieData = stats ? [
    { name: 'Delivered', value: Number(stats.totalDelivered) || 0 },
    { name: 'Failed', value: Number(stats.totalFailed) || 0 },
    { name: 'Pending', value: Math.max(0, Number(stats.totalMessages) - Number(stats.totalDelivered) - Number(stats.totalFailed)) || 0 },
  ] : [];

  const statCards = [
    {
      title: 'Campaigns',
      value: stats?.totalCampaigns ?? 0,
      icon: <SendIcon fontSize="large" />,
      color: '#1976d2',
      path: '/campaigns',
      format: (val: number) => val.toString(),
    },
    {
      title: 'Messages Sent',
      value: stats?.totalMessages ?? 0,
      icon: <EmailIcon fontSize="large" />,
      color: '#2e7d32',
      path: '/campaigns',
      format: (val: number) => val.toLocaleString(),
    },
    {
      title: 'Delivery Rate',
      value: stats?.deliveryRate ?? 0,
      icon: <CheckCircleIcon fontSize="large" />,
      color: '#ed6c02',
      path: '/analytics',
      format: (val: number) => `${val.toFixed(1)}%`,
    },
    {
      title: 'Credits',
      value: stats?.credits ?? 0,
      icon: <MoneyIcon fontSize="large" />,
      color: '#9c27b0',
      path: '/buy-credits',
      format: (val: number) => val.toLocaleString(),
    },
  ];

  // Calculate messages you can send with current credits
  const getMessageEstimate = (credits: number) => {
    const paygRate = PRICING.tanzania.payg;
    return Math.floor(credits / paygRate);
  };

  if (error) {
    return (
      <Box sx={{ mt: 4 }}>
        <Alert 
          severity="error" 
          action={
            <Button color="inherit" size="small" onClick={fetchDashboardData}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ width: '100%' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Skeleton variant="text" width={200} height={40} />
          <Skeleton variant="text" width={150} height={30} />
        </Box>
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {[1, 2, 3, 4].map((i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Card>
                <CardContent>
                  <Skeleton variant="text" width="60%" />
                  <Skeleton variant="text" width="40%" height={40} />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
        <Skeleton variant="rectangular" height={400} sx={{ mb: 4 }} />
        <Skeleton variant="rectangular" height={300} />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" fontWeight="bold">
          Dashboard
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Welcome back, {user?.firstName || 'User'}!
        </Typography>
      </Box>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {statCards.map((card) => (
          <Grid item xs={12} sm={6} md={3} key={card.title}>
            <Card
              sx={{
                height: '100%',
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4,
                },
              }}
              onClick={() => navigate(card.path)}
            >
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography color="text.secondary" gutterBottom variant="body2">
                      {card.title}
                    </Typography>
                    <Typography variant="h4" component="div" fontWeight="bold">
                      {card.format(card.value)}
                    </Typography>
                    
                    {/* Additional info for Credits card */}
                    {card.title === 'Credits' && stats && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="caption" color="text.secondary" display="block">
                          ≈ {getMessageEstimate(stats.credits).toLocaleString()} messages
                        </Typography>
                        <Typography variant="caption" color="primary.main" fontWeight="medium">
                          Value: {formatCostInTZS(stats.estimatedValue || 0)}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                  <Box sx={{ color: card.color, opacity: 0.8 }}>
                    {card.icon}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Quick Stats Row */}
      {stats && stats.totalSpent && stats.totalSpent > 0 && (
        <Paper sx={{ p: 2, mb: 3, bgcolor: 'grey.50' }}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={4}>
              <Typography variant="caption" color="text.secondary">
                Total Spent (Estimated)
              </Typography>
              <Typography variant="h6" color="primary.main">
                {formatCostInTZS(stats.totalSpent)}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography variant="caption" color="text.secondary">
                Average Cost Per Message
              </Typography>
              <Typography variant="h6" color="primary.main">
                {stats.totalMessages > 0 
                  ? formatAvgCostInTZS(stats.totalSpent / stats.totalMessages)
                  : formatAvgCostInTZS(PRICING.tanzania.payg)
                }
              </Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography variant="caption" color="text.secondary">
                Current Credit Value
              </Typography>
              <Typography variant="h6" color="success.main">
                {formatCostInTZS(stats.estimatedValue || 0)}
              </Typography>
            </Grid>
          </Grid>
        </Paper>
      )}

      <Grid container spacing={3}>
        {/* Chart */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              Message Delivery Trend
            </Typography>
            <ResponsiveContainer width="100%" height="90%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <RechartsTooltip 
                  formatter={(value: number) => [value.toLocaleString(), 'Messages']}
                />
                <Line type="monotone" dataKey="sent" stroke="#1976d2" strokeWidth={2} />
                <Line type="monotone" dataKey="delivered" stroke="#2e7d32" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Pie Chart */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              Delivery Status
            </Typography>
            {stats && stats.totalMessages > 0 ? (
              <ResponsiveContainer width="100%" height="90%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                    label={(entry) => `${entry.name}: ${((entry.value / stats.totalMessages) * 100).toFixed(1)}%`}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    formatter={(value: number) => [value.toLocaleString(), 'Messages']}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '90%' }}>
                <Typography color="text.secondary">No data available</Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Recent Campaigns */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" fontWeight="bold">
                Recent Campaigns
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => navigate('/campaigns/create')}
              >
                New Campaign
              </Button>
            </Box>
            
            {recentCampaigns.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography color="text.secondary" gutterBottom>
                  No campaigns yet. Create your first campaign!
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => navigate('/campaigns/create')}
                  sx={{ mt: 2 }}
                >
                  Create Campaign
                </Button>
              </Box>
            ) : (
              <List>
                {recentCampaigns.map((campaign, index) => {
                  // Calculate estimated cost for this campaign
                  const messageParts = campaign.isUnicode 
                    ? Math.ceil(campaign.message?.length * 2 / 70) 
                    : Math.ceil(campaign.message?.length / 160);
                  // Use actual cost if available, otherwise estimate
                  const costPerMessage = campaign.actualCost && campaign.sentCount
                    ? Number(campaign.actualCost) / campaign.sentCount
                    : PRICING.tanzania.payg;
                  const estimatedCost = (campaign.sentCount || 0) * messageParts * costPerMessage;
                  
                  return (
                    <React.Fragment key={campaign.id}>
                      <ListItem disablePadding>
                        <ListItemButton
                          onClick={() => navigate(`/campaigns/${campaign.id}`)}
                          sx={{ px: 2, py: 1.5 }}
                        >
                          <ListItemIcon>
                            {campaign.status === 'completed' ? (
                              <CheckCircleIcon color="success" />
                            ) : campaign.status === 'failed' ? (
                              <ErrorIcon color="error" />
                            ) : campaign.status === 'running' ? (
                              <SendIcon color="primary" />
                            ) : (
                              <AccessTimeIcon color="warning" />
                            )}
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                <Typography variant="body1" fontWeight="medium">
                                  {campaign.name}
                                </Typography>
                                <Chip
                                  label={campaign.status}
                                  size="small"
                                  color={
                                    campaign.status === 'completed'
                                      ? 'success'
                                      : campaign.status === 'running'
                                      ? 'primary'
                                      : campaign.status === 'failed'
                                      ? 'error'
                                      : 'default'
                                  }
                                  variant="outlined"
                                />
                                {campaign.sentCount > 0 && (
                                  <Chip
                                    label={`Cost: ${formatCostInTZS(estimatedCost)}`}
                                    size="small"
                                    variant="outlined"
                                    color="primary"
                                    sx={{ fontSize: '0.7rem' }}
                                  />
                                )}
                              </Box>
                            }
                            secondary={
                              <Typography variant="body2" color="text.secondary">
                                {campaign.totalRecipients || 0} recipients • 
                                Sent: {campaign.sentCount?.toLocaleString() || 0} • 
                                Delivered: {campaign.deliveredCount?.toLocaleString() || 0} • 
                                Failed: {campaign.failedCount?.toLocaleString() || 0} •
                                {campaign.createdAt ? new Date(campaign.createdAt).toLocaleDateString() : 'N/A'}
                              </Typography>
                            }
                          />
                        </ListItemButton>
                      </ListItem>
                      {index < recentCampaigns.length - 1 && <Divider />}
                    </React.Fragment>
                  );
                })}
              </List>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Info Alert */}
      <Alert severity="info" sx={{ mt: 3 }}>
        <Typography variant="body2">
          <strong>PAYG Rate:</strong> {formatAvgCostInTZS(PRICING.tanzania.payg)} per SMS. 
          Volume discounts apply for bulk purchases. 
          <Button 
            size="small" 
            sx={{ ml: 1 }}
            onClick={() => navigate('/buy-credits')}
          >
            Buy Credits
          </Button>
        </Typography>
      </Alert>
    </Box>
  );
};

export default Dashboard;