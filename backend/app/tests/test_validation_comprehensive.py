"""
Comprehensive tests for the validation system of Mizizzi E-commerce platform.
"""
import unittest
import json
from app import create_app, db
from app.models import (
    User, UserRole, Address, AddressType, Product, Category, Brand,
    ProductVariant, CartItem, Order, OrderStatus, Payment, PaymentStatus,
    Review, Coupon, CouponType
)
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
from werkzeug.security import generate_password_hash
from datetime import datetime, timedelta

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
        self.assertFalse(is_valid_string(""))
        self.assertFalse(is_valid_string(None))
        self.assertFalse(is_valid_string(123))  # Not a string

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
        self.assertFalse(is_valid_number(None))

    def test_is_valid_integer(self):
        """Test integer validation."""
        self.assertTrue(is_valid_integer(10))
        self.assertTrue(is_valid_integer("10"))
        self.assertFalse(is_valid_integer(10.5))
        self.assertFalse(is_valid_integer("10.5"))
        self.assertFalse(is_valid_integer("abc"))
        self.assertTrue(is_valid_integer(10, min_value=5))
        self.assertFalse(is_valid_integer(10, min_value=15))
        self.assertTrue(is_valid_integer(10, max_value=15))
        self.assertFalse(is_valid_integer(10, max_value=5))
        self.assertFalse(is_valid_integer(None))

    def test_is_valid_email(self):
        """Test email validation."""
        self.assertTrue(is_valid_email("user@example.com"))
        self.assertTrue(is_valid_email("user.name@example.co.ke"))
        self.assertFalse(is_valid_email("user@"))
        self.assertFalse(is_valid_email("user@.com"))
        self.assertFalse(is_valid_email("user@example"))
        self.assertFalse(is_valid_email("user.example.com"))
        self.assertFalse(is_valid_email("@example.com"))
        self.assertFalse(is_valid_email(None))

    def test_is_valid_url(self):
        """Test URL validation."""
        self.assertTrue(is_valid_url("https://example.com"))
        self.assertTrue(is_valid_url("http://example.com"))
        self.assertTrue(is_valid_url("www.example.com"))
        self.assertTrue(is_valid_url("example.com"))
        self.assertFalse(is_valid_url("example"))
        self.assertFalse(is_valid_url("http://"))
        self.assertFalse(is_valid_url("http://.com"))
        self.assertFalse(is_valid_url(None))

    def test_is_valid_date(self):
        """Test date validation."""
        self.assertTrue(is_valid_date("2023-01-01"))
        self.assertFalse(is_valid_date("01-01-2023"))
        self.assertTrue(is_valid_date("01/01/2023", format="%m/%d/%Y"))
        self.assertFalse(is_valid_date("2023/01/01", format="%m/%d/%Y"))
        self.assertFalse(is_valid_date("2023-13-01"))  # Invalid month
        self.assertFalse(is_valid_date("2023-01-32"))  # Invalid day
        self.assertFalse(is_valid_date(None))

    def test_is_valid_kenyan_phone(self):
        """Test Kenyan phone number validation."""
        self.assertTrue(is_valid_kenyan_phone("+254712345678"))
        self.assertTrue(is_valid_kenyan_phone("254712345678"))
        self.assertTrue(is_valid_kenyan_phone("0712345678"))
        self.assertTrue(is_valid_kenyan_phone("0112345678"))
        self.assertFalse(is_valid_kenyan_phone("712345678"))
        self.assertFalse(is_valid_kenyan_phone("+255712345678"))  # Tanzania
        self.assertFalse(is_valid_kenyan_phone("0812345678"))  # Invalid prefix
        self.assertFalse(is_valid_kenyan_phone("+25471234567"))  # Too short
        self.assertFalse(is_valid_kenyan_phone("+2547123456789"))  # Too long
        self.assertFalse(is_valid_kenyan_phone(None))

    def test_is_valid_kenyan_id(self):
        """Test Kenyan ID validation."""
        self.assertTrue(is_valid_kenyan_id("12345678"))
        self.assertTrue(is_valid_kenyan_id("1234567"))
        self.assertFalse(is_valid_kenyan_id("123456"))  # Too short
        self.assertFalse(is_valid_kenyan_id("123456789"))  # Too long
        self.assertFalse(is_valid_kenyan_id("A1234567"))  # Contains letters
        self.assertFalse(is_valid_kenyan_id(None))

    def test_is_valid_kenyan_postal_code(self):
        """Test Kenyan postal code validation."""
        self.assertTrue(is_valid_kenyan_postal_code("00100"))
        self.assertTrue(is_valid_kenyan_postal_code("00200"))
        self.assertFalse(is_valid_kenyan_postal_code("0010"))  # Too short
        self.assertFalse(is_valid_kenyan_postal_code("001000"))  # Too long
        self.assertFalse(is_valid_kenyan_postal_code("A0100"))  # Contains letters
        self.assertFalse(is_valid_kenyan_postal_code(None))

    def test_is_valid_nairobi_area(self):
        """Test Nairobi area validation."""
        self.assertTrue(is_valid_nairobi_area("Westlands"))
        self.assertTrue(is_valid_nairobi_area("westlands"))
        self.assertTrue(is_valid_nairobi_area("Karen"))
        self.assertTrue(is_valid_nairobi_area("CBD"))
        self.assertTrue(is_valid_nairobi_area("cbd"))
        self.assertFalse(is_valid_nairobi_area("Mombasa"))
        self.assertFalse(is_valid_nairobi_area("Nakuru"))
        self.assertFalse(is_valid_nairobi_area(None))

    def test_is_valid_mpesa_code(self):
        """Test M-Pesa code validation."""
        self.assertTrue(is_valid_mpesa_code("ABC1234567"))
        self.assertTrue(is_valid_mpesa_code("PXL7654321"))
        self.assertFalse(is_valid_mpesa_code("abc1234567"))  # Lowercase
        self.assertFalse(is_valid_mpesa_code("AB12345678"))  # Too long
        self.assertFalse(is_valid_mpesa_code("AB123456"))  # Too short
        self.assertFalse(is_valid_mpesa_code("1234567890"))  # No letter prefix
        self.assertFalse(is_valid_mpesa_code(None))

    def test_is_strong_password(self):
        """Test password strength validation."""
        self.assertTrue(is_strong_password("P@ssw0rd"))
        self.assertTrue(is_strong_password("Str0ng!P@ss"))
        self.assertFalse(is_strong_password("password"))  # No uppercase, digit, or special char
        self.assertFalse(is_strong_password("PASSWORD"))  # No lowercase, digit, or special char
        self.assertFalse(is_strong_password("12345678"))  # No letters or special char
        self.assertFalse(is_strong_password("Pass123"))  # No special char and too short
        self.assertFalse(is_strong_password("Pass!word"))  # No digit
        self.assertFalse(is_strong_password("pass!w0rd"))  # No uppercase
        self.assertFalse(is_strong_password("PASS!W0RD"))  # No lowercase
        self.assertFalse(is_strong_password(None))

    def test_sanitize_string(self):
        """Test string sanitization."""
        self.assertEqual(sanitize_string("Hello World"), "Hello World")
        self.assertEqual(sanitize_string("<script>alert('XSS')</script>"), "alertXSS")
        self.assertEqual(sanitize_string("'; DROP TABLE users; --"), " DROP TABLE users ")
        self.assertEqual(sanitize_string("<b>Bold</b>"), "Bold")
        self.assertEqual(sanitize_string(None), "")

    def test_sanitize_html(self):
        """Test HTML sanitization."""
        self.assertEqual(sanitize_html("<p>Hello World</p>"), "<p>hello world</p>")
        self.assertEqual(sanitize_html("<script>alert('XSS')</script>"), "")
        self.assertEqual(sanitize_html("<p onclick='alert()'>Click me</p>"), "<p>click me</p>")
        self.assertEqual(sanitize_html("<iframe src='evil.com'></iframe>"), "")
        self.assertEqual(sanitize_html("<b>Bold</b> <i>Italic</i>"), "<b>bold</b> <i>italic</i>")
        self.assertEqual(sanitize_html(None), "")


