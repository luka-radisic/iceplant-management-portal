# HR Attendance Approval UI Refinement Plan

---

## Objective

- When an **HR user** approves an attendance record:
  - The UI **only shows a gray "Approved" label** (non-clickable).
  - The **Reject button disappears**.
  - The **Approve button remains visible** but styled as a gray label.
  - Clicking the "Approved" label/button **still allows changing status back to Rejected** (with reason prompt).
- This prevents accidental re-approval but allows HR to **revoke approval with a reason**.

---

## Current State Summary

- Both Approve and Reject buttons are shown **only to HR** (`isHrUser ? ...`).
- Buttons call `handleUpdateAttendanceApprovalStatus(record.id, 'approved'/'rejected', record.approval_status)`.
- Reason prompt logic is already in place for:
  - Rejecting.
  - Changing from Approved to another status.
- No UI differentiation after approval; both buttons remain active.

---

## Planned UI Behavior

### For HR users:

| Current Status   | Show Approve Button? | Show Reject Button? | Approve Button Style/Label          | Approve Button Action                                  |
|------------------|----------------------|---------------------|-------------------------------------|--------------------------------------------------------|
| **Pending**      | Yes                  | Yes                 | Green, label "Approve"              | Approves without reason prompt                         |
| **Rejected**     | Yes                  | Yes                 | Green, label "Approve"              | Approves without reason prompt                         |
| **Approved**     | Yes                  | **No**              | **Gray, label "Approved"**          | Prompts for reason, then changes to Rejected if reason |
  
- **Non-HR users:** see only the approval status text, no buttons (already implemented).

---

## Implementation Steps

### 1. Adjust Button Rendering Logic

In the JSX around lines 698-717:

- **Wrap the Reject button** in a condition:
  ```tsx
  {record.approval_status !== 'approved' && (
    <Button>Reject</Button>
  )}
  ```
- **Change the Approve button:**
  - If `record.approval_status === 'approved'`:
    - Style as **gray** (e.g., `color="inherit"` or custom style).
    - Change label to **"Approved"**.
    - Keep it clickable to allow status change (with reason prompt).
  - Else:
    - Style as **green** (`color="success"`).
    - Label as **"Approve"**.

### 2. Update Approve Button Style and Label

Example pseudocode:
```tsx
<Button
  variant="outlined"
  size="small"
  color={record.approval_status === 'approved' ? 'inherit' : 'success'}
  onClick={() => handleUpdateAttendanceApprovalStatus(record.id, 'approved', record.approval_status)}
  sx={{
    mr: 0.5,
    ...(record.approval_status === 'approved' && {
      color: 'gray',
      borderColor: 'gray',
      cursor: 'pointer',
    }),
  }}
>
  {record.approval_status === 'approved' ? 'Approved' : 'Approve'}
</Button>
```

### 3. Backend Logic

- No changes needed.
- The backend already restricts approval changes to HR.
- The reason prompt logic is already enforced in the frontend.

---

## Mermaid Diagram of New Approval UI Logic

```mermaid
flowchart TD
    A[HR views attendance record]
    B{Approval Status}
    A --> B
    B -->|Pending| C[Show Approve (green) and Reject buttons]
    B -->|Rejected| C
    B -->|Approved| D[Show gray "Approved" button only]
    D --> E{HR clicks "Approved"}
    E -->|Prompt for reason| F[Change to Rejected if reason given]
    C --> G{HR clicks Approve or Reject}
    G -->|If Reject or change from Approved| H[Prompt for reason]
    G -->|If Approve from Pending| I[Approve without prompt]
```

---

## Summary

- **Reject button hidden** when status is Approved.
- **Approve button turns into gray "Approved" label** but remains clickable.
- Clicking "Approved" prompts for a reason to **revoke approval**.
- No change for Pending or Rejected states.
- No change for non-HR users.

---

## Last Updated

April 10, 2025