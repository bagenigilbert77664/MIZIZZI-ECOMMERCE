"""
Pytest configuration and fixtures for user brand routes tests.
"""
import pytest
import uuid
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from unittest.mock import patch, MagicMock

from flask import Flask
from flask_jwt_extended import create_access_token

from app import create_app
from app.configuration.extensions import db
from app.models.models import (
    User, UserRole, Brand, Product, Category,
    ProductImage, ProductVariant, Review
)


@pytest.fixture(scope='session')
def app():
    """Create application for the tests."""
    app = create_app('testing')
    app.config.update({
        'TESTING': True,
        'SQLALCHEMY_DATABASE_URI': 'sqlite:///:memory:',
        'JWT_SECRET_KEY': 'test-jwt-secret-key',
        'SECRET_KEY': 'test-secret-key',
        'WTF_CSRF_ENABLED': False,
        'ITEMS_PER_PAGE': 10,
        'CORS_ORIGINS': ['http://localhost:3000'],
        'CACHE_TYPE': 'simple',
        'RATELIMIT_ENABLED': False
    })

    with app.app_context():
        db.create_all()
        yield app
        db.drop_all()


@pytest.fixture(scope='function')
def client(app):
    """Create a test client for the app."""
    return app.test_client()


@pytest.fixture(scope='function')
def db_session(app):
    """Create a database session for the test."""
    with app.app_context():
        # Clear all tables before each test
        db.session.query(Product).delete()
        db.session.query(Brand).delete()
        db.session.query(Category).delete()
        db.session.query(User).delete()
        db.session.commit()

        yield db.session

        # Clean up after test
        db.session.rollback()
        db.session.query(Product).delete()
        db.session.query(Brand).delete()
        db.session.query(Category).delete()
        db.session.query(User).delete()
        db.session.commit()


@pytest.fixture
def test_user(db_session):
    """Create a test user."""
    user = User(
        name='Test User',
        email='testuser@example.com',
        phone='+254712345678',
        role=UserRole.USER,
        email_verified=True,
        phone_verified=True,
        is_active=True,
        created_at=datetime.now(timezone.utc)
    )
    user.set_password('TestPassword123!')
    db_session.add(user)
    db_session.commit()
    return user


@pytest.fixture
def admin_user(db_session):
    """Create an admin user."""
    admin = User(
        name='Admin User',
        email='admin@example.com',
        phone='+254712345679',
        role=UserRole.ADMIN,
        email_verified=True,
        phone_verified=True,
        is_active=True,
        created_at=datetime.now(timezone.utc)
    )
    admin.set_password('AdminPassword123!')
    db_session.add(admin)
    db_session.commit()
    return admin


@pytest.fixture
def auth_headers(app, test_user):
    """Create authentication headers for test user."""
    with app.app_context():
        access_token = create_access_token(
            identity=str(test_user.id),
            additional_claims={"role": test_user.role.value}
        )
        return {'Authorization': f'Bearer {access_token}'}


@pytest.fixture
def admin_headers(app, admin_user):
    """Create authentication headers for admin user."""
    with app.app_context():
        access_token = create_access_token(
            identity=str(admin_user.id),
            additional_claims={"role": admin_user.role.value}
        )
        return {'Authorization': f'Bearer {access_token}'}


@pytest.fixture
def test_category(db_session):
    """Create a test category."""
    category = Category(
        name='Test Category',
        slug='test-category',
        description='Test category description',
        created_at=datetime.now(timezone.utc)
    )
    db_session.add(category)
    db_session.commit()
    return category


@pytest.fixture
def active_brands(db_session):
    """Create multiple active test brands."""
    brands = []

    # Generate unique slugs using timestamp
    timestamp = int(datetime.now().timestamp() * 1000000)

    # Featured active brand
    brand1 = Brand(
        name='Nike',
        slug=f'nike-{timestamp}',
        description='Just Do It - Premium sportswear brand',
        logo_url='https://example.com/nike-logo.png',
        website='https://nike.com',
        is_active=True,
        is_featured=True,
        created_at=datetime.now(timezone.utc)
    )
    brands.append(brand1)

    # Regular active brand
    brand2 = Brand(
        name='Adidas',
        slug=f'adidas-{timestamp}',
        description='Impossible is Nothing - Sports and lifestyle brand',
        logo_url='https://example.com/adidas-logo.png',
        website='https://adidas.com',
        is_active=True,
        is_featured=False,
        created_at=datetime.now(timezone.utc)
    )
    brands.append(brand2)

    # Another featured brand
    brand3 = Brand(
        name='Puma',
        slug=f'puma-{timestamp}',
        description='Forever Faster - Athletic and casual footwear',
        logo_url='https://example.com/puma-logo.png',
        website='https://puma.com',
        is_active=True,
        is_featured=True,
        created_at=datetime.now(timezone.utc)
    )
    brands.append(brand3)

    for brand in brands:
        db_session.add(brand)

    db_session.commit()
    return brands


