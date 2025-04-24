import re
import sys

def test_pattern(pattern, sample_text):
    """Test a regex pattern against sample text and print matches."""
    compiled = re.compile(pattern)
    matches = compiled.findall(sample_text)
    
    print(f"Pattern: {pattern}")
    print(f"Found {len(matches)} matches:")
    for i, match in enumerate(matches[:10]):  # Show first 10 matches
        print(f"  {i+1}. {match}")
    
    if len(matches) > 10:
        print(f"  ... and {len(matches) - 10} more")
    
    return matches

def main():
    if len(sys.argv) < 2:
        print("Usage: python update_extractor.py sample_text_file.txt")
        return
    
    # Load sample text
    with open(sys.argv[1], 'r', encoding='utf-8') as file:
        sample_text = file.read()
    
    print(f"Loaded {len(sample_text)} characters from {sys.argv[1]}")
    
    # Test different patterns
    print("\nTesting name pattern:")
    # Try different name patterns
    name_patterns = [
        r'Name:\s*(\w+\s\w+)',
        r'Employee[:\s]+(\w+\s+\w+)',
        r'Employee[^\n]*?[:\s]+([A-Za-z]+\s+[A-Za-z]+)',
        r'Employee Name[:\s]+([^\n]+)'
    ]
    
    for pattern in name_patterns:
        test_pattern(pattern, sample_text)
    
    print("\nTesting date pattern:")
    # Try different date patterns
    date_patterns = [
        r'Date:\s*(\d{2}/\d{2}/\d{4})',
        r'(\d{1,2}/\d{1,2}/\d{4})',
        r'(\d{1,2}-\d{1,2}-\d{4})',
        r'Date[:\s]+(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})'
    ]
    
    for pattern in date_patterns:
        test_pattern(pattern, sample_text)
    
    print("\nTesting time pattern:")
    # Try different time patterns
    time_patterns = [
        r'Time:\s*(\d{2}:\d{2})',
        r'(\d{1,2}:\d{2}\s*[APMapm]{2})',
        r'(\d{1,2}:\d{2}(?:\s*[APMapm]{2})?)',
        r'Time In/Out[:\s]+(\d{1,2}:\d{2})'
    ]
    
    for pattern in time_patterns:
        test_pattern(pattern, sample_text)

if __name__ == "__main__":
    main()
