import unittest
import os
import sys
from unittest.mock import patch, MagicMock
from functools import wraps
from datetime import datetime

# Add the parent directory to the path so we can import the app
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.configuration.extensions import db
from backend.models.models import User, UserRole
from backend import create_app
from backend.validations.validation import (
    validate_user_registration, validate_user_login,
    validate_address_creation, validate_address_update,
    admin_required
)

class ValidationTestCase(unittest.TestCase):
    """Test case for validation decorators"""

    def setUp(self):
        """Set up test client and initialize database"""
        self.app = create_app('testing')
        self.app_context = self.app.app_context()
        self.app_context.push()
        self.client = self.app.test_client()
        db.create_all()

        # Create a test user
        test_user = User(
            name='Test User',
            email='test@example.com',
            is_active=True,
            email_verified=True,
            created_at=datetime.utcnow()
        )
        test_user.set_password('Password123!')
        db.session.add(test_user)

        # Create an admin user
        admin_user = User(
            name='Admin User',
            email='admin@example.com',
            is_active=True,
            email_verified=True,
            role=UserRole.ADMIN,
            created_at=datetime.utcnow()
        )
        admin_user.set_password('AdminPass123!')
        db.session.add(admin_user)

        db.session.commit()

    def tearDown(self):
        """Clean up after tests"""
        db.session.remove()
        db.drop_all()
        self.app_context.pop()

    def test_admin_required_decorator(self):
        """Test admin_required decorator"""
        # Create a mock Flask request context
        with self.app.test_request_context():
            # Create a mock function to decorate
            @admin_required
            def admin_function():
                return "Admin access granted"

            # Mock get_jwt_identity to return admin user ID
            admin = User.query.filter_by(email='admin@example.com').first()
            with patch('backend.validations.validation.get_jwt_identity', return_value=str(admin.id)):
                # Should succeed for admin
                result = admin_function()
                self.assertEqual(result, "Admin access granted")

            # Mock get_jwt_identity to return regular user ID
            regular_user = User.query.filter_by(email='test@example.com').first()
            with patch('backend.validations.validation.get_jwt_identity', return_value=str(regular_user.id)):
                # Should fail for regular user
                with self.assertRaises(Exception) as context:
                    admin_function()
                self.assertIn("Forbidden", str(context.exception))

    def test_validate_user_registration(self):
        """Test user registration validation"""
        # Create a mock Flask request context with valid data
        valid_data = {
            'name': 'New User',
            'email': 'new@example.com',
            'password': 'ValidPassword123!'
        }

        with self.app.test_request_context(json=valid_data):
            # Create a mock function to decorate
            @validate_user_registration()
            def register_function():
                from flask import g
                return g.validated_data

            # Should succeed with valid data
            result = register_function()
            self.assertEqual(result['name'], 'New User')
            self.assertEqual(result['email'], 'new@example.com')

        # Test with invalid data (missing name)
        invalid_data = {
            'email': 'invalid@example.com',
            'password': 'ValidPassword123!'
        }

        with self.app.test_request_context(json=invalid_data):
            @validate_user_registration()
            def invalid_register_function():
                return "This should not be reached"

            # Should fail with invalid data
            with self.assertRaises(Exception) as context:
                invalid_register_function()
            self.assertIn("Name is required", str(context.exception))

    def test_validate_user_login(self):
        """Test user login validation"""
        # Create a mock Flask request context with valid data
        valid_data = {
            'identifier': 'login@example.com',
            'password': 'LoginPassword123!'
        }

        with self.app.test_request_context(json=valid_data):
            # Create a mock function to decorate
            @validate_user_login()
            def login_function():
                from flask import g
                return g.validated_data

            # Should succeed with valid data
            result = login_function()
            self.assertEqual(result['identifier'], 'login@example.com')
            self.assertEqual(result['password'], 'LoginPassword123!')

        # Test with invalid data (missing password)
        invalid_data = {
            'identifier': 'login@example.com'
        }

        with self.app.test_request_context(json=invalid_data):
            @validate_user_login()
            def invalid_login_function():
                return "This should not be reached"

            # Should fail with invalid data
            with self.assertRaises(Exception) as context:
                invalid_login_function()
            self.assertIn("Password is required", str(context.exception))

    def test_validate_address_creation(self):
        """Test address creation validation"""
        # Create a mock Flask request context with valid data
        valid_data = {
            'first_name': 'John',
            'last_name': 'Doe',
            'address_line1': '123 Main St',
            'city': 'Anytown',
            'state': 'CA',
            'postal_code': '12345',
            'country': 'USA',
            'phone': '+1234567890'
        }

        with self.app.test_request_context(json=valid_data):
            # Create a mock function to decorate
            @validate_address_creation(lambda: '1')  # Mock user_id getter
            def address_function():
                from flask import g
                return g.validated_data

            # Should succeed with valid data
            result = address_function()
            self.assertEqual(result['first_name'], 'John')
            self.assertEqual(result['last_name'], 'Doe')
            self.assertEqual(result['address_line1'], '123 Main St')

        # Test with invalid data (missing required field)
        invalid_data = {
            'first_name': 'John',
            'last_name': 'Doe',
            # Missing address_line1
            'city': 'Anytown',
            'state': 'CA',
            'postal_code': '12345',
            'country': 'USA'
        }

        with self.app.test_request_context(json=invalid_data):
            @validate_address_creation(lambda: '1')
            def invalid_address_function():
                return "This should not be reached"

            # Should fail with invalid data
            with self.assertRaises(Exception) as context:
                invalid_address_function()
            self.assertIn("Address line 1 is required", str(context.exception))

if __name__ == '__main__':
    unittest.main()
