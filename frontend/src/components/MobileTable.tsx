import React from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Card,
  CardContent,
  Typography,
  Chip,
  IconButton,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { useMobile } from '../hooks/useMobile';

interface Column {
  id: string;
  label: string;
  minWidth?: number;
  align?: 'right' | 'left' | 'center';
  format?: (value: any) => React.ReactNode;      // Simple formatter for the value
  render?: (row: any) => React.ReactNode;        // Custom render function that gets the whole row
  mobile?: boolean; // Show on mobile?
  tablet?: boolean; // Show on tablet?
}

interface MobileTableProps {
  columns: Column[];
  data: any[];
  renderMobileCard?: (item: any) => React.ReactNode;
  onRowClick?: (item: any) => void;
}

export const MobileTable: React.FC<MobileTableProps> = ({
  columns,
  data,
  renderMobileCard,
  onRowClick,
}) => {
  const { isMobile, isTablet } = useMobile();
  const theme = useTheme();

  // Filter columns based on screen size
  const visibleColumns = columns.filter(col => {
    if (isMobile) return col.mobile !== false;
    if (isTablet) return col.tablet !== false;
    return true;
  });

  // Mobile card view
  if (isMobile && renderMobileCard) {
    return (
      <Box sx={{ p: 1 }}>
        {data.map((item, index) => (
          <Card
            key={index}
            sx={{
              mb: 2,
              cursor: onRowClick ? 'pointer' : 'default',
              '&:hover': onRowClick ? {
                bgcolor: 'action.hover',
                transform: 'scale(1.02)',
                transition: 'all 0.2s',
              } : {},
            }}
            onClick={() => onRowClick?.(item)}
          >
            {renderMobileCard(item)}
          </Card>
        ))}
      </Box>
    );
  }

  // Tablet/Desktop table view
  return (
    <TableContainer 
      component={Paper} 
      sx={{ 
        overflowX: 'auto',
        maxWidth: '100%',
        '&::-webkit-scrollbar': {
          height: 8,
        },
        '&::-webkit-scrollbar-track': {
          bgcolor: 'grey.100',
          borderRadius: 4,
        },
        '&::-webkit-scrollbar-thumb': {
          bgcolor: 'grey.400',
          borderRadius: 4,
          '&:hover': {
            bgcolor: 'grey.600',
          },
        },
      }}
    >
      <Table stickyHeader>
        <TableHead>
          <TableRow>
            {visibleColumns.map((column) => (
              <TableCell
                key={column.id}
                align={column.align}
                style={{ minWidth: column.minWidth }}
                sx={{
                  fontWeight: 'bold',
                  bgcolor: 'primary.main',
                  color: 'white',
                  '& .MuiTableSortLabel-icon': {
                    color: 'white !important',
                  },
                }}
              >
                {column.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((row, rowIndex) => (
            <TableRow
              hover
              key={rowIndex}
              onClick={() => onRowClick?.(row)}
              sx={{
                cursor: onRowClick ? 'pointer' : 'default',
                '&:last-child td, &:last-child th': { border: 0 },
                transition: 'background-color 0.2s',
              }}
            >
              {visibleColumns.map((column) => {
                const value = row[column.id];
                
                // FIXED: Support both format and render functions
                // render gets the whole row, format gets just the value
                return (
                  <TableCell key={column.id} align={column.align}>
                    {column.render 
                      ? column.render(row)      // Custom render with full row access
                      : column.format 
                        ? column.format(value)  // Simple formatter for the value
                        : value}                 
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};