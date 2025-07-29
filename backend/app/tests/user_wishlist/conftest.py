"""
Pytest configuration and fixtures for user wishlist tests.
Provides comprehensive test setup for wishlist functionality testing.
"""

import pytest
import os
import sys
from datetime import datetime, timedelta
from unittest.mock import Mock, patch
import uuid

# Add the backend directory to Python path
backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Flask and extensions
from flask import Flask
from flask_jwt_extended import JWTManager, create_access_token
from flask_cors import CORS

# Database and models
from app.configuration.extensions import db, cache, limiter
from app.models.models import User, Product, Category, Brand, WishlistItem

# Test configuration
class TestConfig:
    """Test configuration class."""
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = 'test-jwt-secret-key'
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
    SECRET_KEY = 'test-secret-key'
    WTF_CSRF_ENABLED = False
    CACHE_TYPE = 'simple'
    RATELIMIT_STORAGE_URL = 'memory://'
    RATELIMIT_ENABLED = True

@pytest.fixture(scope='session')
def app():
    """Create and configure test Flask application."""
    app = Flask(__name__)
    app.config.from_object(TestConfig)

    # Initialize extensions
    db.init_app(app)
    cache.init_app(app)
    limiter.init_app(app)

    # Initialize JWT
    jwt = JWTManager(app)

    # Configure CORS
    CORS(app, origins=['http://localhost:3000'], supports_credentials=True)

    # Import and register blueprints
    try:
        from app.routes.wishlist.user_wishlist_routes import user_wishlist_routes
        app.register_blueprint(user_wishlist_routes, url_prefix='/api/wishlist/user')
    except ImportError:
        from routes.wishlist.user_wishlist_routes import user_wishlist_routes
        app.register_blueprint(user_wishlist_routes, url_prefix='/api/wishlist/user')

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
        # Clear all tables
        db.session.query(WishlistItem).delete()
        db.session.query(Product).delete()
        db.session.query(Category).delete()
        db.session.query(Brand).delete()
        db.session.query(User).delete()
        db.session.commit()
        yield db.session
        db.session.rollback()

@pytest.fixture
def test_user(db_session):
    """Create a test user."""
    user = User(
        id=1,
        email='testuser@example.com',
        name='Test User',  # Changed from username to name
        password_hash='hashed_password',
        is_active=True,
        created_at=datetime.now()
    )
    db_session.add(user)
    db_session.commit()
    return user

@pytest.fixture
def inactive_user(db_session):
    """Create an inactive test user."""
    user = User(
        id=2,
        email='inactive@example.com',
        name='Inactive User',  # Changed from username to name
        password_hash='hashed_password',
        is_active=False,
        created_at=datetime.now()
    )
    db_session.add(user)
    db_session.commit()
    return user

@pytest.fixture
def test_category(db_session):
    """Create a test category."""
    category = Category(
        id=1,
        name='Electronics',
        slug='electronics',
        description='Electronic products',
        # Removed is_active field as it doesn't exist in the model
        created_at=datetime.now()
    )
    db_session.add(category)
    db_session.commit()
    return category

@pytest.fixture
def test_brand(db_session):
    """Create a test brand."""
    brand = Brand(
        id=1,
        name='TestBrand',
        slug='testbrand',
        description='Test brand description',
        is_active=True,  # This field exists in Brand model
        created_at=datetime.now()
    )
    db_session.add(brand)
    db_session.commit()
    return brand

@pytest.fixture
def test_product(db_session, test_category, test_brand):
    """Create a test product."""
    product = Product(
        id=1,
        name='Test Product',
        slug='test-product',
        description='Test product description',
        short_description='Short description',
        price=99.99,
        sale_price=79.99,
        stock=10,
        stock_quantity=10,  # Added this field
        sku='TEST-001',
        category_id=test_category.id,
        brand_id=test_brand.id,
        is_active=True,
        is_featured=True,
        is_sale=True,
        is_new=False,
        is_flash_sale=False,
        is_luxury_deal=False,
        thumbnail_url='https://example.com/thumb.jpg',
        availability_status='in_stock',
        created_at=datetime.now()
    )
    # Set image URLs using the helper method
    product.set_image_urls(['https://example.com/image1.jpg', 'https://example.com/image2.jpg'])
    db_session.add(product)
    db_session.commit()
    return product

