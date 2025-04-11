import React from 'react';
import { Button } from '@mui/material';
import apiService from '../services/api';

/**
 * Props for HRApprovalButtons
 * - id: record ID
 * - currentStatus: current approval status
 * - onStatusChange: callback(newStatus: string, reason?: string) => void
 * - endpoint: API endpoint for PATCH (e.g., '/api/attendance/attendance/')
 * - requireReason: if true, prompt for reason when rejecting or changing from approved
 * - disabled: if true, disables the buttons
 * - showApprove: if false, hides the Approve button
 * - showReject: if false, hides the Reject button
 */
interface HRApprovalButtonsProps {
  id: number;
  currentStatus: string;
  onStatusChange: (newStatus: string, reason?: string) => void;
  endpoint?: string;
  requireReason?: boolean;
  disabled?: boolean;
  showApprove?: boolean;
  showReject?: boolean;
}

const HRApprovalButtons: React.FC<HRApprovalButtonsProps> = ({
  id,
  currentStatus,
  onStatusChange,
  endpoint = '/api/attendance/attendance/',
  requireReason = true,
  disabled = false,
  showApprove = true,
  showReject = true,
}) => {
  const handleUpdate = async (newStatus: string) => {
    let reason = '';
    const changingFromApproved = currentStatus === 'approved' && newStatus !== 'approved';
    const isRejecting = newStatus === 'rejected';

    if (requireReason && (changingFromApproved || isRejecting)) {
      reason = window.prompt(`Please enter a reason for changing status to ${newStatus}:`) || '';
      if (!reason.trim()) {
        return; // cancel if no reason
      }
    }

    const payload: any = { approval_status: newStatus };
    if (reason.trim()) {
      payload.hr_notes = reason;
    }

    try {
      await apiService.patch(`${endpoint}${id}/`, payload);
      onStatusChange(newStatus, reason.trim() ? reason : undefined);
    } catch (error) {
      alert('Failed to update approval status');
      // Optionally, you can call onStatusChange with an error flag
    }
  };

  // No shared button state needed here; handled in each branch below

  // Render logic based on status
  if (currentStatus === 'pending') {
    return (
      <div style={{ display: 'flex', gap: 8 }}>
        {showApprove && (
          <Button
            size="small"
            variant="outlined"
            sx={{
              minWidth: '100px',
              textTransform: 'none',
              backgroundColor: '#e8f5e9', // light green
              borderColor: '#4caf50',
              color: '#388e3c',
              fontWeight: 600,
              '&:hover': {
                backgroundColor: 'rgba(76, 175, 80, 0.15)',
                borderColor: '#4caf50',
              },
            }}
            disabled={disabled}
            onClick={e => {
              e.stopPropagation();
              handleUpdate('approved');
            }}
          >
            Approve
          </Button>
        )}
        {showReject && (
          <Button
            size="small"
            variant="outlined"
            sx={{
              minWidth: '100px',
              textTransform: 'none',
              backgroundColor: '#ffebee', // light red
              borderColor: '#f44336',
              color: '#c62828',
              fontWeight: 600,
              '&:hover': {
                backgroundColor: 'rgba(244, 67, 54, 0.15)',
                borderColor: '#f44336',
              },
            }}
            disabled={disabled}
            onClick={e => {
              e.stopPropagation();
              handleUpdate('rejected');
            }}
          >
            Reject
          </Button>
        )}
      </div>
    );
  }

  // For "approved" or "rejected", show a single toggle button
  const isApproved = currentStatus === 'approved';
  const buttonLabel = isApproved ? 'Approved' : 'Rejected';
  const nextStatus = isApproved ? 'rejected' : 'approved';
  const buttonColor = isApproved ? '#e8f5e9' : '#ffebee'; // light green or light red
  const borderColor = isApproved ? '#4caf50' : '#f44336';
  const textColor = isApproved ? '#388e3c' : '#c62828';

  return (
    <Button
      size="small"
      variant="outlined"
      sx={{
        minWidth: '100px',
        textTransform: 'none',
        backgroundColor: buttonColor,
        borderColor: borderColor,
        color: textColor,
        fontWeight: 600,
        '&:hover': {
          backgroundColor: isApproved
            ? 'rgba(76, 175, 80, 0.15)'
            : 'rgba(244, 67, 54, 0.15)',
          borderColor: borderColor,
        },
      }}
      disabled={disabled}
      onClick={e => {
        e.stopPropagation();
        handleUpdate(nextStatus);
      }}
    >
      {buttonLabel}
    </Button>
  );
};

export default HRApprovalButtons;