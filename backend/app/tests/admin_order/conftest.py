"""
Test configuration and fixtures for admin order tests.
"""
import pytest
import json
from datetime import datetime, timedelta
from app.models.models import (
    User, Order, OrderItem, Product, Category, Brand,
    OrderStatus, PaymentStatus, UserRole, Payment
)
from app.configuration.extensions import db
from flask_jwt_extended import create_access_token


@pytest.fixture
def app():
    """Create and configure a test Flask application."""
    from app import create_app

    # Create app with testing configuration
    app = create_app('testing')

    # Override specific test configurations
    app.config.update({
        'TESTING': True,
        'SQLALCHEMY_DATABASE_URI': 'sqlite:///:memory:',
        'JWT_SECRET_KEY': 'test-secret-key',
        'WTF_CSRF_ENABLED': False,
        'SQLALCHEMY_TRACK_MODIFICATIONS': False
    })

    with app.app_context():
        db.create_all()
        yield app
        db.drop_all()


@pytest.fixture
def client(app):
    """Create a test client for the Flask application."""
    return app.test_client()


@pytest.fixture
def sample_user(app):
    """Create a sample user for testing."""
    with app.app_context():
        user = User(
            name='Test User',
            email='testuser@example.com',
            role=UserRole.USER,
            is_active=True,
            email_verified=True
        )
        user.set_password('testpassword123')
        db.session.add(user)
        db.session.commit()
        return user


@pytest.fixture
def sample_admin_user(app):
    """Create a sample admin user for testing."""
    with app.app_context():
        admin = User(
            name='Admin User',
            email='admin@example.com',
            role=UserRole.ADMIN,
            is_active=True,
            email_verified=True
        )
        admin.set_password('adminpassword123')
        db.session.add(admin)
        db.session.commit()
        return admin


@pytest.fixture
def auth_headers(app, sample_user):
    """Create authentication headers for regular user."""
    with app.app_context():
        access_token = create_access_token(
            identity=sample_user.id,
            additional_claims={'role': sample_user.role.value}
        )
        return {
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        }


@pytest.fixture
def admin_auth_headers(app, sample_admin_user):
    """Create authentication headers for admin user."""
    with app.app_context():
        access_token = create_access_token(
            identity=sample_admin_user.id,
            additional_claims={'role': sample_admin_user.role.value}
        )
        return {
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        }


@pytest.fixture
def sample_category(app):
    """Create a sample category for testing."""
    with app.app_context():
        category = Category(
            name='Test Category',
            slug='test-category',
            description='Test category for products'
        )
        db.session.add(category)
        db.session.commit()
        return category


@pytest.fixture
def sample_brand(app):
    """Create a sample brand for testing."""
    with app.app_context():
        brand = Brand(
            name='Test Brand',
            slug='test-brand',
            description='Test brand for products',
            is_active=True
        )
        db.session.add(brand)
        db.session.commit()
        return brand


@pytest.fixture
def sample_product(app):
    """Create a sample product for testing."""
    with app.app_context():
        product = Product(
            name='Test Product',
            slug='test-product',
            description='Test product description',
            price=50.0,
            category_id=1,  # Assuming category_id is set elsewhere
            stock_quantity=100,
            is_active=True,
            thumbnail_url='/images/product.jpg'
        )
        db.session.add(product)
        db.session.commit()
        return product


@pytest.fixture
def sample_orders(app, sample_user, sample_product):
    """Create sample orders for testing."""
    with app.app_context():
        orders = []

        # Create orders with different statuses
        statuses = [OrderStatus.PENDING, OrderStatus.PROCESSING, OrderStatus.SHIPPED, OrderStatus.DELIVERED]

        for i, status in enumerate(statuses):
            order = Order(
                user_id=sample_user.id,
                order_number=f"ORD-{datetime.utcnow().strftime('%Y%m%d')}-{i+1:04d}",
                status=status,
                total_amount=100.0 + (i * 50),  # Varying amounts
                payment_method='mpesa',
                payment_status=PaymentStatus.PAID,  # Changed from COMPLETED to PAID
                shipping_method='standard',
                shipping_cost=10.0,
                shipping_address={"address": f"Test Address {i+1}"},
                billing_address={"address": f"Test Address {i+1}"},
                created_at=datetime.utcnow() - timedelta(days=i),
                updated_at=datetime.utcnow() - timedelta(days=i)
            )
            db.session.add(order)
            orders.append(order)

            # Add order items
            for j in range(2):  # Use first 2 products
                order_item = OrderItem(
                    order_id=order.id,
                    product_id=sample_product.id,
                    quantity=j + 1,
                    price=sample_product.price,
                    total=(j + 1) * sample_product.price
                )
                db.session.add(order_item)

        db.session.commit()
        return orders


