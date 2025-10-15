"""
Enhanced configuration file for admin order route testing.
Provides fixtures and setup for comprehensive testing of admin order functionality.
"""

import pytest
import os
import sys
from datetime import datetime, timedelta, UTC
from unittest.mock import MagicMock, patch

# Add the backend directory to the Python path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..'))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from flask import Flask
from flask_testing import TestCase
from app.configuration.extensions import db, jwt
from app.models.models import (
    User, UserRole, Order, OrderItem, OrderStatus, PaymentStatus,
    Product, Payment, Category, Brand, AdminActivityLog, Coupon, CouponType,
    ProductVariant
)
from app.routes.order.admin_order_routes import admin_order_routes


@pytest.fixture(scope='session')
def app():
    """Create and configure a test Flask application."""
    app = Flask(__name__)

    # Test configuration
    app.config.update({
        'TESTING': True,
        'SQLALCHEMY_DATABASE_URI': 'sqlite:///:memory:',
        'SQLALCHEMY_TRACK_MODIFICATIONS': False,
        'JWT_SECRET_KEY': 'test-secret-key-for-testing-only',
        'JWT_ACCESS_TOKEN_EXPIRES': timedelta(hours=1),
        'WTF_CSRF_ENABLED': False,
        'SECRET_KEY': 'test-secret-key',
        'ORDER_WEBHOOK_URL': None,  # Disable webhooks in tests
        'MAIL_SUPPRESS_SEND': True,  # Suppress email sending in tests
        'CORS_ORIGINS': '*'
    })

    # Initialize extensions
    db.init_app(app)
    jwt.init_app(app)

    # Register blueprints - THIS IS THE KEY FIX
    app.register_blueprint(admin_order_routes, url_prefix='/api/admin')

    with app.app_context():
        # Create all database tables
        db.create_all()
        yield app
        # Clean up
        db.drop_all()


@pytest.fixture
def client(app):
    """Create a test client for the Flask application."""
    return app.test_client()


@pytest.fixture
def runner(app):
    """Create a test runner for the Flask application."""
    return app.test_cli_runner()


@pytest.fixture(autouse=True)
def setup_database(app):
    """Set up and tear down the database for each test."""
    with app.app_context():
        # Create tables
        db.create_all()
        yield
        # Clean up after each test
        db.session.remove()
        db.drop_all()
        db.create_all()


@pytest.fixture(autouse=True)
def register_admin_order_routes(app):
    """Ensure admin_order_routes blueprint is registered."""
    if not any(bp.name == 'admin_order_routes' for bp in app.blueprints.values()):
        app.register_blueprint(admin_order_routes, url_prefix='/api/admin')
    return app


# Mock functions for external dependencies
@pytest.fixture(autouse=True)
def mock_external_services():
    """Mock external services to avoid actual API calls during testing."""
    # Create mock functions
    mock_send_email = MagicMock(return_value=True)
    mock_send_webhook = MagicMock(return_value=True)
    mock_log_activity = MagicMock(return_value=True)
    mock_handle_completion = MagicMock(return_value=True)
    mock_restore_inventory = MagicMock(return_value=True)

    # Use patch to mock the functions at the module level
    patches = []

    # Mock email functions - try different possible import paths
    email_patches = [
        'app.routes.order.order_email_templates.send_order_status_update_email',
        'app.routes.order.order_email_templates.send_order_confirmation_email',
        'routes.order.order_email_templates.send_order_status_update_email',
        'routes.order.order_email_templates.send_order_confirmation_email',
        'backend.app.routes.order.order_email_templates.send_order_status_update_email',
        'backend.app.routes.order.order_email_templates.send_order_confirmation_email',
    ]

    for patch_path in email_patches:
        try:
            patches.append(patch(patch_path, mock_send_email))
        except (ImportError, AttributeError):
            pass

    # Mock webhook functions
    webhook_patches = [
        'app.routes.order.admin_order_routes.send_webhook_notification',
        'routes.order.admin_order_routes.send_webhook_notification',
        'backend.app.routes.order.admin_order_routes.send_webhook_notification',
    ]

    for patch_path in webhook_patches:
        try:
            patches.append(patch(patch_path, mock_send_webhook))
        except (ImportError, AttributeError):
            pass

    # Mock logging functions
    log_patches = [
        'app.routes.order.admin_order_routes.log_admin_activity',
        'routes.order.admin_order_routes.log_admin_activity',
        'backend.app.routes.order.admin_order_routes.log_admin_activity',
    ]

    for patch_path in log_patches:
        try:
            patches.append(patch(patch_path, mock_log_activity))
        except (ImportError, AttributeError):
            pass

    # Mock inventory handling functions
    inventory_patches = [
        'app.routes.order.order_completion_handler.handle_order_completion',
        'app.routes.order.order_completion_handler.restore_inventory_for_cancelled_order',
        'routes.order.order_completion_handler.handle_order_completion',
        'routes.order.order_completion_handler.restore_inventory_for_cancelled_order',
        'backend.app.routes.order.order_completion_handler.handle_order_completion',
        'backend.app.routes.order.order_completion_handler.restore_inventory_for_cancelled_order',
    ]

    for patch_path in inventory_patches:
        try:
            patches.append(patch(patch_path, mock_handle_completion))
        except (ImportError, AttributeError):
            pass

    # Start all patches
    started_patches = []
    for p in patches:
        try:
            started_patches.append(p.start())
        except:
            pass

    yield

    # Stop all patches
    for p in patches:
        try:
            p.stop()
        except:
            pass


