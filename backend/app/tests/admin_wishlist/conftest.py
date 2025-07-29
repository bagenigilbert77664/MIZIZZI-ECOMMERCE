"""
Pytest configuration and fixtures for admin wishlist tests.
Provides comprehensive test setup including database, authentication, and test data.
"""

import pytest
import tempfile
import os
from datetime import datetime, timedelta
from unittest.mock import MagicMock

from flask import Flask
from flask_jwt_extended import create_access_token

# Import models and extensions
from app import create_app
from app.configuration.extensions import db
from app.models.models import User, Product, WishlistItem, Category, Brand, UserRole


@pytest.fixture(scope='session')
def app():
    """Create application for the tests."""
    # Create a temporary file for the test database
    db_fd, db_path = tempfile.mkstemp()

    # Create a test config class
    class TestConfig:
        TESTING = True
        SQLALCHEMY_DATABASE_URI = f'sqlite:///{db_path}'
        SQLALCHEMY_TRACK_MODIFICATIONS = False
        JWT_SECRET_KEY = 'test-secret-key'
        JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
        WTF_CSRF_ENABLED = False
        CACHE_TYPE = 'SimpleCache'
        CACHE_DEFAULT_TIMEOUT = 300
        RATELIMIT_STORAGE_URL = 'memory://'
        CORS_ORIGINS = ['http://localhost:3000']
        SECRET_KEY = 'test-secret-key'

    # Create app with default config, then override with test config
    app = create_app('default')
    app.config.from_object(TestConfig)

    with app.app_context():
        db.create_all()
        yield app

    # Clean up
    os.close(db_fd)
    os.unlink(db_path)


@pytest.fixture(scope='function')
def client(app):
    """Create a test client."""
    return app.test_client()


@pytest.fixture(scope='function')
def db_session(app):
    """Create a database session for tests."""
    with app.app_context():
        # Start a transaction
        connection = db.engine.connect()
        transaction = connection.begin()

        # Configure session to use the transaction
        db.session.configure(bind=connection)

        yield db.session

        # Rollback transaction and close connection
        transaction.rollback()
        connection.close()
        db.session.remove()


@pytest.fixture(scope='function')
def admin_user(app):
    """Create an admin user for testing."""
    with app.app_context():
        admin = User(
            email='admin@test.com',
            name='Admin User',
            phone='+254712345678',
            role=UserRole.ADMIN,
            is_active=True,
            email_verified=True,
            phone_verified=True,
            created_at=datetime.utcnow()
        )
        admin.set_password('admin123')

        db.session.add(admin)
        db.session.commit()
        db.session.refresh(admin)

        yield admin

        # Cleanup
        try:
            db.session.delete(admin)
            db.session.commit()
        except Exception:
            db.session.rollback()


@pytest.fixture(scope='function')
def regular_user(app):
    """Create a regular user for testing."""
    with app.app_context():
        user = User(
            email='user@test.com',
            name='Regular User',
            phone='+254712345679',
            role=UserRole.USER,
            is_active=True,
            email_verified=True,
            phone_verified=True,
            created_at=datetime.utcnow()
        )
        user.set_password('user123')

        db.session.add(user)
        db.session.commit()
        db.session.refresh(user)

        yield user

        # Cleanup
        try:
            db.session.delete(user)
            db.session.commit()
        except Exception:
            db.session.rollback()


@pytest.fixture(scope='function')
def inactive_user(app):
    """Create an inactive user for testing."""
    with app.app_context():
        user = User(
            email='inactive@test.com',
            name='Inactive User',
            phone='+254712345680',
            role=UserRole.USER,
            is_active=False,
            email_verified=True,
            phone_verified=True,
            created_at=datetime.utcnow()
        )
        user.set_password('inactive123')

        db.session.add(user)
        db.session.commit()
        db.session.refresh(user)

        yield user

        # Cleanup
        try:
            db.session.delete(user)
            db.session.commit()
        except Exception:
            db.session.rollback()


@pytest.fixture(scope='function')
def multiple_users(app):
    """Create multiple users for testing."""
    with app.app_context():
        users = []
        for i in range(3):
            user = User(
                email=f'user{i}@test.com',
                name=f'User{i} Test',
                phone=f'+25471234568{i}',
                role=UserRole.USER,
                is_active=True,
                email_verified=True,
                phone_verified=True,
                created_at=datetime.utcnow()
            )
            user.set_password(f'user{i}123')
            users.append(user)

        db.session.add_all(users)
        db.session.commit()

        # Refresh all users
        for user in users:
            db.session.refresh(user)

        yield users

        # Cleanup
        try:
            for user in users:
                db.session.delete(user)
            db.session.commit()
        except Exception:
            db.session.rollback()


