import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  InputAdornment,
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Chip,
  Avatar,
  Paper,
  LinearProgress,
  Pagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  ListItemText,
} from '@mui/material';
import {
  Search as SearchIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import contactService, { Contact } from '../services/contact';

interface ContactSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (contacts: Contact[]) => void;
  selectedContacts?: Contact[];
}

const ContactSelector: React.FC<ContactSelectorProps> = ({
  open,
  onClose,
  onSelect,
  selectedContacts = [],
}) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(
    new Set(selectedContacts.map(c => c.id))
  );
  const [showOnlySubscribed, setShowOnlySubscribed] = useState(true);

  const fetchContacts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await contactService.getContacts({
        page,
        limit: 10,
        search: searchTerm || undefined,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
        subscribed: showOnlySubscribed ? true : undefined,
        blacklisted: false,
      });
      
      if (response.success) {
        setContacts(response.data.contacts);
        setTotalPages(response.data.pagination.pages);
      }
    } catch (error) {
      console.error('Failed to fetch contacts:', error);
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, selectedTags, showOnlySubscribed]);

  const fetchTags = useCallback(async () => {
    try {
      const response = await contactService.getContacts({ limit: 1000 });
      if (response.success) {
        const tags = new Set<string>();
        response.data.contacts.forEach((contact: Contact) => {
          contact.tags.forEach(tag => tags.add(tag));
        });
        setAvailableTags(Array.from(tags).sort());
      }
    } catch (error) {
      console.error('Failed to fetch tags:', error);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchContacts();
      fetchTags();
    }
  }, [open, fetchContacts, fetchTags]);

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelected(new Set(contacts.map(c => c.id)));
    } else {
      setSelected(new Set());
    }
  };

  const handleSelectOne = (id: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelected(newSelected);
  };

  const handleConfirm = () => {
    const selectedContactsList = contacts.filter(c => selected.has(c.id));
    onSelect(selectedContactsList);
    onClose();
  };

  const handleClear = () => {
    setSelected(new Set());
    setSearchTerm('');
    setSelectedTags([]);
    setPage(1);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Select Contacts</Typography>
          <Chip 
            label={`${selected.size} selected`} 
            color="primary" 
            size="small"
          />
        </Box>
      </DialogTitle>
      
      <DialogContent dividers>
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search by name, phone, or email..."
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
          
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Filter by Tags</InputLabel>
            <Select
              multiple
              value={selectedTags}
              onChange={(e) => setSelectedTags(e.target.value as string[])}
              input={<OutlinedInput label="Filter by Tags" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {(selected as string[]).map((value) => (
                    <Chip key={value} label={value} size="small" />
                  ))}
                </Box>
              )}
            >
              {availableTags.map((tag) => (
                <MenuItem key={tag} value={tag}>
                  <Checkbox checked={selectedTags.indexOf(tag) > -1} />
                  <ListItemText primary={tag} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={showOnlySubscribed ? 'subscribed' : 'all'}
              onChange={(e) => setShowOnlySubscribed(e.target.value === 'subscribed')}
              label="Status"
            >
              <MenuItem value="subscribed">Subscribed Only</MenuItem>
              <MenuItem value="all">All Contacts</MenuItem>
            </Select>
          </FormControl>
          
          <Button variant="outlined" onClick={handleClear}>
            Clear
          </Button>
        </Box>

        {loading ? (
          <LinearProgress />
        ) : (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={selected.size > 0 && selected.size < contacts.length}
                      checked={contacts.length > 0 && selected.size === contacts.length}
                      onChange={handleSelectAll}
                    />
                  </TableCell>
                  <TableCell>Contact</TableCell>
                  <TableCell>Phone</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Tags</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {contacts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                      <Typography color="text.secondary">
                        No contacts found
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  contacts.map((contact) => (
                    <TableRow
                      key={contact.id}
                      hover
                      selected={selected.has(contact.id)}
                      sx={{ cursor: 'pointer' }}
                      onClick={() => handleSelectOne(contact.id)}
                    >
                      <TableCell padding="checkbox">
                        <Checkbox checked={selected.has(contact.id)} />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.light' }}>
                            {contact.firstName?.charAt(0)}{contact.lastName?.charAt(0)}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {contact.firstName} {contact.lastName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {contact.company || 'No company'}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {contact.phoneNumber}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {contact.email || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {contact.tags.slice(0, 2).map((tag) => (
                            <Chip key={tag} label={tag} size="small" variant="outlined" />
                          ))}
                          {contact.tags.length > 2 && (
                            <Chip label={`+${contact.tags.length - 2}`} size="small" />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        {contact.isSubscribed ? (
                          <Chip
                            icon={<CheckCircleIcon />}
                            label="Subscribed"
                            size="small"
                            color="success"
                            variant="outlined"
                          />
                        ) : (
                          <Chip
                            icon={<CancelIcon />}
                            label="Unsubscribed"
                            size="small"
                            color="default"
                            variant="outlined"
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(e, value) => setPage(value)}
              color="primary"
            />
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={selected.size === 0}
        >
          Add {selected.size} Contact{selected.size !== 1 ? 's' : ''}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ContactSelector;
