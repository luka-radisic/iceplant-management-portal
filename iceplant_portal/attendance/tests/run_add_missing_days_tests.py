#!/usr/bin/env python
"""
Test runner script for Add Missing Days Tool tests.
This script runs all the automated tests for the Add Missing Days Tool
and generates a report of the results.

Usage:
    python run_add_missing_days_tests.py

Requirements:
    - Django
    - pytest
    - pytest-django
    - pytest-cov (for coverage reports)
"""

import os
import sys
import subprocess
import datetime

def print_header(text):
    """Print a formatted header."""
    print("\n" + "=" * 80)
    print(f" {text} ".center(80, "="))
    print("=" * 80 + "\n")

def run_backend_tests():
    """Run the backend API tests."""
    print_header("Running Backend API Tests")
    
    # Run the backend tests with pytest
    backend_test_command = [
        "pytest",
        "test_add_missing_days_api.py",
        "-v",
        "--no-header",
    ]
    
    backend_result = subprocess.run(
        backend_test_command,
        cwd=os.path.dirname(os.path.abspath(__file__)),
        capture_output=True,
        text=True
    )
    
    print(backend_result.stdout)
    if backend_result.stderr:
        print("ERRORS:")
        print(backend_result.stderr)
    
    return backend_result.returncode == 0

def run_data_integrity_tests():
    """Run the data integrity tests."""
    print_header("Running Data Integrity Tests")
    
    # Run the data integrity tests with pytest
    integrity_test_command = [
        "pytest",
        "test_add_missing_days_data_integrity.py",
        "-v",
        "--no-header",
    ]
    
    integrity_result = subprocess.run(
        integrity_test_command,
        cwd=os.path.dirname(os.path.abspath(__file__)),
        capture_output=True,
        text=True
    )
    
    print(integrity_result.stdout)
    if integrity_result.stderr:
        print("ERRORS:")
        print(integrity_result.stderr)
    
    return integrity_result.returncode == 0

def run_frontend_tests():
    """Run the frontend component tests."""
    print_header("Running Frontend Component Tests")
    
    # Run the frontend tests with Jest
    frontend_test_command = [
        "npm",
        "test",
        "--",
        "AddMissingDaysTool.test.tsx",
    ]
    
    # Change to the frontend directory
    frontend_dir = os.path.abspath(os.path.join(
        os.path.dirname(__file__),
        "../../../frontend"
    ))
    
    frontend_result = subprocess.run(
        frontend_test_command,
        cwd=frontend_dir,
        capture_output=True,
        text=True
    )
    
    print(frontend_result.stdout)
    if frontend_result.stderr:
        print("ERRORS:")
        print(frontend_result.stderr)
    
    return frontend_result.returncode == 0

def run_coverage_report():
    """Run a coverage report for the backend tests."""
    print_header("Generating Coverage Report")
    
    # Run the backend tests with coverage
    coverage_command = [
        "pytest",
        "test_add_missing_days_api.py",
        "test_add_missing_days_data_integrity.py",
        "--cov=../api",
        "--cov-report=term",
        "--cov-report=html:./coverage_html",
        "--no-header",
    ]
    
    coverage_result = subprocess.run(
        coverage_command,
        cwd=os.path.dirname(os.path.abspath(__file__)),
        capture_output=True,
        text=True
    )
    
    print(coverage_result.stdout)
    if coverage_result.stderr:
        print("ERRORS:")
        print(coverage_result.stderr)
    
    print("\nCoverage report generated in ./coverage_html/index.html")
    
    return coverage_result.returncode == 0

def generate_test_report(backend_success, integrity_success, frontend_success, coverage_success):
    """Generate a test report."""
    print_header("Test Report")
    
    now = datetime.datetime.now()
    print(f"Test Run: {now.strftime('%Y-%m-%d %H:%M:%S')}")
    print("\nTest Results:")
    print(f"  Backend API Tests: {'PASS' if backend_success else 'FAIL'}")
    print(f"  Data Integrity Tests: {'PASS' if integrity_success else 'FAIL'}")
    print(f"  Frontend Component Tests: {'PASS' if frontend_success else 'FAIL'}")
    print(f"  Coverage Report: {'GENERATED' if coverage_success else 'FAILED'}")
    
    overall_success = backend_success and integrity_success and frontend_success
    print(f"\nOverall Result: {'PASS' if overall_success else 'FAIL'}")
    
    # Write report to file
    report_path = os.path.join(
        os.path.dirname(os.path.abspath(__file__)),
        f"add_missing_days_test_report_{now.strftime('%Y%m%d_%H%M%S')}.txt"
    )
    
    with open(report_path, "w") as f:
        f.write(f"Add Missing Days Tool Test Report\n")
        f.write(f"================================\n\n")
        f.write(f"Test Run: {now.strftime('%Y-%m-%d %H:%M:%S')}\n\n")
        f.write(f"Test Results:\n")
        f.write(f"  Backend API Tests: {'PASS' if backend_success else 'FAIL'}\n")
        f.write(f"  Data Integrity Tests: {'PASS' if integrity_success else 'FAIL'}\n")
        f.write(f"  Frontend Component Tests: {'PASS' if frontend_success else 'FAIL'}\n")
        f.write(f"  Coverage Report: {'GENERATED' if coverage_success else 'FAILED'}\n\n")
        f.write(f"Overall Result: {'PASS' if overall_success else 'FAIL'}\n")
    
    print(f"\nTest report saved to: {report_path}")
    
    return overall_success

def main():
    """Main function to run all tests."""
    print_header("Add Missing Days Tool - Test Suite")
    
    # Run the tests
    backend_success = run_backend_tests()
    integrity_success = run_data_integrity_tests()
    frontend_success = run_frontend_tests()
    coverage_success = run_coverage_report()
    
    # Generate the report
    overall_success = generate_test_report(
        backend_success,
        integrity_success,
        frontend_success,
        coverage_success
    )
    
    # Return appropriate exit code
    return 0 if overall_success else 1

if __name__ == "__main__":
    sys.exit(main())