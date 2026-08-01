import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  TextField,
  Chip,
  Alert,
  LinearProgress,
  Grid,
  Paper,
  Checkbox,
  FormGroup,
  Divider,
} from '@mui/material';
import {
  Download as DownloadIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  FileCopy as FileIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Business as BusinessIcon,
  Person as PersonIcon,
  Label as TagIcon,
  DateRange as DateIcon,
} from '@mui/icons-material';
import contactService from '../services/contact';
import { saveAs } from 'file-saver';

interface ExportOptions {
  format: 'csv' | 'excel' | 'json';
  includeFields: string[];
  status?: 'all' | 'subscribed' | 'unsubscribed' | 'blacklisted';
  dateRange?: {
    start: string;
    end: string;
  };
}

interface ContactExportProps {
  open: boolean;
  onClose: () => void;
  totalContacts?: number;
  selectedContacts?: string[];
  filters?: any;
  onSuccess?: () => void;
}

const availableFields = [
  { id: 'phoneNumber', label: 'Phone Number', icon: <PhoneIcon />, required: true },
  { id: 'firstName', label: 'First Name', icon: <PersonIcon /> },
  { id: 'lastName', label: 'Last Name', icon: <PersonIcon /> },
  { id: 'email', label: 'Email', icon: <EmailIcon /> },
  { id: 'company', label: 'Company', icon: <BusinessIcon /> },
  { id: 'tags', label: 'Tags', icon: <TagIcon /> },
  { id: 'isSubscribed', label: 'Subscription Status', icon: null },
  { id: 'isBlacklisted', label: 'Blacklist Status', icon: null },
  { id: 'createdAt', label: 'Created Date', icon: <DateIcon /> },
  { id: 'updatedAt', label: 'Updated Date', icon: <DateIcon /> },
];

