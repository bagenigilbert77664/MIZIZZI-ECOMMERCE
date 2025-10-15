"""
Pytest configuration and fixtures for search route tests.
"""
import pytest
import os
import sys
import uuid
from datetime import datetime, timedelta
from decimal import Decimal
import json
from unittest.mock import Mock, patch

# Add the backend directory to the Python path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..'))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.models.models import (
    User, Product, Category, Brand, ProductEmbedding,
    UserRole
)
from app.configuration.extensions import db


@pytest.fixture(scope='session')
def app():
    """Create application for the tests."""
    # Import the create_app function
    from app import create_app

    # Create the app with testing configuration
    app = create_app('testing')

    # Override some settings for testing
    app.config.update({
        'TESTING': True,
        'SQLALCHEMY_DATABASE_URI': 'sqlite:///:memory:',
        'WTF_CSRF_ENABLED': False,
        'JWT_SECRET_KEY': 'test-jwt-secret',
        'SECRET_KEY': 'test-secret-key',
        'SQLALCHEMY_TRACK_MODIFICATIONS': False
    })

    return app


@pytest.fixture
def client(app):
    """Create a test client for the app."""
    return app.test_client()


@pytest.fixture
def runner(app):
    """Create a test runner for the app's Click commands."""
    return app.test_cli_runner()


@pytest.fixture(autouse=True)
def setup_database(app):
    """Set up and tear down the database for each test."""
    with app.app_context():
        db.create_all()
        yield
        db.session.remove()
        db.drop_all()


@pytest.fixture
def sample_user(app):
    """Create a sample user for testing."""
    with app.app_context():
        user = User(
            name="Test User",
            email="testuser@example.com",
            role=UserRole.USER,
            phone="+254700000000",
            is_active=True,
            email_verified=True
        )
        user.set_password("testpassword123")
        db.session.add(user)
        db.session.commit()

        # Refresh the object to ensure it's attached to the session
        db.session.refresh(user)
        return user


@pytest.fixture
def admin_user(app):
    """Create an admin user for testing."""
    with app.app_context():
        admin = User(
            name="Admin User",
            email="admin@example.com",
            role=UserRole.ADMIN,
            phone="+254700000001",
            is_active=True,
            email_verified=True
        )
        admin.set_password("adminpassword123")
        db.session.add(admin)
        db.session.commit()

        # Refresh the object to ensure it's attached to the session
        db.session.refresh(admin)
        return admin


@pytest.fixture
def sample_categories(app):
    """Create sample categories for testing."""
    with app.app_context():
        categories = []

        # Electronics category
        electronics = Category(
            name="Electronics",
            slug="electronics",
            description="Electronic devices and accessories",
            is_featured=True
        )
        categories.append(electronics)

        # Clothing category
        clothing = Category(
            name="Clothing",
            slug="clothing",
            description="Fashion and apparel",
            is_featured=True
        )
        categories.append(clothing)

        # Books category
        books = Category(
            name="Books",
            slug="books",
            description="Books and literature",
            is_featured=False
        )
        categories.append(books)

        for category in categories:
            db.session.add(category)

        db.session.commit()

        # Refresh all categories to ensure they're attached to the session
        for category in categories:
            db.session.refresh(category)

        return categories


@pytest.fixture
def sample_brands(app):
    """Create sample brands for testing."""
    with app.app_context():
        brands = []

        # Apple brand
        apple = Brand(
            name="Apple",
            slug="apple",
            description="Technology company",
            is_featured=True,
            is_active=True
        )
        brands.append(apple)

        # Samsung brand
        samsung = Brand(
            name="Samsung",
            slug="samsung",
            description="Electronics manufacturer",
            is_featured=True,
            is_active=True
        )
        brands.append(samsung)

        # Nike brand
        nike = Brand(
            name="Nike",
            slug="nike",
            description="Sports apparel and equipment",
            is_featured=False,
            is_active=True
        )
        brands.append(nike)

        for brand in brands:
            db.session.add(brand)

        db.session.commit()

        # Refresh all brands to ensure they're attached to the session
        for brand in brands:
            db.session.refresh(brand)

        return brands


