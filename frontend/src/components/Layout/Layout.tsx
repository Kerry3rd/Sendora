import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  AppBar,
  Box,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  Badge,
  Tooltip,
  SwipeableDrawer,
  Fab,
  Zoom,
  BottomNavigation,
  BottomNavigationAction,
  Paper,
  useScrollTrigger,
  Slide,
} from '@mui/material';
import { styled, useTheme } from '@mui/material/styles';
import SpeedIcon from '@mui/icons-material/Speed';
import DescriptionIcon from '@mui/icons-material/Description'; // Add this import
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Send as SendIcon,
  People as PeopleIcon,
  Analytics as AnalyticsIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  Notifications as NotificationsIcon,
  Payment as PaymentIcon,
  History as HistoryIcon,
  Close as CloseIcon,
  Home as HomeIcon,
  Campaign as CampaignIcon,
  Person as PersonIcon,
  ArrowUpward as ArrowUpwardIcon,
} from '@mui/icons-material';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import { logout } from '../../store/slices/authSlice';
import { RootState } from '../../store/store';
import logo from '../../assets/images/SENDORA-logo.png';
import NotificationDropdown from '../Notifications/NotificationDropdown';
import GroupIcon from '@mui/icons-material/Group';
import UserBalance from '../UserBalance/UserBalance';
import { useMobile } from '../../hooks/useMobile';

// SENDORA Color Palette
const colors = {
  navy: '#0B1F3A',
  navyLight: '#1E3A5F',
  teal: '#00C2A8',
  tealLight: '#5DDFCF',
  softTeal: '#E6F7F5',
  slate: '#1A1F2B',
  lightGray: '#F4F6F8',
  white: '#FFFFFF',
  error: '#D32F2F',
  success: '#00C853',
  warning: '#FFAB00',
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
  },
};

// Styled gradient bar
const GradientBar = styled(Box)({
  height: '4px',
  background: `linear-gradient(90deg, ${colors.teal} 0%, ${colors.navy} 100%)`,
});

const drawerWidth = 260;

// Hide on scroll hook
const HideOnScroll = (props: { children: React.ReactElement }) => {
  const { children } = props;
  const trigger = useScrollTrigger({
    target: window,
  });

  return (
    <Slide appear={false} direction="down" in={!trigger}>
      {children}
    </Slide>
  );
};

