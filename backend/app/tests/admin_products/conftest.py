"""
Conftest file for admin products tests.
Contains shared fixtures and test configuration.
"""

import pytest
from datetime import datetime
from flask_jwt_extended import create_access_token

from app import create_app, db
from app.models.models import User, UserRole, Product, Category, Brand


@pytest.fixture(scope='function')
def app():
    """Create and configure a test app"""
    app = create_app('testing')

    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    """Create a test client"""
    return app.test_client()


@pytest.fixture
def create_admin_user(app):
    """Fixture to create an admin user and return its ID"""
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
    """Fixture to create a regular user and return its ID"""
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
    """Create authorization headers for a test user"""
    user_id = create_regular_user()
    with app.app_context():
        user = db.session.get(User, user_id)
        access_token = create_access_token(
            identity=str(user.id),
            additional_claims={"role": user.role.value}
        )
        return {'Authorization': f'Bearer {access_token}'}


@pytest.fixture
def admin_headers(app, create_admin_user):
    """Create authorization headers for an admin user"""
    admin_id = create_admin_user()
    with app.app_context():
        admin = db.session.get(User, admin_id)
        access_token = create_access_token(
            identity=str(admin.id),
            additional_claims={"role": admin.role.value}
        )
        return {'Authorization': f'Bearer {access_token}'}


@pytest.fixture
def create_test_product(app):
    """Fixture to create a test product"""
    def _create_product(**kwargs):
        with app.app_context():
            # Set default values
            defaults = {
                'name': 'Test Product',
                'slug': f'test-product-{datetime.now().microsecond}',
                'price': 25.00,
                'stock': 10,
                'is_active': True,
                'is_visible': True,
                'is_searchable': True,
                'is_featured': False,
                'is_new': False,
                'is_sale': False,
                'is_flash_sale': False,
                'is_luxury_deal': False
            }
            defaults.update(kwargs)

            product = Product(**defaults)
            db.session.add(product)
            db.session.commit()
            return product.id
    return _create_product


@pytest.fixture
def create_test_products(app):
    """Fixture to create multiple test products"""
    def _create_products(count, name_prefix='Product', **kwargs):
        with app.app_context():
            product_ids = []
            for i in range(count):
                defaults = {
                    'name': f'{name_prefix} {i+1}',
                    'slug': f'{name_prefix.lower()}-{i+1}-{datetime.now().microsecond}',
                    'price': 25.00 + i,
                    'stock': 10,
                    'is_active': True,
                    'is_visible': True,
                    'is_searchable': True,
                    'is_featured': False,
                    'is_new': False,
                    'is_sale': False
                }
                defaults.update(kwargs)

                product = Product(**defaults)
                db.session.add(product)
                db.session.flush()
                product_ids.append(product.id)

            db.session.commit()
            return product_ids
    return _create_products


@pytest.fixture
def create_test_category(app):
    """Fixture to create a test category"""
    def _create_category(name):
        with app.app_context():
            category = Category(
                name=name,
                slug=name.lower().replace(' ', '-')
            )
            db.session.add(category)
            db.session.commit()
            return category.id
    return _create_category


@pytest.fixture
def create_test_brand(app):
    """Fixture to create a test brand"""
    def _create_brand(name):
        with app.app_context():
            brand = Brand(
                name=name,
                slug=name.lower().replace(' ', '-')
            )
            db.session.add(brand)
            db.session.commit()
            return brand.id
    return _create_brand
