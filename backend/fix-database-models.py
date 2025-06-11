#!/usr/bin/env python3
"""
Script to fix SQLAlchemy model conflicts and reinitialize the database
"""

import sys
import os

# Add the project root to Python path
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, project_root)

try:
    # Import and run the fix
    from .fix_models import fix_model_conflicts

    print("Starting database model fix...")
    fix_model_conflicts()
    print("Database model fix completed successfully!")

except ImportError as e:
    print(f"Import error: {e}")
    print("Make sure you're running this from the project root directory")

except Exception as e:
    print(f"Error running database fix: {e}")
    import traceback
    traceback.print_exc()