const Layout: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const { isMobile, isTablet, isDesktop } = useMobile();
  
  const user = useSelector((state: RootState) => state.auth.user);

  // Handle scroll to top button
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    dispatch(logout());
    handleProfileMenuClose();
    navigate('/login');
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Filter menu items based on screen size
  const getVisibleMenuItems = () => {
    const allItems = [
      { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard', showMobile: true },
      { text: 'Campaigns', icon: <SendIcon />, path: '/campaigns', showMobile: true },
      { text: 'Contacts', icon: <PeopleIcon />, path: '/contacts', showMobile: true },
      { text: 'Groups', icon: <GroupIcon />, path: '/groups', showMobile: true },
      { text: 'Templates', icon: <DescriptionIcon />, path: '/templates', showMobile: true }, // ADDED
      { text: 'Analytics', icon: <AnalyticsIcon />, path: '/analytics', showMobile: false },
      { text: 'Billing', icon: <PaymentIcon />, path: '/billing', showMobile: false },
      { text: 'Buy Credits', icon: <AccountBalanceWalletIcon />, path: '/buy-credits', showMobile: false },
      { text: 'Transactions', icon: <HistoryIcon />, path: '/transactions', showMobile: false },
      { text: 'Settings', icon: <SettingsIcon />, path: '/settings', showMobile: false },
      { text: 'Notifications', icon: <NotificationsIcon />, path: '/notifications', showMobile: false },
      { text: 'Usage Limits', icon: <SpeedIcon />, path: '/settings/usage', showMobile: false },
    ];

    if (isMobile) {
      return allItems.filter(item => item.showMobile);
    }
    return allItems;
  };

  const menuItems = getVisibleMenuItems();

  // Bottom navigation items for mobile
  const bottomNavItems = [
    { label: 'Dashboard', icon: <HomeIcon />, path: '/dashboard' },
    { label: 'Campaigns', icon: <CampaignIcon />, path: '/campaigns' },
    { label: 'Contacts', icon: <PeopleIcon />, path: '/contacts' },
    { label: 'Templates', icon: <DescriptionIcon />, path: '/templates' }, // ADDED to bottom nav
    { label: 'More', icon: <MenuIcon />, path: 'more' },
  ];

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <GradientBar />
      <Toolbar sx={{ justifyContent: 'flex-start', py: 2, gap: 1 }}>
        <Box
          component="img"
          src={logo}
          alt="SENDORA"
          sx={{
            height: isMobile ? 40 : 50,
            width: 'auto',
            objectFit: 'contain',
            cursor: 'pointer',
          }}
          onClick={() => {
            navigate('/dashboard');
            setMobileOpen(false);
          }}
        />
        <Typography 
          variant={isMobile ? 'h6' : 'h5'} 
          sx={{ 
            fontWeight: 700, 
            color: colors.navy,
            letterSpacing: '-0.02em',
          }}
        >
          SENDORA
        </Typography>
        {isMobile && (
          <IconButton 
            onClick={() => setMobileOpen(false)} 
            sx={{ ml: 'auto', color: colors.navy }}
          >
            <CloseIcon />
          </IconButton>
        )}
      </Toolbar>
      <Divider sx={{ borderColor: colors.gray[200] }} />
      <List sx={{ px: 2, py: 2, flex: 1, overflowY: 'auto' }}>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding sx={{ mb: 1 }}>
            <ListItemButton
              onClick={() => {
                navigate(item.path);
                setMobileOpen(false);
              }}
              selected={location.pathname === item.path}
              sx={{
                borderRadius: 2,
                py: 1.2,
                minHeight: isMobile ? 48 : 'auto',
                '&:hover': {
                  backgroundColor: colors.softTeal,
                  '& .MuiListItemIcon-root': {
                    color: colors.teal,
                  },
                  '& .MuiListItemText-primary': {
                    color: colors.navy,
                    fontWeight: 600,
                  },
                },
                '&.Mui-selected': {
                  backgroundColor: colors.softTeal,
                  '& .MuiListItemIcon-root': {
                    color: colors.teal,
                  },
                  '& .MuiListItemText-primary': {
                    color: colors.navy,
                    fontWeight: 600,
                  },
                },
              }}
            >
              <ListItemIcon 
                sx={{ 
                  minWidth: 40,
                  color: location.pathname === item.path ? colors.teal : colors.slate,
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText 
                primary={item.text} 
                sx={{
                  '& .MuiListItemText-primary': {
                    color: location.pathname === item.path ? colors.navy : colors.slate,
                    fontWeight: location.pathname === item.path ? 600 : 500,
                  },
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      
      {/* User info at bottom of drawer */}
      <Box sx={{ p: 2, borderTop: `1px solid ${colors.gray[200]}` }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Avatar sx={{ width: 32, height: 32, bgcolor: colors.teal, color: colors.navy }}>
            {user?.firstName?.charAt(0)}
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 'bold', color: colors.navy }}>
              {user?.firstName} {user?.lastName}
            </Typography>
            <Typography variant="caption" sx={{ color: colors.gray[400] }}>
              {user?.email}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', pb: isMobile ? 7 : 0 }}>
      {/* App Bar */}
      <HideOnScroll>
        <AppBar
          position="fixed"
          sx={{
            width: { md: `calc(100% - ${drawerWidth}px)` },
            ml: { md: `${drawerWidth}px` },
            bgcolor: colors.white,
            color: colors.navy,
            boxShadow: 'none',
            borderBottom: `1px solid ${colors.gray[200]}`,
          }}
        >
          <Toolbar sx={{ minHeight: isMobile ? 56 : 64 }}>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ 
                mr: 2, 
                display: { md: 'none' }, 
                color: colors.navy,
                padding: isMobile ? 1.5 : 1,
              }}
            >
              <MenuIcon />
            </IconButton>

            {/* Logo in Header (MOBILE VIEW) */}
            <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', flexGrow: 1 }}>
              <Box
                component="img"
                src={logo}
                alt="SENDORA"
                sx={{
                  height: 40,
                  width: 'auto',
                  objectFit: 'contain',
                }}
              />
              <Typography 
                variant="h6" 
                sx={{ 
                  ml: 1,
                  fontWeight: 700, 
                  color: colors.navy,
                  fontSize: isMobile ? '1.1rem' : '1.25rem',
                }}
              >
                SENDORA
              </Typography>
            </Box>

            <Typography variant="h6" noWrap component="div" sx={{ 
              flexGrow: 1, 
              display: { xs: 'none', md: 'block' }, 
              color: colors.navy 
            }}>
              {menuItems.find(item => item.path === location.pathname)?.text || 'Dashboard'}
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: isMobile ? 1 : 2 }}>
              {/* User Balance Component */}
              <UserBalance />
              
              <NotificationDropdown />

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" sx={{ 
                  display: { xs: 'none', sm: 'block' }, 
                  color: colors.slate 
                }}>
                  {user?.firstName} {user?.lastName}
                </Typography>
                <IconButton 
                  onClick={handleProfileMenuOpen} 
                  size="small"
                  sx={{ padding: isMobile ? 1 : 0.5 }}
                >
                  <Avatar sx={{ 
                    width: isMobile ? 35 : 32, 
                    height: isMobile ? 35 : 32, 
                    bgcolor: colors.teal, 
                    color: colors.navy 
                  }}>
                    {user?.firstName?.charAt(0)}
                  </Avatar>
                </IconButton>
              </Box>
            </Box>

            {/* Profile Menu */}
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleProfileMenuClose}
              onClick={handleProfileMenuClose}
              PaperProps={{
                sx: {
                  mt: 1,
                  boxShadow: '0px 4px 12px rgba(0,0,0,0.1)',
                  width: isMobile ? '90%' : 'auto',
                  maxWidth: isMobile ? 300 : 'none',
                }
              }}
            >
              <MenuItem disabled>
                <Typography variant="body2" sx={{ color: colors.slate }}>
                  Signed in as
                </Typography>
              </MenuItem>
              <MenuItem disabled>
                <Typography variant="body2" fontWeight="bold" sx={{ color: colors.navy }}>
                  {user?.email}
                </Typography>
              </MenuItem>
              <Divider />
              <MenuItem onClick={() => navigate('/billing')}>
                <ListItemIcon>
                  <PaymentIcon fontSize="small" sx={{ color: colors.teal }} />
                </ListItemIcon>
                <ListItemText primary="Billing Overview" sx={{ color: colors.slate }} />
              </MenuItem>
              <MenuItem onClick={() => navigate('/buy-credits')}>
                <ListItemIcon>
                  <AccountBalanceWalletIcon fontSize="small" sx={{ color: colors.teal }} />
                </ListItemIcon>
                <ListItemText primary="Buy Credits" sx={{ color: colors.slate }} />
              </MenuItem>
              <MenuItem onClick={() => navigate('/transactions')}>
                <ListItemIcon>
                  <HistoryIcon fontSize="small" sx={{ color: colors.teal }} />
                </ListItemIcon>
                <ListItemText primary="Transaction History" sx={{ color: colors.slate }} />
              </MenuItem>
              <MenuItem onClick={() => navigate('/settings')}>
                <ListItemIcon>
                  <SettingsIcon fontSize="small" sx={{ color: colors.teal }} />
                </ListItemIcon>
                <ListItemText primary="Settings" sx={{ color: colors.slate }} />
              </MenuItem>
              <MenuItem onClick={handleLogout}>
                <ListItemIcon>
                  <LogoutIcon fontSize="small" sx={{ color: colors.error }} />
                </ListItemIcon>
                <ListItemText primary="Logout" sx={{ color: colors.slate }} />
              </MenuItem>
            </Menu>
          </Toolbar>
        </AppBar>
      </HideOnScroll>

      {/* Navigation Drawer */}
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        {/* Mobile Drawer */}
        <SwipeableDrawer
          variant="temporary"
          open={mobileOpen}
          onOpen={() => setMobileOpen(true)}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth,
              borderTopRightRadius: 20,
              borderBottomRightRadius: 20,
            },
          }}
          disableBackdropTransition={true}
          disableDiscovery={true}
        >
          {drawer}
        </SwipeableDrawer>

        {/* Desktop Drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth, 
              borderRight: `1px solid ${colors.gray[200]}`,
              overflowX: 'hidden',
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: isMobile ? 2 : 3,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100vh',
          bgcolor: colors.lightGray,
          overflowX: 'hidden',
        }}
      >
        <Toolbar sx={{ minHeight: isMobile ? 56 : 64 }} />
        <Outlet />
      </Box>

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <Paper
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 1100,
            borderTop: `1px solid ${colors.gray[200]}`,
          }}
          elevation={3}
        >
          <BottomNavigation
            showLabels
            value={bottomNavItems.findIndex(item => item.path === location.pathname)}
            onChange={(event, newValue) => {
              if (newValue === 4) {
                // More button opens drawer
                setMobileOpen(true);
              } else {
                navigate(bottomNavItems[newValue].path);
              }
            }}
            sx={{
              height: 56,
              '& .MuiBottomNavigationAction-root': {
                color: colors.gray[400],
                minWidth: 'auto',
                padding: '6px 0',
                '&.Mui-selected': {
                  color: colors.teal,
                },
              },
            }}
          >
            {bottomNavItems.map((item) => (
              <BottomNavigationAction
                key={item.label}
                label={item.label}
                icon={item.icon}
                sx={{
                  '& .MuiBottomNavigationAction-label': {
                    fontSize: '0.7rem',
                    '&.Mui-selected': {
                      fontSize: '0.7rem',
                    },
                  },
                }}
              />
            ))}
          </BottomNavigation>
        </Paper>
      )}

      {/* Scroll to Top Button */}
      <Zoom in={showScrollTop}>
        <Fab
          color="primary"
          size="small"
          onClick={scrollToTop}
          sx={{
            position: 'fixed',
            bottom: isMobile ? 70 : 16,
            right: 16,
            bgcolor: colors.teal,
            color: colors.white,
            '&:hover': {
              bgcolor: colors.tealLight,
            },
          }}
        >
          <ArrowUpwardIcon />
        </Fab>
      </Zoom>
    </Box>
  );
};

export default Layout;