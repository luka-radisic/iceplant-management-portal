# HR Attendance Approval Log & Export Plan

---

## Overview

Maintain a full audit trail of all HR approval and rejection actions on attendance records, including reasons **and shift info**. Display this log in the employee profile popup and allow exporting it.

---

## Data Model

### Table: `AttendanceApprovalLog`

| Field             | Type        | Description                                         |
|-------------------|-------------|-----------------------------------------------------|
| id                | UUID/int    | Unique identifier                                  |
| attendance_record | FK          | Link to attendance record                          |
| timestamp         | datetime    | When the action was performed                      |
| user              | FK/User     | Who performed the action                           |
| new_status        | enum        | `approved` or `rejected`                           |
| note              | text        | Reason/note entered                                |
| shift_start       | string      | Shift start time (HH:MM) at time of action         |
| shift_end         | string      | Shift end time (HH:MM) at time of action           |
| shift_type        | string      | Shift type (Morning, Night, Rotating) at time of action |

- Linked to each attendance record.
- Created **every time** approval status changes with a reason.
- **Captures shift info** at the moment of approval/rejection for audit.

---

## API Endpoints

- **GET /attendance/{id}/logs/**
  - Returns list of approval/rejection logs for a record.
- **POST /attendance/{id}/logs/**
  - Adds a new log entry (called on status change).
- **GET /employee/{id}/attendance_with_logs/**
  - Returns employee attendance records **with** their approval logs.

---

## Frontend UI

### Employee Profile Popup

- **Approval History Table**
  - Columns: **Date**, **User**, **Status**, **Note**, **Shift Start**, **Shift End**, **Shift Type**
  - Sorted by timestamp descending.
- **Export Button**
  - Export logs as **CSV** or **Excel**.
  - Includes all columns.

---

## Workflow

1. HR changes approval status with a reason.
2. Frontend sends PATCH to update status + POST to create log entry **with shift info**.
3. Logs are fetched and displayed in employee profile.
4. User can export logs anytime.

---

## Mermaid Diagram

```mermaid
sequenceDiagram
    participant HR as HR User
    participant FE as Frontend
    participant API as Backend API
    participant DB as Database

    HR->>FE: Change approval status + reason
    FE->>API: PATCH /attendance/{id}/ (update status + note)
    FE->>API: POST /attendance/{id}/logs/ (new log entry with shift info)
    API->>DB: Save status + note
    API->>DB: Save approval log with shift info
    FE->>API: GET /employee/{id}/attendance_with_logs/
    API->>DB: Fetch attendance + logs
    API->>FE: Return data
    FE->>HR: Display approval history with shift info
    HR->>FE: Click Export
    FE->>HR: Download CSV/Excel
```

---

## Summary

- **Full audit trail** of approval/rejection actions **with shift context**.
- **Visible** in employee profile popup.
- **Exportable** for reporting.
- **Backend** stores logs on every status change.
- **Frontend** fetches and displays logs.

---

## Last Updated

April 10, 2025