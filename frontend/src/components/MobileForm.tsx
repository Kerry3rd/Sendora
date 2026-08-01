import React from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  useTheme,
  useMediaQuery,
  Zoom,
  Paper,
} from '@mui/material';
import { useMobile } from '../hooks/useMobile';

interface MobileFormProps {
  title?: string;
  fields: Array<{
    name: string;
    label: string;
    type?: string;
    required?: boolean;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    error?: string;
    multiline?: boolean;
    rows?: number;
  }>;
  onSubmit: (e: React.FormEvent) => void;
  submitLabel: string;
  loading?: boolean;
}

export const MobileForm: React.FC<MobileFormProps> = ({
  title,
  fields,
  onSubmit,
  submitLabel,
  loading,
}) => {
  const { isMobile } = useMobile();
  const theme = useTheme();

  return (
    <Zoom in={true}>
      <Paper
        elevation={isMobile ? 0 : 3}
        sx={{
          p: isMobile ? 2 : 4,
          maxWidth: isMobile ? '100%' : 600,
          mx: 'auto',
          borderRadius: isMobile ? 0 : 2,
        }}
      >
        {title && (
          <Typography
            variant={isMobile ? 'h6' : 'h5'}
            gutterBottom
            align="center"
            sx={{ fontWeight: 'bold', mb: 3 }}
          >
            {title}
          </Typography>
        )}

        <Box
          component="form"
          onSubmit={onSubmit}
          sx={{
            '& .MuiTextField-root': {
              mb: isMobile ? 2.5 : 3,
            },
          }}
        >
          {fields.map((field) => (
            <TextField
              key={field.name}
              fullWidth
              label={field.label}
              type={field.type || 'text'}
              value={field.value}
              onChange={field.onChange}
              error={!!field.error}
              helperText={field.error}
              required={field.required}
              multiline={field.multiline}
              rows={field.rows}
              disabled={loading}
              size={isMobile ? 'small' : 'medium'}
              inputProps={{
                style: {
                  fontSize: isMobile ? '16px' : 'inherit', // Prevent zoom on iOS
                },
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: isMobile ? 2 : 1,
                },
              }}
            />
          ))}

          <Button
            type="submit"
            fullWidth
            variant="contained"
            size={isMobile ? 'large' : 'medium'}
            disabled={loading}
            sx={{
              mt: isMobile ? 3 : 4,
              py: isMobile ? 1.5 : 1,
              fontSize: isMobile ? '1rem' : '0.875rem',
              borderRadius: isMobile ? 2 : 1,
              touchAction: 'manipulation', // Improve touch response
            }}
          >
            {loading ? 'Loading...' : submitLabel}
          </Button>
        </Box>
      </Paper>
    </Zoom>
  );
};