@pytest.fixture
def inactive_brands(db_session):
    """Create inactive test brands."""
    brands = []

    # Generate unique slugs using timestamp
    timestamp = int(datetime.now().timestamp() * 1000000)

    # Inactive brand (should not appear in public routes)
    brand1 = Brand(
        name='Inactive Brand',
        slug=f'inactive-brand-{timestamp}',
        description='This brand is inactive',
        is_active=False,
        is_featured=True,
        created_at=datetime.now(timezone.utc)
    )
    brands.append(brand1)

    # Another inactive brand
    brand2 = Brand(
        name='Disabled Brand',
        slug=f'disabled-brand-{timestamp}',
        description='This brand is disabled',
        is_active=False,
        is_featured=False,
        created_at=datetime.now(timezone.utc)
    )
    brands.append(brand2)

    for brand in brands:
        db_session.add(brand)

    db_session.commit()
    return brands


@pytest.fixture
def test_products(db_session, active_brands, test_category):
    """Create test products for brands."""
    products = []

    # Generate unique SKUs using timestamp
    timestamp = int(datetime.now().timestamp() * 1000000)

    # Products for Nike (brand 0)
    nike_product1 = Product(
        name='Nike Air Max 90',
        slug=f'nike-air-max-90-{timestamp}',
        description='Classic Nike Air Max sneakers',
        price=Decimal('150.00'),
        sale_price=Decimal('130.00'),  # Changed from compare_price
        sku=f'NIKE-AM90-{timestamp}',
        barcode=f'123456789012{timestamp % 10}',
        stock_quantity=50,  # Changed from quantity
        weight=Decimal('1.2'),
        brand_id=active_brands[0].id,
        category_id=test_category.id,
        is_active=True,
        is_featured=True,
        is_new=True,
        is_sale=False,
        created_at=datetime.now(timezone.utc)
    )
    products.append(nike_product1)

    nike_product2 = Product(
        name='Nike React Infinity',
        slug=f'nike-react-infinity-{timestamp}',
        description='Nike React running shoes',
        price=Decimal('160.00'),
        sale_price=Decimal('140.00'),  # Changed from compare_price
        sku=f'NIKE-RI-{timestamp}',
        barcode=f'123456789013{timestamp % 10}',
        stock_quantity=30,  # Changed from quantity
        weight=Decimal('1.1'),
        brand_id=active_brands[0].id,
        category_id=test_category.id,
        is_active=True,
        is_featured=False,
        is_new=False,
        is_sale=True,
        created_at=datetime.now(timezone.utc)
    )
    products.append(nike_product2)

    # Products for Adidas (brand 1)
    adidas_product1 = Product(
        name='Adidas Ultraboost 22',
        slug=f'adidas-ultraboost-22-{timestamp}',
        description='Adidas Ultraboost running shoes',
        price=Decimal('180.00'),
        sale_price=Decimal('160.00'),  # Changed from compare_price
        sku=f'ADIDAS-UB22-{timestamp}',
        barcode=f'123456789014{timestamp % 10}',
        stock_quantity=25,  # Changed from quantity
        weight=Decimal('1.3'),
        brand_id=active_brands[1].id,
        category_id=test_category.id,
        is_active=True,
        is_featured=True,
        is_new=False,
        is_sale=False,
        created_at=datetime.now(timezone.utc)
    )
    products.append(adidas_product1)

    # Inactive product (should not appear in public routes)
    inactive_product = Product(
        name='Inactive Product',
        slug=f'inactive-product-{timestamp}',
        description='This product is inactive',
        price=Decimal('100.00'),
        sku=f'INACTIVE-{timestamp}',
        brand_id=active_brands[0].id,
        category_id=test_category.id,
        is_active=False,
        is_featured=False,
        created_at=datetime.now(timezone.utc)
    )
    products.append(inactive_product)

    for product in products:
        db_session.add(product)

    db_session.commit()
    return products


@pytest.fixture
def mock_brand_schema():
    """Mock brand schema for testing."""
    with patch('app.routes.brands.user_brand_routes.brand_schema') as mock_schema:
        mock_schema.dump.return_value = {
            'id': 1,
            'name': 'Test Brand',
            'slug': 'test-brand',
            'description': 'Test brand description',
            'is_active': True,
            'is_featured': False
        }
        yield mock_schema


