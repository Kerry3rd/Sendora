import React, { useState, useEffect } from 'react';
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
  IconButton,
  Button,
  LinearProgress,
  Alert,
  Pagination,
  Tab,
  Tabs,
  Tooltip,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Payment as PaymentIcon,
  Campaign as CampaignIcon,
  Delete as DeleteIcon,
  Markunread as MarkUnreadIcon,
  DoneAll as DoneAllIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import notificationService from '../../services/notification';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  link?: string;
  data: Record<string, any>;
  createdAt: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`notifications-tabpanel-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [tabValue, setTabValue] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();
  }, [page, tabValue]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await notificationService.getNotifications({
        page,
        limit: 20,
        unreadOnly: tabValue === 1, // Tab 1 = unread only
      });
      
      setNotifications(response.data.notifications || []);
      setTotal(response.data.pagination.total);
      setTotalPages(response.data.pagination.pages);
    } catch (err: any) {
      setError(err.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await notificationService.getUnreadCount();
      setUnreadCount(response.data?.unreadCount || 0);
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId);
      fetchNotifications();
      fetchUnreadCount();
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      fetchNotifications();
      fetchUnreadCount();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const handleDelete = async (notificationId: string) => {
    try {
      await notificationService.deleteNotification(notificationId);
      fetchNotifications();
      fetchUnreadCount();
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      handleMarkAsRead(notification.id);
    }
    if (notification.link) {
      navigate(notification.link);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'campaign_complete':
        return <CampaignIcon sx={{ color: '#00C2A8' }} />;
      case 'sms_delivered':
        return <CheckCircleIcon sx={{ color: '#4caf50' }} />;
      case 'sms_failed':
        return <ErrorIcon sx={{ color: '#f44336' }} />;
      case 'credits_low':
        return <WarningIcon sx={{ color: '#ff9800' }} />;
      case 'payment_success':
        return <PaymentIcon sx={{ color: '#4caf50' }} />;
      case 'payment_failed':
        return <ErrorIcon sx={{ color: '#f44336' }} />;
      default:
        return <InfoIcon sx={{ color: '#2196f3' }} />;
    }
  };

  const getTypeChip = (type: string) => {
    const colors: any = {
      campaign_complete: 'success',
      sms_delivered: 'success',
      sms_failed: 'error',
      credits_low: 'warning',
      payment_success: 'success',
      payment_failed: 'error',
    };
    return colors[type] || 'default';
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          Notifications
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchNotifications}
          >
            Refresh
          </Button>
          {unreadCount > 0 && (
            <Button
              variant="contained"
              startIcon={<DoneAllIcon />}
              onClick={handleMarkAllAsRead}
            >
              Mark All as Read
            </Button>
          )}
        </Box>
      </Box>

      <Paper sx={{ width: '100%', mb: 2 }}>
        <Tabs
          value={tabValue}
          onChange={(e, v) => {
            setTabValue(v);
            setPage(1);
          }}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label={`All (${total})`} />
          <Tab label={`Unread (${unreadCount})`} />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <NotificationList
            notifications={notifications}
            loading={loading}
            error={error}
            onMarkAsRead={handleMarkAsRead}
            onDelete={handleDelete}
            onClick={handleNotificationClick}
            getIcon={getIcon}
            getTypeChip={getTypeChip}
          />
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <NotificationList
            notifications={notifications}
            loading={loading}
            error={error}
            onMarkAsRead={handleMarkAsRead}
            onDelete={handleDelete}
            onClick={handleNotificationClick}
            getIcon={getIcon}
            getTypeChip={getTypeChip}
          />
        </TabPanel>

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
    </Box>
  );
};

interface NotificationListProps {
  notifications: Notification[];
  loading: boolean;
  error: string;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
  onClick: (notification: Notification) => void;
  getIcon: (type: string) => React.ReactNode;
  getTypeChip: (type: string) => any;
}

const NotificationList: React.FC<NotificationListProps> = ({
  notifications,
  loading,
  error,
  onMarkAsRead,
  onDelete,
  onClick,
  getIcon,
  getTypeChip,
}) => {
  if (loading) {
    return <LinearProgress />;
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  if (notifications.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <NotificationsIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
        <Typography color="text.secondary">No notifications to display</Typography>
      </Box>
    );
  }

  return (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Type</TableCell>
            <TableCell>Notification</TableCell>
            <TableCell>Date</TableCell>
            <TableCell>Status</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {notifications.map((notification) => (
            <TableRow
              key={notification.id}
              hover
              sx={{
                cursor: 'pointer',
                backgroundColor: notification.isRead ? 'inherit' : 'action.hover',
                '&:hover': { backgroundColor: 'action.selected' },
              }}
              onClick={() => onClick(notification)}
            >
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {getIcon(notification.type)}
                  <Chip
                    label={notification.type.replace(/_/g, ' ')}
                    size="small"
                    color={getTypeChip(notification.type)}
                    variant="outlined"
                  />
                </Box>
              </TableCell>
              <TableCell>
                <Typography variant="body2" fontWeight={notification.isRead ? 'normal' : 'bold'}>
                  {notification.title}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {notification.message}
                </Typography>
              </TableCell>
              <TableCell>
                <Tooltip title={format(new Date(notification.createdAt), 'PPpp')}>
                  <Typography variant="body2">
                    {format(new Date(notification.createdAt), 'MMM dd, yyyy')}
                  </Typography>
                </Tooltip>
              </TableCell>
              <TableCell>
                {notification.isRead ? (
                  <Chip label="Read" size="small" variant="outlined" />
                ) : (
                  <Chip
                    label="Unread"
                    size="small"
                    color="primary"
                    icon={<MarkUnreadIcon />}
                  />
                )}
              </TableCell>
              <TableCell align="right">
                {!notification.isRead && (
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onMarkAsRead(notification.id);
                    }}
                  >
                    <MarkUnreadIcon fontSize="small" />
                  </IconButton>
                )}
                <IconButton
                  size="small"
                  color="error"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(notification.id);
                  }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default NotificationsPage;