class ValidatorsTestCase(unittest.TestCase):
    """Test case for validators."""

    def setUp(self):
        """Set up test environment."""
        self.app = create_app('testing')
        self.app_context = self.app.app_context()
        self.app_context.push()
        db.create_all()

        # Create test category
        self.category = Category(
            name='Test Category',
            slug='test-category',
            description='Test category description'
        )
        db.session.add(self.category)

        # Create test brand
        self.brand = Brand(
            name='Test Brand',
            slug='test-brand',
            description='Test brand description'
        )
        db.session.add(self.brand)

        # Create test user
        self.user = User(
            name='Test User',
            email='test@example.com',
            password_hash=generate_password_hash('P@ssw0rd'),
            role=UserRole.USER,
            phone='+254712345678',
            is_active=True
        )
        db.session.add(self.user)

        db.session.commit()

        # Get IDs
        self.category_id = self.category.id
        self.brand_id = self.brand.id
        self.user_id = self.user.id

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
        self.assertEqual(len(validator.get_errors()), 0)

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

        # Test email uniqueness
        data = {
            'name': 'Another User',
            'email': 'test@example.com',  # Already exists
            'password': 'P@ssw0rd',
            'phone': '+254712345678'
        }
        validator = UserValidator(data)
        self.assertFalse(validator.is_valid())
        errors = validator.get_errors()
        self.assertIn('email', errors)
        self.assertEqual(errors['email'][0]['code'], 'already_exists')

        # Test update validation
        data = {
            'name': 'Updated User',
            'email': 'updated@example.com',
            'phone': '+254712345679'
        }
        validator = UserValidator(data, context={'user_id': self.user_id})
        self.assertTrue(validator.is_valid())

    def test_login_validator(self):
        """Test login validator."""
        # Valid data
        data = {
            'email': 'test@example.com',
            'password': 'P@ssw0rd'
        }
        validator = LoginValidator(data)
        self.assertTrue(validator.is_valid())

        # Invalid data - missing fields
        data = {
            'email': '',
            'password': ''
        }
        validator = LoginValidator(data)
        self.assertFalse(validator.is_valid())
        errors = validator.get_errors()
        self.assertIn('email', errors)
        self.assertIn('password', errors)

        # Invalid data - missing email
        data = {
            'password': 'P@ssw0rd'
        }
        validator = LoginValidator(data)
        self.assertFalse(validator.is_valid())
        errors = validator.get_errors()
        self.assertIn('email', errors)

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
            'state': 'Nairobi',
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

        # Test optional fields
        data = {
            'first_name': 'John',
            'last_name': 'Doe',
            'address_line1': '123 Main St',
            'city': 'Nairobi',
            'state': 'Nairobi',
            'postal_code': '00100',
            'country': 'Kenya',
            'phone': '+254712345678',
            'address_line2': 'Apt 4B',  # Optional
            'alternative_phone': '+254712345679'  # Optional
        }
        validator = AddressValidator(data)
        self.assertTrue(validator.is_valid())

    def test_product_validator(self):
        """Test product validator."""
        # Valid data
        data = {
            'name': 'Test Product',
            'slug': 'test-product',
            'description': 'Test product description',
            'price': 100.0,
            'stock': 10,
            'category_id': self.category_id,
            'brand_id': self.brand_id
        }
        validator = ProductValidator(data)
        self.assertTrue(validator.is_valid())

        # Invalid data
        data = {
            'name': 'T',  # Too short
            'slug': 'test product',  # Invalid format
            'description': 'Test product description',
            'price': -100.0,  # Negative price
            'stock': -10,  # Negative stock
            'category_id': 9999,  # Invalid category
            'brand_id': 9999  # Invalid brand
        }
        validator = ProductValidator(data)
        self.assertFalse(validator.is_valid())
        errors = validator.get_errors()
        self.assertIn('name', errors)
        self.assertIn('slug', errors)
        self.assertIn('price', errors)
        self.assertIn('stock', errors)
        self.assertIn('category_id', errors)
        self.assertIn('brand_id', errors)

        # Test slug uniqueness
        # Create a product first
        product = Product(
            name='Existing Product',
            slug='existing-product',
            description='Existing product description',
            price=200.0,
            category_id=self.category_id
        )
        db.session.add(product)
        db.session.commit()

        data = {
            'name': 'Another Product',
            'slug': 'existing-product',  # Already exists
            'description': 'Another product description',
            'price': 150.0,
            'category_id': self.category_id
        }
        validator = ProductValidator(data)
        self.assertFalse(validator.is_valid())
        errors = validator.get_errors()
        self.assertIn('slug', errors)
        self.assertEqual(errors['slug'][0]['code'], 'already_exists')

        # Test update validation
        data = {
            'name': 'Updated Product',
            'price': 250.0
        }
        validator = ProductValidator(data, context={'product_id': product.id})
        self.assertTrue(validator.is_valid())

    def test_product_variant_validator(self):
        """Test product variant validator."""
        # Create a product first
        product = Product(
            name='Variant Test Product',
            slug='variant-test-product',
            description='Product for variant testing',
            price=200.0,
            category_id=self.category_id
        )
        db.session.add(product)
        db.session.commit()

        # Valid data
        data = {
            'product_id': product.id,
            'color': 'Red',
            'size': 'Large',
            'stock': 5,
            'price': 220.0
        }
        validator = ProductVariantValidator(data)
        self.assertTrue(validator.is_valid())

        # Invalid data
        data = {
            'product_id': 9999,  # Invalid product
            'stock': -5,  # Negative stock
            'price': -220.0  # Negative price
        }
        validator = ProductVariantValidator(data)
        self.assertFalse(validator.is_valid())
        errors = validator.get_errors()
        self.assertIn('product_id', errors)
        self.assertIn('attributes', errors)  # No color or size
        self.assertIn('stock', errors)
        self.assertIn('price', errors)

    def test_cart_item_validator(self):
        """Test cart item validator."""
        # Create a product first
        product = Product(
            name='Cart Test Product',
            slug='cart-test-product',
            description='Product for cart testing',
            price=200.0,
            stock=10,
            category_id=self.category_id
        )
        db.session.add(product)
        db.session.commit()

        # Valid data
        data = {
            'product_id': product.id,
            'quantity': 2
        }
        validator = CartItemValidator(data)
        self.assertTrue(validator.is_valid())

        # Invalid data
        data = {
            'product_id': 9999,  # Invalid product
            'quantity': 0  # Invalid quantity
        }
        validator = CartItemValidator(data)
        self.assertFalse(validator.is_valid())
        errors = validator.get_errors()
        self.assertIn('product_id', errors)
        self.assertIn('quantity', errors)

        # Test quantity exceeding stock
        data = {
            'product_id': product.id,
            'quantity': 20  # Exceeds stock
        }
        validator = CartItemValidator(data)
        self.assertFalse(validator.is_valid())
        errors = validator.get_errors()
        self.assertIn('quantity', errors)
        self.assertEqual(errors['quantity'][0]['code'], 'exceeds_stock')

    def test_order_validator(self):
        """Test order validator."""
        # Create an address first
        address = Address(
            user_id=self.user_id,
            first_name='John',
            last_name='Doe',
            address_line1='123 Main St',
            city='Nairobi',
            state='Nairobi',
            postal_code='00100',
            country='Kenya',
            phone='+254712345678',
            address_type=AddressType.BOTH
        )
        address = Address(
            user_id=self.user_id,
            first_name='John',
            last_name='Doe',
            address_line1='123 Main St',
            city='Nairobi',
            state='Nairobi',
            postal_code='00100',
            country='Kenya',
            phone='+254712345678',
            address_type=AddressType.BOTH
        )
        db.session.add(address)
        db.session.commit()

        # Valid data
        data = {
            'payment_method': 'mpesa',
            'shipping_address_id': address.id,
            'same_as_shipping': True,
            'shipping_method': 'standard'
        }
        validator = OrderValidator(data)
        self.assertTrue(validator.is_valid())

        # Invalid data
        data = {
            'payment_method': 'invalid_method',
            'shipping_method': 'invalid_method'
        }
        validator = OrderValidator(data)
        self.assertFalse(validator.is_valid())
        # Test coupon validation
        valid_coupon = Coupon(
            code='VALID10',
            type=CouponType.PERCENTAGE,
            start_date=datetime.now(datetime.timezone.utc) - timedelta(days=10),
            end_date=datetime.now(datetime.timezone.utc) - timedelta(days=1)
        )
        # Create an expired coupon
        expired_coupon = Coupon(
            code='EXPIRED10',
            type=CouponType.PERCENTAGE,
            value=10,
            is_active=True,
            start_date=datetime.now(datetime.timezone.utc) - timedelta(days=10),
            end_date=datetime.now(datetime.timezone.utc) - timedelta(days=1)
        )
        db.session.add(valid_coupon)
        db.session.add(expired_coupon)
        db.session.commit()

        # Valid coupon
        data = {
            'payment_method': 'mpesa',
            'shipping_address_id': address.id,
            'same_as_shipping': True,
            'coupon_code': 'VALID10'
        }
        validator = OrderValidator(data)
        self.assertTrue(validator.is_valid())

        # Expired coupon
        data = {
            'payment_method': 'mpesa',
            'shipping_address_id': address.id,
            'same_as_shipping': True,
            'coupon_code': 'EXPIRED10'
        }
        validator = OrderValidator(data)
        self.assertFalse(validator.is_valid())
        errors = validator.get_errors()
        self.assertIn('coupon_code', errors)
        self.assertEqual(errors['coupon_code'][0]['code'], 'expired')

        # Valid coupon
        data = {
            'payment_method': 'mpesa',
            'shipping_address_id': address.id,
            'same_as_shipping': True,
            'coupon_code': 'VALID10'
        }
        validator = OrderValidator(data)
        self.assertTrue(validator.is_valid())

        # Expired coupon
        data = {
            'payment_method': 'mpesa',
            'shipping_address_id': address.id,
            'same_as_shipping': True,
            'coupon_code': 'EXPIRED10'
        }
        validator = OrderValidator(data)
        self.assertFalse(validator.is_valid())
        errors = validator.get_errors()
        self.assertIn('coupon_code', errors)
        self.assertEqual(errors['coupon_code'][0]['code'], 'expired')

    def test_payment_validator(self):
        """Test payment validator."""
        # Create an order first
        shipping_address = {
            'first_name': 'John',
            'last_name': 'Doe',
            'address_line1': '123 Main St',
            'city': 'Nairobi',
            'state': 'Nairobi',
            'postal_code': '00100',
            'country': 'Kenya',
            'phone': '+254712345678'
        }

        order = Order(
            user_id=self.user_id,
            order_number='ORD-12345678',
            status=OrderStatus.PENDING,
            total_amount=500.0,
            payment_method='mpesa',
            payment_status=PaymentStatus.PENDING,
            shipping_address=shipping_address,
            billing_address=shipping_address  # Use same address for billing
        )
        db.session.add(order)
        db.session.commit()

        # Valid data
        data = {
            'order_id': order.id,
            'amount': 500.0,
            'payment_method': 'mpesa',
            'transaction_id': 'ABC1234567'
        }
        validator = PaymentValidator(data)
        self.assertTrue(validator.is_valid())

        # Invalid data
        data = {
            'order_id': 9999,  # Invalid order
            'amount': -500.0,  # Negative amount
            'payment_method': 'invalid_method',
            'transaction_id': 'abc1234567'  # Invalid format
        }
        validator = PaymentValidator(data)
        self.assertFalse(validator.is_valid())
        errors = validator.get_errors()
        self.assertIn('order_id', errors)
        self.assertIn('amount', errors)
        self.assertIn('payment_method', errors)
        self.assertIn('transaction_id', errors)

        # Test amount mismatch
        data = {
            'order_id': order.id,
            'amount': 400.0,  # Doesn't match order total
            'payment_method': 'mpesa',
            'transaction_id': 'ABC1234567'
        }
        validator = PaymentValidator(data, context={'user_id': self.user_id})
        self.assertFalse(validator.is_valid())
        errors = validator.get_errors()
        self.assertIn('amount', errors)
        self.assertEqual(errors['amount'][0]['code'], 'amount_mismatch')

    def test_review_validator(self):
        """Test review validator."""
        # Create a product first
        product = Product(
            name='Review Test Product',
            slug='review-test-product',
            description='Product for review testing',
            price=200.0,
            category_id=self.category_id
        )
        db.session.add(product)
        db.session.commit()

        # Valid data
        data = {
            'product_id': product.id,
            'rating': 4,
            'title': 'Great product',
            'comment': 'I really like this product.'
        }
        validator = ReviewValidator(data)
        self.assertTrue(validator.is_valid())

        # Invalid data
        data = {
            'product_id': 9999,  # Invalid product
            'rating': 6,  # Invalid rating (1-5)
            'title': 'A' * 201,  # Too long
            'comment': '<script>alert("XSS")</script>'  # Unsafe content
        }
        validator = ReviewValidator(data)
        self.assertFalse(validator.is_valid())
        errors = validator.get_errors()
        self.assertIn('product_id', errors)
        self.assertIn('rating', errors)
        self.assertIn('title', errors)
        self.assertIn('comment', errors)

        # Test duplicate review
        # Create a review first
        review = Review(
            user_id=self.user_id,
            product_id=product.id,
            rating=5,
            title='Existing review',
            comment='This is an existing review.'
        )
        db.session.add(review)
        db.session.commit()

        # Try to add another review for the same product by the same user
        data = {
            'product_id': product.id,
            'rating': 3,
            'title': 'Another review',
            'comment': 'This should fail.'
        }
        validator = ReviewValidator(data, context={'user_id': self.user_id})
        self.assertFalse(validator.is_valid())
        errors = validator.get_errors()
        self.assertIn('product_id', errors)
        self.assertEqual(errors['product_id'][0]['code'], 'already_reviewed')
