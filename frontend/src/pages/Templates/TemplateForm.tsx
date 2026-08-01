import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Divider,
  Alert,
  CircularProgress,
  FormControlLabel,
  Switch,
  InputAdornment,
  Card,
  CardContent,
  Tooltip,
  SelectChangeEvent,
} from '@mui/material';
import {
  Save as SaveIcon,
  ArrowBack as ArrowBackIcon,
  Preview as PreviewIcon,
  ContentCopy as CopyIcon,
  Add as AddIcon,
  Close as CloseIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { addNotification } from '../../store/slices/uiSlice';
import templateService, { Template } from '../../services/template';
import { useMobile } from '../../hooks/useMobile';

const categories = [
  { value: 'general', label: 'General' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'transactional', label: 'Transactional' },
  { value: 'notification', label: 'Notification' },
  { value: 'birthday', label: 'Birthday' },
  { value: 'custom', label: 'Custom' },
];

const variableExamples = [
  { name: 'firstName', example: 'John' },
  { name: 'lastName', example: 'Doe' },
  { name: 'fullName', example: 'John Doe' },
  { name: 'email', example: 'john@example.com' },
  { name: 'phone', example: '0712345678' },
  { name: 'company', example: 'Acme Inc' },
  { name: 'date', example: '2024-03-09' },
  { name: 'time', example: '14:30' },
];

const TemplateForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isMobile } = useMobile();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [previewMode, setPreviewMode] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [variableInput, setVariableInput] = useState('');

  const [formData, setFormData] = useState<Partial<Template>>({
    name: '',
    description: '',
    message: '',
    category: 'general',
    tags: [],
    variables: [],
    isPublic: false,
  });

  // Check if we're coming from campaign creation with template data
  useEffect(() => {
    if (location.state && (location.state as any).template) {
      const template = (location.state as any).template as Template;
      setFormData({
        name: template.name,
        description: template.description,
        message: template.message,
        category: template.category,
        tags: template.tags,
        variables: template.variables,
        isPublic: template.isPublic,
      });
    }
  }, [location.state]);

  // Fetch template if editing
  useEffect(() => {
    if (id) {
      fetchTemplate();
    }
  }, [id]);

  const fetchTemplate = async () => {
    try {
      setLoading(true);
      const response = await templateService.getTemplate(id!);
      const template = response.data;
      setFormData({
        name: template.name,
        description: template.description,
        message: template.message,
        category: template.category,
        tags: template.tags,
        variables: template.variables,
        isPublic: template.isPublic,
      });
    } catch (error) {
      console.error('Failed to fetch template:', error);
      setError('Failed to load template');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [field]: event.target.value,
    });
  };

  // FIXED: Separate handler for Select component
  const handleCategoryChange = (event: SelectChangeEvent<string>) => {
    setFormData({
      ...formData,
      category: event.target.value as any,
    });
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags?.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...(formData.tags || []), tagInput.trim()],
      });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags?.filter((tag) => tag !== tagToRemove),
    });
  };

  const handleAddVariable = () => {
    if (variableInput.trim() && !formData.variables?.includes(variableInput.trim())) {
      setFormData({
        ...formData,
        variables: [...(formData.variables || []), variableInput.trim()],
      });
      setVariableInput('');
    }
  };

  const handleRemoveVariable = (varToRemove: string) => {
    setFormData({
      ...formData,
      variables: formData.variables?.filter((v) => v !== varToRemove),
    });
  };

  const insertVariable = (variable: string) => {
    setFormData({
      ...formData,
      message: formData.message + `{{${variable}}}`,
    });
  };

  const extractVariablesFromMessage = (message: string): string[] => {
    const matches = message.match(/\{\{([^}]+)\}\}/g) || [];
    return matches.map(m => m.replace(/\{\{|\}\}/g, ''));
  };

  const handleMessageChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const newMessage = e.target.value;
    const extractedVars = extractVariablesFromMessage(newMessage);
    
    // FIXED: Convert Set to array properly
    const currentVars = formData.variables || [];
    const allVars = [...currentVars, ...extractedVars];
    const uniqueVars = Array.from(new Set(allVars));
    
    setFormData({
      ...formData,
      message: newMessage,
      variables: uniqueVars,
    });
  };

  const validateForm = (): boolean => {
    if (!formData.name?.trim()) {
      setError('Template name is required');
      return false;
    }
    if (!formData.message?.trim()) {
      setError('Message is required');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSaving(true);
    setError('');

    try {
      if (id) {
        await templateService.updateTemplate(id, formData);
        dispatch(addNotification({
          type: 'success',
          message: 'Template updated successfully',
        }));
      } else {
        await templateService.createTemplate(formData);
        dispatch(addNotification({
          type: 'success',
          message: 'Template created successfully',
        }));
      }
      navigate('/templates');
    } catch (error: any) {
      console.error('Failed to save template:', error);
      setError(error.message || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const renderPreview = () => {
    let preview = formData.message || '';
    
    // Replace variables with examples
    variableExamples.forEach(({ name, example }) => {
      preview = preview.replace(new RegExp(`{{${name}}}`, 'g'), example);
    });

    return (
      <Card variant="outlined" sx={{ bgcolor: 'grey.50', mt: 2 }}>
        <CardContent>
          <Typography variant="subtitle2" gutterBottom>
            Preview with example data:
          </Typography>
          <Paper elevation={0} sx={{ p: 2, bgcolor: 'white', borderRadius: 2 }}>
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
              {preview}
            </Typography>
          </Paper>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate('/templates')} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant={isMobile ? 'h5' : 'h4'} fontWeight="bold">
          {id ? 'Edit Template' : 'Create Template'}
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: isMobile ? 2 : 4 }}>
        <Grid container spacing={3}>
          {/* Basic Info */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Template Name"
              value={formData.name || ''}
              onChange={handleInputChange('name')}
              required
              disabled={saving}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Description (Optional)"
              value={formData.description || ''}
              onChange={handleInputChange('description')}
              multiline
              rows={2}
              disabled={saving}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={formData.category || 'general'}
                onChange={handleCategoryChange}
                label="Category"
                disabled={saving}
              >
                {categories.map((cat) => (
                  <MenuItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isPublic || false}
                  onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                  disabled={saving}
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  Make Public
                  <Tooltip title="Public templates can be seen and used by other users">
                    <InfoIcon fontSize="small" color="info" />
                  </Tooltip>
                </Box>
              }
            />
          </Grid>

          {/* Message */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle2">Message</Typography>
              <Button
                size="small"
                startIcon={<PreviewIcon />}
                onClick={() => setPreviewMode(!previewMode)}
              >
                {previewMode ? 'Hide' : 'Show'} Preview
              </Button>
            </Box>
            <TextField
              fullWidth
              multiline
              rows={6}
              value={formData.message || ''}
              onChange={handleMessageChange}
              placeholder="Write your message here. Use {{variable}} for dynamic content."
              required
              disabled={saving}
            />
          </Grid>

          {/* Preview */}
          {previewMode && (
            <Grid item xs={12}>
              {renderPreview()}
            </Grid>
          )}

          {/* Variables */}
          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" gutterBottom>
              Variables
            </Typography>
            <Typography variant="caption" color="text.secondary" paragraph>
              Click on a variable to insert it into your message
            </Typography>

            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
              {variableExamples.map(({ name }) => (
                <Chip
                  key={name}
                  label={`{{${name}}}`}
                  onClick={() => insertVariable(name)}
                  clickable
                  color="primary"
                  variant="outlined"
                  size="small"
                />
              ))}
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <TextField
                size="small"
                placeholder="Custom variable name"
                value={variableInput}
                onChange={(e) => setVariableInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddVariable()}
              />
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={handleAddVariable}
                disabled={!variableInput.trim()}
              >
                Add
              </Button>
            </Box>

            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {formData.variables?.map((variable) => (
                <Chip
                  key={variable}
                  label={variable}
                  onDelete={() => handleRemoveVariable(variable)}
                  size="small"
                />
              ))}
            </Box>
          </Grid>

          {/* Tags */}
          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" gutterBottom>
              Tags
            </Typography>
            <Typography variant="caption" color="text.secondary" paragraph>
              Add tags to organize your templates
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <TextField
                size="small"
                placeholder="Add tag"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
              />
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={handleAddTag}
                disabled={!tagInput.trim()}
              >
                Add
              </Button>
            </Box>

            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {formData.tags?.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  onDelete={() => handleRemoveTag(tag)}
                  size="small"
                />
              ))}
            </Box>
          </Grid>

          {/* Submit Buttons */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
              <Button
                variant="outlined"
                onClick={() => navigate('/templates')}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={saving}
                startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
              >
                {saving ? 'Saving...' : id ? 'Update Template' : 'Create Template'}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default TemplateForm;