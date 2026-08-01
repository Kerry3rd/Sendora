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
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Alert,
  Snackbar,
  Pagination,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  People as PeopleIcon,
  Group as GroupIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import groupService from '../../services/group';
import { format } from 'date-fns';
import { Contact } from '../../services/contact';


interface Group {
  id: string;
  name: string;
  description: string | null;
  contactsCount: number;
  tags: string[];
  createdAt: string;
  contacts: Contact[];
}

const GroupsPage: React.FC = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '', tags: '' });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  
  const navigate = useNavigate();

  useEffect(() => {
    fetchGroups();
  }, [page, searchTerm]);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const response = await groupService.getGroups({
        page,
        limit: 20,
        search: searchTerm || undefined,
      });

      console.log('📥 Groups response:', response); // Debug log
      setGroups(response.groups || []);
      
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error.message || 'Failed to fetch groups',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async () => {
    try {
      const tags = formData.tags.split(',').map(t => t.trim()).filter(t => t);
      await groupService.createGroup({
        name: formData.name,
        description: formData.description || undefined,
        tags,
      });
      setSnackbar({ open: true, message: 'Group created successfully', severity: 'success' });
      setDialogOpen(false);
      setFormData({ name: '', description: '', tags: '' });
      fetchGroups();
    } catch (error: any) {
      setSnackbar({ open: true, message: error.message || 'Failed to create group', severity: 'error' });
    }
  };

  const handleUpdateGroup = async () => {
    if (!editingGroup) return;
    try {
      const tags = formData.tags.split(',').map(t => t.trim()).filter(t => t);
      await groupService.updateGroup(editingGroup.id, {
        name: formData.name,
        description: formData.description || undefined,
        tags,
      });
      setSnackbar({ open: true, message: 'Group updated successfully', severity: 'success' });
      setDialogOpen(false);
      setEditingGroup(null);
      setFormData({ name: '', description: '', tags: '' });
      fetchGroups();
    } catch (error: any) {
      setSnackbar({ open: true, message: error.message || 'Failed to update group', severity: 'error' });
    }
  };

  const handleDeleteGroup = async () => {
    if (!selectedGroup) return;
    try {
      await groupService.deleteGroup(selectedGroup.id);
      setSnackbar({ open: true, message: 'Group deleted successfully', severity: 'success' });
      fetchGroups();
    } catch (error: any) {
      setSnackbar({ open: true, message: error.message || 'Failed to delete group', severity: 'error' });
    } finally {
      setAnchorEl(null);
      setSelectedGroup(null);
    }
  };

  const openCreateDialog = () => {
    setEditingGroup(null);
    setFormData({ name: '', description: '', tags: '' });
    setDialogOpen(true);
  };

  const openEditDialog = (group: Group) => {
    setEditingGroup(group);
    setFormData({
      name: group.name,
      description: group.description || '',
      tags: group.tags.join(', '),
    });
    setDialogOpen(true);
    setAnchorEl(null);
  };

  // Handle row click to navigate to group details
  const handleRowClick = (groupId: string) => {
    navigate(`/groups/${groupId}`);
  };

  // Handle action menu click (prevent row click)
  const handleActionClick = (e: React.MouseEvent<HTMLButtonElement>, group: Group) => {
    e.stopPropagation(); // Prevent row click from triggering
    setSelectedGroup(group);
    setAnchorEl(e.currentTarget);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" fontWeight="bold">
          Contact Groups
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={openCreateDialog}
        >
          Create Group
        </Button>
      </Box>

      {/* Search Bar */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search groups by name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          size="small"
        />
      </Paper>

      {loading ? (
        <LinearProgress />
      ) : (
        <>
          <Paper>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Group Name</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Contacts</TableCell>
                    <TableCell>Tags</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {groups.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                        <GroupIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                        <Typography color="text.secondary" gutterBottom>
                          No groups found
                        </Typography>
                        <Button
                          variant="outlined"
                          startIcon={<AddIcon />}
                          onClick={openCreateDialog}
                          sx={{ mt: 2 }}
                        >
                          Create Your First Group
                        </Button>
                      </TableCell>
                    </TableRow>
                  ) : (
                    groups.map((group) => (
                      <TableRow 
                        key={group.id} 
                        hover
                        onClick={() => handleRowClick(group.id)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {group.name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 200 }}>
                            {group.description || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            icon={<PeopleIcon />}
                            label={group.contactsCount}
                            size="small"
                            color={group.contacts?.length || 0 ? 'primary' : 'default'}
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                            {group.tags.map((tag) => (
                              <Chip key={tag} label={tag} size="small" variant="outlined" />
                            ))}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {format(new Date(group.createdAt), 'MMM dd, yyyy')}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <IconButton
                            size="small"
                            onClick={(e) => handleActionClick(e, group)}
                          >
                            <MoreVertIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(e, value) => setPage(value)}
                color="primary"
              />
            </Box>
          )}
        </>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingGroup ? 'Edit Group' : 'Create New Group'}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="Group Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
            <TextField
              fullWidth
              label="Tags"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              helperText="Comma-separated tags (e.g., VIP, Customers, Leads)"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={editingGroup ? handleUpdateGroup : handleCreateGroup}
            variant="contained"
            disabled={!formData.name}
          >
            {editingGroup ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem onClick={() => selectedGroup && navigate(`/groups/${selectedGroup.id}`)}>
          <ListItemIcon><PeopleIcon fontSize="small" /></ListItemIcon>
          <ListItemText>View Contacts</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => selectedGroup && openEditDialog(selectedGroup)}>
          <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDeleteGroup} sx={{ color: 'error.main' }}>
          <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default GroupsPage;