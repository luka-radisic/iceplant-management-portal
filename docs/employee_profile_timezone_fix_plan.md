# Plan to Fix Employee Profile Summary Timezone (Asia/Manila)

## 1. Confirm Backend Time Format
- Check if the backend sends `check_in`/`check_out` as UTC ISO 8601 strings (e.g., `2025-04-13T02:40:00Z`).
- If not, document the actual format and adjust the frontend conversion logic accordingly.

## 2. Review and Refactor Frontend Timezone Handling
- In `EmployeeAttendanceModal.tsx`, ensure that:
  - All check-in/check-out times are parsed as UTC and then converted to 'Asia/Manila' using `utcToZonedTime`.
  - The calculation for `avgCheckIn` and `avgCheckOut` is robust and does not double-convert or misinterpret the timezone.
- If necessary, add comments or utility functions to clarify the conversion process.

## 3. Test and Validate
- Test with sample data where `check_in`/`check_out` are in UTC and verify that the summary time matches the expected Manila time.
- If possible, add a unit test or a comment with an example conversion.

## 4. (Optional) Update Documentation
- Add a note in the code or project documentation about the expected backend time format and the frontend conversion logic.

---

## Mermaid Diagram: Data Flow for Timezone Conversion

```mermaid
flowchart TD
    A[Backend sends check_in/check_out (UTC ISO 8601?)] --> B[Frontend parses as Date]
    B --> C[Convert to Asia/Manila with utcToZonedTime]
    C --> D[Calculate average time (ms)]
    D --> E[Format as 'HH:mm' for summary display]