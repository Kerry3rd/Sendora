import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Button,
  IconButton,
  Divider,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Card,
  CardContent,
  Tooltip,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ContentCopy as CopyIcon,
  Public as PublicIcon,
  Lock as LockIcon,
  Send as SendIcon,
  AccessTime as AccessTimeIcon,
  Category as CategoryIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { addNotification } from '../../store/slices/uiSlice';
import templateService, { Template } from '../../services/template';
import { format } from 'date-fns';
import { useMobile } from '../../hooks/useMobile';

// Category colors
const categoryColors: Record<string, string> = {
  general: 'default',
  marketing: 'primary',
  transactional: 'info',
  notification: 'warning',
  birthday: 'secondary',
  custom: 'success',
};

const TemplateDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isMobile } = useMobile();

  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (id) {
      fetchTemplate();
    }
  }, [id]);

  const fetchTemplate = async () => {
    try {
      setLoading(true);
      const response = await templateService.getTemplate(id!);
      setTemplate(response.data);
    } catch (error) {
      console.error('Failed to fetch template:', error);
      setError('Failed to load template');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await templateService.deleteTemplate(id!);
      dispatch(addNotification({
        type: 'success',
        message: 'Template deleted successfully',
      }));
      navigate('/templates');
    } catch (error) {
      dispatch(addNotification({
        type: 'error',
        message: 'Failed to delete template',
      }));
    }
  };

  const handleUseTemplate = () => {
    navigate('/campaigns/create', {
      state: { template },
    });
  };

  const handleDuplicate = async () => {
    try {
      await templateService.duplicateTemplate(id!);
      dispatch(addNotification({
        type: 'success',
        message: 'Template duplicated successfully',
      }));
      navigate('/templates');
    } catch (error) {
      dispatch(addNotification({
        type: 'error',
        message: 'Failed to duplicate template',
      }));
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMMM dd, yyyy HH:mm');
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !template) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error || 'Template not found'}</Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/templates')}
          sx={{ mt: 2 }}
        >
          Back to Templates
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton onClick={() => navigate('/templates')} sx={{ mr: 2 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant={isMobile ? 'h5' : 'h4'} fontWeight="bold">
            Template Details
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={() => navigate(`/templates/edit/${template.id}`)}
          >
            Edit
          </Button>
          <Button
            variant="outlined"
            startIcon={<CopyIcon />}
            onClick={handleDuplicate}
          >
            Duplicate
          </Button>
          <Button
            variant="contained"
            startIcon={<SendIcon />}
            onClick={handleUseTemplate}
            color="primary"
          >
            Use Template
          </Button>
          <IconButton color="error" onClick={() => setDeleteDialogOpen(true)}>
            <DeleteIcon />
          </IconButton>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Main Content */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom fontWeight="bold">
              {template.name}
            </Typography>

            {template.description && (
              <Typography variant="body1" color="text.secondary" paragraph>
                {template.description}
              </Typography>
            )}

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle1" gutterBottom fontWeight="medium">
              Message Content
            </Typography>
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                bgcolor: 'grey.50',
                borderRadius: 2,
                fontFamily: 'monospace',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {template.message}
            </Paper>
          </Paper>
        </Grid>

        {/* Sidebar */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="subtitle1" gutterBottom fontWeight="bold">
              Details
            </Typography>

            <Box sx={{ mt: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Category
                </Typography>
                <Chip
                  label={template.category}
                  size="small"
                  color={categoryColors[template.category] as any}
                />
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Visibility
                </Typography>
                <Chip
                  icon={template.isPublic ? <PublicIcon /> : <LockIcon />}
                  label={template.isPublic ? 'Public' : 'Private'}
                  size="small"
                  variant="outlined"
                />
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Usage Count
                </Typography>
                <Typography variant="body2" fontWeight="medium">
                  {template.usageCount} times
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Created
                </Typography>
                <Typography variant="body2">
                  {formatDate(template.createdAt)}
                </Typography>
              </Box>

              {template.lastUsedAt && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Last Used
                  </Typography>
                  <Typography variant="body2">
                    {formatDate(template.lastUsedAt)}
                  </Typography>
                </Box>
              )}
            </Box>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" gutterBottom>
              Variables
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 2 }}>
              {template.variables.map((variable) => (
                <Chip
                  key={variable}
                  label={`{{${variable}}}`}
                  size="small"
                  variant="outlined"
                />
              ))}
            </Box>

            <Typography variant="subtitle2" gutterBottom>
              Tags
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {template.tags.map((tag) => (
                <Chip key={tag} label={tag} size="small" />
              ))}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Template</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{template.name}"?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TemplateDetails;