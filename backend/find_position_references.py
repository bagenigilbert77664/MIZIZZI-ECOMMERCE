#!/usr/bin/env python3
"""
Script to find all references to 'position' in the backend code
that should be 'sort_order' for ProductImage
"""

import os
import re

def find_position_references():
    """Find all files that reference 'position' in relation to ProductImage"""
    backend_dir = os.path.dirname(os.path.abspath(__file__))

    # Patterns to search for
    patterns = [
        r'\.position\b',  # .position attribute access
        r'position\s*=',  # position assignment
        r'ProductImage\.position',  # Direct ProductImage.sort_order
        r'img\.position',  # img.sort_order
        r'image\.position',  # image.sort_order
    ]

    found_files = []

    # Walk through all Python files
    for root, dirs, files in os.walk(backend_dir):
        # Skip virtual environment and cache directories
        if 'venv' in root or '__pycache__' in root or '.git' in root:
            continue

        for file in files:
            if file.endswith('.py'):
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()

                    # Check each pattern
                    for pattern in patterns:
                        matches = re.finditer(pattern, content, re.IGNORECASE)
                        for match in matches:
                            # Get line number
                            line_num = content[:match.start()].count('\n') + 1
                            line_content = content.split('\n')[line_num - 1].strip()

                            found_files.append({
                                'file': file_path,
                                'line': line_num,
                                'content': line_content,
                                'pattern': pattern
                            })

                except Exception as e:
                    print(f"Error reading {file_path}: {e}")

    return found_files

if __name__ == "__main__":
    print("=== Searching for 'position' references ===")
    references = find_position_references()

    if references:
        print(f"Found {len(references)} potential issues:")
        for ref in references:
            print(f"\nFile: {ref['file']}")
            print(f"Line {ref['line']}: {ref['content']}")
            print(f"Pattern: {ref['pattern']}")
    else:
        print("No 'position' references found!")

    print("\n=== Search complete ===")
