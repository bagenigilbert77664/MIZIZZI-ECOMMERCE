"""
Fixtures for brand route tests.
"""
import pytest
import uuid
import os
import sys
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager, create_access_token
from datetime import datetime, UTC
from app.models.models import Brand, User, UserRole, Product, Category
from app import create_app

# Add the backend directory to the Python path
backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Import the app factory and models
from app import create_app, db
from app.models.models import User, Brand, Product, Category, UserRole


@pytest.fixture(scope='session')
def app():
    """Create and configure a test app."""
    # Set test configuration
    os.environ['FLASK_ENV'] = 'testing'
    os.environ['DATABASE_URL'] = 'sqlite:///:memory:'

    app = create_app('testing')

    # Override configuration for testing
    app.config.update({
        'TESTING': True,
        'SQLALCHEMY_DATABASE_URI': 'sqlite:///:memory:',
        'SQLALCHEMY_TRACK_MODIFICATIONS': False,
        'JWT_SECRET_KEY': 'test-secret-key',
        'WTF_CSRF_ENABLED': False,
        'SECRET_KEY': 'test-secret-key'
    })

    with app.app_context():
        # Create all tables
        db.create_all()
        yield app
        # Clean up
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    """Create a test client."""
    return app.test_client()


@pytest.fixture
def create_brand(app):
    """Fixture to create a brand and return its ID."""
    def _create_brand(data):
        with app.app_context():
            brand = Brand(**data)
            db.session.add(brand)
            db.session.commit()
            return brand.id
    return _create_brand


@pytest.fixture
def create_admin_user(app):
    """Fixture to create an admin user and return its ID."""
    def _create_admin_user():
        with app.app_context():
            admin_user = User(
                name='Admin User',
                email='admin@test.com',
                role=UserRole.ADMIN
            )
            admin_user.set_password('password123')
            db.session.add(admin_user)
            db.session.commit()
            return admin_user.id
    return _create_admin_user


@pytest.fixture
def create_regular_user(app):
    """Fixture to create a regular user and return its ID."""
    def _create_regular_user():
        with app.app_context():
            user = User(
                name='Regular User',
                email='user@test.com',
                role=UserRole.USER
            )
            user.set_password('password123')
            db.session.add(user)
            db.session.commit()
            return user.id
    return _create_regular_user


@pytest.fixture
def auth_headers(app, create_regular_user):
    """Create authorization headers for a test user."""
    user_id = create_regular_user()
    with app.app_context():
        user = User.query.get(user_id)
        access_token = create_access_token(
            identity=str(user.id),
            additional_claims={"role": user.role.value}
        )
        return {'Authorization': f'Bearer {access_token}'}


@pytest.fixture
def admin_headers(app, create_admin_user):
    """Create authorization headers for an admin user."""
    admin_id = create_admin_user()
    with app.app_context():
        admin = User.query.get(admin_id)
        access_token = create_access_token(
            identity=str(admin.id),
            additional_claims={"role": admin.role.value}
        )
        return {'Authorization': f'Bearer {access_token}'}


# Brand-specific fixtures
@pytest.fixture
def create_test_brand(app):
    """Fixture to create a test brand."""
    def _create_brand(name='Test Brand', slug=None, description='Test Description',
                     logo_url=None, website=None, is_featured=False, is_active=True):
        with app.app_context():
            if slug is None:
                # Generate slug from name
                import re
                slug = name.lower()
                slug = re.sub(r'[^a-z0-9\s-]', '', slug)
                slug = re.sub(r'\s+', '-', slug)
                slug = slug.strip('-')

            brand = Brand(
                name=name,
                slug=slug,
                description=description,
                logo_url=logo_url,
                website=website,
                is_featured=is_featured,
                is_active=is_active
            )
            db.session.add(brand)
            db.session.commit()
            return brand
    return _create_brand


@pytest.fixture
def create_test_brands(app):
    """Fixture to create multiple test brands."""
    def _create_brands(count=3, names=None, slugs=None, **kwargs):
        with app.app_context():
            brands = []
            for i in range(count):
                name = names[i] if names and i < len(names) else f'Test Brand {i+1}'
                slug = slugs[i] if slugs and i < len(slugs) else None

                if slug is None:
                    # Generate slug from name
                    import re
                    slug = name.lower()
                    slug = re.sub(r'[^a-z0-9\s-]', '', slug)
                    slug = re.sub(r'\s+', '-', slug)
                    slug = slug.strip('-')

                brand = Brand(
                    name=name,
                    slug=slug,
                    description=kwargs.get('description', f'Description for {name}'),
                    logo_url=kwargs.get('logo_url'),
                    website=kwargs.get('website'),
                    is_featured=kwargs.get('is_featured', False),
                    is_active=kwargs.get('is_active', True)
                )
                db.session.add(brand)
                brands.append(brand)

            db.session.commit()
            return brands
    return _create_brands


@pytest.fixture
def create_test_category(app):
    """Fixture to create a test category."""
    def _create_category(name='Test Category', slug=None, description='Test Description',
                        is_active=True):
        with app.app_context():
            if slug is None:
                # Generate slug from name
                import re
                slug = name.lower()
                slug = re.sub(r'[^a-z0-9\s-]', '', slug)
                slug = re.sub(r'\s+', '-', slug)
                slug = slug.strip('-')

            category = Category(
                name=name,
                slug=slug,
                description=description,
                is_active=is_active
            )
            db.session.add(category)
            db.session.commit()
            return category
    return _create_category


@pytest.fixture
def create_test_product(app, create_test_brand, create_test_category):
    """Fixture to create a test product."""
    def _create_product(name='Test Product', price=100.0, brand_id=None, category_id=None,
                       description='Test Description', sku=None, stock_quantity=10,
                       is_active=True, is_featured=False, is_new=False, is_sale=False):
        with app.app_context():
            # Create brand and category if not provided
            if brand_id is None:
                brand = create_test_brand()
                brand_id = brand.id

            if category_id is None:
                category = create_test_category()
                category_id = category.id

            if sku is None:
                import uuid
                sku = f'SKU-{uuid.uuid4().hex[:8].upper()}'

            product = Product(
                name=name,
                description=description,
                price=price,
                sku=sku,
                stock_quantity=stock_quantity,
                brand_id=brand_id,
                category_id=category_id,
                is_active=is_active,
                is_featured=is_featured,
                is_new=is_new,
                is_sale=is_sale
            )
            db.session.add(product)
            db.session.commit()
            return product
    return _create_product


@pytest.fixture
def sample_brand_data():
    """Fixture providing sample brand data for tests."""
    return {
        'name': 'Nike',
        'slug': 'nike',
        'description': 'Just Do It - Leading athletic brand',
        'logo_url': 'https://example.com/nike-logo.png',
        'website': 'https://nike.com',
        'is_featured': True,
        'is_active': True
    }


@pytest.fixture
def cleanup_brands(app):
    """Fixture to clean up brands after tests."""
    yield
    with app.app_context():
        # Clean up any remaining test brands
        Brand.query.filter(Brand.name.like('Test Brand%')).delete()
        Brand.query.filter(Brand.name.like('Nike%')).delete()
        Brand.query.filter(Brand.name.like('Adidas%')).delete()
        Brand.query.filter(Brand.name.like('Puma%')).delete()
        db.session.commit()


@pytest.fixture
def cleanup_products(app):
    """Fixture to clean up products after tests."""
    yield
    with app.app_context():
        # Clean up any remaining test products
        Product.query.filter(Product.name.like('Test Product%')).delete()
        Product.query.filter(Product.name.like('Nike%')).delete()
        db.session.commit()
