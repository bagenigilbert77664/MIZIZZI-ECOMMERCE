"""
Cart Validation Test Suite

This script tests the cart validation functionality in the Mizizzi E-commerce backend.
It verifies that the validation logic correctly identifies valid and invalid cart states.

Usage:
    python -m backend.tests.test_cart_validation
"""

import unittest
import os
import sys
from datetime import datetime, timedelta

# Add the parent directory to the path so we can import the app
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from configuration.extensions import db
from models.models import (
    User, Product, ProductVariant, Cart, CartItem,
    Coupon, CouponType, Address, AddressType,
    ShippingMethod, ShippingZone, PaymentMethod,
    Inventory, ProductCompatibility
)
from validations.cart_validation import (
    CartValidator, validate_cart_item_addition, validate_checkout
)
from __init__ import create_app

class CartValidationTestCase(unittest.TestCase):
    """Test case for cart validation."""

    @classmethod
    def setUpClass(cls):
        """Set up the test environment once before all tests."""
        cls.app = create_app('testing')
        cls.app.config['TESTING'] = True
        cls.app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        cls.app_context = cls.app.app_context()
        cls.app_context.push()
        db.create_all()

    @classmethod
    def tearDownClass(cls):
        """Clean up after all tests."""
        db.session.remove()
        db.drop_all()
        cls.app_context.pop()

    def setUp(self):
        """Set up test data before each test."""
        self._create_test_data()

    def tearDown(self):
        """Clean up after each test."""
        db.session.query(CartItem).delete()
        db.session.query(Cart).delete()
        db.session.query(ProductCompatibility).delete()
        db.session.query(Inventory).delete()
        db.session.query(ProductVariant).delete()
        db.session.query(Product).delete()
        db.session.query(Coupon).delete()
        db.session.query(Address).delete()
        db.session.query(ShippingMethod).delete()
        db.session.query(ShippingZone).delete()
        db.session.query(PaymentMethod).delete()
        db.session.query(User).delete()
        db.session.commit()

    def _create_test_data(self):
        """Create test data for the tests."""
        # Create test user
        self.test_user = User(
            name="Test User",
            email="test@example.com",
            role="USER",
            is_active=True,
            email_verified=True
        )
        self.test_user.set_password("password123")
        db.session.add(self.test_user)
        db.session.commit()
        self.user_id = self.test_user.id

        # Create test products
        self.test_product1 = Product(
            name="Test Product 1",
            slug="test-product-1",
            description="This is a test product",
            price=100.00,
            stock=10,
            is_active=True
        )
        db.session.add(self.test_product1)

        self.test_product2 = Product(
            name="Test Product 2",
            slug="test-product-2",
            description="This is another test product",
            price=200.00,
            sale_price=180.00,
            stock=5,
            is_active=True
        )
        db.session.add(self.test_product2)

        # Create test product with low stock
        self.test_product_low_stock = Product(
            name="Low Stock Product",
            slug="low-stock-product",
            description="This product has low stock",
            price=150.00,
            stock=2,
            is_active=True
        )
        db.session.add(self.test_product_low_stock)

        # Create test product that's out of stock
        self.test_product_out_of_stock = Product(
            name="Out of Stock Product",
            slug="out-of-stock-product",
            description="This product is out of stock",
            price=120.00,
            stock=0,
            is_active=True
        )
        db.session.add(self.test_product_out_of_stock)

        # Create test variant
        self.test_variant = ProductVariant(
            product_id=1,
            color="Red",
            size="M",
            price=110.00,
            stock=3
        )
        db.session.add(self.test_variant)

        # Create test inventory
        self.test_inventory = Inventory(
            product_id=1,
            stock_level=10,
            reserved_quantity=2,
            low_stock_threshold=3
        )
        db.session.add(self.test_inventory)

        # Create test inventory for variant
        self.test_variant_inventory = Inventory(
            product_id=1,
            variant_id=1,
            stock_level=3,
            reserved_quantity=0,
            low_stock_threshold=1
        )
        db.session.add(self.test_variant_inventory)

        # Create test coupon
        self.test_coupon = Coupon(
            code="TESTCODE",
            type=CouponType.PERCENTAGE,
            value=10.0,
            min_purchase=50.0,
            is_active=True
        )
        db.session.add(self.test_coupon)

        # Create expired coupon
        self.expired_coupon = Coupon(
            code="EXPIRED",
            type=CouponType.PERCENTAGE,
            value=15.0,
            min_purchase=50.0,
            start_date=datetime.utcnow() - timedelta(days=30),
            end_date=datetime.utcnow() - timedelta(days=1),
            is_active=True
        )
        db.session.add(self.expired_coupon)

        # Create test address
        self.test_address = Address(
            user_id=self.user_id,
            first_name="Test",
            last_name="User",
            address_line1="123 Test St",
            city="Nairobi",
            state="Nairobi County",
            postal_code="00100",
            country="Kenya",
            phone="+254712345678",
            address_type=AddressType.BOTH,
            is_default=True
        )
        db.session.add(self.test_address)

        # Create test shipping zone
        self.test_shipping_zone = ShippingZone(
            name="Kenya Zone",
            country="Kenya",
            all_regions=True,
            is_active=True
        )
        db.session.add(self.test_shipping_zone)
        db.session.flush()  # Get the ID without committing

        # Create test shipping method
        self.test_shipping_method = ShippingMethod(
            shipping_zone_id=1,
            name="Standard Delivery",
            description="3-5 business days",
            cost=500.00,
            estimated_days="3-5 days",
            is_active=True
        )
        db.session.add(self.test_shipping_method)

        # Create test payment method
        self.test_payment_method = PaymentMethod(
            name="Test Payment",
            code="test_payment",
            description="Test payment method",
            is_active=True
        )
        db.session.add(self.test_payment_method)

        # Create product compatibility (incompatible products)
        self.test_incompatibility = ProductCompatibility(
            product_id=1,
            incompatible_product_id=2,
            is_incompatible=True
        )
        db.session.add(self.test_incompatibility)

        db.session.commit()

        # Create test cart
        self.test_cart = Cart(
            user_id=self.user_id,
            is_active=True,
            subtotal=0,
            tax=0,
            shipping=0,
            discount=0,
            total=0,
            same_as_shipping=True,
            requires_shipping=True,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.session.add(self.test_cart)
        db.session.commit()
        self.cart_id = self.test_cart.id

    def test_cart_validator_initialization(self):
        """Test CartValidator initialization."""
        print("\n--- Testing CartValidator initialization ---")
        validator = CartValidator(user_id=self.user_id)
        self.assertIsNotNone(validator.cart)
        self.assertEqual(validator.cart.id, self.cart_id)
        self.assertEqual(validator.user_id, self.user_id)
        print("✓ CartValidator initialized successfully")

    def test_validate_cart_empty(self):
        """Test validating an empty cart."""
        print("\n--- Testing validate_cart with empty cart ---")
        validator = CartValidator(user_id=self.user_id)
        is_valid = validator.validate_cart()
        self.assertFalse(is_valid)
        self.assertTrue(validator.has_errors())
        self.assertEqual(validator.get_errors()[0]["code"], "empty_cart")
        print("✓ Empty cart validation correctly returns error")

    def test_validate_cart_with_items(self):
        """Test validating a cart with items."""
        print("\n--- Testing validate_cart with items ---")
        # Add an item to the cart
        cart_item = CartItem(
            cart_id=self.cart_id,
            user_id=self.user_id,
            product_id=1,
            quantity=1,
            price=100.00
        )
        db.session.add(cart_item)
        db.session.commit()

        validator = CartValidator(user_id=self.user_id)
        is_valid = validator.validate_cart()

        # Basic cart with just items should be valid
        self.assertTrue(is_valid)
        self.assertFalse(validator.has_errors())
        print("✓ Cart with valid items passes validation")

    def test_validate_cart_with_incompatible_items(self):
        """Test validating a cart with incompatible items."""
        print("\n--- Testing validate_cart with incompatible items ---")
        # Add incompatible items to the cart
        cart_item1 = CartItem(
            cart_id=self.cart_id,
            user_id=self.user_id,
            product_id=1,
            quantity=1,
            price=100.00
        )
        db.session.add(cart_item1)

        cart_item2 = CartItem(
            cart_id=self.cart_id,
            user_id=self.user_id,
            product_id=2,
            quantity=1,
            price=200.00
        )
        db.session.add(cart_item2)
        db.session.commit()

        validator = CartValidator(user_id=self.user_id)
        is_valid = validator.validate_cart()

        # Cart with incompatible items should be invalid
        self.assertFalse(is_valid)
        self.assertTrue(validator.has_errors())
        self.assertTrue(any(error["code"] == "incompatible_products" for error in validator.get_errors()))
        print("✓ Cart with incompatible items fails validation")

    def test_validate_cart_with_out_of_stock_item(self):
        """Test validating a cart with an out of stock item."""
        print("\n--- Testing validate_cart with out of stock item ---")
        # Add out of stock item to the cart
        cart_item = CartItem(
            cart_id=self.cart_id,
            user_id=self.user_id,
            product_id=4,  # Out of stock product
            quantity=1,
            price=120.00
        )
        db.session.add(cart_item)
        db.session.commit()

        validator = CartValidator(user_id=self.user_id)
        is_valid = validator.validate_cart()

        # Cart with out of stock item should be invalid
        self.assertFalse(is_valid)
        self.assertTrue(validator.has_errors())
        self.assertTrue(any(error["code"] == "out_of_stock" for error in validator.get_errors()))
        print("✓ Cart with out of stock item fails validation")

    def test_validate_cart_with_excessive_quantity(self):
        """Test validating a cart with quantity exceeding stock."""
        print("\n--- Testing validate_cart with excessive quantity ---")
        # Add item with quantity exceeding stock
        cart_item = CartItem(
            cart_id=self.cart_id,
            user_id=self.user_id,
            product_id=3,  # Low stock product
            quantity=5,  # More than available stock (2)
            price=150.00
        )
        db.session.add(cart_item)
        db.session.commit()

        validator = CartValidator(user_id=self.user_id)
        is_valid = validator.validate_cart()

        # Cart with excessive quantity should be invalid
        self.assertFalse(is_valid)
        self.assertTrue(validator.has_errors())
        self.assertTrue(any(error["code"] == "insufficient_stock" for error in validator.get_errors()))
        print("✓ Cart with excessive quantity fails validation")

    def test_validate_cart_item_addition(self):
        """Test validating cart item addition."""
        print("\n--- Testing validate_cart_item_addition ---")
        # Valid addition
        is_valid, errors, warnings = validate_cart_item_addition(
            self.user_id, 1, None, 1
        )
        self.assertTrue(is_valid)
        self.assertEqual(len(errors), 0)
        print("✓ Valid item addition passes validation")

        # Invalid product ID
        is_valid, errors, warnings = validate_cart_item_addition(
            self.user_id, 999, None, 1
        )
        self.assertFalse(is_valid)
        self.assertEqual(errors[0]["code"], "product_not_found")
        print("✓ Invalid product ID fails validation")

        # Excessive quantity
        is_valid, errors, warnings = validate_cart_item_addition(
            self.user_id, 3, None, 5
        )
        self.assertFalse(is_valid)
        self.assertEqual(errors[0]["code"], "insufficient_stock")
        print("✓ Excessive quantity fails validation")

        # Out of stock product
        is_valid, errors, warnings = validate_cart_item_addition(
            self.user_id, 4, None, 1
        )
        self.assertFalse(is_valid)
        self.assertEqual(errors[0]["code"], "out_of_stock")
        print("✓ Out of stock product fails validation")

    def test_validate_checkout(self):
        """Test validating checkout."""
        print("\n--- Testing validate_checkout ---")
        # Add item to cart
        cart_item = CartItem(
            cart_id=self.cart_id,
            user_id=self.user_id,
            product_id=1,
            quantity=1,
            price=100.00
        )
        db.session.add(cart_item)
        db.session.commit()

        # Set shipping address
        self.test_cart.shipping_address_id = self.test_address.id
        self.test_cart.billing_address_id = self.test_address.id

        # Set shipping method
        self.test_cart.shipping_method_id = self.test_shipping_method.id

        # Set payment method
        self.test_cart.payment_method_id = self.test_payment_method.id

        db.session.commit()

        # Validate checkout
        is_valid, errors, warnings = validate_checkout(self.cart_id)

        # With all required fields set, checkout should be valid
        self.assertTrue(is_valid)
        self.assertEqual(len(errors), 0)
        print("✓ Valid checkout passes validation")

        # Test without shipping address
        self.test_cart.shipping_address_id = None
        db.session.commit()

        is_valid, errors, warnings = validate_checkout(self.cart_id)
        self.assertFalse(is_valid)
        self.assertTrue(any(error["code"] == "missing_shipping_address" for error in errors))
        print("✓ Checkout without shipping address fails validation")

if __name__ == '__main__':
    unittest.main()
