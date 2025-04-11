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

  return (
    <>
      {showApprove && (
        <Button
          size="small"
          variant="outlined"
          color="success"
          sx={{
            minWidth: '70px',
            mr: 1,
            textTransform: 'none',
            borderColor: '#4caf50',
            color: '#4caf50',
            '&:hover': {
              backgroundColor: 'rgba(76, 175, 80, 0.1)',
              borderColor: '#4caf50',
            },
          }}
          disabled={disabled || currentStatus === 'approved'}
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
          color="error"
          sx={{
            minWidth: '70px',
            textTransform: 'none',
            borderColor: '#f44336',
            color: '#f44336',
            '&:hover': {
              backgroundColor: 'rgba(244, 67, 54, 0.1)',
              borderColor: '#f44336',
            },
          }}
          disabled={disabled || currentStatus === 'rejected'}
          onClick={e => {
            e.stopPropagation();
            handleUpdate('rejected');
          }}
        >
          Reject
        </Button>
      )}
    </>
  );
};

export default HRApprovalButtons;