@pytest.fixture
def sample_users(app):
    """Create sample users for testing."""
    with app.app_context():
        # Admin user
        admin_user = User(
            email='admin@test.com',
            name='Admin User',
            role=UserRole.ADMIN,
            is_active=True,
            email_verified=True
        )
        admin_user.set_password('admin123')

        # Super admin user
        super_admin_user = User(
            email='admin@mizizzi.com',
            name='Super Admin User',
            role=UserRole.ADMIN,
            is_active=True,
            email_verified=True
        )
        super_admin_user.set_password('superadmin123')

        # Regular user
        regular_user = User(
            email='user@test.com',
            name='Regular User',
            role=UserRole.USER,
            is_active=True,
            email_verified=True
        )
        regular_user.set_password('user123')

        # Customer users
        customer1 = User(
            email='customer1@test.com',
            name='Customer One',
            role=UserRole.USER,
            is_active=True,
            email_verified=True
        )
        customer1.set_password('password123')

        customer2 = User(
            email='customer2@test.com',
            name='Customer Two',
            role=UserRole.USER,
            is_active=True,
            email_verified=True
        )
        customer2.set_password('password123')

        db.session.add_all([admin_user, super_admin_user, regular_user, customer1, customer2])
        db.session.commit()

        return {
            'admin': admin_user,
            'super_admin': super_admin_user,
            'regular_user': regular_user,
            'customer1': customer1,
            'customer2': customer2
        }


@pytest.fixture
def sample_products(app):
    """Create sample products for testing."""
    with app.app_context():
        # Create category first
        category = Category(
            name='Test Category',
            slug='test-category',
            description='Test category for products'
        )
        db.session.add(category)
        db.session.commit()

        # Create products
        product1 = Product(
            name='Test Product 1',
            slug='test-product-1',
            description='Test product 1 description',
            price=100.00,
            stock_quantity=50,
            category_id=category.id,
            is_active=True
        )

        product2 = Product(
            name='Test Product 2',
            slug='test-product-2',
            description='Test product 2 description',
            price=200.00,
            stock_quantity=30,
            category_id=category.id,
            is_active=True
        )

        db.session.add_all([product1, product2])
        db.session.commit()

        return {
            'category': category,
            'product1': product1,
            'product2': product2
        }


@pytest.fixture
def auth_tokens(app, sample_users):
    """Create authentication tokens for testing."""
    from flask_jwt_extended import create_access_token

    with app.app_context():
        users = sample_users

        admin_token = create_access_token(
            identity=users['admin'].id,
            additional_claims={'role': UserRole.ADMIN.value}
        )

        super_admin_token = create_access_token(
            identity=users['super_admin'].id,
            additional_claims={'role': UserRole.ADMIN.value}
        )

        user_token = create_access_token(
            identity=users['regular_user'].id,
            additional_claims={'role': UserRole.USER.value}
        )

        return {
            'admin_token': admin_token,
            'super_admin_token': super_admin_token,
            'user_token': user_token,
            'admin_headers': {
                'Authorization': f'Bearer {admin_token}',
                'Content-Type': 'application/json'
            },
            'super_admin_headers': {
                'Authorization': f'Bearer {super_admin_token}',
                'Content-Type': 'application/json'
            },
            'user_headers': {
                'Authorization': f'Bearer {user_token}',
                'Content-Type': 'application/json'
            }
        }


