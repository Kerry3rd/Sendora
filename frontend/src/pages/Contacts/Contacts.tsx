import React, { useState, useEffect, useCallback } from 'react';
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
  TablePagination,
  Button,
  IconButton,
  Chip,
  Avatar,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  OutlinedInput,
  Alert,
  Snackbar,
  LinearProgress,
  Tooltip,
  Card,
  CardContent,
  Fab,
  Zoom,
  Menu,
  MenuItem as DropdownMenuItem,
  ListItemIcon,
  Divider,
  Checkbox as MuiCheckbox,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Upload as UploadIcon,
  Download as DownloadIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Block as BlockIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Business as BusinessIcon,
  MoreVert as MoreVertIcon,
  FileCopy as CopyIcon,
  FilterList as FilterIcon,
  Close as CloseIcon,
  CloudDownload as CloudDownloadIcon,
  CloudUpload as CloudUploadIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import contactService from '../../services/contact';
import { format } from 'date-fns';
import { useMobile } from '../../hooks/useMobile';
import { ContactImport } from '../../components/ContactImport';
import { ContactExport } from '../../components/ContactExport';
import { MobileTable } from '../../components/MobileTable';

interface Contact {
  id: string;
  phoneNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  tags: string[];
  isSubscribed: boolean;
  isBlacklisted: boolean;
  createdAt: string;
}

