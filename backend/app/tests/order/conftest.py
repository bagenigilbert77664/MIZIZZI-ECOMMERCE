"""
Pytest configuration and fixtures for order tests.
"""
import pytest
from datetime import datetime, timedelta
from decimal import Decimal
import json
import uuid

from app import create_app
from app.models.models import (
    db, User, Product, Category, Brand, Order, OrderItem,
    Cart, CartItem, Address, PaymentMethod, ShippingMethod,
    ShippingZone, Coupon, CouponType, OrderStatus, PaymentStatus,
    UserRole, AddressType, Inventory, ProductVariant
)
from flask_jwt_extended import create_access_token
from unittest.mock import Mock

@pytest.fixture(scope='session')
def app():
    """Create application for testing."""
    app = create_app('testing')

    with app.app_context():
        db.create_all()
        yield app
        db.drop_all()


@pytest.fixture(scope='function')
def client(app):
    """Create test client."""
    return app.test_client()


@pytest.fixture(scope='function')
def db_session(app):
    """Create database session for testing."""
    with app.app_context():
        db.create_all()
        yield db.session
        db.session.rollback()
        db.drop_all()


@pytest.fixture
def sample_user(db_session):
    """Create a sample user."""
    user = User(
        name="Test User",
        email="test@example.com",
        role=UserRole.USER,
        phone="+254712345678",
        is_active=True,
        email_verified=True
    )
    user.set_password("password123")
    db_session.add(user)
    db_session.commit()
    return user


@pytest.fixture
def admin_user(db_session):
    """Create an admin user."""
    user = User(
        name="Admin User",
        email="admin@example.com",
        role=UserRole.ADMIN,
        phone="+254712345679",
        is_active=True,
        email_verified=True
    )
    user.set_password("admin123")
    db_session.add(user)
    db_session.commit()
    return user


@pytest.fixture
def other_user(db_session):
    """Create another test user."""
    user = User(
        name="Other User",
        email="other@example.com",
        role=UserRole.USER,
        phone="+254712345680",
        is_active=True,
        email_verified=True
    )
    user.set_password("password123")
    db_session.add(user)
    db_session.commit()
    return user


@pytest.fixture
def sample_category(db_session):
    """Create a sample category."""
    category = Category(
        name="Electronics",
        slug="electronics",
        description="Electronic products",
        is_featured=True
    )
    db_session.add(category)
    db_session.commit()
    return category


@pytest.fixture
def sample_brand(db_session):
    """Create a sample brand."""
    brand = Brand(
        name="TestBrand",
        slug="testbrand",
        description="Test brand description",
        is_featured=True
    )
    db_session.add(brand)
    db_session.commit()
    return brand


@pytest.fixture
def sample_products(db_session, sample_category, sample_brand):
    """Create sample products."""
    products = []

    for i in range(5):
        product = Product(
            name=f"Test Product {i+1}",
            slug=f"test-product-{i+1}",
            description=f"Description for test product {i+1}",
            price=Decimal(f"{100 + i*10}.00"),
            stock=50,
            category_id=sample_category.id,
            brand_id=sample_brand.id,
            is_active=True,
            sku=f"TEST-{i+1:03d}"
        )
        db_session.add(product)
        products.append(product)

    db_session.commit()
    return products


@pytest.fixture
def sample_address(db_session, sample_user):
    """Create a sample address."""
    address = Address(
        user_id=sample_user.id,
        first_name="John",
        last_name="Doe",
        address_line1="123 Test Street",
        city="Nairobi",
        state="Nairobi",
        postal_code="00100",
        country="Kenya",
        phone="+254712345678",
        address_type=AddressType.BOTH,
        is_default=True
    )
    db_session.add(address)
    db_session.commit()
    return address


@pytest.fixture
def shipping_zone(db_session):
    """Create a shipping zone."""
    zone = ShippingZone(
        name="Kenya",
        country="Kenya",
        all_regions=True,
        is_active=True
    )
    db_session.add(zone)
    db_session.commit()
    return zone


@pytest.fixture
def shipping_method(db_session, shipping_zone):
    """Create a shipping method."""
    method = ShippingMethod(
        shipping_zone_id=shipping_zone.id,
        name="Standard Delivery",
        description="3-5 business days",
        cost=200.00,
        estimated_days="3-5 days",
        is_active=True
    )
    db_session.add(method)
    db_session.commit()
    return method


@pytest.fixture
def payment_method(db_session):
    """Create a payment method."""
    method = PaymentMethod(
        name="M-PESA",
        code="mpesa",
        description="Mobile money payment",
        is_active=True
    )
    db_session.add(method)
    db_session.commit()
    return method