export const ContactExport: React.FC<ContactExportProps> = ({
  open,
  onClose,
  totalContacts = 0,
  selectedContacts = [],
  filters = {},
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'excel',
    includeFields: ['phoneNumber', 'firstName', 'lastName', 'email', 'company', 'tags', 'isSubscribed', 'createdAt'],
    status: 'all',
  });
  const [estimatedSize, setEstimatedSize] = useState<string>('');
  const [useDateRange, setUseDateRange] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Estimate file size
  useEffect(() => {
    const estimateFileSize = () => {
      const fieldsPerRow = exportOptions.includeFields.length;
      const avgFieldSize = 20; // bytes
      const count = selectedContacts.length > 0 ? selectedContacts.length : totalContacts;
      const estimatedBytes = count * fieldsPerRow * avgFieldSize;
      
      if (estimatedBytes < 1024) return `${estimatedBytes} B`;
      if (estimatedBytes < 1024 * 1024) return `${(estimatedBytes / 1024).toFixed(1)} KB`;
      return `${(estimatedBytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    setEstimatedSize(estimateFileSize());
  }, [exportOptions.includeFields.length, totalContacts, selectedContacts.length]);

  const handleFieldToggle = (fieldId: string) => {
    if (fieldId === 'phoneNumber') return; // Phone is always included
    
    setExportOptions({
      ...exportOptions,
      includeFields: exportOptions.includeFields.includes(fieldId)
        ? exportOptions.includeFields.filter(f => f !== fieldId)
        : [...exportOptions.includeFields, fieldId],
    });
  };

  const handleSelectAll = () => {
    if (exportOptions.includeFields.length === availableFields.length) {
      // Deselect all except phone
      setExportOptions({
        ...exportOptions,
        includeFields: ['phoneNumber'],
      });
    } else {
      // Select all
      setExportOptions({
        ...exportOptions,
        includeFields: availableFields.map(f => f.id),
      });
    }
  };

  const handleExport = async () => {
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const options = {
        ...exportOptions,
        ...(useDateRange && startDate && endDate ? {
          dateRange: {
            start: startDate,
            end: endDate,
          }
        } : {}),
        filters: {
          ...filters,
          status: exportOptions.status !== 'all' ? exportOptions.status : undefined,
        },
      };

      let response;
      
      if (selectedContacts.length > 0) {
        // Export selected contacts
        response = await contactService.exportSelected(selectedContacts, options);
      } else {
        // Export all contacts with filters
        response = await contactService.exportContacts(options);
      }

      // Handle the blob response
      const blob = new Blob([response.data], { 
        type: exportOptions.format === 'csv' 
          ? 'text/csv' 
          : exportOptions.format === 'excel' 
            ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            : 'application/json'
      });

      const filename = `contacts_export_${new Date().toISOString().split('T')[0]}.${
        exportOptions.format === 'excel' ? 'xlsx' : exportOptions.format
      }`;

      saveAs(blob, filename);
      
      setSuccess(true);
      setTimeout(() => {
        onClose();
        if (onSuccess) onSuccess();
      }, 2000);
    } catch (error: any) {
      setError(error.message || 'Export failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Export Contacts</DialogTitle>
      <DialogContent>
        {loading && <LinearProgress sx={{ mb: 2 }} />}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Export completed successfully! Download started.
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Summary */}
          <Grid item xs={12}>
            <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
              <Typography variant="subtitle2" gutterBottom>
                Export Summary
              </Typography>
              <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    {selectedContacts.length > 0 ? 'Selected Contacts' : 'Total Contacts'}
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {(selectedContacts.length > 0 ? selectedContacts.length : totalContacts).toLocaleString()}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Estimated File Size
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {estimatedSize}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Selected Fields
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {exportOptions.includeFields.length}
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Grid>

          {/* Format Selection */}
          <Grid item xs={12}>
            <FormControl component="fieldset">
              <FormLabel component="legend">Export Format</FormLabel>
              <RadioGroup
                row
                value={exportOptions.format}
                onChange={(e) => setExportOptions({
                  ...exportOptions,
                  format: e.target.value as any,
                })}
              >
                <FormControlLabel value="excel" control={<Radio />} label="Excel (.xlsx)" />
                <FormControlLabel value="csv" control={<Radio />} label="CSV (.csv)" />
                <FormControlLabel value="json" control={<Radio />} label="JSON (.json)" />
              </RadioGroup>
            </FormControl>
          </Grid>

          {/* Status Filter */}
          <Grid item xs={12}>
            <FormControl component="fieldset">
              <FormLabel component="legend">Filter by Status</FormLabel>
              <RadioGroup
                row
                value={exportOptions.status}
                onChange={(e) => setExportOptions({
                  ...exportOptions,
                  status: e.target.value as any,
                })}
              >
                <FormControlLabel value="all" control={<Radio />} label="All Contacts" />
                <FormControlLabel value="subscribed" control={<Radio />} label="Subscribed Only" />
                <FormControlLabel value="unsubscribed" control={<Radio />} label="Unsubscribed Only" />
                <FormControlLabel value="blacklisted" control={<Radio />} label="Blacklisted Only" />
              </RadioGroup>
            </FormControl>
          </Grid>

          {/* Date Range Filter */}
          <Grid item xs={12}>
            <FormGroup>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={useDateRange}
                    onChange={(e) => setUseDateRange(e.target.checked)}
                  />
                }
                label="Filter by Date Range"
              />
            </FormGroup>
            
            {useDateRange && (
              <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                <TextField
                  type="date"
                  label="Start Date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  size="small"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  type="date"
                  label="End Date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  size="small"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Box>
            )}
          </Grid>

          {/* Fields Selection */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <FormLabel component="legend">Fields to Include</FormLabel>
              <Button size="small" onClick={handleSelectAll}>
                {exportOptions.includeFields.length === availableFields.length ? 'Deselect All' : 'Select All'}
              </Button>
            </Box>
            <Typography variant="caption" color="text.secondary" paragraph>
              Phone Number is always included
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {availableFields.map((field) => (
                <Chip
                  key={field.id}
                  icon={field.icon as any}
                  label={field.label}
                  onClick={() => handleFieldToggle(field.id)}
                  color={exportOptions.includeFields.includes(field.id) ? 'primary' : 'default'}
                  variant={exportOptions.includeFields.includes(field.id) ? 'filled' : 'outlined'}
                  disabled={field.id === 'phoneNumber'}
                  sx={{ 
                    cursor: 'pointer',
                    '& .MuiChip-icon': { 
                      color: exportOptions.includeFields.includes(field.id) ? 'white' : 'inherit' 
                    },
                  }}
                />
              ))}
            </Box>
          </Grid>

          {/* Preview of selected fields */}
          <Grid item xs={12}>
            <Divider sx={{ my: 1 }} />
            <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
              <Typography variant="subtitle2" gutterBottom>
                Preview
              </Typography>
              <Typography variant="caption" color="text.secondary" component="div">
                The exported file will include these columns:
              </Typography>
              <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {exportOptions.includeFields.map((fieldId) => {
                  const field = availableFields.find(f => f.id === fieldId);
                  return field ? (
                    <Chip
                      key={fieldId}
                      label={field.label}
                      size="small"
                      icon={<FileIcon />}
                      variant="outlined"
                    />
                  ) : null;
                })}
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleExport}
          disabled={loading || exportOptions.includeFields.length === 0}
          startIcon={loading ? undefined : <DownloadIcon />}
        >
          {loading ? 'Exporting...' : 'Export'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};