@pytest.fixture
def sample_order_with_items(app, sample_user, sample_product):
    """Create a single order with items for detailed testing."""
    with app.app_context():
        order = Order(
            user_id=sample_user.id,
            order_number=f"ORD-{datetime.utcnow().strftime('%Y%m%d')}-0001",
            status=OrderStatus.PENDING,
            total_amount=150.0,
            payment_method='mpesa',
            payment_status=PaymentStatus.PENDING,
            shipping_method='standard',
            shipping_cost=10.0,
            shipping_address={"address": "Test Address"},
            billing_address={"address": "Test Address"},
            notes='Test order notes'
        )
        db.session.add(order)
        db.session.flush()

        # Add order items
        for i in range(2):
            order_item = OrderItem(
                order_id=order.id,
                product_id=sample_product.id,
                quantity=i + 1,
                price=sample_product.price,
                total=(i + 1) * sample_product.price
            )
            db.session.add(order_item)

        db.session.commit()
        return order


@pytest.fixture
def multiple_users_orders(app, sample_product):
    """Create orders for multiple users for testing filters."""
    with app.app_context():
        users = []
        orders = []

        # Create multiple users
        for i in range(3):
            user = User(
                name=f'User {i+1}',
                email=f'user{i+1}@example.com',
                role=UserRole.USER,
                is_active=True,
                email_verified=True
            )
            user.set_password('password123')
            db.session.add(user)
            users.append(user)

        db.session.flush()

        # Create orders for each user
        for i, user in enumerate(users):
            for j in range(2):  # 2 orders per user
                order = Order(
                    user_id=user.id,
                    order_number=f"ORD-{datetime.utcnow().strftime('%Y%m%d')}-{(i*2+j+1):04d}",
                    status=OrderStatus.PENDING if j == 0 else OrderStatus.DELIVERED,
                    total_amount=100.0 + (i * 25) + (j * 10),
                    payment_method='mpesa',
                    payment_status=PaymentStatus.PAID,
                    shipping_method='standard',
                    shipping_cost=10.0,
                    shipping_address={"address": f"Street {i+1}"},
                    billing_address={"address": f"City {i+1}"},
                    created_at=datetime.utcnow() - timedelta(days=i+j),
                    updated_at=datetime.utcnow() - timedelta(days=i+j)
                )
                db.session.add(order)
                orders.append(order)

        db.session.commit()
        return {'users': users, 'orders': orders}


@pytest.fixture
def orders_with_different_amounts(app, sample_user, sample_product):
    """Create orders with different amounts for testing amount filters."""
    with app.app_context():
        orders = []
        amounts = [50.0, 150.0, 250.0, 500.0, 1000.0]

        for i, amount in enumerate(amounts):
            order = Order(
                user_id=sample_user.id,
                order_number=f"ORD-{datetime.utcnow().strftime('%Y%m%d')}-{i+1:04d}",
                status=OrderStatus.DELIVERED,
                total_amount=amount,
                payment_method='mpesa',
                payment_status=PaymentStatus.PAID,
                shipping_method='standard',
                shipping_cost=10.0,
                shipping_address={"address": "Test Address"},
                billing_address={"address": "Test Address"},
                created_at=datetime.utcnow() - timedelta(days=i),
                updated_at=datetime.utcnow() - timedelta(days=i)
            )
            db.session.add(order)
            orders.append(order)

        db.session.commit()
        return orders


@pytest.fixture
def orders_with_date_range(app, sample_user, sample_product):
    """Create orders with different dates for testing date filters."""
    with app.app_context():
        orders = []
        base_date = datetime.utcnow()

        # Create orders spanning different time periods
        date_offsets = [1, 7, 15, 30, 60, 90]  # Days ago

        for i, days_ago in enumerate(date_offsets):
            order_date = base_date - timedelta(days=days_ago)
            order = Order(
                user_id=sample_user.id,
                order_number=f"ORD-{order_date.strftime('%Y%m%d')}-{i+1:04d}",
                status=OrderStatus.DELIVERED,
                total_amount=100.0 + (i * 25),
                payment_method='mpesa',
                payment_status=PaymentStatus.PAID,
                shipping_method='standard',
                shipping_cost=10.0,
                shipping_address={"address": "Test Address"},
                billing_address={"address": "Test Address"},
                created_at=order_date,
                updated_at=order_date
            )
            db.session.add(order)
            orders.append(order)

        db.session.commit()
        return orders