@pytest.fixture
def mock_brands_schema():
    """Mock brands schema for testing."""
    with patch('app.routes.brands.user_brand_routes.brands_schema') as mock_schema:
        mock_schema.dump.return_value = [
            {
                'id': 1,
                'name': 'Test Brand 1',
                'slug': 'test-brand-1',
                'is_active': True,
                'is_featured': True
            },
            {
                'id': 2,
                'name': 'Test Brand 2',
                'slug': 'test-brand-2',
                'is_active': True,
                'is_featured': False
            }
        ]
        yield mock_schema


@pytest.fixture
def mock_products_schema():
    """Mock products schema for testing."""
    with patch('app.routes.brands.user_brand_routes.products_schema') as mock_schema:
        mock_schema.dump.return_value = [
            {
                'id': 1,
                'name': 'Test Product 1',
                'price': '150.00',
                'is_active': True,
                'brand_id': 1
            },
            {
                'id': 2,
                'name': 'Test Product 2',
                'price': '200.00',
                'is_active': True,
                'brand_id': 1
            }
        ]
        yield mock_schema


class TestDataGenerator:
    """Helper class to generate test data."""

    @staticmethod
    def create_brand_data(**kwargs):
        """Create brand data for testing."""
        timestamp = int(datetime.now().timestamp() * 1000000)
        default_data = {
            'name': f'Test Brand {uuid.uuid4().hex[:8]}',
            'slug': f'test-brand-{timestamp}',
            'description': 'Test brand description',
            'logo_url': 'https://example.com/logo.png',
            'website': 'https://example.com',
            'is_active': True,
            'is_featured': False
        }
        default_data.update(kwargs)
        return default_data

    @staticmethod
    def create_product_data(brand_id, category_id, **kwargs):
        """Create product data for testing."""
        timestamp = int(datetime.now().timestamp() * 1000000)
        default_data = {
            'name': f'Test Product {uuid.uuid4().hex[:8]}',
            'slug': f'test-product-{timestamp}',
            'description': 'Test product description',
            'price': Decimal('100.00'),
            'sku': f'TEST-{timestamp}',
            'brand_id': brand_id,
            'category_id': category_id,
            'is_active': True,
            'is_featured': False,
            'stock_quantity': 10  # Changed from quantity
        }
        default_data.update(kwargs)
        return default_data

    @staticmethod
    def create_pagination_params(**kwargs):
        """Create pagination parameters for testing."""
        default_params = {
            'page': 1,
            'per_page': 10
        }
        default_params.update(kwargs)
        return default_params


@pytest.fixture
def large_dataset(db_session, test_category):
    """Create a large dataset for performance testing."""
    brands = []
    products = []

    # Generate unique timestamp for this dataset
    timestamp = int(datetime.now().timestamp() * 1000000)

    # Create 50 brands
    for i in range(50):
        brand = Brand(
            name=f'Brand {i+1:02d}',
            slug=f'brand-{i+1:02d}-{timestamp}',
            description=f'Description for brand {i+1}',
            is_active=True,
            is_featured=(i % 5 == 0),  # Every 5th brand is featured
            created_at=datetime.now(timezone.utc)
        )
        brands.append(brand)
        db_session.add(brand)

    db_session.commit()

    # Create 5 products per brand (250 total)
    for brand in brands:
        for j in range(5):
            product = Product(
                name=f'{brand.name} Product {j+1}',
                slug=f'{brand.slug}-product-{j+1}',
                description=f'Product {j+1} from {brand.name}',
                price=Decimal(f'{100 + (j * 20)}.00'),
                sku=f'{brand.slug.upper()}-P{j+1:02d}',
                brand_id=brand.id,
                category_id=test_category.id,
                is_active=True,
                is_featured=(j == 0),  # First product of each brand is featured
                stock_quantity=10 + j,  # Changed from quantity
                created_at=datetime.now(timezone.utc)
            )
            products.append(product)
            db_session.add(product)

    db_session.commit()
    return {'brands': brands, 'products': products}


@pytest.fixture
def mock_db_error():
    """Mock database error for testing error handling."""
    return patch('app.routes.brands.user_brand_routes.Brand.query', side_effect=Exception("Database connection error"))


@pytest.fixture
def mock_pagination_error():
    """Mock pagination error for testing error handling."""
    return patch('app.routes.brands.user_brand_routes.paginate_response', side_effect=Exception("Pagination error"))
