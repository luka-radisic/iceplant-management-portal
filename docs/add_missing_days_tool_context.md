# Add Missing Days Tool for Attendance Page

## Objective
Implement a tool on the Attendance page that allows admins to add missing days for employees who have no punch records, ensuring these days are marked as "No Show" by default.

## Requirements
- The tool must be accessible on the Attendance page, next to the Cleanup Attendance button.
- It should identify employees with missing days (no punch records) and allow adding those days.
- When adding missing days, do not create check-in or check-out data.
- The system should automatically mark these days as "No Show" using existing logic.
- Database entries for these days must match the structure and conventions of other employee attendance records, except for the absence of punch data.
- The tool must be idempotent: running it multiple times should not create duplicate records.

## Technical Constraints
- Integrate with existing frontend (React/TypeScript) and backend (Django/Python) codebases.
- Must not disrupt existing attendance or "No Show" logic.
- UI/UX must be consistent with the current Attendance page design.
- Ensure data consistency and integrity.

## Acceptance Criteria
1. The tool is visible and accessible next to the Cleanup Attendance button.
2. It correctly identifies and allows adding missing days for employees with no punch records.
3. Added days do not include check-in or check-out data.
4. The system marks these days as "No Show" automatically.
5. Database entries are consistent with other attendance records.
6. The tool is idempotent and does not create duplicates.

## Task Decomposition
1. Backend API: Endpoint and logic to add missing days for employees with no punch records.
2. Frontend Integration: UI component/button, dialog/modal, API call, and UI update.
3. Database Consistency: Ensure new records match schema and conventions.
4. Quality Assurance: Automated and manual tests for all requirements and edge cases.