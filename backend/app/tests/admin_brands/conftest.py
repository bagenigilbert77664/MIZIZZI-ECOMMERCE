"""Pytest configuration and fixtures for admin brand routes tests."""

import pytest
import json
import uuid
from datetime import datetime, UTC
from unittest.mock import Mock, patch, MagicMock

# Test framework imports
from flask import Flask
from flask_testing import TestCase

# Import the main application components
try:
    from app.configuration.extensions import db, ma, mail, cache, cors
    from app.models.models import (
        User, UserRole, Brand, Product, Category,
        ProductImage, ProductVariant
    )
    from app.schemas.schemas import (
        brand_schema, brands_schema,
        product_schema, products_schema
    )
    from app.routes.brands.admin_brand_routes import admin_brand_routes
except ImportError:
    # Fallback imports for different project structures
    from backend.app.configuration.extensions import db, ma, mail, cache, cors
    from backend.app.models.models import (
        User, UserRole, Brand, Product, Category,
        ProductImage, ProductVariant
    )
    from backend.app.schemas.schemas import (
        brand_schema, brands_schema,
        product_schema, products_schema
    )
    from backend.app.routes.brands.admin_brand_routes import admin_brand_routes


@pytest.fixture(scope='function')
def app():
    """Create and configure a test Flask application."""
    app = Flask(__name__)
    app.config.update({
        'TESTING': True,
        'WTF_CSRF_ENABLED': False,
        'SQLALCHEMY_DATABASE_URI': 'sqlite:///:memory:',
        'SQLALCHEMY_TRACK_MODIFICATIONS': False,
        'JWT_SECRET_KEY': 'test-secret-key',
        'JWT_ACCESS_TOKEN_EXPIRES': False,
        'JWT_TOKEN_LOCATION': ['headers'],
        'JWT_HEADER_NAME': 'Authorization',
        'JWT_HEADER_TYPE': 'Bearer',
        'ITEMS_PER_PAGE': 12,
        'CACHE_TYPE': 'simple',
        'MAIL_SUPPRESS_SEND': True,
        'SECRET_KEY': 'test-secret-key'
    })

    # Initialize extensions
    db.init_app(app)
    ma.init_app(app)
    cache.init_app(app)
    cors.init_app(app)

    # Initialize JWT
    from flask_jwt_extended import JWTManager
    jwt = JWTManager(app)

    # Register blueprint
    app.register_blueprint(admin_brand_routes, url_prefix='/api/admin/brands')

    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    """Create a test client."""
    return app.test_client()


@pytest.fixture
def admin_user(app):
    """Create an admin user for testing."""
    with app.app_context():
        # Check if user already exists
        existing_user = User.query.filter_by(email='admin@test.com').first()
        if existing_user:
            return existing_user

        admin = User(
            id=1,
            email='admin@test.com',
            name='Admin User',
            role=UserRole.ADMIN,
            is_active=True,
            email_verified=True
        )
        admin.set_password('admin123')
        db.session.add(admin)
        db.session.commit()

        # Refresh the object to ensure it's attached to the session
        db.session.refresh(admin)
        return admin


@pytest.fixture
def regular_user(app):
    """Create a regular user for testing."""
    with app.app_context():
        # Check if user already exists
        existing_user = User.query.filter_by(email='user@test.com').first()
        if existing_user:
            return existing_user

        user = User(
            id=2,
            email='user@test.com',
            name='Regular User',
            role=UserRole.USER,
            is_active=True,
            email_verified=True
        )
        user.set_password('user123')
        db.session.add(user)
        db.session.commit()

        # Refresh the object to ensure it's attached to the session
        db.session.refresh(user)
        return user


@pytest.fixture
def admin_headers(app):
    """Create authorization headers for admin user."""
    from flask_jwt_extended import create_access_token

    with app.app_context():
        # Create or get admin user within the same context
        admin = User.query.filter_by(email='admin@test.com').first()
        if not admin:
            admin = User(
                id=1,
                email='admin@test.com',
                name='Admin User',
                role=UserRole.ADMIN,
                is_active=True,
                email_verified=True
            )
            admin.set_password('admin123')
            db.session.add(admin)
            db.session.commit()
            db.session.refresh(admin)

        # Use just the user ID, not a dictionary
        access_token = create_access_token(identity=admin.id)
        return {
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        }


@pytest.fixture
def user_headers(app):
    """Create authorization headers for regular user."""
    from flask_jwt_extended import create_access_token

    with app.app_context():
        # Create or get regular user within the same context
        user = User.query.filter_by(email='user@test.com').first()
        if not user:
            user = User(
                id=2,
                email='user@test.com',
                name='Regular User',
                role=UserRole.USER,
                is_active=True,
                email_verified=True
            )
            user.set_password('user123')
            db.session.add(user)
            db.session.commit()
            db.session.refresh(user)

        # Use just the user ID, not a dictionary
        access_token = create_access_token(identity=user.id)
        return {
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        }


