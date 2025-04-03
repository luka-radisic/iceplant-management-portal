import React from 'react';
import { Chip, ChipProps } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import ErrorIcon from '@mui/icons-material/Error';
import HelpIcon from '@mui/icons-material/Help';

type StatusType = 'processed' | 'canceled' | 'error' | string;

interface StatusChipProps {
  status: StatusType;
  size?: ChipProps['size'];
  className?: string;
}

/**
 * A reusable component for displaying status indicators using MUI Chip
 * 
 * @param {StatusChipProps} props - Component props
 * @returns {JSX.Element} Status chip with appropriate styling
 */
const StatusChip: React.FC<StatusChipProps> = ({ status, size = 'small', className }) => {
  let color: ChipProps['color'] = 'default';
  let icon = null;
  
  // Standardize the status to handle various formats
  const normalizedStatus = status.toLowerCase();
  
  switch(normalizedStatus) {
    case 'processed':
    case 'completed':
    case 'success':
      color = 'success';
      icon = <CheckCircleIcon fontSize="small" />;
      break;
    case 'canceled':
    case 'cancelled':
    case 'warning':
      color = 'warning';
      icon = <CancelIcon fontSize="small" />;
      break;
    case 'error':
    case 'failed':
      color = 'error';
      icon = <ErrorIcon fontSize="small" />;
      break;
    default:
      color = 'default';
      icon = <HelpIcon fontSize="small" />;
  }

  // Format the label with proper capitalization
  const label = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  
  return (
    <Chip 
      size={size}
      label={label}
      color={color}
      icon={icon as any}
      className={className}
    />
  );
};

export default StatusChip; 