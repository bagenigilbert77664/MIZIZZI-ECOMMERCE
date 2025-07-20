"""
Pytest configuration file for the cart tests.
This file contains fixtures that can be used across multiple test files.
"""
import os
import sys
import pytest
import json
from flask import Flask
from flask.testing import FlaskClient

# Add the parent directory to sys.path to allow imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Import the app factory and models
from backend.app import create_app
from app.configuration.extensions import db
from app.models.models import (
    User, Product, ProductVariant, Cart, CartItem,
    Coupon, CouponType, Address, AddressType,
    ShippingMethod, ShippingZone, PaymentMethod
)

@pytest.fixture
def app():
    """Create and configure a Flask app for testing."""
    app = create_app('testing')
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    app.config['JWT_SECRET_KEY'] = 'test-secret-key'
    app.config['PRESERVE_CONTEXT_ON_EXCEPTION'] = False

    # Create an application context
    with app.app_context():
        # Create all tables
        db.create_all()

        # Create test user
        test_user = User(
            name="Test User",
            email="test@example.com",
            role="USER",
            is_active=True,
            email_verified=True
        )
        test_user.set_password("password123")
        db.session.add(test_user)

        # Create test products
        test_product1 = Product(
            name="Test Product 1",
            slug="test-product-1",
            description="This is a test product",
            price=100.00,
            stock=10,
            is_active=True
        )
        db.session.add(test_product1)

        test_product2 = Product(
            name="Test Product 2",
            slug="test-product-2",
            description="This is another test product",
            price=200.00,
            sale_price=180.00,
            stock=5,
            is_active=True
        )
        db.session.add(test_product2)

        # Create test variant
        test_variant = ProductVariant(
            product_id=1,
            color="Red",
            size="M",
            price=110.00,
            stock=3
        )
        db.session.add(test_variant)

        # Create test coupon
        test_coupon = Coupon(
            code="TESTCODE",
            type=CouponType.PERCENTAGE,
            value=10.0,
            min_purchase=50.0,
            is_active=True
        )
        db.session.add(test_coupon)

        # Create test address
        test_address = Address(
            user_id=1,
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
        db.session.add(test_address)

        # Create test shipping zone
        test_shipping_zone = ShippingZone(
            name="Kenya Zone",
            country="Kenya",
            all_regions=True,
            is_active=True
        )
        db.session.add(test_shipping_zone)
        db.session.flush()  # Get the ID without committing

        # Create test shipping method
        test_shipping_method = ShippingMethod(
            shipping_zone_id=1,
            name="Standard Delivery",
            description="3-5 business days",
            cost=500.00,
            estimated_days="3-5 days",
            is_active=True
        )
        db.session.add(test_shipping_method)

        # Create test payment method
        test_payment_method = PaymentMethod(
            name="Test Payment",
            code="test_payment",
            description="Test payment method",
            is_active=True
        )
        db.session.add(test_payment_method)

        db.session.commit()

        yield app

        # Clean up after test
        db.session.remove()
        db.drop_all()

@pytest.fixture
def client(app):
    """A test client for the app."""
    return app.test_client()

@pytest.fixture
def auth_headers(client):
    """Generate authentication headers for testing."""
    response = client.post(
        '/api/login',
        json={
            'identifier': 'bagenig47@gmail.com',
            'password': 'junior2020'
        },
        content_type='application/json'
    )
    data = json.loads(response.data)
    token = data.get('access_token')
    return {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
