import { createTheme } from '@mui/material/styles';

// SENDORA Official Color Palette
export const colors = {
  // Primary Brand Colors
  navy: {
    main: '#0B1F3A',      // Deep Navy - Main brand color
    light: '#1E3A5F',
    dark: '#051220',
    contrastText: '#FFFFFF',
  },
  teal: {
    main: '#00C2A8',       // Electric Teal - Signature accent
    light: '#5DDFCF',
    dark: '#009688',
    contrastText: '#0B1F3A',
  },
  
  // Secondary Colors
  softTeal: '#E6F7F5',      // Background sections, cards
  slate: '#1A1F2B',         // Secondary text, icons
  lightGray: '#F4F6F8',     // Main background
  
  // Accent (use sparingly)
  orange: '#FF7A00',        // Alerts, important highlights
  
  // System Colors
  success: '#00C853',
  warning: '#FFAB00',
  error: '#D32F2F',
  info: '#2196F3',
  
  // Neutrals
  white: '#FFFFFF',
  black: '#000000',
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },
};

// Create MUI theme
const theme = createTheme({
  palette: {
    primary: {
      main: colors.navy.main,
      light: colors.navy.light,
      dark: colors.navy.dark,
      contrastText: colors.navy.contrastText,
    },
    secondary: {
      main: colors.teal.main,
      light: colors.teal.light,
      dark: colors.teal.dark,
      contrastText: colors.teal.contrastText,
    },
    success: {
      main: colors.success,
    },
    warning: {
      main: colors.warning,
    },
    error: {
      main: colors.error,
    },
    info: {
      main: colors.info,
    },
    background: {
      default: colors.lightGray,
      paper: colors.white,
    },
    text: {
      primary: colors.navy.dark,
      secondary: colors.slate,
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
      color: colors.navy.main,
    },
    h2: {
      fontWeight: 600,
      color: colors.navy.main,
    },
    h3: {
      fontWeight: 600,
      color: colors.navy.main,
    },
    h4: {
      fontWeight: 600,
      color: colors.navy.main,
    },
    h5: {
      fontWeight: 500,
      color: colors.navy.main,
    },
    h6: {
      fontWeight: 500,
      color: colors.navy.main,
    },
    body1: {
      color: colors.slate,
    },
    body2: {
      color: colors.slate,
    },
    button: {
      textTransform: 'none',
      fontWeight: 500,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '8px 16px',
          fontWeight: 500,
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0px 4px 8px rgba(0, 194, 168, 0.2)',
          },
        },
        containedPrimary: {
          backgroundColor: colors.navy.main,
          color: colors.white,
          '&:hover': {
            backgroundColor: colors.navy.light,
          },
        },
        containedSecondary: {
          backgroundColor: colors.teal.main,
          color: colors.navy.main,
          '&:hover': {
            backgroundColor: colors.teal.light,
          },
        },
        outlined: {
          borderColor: colors.teal.main,
          color: colors.teal.main,
          '&:hover': {
            backgroundColor: colors.softTeal,
            borderColor: colors.teal.dark,
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: colors.navy.main,
          color: colors.white,
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: colors.white,
          borderRight: `1px solid ${colors.gray[200]}`,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.05)',
          border: `1px solid ${colors.gray[200]}`,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
        elevation1: {
          boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.05)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
        },
        colorSuccess: {
          backgroundColor: colors.success,
          color: colors.white,
        },
        colorWarning: {
          backgroundColor: colors.warning,
          color: colors.navy.dark,
        },
        colorError: {
          backgroundColor: colors.error,
          color: colors.white,
        },
        colorInfo: {
          backgroundColor: colors.teal.main,
          color: colors.navy.main,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          backgroundColor: colors.softTeal,
          color: colors.navy.main,
          fontWeight: 600,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          '&.Mui-selected': {
            color: colors.teal.main,
          },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          backgroundColor: colors.teal.main,
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        standardSuccess: {
          backgroundColor: colors.success,
          color: colors.white,
        },
        standardWarning: {
          backgroundColor: colors.warning,
          color: colors.navy.dark,
        },
        standardError: {
          backgroundColor: colors.error,
          color: colors.white,
        },
        standardInfo: {
          backgroundColor: colors.teal.main,
          color: colors.navy.main,
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 4,
        },
        barColorPrimary: {
          backgroundColor: colors.teal.main,
        },
      },
    },
  },
});

export default theme;
