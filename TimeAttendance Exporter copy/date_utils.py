import re
from datetime import datetime, timedelta

# Day abbreviations
DAY_ABBR = ['Mon.', 'Tue.', 'Wed.', 'Thu.', 'Fri.', 'Sat.', 'Sun.']

def extract_report_period(text):
    """
    Extract report period dates from text.
    Returns (start_date, end_date) tuple, or (None, None) if not found.
    """
    # Try multiple date formats
    patterns = [
        # Format: From YYYY/MM/DD to YYYY/MM/DD
        r"From\s+(\d{4}/\d{2}/\d{2})\s+to\s+(\d{4}/\d{2}/\d{2})",
        # Format: From YYYY-MM-DD to YYYY-MM-DD
        r"From\s+(\d{4}-\d{2}-\d{2})\s+to\s+(\d{4}-\d{2}-\d{2})",
        # Format: DD/MM/YYYY to DD/MM/YYYY
        r"(\d{2}/\d{2}/\d{4})\s+to\s+(\d{2}/\d{2}/\d{4})"
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            return match.group(1), match.group(2)
    
    # If no matches found, try to find any dates
    date_pattern = r"((?:\d{4}[-/]\d{2}[-/]\d{2})|(?:\d{2}/\d{2}/\d{4}))"
    dates = re.findall(date_pattern, text)
    
    if len(dates) >= 2:
        # Use first and last date found
        return dates[0], dates[-1]
    
    return None, None

def generate_date_range(start_date, end_date):
    """
    Generate a list of dates in YYYY-MM-DD format between start_date and end_date.
    Handles different date formats (YYYY/MM/DD, YYYY-MM-DD, etc.)
    """
    # Normalize date formats
    start = parse_date(start_date)
    end = parse_date(end_date)
    
    if not start or not end:
        return []
    
    # Generate date range
    dates = []
    current = start
    
    while current <= end:
        dates.append(current.strftime('%Y-%m-%d'))
        current += timedelta(days=1)
    
    return dates

def parse_date(date_string):
    """Parse date string in various formats."""
    formats = ['%Y/%m/%d', '%Y-%m-%d', '%d/%m/%Y', '%m/%d/%Y']
    
    for fmt in formats:
        try:
            return datetime.strptime(date_string, fmt)
        except ValueError:
            continue
    
    return None

def get_day_abbr(date_string):
    """Get day abbreviation (Mon., Tue., etc.) for a date string."""
    try:
        date_obj = parse_date(date_string)
        if date_obj:
            # Weekday() returns 0 for Monday, 6 for Sunday
            return DAY_ABBR[date_obj.weekday()]
    except:
        pass
    
    return ""

def get_day_of_week(date_string):
    """Get day of week (0=Mon, 6=Sun) for a date string."""
    try:
        date_obj = parse_date(date_string)
        if date_obj:
            return date_obj.weekday()
    except:
        pass
    
    return -1  # Invalid date

def is_weekend(date_string):
    """Check if date is a weekend day (only Sunday is considered Weekend)."""
    day = get_day_of_week(date_string)
    return day == 6  # Only Sunday (6) is Weekend, Saturday (5) is a normal working day
