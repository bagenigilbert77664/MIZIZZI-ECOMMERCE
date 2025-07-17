import unittest
import sys
import os

# Add the parent directory to the path so we can import the app
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Import test modules
from backend.tests.test_auth import AuthTestCase
from backend.tests.test_integration_auth import IntegrationAuthTestCase
from backend.tests.test_user_model import UserModelTestCase
from backend.tests.test_validation import ValidationTestCase

if __name__ == '__main__':
    # Create a test suite
    test_suite = unittest.TestSuite()

    # Add test cases
    test_suite.addTest(unittest.makeSuite(UserModelTestCase))
    test_suite.addTest(unittest.makeSuite(ValidationTestCase))
    test_suite.addTest(unittest.makeSuite(AuthTestCase))
    test_suite.addTest(unittest.makeSuite(IntegrationAuthTestCase))

    # Run the tests
    runner = unittest.TextTestRunner(verbosity=2)
    runner.run(test_suite)
