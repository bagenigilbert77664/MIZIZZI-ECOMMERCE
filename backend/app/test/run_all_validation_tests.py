"""
Script to run all validation tests for Mizizzi E-commerce platform.
"""
import unittest
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

# Import test modules
from app.test.test_validation import ValidationUtilsTestCase, ValidatorsTestCase
from app.test.test_api_validation import APIValidationTestCase
from app.test.test_validation_comprehensive import ValidationUtilsTestCase as ComprehensiveValidationUtilsTestCase
from app.test.test_validation_comprehensive import ValidatorsTestCase as ComprehensiveValidatorsTestCase
from app.test.test_validation_comprehensive import APIValidationTestCase as ComprehensiveAPIValidationTestCase
from app.test.test_validation_edge_cases import ValidationEdgeCasesTestCase
from app.test.test_validation_performance import ValidationPerformanceTestCase

def run_all_tests():
    """Run all validation tests."""
    # Create test suite
    test_suite = unittest.TestSuite()
    loader = unittest.TestLoader()

    # Add test cases from test_validation.py
    test_suite.addTest(loader.loadTestsFromTestCase(ValidationUtilsTestCase))
    test_suite.addTest(loader.loadTestsFromTestCase(ValidatorsTestCase))

    # Add test cases from test_api_validation.py
    test_suite.addTest(loader.loadTestsFromTestCase(APIValidationTestCase))

    # Add test cases from test_validation_comprehensive.py
    test_suite.addTest(loader.loadTestsFromTestCase(ComprehensiveValidationUtilsTestCase))
    test_suite.addTest(loader.loadTestsFromTestCase(ComprehensiveValidatorsTestCase))
    test_suite.addTest(loader.loadTestsFromTestCase(ComprehensiveAPIValidationTestCase))

    # Add test cases from test_validation_edge_cases.py
    test_suite.addTest(loader.loadTestsFromTestCase(ValidationEdgeCasesTestCase))

    # Add test cases from test_validation_performance.py
    test_suite.addTest(loader.loadTestsFromTestCase(ValidationPerformanceTestCase))

    # Run tests
    runner = unittest.TextTestRunner(verbosity=2)
    runner.run(test_suite)

if __name__ == '__main__':
    run_all_tests()
