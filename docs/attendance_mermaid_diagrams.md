# Attendance System Mermaid Diagrams

---

## Processing & Approval Workflow

```mermaid
flowchart TD
    A[Attendance Record Created] --> B{Initial Processing}
    B -->|Mark as Checked| C[Checked = true]
    C --> D{HR Review}
    D -->|Approve| E[Status = Approved]
    D -->|Reject| F[Status = Rejected]
    B -->|Not Checked| G[Awaiting Processing]
```

---

## Weekend Work Employee Summary Sequence

```mermaid
sequenceDiagram
    participant User
    participant UI as Weekend Work Page
    participant Server

    User->>UI: Apply filters
    User->>UI: Click employee profile
    UI->>Server: Fetch employee weekend work with filters
    Server-->>UI: Return weekend work data
    UI->>User: Show weekend work summary modal
    User->>UI: Close modal
```

---

## HR Notice Mark & Approval Combined Workflow

```mermaid
flowchart TD
    A[Attendance Record Created] --> B{Initial Processing}
    B -->|Mark as Checked| C[Checked = true]
    C --> D{HR Review}
    D -->|Approve| E[Status = Approved]
    D -->|Reject| F[Status = Rejected]
    D -->|Add/Edit HR Note| G[HR Note Saved]
    G --> H{HR Note Exists?}
    H -->|Yes| I[Show Notice Mark to Staff]
    H -->|No| J[No Notice Mark]
    B -->|Not Checked| K[Awaiting Processing]
```

---

## Last Updated

April 10, 2025