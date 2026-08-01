import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stepper,
  Step,
  StepLabel,
  Box,
  Typography,
  Paper,
  LinearProgress,
  Alert,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  FormControlLabel,
  Radio,
  RadioGroup,
  FormControl,
  FormLabel,
  Select,
  MenuItem,
  Grid
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import contactService from '../services/contact';

interface ImportContact {
  phoneNumber: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  company?: string;
  tags?: string[];
  [key: string]: any;
}

interface ImportResult {
  total: number;
  imported: number;
  failed: number;
  skipped: number;
  errors: Array<{ row: number; error: string; data: any }>;
  duplicates: Array<{ phoneNumber: string; existing: any }>;
}

const steps = ['Upload File', 'Map Fields', 'Review & Import'];

export const ContactImport: React.FC<{
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ open, onClose, onSuccess }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [data, setData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [updateExisting, setUpdateExisting] = useState(false);

  const fieldOptions = [
    { value: 'phoneNumber', label: 'Phone Number *', required: true },
    { value: 'firstName', label: 'First Name' },
    { value: 'lastName', label: 'Last Name' },
    { value: 'email', label: 'Email' },
    { value: 'company', label: 'Company' },
    { value: 'tags', label: 'Tags (comma separated)' },
    { value: 'skip', label: 'Skip Column' },
  ];

  const onDrop = (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    setFile(file);
    parseFile(file);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    maxFiles: 1,
  });

  const parseFile = (file: File) => {
    setLoading(true);
    setError('');

    const extension = file.name.split('.').pop()?.toLowerCase();

    if (extension === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setHeaders(results.meta.fields || []);
          setData(results.data as any[]);
          initializeMapping(results.meta.fields || []);
          setLoading(false);
          setActiveStep(1);
        },
        error: (error) => {
          setError('Failed to parse CSV: ' + error.message);
          setLoading(false);
        },
      });
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheet];
          const jsonData = XLSX.utils.sheet_to_json<any>(worksheet, { header: 1 });
          
          const headers = jsonData[0] as string[];
          const rows = jsonData.slice(1).map((row: any) => {
            const obj: any = {};
            headers.forEach((header, index) => {
              obj[header] = row[index];
            });
            return obj;
          });

          setHeaders(headers);
          setData(rows);
          initializeMapping(headers);
          setLoading(false);
          setActiveStep(1);
        } catch (error) {
          setError('Failed to parse Excel file');
          setLoading(false);
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const initializeMapping = (headers: string[]) => {
    const mapping: Record<string, string> = {};
    headers.forEach((header) => {
      const lower = header.toLowerCase();
      if (lower.includes('phone') || lower.includes('mobile')) {
        mapping[header] = 'phoneNumber';
      } else if (lower.includes('first')) {
        mapping[header] = 'firstName';
      } else if (lower.includes('last')) {
        mapping[header] = 'lastName';
      } else if (lower.includes('email')) {
        mapping[header] = 'email';
      } else if (lower.includes('company')) {
        mapping[header] = 'company';
      } else if (lower.includes('tag')) {
        mapping[header] = 'tags';
      } else {
        mapping[header] = 'skip';
      }
    });
    setFieldMapping(mapping);
  };

  const validateData = (): ImportResult => {
    const result: ImportResult = {
      total: data.length,
      imported: 0,
      failed: 0,
      skipped: 0,
      errors: [],
      duplicates: [],
    };

    const phoneColumn = Object.entries(fieldMapping).find(([_, v]) => v === 'phoneNumber')?.[0];
    
    if (!phoneColumn) {
      throw new Error('Phone number column is required');
    }

    data.forEach((row, index) => {
      const phoneNumber = row[phoneColumn]?.toString().trim();
      
      if (!phoneNumber) {
        result.failed++;
        result.errors.push({
          row: index + 2,
          error: 'Missing phone number',
          data: row,
        });
        return;
      }

      // Validate phone number format
      const phoneRegex = /^(?:\+255|0)[67][0-9]{8}$/;
      if (!phoneRegex.test(phoneNumber)) {
        result.failed++;
        result.errors.push({
          row: index + 2,
          error: 'Invalid phone number format',
          data: row,
        });
      }
    });

    result.imported = result.total - result.failed;
    return result;
  };

  const handleImport = async () => {
    try {
      setLoading(true);
      const validation = validateData();
      
      if (validation.failed > 0) {
        setImportResult(validation);
        setActiveStep(2);
        return;
      }

      // Process data
      const contacts = data.map((row) => {
        const contact: any = {};
        Object.entries(fieldMapping).forEach(([header, field]) => {
          if (field !== 'skip' && row[header]) {
            if (field === 'tags') {
              contact[field] = row[header].toString().split(',').map((t: string) => t.trim());
            } else {
              contact[field] = row[header].toString().trim();
            }
          }
        });
        return contact;
      });

      const response = await contactService.bulkImport(contacts, {
        skipDuplicates,
        updateExisting,
      });

      setImportResult(response.data);
      setActiveStep(2);
    } catch (error: any) {
      setError(error.message || 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box sx={{ p: 3 }}>
            <Paper
              variant="outlined"
              sx={{
                p: 4,
                textAlign: 'center',
                bgcolor: isDragActive ? 'action.hover' : 'background.paper',
                borderStyle: 'dashed',
                borderColor: isDragActive ? 'primary.main' : 'divider',
                cursor: 'pointer',
              }}
              {...getRootProps()}
            >
              <input {...getInputProps()} />
              <UploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                {isDragActive ? 'Drop files here' : 'Drag & drop contacts file'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                or click to select files
              </Typography>
              <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 2 }}>
                Supported formats: CSV, Excel (XLS, XLSX)
              </Typography>
            </Paper>
          </Box>
        );

      case 1:
        return (
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Map Fields
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Match your file columns to contact fields
            </Typography>

            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>File Column</TableCell>
                    <TableCell>Sample Data</TableCell>
                    <TableCell>Map to Field</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {headers.map((header) => (
                    <TableRow key={header}>
                      <TableCell>{header}</TableCell>
                      <TableCell>
                        {data[0]?.[header]?.toString().substring(0, 50)}
                      </TableCell>
                      <TableCell>
                        <FormControl fullWidth size="small">
                          <Select
                            value={fieldMapping[header] || 'skip'}
                            onChange={(e) => setFieldMapping({
                              ...fieldMapping,
                              [header]: e.target.value,
                            })}
                          >
                            {fieldOptions.map((option) => (
                              <MenuItem key={option.value} value={option.value}>
                                {option.label}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Box sx={{ mt: 3 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={skipDuplicates}
                    onChange={(e) => setSkipDuplicates(e.target.checked)}
                  />
                }
                label="Skip duplicate phone numbers"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={updateExisting}
                    onChange={(e) => setUpdateExisting(e.target.checked)}
                    disabled={!skipDuplicates}
                  />
                }
                label="Update existing contacts with new data"
              />
            </Box>
          </Box>
        );

      case 2:
        if (!importResult) return null;
        
        return (
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Import Results
            </Typography>

            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={4}>
                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'info.light', color: 'white' }}>
                  <Typography variant="h4">{importResult.total}</Typography>
                  <Typography variant="caption">Total</Typography>
                </Paper>
              </Grid>
              <Grid item xs={4}>
                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'success.light', color: 'white' }}>
                  <Typography variant="h4">{importResult.imported}</Typography>
                  <Typography variant="caption">Imported</Typography>
                </Paper>
              </Grid>
              <Grid item xs={4}>
                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'error.light', color: 'white' }}>
                  <Typography variant="h4">{importResult.failed}</Typography>
                  <Typography variant="caption">Failed</Typography>
                </Paper>
              </Grid>
            </Grid>

            {importResult.errors.length > 0 && (
              <>
                <Typography variant="subtitle2" color="error" gutterBottom>
                  Errors ({importResult.errors.length})
                </Typography>
                <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 200 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Row</TableCell>
                        <TableCell>Error</TableCell>
                        <TableCell>Data</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {importResult.errors.map((err, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{err.row}</TableCell>
                          <TableCell>
                            <Chip
                              icon={<ErrorIcon />}
                              label={err.error}
                              size="small"
                              color="error"
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption">
                              {JSON.stringify(err.data).substring(0, 50)}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )}
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Import Contacts</DialogTitle>
      <DialogContent>
        <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {loading && <LinearProgress sx={{ mb: 2 }} />}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {renderStepContent()}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>
          {activeStep === 2 ? 'Close' : 'Cancel'}
        </Button>
        {activeStep === 0 && file && (
          <Button onClick={() => setActiveStep(1)}>Next</Button>
        )}
        {activeStep === 1 && (
          <Button
            variant="contained"
            onClick={handleImport}
            disabled={loading}
          >
            Import
          </Button>
        )}
        {activeStep === 2 && (
          <Button
            variant="contained"
            onClick={() => {
              onClose();
              onSuccess();
            }}
          >
            Done
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};