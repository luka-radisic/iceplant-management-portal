# Time Attendance Table Layout (Final Version)

This document describes the final corrected layout of the Time Attendance table.

---

## Table Columns

| Employee ID | Name | Department | Date | Day | Check In | Check Out | Duration (H:M) | Status | Checked | HR Approval | HR Note |
|-------------|-------|------------|-------|------|----------|-----------|----------------|--------|---------|-------------|---------|
| ...         | ...   | ...        | ...   | ...  | ...      | ...       | ...            | ...    | toggle  | Approve btn | ...     |

---

## Mermaid Diagram

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

---

*Open this file in a Mermaid-compatible markdown viewer to see the diagram rendered graphically.*