const Contacts: React.FC = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalContacts, setTotalContacts] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [snackbar, setSnackbar] = useState({ 
    open: false, 
    message: '', 
    severity: 'success' as 'success' | 'error' 
  });
  const [stats, setStats] = useState({
    total: 0,
    subscribed: 0,
    blacklisted: 0,
    uniqueTags: 0
  });
  const [tags, setTags] = useState<string[]>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [selectMode, setSelectMode] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { isMobile } = useMobile();

  useEffect(() => {
    fetchContacts();
    fetchStats();
  }, [page, rowsPerPage, searchTerm, selectedTags, statusFilter]);

  const fetchContacts = async () => {
    try {
      setLoading(true);
      
      const response = await contactService.getContacts({
        page: page + 1,
        limit: rowsPerPage,
        search: searchTerm || undefined,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
        subscribed: statusFilter === 'subscribed' ? true : 
                   statusFilter === 'unsubscribed' ? false : undefined,
        blacklisted: statusFilter === 'blacklisted' ? true : undefined,
      });
      
      if (response.success) {
        setContacts(response.data.contacts);
        setTotalContacts(response.data.pagination.total);
      }
    } catch (error: any) {
      console.error('Failed to fetch contacts:', error);
      setSnackbar({
        open: true,
        message: error.message || 'Failed to fetch contacts',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await contactService.getStats();
      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  useEffect(() => {
    const fetchTags = async () => {
      try {
        const response = await contactService.getContacts({ limit: 1000 });
        if (response.success) {
          const allTags = new Set<string>();
          response.data.contacts.forEach((contact: Contact) => {
            contact.tags.forEach(tag => allTags.add(tag));
          });
          setTags(Array.from(allTags).sort());
        }
      } catch (error) {
        console.error('Failed to fetch tags:', error);
      }
    };
    
    fetchTags();
  }, []);

  // Bulk operations
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedContacts(contacts.map(c => c.id));
    } else {
      setSelectedContacts([]);
    }
  };

  const handleSelectContact = (contactId: string, checked: boolean) => {
    if (checked) {
      setSelectedContacts([...selectedContacts, contactId]);
    } else {
      setSelectedContacts(selectedContacts.filter(id => id !== contactId));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedContacts.length === 0) return;
    
    if (!window.confirm(`Delete ${selectedContacts.length} selected contacts?`)) return;
    
    try {
      await contactService.bulkDelete(selectedContacts);
      setSnackbar({
        open: true,
        message: `${selectedContacts.length} contacts deleted successfully`,
        severity: 'success',
      });
      setSelectedContacts([]);
      setSelectMode(false);
      fetchContacts();
      fetchStats();
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error.message || 'Failed to delete contacts',
        severity: 'error',
      });
    }
  };

  const handleBulkExport = async () => {
    if (selectedContacts.length === 0) return;
    setExportDialogOpen(true);
  };

  const handleBulkBlacklist = async () => {
    if (selectedContacts.length === 0) return;
    
    try {
      for (const contactId of selectedContacts) {
        await contactService.updateContact(contactId, { isBlacklisted: true });
      }
      setSnackbar({
        open: true,
        message: `${selectedContacts.length} contacts blacklisted`,
        severity: 'success',
      });
      setSelectedContacts([]);
      setSelectMode(false);
      fetchContacts();
      fetchStats();
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error.message || 'Failed to blacklist contacts',
        severity: 'error',
      });
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      await contactService.downloadSampleTemplate('excel');
      setSnackbar({
        open: true,
        message: 'Template downloaded successfully',
        severity: 'success',
      });
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error.message || 'Failed to download template',
        severity: 'error',
      });
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, contact: Contact) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedContact(contact);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedContact(null);
  };

  const handleEditContact = () => {
    if (selectedContact) {
      setEditDialogOpen(true);
    }
    handleMenuClose();
  };

  const handleDeleteContact = async () => {
    if (!selectedContact) return;
    
    try {
      await contactService.deleteContact(selectedContact.id);
      setSnackbar({
        open: true,
        message: 'Contact deleted successfully',
        severity: 'success',
      });
      fetchContacts();
      fetchStats();
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error.message || 'Failed to delete contact',
        severity: 'error',
      });
    }
    handleMenuClose();
  };

  const handleBlacklistContact = async () => {
    if (!selectedContact) return;
    
    try {
      await contactService.updateContact(selectedContact.id, {
        isBlacklisted: !selectedContact.isBlacklisted
      });
      setSnackbar({
        open: true,
        message: `Contact ${selectedContact.isBlacklisted ? 'removed from' : 'added to'} blacklist`,
        severity: 'success',
      });
      fetchContacts();
      fetchStats();
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error.message || 'Failed to update blacklist status',
        severity: 'error',
      });
    }
    handleMenuClose();
  };

  const handleSaveContact = async (contactData: Partial<Contact>) => {
    try {
      setLoading(true);
      
      if (selectedContact) {
        await contactService.updateContact(selectedContact.id, contactData);
        setSnackbar({
          open: true,
          message: 'Contact updated successfully',
          severity: 'success',
        });
      } else {
        await contactService.createContact(contactData);
        setSnackbar({
          open: true,
          message: 'Contact created successfully',
          severity: 'success',
        });
      }
      
      setEditDialogOpen(false);
      fetchContacts();
      fetchStats();
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error.message || 'Failed to save contact',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  // Table columns for MobileTable
  // Table columns for MobileTable - FIXED
  const columns = [
    {
      id: 'select',
      label: '',
      minWidth: 50,
      mobile: selectMode,
      render: (row: Contact) => (
        selectMode ? (
          <MuiCheckbox
            checked={selectedContacts.includes(row.id)}
            onChange={(e) => handleSelectContact(row.id, e.target.checked)}
            onClick={(e) => e.stopPropagation()}
          />
        ) : null
      ),
    },
    {
      id: 'contact',
      label: 'Contact',
      minWidth: 200,
      mobile: true,
      render: (row: Contact) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar>
            {row.firstName?.charAt(0)}{row.lastName?.charAt(0)}
          </Avatar>
          <Box>
            <Typography variant="body2" fontWeight="medium">
              {row.firstName} {row.lastName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              ID: {row.id.slice(0, 8)}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      id: 'phone',
      label: 'Phone',
      minWidth: 150,
      mobile: true,
      render: (row: Contact) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <PhoneIcon fontSize="small" color="action" />
          {row.phoneNumber}
        </Box>
      ),
    },
    {
      id: 'email',
      label: 'Email',
      minWidth: 200,
      mobile: false,
      render: (row: Contact) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <EmailIcon fontSize="small" color="action" />
          {row.email || '-'}
        </Box>
      ),
    },
    {
      id: 'company',
      label: 'Company',
      minWidth: 150,
      mobile: false,
      render: (row: Contact) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <BusinessIcon fontSize="small" color="action" />
          {row.company || '-'}
        </Box>
      ),
    },
    {
      id: 'tags',
      label: 'Tags',
      minWidth: 150,
      mobile: false,
      render: (row: Contact) => (
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          {row.tags.map((tag) => (
            <Chip key={tag} label={tag} size="small" />
          ))}
        </Box>
      ),
    },
    {
      id: 'status',
      label: 'Status',
      minWidth: 120,
      mobile: true,
      render: (row: Contact) => (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Chip
            icon={row.isSubscribed ? <CheckCircleIcon /> : <CancelIcon />}
            label={row.isSubscribed ? 'Subscribed' : 'Unsubscribed'}
            size="small"
            color={row.isSubscribed ? 'success' : 'default'}
            variant="outlined"
          />
          {row.isBlacklisted && (
            <Chip
              icon={<BlockIcon />}
              label="Blacklisted"
              size="small"
              color="error"
              variant="outlined"
            />
          )}
        </Box>
      ),
    },
    {
      id: 'created',
      label: 'Created',
      minWidth: 100,
      mobile: false,
      render: (row: Contact) => (
        <Tooltip title={format(new Date(row.createdAt), 'MMM dd, yyyy HH:mm')}>
          <Typography variant="body2">
            {format(new Date(row.createdAt), 'MMM dd, yyyy')}
          </Typography>
        </Tooltip>
      ),
    },
    {
      id: 'actions',
      label: 'Actions',
      minWidth: 100,
      mobile: true,
      align: 'right' as const,
      render: (row: Contact) => (
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            handleMenuOpen(e, row);
          }}
        >
          <MoreVertIcon />
        </IconButton>
      ),
    },
  ];

  // Mobile card renderer
  const renderMobileCard = (contact: Contact) => (
    <CardContent sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Avatar>
            {contact.firstName?.charAt(0)}{contact.lastName?.charAt(0)}
          </Avatar>
          <Box>
            <Typography variant="subtitle1" fontWeight="bold">
              {contact.firstName} {contact.lastName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {contact.phoneNumber}
            </Typography>
          </Box>
        </Box>
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            handleMenuOpen(e, contact);
          }}
        >
          <MoreVertIcon />
        </IconButton>
      </Box>

      <Box sx={{ mt: 2 }}>
        {contact.email && (
          <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
            <EmailIcon fontSize="small" color="action" />
            {contact.email}
          </Typography>
        )}
        {contact.company && (
          <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
            <BusinessIcon fontSize="small" color="action" />
            {contact.company}
          </Typography>
        )}
      </Box>

      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 1, mb: 1 }}>
        {contact.tags.map((tag) => (
          <Chip key={tag} label={tag} size="small" />
        ))}
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Chip
            icon={contact.isSubscribed ? <CheckCircleIcon /> : <CancelIcon />}
            label={contact.isSubscribed ? 'Subscribed' : 'Unsubscribed'}
            size="small"
            color={contact.isSubscribed ? 'success' : 'default'}
            variant="outlined"
          />
          {contact.isBlacklisted && (
            <Chip
              icon={<BlockIcon />}
              label="Blacklisted"
              size="small"
              color="error"
              variant="outlined"
            />
          )}
        </Box>
        <Typography variant="caption" color="text.secondary">
          {format(new Date(contact.createdAt), 'MMM dd, yyyy')}
        </Typography>
      </Box>
    </CardContent>
  );

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
          Contacts
        </Typography>
        
        {selectMode ? (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              color="error"
              size={isMobile ? 'small' : 'medium'}
              onClick={handleBulkDelete}
              disabled={selectedContacts.length === 0}
            >
              Delete ({selectedContacts.length})
            </Button>
            <Button
              variant="outlined"
              color="warning"
              size={isMobile ? 'small' : 'medium'}
              onClick={handleBulkBlacklist}
              disabled={selectedContacts.length === 0}
            >
              Blacklist
            </Button>
            <Button
              variant="outlined"
              size={isMobile ? 'small' : 'medium'}
              onClick={handleBulkExport}
              disabled={selectedContacts.length === 0}
            >
              Export
            </Button>
            <Button
              variant="outlined"
              size={isMobile ? 'small' : 'medium'}
              onClick={() => {
                setSelectMode(false);
                setSelectedContacts([]);
              }}
            >
              Cancel
            </Button>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              size={isMobile ? 'small' : 'medium'}
              startIcon={<CloudDownloadIcon />}
              onClick={handleDownloadTemplate}
            >
              Template
            </Button>
            <Button
              variant="outlined"
              size={isMobile ? 'small' : 'medium'}
              startIcon={<CloudUploadIcon />}
              onClick={() => setImportDialogOpen(true)}
            >
              Import
            </Button>
            <Button
              variant="outlined"
              size={isMobile ? 'small' : 'medium'}
              startIcon={<DownloadIcon />}
              onClick={() => setExportDialogOpen(true)}
            >
              Export
            </Button>
            <Button
              variant="outlined"
              size={isMobile ? 'small' : 'medium'}
              onClick={() => setSelectMode(true)}
            >
              Select
            </Button>
            <Button
              variant="contained"
              size={isMobile ? 'small' : 'medium'}
              startIcon={<AddIcon />}
              onClick={() => {
                setSelectedContact(null);
                setEditDialogOpen(true);
              }}
            >
              Add
            </Button>
          </Box>
        )}
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Total
              </Typography>
              <Typography variant="h5" fontWeight="bold">
                {stats.total}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Subscribed
              </Typography>
              <Typography variant="h5" fontWeight="bold" color="success.main">
                {stats.subscribed}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Blacklisted
              </Typography>
              <Typography variant="h5" fontWeight="bold" color="error">
                {stats.blacklisted}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Tags
              </Typography>
              <Typography variant="h5" fontWeight="bold" color="info.main">
                {stats.uniqueTags}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

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

        <Box sx={{ display: (showFilters || !isMobile) ? 'block' : 'none' }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search contacts..."
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
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  label="Status"
                >
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="subscribed">Subscribed</MenuItem>
                  <MenuItem value="unsubscribed">Unsubscribed</MenuItem>
                  <MenuItem value="blacklisted">Blacklisted</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={5}>
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
                  {tags.map((tag) => (
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

      {/* Contacts Table/Cards */}
      {loading ? (
        <LinearProgress />
      ) : (
        <>
          <MobileTable
            columns={columns}
            data={contacts}
            renderMobileCard={renderMobileCard}
            onRowClick={(contact) => !selectMode && handleMenuOpen(undefined as any, contact)}
          />

          {/* Pagination */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <TablePagination
              component="div"
              count={totalContacts}
              page={page}
              onPageChange={(e, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[10, 25, 50]}
            />
          </Box>
        </>
      )}

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{ sx: { minWidth: 200 } }}
      >
        <DropdownMenuItem onClick={handleEditContact}>
          <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleBlacklistContact}>
          <ListItemIcon>
            <BlockIcon fontSize="small" color={selectedContact?.isBlacklisted ? 'warning' : 'action'} />
          </ListItemIcon>
          <ListItemText>
            {selectedContact?.isBlacklisted ? 'Remove from Blacklist' : 'Add to Blacklist'}
          </ListItemText>
        </DropdownMenuItem>
        <Divider />
        <DropdownMenuItem onClick={handleDeleteContact} sx={{ color: 'error.main' }}>
          <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </DropdownMenuItem>
      </Menu>

      {/* Import Dialog */}
      <ContactImport
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        onSuccess={() => {
          fetchContacts();
          fetchStats();
        }}
      />

      {/* Export Dialog */}
      <ContactExport
        open={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        totalContacts={totalContacts}
        selectedContacts={selectedContacts}
        filters={{
          search: searchTerm,
          tags: selectedTags,
          status: statusFilter,
        }}
      />

      {/* Edit Contact Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{selectedContact ? 'Edit Contact' : 'Add Contact'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="First Name"
                defaultValue={selectedContact?.firstName}
                size="small"
                id="first-name-input"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Last Name"
                defaultValue={selectedContact?.lastName}
                size="small"
                id="last-name-input"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Phone Number"
                defaultValue={selectedContact?.phoneNumber}
                required
                size="small"
                id="phone-input"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                defaultValue={selectedContact?.email}
                size="small"
                id="email-input"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Company"
                defaultValue={selectedContact?.company}
                size="small"
                id="company-input"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>Tags</InputLabel>
                <Select
                  multiple
                  defaultValue={selectedContact?.tags || []}
                  input={<OutlinedInput label="Tags" />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {(selected as string[]).map((value) => (
                        <Chip key={value} label={value} size="small" />
                      ))}
                    </Box>
                  )}
                >
                  {tags.map((tag) => (
                    <MenuItem key={tag} value={tag}>
                      <Checkbox checked={selectedContact?.tags?.includes(tag) || false} />
                      <ListItemText primary={tag} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => {
              const firstNameInput = document.getElementById('first-name-input') as HTMLInputElement;
              const lastNameInput = document.getElementById('last-name-input') as HTMLInputElement;
              const phoneInput = document.getElementById('phone-input') as HTMLInputElement;
              const emailInput = document.getElementById('email-input') as HTMLInputElement;
              const companyInput = document.getElementById('company-input') as HTMLInputElement;
              
              const contactData = {
                firstName: firstNameInput?.value || '',
                lastName: lastNameInput?.value || '',
                phoneNumber: phoneInput?.value || '',
                email: emailInput?.value || '',
                company: companyInput?.value || '',
                tags: selectedTags,
              };
              
              handleSaveContact(contactData);
            }}
            disabled={loading}
          >
            {selectedContact ? 'Update' : 'Add'}
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

export default Contacts;