@pytest.fixture
def sample_orders(app, sample_users, sample_products):
    """Create sample orders for testing."""
    with app.app_context():
        users = sample_users
        products = sample_products

        # Create orders with proper datetime and addresses
        order1 = Order(
            user_id=users['customer1'].id,
            order_number='ORD-20240101-001',
            status=OrderStatus.PENDING,
            payment_status=PaymentStatus.PENDING,
            payment_method='mpesa',
            total_amount=150.00,
            subtotal=140.00,
            tax_amount=10.00,
            shipping_cost=0.00,
            shipping_method='standard',
            shipping_address='{"street": "123 Test St", "city": "Test City", "country": "Kenya"}',
            billing_address='{"street": "123 Test St", "city": "Test City", "country": "Kenya"}',
            notes='Test order 1',
            created_at=datetime.now(UTC) - timedelta(days=5),
            updated_at=datetime.now(UTC) - timedelta(days=5)
        )

        order2 = Order(
            user_id=users['customer2'].id,
            order_number='ORD-20240102-002',
            status=OrderStatus.CONFIRMED,
            payment_status=PaymentStatus.PAID,
            payment_method='card',
            total_amount=300.00,
            subtotal=280.00,
            tax_amount=20.00,
            shipping_cost=0.00,
            shipping_method='express',
            shipping_address='{"street": "456 Test Ave", "city": "Test Town", "country": "Kenya"}',
            billing_address='{"street": "456 Test Ave", "city": "Test Town", "country": "Kenya"}',
            notes='Test order 2',
            created_at=datetime.now(UTC) - timedelta(days=3),
            updated_at=datetime.now(UTC) - timedelta(days=3)
        )

        # Add more orders for comprehensive testing
        order3 = Order(
            user_id=users['customer1'].id,
            order_number='ORD-20240103-003',
            status=OrderStatus.SHIPPED,
            payment_status=PaymentStatus.PAID,
            payment_method='mpesa',
            total_amount=75.00,
            subtotal=70.00,
            tax_amount=5.00,
            shipping_cost=0.00,
            shipping_method='standard',
            tracking_number='TRK123456789',
            shipping_address='{"street": "789 Test Blvd", "city": "Test Village", "country": "Kenya"}',
            billing_address='{"street": "789 Test Blvd", "city": "Test Village", "country": "Kenya"}',
            created_at=datetime.now(UTC) - timedelta(days=1),
            updated_at=datetime.now(UTC) - timedelta(hours=12)
        )

        order4 = Order(
            user_id=users['customer2'].id,
            order_number='ORD-20240104-004',
            status=OrderStatus.DELIVERED,
            payment_status=PaymentStatus.PAID,
            payment_method='cash_on_delivery',
            total_amount=500.00,
            subtotal=480.00,
            tax_amount=20.00,
            shipping_cost=0.00,
            shipping_method='express',
            tracking_number='TRK987654321',
            shipping_address='{"street": "321 Test Road", "city": "Test County", "country": "Kenya"}',
            billing_address='{"street": "321 Test Road", "city": "Test County", "country": "Kenya"}',
            created_at=datetime.now(UTC) - timedelta(days=10),
            updated_at=datetime.now(UTC) - timedelta(days=8)
        )

        order5 = Order(
            user_id=users['customer1'].id,
            order_number='ORD-20240105-005',
            status=OrderStatus.CANCELLED,
            payment_status=PaymentStatus.REFUNDED,
            payment_method='mpesa',
            total_amount=120.00,
            subtotal=110.00,
            tax_amount=10.00,
            shipping_cost=0.00,
            shipping_method='standard',
            shipping_address='{"street": "555 Test Lane", "city": "Test District", "country": "Kenya"}',
            billing_address='{"street": "555 Test Lane", "city": "Test District", "country": "Kenya"}',
            notes='Cancelled by customer',
            created_at=datetime.now(UTC) - timedelta(days=7),
            updated_at=datetime.now(UTC) - timedelta(days=6)
        )

        order6 = Order(
            user_id=users['customer2'].id,
            order_number='ORD-20240106-006',
            status=OrderStatus.RETURNED,
            payment_status=PaymentStatus.PAID,
            payment_method='card',
            total_amount=250.00,
            subtotal=230.00,
            tax_amount=20.00,
            shipping_cost=0.00,
            shipping_method='express',
            shipping_address='{"street": "777 Test Way", "city": "Test Region", "country": "Kenya"}',
            billing_address='{"street": "777 Test Way", "city": "Test Region", "country": "Kenya"}',
            notes='Returned by customer',
            created_at=datetime.now(UTC) - timedelta(days=15),
            updated_at=datetime.now(UTC) - timedelta(days=12)
        )

        orders = [order1, order2, order3, order4, order5, order6]
        db.session.add_all(orders)
        db.session.commit()

        # Create order items
        order_items = [
            # Order 1 items
            OrderItem(order_id=order1.id, product_id=products['product1'].id, quantity=1, price=100.00, total=100.00),
            OrderItem(order_id=order1.id, product_id=products['product2'].id, quantity=1, price=50.00, total=50.00),

            # Order 2 items
            OrderItem(order_id=order2.id, product_id=products['product2'].id, quantity=1, price=200.00, total=200.00),
            OrderItem(order_id=order2.id, product_id=products['product1'].id, quantity=1, price=100.00, total=100.00),

            # Order 3 items
            OrderItem(order_id=order3.id, product_id=products['product1'].id, quantity=1, price=75.00, total=75.00),

            # Order 4 items
            OrderItem(order_id=order4.id, product_id=products['product2'].id, quantity=2, price=200.00, total=400.00),
            OrderItem(order_id=order4.id, product_id=products['product1'].id, quantity=1, price=100.00, total=100.00),

            # Order 5 items
            OrderItem(order_id=order5.id, product_id=products['product1'].id, quantity=1, price=120.00, total=120.00),

            # Order 6 items
            OrderItem(order_id=order6.id, product_id=products['product2'].id, quantity=1, price=250.00, total=250.00),
        ]

        db.session.add_all(order_items)
        db.session.commit()

        return {
            'orders': orders,
            'order1': order1,
            'order2': order2,
            'order3': order3,
            'order4': order4,
            'order5': order5,
            'order6': order6,
            'items': order_items
        }


