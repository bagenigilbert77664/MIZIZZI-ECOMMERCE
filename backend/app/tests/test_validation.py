"""
Tests for the validation system of Mizizzi E-commerce platform.
"""
import unittest
from app import create_app, db
from app.models import User, UserRole, Address, AddressType, Product, Category, Brand
from app.validation_utils import (
    is_valid_string, is_valid_number, is_valid_integer, is_valid_email,
    is_valid_url, is_valid_date, is_valid_kenyan_phone, is_valid_kenyan_id,
    is_valid_kenyan_postal_code, is_valid_nairobi_area, is_valid_mpesa_code,
    is_strong_password, sanitize_string, sanitize_html
)
from app.validators import (
    UserValidator, LoginValidator, AddressValidator, ProductValidator,
    ProductVariantValidator, CartItemValidator, OrderValidator,
    PaymentValidator, ReviewValidator
)

class ValidationUtilsTestCase(unittest.TestCase):
    """Test case for validation utilities."""

    def test_is_valid_string(self):
        """Test string validation."""
        self.assertTrue(is_valid_string("Hello"))
        self.assertTrue(is_valid_string("Hello", min_length=5))
        self.assertFalse(is_valid_string("Hi", min_length=3))
        self.assertTrue(is_valid_string("Hello", max_length=10))
        self.assertFalse(is_valid_string("Hello World", max_length=5))
        self.assertTrue(is_valid_string("abc123", pattern=r'^[a-z0-9]+$'))
        self.assertFalse(is_valid_string("ABC123", pattern=r'^[a-z0-9]+$'))

    def test_is_valid_number(self):
        """Test number validation."""
        self.assertTrue(is_valid_number(10))
        self.assertTrue(is_valid_number("10"))
        self.assertTrue(is_valid_number(10.5))
        self.assertTrue(is_valid_number("10.5"))
        self.assertFalse(is_valid_number("abc"))
        self.assertTrue(is_valid_number(10, min_value=5))
        self.assertFalse(is_valid_number(10, min_value=15))
        self.assertTrue(is_valid_number(10, max_value=15))
        self.assertFalse(is_valid_number(10, max_value=5))

    def test_is_valid_integer(self):
        """Test integer validation."""
        self.assertTrue(is_valid_integer(10))
        self.assertTrue(is_valid_integer("10"))
        self.assertFalse(is_valid_integer(10.5))
        self.assertFalse(is_valid_integer("10.5"))
        self.assertFalse(is_valid_integer("abc"))

    def test_is_valid_email(self):
        """Test email validation."""
        self.assertTrue(is_valid_email("user@example.com"))
        self.assertTrue(is_valid_email("user.name@example.co.ke"))
        self.assertFalse(is_valid_email("user@"))
        self.assertFalse(is_valid_email("user@.com"))
        self.assertFalse(is_valid_email("user@example"))

    def test_is_valid_url(self):
        """Test URL validation."""
        self.assertTrue(is_valid_url("https://example.com"))
        self.assertTrue(is_valid_url("http://example.com"))
        self.assertTrue(is_valid_url("www.example.com"))
        self.assertTrue(is_valid_url("example.com"))
        self.assertFalse(is_valid_url("example"))

    def test_is_valid_date(self):
        """Test date validation."""
        self.assertTrue(is_valid_date("2023-01-01"))
        self.assertFalse(is_valid_date("01-01-2023"))
        self.assertTrue(is_valid_date("01/01/2023", format="%m/%d/%Y"))
        self.assertFalse(is_valid_date("2023/01/01", format="%m/%d/%Y"))

    def test_is_valid_kenyan_phone(self):
        """Test Kenyan phone number validation."""
        self.assertTrue(is_valid_kenyan_phone("+254712345678"))
        self.assertTrue(is_valid_kenyan_phone("254712345678"))
        self.assertTrue(is_valid_kenyan_phone("0712345678"))
        self.assertTrue(is_valid_kenyan_phone("0112345678"))
        self.assertFalse(is_valid_kenyan_phone("712345678"))
        self.assertFalse(is_valid_kenyan_phone("+255712345678"))
        self.assertFalse(is_valid_kenyan_phone("0812345678"))

    def test_is_valid_kenyan_id(self):
        """Test Kenyan ID validation."""
        self.assertTrue(is_valid_kenyan_id("12345678"))
        self.assertTrue(is_valid_kenyan_id("1234567"))
        self.assertFalse(is_valid_kenyan_id("123456"))
        self.assertFalse(is_valid_kenyan_id("123456789"))

    def test_is_valid_kenyan_postal_code(self):
        """Test Kenyan postal code validation."""
        self.assertTrue(is_valid_kenyan_postal_code("00100"))
        self.assertTrue(is_valid_kenyan_postal_code("00200"))
        self.assertFalse(is_valid_kenyan_postal_code("0010"))
        self.assertFalse(is_valid_kenyan_postal_code("001000"))

    def test_is_valid_nairobi_area(self):
        """Test Nairobi area validation."""
        self.assertTrue(is_valid_nairobi_area("Westlands"))
        self.assertTrue(is_valid_nairobi_area("westlands"))
        self.assertTrue(is_valid_nairobi_area("Karen"))
        self.assertFalse(is_valid_nairobi_area("Mombasa"))

    def test_is_valid_mpesa_code(self):
        """Test M-Pesa code validation."""
        self.assertTrue(is_valid_mpesa_code("ABC123456"))
        self.assertTrue(is_valid_mpesa_code("PXL765432"))
        self.assertFalse(is_valid_mpesa_code("abc123456"))
        self.assertFalse(is_valid_mpesa_code("AB12345678"))  # Too long

    def test_is_strong_password(self):
        """Test password strength validation."""
        self.assertTrue(is_strong_password("P@ssw0rd"))
        self.assertTrue(is_strong_password("Str0ng!P@ss"))
        self.assertFalse(is_strong_password("password"))
        self.assertFalse(is_strong_password("PASSWORD"))
        self.assertFalse(is_strong_password("12345678"))
        self.assertFalse(is_strong_password("Pass123"))
        self.assertFalse(is_strong_password("Pass!word"))

    def test_sanitize_string(self):
        """Test string sanitization."""
        self.assertEqual(sanitize_string("Hello World"), "Hello World")
        self.assertEqual(sanitize_string("<script>alert('XSS')</script>"), "alertXSS")
        self.assertEqual(sanitize_string("'; DROP TABLE users; --"), " DROP TABLE users ")

    def test_sanitize_html(self):
        """Test HTML sanitization."""
        self.assertEqual(sanitize_html("<p>Hello World</p>"), "<p>hello world</p>")
        self.assertEqual(sanitize_html("<script>alert('XSS')</script>"), "")
        self.assertEqual(sanitize_html("<p onclick='alert()'>Click me</p>"), "<p>click me</p>")

