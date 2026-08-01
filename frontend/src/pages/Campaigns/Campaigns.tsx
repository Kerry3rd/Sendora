import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Alert,
  Snackbar,
  Pagination,
  Stack,
  Tooltip,
  Divider,
  ListItemIcon,
  ListItemText,
  Card,
  CardContent,
  useMediaQuery,
  useTheme,
  Fab,
  Zoom,
} from '@mui/material';
import {
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  Schedule as ScheduleIcon,
  ContentCopy as CopyIcon,
  BarChart as BarChartIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  AccessTime as AccessTimeIcon,
  Send as SendIcon,
  FilterList as FilterIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { format, formatDistance } from 'date-fns';
import campaignService from '../../services/campaign';
import { useDispatch } from 'react-redux';
import { addNotification } from '../../store/slices/uiSlice';
import { formatCostInTZS, formatAvgCostInTZS } from '../../utils/currency';
import { PRICING } from '../../config/pricing';
import { MobileTable } from '../../components/MobileTable';
import { useMobile } from '../../hooks/useMobile';

interface Campaign {
  id: string;
  name: string;
  description: string;
  message: string;
  status: 'draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'cancelled';
  scheduledFor: string | null;
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  estimatedCost: number | string;
  actualCost: number | string;
  senderId: string;
  isUnicode?: boolean;
  isFlash?: boolean;
  createdAt: string;
  stats?: {
    total: number;
    sent: number;
    delivered: number;
    failed: number;
    pending: number;
    cost: number;
  };
}

// Helper function to safely format number
const formatNumber = (value: number | string | undefined): string => {
  if (value === undefined || value === null) return '0';
  const numValue = typeof value === 'string' ? parseFloat(value) : Number(value);
  if (isNaN(numValue)) return '0';
  return numValue.toLocaleString();
};

// Helper function to calculate progress percentage
const calculateProgress = (campaign: Campaign): number => {
  if (campaign.status === 'completed') return 100;
  if (!campaign.totalRecipients) return 0;
  const sent = Number(campaign.sentCount) || 0;
  const total = Number(campaign.totalRecipients) || 1;
  return Math.round((sent / total) * 100);
};

// Helper function to format date
const formatDate = (dateString: string | null): string => {
  if (!dateString) return '-';
  try {
    return format(new Date(dateString), 'MMM dd, yyyy HH:mm');
  } catch {
    return 'Invalid date';
  }
};

// Helper function to get time ago
const getTimeAgo = (dateString: string): string => {
  try {
    return formatDistance(new Date(dateString), new Date(), { addSuffix: true });
  } catch {
    return '';
  }
};

const Campaigns: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ 
    open: false, 
    message: '', 
    severity: 'success' as 'success' | 'error' 
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    completed: 0,
    scheduled: 0,
    totalSent: 0,
    totalDelivered: 0,
    totalCost: 0,
  });

  const navigate = useNavigate();
  const dispatch = useDispatch();
  const theme = useTheme();
  const { isMobile, isTablet } = useMobile();

  const fetchCampaigns = useCallback(async () => {
    try {
      setLoading(true);
      const response = await campaignService.getCampaigns(page, isMobile ? 5 : 10, statusFilter);
      
      const campaignsData = response.data?.campaigns || [];
      const paginationData = response.data?.pagination || { total: 0, pages: 1 };
      
      setCampaigns(campaignsData);
      setTotalPages(paginationData.pages || 1);
      
      // Calculate stats
      let totalCost = 0;
      campaignsData.forEach((c: Campaign) => {
        const cost = Number(c.actualCost || c.estimatedCost || 0) * PRICING.exchangeRate.USD_TO_TZS;
        totalCost += cost;
      });

      const statsCalc = {
        total: paginationData.total || 0,
        active: campaignsData.filter((c: Campaign) => c.status === 'running').length,
        completed: campaignsData.filter((c: Campaign) => c.status === 'completed').length,
        scheduled: campaignsData.filter((c: Campaign) => c.status === 'scheduled').length,
        totalSent: campaignsData.reduce((acc: number, c: Campaign) => acc + (Number(c.sentCount) || 0), 0),
        totalDelivered: campaignsData.reduce((acc: number, c: Campaign) => acc + (Number(c.deliveredCount) || 0), 0),
        totalCost,
      };
      setStats(statsCalc);
    } catch (error) {
      console.error('Failed to fetch campaigns:', error);
      setSnackbar({ open: true, message: 'Failed to fetch campaigns', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, isMobile]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, campaign: Campaign) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedCampaign(campaign);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedCampaign(null);
  };

  const handleViewCampaign = () => {
    if (selectedCampaign) {
      navigate(`/campaigns/${selectedCampaign.id}`);
    }
    handleMenuClose();
  };

  const handleEditCampaign = () => {
    if (selectedCampaign) {
      navigate(`/campaigns/create?id=${selectedCampaign.id}`);
    }
    handleMenuClose();
  };

  const handleDuplicateCampaign = async () => {
    if (!selectedCampaign) return;
    try {
      const newCampaign = {
        name: `${selectedCampaign.name} (Copy)`,
        message: selectedCampaign.message,
        senderId: selectedCampaign.senderId,
        isUnicode: selectedCampaign.isUnicode || false,
        isFlash: selectedCampaign.isFlash || false,
        description: selectedCampaign.description,
      };
      await campaignService.createCampaign(newCampaign);
      fetchCampaigns();
      setSnackbar({ open: true, message: 'Campaign duplicated successfully', severity: 'success' });
      dispatch(addNotification({ type: 'success', message: 'Campaign duplicated successfully' }));
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to duplicate campaign', severity: 'error' });
    }
    handleMenuClose();
  };

  const handleStartCampaign = async () => {
    if (!selectedCampaign) return;
    try {
      await campaignService.startCampaign(selectedCampaign.id, []);
      fetchCampaigns();
      setSnackbar({ open: true, message: 'Campaign started successfully', severity: 'success' });
      dispatch(addNotification({ type: 'success', message: `Campaign "${selectedCampaign.name}" started` }));
    } catch (error: any) {
      setSnackbar({ open: true, message: error.message || 'Failed to start campaign', severity: 'error' });
    }
    handleMenuClose();
  };

  const handlePauseCampaign = async () => {
    if (!selectedCampaign) return;
    try {
      await campaignService.pauseCampaign(selectedCampaign.id);
      fetchCampaigns();
      setSnackbar({ open: true, message: 'Campaign paused successfully', severity: 'success' });
      dispatch(addNotification({ type: 'info', message: `Campaign "${selectedCampaign.name}" paused` }));
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to pause campaign', severity: 'error' });
    }
    handleMenuClose();
  };

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const handleDeleteCampaign = async () => {
    if (!selectedCampaign) return;
    try {
      await campaignService.deleteCampaign(selectedCampaign.id);
      fetchCampaigns();
      setDeleteDialogOpen(false);
      setSnackbar({ open: true, message: 'Campaign deleted successfully', severity: 'success' });
      dispatch(addNotification({ type: 'warning', message: `Campaign "${selectedCampaign.name}" deleted` }));
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to delete campaign', severity: 'error' });
    }
  };

  const handleScheduleCampaign = () => {
    setScheduleDialogOpen(true);
    handleMenuClose();
  };

  const handleScheduleSubmit = async () => {
    if (!selectedCampaign || !scheduleDate || !scheduleTime) return;
    try {
      const scheduledFor = new Date(`${scheduleDate}T${scheduleTime}`);
      await campaignService.updateCampaign(selectedCampaign.id, {
        scheduledFor: scheduledFor.toISOString(),
        status: 'scheduled',
      });
      fetchCampaigns();
      setScheduleDialogOpen(false);
      setScheduleDate('');
      setScheduleTime('');
      setSnackbar({ open: true, message: 'Campaign scheduled successfully', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to schedule campaign', severity: 'error' });
    }
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircleIcon fontSize="small" />;
      case 'running': return <SendIcon fontSize="small" />;
      case 'failed': return <ErrorIcon fontSize="small" />;
      case 'scheduled': return <ScheduleIcon fontSize="small" />;
      case 'paused': return <PauseIcon fontSize="small" />;
      default: return <AccessTimeIcon fontSize="small" />;
    }
  };

  // Table columns definition
  const columns = [
    { 
      id: 'name', 
      label: 'Campaign Name', 
      minWidth: 200,
      mobile: true,
      format: (value: string) => value, // Simple format for value
      render: (row: Campaign) => ( // Custom render function for complex content
        <Box>
          <Typography variant="body1" fontWeight="medium">
            {row.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {row.description || 'No description'}
          </Typography>
        </Box>
      )
    },
    { 
      id: 'status', 
      label: 'Status', 
      minWidth: 120,
      mobile: true,
      format: (value: string) => value,
      render: (row: Campaign) => (
        <Box>
          <Chip
            icon={getStatusIcon(row.status)}
            label={row.status}
            color={getStatusColor(row.status)}
            size="small"
            variant="filled"
          />
          {row.scheduledFor && (
            <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
              {formatDate(row.scheduledFor)}
            </Typography>
          )}
        </Box>
      )
    },
    { 
      id: 'recipients', 
      label: 'Recipients', 
      minWidth: 120,
      mobile: false,
      format: (value: string) => value,
      render: (row: Campaign) => (
        <Box>
          <Typography variant="body2">
            {formatNumber(row.totalRecipients)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Sent: {formatNumber(row.sentCount)}
          </Typography>
        </Box>
      )
    },
    { 
      id: 'progress', 
      label: 'Progress', 
      minWidth: 150,
      mobile: false,
      format: (value: string) => value,
      render: (row: Campaign) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 120 }}>
          <Box sx={{ width: '100%' }}>
            <LinearProgress
              variant="determinate"
              value={calculateProgress(row)}
              sx={{
                height: 8,
                borderRadius: 4,
                bgcolor: 'grey.200',
                '& .MuiLinearProgress-bar': {
                  bgcolor: row.status === 'completed' ? 'success.main' : 'primary.main',
                },
              }}
            />
          </Box>
          <Typography variant="body2" sx={{ minWidth: 40 }}>
            {calculateProgress(row)}%
          </Typography>
        </Box>
      )
    },
    { 
      id: 'deliveryRate', 
      label: 'Delivery Rate', 
      minWidth: 120,
      mobile: false,
      format: (value: string) => value,
      render: (row: Campaign) => (
        <Box>
          <Typography variant="body2">
            {row.totalRecipients && row.totalRecipients > 0
              ? `${Math.round((Number(row.deliveredCount) / Number(row.totalRecipients)) * 100)}%`
              : '0%'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {formatNumber(row.deliveredCount)} delivered
          </Typography>
        </Box>
      )
    },
    { 
      id: 'cost', 
      label: 'Cost', 
      minWidth: 120,
      mobile: true,
      align: 'right' as const,
      format: (value: string) => value,
      render: (row: Campaign) => {
        const costInTZS = (Number(row.actualCost || row.estimatedCost || 0)) * PRICING.exchangeRate.USD_TO_TZS;
        return (
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="body2" color="warning.main" fontWeight="medium">
              {formatCostInTZS(costInTZS)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {row.sentCount ? 
                formatAvgCostInTZS(costInTZS / row.sentCount) : 
                'N/A'} per msg
            </Typography>
          </Box>
        );
      }
    },
    { 
      id: 'created', 
      label: 'Created', 
      minWidth: 120,
      mobile: false,
      format: (value: string) => value,
      render: (row: Campaign) => (
        <Tooltip title={formatDate(row.createdAt)}>
          <Typography variant="body2">
            {getTimeAgo(row.createdAt)}
          </Typography>
        </Tooltip>
      )
    },
    { 
      id: 'actions', 
      label: 'Actions', 
      minWidth: 100,
      mobile: true,
      align: 'right' as const,
      format: (value: string) => value,
      render: (row: Campaign) => (
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            handleMenuOpen(e, row);
          }}
          sx={{ 
            touchAction: 'manipulation',
            padding: isMobile ? 1.5 : 1,
          }}
        >
          <MoreVertIcon />
        </IconButton>
      )
    },
  ];

  // Mobile card renderer
  const renderMobileCard = (campaign: Campaign) => {
    const costInTZS = (Number(campaign.actualCost || campaign.estimatedCost || 0)) * PRICING.exchangeRate.USD_TO_TZS;
    
    return (
      <CardContent sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 0.5 }}>
              {campaign.name}
            </Typography>
            <Chip
              icon={getStatusIcon(campaign.status)}
              label={campaign.status}
              color={getStatusColor(campaign.status)}
              size="small"
              variant="filled"
              sx={{ height: 24 }}
            />
          </Box>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              handleMenuOpen(e, campaign);
            }}
            sx={{ touchAction: 'manipulation' }}
          >
            <MoreVertIcon />
          </IconButton>
        </Box>

        <Box sx={{ mt: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="caption" color="text.secondary">Progress:</Typography>
            <Typography variant="caption" fontWeight="medium">{calculateProgress(campaign)}%</Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={calculateProgress(campaign)}
            sx={{
              height: 6,
              borderRadius: 3,
              mb: 2,
              bgcolor: 'grey.200',
              '& .MuiLinearProgress-bar': {
                bgcolor: campaign.status === 'completed' ? 'success.main' : 'primary.main',
              },
            }}
          />

          <Grid container spacing={1}>
            <Grid item xs={4}>
              <Typography variant="caption" color="text.secondary" display="block">
                Recipients
              </Typography>
              <Typography variant="body2" fontWeight="medium">
                {formatNumber(campaign.totalRecipients)}
              </Typography>
            </Grid>
            <Grid item xs={4}>
              <Typography variant="caption" color="text.secondary" display="block">
                Sent
              </Typography>
              <Typography variant="body2" fontWeight="medium">
                {formatNumber(campaign.sentCount)}
              </Typography>
            </Grid>
            <Grid item xs={4}>
              <Typography variant="caption" color="text.secondary" display="block">
                Delivered
              </Typography>
              <Typography variant="body2" fontWeight="medium" color="success.main">
                {formatNumber(campaign.deliveredCount)}
              </Typography>
            </Grid>
          </Grid>

          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="caption" color="text.secondary" display="block">
                Cost
              </Typography>
              <Typography variant="body2" fontWeight="bold" color="warning.main">
                {formatCostInTZS(costInTZS)}
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="caption" color="text.secondary" display="block">
                Created
              </Typography>
              <Typography variant="caption">
                {getTimeAgo(campaign.createdAt)}
              </Typography>
            </Box>
          </Box>

          {campaign.scheduledFor && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="caption" color="info.main" display="block">
                📅 Scheduled: {formatDate(campaign.scheduledFor)}
              </Typography>
            </Box>
          )}
        </Box>
      </CardContent>
    );
  };

  return (
    <Box sx={{ pb: isMobile ? 7 : 0 }}>
      {/* Header */}
      <Box sx={{ 
        display: 'flex', 
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between', 
        alignItems: isMobile ? 'stretch' : 'center', 
        mb: 3,
        gap: isMobile ? 2 : 0,
      }}>
        <Typography variant={isMobile ? 'h5' : 'h4'} fontWeight="bold">
          Campaigns
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/campaigns/create')}
          size={isMobile ? 'medium' : 'large'}
          fullWidth={isMobile}
          sx={{ 
            borderRadius: 2,
            py: isMobile ? 1.5 : 1,
          }}
        >
          New Campaign
        </Button>
      </Box>

      {/* Statistics Cards - Scrollable on mobile */}
      <Box sx={{
        overflowX: isMobile ? 'auto' : 'visible',
        pb: isMobile ? 1 : 0,
        mb: 3,
        '&::-webkit-scrollbar': {
          height: 4,
        },
        '&::-webkit-scrollbar-track': {
          bgcolor: 'grey.100',
          borderRadius: 2,
        },
        '&::-webkit-scrollbar-thumb': {
          bgcolor: 'grey.400',
          borderRadius: 2,
        },
      }}>
        <Box sx={{
          display: 'flex',
          gap: 2,
          minWidth: isMobile ? '600px' : 'auto',
        }}>
          <Paper sx={{ 
            p: 2, 
            bgcolor: 'primary.light', 
            color: 'white',
            flex: isMobile ? '0 0 110px' : 1,
          }}>
            <Typography variant="subtitle2" noWrap>Total</Typography>
            <Typography variant="h5" fontWeight="bold">{stats.total}</Typography>
          </Paper>
          <Paper sx={{ 
            p: 2, 
            bgcolor: 'warning.main', 
            color: 'white',
            flex: isMobile ? '0 0 110px' : 1,
          }}>
            <Typography variant="subtitle2" noWrap>Active</Typography>
            <Typography variant="h5" fontWeight="bold">{stats.active}</Typography>
          </Paper>
          <Paper sx={{ 
            p: 2, 
            bgcolor: 'success.main', 
            color: 'white',
            flex: isMobile ? '0 0 110px' : 1,
          }}>
            <Typography variant="subtitle2" noWrap>Completed</Typography>
            <Typography variant="h5" fontWeight="bold">{stats.completed}</Typography>
          </Paper>
          <Paper sx={{ 
            p: 2, 
            bgcolor: 'info.main', 
            color: 'white',
            flex: isMobile ? '0 0 110px' : 1,
          }}>
            <Typography variant="subtitle2" noWrap>Scheduled</Typography>
            <Typography variant="h5" fontWeight="bold">{stats.scheduled}</Typography>
          </Paper>
          <Paper sx={{ 
            p: 2, 
            bgcolor: 'secondary.main', 
            color: 'white',
            flex: isMobile ? '0 0 130px' : 1,
          }}>
            <Typography variant="subtitle2" noWrap>Messages Sent</Typography>
            <Typography variant="h5" fontWeight="bold">{formatNumber(stats.totalSent)}</Typography>
          </Paper>
        </Box>
      </Box>

      {/* Total Cost Card */}
      {stats.totalCost > 0 && (
        <Paper sx={{ p: 2, mb: 3, bgcolor: 'grey.50' }}>
          <Typography variant="body2" color="text.secondary">
            Total Cost (Estimated)
          </Typography>
          <Typography variant="h5" color="warning.main" fontWeight="bold">
            {formatCostInTZS(stats.totalCost)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Avg: {stats.totalSent > 0 
              ? formatAvgCostInTZS(stats.totalCost / stats.totalSent)
              : formatAvgCostInTZS(PRICING.tanzania.payg)} per message
          </Typography>
        </Paper>
      )}

      {/* Filters - Collapsible on mobile */}
      <Paper sx={{ p: 2, mb: 3 }}>
        {isMobile && (
          <Button
            fullWidth
            startIcon={<FilterIcon />}
            endIcon={showFilters ? <CloseIcon /> : null}
            onClick={() => setShowFilters(!showFilters)}
            sx={{ mb: showFilters ? 2 : 0 }}
          >
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </Button>
        )}
        
        {(showFilters || !isMobile) && (
          <Stack 
            direction={isMobile ? 'column' : 'row'} 
            spacing={2} 
            alignItems={isMobile ? 'stretch' : 'center'} 
            flexWrap="wrap"
          >
            <Typography variant="body2" color="text.secondary">Filter by status:</Typography>
            <Box sx={{ 
              display: 'flex', 
              gap: 1, 
              flexWrap: 'wrap',
              justifyContent: isMobile ? 'center' : 'flex-start',
            }}>
              {['', 'draft', 'scheduled', 'running', 'completed', 'paused'].map((status) => (
                <Chip
                  key={status || 'all'}
                  label={status || 'All'}
                  onClick={() => setStatusFilter(status)}
                  color={statusFilter === status ? 'primary' : 'default'}
                  variant={statusFilter === status ? 'filled' : 'outlined'}
                  size={isMobile ? 'small' : 'medium'}
                  sx={{ 
                    minWidth: isMobile ? 60 : 'auto',
                    touchAction: 'manipulation',
                  }}
                />
              ))}
            </Box>
          </Stack>
        )}
      </Paper>

      {loading ? (
        <LinearProgress />
      ) : (
        <>
          <MobileTable
            columns={columns}
            data={campaigns}
            renderMobileCard={renderMobileCard}
            onRowClick={(campaign) => navigate(`/campaigns/${campaign.id}`)}
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              mt: 4,
              mb: isMobile ? 2 : 0,
            }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(e, value) => setPage(value)}
                color="primary"
                size={isMobile ? 'medium' : 'large'}
                siblingCount={isMobile ? 0 : 1}
              />
            </Box>
          )}

          {campaigns.length === 0 && !loading && (
            <Paper sx={{ p: 8, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary" gutterBottom>
                No campaigns found
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => navigate('/campaigns/create')}
                sx={{ mt: 2 }}
              >
                Create Your First Campaign
              </Button>
            </Paper>
          )}
        </>
      )}

      {/* Action Menu - Mobile optimized */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{ 
          sx: { 
            minWidth: isMobile ? '90%' : 200,
            maxWidth: isMobile ? '90%' : 'none',
            left: isMobile ? '5% !important' : 'auto',
          } 
        }}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
      >
        <MenuItem onClick={handleViewCampaign} sx={{ py: isMobile ? 1.5 : 1 }}>
          <ListItemIcon><ViewIcon fontSize="small" /></ListItemIcon>
          <ListItemText>View Details</ListItemText>
        </MenuItem>
        <MenuItem 
          onClick={handleEditCampaign} 
          disabled={selectedCampaign?.status === 'completed'}
          sx={{ py: isMobile ? 1.5 : 1 }}
        >
          <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDuplicateCampaign} sx={{ py: isMobile ? 1.5 : 1 }}>
          <ListItemIcon><CopyIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Duplicate</ListItemText>
        </MenuItem>
        <MenuItem 
          onClick={handleStartCampaign}
          disabled={!['draft', 'paused', 'scheduled'].includes(selectedCampaign?.status || '')}
          sx={{ py: isMobile ? 1.5 : 1 }}
        >
          <ListItemIcon><PlayIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Start Campaign</ListItemText>
        </MenuItem>
        <MenuItem 
          onClick={handlePauseCampaign}
          disabled={selectedCampaign?.status !== 'running'}
          sx={{ py: isMobile ? 1.5 : 1 }}
        >
          <ListItemIcon><PauseIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Pause Campaign</ListItemText>
        </MenuItem>
        <MenuItem 
          onClick={handleScheduleCampaign}
          disabled={!['draft', 'paused'].includes(selectedCampaign?.status || '')}
          sx={{ py: isMobile ? 1.5 : 1 }}
        >
          <ListItemIcon><ScheduleIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Schedule</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleDeleteClick} sx={{ color: 'error.main', py: isMobile ? 1.5 : 1 }}>
          <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>

      {/* Schedule Dialog - Mobile optimized */}
      <Dialog 
        open={scheduleDialogOpen} 
        onClose={() => setScheduleDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle sx={{ pb: 1 }}>
          Schedule Campaign
          {isMobile && (
            <IconButton
              onClick={() => setScheduleDialogOpen(false)}
              sx={{ position: 'absolute', right: 8, top: 8 }}
            >
              <CloseIcon />
            </IconButton>
          )}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {selectedCampaign?.name}
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Date"
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                inputProps={{ 
                  min: new Date().toISOString().split('T')[0],
                  style: { fontSize: isMobile ? '16px' : 'inherit' }
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Time"
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                InputLabelProps={{ shrink: true }}
                inputProps={{ style: { fontSize: isMobile ? '16px' : 'inherit' } }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: isMobile ? 3 : 2 }}>
          <Button onClick={() => setScheduleDialogOpen(false)} size={isMobile ? 'large' : 'medium'}>
            Cancel
          </Button>
          <Button
            onClick={handleScheduleSubmit}
            variant="contained"
            disabled={!scheduleDate || !scheduleTime}
            size={isMobile ? 'large' : 'medium'}
            sx={{ minWidth: isMobile ? 100 : 'auto' }}
          >
            Schedule
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog - Mobile optimized */}
      <Dialog 
        open={deleteDialogOpen} 
        onClose={() => setDeleteDialogOpen(false)}
        fullScreen={isMobile}
      >
        <DialogTitle>Delete Campaign</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{selectedCampaign?.name}"?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: isMobile ? 3 : 2 }}>
          <Button onClick={() => setDeleteDialogOpen(false)} size={isMobile ? 'large' : 'medium'}>
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteCampaign} 
            color="error" 
            variant="contained"
            size={isMobile ? 'large' : 'medium'}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ 
          vertical: isMobile ? 'top' : 'bottom', 
          horizontal: isMobile ? 'center' : 'right' 
        }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Campaigns;