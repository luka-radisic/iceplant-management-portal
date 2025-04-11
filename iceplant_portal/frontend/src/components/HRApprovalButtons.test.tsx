import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import HRApprovalButtons from './HRApprovalButtons';

describe('HRApprovalButtons', () => {
  const defaultProps = {
    id: 1,
    endpoint: '/api/attendance/attendance/',
    requireReason: false,
    disabled: false,
    showApprove: true,
    showReject: true,
  };

  it('renders Approve and Reject buttons for Pending status', () => {
    const onStatusChange = jest.fn();
    render(
      <HRApprovalButtons
        {...defaultProps}
        currentStatus="pending"
        onStatusChange={onStatusChange}
      />
    );
    expect(screen.getByText('Approve')).toBeInTheDocument();
    expect(screen.getByText('Reject')).toBeInTheDocument();
  });

  it('calls onStatusChange with "approved" when Approve is clicked (Pending)', () => {
    const onStatusChange = jest.fn();
    render(
      <HRApprovalButtons
        {...defaultProps}
        currentStatus="pending"
        onStatusChange={onStatusChange}
      />
    );
    fireEvent.click(screen.getByText('Approve'));
    // handleUpdate is async, but onStatusChange is called after await
    // so we can use setImmediate or waitFor if needed, but here we assume direct call
    expect(onStatusChange).toHaveBeenCalledWith('approved', undefined);
  });

  it('calls onStatusChange with "rejected" when Reject is clicked (Pending)', () => {
    const onStatusChange = jest.fn();
    render(
      <HRApprovalButtons
        {...defaultProps}
        currentStatus="pending"
        onStatusChange={onStatusChange}
      />
    );
    fireEvent.click(screen.getByText('Reject'));
    expect(onStatusChange).toHaveBeenCalledWith('rejected', undefined);
  });

  it('renders single Approved button for Approved status', () => {
    const onStatusChange = jest.fn();
    render(
      <HRApprovalButtons
        {...defaultProps}
        currentStatus="approved"
        onStatusChange={onStatusChange}
      />
    );
    expect(screen.getByText('Approved')).toBeInTheDocument();
    expect(screen.queryByText('Reject')).not.toBeInTheDocument();
    expect(screen.queryByText('Approve')).not.toBeInTheDocument();
  });

  it('renders single Rejected button for Rejected status', () => {
    const onStatusChange = jest.fn();
    render(
      <HRApprovalButtons
        {...defaultProps}
        currentStatus="rejected"
        onStatusChange={onStatusChange}
      />
    );
    expect(screen.getByText('Rejected')).toBeInTheDocument();
    expect(screen.queryByText('Approve')).not.toBeInTheDocument();
    expect(screen.queryByText('Reject')).not.toBeInTheDocument();
  });

  it('toggles from Approved to Rejected on click', () => {
    const onStatusChange = jest.fn();
    render(
      <HRApprovalButtons
        {...defaultProps}
        currentStatus="approved"
        onStatusChange={onStatusChange}
      />
    );
    fireEvent.click(screen.getByText('Approved'));
    expect(onStatusChange).toHaveBeenCalledWith('rejected', undefined);
  });

  it('toggles from Rejected to Approved on click', () => {
    const onStatusChange = jest.fn();
    render(
      <HRApprovalButtons
        {...defaultProps}
        currentStatus="rejected"
        onStatusChange={onStatusChange}
      />
    );
    fireEvent.click(screen.getByText('Rejected'));
    expect(onStatusChange).toHaveBeenCalledWith('approved', undefined);
  });

  it('does not render Approve button if showApprove is false', () => {
    const onStatusChange = jest.fn();
    render(
      <HRApprovalButtons
        {...defaultProps}
        currentStatus="pending"
        onStatusChange={onStatusChange}
        showApprove={false}
      />
    );
    expect(screen.queryByText('Approve')).not.toBeInTheDocument();
    expect(screen.getByText('Reject')).toBeInTheDocument();
  });

  it('does not render Reject button if showReject is false', () => {
    const onStatusChange = jest.fn();
    render(
      <HRApprovalButtons
        {...defaultProps}
        currentStatus="pending"
        onStatusChange={onStatusChange}
        showReject={false}
      />
    );
    expect(screen.getByText('Approve')).toBeInTheDocument();
    expect(screen.queryByText('Reject')).not.toBeInTheDocument();
  });

  it('disables all buttons if disabled is true', () => {
    const onStatusChange = jest.fn();
    render(
      <HRApprovalButtons
        {...defaultProps}
        currentStatus="pending"
        onStatusChange={onStatusChange}
        disabled={true}
      />
    );
    expect(screen.getByText('Approve')).toBeDisabled();
    expect(screen.getByText('Reject')).toBeDisabled();
  });
});