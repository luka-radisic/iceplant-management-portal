# No Show Records Generator Tool Guide

## Overview

The No Show Records Generator is an administrative tool designed for superusers to automatically generate attendance records marked as "no show" for employees who have no punch records on specific dates. This tool helps streamline attendance management by identifying employees who were scheduled to work but didn't record any punches.

## Access Requirements

- **Superuser access is required**: This tool is only visible and accessible to users with superuser privileges
- Access the tool through the administrative tools section of the IcePlant Management Portal

## Purpose

The No Show Records Generator solves several administrative challenges:

1. Automatically identifies employees with missing punch records
2. Creates attendance records with `no_show=True` for days with no punches
3. Provides a report of all created records for verification
4. Simplifies attendance record management and reporting

## Usage Instructions

### Step 1: Access the Tool

1. Log in to the IcePlant Management Portal using your superuser credentials
2. Navigate to the administrative tools section of the portal
3. Locate and select the "No Show Records Generator" tool

### Step 2: Select Date Range

1. Choose a **Start Date** using the date picker
   - This is the first day for which you want to check for missing punches
   
2. Choose an **End Date** using the date picker
   - This is the last day for which you want to check for missing punches
   
> **Note:** The end date must be after the start date, and the tool will validate this requirement

### Step 3: Generate Records

1. Click the **Generate No Show Records** button
2. Wait for processing to complete (indicated by a progress spinner)

### Step 4: Review Results

After processing, the tool will display:

- A success message with the total number of records created
- A detailed list of all created records including:
  - Employee name
  - Employee ID
  - Date of the no-show record

## Important Considerations

- **Processing Time**: For large date ranges or organizations with many employees, processing may take several seconds to complete
- **Duplicate Prevention**: The system is designed to prevent duplicate records, so running the tool multiple times for the same date range will not create duplicates
- **Verification**: Always review the generated records to ensure accuracy
- **Data Impact**: Generated records will appear in attendance reports and may affect employee attendance metrics

## Troubleshooting

### Common Issues:

1. **Error: "Please select both start and end dates"**
   - Ensure you have selected both the start and end dates before clicking the generate button

2. **Error: "End date must be after start date"**
   - Verify that your end date is chronologically after your start date

3. **Error: "Failed to generate No Show records"**
   - Check your network connection
   - Ensure the backend services are running properly
   - Contact IT support if the issue persists

## Data Security and Privacy

- This tool processes employee attendance data and should be used in compliance with your organization's data privacy policies
- All generated records are stored in the company's secure database
- Access to this tool is restricted to superusers to prevent unauthorized record generation

## Best Practices

- Run the tool during off-peak hours for better performance
- Use smaller date ranges (1-2 weeks maximum) for faster processing and easier verification
- Always review the generated records for accuracy before using them in reports or for decision-making
- Document when and why you used the tool for audit purposes

## Technical Implementation Details

### Frontend Implementation

The No Show Tool is implemented as a React functional component with the following technical details:

1. **Component Location**: 
   - File: `/iceplant_portal/frontend/src/components/NoShowTool.tsx`
   - Used in: Admin Tools Panel

2. **React Dependencies**:
   - React 17+
   - Material UI v5 components
   - MUI X Date Pickers for date selection
   - date-fns for date formatting
   - notistack for notifications

3. **Key Component Structure**:
   ```tsx
   const NoShowTool: React.FC = () => {
     // State management for dates, processing status, and results
     const [startDate, setStartDate] = useState<Date | null>(null);
     const [endDate, setEndDate] = useState<Date | null>(null);
     const [processing, setProcessing] = useState(false);
     const [result, setResult] = useState<any>(null);
     const [error, setError] = useState<string | null>(null);
     
     // Superuser validation
     const [isSuperuser, setIsSuperuser] = useState(false);
     
     // Main function to generate no-show records
     const generateNoShowRecords = async () => {
       // Implementation details
     };
     
     return (/* UI Components */);
   };
   ```

4. **Authentication & Authorization**:
   - The component uses localStorage to check for superuser status
   - The component self-hides for non-superusers with:
     ```tsx
     if (!isSuperuser) return null;
     ```

### Backend Implementation

The backend API endpoint for generating no-show records is implemented in Django:

1. **API Endpoint**:
   - URL: `/api/tools/tools/generate-no-show/`
   - HTTP Method: POST
   - Required parameters: `start_date`, `end_date` (format: YYYY-MM-DD)

2. **Core Backend Logic**:
   - Iterates through each day in the date range
   - For each day, identifies employees who have no attendance records
   - Creates new attendance records with `no_show=True` flag
   - Returns created records and count

3. **Response Format**:
   ```json
   {
     "created_count": 42,
     "created_records": [
       {
         "employee_id": "EMP123",
         "employee_name": "John Doe",
         "date": "2025-04-10"
       },
       // Additional records...
     ]
   }
   ```

4. **Error Handling**:
   - Returns appropriate HTTP status codes for different error conditions
   - Returns descriptive error messages in the response body

### Database Implications

The tool interacts with the following database models:

1. **Attendance Model**:
   - Creates records with `no_show=True`
   - Sets appropriate `employee_id`, `date`, and related fields

2. **EmployeeProfile Model**:
   - Used to identify active employees who should have attendance records

### Deployment & Maintenance

1. **Required Environment**:
   - React 17+ for frontend
   - Django 3.2+ for backend
   - Python 3.8+ for backend processing
   - Node.js 14+ for frontend development

2. **Build Process**:
   - Frontend: Webpack bundle, included in Django static files
   - Backend: Standard Django deployment

3. **Updating the Tool**:
   - Frontend changes: Update the React component and rebuild
   - Backend changes: Modify the Django view and API endpoint

---

*For additional assistance or to report issues with this tool, please contact your system administrator.*