@pytest.fixture
def sample_products(app, sample_categories, sample_brands):
    """Create sample products for testing."""
    with app.app_context():
        products = []

        # iPhone
        iphone = Product(
            name="iPhone 15 Pro",
            slug="iphone-15-pro",
            description="Latest iPhone with advanced camera system and A17 Pro chip",
            short_description="Premium smartphone with cutting-edge technology",
            price=Decimal('999.99'),
            sale_price=Decimal('899.99'),
            stock=50,
            stock_quantity=50,
            category_id=sample_categories[0].id,  # Electronics
            brand_id=sample_brands[0].id,  # Apple
            sku="IPHONE-15-PRO-001",
            is_active=True,
            is_featured=True,
            is_sale=True,
            weight=0.2,
            availability_status="in_stock"
        )
        iphone.set_image_urls([
            "https://example.com/iphone1.jpg",
            "https://example.com/iphone2.jpg"
        ])
        products.append(iphone)

        # Samsung Galaxy
        galaxy = Product(
            name="Samsung Galaxy S24 Ultra",
            slug="samsung-galaxy-s24-ultra",
            description="Flagship Android smartphone with S Pen and advanced AI features",
            short_description="Premium Android smartphone with S Pen",
            price=Decimal('1199.99'),
            stock=30,
            stock_quantity=30,
            category_id=sample_categories[0].id,  # Electronics
            brand_id=sample_brands[1].id,  # Samsung
            sku="GALAXY-S24-ULTRA-001",
            is_active=True,
            is_featured=True,
            weight=0.25,
            availability_status="in_stock"
        )
        galaxy.set_image_urls([
            "https://example.com/galaxy1.jpg"
        ])
        products.append(galaxy)

        # MacBook
        macbook = Product(
            name="MacBook Pro 16-inch",
            slug="macbook-pro-16-inch",
            description="Professional laptop with M3 Pro chip for demanding workflows",
            short_description="Professional laptop for creative work",
            price=Decimal('2499.99'),
            stock=15,
            stock_quantity=15,
            category_id=sample_categories[0].id,  # Electronics
            brand_id=sample_brands[0].id,  # Apple
            sku="MACBOOK-PRO-16-001",
            is_active=True,
            is_featured=False,
            weight=2.1,
            availability_status="in_stock"
        )
        products.append(macbook)

        # Nike Shoes
        nike_shoes = Product(
            name="Nike Air Max 270",
            slug="nike-air-max-270",
            description="Comfortable running shoes with Air Max technology",
            short_description="Stylish and comfortable running shoes",
            price=Decimal('150.00'),
            stock=100,
            stock_quantity=100,
            category_id=sample_categories[1].id,  # Clothing
            brand_id=sample_brands[2].id,  # Nike
            sku="NIKE-AIR-MAX-270-001",
            is_active=True,
            is_featured=False,
            weight=0.8,
            availability_status="in_stock"
        )
        products.append(nike_shoes)

        # Out of stock product
        out_of_stock = Product(
            name="Wireless Headphones",
            slug="wireless-headphones",
            description="Premium wireless headphones with noise cancellation",
            short_description="High-quality wireless headphones",
            price=Decimal('299.99'),
            stock=0,
            stock_quantity=0,
            category_id=sample_categories[0].id,  # Electronics
            brand_id=sample_brands[1].id,  # Samsung
            sku="HEADPHONES-001",
            is_active=True,
            is_featured=False,
            weight=0.3,
            availability_status="out_of_stock"
        )
        products.append(out_of_stock)

        # Inactive product
        inactive_product = Product(
            name="Old Phone Model",
            slug="old-phone-model",
            description="Discontinued phone model",
            price=Decimal('199.99'),
            stock=5,
            stock_quantity=5,
            category_id=sample_categories[0].id,  # Electronics
            brand_id=sample_brands[0].id,  # Apple
            sku="OLD-PHONE-001",
            is_active=False,  # Inactive
            is_featured=False,
            weight=0.15,
            availability_status="discontinued"
        )
        products.append(inactive_product)

        for product in products:
            db.session.add(product)

        db.session.commit()

        # Refresh all products to ensure they're attached to the session
        for product in products:
            db.session.refresh(product)

        return products


