import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AddMissingDaysTool from '../AddMissingDaysTool';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { SnackbarProvider } from 'notistack';

// Mock the API service
jest.mock('../../services/api', () => ({
  __esModule: true,
  default: {
    getDepartments: jest.fn().mockResolvedValue(['IT', 'HR', 'Finance']),
    get: jest.fn().mockResolvedValue([
      { employee_id: '1', full_name: 'John Doe' },
      { employee_id: '2', full_name: 'Jane Smith' }
    ]),
    addMissingDays: jest.fn().mockResolvedValue({
      added_count: 2,
      added_records: [
        { employee_id: '1', employee_name: 'John Doe', date: '2025-04-01' },
        { employee_id: '2', employee_name: 'Jane Smith', date: '2025-04-01' }
      ],
      checked_dates: ['2025-04-01', '2025-04-02', '2025-04-03']
    })
  }
}));

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <SnackbarProvider>
        {ui}
      </SnackbarProvider>
    </LocalizationProvider>
  );
};

describe('AddMissingDaysTool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the component', () => {
    renderWithProviders(<AddMissingDaysTool />);
    
    expect(screen.getByText(/Add "No Show" attendance records/i)).toBeInTheDocument();
    expect(screen.getByText(/Preview Missing Days/i)).toBeInTheDocument();
    expect(screen.getByText(/Add Missing Days/i)).toBeInTheDocument();
  });

  it('handles preview action', async () => {
    const { getByText } = renderWithProviders(<AddMissingDaysTool />);
    
    // Click the preview button
    fireEvent.click(getByText('Preview Missing Days'));
    
    // Wait for the preview results to be displayed
    await waitFor(() => {
      expect(getByText(/Preview Results/i)).toBeInTheDocument();
    });
  });

  // Add more tests as needed
});