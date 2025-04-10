# Attendance UI & API Specification

---

## Overview

This document details the **frontend features**, **API endpoints**, and **UI layouts** for the Attendance module, including weekend work summaries, approval workflows, and data export capabilities.

_Last updated: April 10, 2025_

---

## Core Features

### Attendance Records

- View employee clock-in and clock-out times.
- Filter by date range, department, and employee.
- Track total hours worked.
- Add HR notes to attendance records.
- Approval status for weekend work (Pending, Approved, Rejected).

### Weekend Work Employee Summary

- Configurable weekend days (default Saturday and Sunday).
- Date range filtering.
- Filter options: Department, Employee, Approval status.
- Summary table includes:
  - Employee Name
  - Department
  - Date(s) Worked
  - Total Hours
  - Overtime Hours (planned)
  - Approval Status
- Approval workflow:
  - Approve or reject weekend work entries.
  - Status updates reflected in real-time.
- Export options (planned): PDF, Excel.
- Pagination and search for large datasets.

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

## Time Attendance Table Layout

This section describes the final corrected layout of the Time Attendance table.

### Table Columns

| Employee ID | Name | Department | Date | Day | Check In | Check Out | Duration (H:M) | Status | Checked | HR Approval | HR Note |
|-------------|-------|------------|-------|------|----------|-----------|----------------|--------|---------|-------------|---------|
| ...         | ...   | ...        | ...   | ...  | ...      | ...       | ...            | ...    | toggle  | Approve btn | ...     |

---

### Table Header Diagram

```mermaid
flowchart LR
    subgraph Table_Header
        A[Employee ID]
        B[Name]
        C[Department]
        D[Date]
        E[Day]
        F[Check In]
        G[Check Out]
        H[Duration (H:M)]
        I[Status]
        J[Checked]
        K[HR Approval]
        L[HR Note]
    end
```

*Open this file in a Mermaid-compatible markdown viewer to see the diagram rendered graphically.*

---

## Future Enhancements

- Overtime calculations based on company policies.
- Export functionality for reports.
- Audit logs for approval actions.
- Performance optimizations for large data volumes.