# Manual Test Plan for Add Missing Days Tool

## Overview
This document outlines the manual testing procedures for the "Add Missing Days Tool" feature, which identifies employees with no punch records for specific dates and adds them as "No Show" entries. This test plan focuses on edge cases, user experience, and scenarios that are difficult to cover with automated tests.

## Prerequisites
- Access to the IcePlant Management Portal with HR user permissions
- Test environment with sample employee data
- Understanding of the attendance tracking system

## Test Environment Setup
1. Ensure the test database has:
   - Multiple active employees across different departments
   - Some employees with existing attendance records
   - Some employees with existing "No Show" records
   - Some inactive employees

## Test Cases

### 1. Basic Functionality Tests

#### 1.1 UI Visibility and Access
| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|----------------|
| BF-01 | Tool visibility for HR users | 1. Log in as HR user<br>2. Navigate to Attendance page | "Add Missing Days" button is visible next to "Cleanup Attendance Records" button |
| BF-02 | Tool visibility for non-HR users | 1. Log in as non-HR user<br>2. Navigate to Attendance page | "Add Missing Days" button is NOT visible |
| BF-03 | Tool access | 1. Log in as HR user<br>2. Navigate to Attendance page<br>3. Click "Add Missing Days" button | Tool dialog opens with all form fields and buttons |

#### 1.2 Form Functionality
| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|----------------|
| FF-01 | Default date range | 1. Open the tool | Start date should be 30 days ago, end date should be today |
| FF-02 | Employee search | 1. Type in employee search field | Matching employees appear in dropdown |
| FF-03 | Department selection | 1. Click department dropdown | All departments are listed |
| FF-04 | Date picker functionality | 1. Click on date fields<br>2. Select different dates | Date pickers work correctly and allow date selection |
| FF-05 | Reset button | 1. Set various filters<br>2. Click "Reset Filters" | All filters reset to default values |

#### 1.3 Preview Functionality
| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|----------------|
| PF-01 | Preview with no filters | 1. Open tool<br>2. Click "Preview Missing Days" | Shows count and sample of records that would be added |
| PF-02 | Preview with employee filter | 1. Select specific employee<br>2. Click "Preview" | Shows only records for selected employee |
| PF-03 | Preview with department filter | 1. Select specific department<br>2. Click "Preview" | Shows only records for employees in selected department |
| PF-04 | Preview with date range | 1. Set custom date range<br>2. Click "Preview" | Shows only records within selected date range |
| PF-05 | Preview with no missing days | 1. Set filters where no missing days exist<br>2. Click "Preview" | Shows "0 records will be added" and "Add Missing Days" button is disabled |

#### 1.4 Add Functionality
| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|----------------|
| AF-01 | Confirmation dialog | 1. Preview records<br>2. Click "Add Missing Days" | Confirmation dialog appears |
| AF-02 | Cancel confirmation | 1. Preview records<br>2. Click "Add Missing Days"<br>3. Click "Cancel" in confirmation | No records are added, dialog remains open |
| AF-03 | Successful addition | 1. Preview records<br>2. Click "Add Missing Days"<br>3. Confirm | Success message appears, records are added to database |
| AF-04 | View added records | 1. Add missing days<br>2. Close dialog<br>3. Filter attendance list for "No Show" status | Added records appear in the attendance list |

### 2. Edge Cases and Special Scenarios

#### 2.1 Date-Related Edge Cases
| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|----------------|
| EC-01 | Weekends | 1. Set date range including weekends<br>2. Preview and add | "No Show" records are created for weekends |
| EC-02 | Holidays | 1. Set date range including known holidays<br>2. Preview and add | "No Show" records are created for holidays |
| EC-03 | Future dates | 1. Set end date to future date<br>2. Preview | Records are shown for future dates up to today only |
| EC-04 | Very long date range | 1. Set date range of 365+ days<br>2. Preview | Tool handles large date range without performance issues |
| EC-05 | Single day | 1. Set start and end date to same day<br>2. Preview and add | Works correctly for single day |