@pytest.fixture
def inactive_product(db_session, test_category, test_brand):
    """Create an inactive test product."""
    product = Product(
        id=2,
        name='Inactive Product',
        slug='inactive-product',
        description='Inactive product description',
        price=49.99,
        stock=5,
        stock_quantity=5,
        sku='INACTIVE-001',
        category_id=test_category.id,
        brand_id=test_brand.id,
        is_active=False,
        created_at=datetime.now()
    )
    db_session.add(product)
    db_session.commit()
    return product

@pytest.fixture
def out_of_stock_product(db_session, test_category, test_brand):
    """Create an out of stock product."""
    product = Product(
        id=3,
        name='Out of Stock Product',
        slug='out-of-stock-product',
        description='Out of stock product description',
        price=29.99,
        stock=0,
        stock_quantity=0,
        sku='OOS-001',
        category_id=test_category.id,
        brand_id=test_brand.id,
        is_active=True,
        created_at=datetime.now()
    )
    db_session.add(product)
    db_session.commit()
    return product

@pytest.fixture
def multiple_products(db_session, test_category, test_brand):
    """Create multiple test products."""
    products = []
    for i in range(5):
        product = Product(
            id=10 + i,
            name=f'Product {i+1}',
            slug=f'product-{i+1}',
            description=f'Description for product {i+1}',
            price=10.0 * (i + 1),
            sale_price=8.0 * (i + 1) if i % 2 == 0 else None,
            stock=5 + i,
            stock_quantity=5 + i,
            sku=f'PROD-{i+1:03d}',
            category_id=test_category.id,
            brand_id=test_brand.id,
            is_active=True,
            is_featured=i % 2 == 0,
            is_sale=i % 2 == 0,
            created_at=datetime.now() - timedelta(days=i)
        )
        db_session.add(product)
        products.append(product)

    db_session.commit()
    return products

@pytest.fixture
def test_wishlist_item(db_session, test_user, test_product):
    """Create a test wishlist item."""
    item = WishlistItem(
        id=1,
        user_id=test_user.id,
        product_id=test_product.id,
        created_at=datetime.now()
    )
    db_session.add(item)
    db_session.commit()
    return item

@pytest.fixture
def multiple_wishlist_items(db_session, test_user, multiple_products):
    """Create multiple wishlist items."""
    items = []
    for i, product in enumerate(multiple_products[:3]):  # Add first 3 products to wishlist
        item = WishlistItem(
            id=10 + i,
            user_id=test_user.id,
            product_id=product.id,
            created_at=datetime.now() - timedelta(hours=i)
        )
        db_session.add(item)
        items.append(item)

    db_session.commit()
    return items

@pytest.fixture
def auth_headers(app, test_user):
    """Create authentication headers for test user."""
    with app.app_context():
        access_token = create_access_token(identity=test_user.id)
        return {'Authorization': f'Bearer {access_token}'}

@pytest.fixture
def inactive_user_auth_headers(app, inactive_user):
    """Create authentication headers for inactive user."""
    with app.app_context():
        access_token = create_access_token(identity=inactive_user.id)
        return {'Authorization': f'Bearer {access_token}'}

@pytest.fixture
def invalid_auth_headers():
    """Create invalid authentication headers."""
    return {'Authorization': 'Bearer invalid_token'}

@pytest.fixture
def mock_cache():
    """Mock cache for testing."""
    with patch('app.routes.wishlist.user_wishlist_routes.cache') as mock:
        mock.get.return_value = None
        mock.set.return_value = True
        mock.delete.return_value = True
        mock.delete_memoized.return_value = True
        yield mock

@pytest.fixture
def mock_limiter():
    """Mock rate limiter for testing."""
    with patch('app.routes.wishlist.user_wishlist_routes.limiter') as mock:
        yield mock