@pytest.fixture(scope='function')
def category(app):
    """Create a category for testing."""
    with app.app_context():
        cat = Category(
            name='Test Category',
            slug='test-category',
            description='A test category',
            created_at=datetime.utcnow()
        )

        db.session.add(cat)
        db.session.commit()
        db.session.refresh(cat)

        yield cat

        # Cleanup
        try:
            db.session.delete(cat)
            db.session.commit()
        except Exception:
            db.session.rollback()


@pytest.fixture(scope='function')
def brand(app):
    """Create a brand for testing."""
    with app.app_context():
        brand_obj = Brand(
            name='Test Brand',
            slug='test-brand',
            description='A test brand',
            is_active=True,
            created_at=datetime.utcnow()
        )

        db.session.add(brand_obj)
        db.session.commit()
        db.session.refresh(brand_obj)

        yield brand_obj

        # Cleanup
        try:
            db.session.delete(brand_obj)
            db.session.commit()
        except Exception:
            db.session.rollback()


@pytest.fixture(scope='function')
def multiple_products(app, category, brand):
    """Create multiple products for testing."""
    with app.app_context():
        products = []
        for i in range(3):
            product = Product(
                name=f'Test Product {i}',
                slug=f'test-product-{i}',
                description=f'Description for test product {i}',
                price=25.0 + (i * 10),
                sale_price=20.0 + (i * 10) if i % 2 == 0 else None,
                stock=100 + (i * 10),
                stock_quantity=100 + (i * 10),
                category_id=category.id,
                brand_id=brand.id,
                is_active=True,
                is_featured=i == 0,
                is_sale=i % 2 == 0,
                thumbnail_url=f'/images/product{i}.jpg',
                created_at=datetime.utcnow()
            )
            # Set image URLs using the helper method
            product.set_image_urls([f'/images/product{i}_1.jpg', f'/images/product{i}_2.jpg'])
            products.append(product)

        db.session.add_all(products)
        db.session.commit()

        # Refresh all products
        for product in products:
            db.session.refresh(product)

        yield products

        # Cleanup
        try:
            for product in products:
                db.session.delete(product)
            db.session.commit()
        except Exception:
            db.session.rollback()


@pytest.fixture(scope='function')
def wishlist_items(app, multiple_users, multiple_products):
    """Create wishlist items for testing."""
    with app.app_context():
        items = []

        # Create wishlist items for each user-product combination
        for i, user in enumerate(multiple_users):
            for j, product in enumerate(multiple_products):
                if (i + j) % 2 == 0:  # Create some items, not all combinations
                    item = WishlistItem(
                        user_id=user.id,
                        product_id=product.id,
                        created_at=datetime.utcnow() - timedelta(days=i)
                    )
                    items.append(item)

        db.session.add_all(items)
        db.session.commit()

        # Refresh all items
        for item in items:
            db.session.refresh(item)

        yield items

        # Cleanup
        try:
            for item in items:
                db.session.delete(item)
            db.session.commit()
        except Exception:
            db.session.rollback()


@pytest.fixture(scope='function')
def admin_headers(app, admin_user):
    """Create authorization headers for admin user."""
    with app.app_context():
        access_token = create_access_token(
            identity=admin_user.id,
            additional_claims={'role': 'admin'}
        )
        return {'Authorization': f'Bearer {access_token}'}


@pytest.fixture(scope='function')
def user_headers(app, regular_user):
    """Create authorization headers for regular user."""
    with app.app_context():
        access_token = create_access_token(
            identity=regular_user.id,
            additional_claims={'role': 'user'}
        )
        return {'Authorization': f'Bearer {access_token}'}


@pytest.fixture(scope='function')
def mock_cache():
    """Mock cache for testing."""
    cache_mock = MagicMock()
    cache_mock.get.return_value = None
    cache_mock.set.return_value = True
    cache_mock.delete.return_value = True
    cache_mock.delete_memoized.return_value = True
    return cache_mock


@pytest.fixture(autouse=True)
def cleanup_db(app):
    """Clean up database after each test."""
    yield

    with app.app_context():
        try:
            # Clean up in reverse order of dependencies
            db.session.query(WishlistItem).delete()
            db.session.query(Product).delete()
            db.session.query(Category).delete()
            db.session.query(Brand).delete()
            db.session.query(User).delete()
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            print(f"Cleanup error: {e}")
        finally:
            db.session.remove()