@pytest.fixture
def cancelled_orders(app, sample_user, sample_product):
    """Create cancelled orders for testing status updates."""
    with app.app_context():
        orders = []

        for i in range(2):
            order = Order(
                user_id=sample_user.id,
                order_number=f"ORD-{datetime.utcnow().strftime('%Y%m%d')}-CANC-{i+1:04d}",
                status=OrderStatus.CANCELLED,
                total_amount=100.0 + (i * 50),
                payment_method='mpesa',
                payment_status=PaymentStatus.REFUNDED,
                shipping_method='standard',
                shipping_cost=10.0,
                shipping_address={"address": "Test Address"},
                billing_address={"address": "Test Address"},
                created_at=datetime.utcnow() - timedelta(days=i),
                updated_at=datetime.utcnow() - timedelta(days=i)
            )
            db.session.add(order)
            orders.append(order)

        db.session.commit()
        return orders


@pytest.fixture
def mock_email_service(monkeypatch):
    """Mock email service for testing email functionality."""
    sent_emails = []

    def mock_send_email(to, subject, template, **kwargs):
        sent_emails.append({
            'to': to,
            'subject': subject,
            'template': template,
            'kwargs': kwargs
        })
        return True

    def mock_send_order_confirmation(order):
        sent_emails.append({
            'type': 'order_confirmation',
            'order_id': order.id,
            'order_number': order.order_number,
            'user_email': order.user.email
        })
        return True

    # Mock the email functions
    monkeypatch.setattr('app.services.email.send_email', mock_send_email)
    monkeypatch.setattr('app.services.email.send_order_confirmation', mock_send_order_confirmation)

    return sent_emails


@pytest.fixture
def mock_database_error(monkeypatch):
    """Mock database error for testing error handling."""
    def mock_commit():
        raise Exception("Database connection error")

    monkeypatch.setattr('app.configuration.extensions.db.session.commit', mock_commit)


@pytest.fixture
def large_dataset_orders(app, sample_user, sample_product):
    """Create a large dataset of orders for performance testing."""
    with app.app_context():
        orders = []

        # Create 100 orders for pagination testing
        for i in range(100):
            order = Order(
                user_id=sample_user.id,
                order_number=f"ORD-{datetime.utcnow().strftime('%Y%m%d')}-{i+1:05d}",
                status=OrderStatus.DELIVERED if i % 2 == 0 else OrderStatus.PENDING,
                total_amount=50.0 + (i * 5),
                payment_method='mpesa',
                payment_status=PaymentStatus.PAID,
                shipping_method='standard',
                shipping_cost=10.0,
                shipping_address={"address": "Test Address"},
                billing_address={"address": "Test Address"},
                created_at=datetime.utcnow() - timedelta(hours=i),
                updated_at=datetime.utcnow() - timedelta(hours=i)
            )
            db.session.add(order)
            orders.append(order)

        db.session.commit()
        return orders


@pytest.fixture
def regular_user(app):
    """Create a regular user for testing."""
    with app.app_context():
        user = User(
            name='Regular User',
            email='regularuser@example.com',
            role=UserRole.USER,
            is_active=True,
            email_verified=True
        )
        user.set_password('regularpassword123')
        db.session.add(user)
        db.session.commit()
        return user


@pytest.fixture
def multiple_orders(app, sample_user, sample_product):
    """Create multiple orders for testing."""
    with app.app_context():
        orders = []
        for i in range(5):
            order = Order(
                user_id=sample_user.id,
                order_number=f"ORDER-MULTI-{i+1:04d}",
                status=OrderStatus.PENDING,
                payment_status=PaymentStatus.PENDING,
                total_amount=100.0 * (i + 1),
                shipping_address={"address": f"Test Address {i+1}"},
                billing_address={"address": f"Test Address {i+1}"},
                payment_method="mpesa"
            )
            db.session.add(order)
            orders.append(order)

        db.session.commit()
        return orders