# Removed invalid code
        self.assertEqual(errors['product_id'][0]['code'], 'already_reviewed')


class APIValidationTestCase(unittest.TestCase):
    """Test case for API validation."""

    def setUp(self):
        """Set up test environment."""
        self.app = create_app('testing')
        self.app_context = self.app.app_context()
        self.app_context.push()
        db.create_all()
        self.client = self.app.test_client()

        # Create test user
        user = User(
            name='Test User',
            email='test@example.com',
            password_hash=generate_password_hash('P@ssw0rd'),
            role=UserRole.USER,
            phone='+254712345678',
            is_active=True
        )
        db.session.add(user)

        # Create admin user
        admin = User(
            name='Admin User',
            email='admin@example.com',
            password_hash=generate_password_hash('P@ssw0rd'),
            role=UserRole.ADMIN,
            phone='+254712345678',
            is_active=True
        )
        db.session.add(admin)

        # Create test category
        category = Category(
            name='Test Category',
            slug='test-category',
            description='Test category description'
        )
        db.session.add(category)

        # Create test brand
        brand = Brand(
            name='Test Brand',
            slug='test-brand',
            description='Test brand description'
        )
        db.session.add(brand)

        db.session.commit()

        # Get IDs
        self.user_id = user.id
        self.admin_id = admin.id
        self.category_id = category.id
        self.brand_id = brand.id

        # Get auth tokens - handle potential JSON decode errors
        response = self.client.post('/api/v2/auth/login', json={
            'email': 'test@example.com',
            'password': 'P@ssw0rd'
        })

        try:
            data = json.loads(response.data)
            self.user_token = data.get('access_token', '')
        except json.JSONDecodeError:
            self.user_token = ''

        response = self.client.post('/api/v2/auth/login', json={
            'email': 'admin@example.com',
            'password': 'P@ssw0rd'
        })

        try:
            data = json.loads(response.data)
            self.admin_token = data.get('access_token', '')
        except json.JSONDecodeError:
            self.admin_token = ''

    def tearDown(self):
        """Tear down test environment."""
        db.session.remove()
        db.drop_all()
        self.app_context.pop()

    def test_user_registration_validation(self):
        """Test user registration validation."""
        # Valid data
        response = self.client.post('/api/v2/auth/register', json={
            'name': 'New User',
            'email': 'new@example.com',
            'password': 'P@ssw0rd',
            'phone': '+254712345678'
        })
        self.assertEqual(response.status_code, 201)

        # Invalid data
        response = self.client.post('/api/v2/auth/register', json={
            'name': 'N',  # Too short
            'email': 'invalid-email',
            'password': 'password',  # Weak password
            'phone': '712345678'  # Invalid format
        })
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        self.assertIn('errors', data)
        self.assertIn('name', data['errors'])
        self.assertIn('email', data['errors'])
        self.assertIn('password', data['errors'])
        self.assertIn('phone', data['errors'])

        # Duplicate email
        response = self.client.post('/api/v2/auth/register', json={
            'name': 'Another User',
            'email': 'test@example.com',  # Already exists
            'password': 'P@ssw0rd',
            'phone': '+254712345678'
        })
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        self.assertIn('errors', data)
        self.assertIn('email', data['errors'])

    def test_user_login_validation(self):
        """Test user login validation."""
        # Valid data
        response = self.client.post('/api/v2/auth/login', json={
            'email': 'test@example.com',
            'password': 'P@ssw0rd'
        })
        self.assertEqual(response.status_code, 200)

        # Invalid data
        response = self.client.post('/api/v2/auth/login', json={
            'email': '',
            'password': ''
        })
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        self.assertIn('errors', data)
        self.assertIn('email', data['errors'])
        self.assertIn('password', data['errors'])

        # Wrong credentials
        response = self.client.post('/api/v2/auth/login', json={
            'email': 'test@example.com',
            'password': 'WrongPassword'
        })
        self.assertEqual(response.status_code, 401)

    def test_address_validation(self):
        """Test address validation."""
        # Valid data
        response = self.client.post('/api/v2/addresses',
            headers={'Authorization': f'Bearer {self.user_token}'},
            json={
                'first_name': 'John',
                'last_name': 'Doe',
                'address_line1': '123 Main St',
                'city': 'Nairobi',
                'state': 'Nairobi',
                'postal_code': '00100',
                'country': 'Kenya',
                'phone': '+254712345678'
            }
        )
        self.assertEqual(response.status_code, 201)

        # Invalid data
        response = self.client.post('/api/v2/addresses',
            headers={'Authorization': f'Bearer {self.user_token}'},
            json={
                'first_name': 'J',  # Too short
                'last_name': 'D',  # Too short
                'address_line1': '123',  # Too short
                'city': 'Mombasa',  # Not Nairobi
                'state': '',
                'postal_code': '001',  # Invalid format
                'country': 'Uganda',  # Not Kenya
                'phone': '712345678'  # Invalid format
            }
        )
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        self.assertIn('errors', data)
        self.assertIn('first_name', data['errors'])
        self.assertIn('last_name', data['errors'])
        self.assertIn('address_line1', data['errors'])
        self.assertIn('city', data['errors'])
        self.assertIn('state', data['errors'])
        self.assertIn('postal_code', data['errors'])
        self.assertIn('country', data['errors'])
        self.assertIn('phone', data['errors'])

    def test_product_validation(self):
        """Test product validation."""
        # Valid data
        response = self.client.post('/api/v2/products',
            headers={'Authorization': f'Bearer {self.admin_token}'},
            json={
                'name': 'Test Product',
                'slug': 'test-product',
                'description': 'Test product description',
                'price': 100.0,
                'stock': 10,
                'category_id': self.category_id,
                'brand_id': self.brand_id
            }
        )
        self.assertEqual(response.status_code, 201)

        # Invalid data
        response = self.client.post('/api/v2/products',
            headers={'Authorization': f'Bearer {self.admin_token}'},
            json={
                'name': 'T',  # Too short
                'slug': 'test product',  # Invalid format
                'description': 'Test product description',
                'price': -100.0,  # Negative price
                'stock': -10,  # Negative stock
                'category_id': 9999,  # Invalid category
                'brand_id': 9999  # Invalid brand
            }
        )
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        self.assertIn('errors', data)
        self.assertIn('name', data['errors'])
        self.assertIn('slug', data['errors'])
        self.assertIn('price', data['errors'])
        self.assertIn('stock', data['errors'])
        self.assertIn('category_id', data['errors'])
        self.assertIn('brand_id', data['errors'])

        # Test unauthorized access
        response = self.client.post('/api/v2/products',
            headers={'Authorization': f'Bearer {self.user_token}'},
            json={
                'name': 'Unauthorized Product',
                'slug': 'unauthorized-product',
                'description': 'This should fail',
                'price': 100.0,
                'category_id': self.category_id
            }
        )
        self.assertEqual(response.status_code, 403)

    def test_cart_validation(self):
        """Test cart validation."""
        # Create a product first
        product = Product(
            name='Cart API Test Product',
            slug='cart-api-test-product',
            description='Product for cart API testing',
            price=200.0,
            stock=10,
            category_id=self.category_id
        )
        db.session.add(product)
        db.session.commit()

        # Valid data
        response = self.client.post('/api/v2/cart',
            headers={'Authorization': f'Bearer {self.user_token}'},
            json={
                'product_id': product.id,
                'quantity': 2
            }
        )
        self.assertEqual(response.status_code, 201)

        # Invalid data - quantity exceeds stock
        response = self.client.post('/api/v2/cart',
            headers={'Authorization': f'Bearer {self.user_token}'},
            json={
                'product_id': product.id,
                'quantity': 20  # Exceeds stock
            }
        )
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        self.assertIn('errors', data)
        self.assertIn('quantity', data['errors'])

        # Invalid data - invalid product
        response = self.client.post('/api/v2/cart',
            headers={'Authorization': f'Bearer {self.user_token}'},
            json={
                'product_id': 9999,  # Invalid product
                'quantity': 1
            }
        )
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        self.assertIn('errors', data)
        self.assertIn('product_id', data['errors'])

    def test_order_validation(self):
        """Test order validation."""
        # Create an address first
        address = Address(
            user_id=self.user_id,
            first_name='John',
            last_name='Doe',
            address_line1='123 Main St',
            city='Nairobi',
            state='Nairobi',
            postal_code='00100',
            country='Kenya',
            phone='+254712345678',
            address_type=AddressType.BOTH
        )
        db.session.add(address)

        # Create a product
        product = Product(
            name='Order API Test Product',
            slug='order-api-test-product',
            description='Product for order API testing',
            price=200.0,
            stock=10,
            category_id=self.category_id
        )
        db.session.add(product)
        db.session.commit()

        # Add item to cart
        cart_item = CartItem(
            user_id=self.user_id,
            product_id=product.id,
            quantity=1
        )
        db.session.add(cart_item)
        db.session.commit()

        # Valid data
        response = self.client.post('/api/v2/orders',
            headers={'Authorization': f'Bearer {self.user_token}'},
            json={
                'payment_method': 'mpesa',
                'shipping_address_id': address.id,
                'same_as_shipping': True,
                'shipping_method': 'standard'
            }
        )
        self.assertEqual(response.status_code, 201)

        # Add another item to cart for next test
        cart_item = CartItem(
            user_id=self.user_id,
            product_id=product.id,
            quantity=1
        )
        db.session.add(cart_item)
        db.session.commit()

        # Invalid data
        response = self.client.post('/api/v2/orders',
            headers={'Authorization': f'Bearer {self.user_token}'},
            json={
                'payment_method': 'invalid_method',
                'shipping_method': 'invalid_method'
            }
        )
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        self.assertIn('errors', data)
        self.assertIn('payment_method', data['errors'])
        self.assertIn('shipping_address', data['errors'])
        self.assertIn('shipping_method', data['errors'])

    def test_review_validation(self):
        """Test review validation."""
        # Create a product first
        product = Product(
            name='Review API Test Product',
            slug='review-api-test-product',
            description='Product for review API testing',
            price=200.0,
            category_id=self.category_id
        )
        db.session.add(product)
        db.session.commit()

        # Valid data
        response = self.client.post(f'/api/v2/products/{product.id}/reviews',
            headers={'Authorization': f'Bearer {self.user_token}'},
            json={
                'rating': 4,
                'title': 'Great product',
                'comment': 'I really like this product.'
            }
        )
        self.assertEqual(response.status_code, 201)

        # Invalid data
        response = self.client.post(f'/api/v2/products/{product.id}/reviews',
            headers={'Authorization': f'Bearer {self.user_token}'},
            json={
                'rating': 6,  # Invalid rating (1-5)
                'title': 'A' * 201,  # Too long
                'comment': '<script>alert("XSS")</script>'  # Unsafe content
            }
        )
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        self.assertIn('errors', data)
        self.assertIn('rating', data['errors'])
        self.assertIn('title', data['errors'])
        self.assertIn('comment', data['errors'])

        # Test duplicate review
        response = self.client.post(f'/api/v2/products/{product.id}/reviews',
            headers={'Authorization': f'Bearer {self.user_token}'},
            json={
                'rating': 3,
                'title': 'Another review',
                'comment': 'This should fail.'
            }
        )
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        self.assertIn('errors', data)
        self.assertIn('product_id', data['errors'])


if __name__ == '__main__':
    unittest.main()