@pytest.fixture
def sample_coupon(db_session):
    """Create a sample coupon."""
    coupon = Coupon(
        code="TEST10",
        type=CouponType.PERCENTAGE,
        value=10.0,
        min_purchase=100.0,
        start_date=datetime.utcnow() - timedelta(days=1),
        end_date=datetime.utcnow() + timedelta(days=30),
        usage_limit=100,
        used_count=0,
        is_active=True
    )
    db_session.add(coupon)
    db_session.commit()
    return coupon


@pytest.fixture
def sample_cart(db_session, sample_user, sample_products):
    """Create a sample cart with items."""
    cart = Cart(
        user_id=sample_user.id,
        is_active=True
    )
    db_session.add(cart)
    db_session.flush()

    # Add cart items
    for i, product in enumerate(sample_products[:3]):
        cart_item = CartItem(
            cart_id=cart.id,
            user_id=sample_user.id,
            product_id=product.id,
            quantity=i + 1,
            price=float(product.price)
        )
        db_session.add(cart_item)

    cart.update_totals()
    db_session.commit()
    return cart


@pytest.fixture
def sample_orders(db_session, sample_user, sample_products):
    """Create sample orders."""
    orders = []

    for i in range(3):
        order = Order(
            user_id=sample_user.id,
            order_number=f"ORD-{datetime.utcnow().strftime('%Y%m%d')}-{i+1:04d}",
            status=OrderStatus.PENDING if i == 0 else OrderStatus.PROCESSING,
            total_amount=500.0 + i * 100,
            shipping_address={
                "first_name": "John",
                "last_name": "Doe",
                "address_line1": "123 Test Street",
                "city": "Nairobi",
                "country": "Kenya"
            },
            billing_address={
                "first_name": "John",
                "last_name": "Doe",
                "address_line1": "123 Test Street",
                "city": "Nairobi",
                "country": "Kenya"
            },
            payment_method="mpesa",
            payment_status=PaymentStatus.PENDING,
            created_at=datetime.utcnow() - timedelta(days=i)
        )
        db_session.add(order)
        db_session.flush()

        # Add order items
        for j, product in enumerate(sample_products[:2]):
            order_item = OrderItem(
                order_id=order.id,
                product_id=product.id,
                quantity=j + 1,
                price=float(product.price),
                total=float(product.price) * (j + 1)
            )
            db_session.add(order_item)

        orders.append(order)

    db_session.commit()
    return orders


@pytest.fixture
def sample_inventory(db_session, sample_products):
    """Create sample inventory."""
    inventories = []
    for product in sample_products:
        inventory = Inventory(
            product_id=product.id,
            variant_id=None,
            stock_level=100,
            reserved_quantity=0,
            reorder_level=10,
            low_stock_threshold=5,
            status='active'
        )
        db_session.add(inventory)
        inventories.append(inventory)

    db_session.commit()
    return inventories


@pytest.fixture
def auth_headers(app, sample_user):
    """Create authentication headers for sample user."""
    with app.app_context():
        access_token = create_access_token(identity=sample_user.id)
        return {
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        }


@pytest.fixture
def admin_auth_headers(app, admin_user):
    """Create authentication headers for admin user."""
    with app.app_context():
        access_token = create_access_token(identity=admin_user.id)
        return {
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        }


@pytest.fixture
def other_auth_headers(app, other_user):
    """Create authentication headers for other user."""
    with app.app_context():
        access_token = create_access_token(identity=other_user.id)
        return {
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        }


@pytest.fixture
def sample_order_data(sample_products, sample_address):
    """Sample order creation data."""
    return {
        "items": [
            {
                "product_id": sample_products[0].id,
                "quantity": 2,
                "price": float(sample_products[0].price)
            },
            {
                "product_id": sample_products[1].id,
                "quantity": 1,
                "price": float(sample_products[1].price)
            }
        ],
        "shipping_address": {
            "first_name": "John",
            "last_name": "Doe",
            "address_line1": "123 Test Street",
            "city": "Nairobi",
            "state": "Nairobi",
            "postal_code": "00100",
            "country": "Kenya",
            "phone": "+254712345678"
        },
        "billing_address": {
            "first_name": "John",
            "last_name": "Doe",
            "address_line1": "123 Test Street",
            "city": "Nairobi",
            "state": "Nairobi",
            "postal_code": "00100",
            "country": "Kenya",
            "phone": "+254712345678"
        },
        "payment_method": "mpesa",
        "shipping_method": "standard",
        "notes": "Test order notes"
    }


@pytest.fixture
def mock_email_service(mocker):
    """Mock email service."""
    return mocker.patch('backend.routes.order.order_email_templates.send_order_confirmation_email')