@pytest.fixture
def sample_embeddings(app, sample_products):
    """Create sample product embeddings for testing."""
    with app.app_context():
        embeddings = []

        # Create mock embeddings for products
        import numpy as np

        for i, product in enumerate(sample_products[:3]):  # Only for first 3 products
            # Create a simple mock embedding
            embedding_vector = np.random.rand(384).astype(np.float32)

            text_content = f"{product.name} {product.description}"

            embedding = ProductEmbedding(
                product_id=product.id,
                embedding_vector=embedding_vector.tobytes(),
                text_content=text_content,
                model_name='all-MiniLM-L6-v2',
                embedding_dimension=384
            )
            embeddings.append(embedding)
            db.session.add(embedding)

        db.session.commit()

        # Refresh all embeddings
        for embedding in embeddings:
            db.session.refresh(embedding)

        return embeddings


@pytest.fixture
def auth_headers(client, sample_user):
    """Get authentication headers for a regular user."""
    with client.application.app_context():
        from flask_jwt_extended import create_access_token
        token = create_access_token(identity=str(sample_user.id))
        return {'Authorization': f'Bearer {token}'}


@pytest.fixture
def admin_auth_headers(client, admin_user):
    """Get authentication headers for an admin user."""
    with client.application.app_context():
        from flask_jwt_extended import create_access_token
        token = create_access_token(identity=str(admin_user.id))
        return {'Authorization': f'Bearer {token}'}


@pytest.fixture
def mock_search_service():
    """Mock search service for testing."""
    service = Mock()

    # Mock search methods
    service.semantic_search.return_value = [
        {
            'id': 1,
            'name': 'Test Product 1',
            'description': 'Test description 1',
            'price': 99.99,
            'category_id': 1,
            'brand_id': 1,
            'is_featured': True,
            'is_sale': False,
            'stock': 10,
            'created_at': '2024-01-01T00:00:00'
        },
        {
            'id': 2,
            'name': 'Test Product 2',
            'description': 'Test description 2',
            'price': 199.99,
            'category_id': 2,
            'brand_id': 2,
            'is_featured': False,
            'is_sale': True,
            'stock': 5,
            'created_at': '2024-01-02T00:00:00'
        }
    ]

    service.keyword_search.return_value = service.semantic_search.return_value
    service.hybrid_search.return_value = service.semantic_search.return_value

    service.get_search_suggestions.return_value = [
        'test suggestion 1',
        'test suggestion 2',
        'test suggestion 3'
    ]

    service.get_popular_searches.return_value = [
        {'query': 'popular search 1', 'count': 100},
        {'query': 'popular search 2', 'count': 80},
        {'query': 'popular search 3', 'count': 60}
    ]

    return service


@pytest.fixture
def mock_embedding_service():
    """Mock embedding service for testing."""
    service = Mock()
    service.is_available.return_value = True
    service.get_index_stats.return_value = {
        'total_embeddings': 1000,
        'index_size': '10MB',
        'last_updated': '2024-01-01T00:00:00'
    }
    return service


@pytest.fixture
def mock_category():
    """Mock category model."""
    category = Mock()
    category.id = 1
    category.name = 'Test Category'
    category.is_featured = True
    category.to_dict.return_value = {
        'id': 1,
        'name': 'Test Category',
        'is_featured': True
    }
    return category


@pytest.fixture
def mock_brand():
    """Mock brand model."""
    brand = Mock()
    brand.id = 1
    brand.name = 'Test Brand'
    brand.is_featured = True
    brand.to_dict.return_value = {
        'id': 1,
        'name': 'Test Brand',
        'is_featured': True
    }
    return brand


@pytest.fixture
def mock_product():
    """Mock product model."""
    product = Mock()
    product.id = 1
    product.name = 'Test Product'
    product.description = 'Test description'
    product.price = 99.99
    product.is_active = True
    product.category = Mock()
    product.category.name = 'Test Category'
    product.to_dict.return_value = {
        'id': 1,
        'name': 'Test Product',
        'description': 'Test description',
        'price': 99.99,
        'is_active': True,
        'category_id': 1
    }
    return product


@pytest.fixture(autouse=True)
def mock_search_services(mock_search_service, mock_embedding_service):
    """Auto-use fixture to mock search services."""
    with patch('app.routes.search.user_search_routes.get_search_service', return_value=mock_search_service), \
         patch('app.routes.search.user_search_routes.get_embedding_service', return_value=mock_embedding_service):
        yield
