# Attendance Page - Features & API Overview

## Overview
The Attendance Page provides comprehensive management and reporting of employee attendance, including weekend work summaries, approval workflows, and data export capabilities.

---

## Core Features

### 1. Attendance Records
- View employee clock-in and clock-out times.
- Filter by date range, department, and employee.
- Track total hours worked.
- Add HR notes to attendance records.
- Approval status for weekend work (Pending, Approved, Rejected).

### 2. Weekend Work Employee Summary
- **Configurable weekend days** (default Saturday and Sunday).
- **Date range filtering** to select reporting period.
- **Filter options**:
  - Department
  - Employee
  - Approval status
- **Summary table** includes:
  - Employee Name
  - Department
  - Date(s) Worked
  - Total Hours
  - Overtime Hours (planned)
  - Approval Status
- **Approval workflow**:
  - Approve or reject weekend work entries.
  - Approval status updates reflected in real-time.
- **Export options** (planned):
  - Download summary as PDF or Excel.
- **Pagination and search** for large datasets.

---

## API Endpoints

### `/attendance/weekend-work/`
- **Method:** GET
- **Description:** Retrieve weekend work attendance records.
- **Query Parameters:**
  - `start_date` (YYYY-MM-DD)
  - `end_date` (YYYY-MM-DD)
  - `weekend_days` (comma-separated weekday numbers, e.g., `5,6`)
  - `department`
  - `employee_id`
  - `approval_status` (`pending`, `approved`, `rejected`)
- **Response:**
  - List of attendance records with:
    - ID
    - Employee Name
    - Date
    - Punch In/Out times
    - Duration
    - Department
    - Approval Status
    - HR Note flag

---

## User Interface Components

- **Date Range Picker:** Select period for attendance or weekend summary.
- **Filters:** Department, employee, approval status.
- **Summary Table:** Displays filtered attendance data.
- **Approval Actions:** Approve or reject weekend work entries.
- **Export Buttons:** Download data as PDF or Excel (planned).
- **Pagination/Search:** Navigate large datasets efficiently.

---

## Approval Workflow
- Attendance entries for weekend work start as **Pending**.
- Authorized users can **Approve** or **Reject** entries.
- Approval status is stored and displayed in the UI.
- Actions are logged with timestamps and user info (planned).

---

## Future Enhancements
- Overtime calculations based on company policies.
- Export functionality for reports.
- Audit logs for approval actions.
- Performance optimizations for large data volumes.

---

**Last updated:** April 9, 2025