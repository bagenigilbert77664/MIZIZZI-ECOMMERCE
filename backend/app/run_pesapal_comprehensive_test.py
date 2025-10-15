#!/usr/bin/env python3
"""
Simple runner for the Pesapal comprehensive test
This script provides a clean interface to run the comprehensive Pesapal tests
"""

import os
import sys
import subprocess

def main():
    """Run the comprehensive Pesapal test"""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    test_script = os.path.join(script_dir, 'test_pesapal_comprehensive.py')

    print("🚀 Running Pesapal Comprehensive Test...")
    print("=" * 50)

    try:
        # Run the comprehensive test script
        result = subprocess.run([sys.executable, test_script],
                              capture_output=False,
                              text=True)

        if result.returncode == 0:
            print("\n✅ Pesapal comprehensive test completed successfully!")
            return True
        else:
            print("\n❌ Pesapal comprehensive test failed!")
            return False

    except Exception as e:
        print(f"\n❌ Error running comprehensive test: {e}")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
