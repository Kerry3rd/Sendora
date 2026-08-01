import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  IconButton,
  Badge,
  Avatar,
  Tooltip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Notifications as NotificationsIcon,
  AccountCircle,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import UserBalance from '../UserBalance/UserBalance';
import NotificationDropdown from '../Notifications/NotificationDropdown';
import { colors } from '../../theme/colors';

interface HeaderProps {
  onMenuClick: () => void;
  onProfileMenuOpen: (event: React.MouseEvent<HTMLElement>) => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick, onProfileMenuOpen }) => {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);

  return (
    <AppBar
      position="fixed"
      sx={{
        bgcolor: colors.white,
        color: colors.navy,
        boxShadow: 'none',
        borderBottom: `1px solid ${colors.gray[200]}`,
      }}
    >
      <Toolbar>
        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={onMenuClick}
          sx={{ mr: 2, display: { md: 'none' }, color: colors.navy }}
        >
          <MenuIcon />
        </IconButton>

        {/* Logo in Header (MOBILE VIEW) */}
        <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', flexGrow: 1 }}>
          <Box
            component="img"
            src="/logo.png"
            alt="SENDORA"
            sx={{
              height: 40,
              width: 'auto',
              objectFit: 'contain',
              cursor: 'pointer',
            }}
            onClick={() => navigate('/dashboard')}
          />
          <Typography 
            variant="h6" 
            sx={{ 
              ml: 1,
              fontWeight: 700, 
              color: colors.navy,
            }}
          >
            SENDORA
          </Typography>
        </Box>

        <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, display: { xs: 'none', md: 'block' }, color: colors.navy }}>
          {/* Page title will be set by parent */}
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <UserBalance />
          <NotificationDropdown />
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 1 }}>
            <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' }, color: colors.slate }}>
              {user?.firstName} {user?.lastName}
            </Typography>
            <Tooltip title="Account settings">
              <IconButton onClick={onProfileMenuOpen} size="small">
                <Avatar sx={{ width: 32, height: 32, bgcolor: colors.teal, color: colors.navy }}>
                  {user?.firstName?.charAt(0)}
                </Avatar>
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;