#### 2.2 Employee-Related Edge Cases
| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|----------------|
| EE-01 | Employees with existing "No Show" | 1. Find employee with existing "No Show" record<br>2. Set date range including that date<br>3. Preview | Existing "No Show" date is not included in preview |
| EE-02 | Employees with partial attendance | 1. Find employee with check-in but no check-out<br>2. Set date range including that date<br>3. Preview | Date with partial attendance is not included in preview |
| EE-03 | Recently inactive employees | 1. Make an employee inactive<br>2. Preview missing days | Inactive employee is not included in preview |
| EE-04 | Employees with multiple departments | 1. Find employee assigned to multiple departments<br>2. Preview with department filter | Employee appears only when relevant department is selected |

#### 2.3 Idempotency and Data Integrity
| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|----------------|
| ID-01 | Run tool multiple times | 1. Add missing days for a date range<br>2. Run the tool again with same parameters | No duplicate records are created, tool reports 0 records added |
| ID-02 | Concurrent operations | 1. Open tool in two browser tabs<br>2. Add missing days in both tabs simultaneously | No data corruption or duplicate records |
| ID-03 | Database consistency | 1. Add missing days<br>2. Check database records directly | Records have correct schema and data (check_in at 8:00 AM, check_out null, department="NO SHOW") |
| ID-04 | Add after delete | 1. Add missing days<br>2. Delete some added records<br>3. Run tool again | Only deleted records are re-added |

#### 2.4 Error Handling
| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|----------------|
| EH-01 | Invalid date format | 1. Manually enter invalid date format | Appropriate error message shown |
| EH-02 | End date before start date | 1. Set end date earlier than start date<br>2. Preview | Error message about invalid date range |
| EH-03 | Network failure | 1. Disconnect network<br>2. Try to preview or add | Appropriate error message about network failure |
| EH-04 | Server error | 1. Cause server error (e.g., by database constraint)<br>2. Try to add | Error message from server is displayed |

#### 2.5 Performance and Load Testing
| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|----------------|
| PL-01 | Large employee count | 1. Ensure database has 100+ employees<br>2. Preview with wide date range | Tool handles large number of records without performance issues |
| PL-02 | UI responsiveness | 1. Preview large number of records<br>2. Interact with UI during processing | UI remains responsive during processing |
| PL-03 | Memory usage | 1. Monitor memory usage<br>2. Preview and add large number of records | No excessive memory usage or leaks |

### 3. Integration Tests

#### 3.1 Attendance List Integration
| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|----------------|
| AI-01 | Added records in list | 1. Add missing days<br>2. Close dialog<br>3. Check attendance list | Added records appear in the list with correct filtering |
| AI-02 | Filtering added records | 1. Add missing days<br>2. Filter attendance list by "No Show" status | Added records are included in filtered results |
| AI-03 | Sorting added records | 1. Add missing days<br>2. Sort attendance list by date | Added records appear in correct sort order |

#### 3.2 HR Approval Workflow
| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|----------------|
| HA-01 | Approval status | 1. Add missing days<br>2. Check approval status of added records | Records have "pending" approval status |
| HA-02 | Approve added records | 1. Add missing days<br>2. Approve some added records | Records can be approved normally |
| HA-03 | Reject added records | 1. Add missing days<br>2. Reject some added records | Records can be rejected normally |

#### 3.3 Reporting Integration
| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|----------------|
| RI-01 | Export with added records | 1. Add missing days<br>2. Export attendance records | Added "No Show" records are included in export |
| RI-02 | Statistics with added records | 1. Add missing days<br>2. Check attendance statistics | Added "No Show" records are reflected in statistics |

### 4. Permission and Security Tests

#### 4.1 Permission Tests
| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|----------------|
| PT-01 | Non-HR access attempt | 1. Log in as non-HR user<br>2. Try to access tool directly (e.g., by URL manipulation) | Access denied |
| PT-02 | Session timeout | 1. Let session timeout<br>2. Try to use tool | Redirected to login page |
| PT-03 | Permission change | 1. Remove HR role from user while tool is open<br>2. Try to add missing days | Operation fails with permission error |

## Test Execution Checklist

For each test execution, record:
- Test ID
- Date and time of test
- Tester name
- Test environment details
- Test result (Pass/Fail)
- Any observations or issues
- Screenshots of failures

## Defect Reporting

For any defects found, include:
1. Test ID that revealed the defect
2. Steps to reproduce
3. Expected vs. actual result
4. Environment details
5. Severity assessment
6. Screenshots or video if applicable

## Regression Testing

After any fixes or changes to the Add Missing Days Tool, re-run:
1. All failed tests
2. All basic functionality tests
3. Any edge cases related to the fixed areas