@pytest.fixture
def sample_brands(app):
    """Create sample brands for testing."""
    with app.app_context():
        # Clear existing brands
        Brand.query.delete()
        db.session.commit()

        brands = []

        # Active featured brand
        brand1 = Brand(
            id=1,
            name='Nike',
            slug='nike',
            description='Just Do It',
            logo_url='https://example.com/nike-logo.png',
            website='https://nike.com',
            is_active=True,
            is_featured=True
        )
        brands.append(brand1)

        # Active non-featured brand
        brand2 = Brand(
            id=2,
            name='Adidas',
            slug='adidas',
            description='Impossible is Nothing',
            logo_url='https://example.com/adidas-logo.png',
            website='https://adidas.com',
            is_active=True,
            is_featured=False
        )
        brands.append(brand2)

        # Inactive brand
        brand3 = Brand(
            id=3,
            name='Puma',
            slug='puma',
            description='Forever Faster',
            is_active=False,
            is_featured=False
        )
        brands.append(brand3)

        # Featured inactive brand
        brand4 = Brand(
            id=4,
            name='Reebok',
            slug='reebok',
            description='Be More Human',
            is_active=False,
            is_featured=True
        )
        brands.append(brand4)

        for brand in brands:
            db.session.add(brand)

        db.session.commit()

        # Refresh all brands to ensure they're attached to the session
        for brand in brands:
            db.session.refresh(brand)

        return brands


@pytest.fixture
def sample_category(app):
    """Create a sample category for testing."""
    with app.app_context():
        # Clear existing categories
        Category.query.delete()
        db.session.commit()

        category = Category(
            id=1,
            name='Shoes',
            slug='shoes',
            description='Footwear category'
        )
        db.session.add(category)
        db.session.commit()
        db.session.refresh(category)
        return category


@pytest.fixture
def sample_products(app, sample_brands, sample_category):
    """Create sample products for testing."""
    with app.app_context():
        # Clear existing products
        Product.query.delete()
        db.session.commit()

        products = []

        # Nike products
        product1 = Product(
            id=1,
            name='Nike Air Max',
            slug='nike-air-max',
            description='Classic Nike sneakers',
            price=150.00,
            brand_id=1,  # Nike
            category_id=1,
            is_active=True,
            is_featured=True
        )
        products.append(product1)

        product2 = Product(
            id=2,
            name='Nike React',
            slug='nike-react',
            description='Comfortable running shoes',
            price=120.00,
            brand_id=1,  # Nike
            category_id=1,
            is_active=True,
            is_featured=False
        )
        products.append(product2)

        # Adidas products
        product3 = Product(
            id=3,
            name='Adidas Ultraboost',
            slug='adidas-ultraboost',
            description='Premium running shoes',
            price=180.00,
            brand_id=2,  # Adidas
            category_id=1,
            is_active=True,
            is_featured=True
        )
        products.append(product3)

        # Inactive product
        product4 = Product(
            id=4,
            name='Nike Inactive',
            slug='nike-inactive',
            description='Inactive product',
            price=100.00,
            brand_id=1,  # Nike
            category_id=1,
            is_active=False,
            is_featured=False
        )
        products.append(product4)

        for product in products:
            db.session.add(product)

        db.session.commit()

        # Refresh all products to ensure they're attached to the session
        for product in products:
            db.session.refresh(product)

        return products


@pytest.fixture
def mock_db_session():
    """Mock database session for error testing."""
    with patch('app.routes.brands.admin_brand_routes.db.session') as mock_session:
        yield mock_session


@pytest.fixture
def mock_brand_query():
    """Mock Brand query for testing."""
    with patch('app.routes.brands.admin_brand_routes.Brand.query') as mock_query:
        yield mock_query


@pytest.fixture
def mock_product_query():
    """Mock Product query for testing."""
    with patch('app.routes.brands.admin_brand_routes.Product.query') as mock_query:
        yield mock_query


@pytest.fixture
def mock_cache():
    """Mock cache for testing."""
    with patch('app.routes.brands.admin_brand_routes.cache') as mock_cache:
        mock_cache.get.return_value = None
        mock_cache.set.return_value = True
        mock_cache.delete.return_value = True
        yield mock_cache


@pytest.fixture
def mock_logger():
    """Mock logger for testing."""
    with patch('app.routes.brands.admin_brand_routes.logger') as mock_logger:
        yield mock_logger


# Helper functions for tests
def create_test_brand_data(name="Test Brand", **kwargs):
    """Create test brand data."""
    data = {
        'name': name,
        'slug': kwargs.get('slug', name.lower().replace(' ', '-')),
        'description': kwargs.get('description', f'{name} description'),
        'logo_url': kwargs.get('logo_url', f'https://example.com/{name.lower()}-logo.png'),
        'website': kwargs.get('website', f'https://{name.lower().replace(" ", "")}.com'),
        'is_active': kwargs.get('is_active', True),
        'is_featured': kwargs.get('is_featured', False)
    }
    return data


def assert_brand_response_structure(brand_data):
    """Assert that brand response has correct structure."""
    required_fields = ['id', 'name', 'slug', 'description', 'is_active', 'is_featured']
    for field in required_fields:
        assert field in brand_data, f"Missing field: {field}"


def assert_pagination_structure(response_data):
    """Assert that pagination structure is correct."""
    assert 'items' in response_data
    assert 'pagination' in response_data

    pagination = response_data['pagination']
    required_fields = ['page', 'per_page', 'total_pages', 'total_items']
    for field in required_fields:
        assert field in pagination, f"Missing pagination field: {field}"


def assert_cors_headers(response):
    """Assert that CORS headers are present."""
    assert 'Access-Control-Allow-Origin' in response.headers
    # Note: Some CORS headers might be added by Flask-CORS middleware
    # and may not be present in all responses during testing
