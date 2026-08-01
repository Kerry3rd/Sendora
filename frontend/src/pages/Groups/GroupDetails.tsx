import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Stack,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Alert,
  Snackbar,
  CircularProgress,
  Tooltip,
  InputAdornment,
  TablePagination
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PersonAdd as PersonAddIcon,
  PersonRemove as PersonRemoveIcon,
  Search as SearchIcon,
  Close as CloseIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Business as BusinessIcon
} from '@mui/icons-material';
import groupService from '../../services/group';
// Import your Contact type or define it
import { Contact } from '../../services/contact';

// Define the GroupDetail type that includes contacts
interface GroupDetail {
  id: string;
  name: string;
  description: string | null;
  userId: string;
  contactsCount: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  contacts: Contact[]; // Add contacts array
}

const GroupDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Edit dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', description: '', tags: '' });
  
  // Add contacts dialog
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [availableContacts, setAvailableContacts] = useState<Contact[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingContacts, setLoadingContacts] = useState(false);
  
  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contactToRemove, setContactToRemove] = useState<string | null>(null);
  
  // Snackbar
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  
  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Fetch group details
  useEffect(() => {
    if (id) {
      fetchGroup();
    }
  }, [id]);

  const fetchGroup = async () => {
    try {
      setLoading(true);
      const response = await groupService.getGroup(id!);
      setGroup(response.group);
      setEditForm({
        name: response.group.name,
        description: response.group.description || '',
        tags: response.group.tags?.join(', ') || ''
      });
    } catch (err: any) {
      setError(err.message || 'Failed to fetch group');
    } finally {
      setLoading(false);
    }
  };

  // Fetch available contacts for adding
  const fetchAvailableContacts = async (search?: string) => {
    if (!id) return;
    try {
      setLoadingContacts(true);
      const response = await groupService.getAvailableContacts(id, search);
      setAvailableContacts(response.data);
    } catch (err: any) {
      showSnackbar('Failed to load contacts', 'error');
    } finally {
      setLoadingContacts(false);
    }
  };

  // Handle edit group
  const handleEditGroup = async () => {
    if (!group) return;
    try {
      const tagsArray = editForm.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      await groupService.updateGroup(group.id, {
        name: editForm.name,
        description: editForm.description,
        tags: tagsArray
      });
      showSnackbar('Group updated successfully', 'success');
      setEditDialogOpen(false);
      fetchGroup();
    } catch (err: any) {
      showSnackbar(err.message || 'Failed to update group', 'error');
    }
  };

  // Handle delete group
  const handleDeleteGroup = async () => {
    if (!group) return;
    try {
      await groupService.deleteGroup(group.id);
      showSnackbar('Group deleted successfully', 'success');
      navigate('/groups');
    } catch (err: any) {
      showSnackbar(err.message || 'Failed to delete group', 'error');
      setDeleteDialogOpen(false);
    }
  };

  // Handle add contacts
  const handleAddContacts = async () => {
    if (!group || selectedContacts.length === 0) return;
    try {
      await groupService.addContacts(group.id, selectedContacts);
      showSnackbar(`${selectedContacts.length} contact(s) added to group`, 'success');
      setAddDialogOpen(false);
      setSelectedContacts([]);
      setSearchTerm('');
      fetchGroup(); // Refresh group to show new contacts
    } catch (err: any) {
      showSnackbar(err.message || 'Failed to add contacts', 'error');
    }
  };

  // Handle remove contact
  const handleRemoveContact = async (contactId: string) => {
    if (!group) return;
    try {
      await groupService.removeContacts(group.id, [contactId]);
      showSnackbar('Contact removed from group', 'success');
      fetchGroup(); // Refresh group
      setContactToRemove(null);
    } catch (err: any) {
      showSnackbar(err.message || 'Failed to remove contact', 'error');
    }
  };

  // Open add dialog and load available contacts
  const handleOpenAddDialog = () => {
    setAddDialogOpen(true);
    fetchAvailableContacts();
  };

  // Search available contacts
  const handleSearchAvailable = async () => {
    fetchAvailableContacts(searchTerm);
  };

  // Toggle contact selection
  const toggleContactSelection = (contactId: string) => {
    setSelectedContacts(prev =>
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  // Show snackbar helper
  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !group) {
    return (
      <Box p={3}>
        <Alert severity="error">{error || 'Group not found'}</Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/groups')}
          sx={{ mt: 2 }}
        >
          Back to Groups
        </Button>
      </Box>
    );
  }

  // Pagination
  const paginatedContacts = group.contacts?.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  ) || [];

  return (
    <Box p={3}>
      {/* Header */}
      <Box display="flex" alignItems="center" mb={3}>
        <IconButton onClick={() => navigate('/groups')} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" component="h1" sx={{ flex: 1 }}>
          {group.name}
        </Typography>
        <Box>
          <Tooltip title="Edit Group">
            <IconButton onClick={() => setEditDialogOpen(true)} sx={{ mr: 1 }}>
              <EditIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete Group">
            <IconButton onClick={() => setDeleteDialogOpen(true)} color="error">
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Group Info */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="body1" paragraph>
          {group.description || 'No description provided'}
        </Typography>
        {group.tags && group.tags.length > 0 && (
          <Stack direction="row" spacing={1} mb={2}>
            {group.tags.map((tag: string, index: number) => (
              <Chip key={index} label={tag} size="small" />
            ))}
          </Stack>
        )}
        <Typography variant="body2" color="text.secondary">
          Created: {new Date(group.createdAt).toLocaleDateString()}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Total Contacts: {group.contacts?.length || 0}
        </Typography>
      </Paper>

      {/* Contacts Section */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5">Contacts in Group</Typography>
        <Button
          variant="contained"
          startIcon={<PersonAddIcon />}
          onClick={handleOpenAddDialog}
        >
          Add Contacts
        </Button>
      </Box>

      <Paper>
        {group.contacts && group.contacts.length > 0 ? (
          <>
            <List>
              {paginatedContacts.map((contact: Contact, index: number) => (
                <React.Fragment key={contact.id}>
                  <ListItem>
                    <ListItemAvatar>
                      <Avatar>
                        {contact.firstName?.[0]}{contact.lastName?.[0]}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={`${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'Unnamed'}
                      secondary={
                        <Box component="span">
                          {contact.phoneNumber && (
                            <Box component="span" display="flex" alignItems="center" gap={0.5}>
                              <PhoneIcon fontSize="small" /> {contact.phoneNumber}
                            </Box>
                          )}
                          {contact.email && (
                            <Box component="span" display="flex" alignItems="center" gap={0.5}>
                              <EmailIcon fontSize="small" /> {contact.email}
                            </Box>
                          )}
                          {contact.company && (
                            <Box component="span" display="flex" alignItems="center" gap={0.5}>
                              <BusinessIcon fontSize="small" /> {contact.company}
                            </Box>
                          )}
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Tooltip title="Remove from Group">
                        <IconButton
                          edge="end"
                          onClick={() => setContactToRemove(contact.id)}
                          color="error"
                        >
                          <PersonRemoveIcon />
                        </IconButton>
                      </Tooltip>
                    </ListItemSecondaryAction>
                  </ListItem>
                  {index < paginatedContacts.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
            <TablePagination
              component="div"
              count={group.contacts.length}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
            />
          </>
        ) : (
          <Box p={4} textAlign="center">
            <Typography color="text.secondary" paragraph>
              No contacts in this group yet
            </Typography>
            <Button
              variant="outlined"
              startIcon={<PersonAddIcon />}
              onClick={handleOpenAddDialog}
            >
              Add Your First Contact
            </Button>
          </Box>
        )}
      </Paper>

      {/* Edit Group Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Group</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Group Name"
            fullWidth
            value={editForm.name}
            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            required
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            rows={3}
            value={editForm.description}
            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
          />
          <TextField
            margin="dense"
            label="Tags (comma-separated)"
            fullWidth
            value={editForm.tags}
            onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
            helperText="Example: vip, customers, leads"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleEditGroup} variant="contained" disabled={!editForm.name}>
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Contacts Dialog */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Add Contacts to Group
          <IconButton
            onClick={() => setAddDialogOpen(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Box mb={2}>
            <TextField
              fullWidth
              placeholder="Search contacts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearchAvailable()}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={handleSearchAvailable} edge="end">
                      <SearchIcon />
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
          </Box>
          
          {loadingContacts ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : availableContacts.length > 0 ? (
            <List>
              {availableContacts.map((contact: Contact) => (
                <ListItem
                  key={contact.id}
                  button
                  onClick={() => toggleContactSelection(contact.id)}
                  selected={selectedContacts.includes(contact.id)}
                >
                  <ListItemAvatar>
                    <Avatar>
                      {contact.firstName?.[0]}{contact.lastName?.[0]}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={`${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'Unnamed'}
                    secondary={contact.phoneNumber || contact.email || 'No contact info'}
                  />
                </ListItem>
              ))}
            </List>
          ) : (
            <Box p={3} textAlign="center">
              <Typography color="text.secondary">
                {searchTerm ? 'No contacts found' : 'No available contacts to add'}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Typography sx={{ flex: 1, ml: 2 }}>
            Selected: {selectedContacts.length}
          </Typography>
          <Button onClick={() => setAddDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleAddContacts}
            variant="contained"
            disabled={selectedContacts.length === 0}
          >
            Add Selected
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Group Confirmation */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Group</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{group.name}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteGroup} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Remove Contact Confirmation */}
      <Dialog open={!!contactToRemove} onClose={() => setContactToRemove(null)}>
        <DialogTitle>Remove Contact</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to remove this contact from the group?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setContactToRemove(null)}>Cancel</Button>
          <Button
            onClick={() => contactToRemove && handleRemoveContact(contactToRemove)}
            color="error"
            variant="contained"
          >
            Remove
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default GroupDetails;