class ValidatorsTestCase(unittest.TestCase):
    """Test case for validators."""

    def setUp(self):
        """Set up test environment."""
        self.app = create_app('testing')
        self.app_context = self.app.app_context()
        self.app_context.push()
        db.create_all()

    def tearDown(self):
        """Tear down test environment."""
        db.session.remove()
        db.drop_all()
        self.app_context.pop()

    def test_user_validator(self):
        """Test user validator."""
        # Valid data
        data = {
            'name': 'John Doe',
            'email': 'john@example.com',
            'password': 'P@ssw0rd',
            'phone': '+254712345678'
        }
        validator = UserValidator(data)
        self.assertTrue(validator.is_valid())

        # Invalid data
        data = {
            'name': 'J',  # Too short
            'email': 'invalid-email',
            'password': 'password',  # Weak password
            'phone': '712345678'  # Invalid format
        }
        validator = UserValidator(data)
        self.assertFalse(validator.is_valid())
        errors = validator.get_errors()
        self.assertIn('name', errors)
        self.assertIn('email', errors)
        self.assertIn('password', errors)
        self.assertIn('phone', errors)

    def test_login_validator(self):
        """Test login validator."""
        # Valid data
        data = {
            'email': 'john@example.com',
            'password': 'P@ssw0rd'
        }
        validator = LoginValidator(data)
        self.assertTrue(validator.is_valid())

        # Invalid data
        data = {
            'email': '',
            'password': ''
        }
        validator = LoginValidator(data)
        self.assertFalse(validator.is_valid())
        errors = validator.get_errors()
        self.assertIn('email', errors)
        self.assertIn('password', errors)

    def test_address_validator(self):
        """Test address validator."""
        # Valid data
        data = {
            'first_name': 'John',
            'last_name': 'Doe',
            'address_line1': '123 Main St',
            'city': 'Nairobi',
            'state': 'Nairobi',
            'postal_code': '00100',
            'country': 'Kenya',
            'phone': '+254712345678'
        }
        validator = AddressValidator(data)
        self.assertTrue(validator.is_valid())

        # Invalid data
        data = {
            'first_name': 'J',  # Too short
            'last_name': 'D',  # Too short
            'address_line1': '123',  # Too short
            'city': 'Mombasa',  # Not Nairobi
            'state': '',
            'postal_code': '001',  # Invalid format
            'country': 'Uganda',  # Not Kenya
            'phone': '712345678'  # Invalid format
        }
        validator = AddressValidator(data)
        self.assertFalse(validator.is_valid())
        errors = validator.get_errors()
        self.assertIn('first_name', errors)
        self.assertIn('last_name', errors)
        self.assertIn('address_line1', errors)
        self.assertIn('city', errors)
        self.assertIn('state', errors)
        self.assertIn('postal_code', errors)
        self.assertIn('country', errors)
        self.assertIn('phone', errors)

if __name__ == '__main__':
    unittest.main()

