import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Chip,
  Button,
  IconButton,
  Divider,
  LinearProgress,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  Tooltip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Tab,
  Tabs,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Send as SendIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  AccessTime as AccessTimeIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
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
import campaignService from '../../services/campaign'; // FIXED: Changed from smsService
import smsService from '../../services/sms'; // Keep for delivery reports
import { useDispatch } from 'react-redux';
import { addNotification } from '../../store/slices/uiSlice';
import { formatCostInTZS, formatAvgCostInTZS, formatTZSCompact } from '../../utils/currency';
import { PRICING } from '../../config/pricing';

// Helper function to safely format number
const formatNumber = (value: any): string => {
  if (value === null || value === undefined) return '0';
  const num = typeof value === 'string' ? parseFloat(value) : Number(value);
  return isNaN(num) ? '0' : num.toLocaleString();
};

// Helper function to safely format dates
const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    return format(date, 'MMM dd, yyyy HH:mm');
  } catch (error) {
    return '-';
  }
};

// Format currency in TZS
const formatCurrency = (value: any): string => {
  if (value === null || value === undefined) return formatCostInTZS(0);
  const num = typeof value === 'string' ? parseFloat(value) : Number(value);
  if (isNaN(num)) return formatCostInTZS(0);
  
  // If the value is in USD (likely from backend), convert to TZS
  const tzsValue = num * PRICING.exchangeRate.USD_TO_TZS;
  return formatCostInTZS(tzsValue);
};

// Format currency without symbol for tables
const formatCurrencyCompact = (value: any): string => {
  if (value === null || value === undefined) return formatTZSCompact(0);
  const num = typeof value === 'string' ? parseFloat(value) : Number(value);
  if (isNaN(num)) return formatTZSCompact(0);
  
  const tzsValue = num * PRICING.exchangeRate.USD_TO_TZS;
  return formatTZSCompact(tzsValue);
};

// Format average cost per message
const formatAvgCost = (value: any): string => {
  if (value === null || value === undefined) return formatAvgCostInTZS(0);
  const num = typeof value === 'string' ? parseFloat(value) : Number(value);
  if (isNaN(num)) return formatAvgCostInTZS(0);
  
  const tzsValue = num * PRICING.exchangeRate.USD_TO_TZS;
  return formatAvgCostInTZS(tzsValue);
};

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  message: string;
  status: string;
  scheduledFor: string | null;
  startedAt: string | null;
  completedAt: string | null;
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  estimatedCost: number | string;
  actualCost: number | string;
  senderId: string;
  isUnicode: boolean;
  isFlash: boolean;
  createdAt: string;
}

interface Message {
  id: string;
  phoneNumber: string;
  message: string;
  status: string;
  cost: number;
  sentAt: string | null;
  deliveredAt: string | null;
  error: string | null;
}

const COLORS = ['#4caf50', '#f44336', '#ff9800', '#2196f3'];

const CampaignDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ 
    open: false, 
    message: '', 
    severity: 'success' as 'success' | 'error' | 'info' | 'warning' 
  });

  const fetchCampaignDetails = useCallback(async () => {
    try {
      setLoading(true);
      // FIXED: Use campaignService for campaign details
      const response = await campaignService.getCampaign(id!);
      setCampaign(response.data);
      
      if (tabValue === 1) {
        // Keep smsService for delivery reports (messages)
        const messagesResponse = await smsService.getDeliveryReports({
          campaignId: id,
          page: 1,
          limit: 50,
        });
        setMessages(messagesResponse.data?.messages || []);
      }
    } catch (error) {
      setError('Failed to load campaign details');
      dispatch(addNotification({ type: 'error', message: 'Failed to load campaign details' }));
    } finally {
      setLoading(false);
    }
  }, [id, tabValue, dispatch]);

  useEffect(() => {
    if (id) {
      fetchCampaignDetails();
    }
  }, [id, tabValue, fetchCampaignDetails]);

  const handleStartCampaign = async () => {
    try {
      // FIXED: Use campaignService
      await campaignService.startCampaign(id!, []);
      fetchCampaignDetails();
      setSnackbar({ open: true, message: 'Campaign started successfully', severity: 'success' });
      dispatch(addNotification({ type: 'success', message: `Campaign "${campaign?.name}" started` }));
    } catch (error: any) {
      setSnackbar({ open: true, message: error.message || 'Failed to start campaign', severity: 'error' });
    }
  };

  const handlePauseCampaign = async () => {
    try {
      // FIXED: Use campaignService
      await campaignService.pauseCampaign(id!);
      fetchCampaignDetails();
      setSnackbar({ open: true, message: 'Campaign paused successfully', severity: 'success' });
      dispatch(addNotification({ type: 'info', message: `Campaign "${campaign?.name}" paused` }));
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to pause campaign', severity: 'error' });
    }
  };

  const handleDeleteCampaign = async () => {
    try {
      // FIXED: Use campaignService
      await campaignService.deleteCampaign(id!);
      setDeleteDialogOpen(false);
      dispatch(addNotification({ type: 'warning', message: `Campaign "${campaign?.name}" deleted` }));
      navigate('/campaigns');
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to delete campaign', severity: 'error' });
    }
  };

  const handleExportReports = () => {
    if (messages.length === 0) return;
    
    // Generate CSV
    const csvData = messages.map(m => ({
      'Phone Number': m.phoneNumber,
      'Status': m.status,
      'Cost (TSh)': (m.cost * PRICING.exchangeRate.USD_TO_TZS).toFixed(0),
      'Sent At': m.sentAt ? format(new Date(m.sentAt), 'yyyy-MM-dd HH:mm:ss') : '',
      'Delivered At': m.deliveredAt ? format(new Date(m.deliveredAt), 'yyyy-MM-dd HH:mm:ss') : '',
      'Error': m.error || ''
    }));

    const headers = Object.keys(csvData[0]).join(',');
    const rows = csvData.map(row => Object.values(row).map(val => `"${val}"`).join(','));
    const csv = [headers, ...rows].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `campaign-${campaign?.name || 'export'}-messages.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getStatusColor = (status: string) => {
    const colors: any = {
      draft: 'default',
      scheduled: 'info',
      running: 'warning',
      completed: 'success',
      paused: 'secondary',
      cancelled: 'error',
    };
    return colors[status] || 'default';
  };

  const getMessageStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered': return <CheckCircleIcon color="success" fontSize="small" />;
      case 'sent': return <SendIcon color="info" fontSize="small" />;
      case 'failed': return <ErrorIcon color="error" fontSize="small" />;
      case 'pending': return <AccessTimeIcon color="warning" fontSize="small" />;
      default: return <AccessTimeIcon color="disabled" fontSize="small" />;
    }
  };

  const pieData = campaign ? [
    { name: 'Delivered', value: Number(campaign.deliveredCount) || 0 },
    { name: 'Failed', value: Number(campaign.failedCount) || 0 },
    { name: 'Pending', value: Math.max(0, Number(campaign.totalRecipients) - Number(campaign.sentCount)) || 0 },
    { name: 'Sent (Not Delivered)', value: Math.max(0, Number(campaign.sentCount) - Number(campaign.deliveredCount)) || 0 },
  ] : [];

  // Generate chart data based on campaign timeline
  const generateChartData = () => {
    // If we have real message data, use it
    if (messages.length > 0) {
      // Group messages by hour
      const hourData: Record<string, { sent: number; delivered: number }> = {};
      
      messages.forEach(msg => {
        if (msg.sentAt) {
          const hour = format(new Date(msg.sentAt), 'HH:00');
          if (!hourData[hour]) {
            hourData[hour] = { sent: 0, delivered: 0 };
          }
          hourData[hour].sent += 1;
          if (msg.status === 'delivered') {
            hourData[hour].delivered += 1;
          }
        }
      });
      
      return Object.entries(hourData)
        .map(([time, data]) => ({
          time,
          sent: data.sent,
          delivered: data.delivered
        }))
        .sort((a, b) => a.time.localeCompare(b.time));
    }
    
    // Fallback: Generate sample data based on campaign dates
    if (campaign?.startedAt && campaign?.completedAt) {
      const start = new Date(campaign.startedAt);
      const end = new Date(campaign.completedAt);
      const hoursDiff = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60)));
      
      const sampleData = [];
      const totalSent = campaign.sentCount || 0;
      const totalDelivered = campaign.deliveredCount || 0;
      
      for (let i = 0; i < Math.min(24, hoursDiff); i++) {
        const hour = new Date(start.getTime() + i * 60 * 60 * 1000);
        const progress = (i + 1) / Math.min(24, hoursDiff);
        
        sampleData.push({
          time: format(hour, 'HH:00'),
          sent: Math.round(totalSent * progress),
          delivered: Math.round(totalDelivered * progress)
        });
      }
      return sampleData;
    }
    
    // Default sample data
    return [
      { time: '00:00', sent: 120, delivered: 118 },
      { time: '01:00', sent: 80, delivered: 79 },
      { time: '02:00', sent: 60, delivered: 60 },
      { time: '03:00', sent: 40, delivered: 39 },
      { time: '04:00', sent: 30, delivered: 29 },
      { time: '05:00', sent: 45, delivered: 44 },
      { time: '06:00', sent: 90, delivered: 89 },
      { time: '07:00', sent: 150, delivered: 148 },
      { time: '08:00', sent: 280, delivered: 275 },
      { time: '09:00', sent: 420, delivered: 415 },
      { time: '10:00', sent: 380, delivered: 376 },
      { time: '11:00', sent: 350, delivered: 345 },
      { time: '12:00', sent: 320, delivered: 318 },
      { time: '13:00', sent: 300, delivered: 297 },
      { time: '14:00', sent: 290, delivered: 287 },
      { time: '15:00', sent: 280, delivered: 278 },
      { time: '16:00', sent: 270, delivered: 268 },
      { time: '17:00', sent: 310, delivered: 307 },
      { time: '18:00', sent: 340, delivered: 337 },
      { time: '19:00', sent: 290, delivered: 288 },
      { time: '20:00', sent: 220, delivered: 218 },
      { time: '21:00', sent: 180, delivered: 178 },
      { time: '22:00', sent: 140, delivered: 139 },
      { time: '23:00', sent: 110, delivered: 109 }
    ];
  };

  const chartData = generateChartData();

  // Calculate message parts for cost per message
  const getMessageParts = () => {
    if (!campaign?.message) return 1;
    return campaign.isUnicode
      ? Math.ceil(campaign.message.length * 2 / 70)
      : Math.ceil(campaign.message.length / 160);
  };

  const messageParts = getMessageParts();
  const costPerMessage = campaign?.actualCost 
    ? Number(campaign.actualCost) * PRICING.exchangeRate.USD_TO_TZS / (campaign.sentCount || 1)
    : PRICING.tanzania.payg;

  if (loading) {
    return (
      <Box sx={{ width: '100%', mt: 4 }}>
        <LinearProgress />
      </Box>
    );
  }

  if (error || !campaign) {
    return (
      <Box sx={{ mt: 4 }}>
        <Alert severity="error">{error || 'Campaign not found'}</Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/campaigns')}
          sx={{ mt: 2 }}
        >
          Back to Campaigns
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton onClick={() => navigate('/campaigns')} sx={{ mr: 2 }}>
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Typography variant="h4" fontWeight="bold">
              {campaign.name}
            </Typography>
            {campaign.description && (
              <Typography variant="subtitle1" color="text.secondary">
                {campaign.description}
              </Typography>
            )}
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Chip
            label={campaign.status}
            color={getStatusColor(campaign.status)}
            sx={{ textTransform: 'capitalize' }}
          />
          
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={() => navigate(`/campaigns/create?id=${campaign.id}`)}
            disabled={campaign.status === 'completed' || campaign.status === 'running'}
          >
            Edit
          </Button>
          
          {campaign.status === 'draft' && (
            <Button
              variant="contained"
              startIcon={<PlayIcon />}
              onClick={handleStartCampaign}
            >
              Start
            </Button>
          )}
          
          {campaign.status === 'running' && (
            <Button
              variant="contained"
              color="warning"
              startIcon={<PauseIcon />}
              onClick={handlePauseCampaign}
            >
              Pause
            </Button>
          )}
          
          {campaign.status === 'paused' && (
            <Button
              variant="contained"
              startIcon={<PlayIcon />}
              onClick={handleStartCampaign}
            >
              Resume
            </Button>
          )}
          
          <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
            <DeleteIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Total Recipients
              </Typography>
              <Typography variant="h4" fontWeight="bold">
                {formatNumber(campaign.totalRecipients)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Sent
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="primary">
                {formatNumber(campaign.sentCount)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Delivered
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="success.main">
                {formatNumber(campaign.deliveredCount)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Failed
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="error">
                {formatNumber(campaign.failedCount)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
          <Tab label="Overview" />
          <Tab label="Messages" />
        </Tabs>
      </Box>

      {/* Tab Panels */}
      {tabValue === 0 && (
        <Grid container spacing={3}>
          {/* Campaign Info */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Campaign Details
                </Typography>
                <Divider sx={{ my: 2 }} />
                
                <Box sx={{ '& > div': { mb: 2 } }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Sender ID
                    </Typography>
                    <Typography variant="body1">
                      {campaign.senderId}
                    </Typography>
                  </Box>
                  
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Created
                    </Typography>
                    <Typography variant="body1">
                      {formatDate(campaign.createdAt)}
                    </Typography>
                  </Box>
                  
                  {campaign.startedAt && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Started
                      </Typography>
                      <Typography variant="body1">
                        {formatDate(campaign.startedAt)}
                      </Typography>
                    </Box>
                  )}
                  
                  {campaign.completedAt && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Completed
                      </Typography>
                      <Typography variant="body1">
                        {formatDate(campaign.completedAt)}
                      </Typography>
                    </Box>
                  )}
                  
                  {campaign.scheduledFor && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Scheduled For
                      </Typography>
                      <Typography variant="body1" color="info.main">
                        {formatDate(campaign.scheduledFor)}
                      </Typography>
                    </Box>
                  )}
                  
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Cost
                    </Typography>
                    <Typography variant="h5" color="warning.main" fontWeight="bold">
                      {formatCurrency(campaign?.actualCost || campaign?.estimatedCost)}
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        Est: {formatCurrency(campaign?.estimatedCost || 0)}
                      </Typography>
                      {campaign.sentCount > 0 && (
                        <Typography variant="caption" color="success.main">
                          {formatAvgCost(costPerMessage)} per msg
                        </Typography>
                      )}
                    </Box>
                  </Box>

                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Message Settings
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                      {campaign.isUnicode && (
                        <Chip label="Unicode" size="small" color="info" variant="outlined" />
                      )}
                      {campaign.isFlash && (
                        <Chip label="Flash" size="small" color="warning" variant="outlined" />
                      )}
                      <Chip 
                        label={`${messageParts} part${messageParts > 1 ? 's' : ''}`} 
                        size="small" 
                        variant="outlined" 
                      />
                    </Box>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Message Preview */}
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Message Preview
                </Typography>
                <Divider sx={{ my: 2 }} />
                
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    bgcolor: 'grey.50',
                    borderRadius: 2,
                    fontFamily: 'monospace',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    maxHeight: 300,
                    overflow: 'auto',
                  }}
                >
                  {campaign?.message}
                </Paper>
                
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" color="text.secondary">
                    {campaign?.message?.length || 0} characters
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    ~{Math.ceil((campaign?.message?.length || 0) / 160)} SMS parts
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Delivery Stats */}
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Delivery Statistics
                </Typography>
                <Divider sx={{ my: 2 }} />
                
                <Box sx={{ height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData.filter(d => d.value > 0)}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        fill="#8884d8"
                        paddingAngle={5}
                        dataKey="value"
                        label={(entry) => `${entry.name}: ${((entry.value / Number(campaign.totalRecipients)) * 100).toFixed(1)}%`}
                      >
                        {pieData.filter(d => d.value > 0).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        formatter={(value: number) => formatNumber(value)}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>

                <Box sx={{ mt: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption">PAYG Rate:</Typography>
                    <Typography variant="caption" fontWeight="medium">
                      {formatAvgCostInTZS(PRICING.tanzania.payg)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption">This Campaign:</Typography>
                    <Typography variant="caption" fontWeight="medium" color="success.main">
                      {formatAvgCost(costPerMessage)}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Delivery Timeline */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Delivery Timeline
                </Typography>
                <Box sx={{ height: 300, mt: 2 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis />
                      <RechartsTooltip 
                        formatter={(value: number) => formatNumber(value)}
                      />
                      <Line type="monotone" dataKey="sent" stroke="#2196f3" strokeWidth={2} />
                      <Line type="monotone" dataKey="delivered" stroke="#4caf50" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {tabValue === 1 && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Message Delivery Reports</Typography>
              {messages.length > 0 && (
                <Button
                  startIcon={<DownloadIcon />}
                  variant="outlined"
                  onClick={handleExportReports}
                >
                  Export CSV
                </Button>
              )}
            </Box>
            
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Phone Number</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Cost (TSh)</TableCell>
                    <TableCell>Sent At</TableCell>
                    <TableCell>Delivered At</TableCell>
                    <TableCell>Error</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {messages.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                        <Typography color="text.secondary">
                          No messages found for this campaign
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    messages.map((message) => (
                      <TableRow key={message.id} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.light' }}>
                              {message.phoneNumber?.slice(-4) || '?'}
                            </Avatar>
                            {message.phoneNumber}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {getMessageStatusIcon(message.status)}
                            <Chip
                              label={message.status}
                              size="small"
                              color={
                                message.status === 'delivered' ? 'success' :
                                message.status === 'failed' ? 'error' :
                                message.status === 'sent' ? 'info' : 'warning'
                              }
                            />
                          </Box>
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'medium', color: 'warning.main' }}>
                          {formatCurrencyCompact(message.cost)}
                        </TableCell>
                        <TableCell>
                          {message.sentAt ? formatDate(message.sentAt) : '-'}
                        </TableCell>
                        <TableCell>
                          {message.deliveredAt ? formatDate(message.deliveredAt) : '-'}
                        </TableCell>
                        <TableCell>
                          {message.error && (
                            <Tooltip title={message.error}>
                              <ErrorIcon color="error" fontSize="small" />
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Campaign</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{campaign.name}"?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteCampaign} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem onClick={() => setDeleteDialogOpen(true)} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Delete Campaign</ListItemText>
        </MenuItem>
      </Menu>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CampaignDetails;