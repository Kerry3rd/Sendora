import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import { Refresh as RefreshIcon, ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

interface ErrorFallbackProps {
  error?: Error;
  resetError?: () => void;
  message?: string;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  resetError,
  message = 'Something went wrong loading this component.',
}) => {
  const navigate = useNavigate();

  return (
    <Paper
      sx={{
        p: 4,
        textAlign: 'center',
        bgcolor: 'grey.50',
        border: '1px solid',
        borderColor: 'error.light',
        borderRadius: 2,
      }}
    >
      <Typography variant="h6" color="error" gutterBottom>
        ⚠️ Error
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        {message}
      </Typography>
      {error && process.env.NODE_ENV === 'development' && (
        <Typography
          variant="caption"
          component="pre"
          sx={{
            p: 2,
            bgcolor: 'grey.900',
            color: 'grey.100',
            borderRadius: 1,
            textAlign: 'left',
            overflowX: 'auto',
            mb: 2,
          }}
        >
          {error.message}
        </Typography>
      )}
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
        <Button
          variant="outlined"
          size="small"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(-1)}
        >
          Go Back
        </Button>
        <Button
          variant="contained"
          size="small"
          startIcon={<RefreshIcon />}
          onClick={resetError || (() => window.location.reload())}
        >
          Try Again
        </Button>
      </Box>
    </Paper>
  );
};

export default ErrorFallback;