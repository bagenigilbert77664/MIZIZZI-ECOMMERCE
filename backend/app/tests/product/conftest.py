import pytest
import os
import sys
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager, create_access_token

# Add the backend directory to the Python path
backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Import the app factory and models
from app import create_app, db
from app.models.models import User, Product, Category, Brand, ProductImage, ProductVariant, UserRole


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
def create_product(app):
    """Fixture to create a product and return its ID."""
    def _create_product(data):
        with app.app_context():
            product = Product(**data)
            db.session.add(product)
            db.session.commit()
            return product.id
    return _create_product


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
