import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { format, subDays } from 'date-fns';
import AddMissingDaysTool from '../AddMissingDaysTool';
import apiService from '../../services/api';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers';

// Mock the API service
jest.mock('../../services/api', () => ({
  getDepartments: jest.fn(),
  searchEmployees: jest.fn(),
  addMissingDays: jest.fn()
}));

// Mock window.confirm
window.confirm = jest.fn();

describe('AddMissingDaysTool Component', () => {
  const mockDepartments = ['HR', 'Engineering', 'Sales'];
  const mockEmployees = [
    { id: '1', name: 'John Doe' },
    { id: '2', name: 'Jane Smith' }
  ];
  const mockAddedRecords = [
    { employee_id: '1', employee_name: 'John Doe', date: '2025-04-01' },
    { employee_id: '2', employee_name: 'Jane Smith', date: '2025-04-01' }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock API responses
    (apiService.getDepartments as jest.Mock).mockResolvedValue({ departments: mockDepartments });
    (apiService.searchEmployees as jest.Mock).mockResolvedValue({ results: mockEmployees });
    (apiService.addMissingDays as jest.Mock).mockResolvedValue({
      added_count: 2,
      added_records: mockAddedRecords,
      checked_dates: ['2025-04-01']
    });
    
    // Mock window.confirm to return true
    (window.confirm as jest.Mock).mockReturnValue(true);
  });

  const renderComponent = () => {
    return render(
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <AddMissingDaysTool />
      </LocalizationProvider>
    );
  };

  test('renders the component with initial state', async () => {
    renderComponent();
    
    // Check that the component title is rendered
    expect(screen.getByText('Add Missing Days Tool')).toBeInTheDocument();
    
    // Check that the description is rendered
    expect(screen.getByText(/This tool identifies employees with missing attendance records/)).toBeInTheDocument();
    
    // Check that the form fields are rendered
    expect(screen.getByLabelText(/Employee \(Optional\)/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Department \(Optional\)/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Start Date/)).toBeInTheDocument();
    expect(screen.getByLabelText(/End Date/)).toBeInTheDocument();
    
    // Check that the buttons are rendered
    expect(screen.getByText('Preview Missing Days')).toBeInTheDocument();
    expect(screen.getByText('Add Missing Days')).toBeInTheDocument();
    expect(screen.getByText('Reset Filters')).toBeInTheDocument();
    
    // Check that departments are fetched on mount
    await waitFor(() => {
      expect(apiService.getDepartments).toHaveBeenCalledTimes(1);
    });
  });

  test('handles employee search correctly', async () => {
    renderComponent();
    
    // Type in the employee search field
    const employeeInput = screen.getByLabelText(/Employee \(Optional\)/);
    fireEvent.change(employeeInput, { target: { value: 'John' } });
    
    // Check that the API is called with the search term
    await waitFor(() => {
      expect(apiService.searchEmployees).toHaveBeenCalledWith('John');
    });
  });

  test('handles preview functionality correctly', async () => {
    renderComponent();
    
    // Click the preview button
    const previewButton = screen.getByText('Preview Missing Days');
    fireEvent.click(previewButton);
    
    // Check that the API is called with the correct parameters
    await waitFor(() => {
      expect(apiService.addMissingDays).toHaveBeenCalledWith({
        dry_run: true,
        start_date: expect.any(String),
        end_date: expect.any(String)
      });
    });
    
    // Check that the preview results are displayed
    await waitFor(() => {
      expect(screen.getByText('2 records will be added.')).toBeInTheDocument();
      expect(screen.getByText('Sample of records to be added:')).toBeInTheDocument();
      expect(screen.getByText(/John Doe \(ID: 1\) - 2025-04-01/)).toBeInTheDocument();
      expect(screen.getByText(/Jane Smith \(ID: 2\) - 2025-04-01/)).toBeInTheDocument();
    });
  });

  test('handles add missing days functionality correctly', async () => {
    renderComponent();
    
    // First preview to enable the Add button
    const previewButton = screen.getByText('Preview Missing Days');
    fireEvent.click(previewButton);
    
    await waitFor(() => {
      expect(apiService.addMissingDays).toHaveBeenCalledWith(expect.objectContaining({
        dry_run: true
      }));
    });
    
    // Now click the Add Missing Days button
    const addButton = screen.getByText('Add Missing Days');
    fireEvent.click(addButton);
    
    // Check that the confirmation dialog is shown
    expect(window.confirm).toHaveBeenCalledWith(
      'Are you sure you want to add missing days? This will create "No Show" records for employees with no punch records in the selected date range.'
    );
    
    // Check that the API is called with the correct parameters
    await waitFor(() => {
      expect(apiService.addMissingDays).toHaveBeenCalledWith(expect.objectContaining({
        dry_run: false
      }));
    });
    
    // Check that the success message is displayed
    await waitFor(() => {
      expect(screen.getByText('Successfully added 2 missing day records.')).toBeInTheDocument();
    });
  });

  test('handles reset filters correctly', async () => {
    renderComponent();
    
    // Set some filters
    const departmentSelect = screen.getByLabelText(/Department \(Optional\)/);
    fireEvent.mouseDown(departmentSelect);
    const departmentOption = screen.getByText('HR');
    fireEvent.click(departmentOption);
    
    // Click the reset button
    const resetButton = screen.getByText('Reset Filters');
    fireEvent.click(resetButton);
    
    // Check that the filters are reset
    expect(screen.getByLabelText(/Department \(Optional\)/).textContent).not.toContain('HR');
  });

  test('handles API errors correctly', async () => {
    // Mock API to return an error
    (apiService.addMissingDays as jest.Mock).mockRejectedValue({
      response: { data: { error: 'API Error' } }
    });
    
    renderComponent();
    
    // Click the preview button
    const previewButton = screen.getByText('Preview Missing Days');
    fireEvent.click(previewButton);
    
    // Check that the error message is displayed
    await waitFor(() => {
      expect(screen.getByText('API Error')).toBeInTheDocument();
    });
  });

  test('handles date range selection correctly', async () => {
    renderComponent();
    
    // Set custom date range
    const startDateInput = screen.getByLabelText(/Start Date/);
    const endDateInput = screen.getByLabelText(/End Date/);
    
    // Clear and set new dates
    // Note: In a real test, you would use a more robust way to set dates in the DatePicker
    // This is simplified for the example
    fireEvent.change(startDateInput, { target: { value: '2025-04-01' } });
    fireEvent.change(endDateInput, { target: { value: '2025-04-05' } });
    
    // Click the preview button
    const previewButton = screen.getByText('Preview Missing Days');
    fireEvent.click(previewButton);
    
    // Check that the API is called with the correct date range
    await waitFor(() => {
      expect(apiService.addMissingDays).toHaveBeenCalledWith(expect.objectContaining({
        start_date: '2025-04-01',
        end_date: '2025-04-05'
      }));
    });
  });

  test('disables Add Missing Days button when no records to add', async () => {
    // Mock API to return no records
    (apiService.addMissingDays as jest.Mock).mockResolvedValue({
      added_count: 0,
      added_records: [],
      checked_dates: ['2025-04-01']
    });
    
    renderComponent();
    
    // Click the preview button
    const previewButton = screen.getByText('Preview Missing Days');
    fireEvent.click(previewButton);
    
    // Check that the Add Missing Days button is disabled
    await waitFor(() => {
      const addButton = screen.getByText('Add Missing Days');
      expect(addButton).toBeDisabled();
    });
  });

  test('cancels add operation when confirmation is declined', async () => {
    // Mock window.confirm to return false
    (window.confirm as jest.Mock).mockReturnValue(false);
    
    renderComponent();
    
    // First preview to enable the Add button
    const previewButton = screen.getByText('Preview Missing Days');
    fireEvent.click(previewButton);
    
    await waitFor(() => {
      expect(apiService.addMissingDays).toHaveBeenCalledWith(expect.objectContaining({
        dry_run: true
      }));
    });
    
    // Reset the mock to track new calls
    (apiService.addMissingDays as jest.Mock).mockClear();
    
    // Now click the Add Missing Days button
    const addButton = screen.getByText('Add Missing Days');
    fireEvent.click(addButton);
    
    // Check that the confirmation dialog is shown
    expect(window.confirm).toHaveBeenCalled();
    
    // Check that the API is NOT called when confirmation is declined
    expect(apiService.addMissingDays).not.toHaveBeenCalled();
  });
});