@pytest.fixture
def mock_db_error():
    """Mock database error for testing."""
    with patch('app.routes.wishlist.user_wishlist_routes.db.session') as mock_session:
        # Mock query method to raise exception
        mock_session.query.side_effect = Exception("Database connection error")
        mock_session.execute.side_effect = Exception("Database connection error")
        mock_session.commit.side_effect = Exception("Database commit error")
        mock_session.rollback.return_value = None
        yield mock_session

# Helper functions for tests
def create_test_products_bulk(db_session, category, brand, count=10):
    """Create multiple test products for bulk operations."""
    products = []
    for i in range(count):
        product = Product(
            id=100 + i,
            name=f'Bulk Product {i+1}',
            slug=f'bulk-product-{i+1}',
            description=f'Bulk product {i+1} description',
            price=15.0 + i,
            stock=10,
            stock_quantity=10,
            sku=f'BULK-{i+1:03d}',
            category_id=category.id,
            brand_id=brand.id,
            is_active=True,
            created_at=datetime.now()
        )
        db_session.add(product)
        products.append(product)

    db_session.commit()
    return products

def create_wishlist_at_limit(db_session, user, products, limit=500):
    """Create wishlist items up to the limit."""
    items = []
    for i in range(min(limit, len(products))):
        item = WishlistItem(
            user_id=user.id,
            product_id=products[i].id,
            created_at=datetime.now()
        )
        db_session.add(item)
        items.append(item)

    db_session.commit()
    return items

# Test data generators
@pytest.fixture
def sample_wishlist_data():
    """Sample data for wishlist operations."""
    return {
        'valid_product_id': 1,
        'invalid_product_id': 99999,
        'invalid_product_id_format': 'invalid',
        'bulk_product_ids': [1, 2, 3, 4, 5],
        'invalid_bulk_data': {
            'product_ids': 'not_a_list'
        },
        'empty_bulk_data': {
            'product_ids': []
        },
        'oversized_bulk_data': {
            'product_ids': list(range(1, 52))  # 51 items, over limit of 50
        }
    }

@pytest.fixture
def cors_headers():
    """CORS headers for testing."""
    return {
        'Origin': 'http://localhost:3000',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Content-Type, Authorization'
    }

# Performance testing fixtures
@pytest.fixture
def large_dataset(db_session, test_category, test_brand):
    """Create large dataset for performance testing."""
    products = []
    for i in range(100):
        product = Product(
            id=1000 + i,
            name=f'Performance Product {i+1}',
            slug=f'performance-product-{i+1}',
            description=f'Performance test product {i+1}',
            price=10.0 + (i * 0.5),
            stock=10,
            stock_quantity=10,
            sku=f'PERF-{i+1:03d}',
            category_id=test_category.id,
            brand_id=test_brand.id,
            is_active=True,
            created_at=datetime.now() - timedelta(minutes=i)
        )
        db_session.add(product)
        products.append(product)

    db_session.commit()
    return products

# Error simulation fixtures
@pytest.fixture
def simulate_rate_limit_exceeded():
    """Simulate rate limit exceeded."""
    def _simulate():
        from flask_limiter.errors import RateLimitExceeded
        raise RateLimitExceeded("Rate limit exceeded")
    return _simulate

@pytest.fixture
def simulate_jwt_error():
    """Simulate JWT errors."""
    def _simulate(error_type='expired'):
        from flask_jwt_extended.exceptions import JWTExtendedException
        if error_type == 'expired':
            raise JWTExtendedException("Token has expired")
        elif error_type == 'invalid':
            raise JWTExtendedException("Invalid token")
        else:
            raise JWTExtendedException("JWT error")
    return _simulate

# Cleanup fixtures
@pytest.fixture(autouse=True)
def cleanup_cache(app):
    """Automatically cleanup cache after each test."""
    yield
    with app.app_context():
        if cache:
            cache.clear()
        # Also ensure database session is properly cleaned up
        db.session.remove()

@pytest.fixture(autouse=True)
def reset_rate_limits(app):
    """Reset rate limits after each test."""
    yield
    with app.app_context():
        if limiter:
            limiter.reset()
        # Commit any pending transactions
        try:
            db.session.commit()
        except:
            db.session.rollback()
