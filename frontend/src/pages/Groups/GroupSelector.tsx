import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Checkbox,
  Chip,
  TextField,
  InputAdornment,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Avatar,
} from '@mui/material';
import {
  Group as GroupIcon,
  Search as SearchIcon,
  People as PeopleIcon,
} from '@mui/icons-material';
import api from '../../services/api';

interface Group {
  id: string;
  name: string;
  description: string;
  contactsCount: number;
  tags: string[];
}

interface GroupSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (groups: Group[]) => void;
  selectedGroups?: Group[];
}

const GroupSelector: React.FC<GroupSelectorProps> = ({
  open,
  onClose,
  onSelect,
  selectedGroups = [],
}) => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selected, setSelected] = useState<Set<string>>(
    new Set(selectedGroups.map(g => g.id))
  );

  useEffect(() => {
    if (open) {
      fetchGroups();
    }
  }, [open]);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const response = await api.get('/contacts/groups');
      setGroups(response.data.data);
    } catch (error) {
      console.error('Failed to fetch groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (groupId: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(groupId)) {
      newSelected.delete(groupId);
    } else {
      newSelected.add(groupId);
    }
    setSelected(newSelected);
  };

  const handleSelectAll = () => {
    if (selected.size === filteredGroups.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredGroups.map(g => g.id)));
    }
  };

  const handleConfirm = () => {
    const selectedGroupsList = groups.filter(g => selected.has(g.id));
    onSelect(selectedGroupsList);
    onClose();
  };

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Select Contact Groups</Typography>
          <Chip
            label={`${selected.size} selected`}
            color="primary"
            size="small"
          />
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <TextField
          fullWidth
          size="small"
          placeholder="Search groups..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 2 }}
        />

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : filteredGroups.length === 0 ? (
          <Alert severity="info">No groups found</Alert>
        ) : (
          <>
            <ListItem disablePadding>
              <ListItemButton onClick={handleSelectAll}>
                <ListItemIcon>
                  <Checkbox
                    edge="start"
                    checked={selected.size === filteredGroups.length && filteredGroups.length > 0}
                    indeterminate={selected.size > 0 && selected.size < filteredGroups.length}
                  />
                </ListItemIcon>
                <ListItemText primary="Select All" />
              </ListItemButton>
            </ListItem>

            <List>
              {filteredGroups.map((group) => (
                <ListItem
                  key={group.id}
                  disablePadding
                  secondaryAction={
                    <Chip
                      icon={<PeopleIcon />}
                      label={group.contactsCount}
                      size="small"
                      variant="outlined"
                    />
                  }
                >
                  <ListItemButton
                    onClick={() => handleToggle(group.id)}
                    selected={selected.has(group.id)}
                  >
                    <ListItemIcon>
                      <Checkbox
                        edge="start"
                        checked={selected.has(group.id)}
                      />
                    </ListItemIcon>
                    <Avatar
                      sx={{
                        width: 32,
                        height: 32,
                        bgcolor: '#00C2A8',
                        mr: 1,
                      }}
                    >
                      <GroupIcon sx={{ fontSize: 18 }} />
                    </Avatar>
                    <ListItemText
                      primary={group.name}
                      secondary={
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            {group.description || 'No description'}
                          </Typography>
                          {group.tags.length > 0 && (
                            <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                              {group.tags.slice(0, 2).map(tag => (
                                <Chip
                                  key={tag}
                                  label={tag}
                                  size="small"
                                  variant="outlined"
                                  sx={{ height: 20 }}
                                />
                              ))}
                              {group.tags.length > 2 && (
                                <Chip
                                  label={`+${group.tags.length - 2}`}
                                  size="small"
                                  variant="outlined"
                                  sx={{ height: 20 }}
                                />
                              )}
                            </Box>
                          )}
                        </Box>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={selected.size === 0}
        >
          Add {selected.size} Group{selected.size !== 1 ? 's' : ''}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default GroupSelector;