@pytest.fixture
def sample_coupon(app):
    """Create a sample coupon for testing."""
    with app.app_context():
        coupon = Coupon(
            code='TEST10',
            type=CouponType.PERCENTAGE,
            value=10.0,
            min_purchase=50.0,
            start_date=datetime.now(UTC) - timedelta(days=1),
            end_date=datetime.now(UTC) + timedelta(days=30),
            is_active=True
        )
        db.session.add(coupon)
        db.session.commit()

        return coupon


@pytest.fixture
def clean_db(app):
    """Clean database before each test that uses this fixture."""
    with app.app_context():
        # Clear all tables
        db.session.query(OrderItem).delete()
        db.session.query(Order).delete()
        db.session.query(Payment).delete()
        db.session.query(Product).delete()
        db.session.query(Category).delete()
        db.session.query(User).delete()
        db.session.query(AdminActivityLog).delete()
        db.session.query(Coupon).delete()
        db.session.commit()

        yield

        # Clean up after test
        db.session.rollback()


@pytest.fixture
def mock_datetime():
    """Mock datetime for consistent testing."""
    fixed_datetime = datetime(2024, 1, 15, 12, 0, 0, tzinfo=UTC)

    with patch('app.routes.order.admin_order_routes.datetime') as mock_dt:
        mock_dt.now.return_value = fixed_datetime
        mock_dt.side_effect = lambda *args, **kw: datetime(*args, **kw)
        mock_dt.UTC = UTC
        yield mock_dt


@pytest.fixture
def mock_request_context(app):
    """Mock Flask request context for testing."""
    with app.test_request_context():
        yield


