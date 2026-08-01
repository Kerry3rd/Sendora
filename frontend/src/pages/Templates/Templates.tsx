import React, { useState, useEffect, useCallback } from 'react';
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
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  OutlinedInput,
  Checkbox,
  Card,
  CardContent,
  Tab,
  Tabs,
  Fab,
  Zoom,
} from '@mui/material';
import {
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  ContentCopy as CopyIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Close as CloseIcon,
  Public as PublicIcon,
  Lock as LockIcon,
  Category as CategoryIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { addNotification } from '../../store/slices/uiSlice';
import templateService, { Template } from '../../services/template';
import { useMobile } from '../../hooks/useMobile';
import { formatDistance } from 'date-fns';

// Category colors
const categoryColors: Record<string, string> = {
  general: 'default',
  marketing: 'primary',
  transactional: 'info',
  notification: 'warning',
  birthday: 'secondary',
  custom: 'success',
};

const Templates: React.FC = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTemplates, setTotalTemplates] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ 
    open: false, 
    message: '', 
    severity: 'success' as 'success' | 'error' 
  });
  const [stats, setStats] = useState<any>(null);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [tabValue, setTabValue] = useState(0);

  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isMobile } = useMobile();

  const categories = [
    'all',
    'general',
    'marketing',
    'transactional',
    'notification',
    'birthday',
    'custom',
  ];

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const response = await templateService.getTemplates({
        page,
        limit: 10,
        category: selectedCategory === 'all' ? undefined : selectedCategory,
        search: searchTerm || undefined,
        tags: selectedTags,
      });

      setTemplates(response.data.templates);
      setTotalPages(response.data.pagination.pages);
      setTotalTemplates(response.data.pagination.total);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      setSnackbar({
        open: true,
        message: 'Failed to fetch templates',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [page, selectedCategory, searchTerm, selectedTags]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await templateService.getTemplateStats();
      setStats(response.data);
      
      // Extract all unique tags
      const tags = new Set<string>();
      response.data.mostUsed?.forEach((t: Template) => {
        t.tags.forEach(tag => tags.add(tag));
      });
      setAllTags(Array.from(tags));
    } catch (error) {
      console.error('Failed to fetch template stats:', error);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
    fetchStats();
  }, [fetchTemplates, fetchStats]);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, template: Template) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedTemplate(template);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedTemplate(null);
  };

  const handleViewTemplate = () => {
    if (selectedTemplate) {
      navigate(`/templates/${selectedTemplate.id}`);
    }
    handleMenuClose();
  };

  const handleEditTemplate = () => {
    if (selectedTemplate) {
      navigate(`/templates/edit/${selectedTemplate.id}`);
    }
    handleMenuClose();
  };

  const handleDuplicateTemplate = async () => {
    if (!selectedTemplate) return;
    try {
      await templateService.duplicateTemplate(selectedTemplate.id);
      fetchTemplates();
      setSnackbar({
        open: true,
        message: 'Template duplicated successfully',
        severity: 'success',
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Failed to duplicate template',
        severity: 'error',
      });
    }
    handleMenuClose();
  };

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const handleDeleteTemplate = async () => {
    if (!selectedTemplate) return;
    try {
      await templateService.deleteTemplate(selectedTemplate.id);
      fetchTemplates();
      fetchStats();
      setDeleteDialogOpen(false);
      setSnackbar({
        open: true,
        message: 'Template deleted successfully',
        severity: 'success',
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Failed to delete template',
        severity: 'error',
      });
    }
  };

  const handleUseTemplate = async (template: Template) => {
    try {
      await templateService.useTemplate(template.id);
      // Navigate to campaign creation with template pre-filled
      navigate('/campaigns/create', {
        state: { template },
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Failed to use template',
        severity: 'error',
      });
    }
  };

  const getTimeAgo = (dateString: string) => {
    try {
      return formatDistance(new Date(dateString), new Date(), { addSuffix: true });
    } catch {
      return '';
    }
  };

  if (loading && templates.length === 0) {
    return <LinearProgress />;
  }

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
        <Box>
          <Typography variant={isMobile ? 'h5' : 'h4'} fontWeight="bold">
            Message Templates
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Save and reuse your frequently used messages
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/templates/create')}
          size={isMobile ? 'medium' : 'large'}
          fullWidth={isMobile}
          sx={{ borderRadius: 2 }}
        >
          New Template
        </Button>
      </Box>

      {/* Stats Cards */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6} sm={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h4" color="primary.main" fontWeight="bold">
                {stats.total}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Total Templates
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h4" color="success.main" fontWeight="bold">
                {stats.public}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Public
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h4" color="warning.main" fontWeight="bold">
                {stats.private}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Private
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h4" color="info.main" fontWeight="bold">
                {stats.categories?.length || 0}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Categories
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={(e, v) => setTabValue(v)}
          variant={isMobile ? 'scrollable' : 'standard'}
          scrollButtons={isMobile ? 'auto' : false}
        >
          <Tab label="All Templates" />
          <Tab label="Most Used" icon={<TrendingUpIcon />} iconPosition="start" />
          <Tab label="Public" icon={<PublicIcon />} iconPosition="start" />
          <Tab label="Private" icon={<LockIcon />} iconPosition="start" />
        </Tabs>
      </Paper>

      {/* Filters */}
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

        <Box sx={{ 
          display: (showFilters || !isMobile) ? 'block' : 'none',
        }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Category</InputLabel>
                <Select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  label="Category"
                >
                  {categories.map((cat) => (
                    <MenuItem key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Tags</InputLabel>
                <Select
                  multiple
                  value={selectedTags}
                  onChange={(e) => setSelectedTags(e.target.value as string[])}
                  input={<OutlinedInput label="Tags" />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {(selected as string[]).map((value) => (
                        <Chip key={value} label={value} size="small" />
                      ))}
                    </Box>
                  )}
                >
                  {allTags.map((tag) => (
                    <MenuItem key={tag} value={tag}>
                      <Checkbox checked={selectedTags.indexOf(tag) > -1} />
                      <ListItemText primary={tag} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Box>
      </Paper>

      {/* Templates Grid */}
      <Grid container spacing={2}>
        {templates.map((template) => (
          <Grid item xs={12} sm={6} md={4} key={template.id}>
            <Card
              sx={{
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4,
                },
              }}
              onClick={() => navigate(`/templates/${template.id}`)}
            >
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                  <Typography variant="h6" noWrap sx={{ maxWidth: '70%' }}>
                    {template.name}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMenuOpen(e, template);
                    }}
                  >
                    <MoreVertIcon />
                  </IconButton>
                </Box>

                <Chip
                  label={template.category}
                  size="small"
                  color={categoryColors[template.category] as any}
                  sx={{ mb: 1, mr: 1 }}
                />
                {template.isPublic ? (
                  <Chip icon={<PublicIcon />} label="Public" size="small" variant="outlined" sx={{ mb: 1 }} />
                ) : (
                  <Chip icon={<LockIcon />} label="Private" size="small" variant="outlined" sx={{ mb: 1 }} />
                )}

                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    mb: 2,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                  }}
                >
                  {template.message}
                </Typography>

                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 2 }}>
                  {template.tags.map((tag) => (
                    <Chip key={tag} label={tag} size="small" variant="outlined" />
                  ))}
                </Box>

                <Divider sx={{ my: 1 }} />

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary">
                    Used {template.usageCount} times
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {getTimeAgo(template.createdAt)}
                  </Typography>
                </Box>

                <Button
                  fullWidth
                  variant="outlined"
                  size="small"
                  sx={{ mt: 2 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUseTemplate(template);
                  }}
                >
                  Use Template
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Empty State */}
      {templates.length === 0 && !loading && (
        <Paper sx={{ p: 8, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary" gutterBottom>
            No templates found
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/templates/create')}
            sx={{ mt: 2 }}
          >
            Create Your First Template
          </Button>
        </Paper>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(e, value) => setPage(value)}
            color="primary"
            size={isMobile ? 'medium' : 'large'}
          />
        </Box>
      )}

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{ sx: { minWidth: 200 } }}
      >
        <MenuItem onClick={handleViewTemplate}>
          <ListItemIcon><ViewIcon fontSize="small" /></ListItemIcon>
          <ListItemText>View Details</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleEditTemplate}>
          <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDuplicateTemplate}>
          <ListItemIcon><CopyIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Duplicate</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleDeleteClick} sx={{ color: 'error.main' }}>
          <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Template</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{selectedTemplate?.name}"?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteTemplate} color="error" variant="contained">
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

export default Templates;