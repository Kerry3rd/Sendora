import React, { useState } from 'react';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Typography,
  SwipeableDrawer,
  Badge,
  Avatar,
  Divider,
  Button
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Send as SendIcon,
  People as PeopleIcon,
  Analytics as AnalyticsIcon,
  Settings as SettingsIcon,
  Payment as PaymentIcon,
  History as HistoryIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useMobile } from '../../hooks/useMobile';
import { colors } from '../../theme/colors';

interface MobileNavProps {
  menuItems: Array<{
    text: string;
    icon: React.ReactNode;
    path: string;
    badge?: number;
  }>;
  user: any;
  onLogout: () => void;
}

const DRAWER_WIDTH = 280;

export const MobileNav: React.FC<MobileNavProps> = ({
  menuItems,
  user,
  onLogout,
}) => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { isMobile } = useMobile();

  const handleNavigation = (path: string) => {
    navigate(path);
    setOpen(false);
  };

  if (!isMobile) return null;

  return (
    <>
      {/* Mobile Header */}
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 1100,
          bgcolor: colors.white,
          borderBottom: `1px solid ${colors.gray[200]}`,
          px: 2,
          py: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <IconButton
          onClick={() => setOpen(true)}
          sx={{ color: colors.navy }}
          size="large"
          edge="start"
        >
          <MenuIcon />
        </IconButton>
        
        <Typography variant="h6" sx={{ color: colors.navy, fontWeight: 'bold' }}>
          SENDORA
        </Typography>
        
        <IconButton
          onClick={() => navigate('/notifications')}
          size="large"
          edge="end"
        >
          <Badge badgeContent={3} color="error">
            <Avatar sx={{ width: 32, height: 32, bgcolor: colors.teal }}>
              {user?.firstName?.charAt(0)}
            </Avatar>
          </Badge>
        </IconButton>
      </Box>

      {/* Mobile Drawer */}
      <SwipeableDrawer
        anchor="left"
        open={open}
        onClose={() => setOpen(false)}
        onOpen={() => setOpen(true)}
        swipeAreaWidth={30}
        disableBackdropTransition={false}
        PaperProps={{
          sx: {
            width: DRAWER_WIDTH,
            bgcolor: colors.white,
          },
        }}
      >
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ color: colors.navy, fontWeight: 'bold' }}>
            Menu
          </Typography>
          <IconButton onClick={() => setOpen(false)}>
            <CloseIcon />
          </IconButton>
        </Box>

        <Divider />

        <List sx={{ pt: 2 }}>
          {menuItems.map((item) => (
            <ListItem key={item.text} disablePadding sx={{ mb: 1 }}>
              <ListItemButton
                onClick={() => handleNavigation(item.path)}
                sx={{
                  borderRadius: 2,
                  mx: 1,
                  py: 1.5,
                  '&:active': {
                    bgcolor: colors.softTeal,
                  },
                }}
              >
                <ListItemIcon sx={{ color: colors.teal, minWidth: 40 }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.text}
                  primaryTypographyProps={{
                    fontSize: '1rem',
                    fontWeight: 500,
                  }}
                />
                {item.badge && (
                  <Badge badgeContent={item.badge} color="error" />
                )}
              </ListItemButton>
            </ListItem>
          ))}
        </List>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ p: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Logged in as
          </Typography>
          <Typography variant="body1" fontWeight="bold" sx={{ color: colors.navy }}>
            {user?.firstName} {user?.lastName}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
            {user?.email}
          </Typography>
          <Button
            fullWidth
            variant="outlined"
            onClick={onLogout}
            sx={{
              borderColor: colors.error,
              color: colors.error,
              '&:active': {
                bgcolor: colors.error + '20',
              },
            }}
          >
            Logout
          </Button>
        </Box>
      </SwipeableDrawer>
    </>
  );
};