# Helper functions for tests
def create_test_order(user_id, product_id, status=OrderStatus.PENDING, **kwargs):
    """Helper function to create test orders."""
    order_defaults = {
        'order_number': f'ORD-TEST-{datetime.now(UTC).strftime("%Y%m%d%H%M%S")}',
        'status': status,
        'payment_status': PaymentStatus.PENDING,
        'total_amount': 100.00,
        'created_at': datetime.now(UTC),
        'updated_at': datetime.now(UTC),
        'shipping_address': '{"street": "123 Test St", "city": "Test City", "country": "Kenya"}',
        'billing_address': '{"street": "123 Test St", "city": "Test City", "country": "Kenya"}'
    }
    order_defaults.update(kwargs)

    order = Order(user_id=user_id, **order_defaults)
    db.session.add(order)
    db.session.commit()

    # Create order item
    item = OrderItem(
        order_id=order.id,
        product_id=product_id,
        quantity=1,
        price=100.00,
        total=100.00
    )
    db.session.add(item)
    db.session.commit()

    return order


def create_test_user(email, role=UserRole.USER, **kwargs):
    """Helper function to create test users."""
    user_defaults = {
        'name': f'Test User {email}',
        'is_active': True,
        'email_verified': True
    }
    user_defaults.update(kwargs)

    user = User(email=email, role=role, **user_defaults)
    user.set_password('password123')
    db.session.add(user)
    db.session.commit()

    return user


def create_test_product(name, **kwargs):
    """Helper function to create test products."""
    product_defaults = {
        'slug': name.lower().replace(' ', '-'),
        'description': f'{name} description',
        'price': 100.00,
        'stock_quantity': 50,
        'is_active': True
    }
    product_defaults.update(kwargs)

    product = Product(name=name, **product_defaults)
    db.session.add(product)
    db.session.commit()

    return product


# Pytest configuration
def pytest_configure(config):
    """Configure pytest with custom markers."""
    config.addinivalue_line("markers", "integration: mark test as integration test")
    config.addinivalue_line("markers", "unit: mark test as unit test")
    config.addinivalue_line("markers", "slow: mark test as slow running")
    config.addinivalue_line("markers", "fast: mark test as fast running")
    config.addinivalue_line("markers", "auth: mark test as authentication related")
    config.addinivalue_line("markers", "permissions: mark test as permissions related")
    config.addinivalue_line("markers", "bulk: mark test as bulk operations related")
    config.addinivalue_line("markers", "export: mark test as export related")
    config.addinivalue_line("markers", "stats: mark test as statistics related")


def pytest_collection_modifyitems(config, items):
    """Modify test collection to add markers based on test names."""
    for item in items:
        # Add markers based on test names
        if "integration" in item.name.lower():
            item.add_marker(pytest.mark.integration)
        if "bulk" in item.name.lower():
            item.add_marker(pytest.mark.bulk)
        if "auth" in item.name.lower() or "permission" in item.name.lower():
            item.add_marker(pytest.mark.auth)
        if "export" in item.name.lower():
            item.add_marker(pytest.mark.export)
        if "stat" in item.name.lower():
            item.add_marker(pytest.mark.stats)
        if "slow" in item.name.lower() or "performance" in item.name.lower():
            item.add_marker(pytest.mark.slow)
        else:
            item.add_marker(pytest.mark.fast)


# Test data factories
class OrderFactory:
    """Factory for creating test orders."""

    @staticmethod
    def create(user_id, **kwargs):
        return create_test_order(user_id, **kwargs)

    @staticmethod
    def create_batch(count, user_id, **kwargs):
        orders = []
        for i in range(count):
            order_kwargs = kwargs.copy()
            order_kwargs['order_number'] = f'ORD-BATCH-{i:03d}'
            orders.append(create_test_order(user_id, **order_kwargs))
        return orders


class UserFactory:
    """Factory for creating test users."""

    @staticmethod
    def create(email, **kwargs):
        return create_test_user(email, **kwargs)

    @staticmethod
    def create_admin(email='admin@test.com', **kwargs):
        kwargs['role'] = UserRole.ADMIN
        return create_test_user(email, **kwargs)

    @staticmethod
    def create_customer(email='customer@test.com', **kwargs):
        kwargs['role'] = UserRole.USER
        return create_test_user(email, **kwargs)
