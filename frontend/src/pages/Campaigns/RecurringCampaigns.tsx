import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  Pagination,
  Tooltip,
  Avatar,
  Stack,
  Card,
  CardContent,
  Grid,
  ListItemIcon, 
  ListItemText,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  Repeat as RepeatIcon,
  Schedule as ScheduleIcon,
  CalendarToday as CalendarIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  AccessTime as AccessTimeIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { format, formatDistance } from 'date-fns';
import campaignService, { Campaign, RecurrenceRule } from '../../services/campaign';

interface RecurringCampaign extends Campaign {
  isRecurring: true; // Make this required true for recurring campaigns
  recurrenceRule: RecurrenceRule;
  nextRunAt: string | null;
  lastRunAt: string | null;
  occurrencesCount: number;
  maxOccurrences: number | null;
}

const RecurringCampaigns: React.FC = () => {
  const [campaigns, setCampaigns] = useState<RecurringCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCampaigns, setTotalCampaigns] = useState(0);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<RecurringCampaign | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ 
    open: false, 
    message: '', 
    severity: 'success' as 'success' | 'error' 
  });

  const navigate = useNavigate();

  useEffect(() => {
    fetchRecurringCampaigns();
  }, [page]);

  const fetchRecurringCampaigns = async () => {
    try {
      setLoading(true);
      const response = await campaignService.getRecurringCampaigns(page, 10);
      setCampaigns(response.data.campaigns as RecurringCampaign[]);
      setTotalPages(response.data.pagination.pages);
      setTotalCampaigns(response.data.pagination.total);
    } catch (error) {
      console.error('Failed to fetch recurring campaigns:', error);
      setSnackbar({
        open: true,
        message: 'Failed to load recurring campaigns',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, campaign: RecurringCampaign) => {
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

  const handlePauseRecurring = async () => {
    if (!selectedCampaign) return;
    try {
      // Use standard pauseCampaign instead of pauseRecurring
      await campaignService.pauseCampaign(selectedCampaign.id);
      setSnackbar({
        open: true,
        message: 'Recurring campaign paused',
        severity: 'success',
      });
      fetchRecurringCampaigns();
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Failed to pause campaign',
        severity: 'error',
      });
    }
    handleMenuClose();
  };

  const handleResumeRecurring = async () => {
    if (!selectedCampaign) return;
    try {
      // Use standard resumeCampaign instead of resumeRecurring
      await campaignService.resumeCampaign(selectedCampaign.id);
      setSnackbar({
        open: true,
        message: 'Recurring campaign resumed',
        severity: 'success',
      });
      fetchRecurringCampaigns();
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Failed to resume campaign',
        severity: 'error',
      });
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
      setDeleteDialogOpen(false);
      setSnackbar({
        open: true,
        message: 'Campaign deleted successfully',
        severity: 'success',
      });
      fetchRecurringCampaigns();
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Failed to delete campaign',
        severity: 'error',
      });
    }
  };

  const getRecurringDescription = (campaign: RecurringCampaign): string => {
    if (!campaign.isRecurring || !campaign.recurrenceRule) return 'One-time';
    
    const rule = campaign.recurrenceRule;
    const interval = rule.interval || 1;
    
    switch (rule.type) {
      case 'daily':
        return interval === 1 ? 'Daily' : `Every ${interval} days`;
      case 'weekly':
        if (interval === 1) return 'Weekly';
        if (rule.weekDays && rule.weekDays.length > 0) {
          const days = rule.weekDays.map(day => 
            day.charAt(0).toUpperCase() + day.slice(1, 3)
          ).join(', ');
          return `Every ${interval} weeks on ${days}`;
        }
        return `Every ${interval} weeks`;
      case 'monthly':
        if (interval === 1) {
          if (rule.monthDay) {
            return `Monthly on day ${rule.monthDay}`;
          }
          return 'Monthly';
        }
        return `Every ${interval} months`;
      case 'yearly':
        return interval === 1 ? 'Yearly' : `Every ${interval} years`;
      default:
        return 'Custom recurring';
    }
  };

  const getNextExecution = (campaign: RecurringCampaign): string => {
    if (campaign.status === 'paused') return 'Paused';
    if (!campaign.nextRunAt) return 'Not scheduled';
    
    const rule = campaign.recurrenceRule;
    
    if (rule?.endDate && new Date(rule.endDate) < new Date()) {
      return 'Ended';
    }
    
    if (rule?.endType === 'after' && rule.endAfter && campaign.occurrencesCount >= rule.endAfter) {
      return 'Completed';
    }
    
    try {
      return formatDistance(new Date(campaign.nextRunAt), new Date(), { addSuffix: true });
    } catch {
      return campaign.nextRunAt;
    }
  };

  const getStatusChip = (campaign: RecurringCampaign) => {
    if (!campaign.isRecurring) return null;
    
    const rule = campaign.recurrenceRule;
    
    if (campaign.status === 'paused') {
      return <Chip label="Paused" color="warning" size="small" icon={<PauseIcon />} />;
    }
    
    if (rule?.endDate && new Date(rule.endDate) < new Date()) {
      return <Chip label="Expired" color="default" size="small" icon={<ErrorIcon />} />;
    }
    
    if (rule?.endType === 'after' && rule.endAfter && campaign.occurrencesCount >= rule.endAfter) {
      return <Chip label="Completed" color="success" size="small" icon={<CheckCircleIcon />} />;
    }
    
    if (campaign.status === 'running') {
      return <Chip label="Active" color="success" size="small" icon={<RepeatIcon />} />;
    }
    
    return <Chip label={campaign.status} size="small" />;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch {
      return dateString;
    }
  };

  const getTotalExecutions = (campaign: RecurringCampaign) => {
    const rule = campaign.recurrenceRule;
    if (rule?.endType === 'after' && rule.endAfter) {
      return `${campaign.occurrencesCount || 0}/${rule.endAfter}`;
    }
    return campaign.occurrencesCount || '0';
  };

  const getEndCondition = (campaign: RecurringCampaign): string => {
    const rule = campaign.recurrenceRule;
    if (!rule) return 'Never';
    
    if (rule.endType === 'never') return 'Never';
    if (rule.endType === 'after') return `After ${rule.endAfter} times`;
    if (rule.endType === 'on' && rule.endDate) return `Until ${formatDate(rule.endDate)}`;
    
    return 'Never';
  };

  if (loading) {
    return <LinearProgress />;
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            Recurring Campaigns
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Schedule campaigns to run automatically on a recurring basis
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/campaigns/create')}
          size="large"
        >
          New Recurring Campaign
        </Button>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Total Recurring
              </Typography>
              <Typography variant="h4" fontWeight="bold">
                {totalCampaigns}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'success.light', color: 'white' }}>
            <CardContent>
              <Typography color="inherit" gutterBottom variant="body2" sx={{ opacity: 0.8 }}>
                Active
              </Typography>
              <Typography variant="h4" fontWeight="bold">
                {campaigns.filter(c => c.status === 'running' && !c.recurrenceRule?.endDate).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'warning.light', color: 'white' }}>
            <CardContent>
              <Typography color="inherit" gutterBottom variant="body2" sx={{ opacity: 0.8 }}>
                Paused
              </Typography>
              <Typography variant="h4" fontWeight="bold">
                {campaigns.filter(c => c.status === 'paused').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'info.light', color: 'white' }}>
            <CardContent>
              <Typography color="inherit" gutterBottom variant="body2" sx={{ opacity: 0.8 }}>
                Executions
              </Typography>
              <Typography variant="h4" fontWeight="bold">
                {campaigns.reduce((sum, c) => sum + (c.occurrencesCount || 0), 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {campaigns.length === 0 ? (
        <Paper sx={{ p: 8, textAlign: 'center' }}>
          <RepeatIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No recurring campaigns yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            Create your first recurring campaign to automate your SMS marketing
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/campaigns/create')}
          >
            Create Recurring Campaign
          </Button>
        </Paper>
      ) : (
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Campaign</TableCell>
                  <TableCell>Schedule</TableCell>
                  <TableCell>Pattern</TableCell>
                  <TableCell>Ends</TableCell>
                  <TableCell>Executions</TableCell>
                  <TableCell>Next Run</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {campaigns.map((campaign) => (
                  <TableRow
                    key={campaign.id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/campaigns/${campaign.id}`)}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: 'primary.light' }}>
                          <RepeatIcon />
                        </Avatar>
                        <Box>
                          <Typography variant="body1" fontWeight="medium">
                            {campaign.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Created {formatDate(campaign.createdAt)}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2">
                          {getRecurringDescription(campaign)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {campaign.recurrenceRule?.type} • {campaign.recurrenceRule?.interval}x
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={<ScheduleIcon />}
                        label={campaign.recurrenceRule?.type || 'unknown'}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {getEndCondition(campaign)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {getTotalExecutions(campaign)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Tooltip title={campaign.nextRunAt ? formatDate(campaign.nextRunAt) : ''}>
                        <Typography variant="body2">
                          {getNextExecution(campaign)}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      {getStatusChip(campaign)}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMenuOpen(e, campaign);
                        }}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
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
      )}

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleViewCampaign}>
          <ListItemIcon><ViewIcon fontSize="small" /></ListItemIcon>
          <ListItemText>View Details</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleEditCampaign}>
          <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Edit Schedule</ListItemText>
        </MenuItem>
        {selectedCampaign?.status === 'running' ? (
          <MenuItem onClick={handlePauseRecurring}>
            <ListItemIcon><PauseIcon fontSize="small" color="warning" /></ListItemIcon>
            <ListItemText>Pause</ListItemText>
          </MenuItem>
        ) : selectedCampaign?.status === 'paused' ? (
          <MenuItem onClick={handleResumeRecurring}>
            <ListItemIcon><PlayIcon fontSize="small" color="success" /></ListItemIcon>
            <ListItemText>Resume</ListItemText>
          </MenuItem>
        ) : null}
        <MenuItem onClick={handleViewCampaign}>
          <ListItemIcon><RefreshIcon fontSize="small" /></ListItemIcon>
          <ListItemText>View History</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleDeleteClick} sx={{ color: 'error.main' }}>
          <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Recurring Campaign</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{selectedCampaign?.name}"?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This will cancel all future scheduled runs and cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteCampaign} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

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

export default RecurringCampaigns;