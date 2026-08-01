import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  LinearProgress,
  Chip,
  Alert,
  Button,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import campaignService from '../services/campaign';
import { wsService } from '../services/websocket'; // Import WebSocket service

interface CampaignProgressProps {
  campaignId: string;
  onComplete?: () => void;
}

const CampaignProgress: React.FC<CampaignProgressProps> = ({ campaignId, onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('queued');
  const [stats, setStats] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Initial fetch and WebSocket setup
  useEffect(() => {
    let isMounted = true;
    
    // Initial fetch
    const fetchProgress = async () => {
      try {
        const response = await campaignService.getCampaign(campaignId);
        const campaign = response.data;
        
        if (!campaign) return;
        
        if (isMounted) {
          updateProgressFromCampaign(campaign);
        }
      } catch (error) {
        console.error('Failed to fetch campaign progress:', error);
        if (isMounted) {
          setError('Failed to load campaign progress');
        }
      }
    };

    fetchProgress();

    // Join campaign room for real-time updates
    wsService.joinCampaign(campaignId);

    // Listen for real-time progress updates
    const handleProgressUpdate = (data: any) => {
      console.log('📊 Real-time progress update:', data);
      if (isMounted) {
        setProgress(data.percentage);
        setStats({
          sent: data.sent,
          delivered: data.delivered,
          failed: data.failed,
          total: data.total
        });
        setStatus(data.status);
      }
    };

    // Listen for status changes
    const handleStatusChange = (data: any) => {
      console.log('📢 Campaign status changed:', data);
      if (isMounted) {
        setStatus(data.status);
        
        if (data.status === 'completed' || data.status === 'cancelled') {
          if (onComplete) onComplete();
        }
      }
    };

    // Listen for campaign completion
    const handleCampaignComplete = (data: any) => {
      console.log('✅ Campaign completed:', data);
      if (isMounted) {
        setStatus('completed');
        setProgress(100);
        if (stats) {
          setStats({
            ...stats,
            ...data.stats
          });
        }
        if (onComplete) onComplete();
      }
    };

    // Register WebSocket event listeners
    wsService.on('campaign:progress', handleProgressUpdate);
    wsService.on('campaign:status', handleStatusChange);
    wsService.on('campaign:completed', handleCampaignComplete);

    // Cleanup
    return () => {
      isMounted = false;
      wsService.leaveCampaign(campaignId);
      wsService.off('campaign:progress', handleProgressUpdate);
      wsService.off('campaign:status', handleStatusChange);
      wsService.off('campaign:completed', handleCampaignComplete);
    };
  }, [campaignId, onComplete]);

  // Helper to update state from campaign data
  const updateProgressFromCampaign = (campaign: any) => {
    const sent = campaign.sentCount || 0;
    const total = campaign.totalRecipients || 1;
    const percent = Math.min(Math.round((sent / total) * 100), 100);
    
    setProgress(percent);
    setStatus(campaign.status);
    setStats({
      sent: campaign.sentCount || 0,
      delivered: campaign.deliveredCount || 0,
      failed: campaign.failedCount || 0,
      total: campaign.totalRecipients || 0
    });
    
    if (campaign.status === 'completed' || campaign.status === 'cancelled') {
      if (onComplete) onComplete();
    }
  };

  if (error) {
    return (
      <Paper sx={{ p: 3, mb: 3 }}>
        <Alert severity="error">{error}</Alert>
        <Button 
          variant="outlined" 
          size="small" 
          onClick={() => window.location.reload()}
          sx={{ mt: 2 }}
        >
          Retry
        </Button>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Campaign Progress
      </Typography>
      
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Chip 
          label={status} 
          color={
            status === 'completed' ? 'success' :
            status === 'cancelled' ? 'error' :
            status === 'running' ? 'primary' :
            status === 'paused' ? 'warning' : 'default'
          }
        />
        <Typography variant="body2" color="text.secondary">
          {progress}% Complete
        </Typography>
      </Box>
      
      <LinearProgress 
        variant="determinate" 
        value={progress} 
        sx={{ height: 10, borderRadius: 5, mb: 2 }}
      />
      
      {stats && (
        <Box sx={{ display: 'flex', gap: 3, mt: 2, flexWrap: 'wrap' }}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Total Recipients
            </Typography>
            <Typography variant="body1" fontWeight="bold">
              {stats.total.toLocaleString()}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Sent
            </Typography>
            <Typography variant="body1" fontWeight="bold" color="info.main">
              {stats.sent.toLocaleString()}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Delivered
            </Typography>
            <Typography variant="body1" fontWeight="bold" color="success.main">
              {stats.delivered.toLocaleString()}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Failed
            </Typography>
            <Typography variant="body1" fontWeight="bold" color="error">
              {stats.failed.toLocaleString()}
            </Typography>
          </Box>
        </Box>
      )}
      
      <Button 
        variant="outlined" 
        size="small" 
        onClick={() => navigate(`/campaigns/${campaignId}`)}
        sx={{ mt: 2 }}
      >
        View Details
      </Button>
    </Paper>
  );
};

export default CampaignProgress;