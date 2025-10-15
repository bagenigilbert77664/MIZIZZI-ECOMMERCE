"""
Performance tests for the validation system of Mizizzi E-commerce platform.
"""
import unittest
import time
from backend.app import create_app, db
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

class ValidationPerformanceTestCase(unittest.TestCase):
    """Test case for validation performance."""

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

    def test_validation_utils_performance(self):
        """Test performance of validation utility functions."""
        # Test is_valid_string performance
        start_time = time.time()
        for _ in range(1000):
            is_valid_string("Hello World", min_length=2, max_length=100, pattern=r'^[a-zA-Z\s]+$')
        end_time = time.time()
        print(f"\nis_valid_string: {end_time - start_time:.4f} seconds for 1000 iterations")

        # Test is_valid_email performance
        start_time = time.time()
        for _ in range(1000):
            is_valid_email("test@example.com")
        end_time = time.time()
        print(f"is_valid_email: {end_time - start_time:.4f} seconds for 1000 iterations")

        # Test is_valid_kenyan_phone performance
        start_time = time.time()
        for _ in range(1000):
            is_valid_kenyan_phone("+254712345678")
        end_time = time.time()
        print(f"is_valid_kenyan_phone: {end_time - start_time:.4f} seconds for 1000 iterations")

        # Test is_strong_password performance
        start_time = time.time()
        for _ in range(1000):
            is_strong_password("P@ssw0rd")
        end_time = time.time()
        print(f"is_strong_password: {end_time - start_time:.4f} seconds for 1000 iterations")

        # Test sanitize_html performance
        start_time = time.time()
        for _ in range(1000):
            sanitize_html("<p>Hello</p><script>alert('XSS')</script>")
        end_time = time.time()
        print(f"sanitize_html: {end_time - start_time:.4f} seconds for 1000 iterations")

    def test_validators_performance(self):
        """Test performance of validator classes."""
        # Test UserValidator performance
        user_data = {
            'name': 'Test User',
            'email': 'test@example.com',
            'password': 'P@ssw0rd',
            'phone': '+254712345678'
        }
        start_time = time.time()
        for _ in range(1000):
            validator = UserValidator(user_data)
            validator.is_valid()
        end_time = time.time()
        print(f"\nUserValidator: {end_time - start_time:.4f} seconds for 1000 iterations")

        # Test AddressValidator performance
        address_data = {
            'first_name': 'John',
            'last_name': 'Doe',
            'address_line1': '123 Main St',
            'city': 'Nairobi',
            'state': 'Nairobi',
            'postal_code': '00100',
            'country': 'Kenya',
            'phone': '+254712345678'
        }
        start_time = time.time()
        for _ in range(1000):
            validator = AddressValidator(address_data)
            validator.is_valid()
        end_time = time.time()
        print(f"AddressValidator: {end_time - start_time:.4f} seconds for 1000 iterations")

        # Test ProductValidator performance
        product_data = {
            'name': 'Test Product',
            'slug': 'test-product',
            'description': 'Test product description',
            'price': 100.0,
            'stock': 10,
            'category_id': 1  # Assuming this exists
        }
        start_time = time.time()
        for _ in range(1000):
            validator = ProductValidator(product_data)
            validator.is_valid()
        end_time = time.time()
        print(f"ProductValidator: {end_time - start_time:.4f} seconds for 1000 iterations")

    def test_complex_validation_performance(self):
        """Test performance of complex validation scenarios."""
        # Test validation with large data
        large_description = "Lorem ipsum " * 1000  # ~12000 characters
        product_data = {
            'name': 'Test Product',
            'slug': 'test-product',
            'description': large_description,
            'price': 100.0,
            'stock': 10,
            'category_id': 1  # Assuming this exists
        }

        start_time = time.time()
        validator = ProductValidator(product_data)
        validator.is_valid()
        end_time = time.time()
        print(f"\nComplex validation (large description): {end_time - start_time:.4f} seconds")

        # Test validation with many fields
        product_data_many_fields = {
            'name': 'Test Product',
            'slug': 'test-product',
            'description': 'Test product description',
            'price': 100.0,
            'sale_price': 80.0,
            'stock': 10,
            'category_id': 1,
            'brand_id': 1,
            'image_urls': ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
            'thumbnail_url': 'https://example.com/thumbnail.jpg',
            'sku': 'TEST-SKU-123',
            'weight': 1.5,
            'dimensions': {'length': 10, 'width': 5, 'height': 2},
            'is_featured': True,
            'is_new': True,
            'is_sale': True,
            'meta_title': 'Test Product | Mizizzi',
            'meta_description': 'This is a test product for Mizizzi E-commerce platform.'
        }

        start_time = time.time()
        validator = ProductValidator(product_data_many_fields)
        validator.is_valid()
        end_time = time.time()
        print(f"Complex validation (many fields): {end_time - start_time:.4f} seconds")


if __name__ == '__main__':
    unittest.main()
