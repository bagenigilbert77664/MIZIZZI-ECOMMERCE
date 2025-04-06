"""
Edge case tests for the validation system of Mizizzi E-commerce platform.
"""
import unittest
from backend.app import create_app, db
from backend.app.models.models import (
    User, UserRole, Address, AddressType, Product, Category, Brand,
    ProductVariant, CartItem, Order, OrderStatus, Payment, PaymentStatus,
    Review, Coupon, CouponType
)
from backend.app.validations.validation_utils import (
    is_valid_string, is_valid_number, is_valid_integer, is_valid_email,
    is_valid_url, is_valid_date, is_valid_kenyan_phone, is_valid_kenyan_id,
    is_valid_kenyan_postal_code, is_valid_nairobi_area, is_valid_mpesa_code,
    is_strong_password, sanitize_string, sanitize_html
)
from backend.app.validations.validators import (
    UserValidator, LoginValidator, AddressValidator, ProductValidator,
    ProductVariantValidator, CartItemValidator, OrderValidator,
    PaymentValidator, ReviewValidator
)
from werkzeug.security import generate_password_hash
from datetime import datetime, timedelta

class ValidationEdgeCasesTestCase(unittest.TestCase):
    """Test case for validation edge cases."""

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

    def test_empty_data(self):
        """Test validators with empty data."""
        # Empty data for user validator
        validator = UserValidator({})
        self.assertFalse(validator.is_valid())
        errors = validator.get_errors()
        self.assertIn('name', errors)
        self.assertIn('email', errors)
        self.assertIn('password', errors)

        # Empty data for login validator
        validator = LoginValidator({})
        self.assertFalse(validator.is_valid())
        errors = validator.get_errors()
        self.assertIn('email', errors)
        self.assertIn('password', errors)

        # Empty data for address validator
        validator = AddressValidator({})
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

    def test_none_values(self):
        """Test validators with None values."""
        # None values for user validator
        data = {
            'name': None,
            'email': None,
            'password': None,
            'phone': None
        }
        validator = UserValidator(data)
        self.assertFalse(validator.is_valid())
        errors = validator.get_errors()
        self.assertIn('name', errors)
        self.assertIn('email', errors)
        self.assertIn('password', errors)

        # None values for product validator
        data = {
            'name': None,
            'slug': None,
            'price': None,
            'category_id': None
        }
        validator = ProductValidator(data)
        self.assertFalse(validator.is_valid())
        errors = validator.get_errors()
        self.assertIn('name', errors)
        self.assertIn('slug', errors)
        self.assertIn('price', errors)
        self.assertIn('category_id', errors)

    def test_extreme_values(self):
        """Test validators with extreme values."""
        # Very long strings
        very_long_string = 'a' * 1000
        data = {
            'name': very_long_string,
            'email': f'{very_long_string}@example.com',
            'password': very_long_string,
            'phone': '+254712345678'
        }
        validator = UserValidator(data)
        self.assertFalse(validator.is_valid())
        errors = validator.get_errors()
        self.assertIn('name', errors)
        self.assertIn('email', errors)

        # Create a product for cart item validation
        category = Category(name='Test Category', slug='test-category')
        db.session.add(category)
        db.session.commit()

        product = Product(
            name='Test Product',
            slug='test-product',
            price=100.0,
            category_id=category.id,
            stock=10
        )
        db.session.add(product)
        db.session.commit()

        # Very large numbers
        data = {
            'product_id': product.id,
            'quantity': 999999999
        }
        validator = CartItemValidator(data)
        self.assertFalse(validator.is_valid())
        errors = validator.get_errors()
        self.assertIn('quantity', errors)

        # Very small numbers - create a category first
        data = {
            'name': 'Test Product 2',
            'slug': 'test-product-2',
            'price': 0.0000001,
            'category_id': category.id  # Use the existing category
        }
        validator = ProductValidator(data)
        self.assertTrue(validator.is_valid())  # Should be valid as long as price > 0

    def test_special_characters(self):
        """Test validators with special characters."""
        # Special characters in strings
        data = {
            'name': 'Test User !@#$%^&*()',
            'email': 'test+special@example.com',  # Valid email with +
            'password': 'P@ssw0rd!@#',
            'phone': '+254712345678'
        }
        validator = UserValidator(data)
        self.assertTrue(validator.is_valid())

        # Special characters in product slug (should fail)
        data = {
            'name': 'Test Product',
            'slug': 'test-product!@#',
            'price': 100.0,
            'category_id': 1  # Assuming this exists
        }
        validator = ProductValidator(data)
        self.assertFalse(validator.is_valid())
        errors = validator.get_errors()
        self.assertIn('slug', errors)

    def test_unicode_characters(self):
        """Test validators with Unicode characters."""
        # Unicode characters in strings
        data = {
            'name': 'Tést Üsér 你好',
            'email': 'test@example.com',
            'password': 'P@ssw0rd',
            'phone': '+254712345678'
        }
        validator = UserValidator(data)
        self.assertTrue(validator.is_valid())

        # Unicode characters in address
        data = {
            'first_name': 'Jöhn',
            'last_name': 'Döé',
            'address_line1': '123 Mäin St 你好',
            'city': 'Nairobi',
            'state': 'Nairobi',
            'postal_code': '00100',
            'country': 'Kenya',
            'phone': '+254712345678'
        }
        validator = AddressValidator(data)
        self.assertTrue(validator.is_valid())

    def test_security_edge_cases(self):
        """Test validators with security edge cases."""
        # XSS attempts
        data = {
            'name': '<script>alert("XSS")</script>',
            'email': 'test@example.com',
            'password': 'P@ssw0rd',
            'phone': '+254712345678'
        }
        validator = UserValidator(data)
        self.assertTrue(validator.is_valid())  # Name should be valid, sanitization happens elsewhere

        # SQL injection attempts
        data = {
            'name': "Robert'); DROP TABLE users; --",
            'email': 'test@example.com',
            'password': 'P@ssw0rd',
            'phone': '+254712345678'
        }
        validator = UserValidator(data)
        self.assertTrue(validator.is_valid())  # Name should be valid, sanitization happens elsewhere

        # Test HTML sanitization
        html = '<p>Hello</p><script>alert("XSS")</script><iframe src="evil.com"></iframe>'
        sanitized = sanitize_html(html)
        self.assertEqual(sanitized, '<p>hello</p>')

        # Test string sanitization with expected output
        string = "Robert'); DROP TABLE users; --"
        sanitized = sanitize_string(string)
        self.assertEqual(sanitized, "Robert DROP TABLE users ")

    def test_boundary_conditions(self):
        """Test validators with boundary conditions."""
        # Minimum valid password
        data = {
            'name': 'Test User',
            'email': 'test@example.com',
            'password': 'Aa1!1234',  # Minimum 8 chars with all requirements
            'phone': '+254712345678'
        }
        validator = UserValidator(data)
        self.assertTrue(validator.is_valid())

        # Almost valid password
        data = {
            'name': 'Test User',
            'email': 'test@example.com',
            'password': 'Aa1!123',  # 7 chars, one short
            'phone': '+254712345678'
        }
        validator = UserValidator(data)
        self.assertFalse(validator.is_valid())
        errors = validator.get_errors()
        self.assertIn('password', errors)

        # Boundary for name length
        data = {
            'name': 'AB',  # Minimum 2 chars
            'email': 'test@example.com',
            'password': 'P@ssw0rd',
            'phone': '+254712345678'
        }
        validator = UserValidator(data)
        self.assertTrue(validator.is_valid())

        data = {
            'name': 'A',  # 1 char, too short
            'email': 'test@example.com',
            'password': 'P@ssw0rd',
            'phone': '+254712345678'
        }
        validator = UserValidator(data)
        self.assertFalse(validator.is_valid())
        errors = validator.get_errors()
        self.assertIn('name', errors)


if __name__ == '__main__':
    unittest.main()
