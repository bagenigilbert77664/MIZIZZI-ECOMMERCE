#!/usr/bin/env python3
"""
Script to automatically fix position -> sort_order references
"""

import os
import re

def fix_position_references():
    """Fix all position references to sort_order"""
    backend_dir = os.path.dirname(os.path.abspath(__file__))

    # Files to fix
    files_to_fix = []

    # Walk through all Python files
    for root, dirs, files in os.walk(backend_dir):
        # Skip virtual environment and cache directories
        if 'venv' in root or '__pycache__' in root or '.git' in root:
            continue

        for file in files:
            if file.endswith('.py'):
                file_path = os.path.join(root, file)
                files_to_fix.append(file_path)

    fixed_files = []

    for file_path in files_to_fix:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()

            original_content = content

            # Replace patterns (be careful to only replace ProductImage related ones)
            replacements = [
                (r'ProductImage\.position\b', 'ProductImage.sort_order'),
                (r'img\.position\b', 'img.sort_order'),
                (r'image\.position\b', 'image.sort_order'),
                (r'\.order_by$$ProductImage\.position$$', '.order_by(ProductImage.sort_order)'),
                (r'\.order_by$$.*\.position$$', lambda m: m.group(0).replace('.position', '.sort_order')),
            ]

            for pattern, replacement in replacements:
                if callable(replacement):
                    content = re.sub(pattern, replacement, content)
                else:
                    content = re.sub(pattern, replacement, content)

            # Only write if content changed
            if content != original_content:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                fixed_files.append(file_path)
                print(f"Fixed: {file_path}")

        except Exception as e:
            print(f"Error processing {file_path}: {e}")

    return fixed_files

if __name__ == "__main__":
    print("=== Fixing position references ===")
    fixed = fix_position_references()

    if fixed:
        print(f"\nFixed {len(fixed)} files:")
        for file in fixed:
            print(f"  - {file}")
    else:
        print("No files needed fixing!")

    print("\n=== Fix complete ===")
