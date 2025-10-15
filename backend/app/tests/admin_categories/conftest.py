import pytest
import os
import sys
import uuid
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager, create_access_token

# Add the backend directory to the Python path
backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Import the app factory and models
from app import create_app, db
from app.models.models import User, Product, Category, Brand, UserRole


@pytest.fixture(scope='function')
def app():
    """Create and configure a test app for each test function."""
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
        user = db.session.get(User, user_id)
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
        admin = db.session.get(User, admin_id)
        access_token = create_access_token(
            identity=str(admin.id),
            additional_claims={"role": admin.role.value}
        )
        return {'Authorization': f'Bearer {access_token}'}


@pytest.fixture
def create_test_category(app):
    """Fixture to create a test category."""
    def _create_category(name=None, slug=None, description='Test Description',
                        is_featured=False, parent_id=None):
        with app.app_context():
            # Generate unique name and slug if not provided
            if name is None:
                unique_id = str(uuid.uuid4())[:8]
                name = f'Test Category {unique_id}'

            if slug is None:
                # Generate slug from name with unique suffix
                import re
                base_slug = name.lower()
                base_slug = re.sub(r'[^a-z0-9\s-]', '', base_slug)
                base_slug = re.sub(r'\s+', '-', base_slug)
                base_slug = base_slug.strip('-')

                # Add unique suffix to ensure uniqueness
                unique_suffix = str(uuid.uuid4())[:8]
                slug = f'{base_slug}-{unique_suffix}'

            category = Category(
                name=name,
                slug=slug,
                description=description,
                is_featured=is_featured,
                parent_id=parent_id
            )
            db.session.add(category)
            db.session.commit()
            # Refresh to ensure we have the latest data
            db.session.refresh(category)
            return category
    return _create_category


@pytest.fixture
def create_test_categories(app):
    """Fixture to create multiple test categories."""
    def _create_categories(count=3, names=None, slugs=None, **kwargs):
        with app.app_context():
            categories = []
            for i in range(count):
                unique_id = str(uuid.uuid4())[:8]
                name = names[i] if names and i < len(names) else f'Test Category {i+1} {unique_id}'

                if slugs and i < len(slugs):
                    slug = f'{slugs[i]}-{unique_id}'
                else:
                    # Generate slug from name
                    import re
                    base_slug = name.lower()
                    base_slug = re.sub(r'[^a-z0-9\s-]', '', base_slug)
                    base_slug = re.sub(r'\s+', '-', base_slug)
                    slug = base_slug.strip('-')

                category = Category(
                    name=name,
                    slug=slug,
                    description=kwargs.get('description', f'Description for {name}'),
                    is_featured=kwargs.get('is_featured', False),
                    parent_id=kwargs.get('parent_id')
                )
                db.session.add(category)
                categories.append(category)

            db.session.commit()
            # Refresh all categories
            for category in categories:
                db.session.refresh(category)
            return categories
    return _create_categories


@pytest.fixture
def create_test_brand(app):
    """Fixture to create a test brand."""
    def _create_brand(name=None, slug=None, description='Test Description'):
        with app.app_context():
            if name is None:
                unique_id = str(uuid.uuid4())[:8]
                name = f'Test Brand {unique_id}'

            if slug is None:
                # Generate slug from name with unique suffix
                import re
                base_slug = name.lower()
                base_slug = re.sub(r'[^a-z0-9\s-]', '', base_slug)
                base_slug = re.sub(r'\s+', '-', base_slug)
                base_slug = base_slug.strip('-')

                unique_suffix = str(uuid.uuid4())[:8]
                slug = f'{base_slug}-{unique_suffix}'

            brand = Brand(
                name=name,
                slug=slug,
                description=description
            )
            db.session.add(brand)
            db.session.commit()
            db.session.refresh(brand)
            return brand
    return _create_brand


@pytest.fixture
def create_test_product(app, create_test_brand, create_test_category):
    """Fixture to create a test product."""
    def _create_product(name=None, price=100.0, brand_id=None, category_id=None,
                       description='Test Description', sku=None, stock=10,
                       is_active=True, is_featured=False):
        with app.app_context():
            if name is None:
                unique_id = str(uuid.uuid4())[:8]
                name = f'Test Product {unique_id}'

            # Create brand and category if not provided
            if brand_id is None:
                brand = create_test_brand()
                brand_id = brand.id

            if category_id is None:
                category = create_test_category()
                category_id = category.id

            if sku is None:
                sku = f'SKU-{uuid.uuid4().hex[:8].upper()}'

            # Generate unique slug
            import re
            base_slug = name.lower()
            base_slug = re.sub(r'[^a-z0-9\s-]', '', base_slug)
            base_slug = re.sub(r'\s+', '-', base_slug)
            slug = base_slug.strip('-')

            product = Product(
                name=name,
                slug=slug,
                description=description,
                price=price,
                sku=sku,
                stock=stock,
                brand_id=brand_id,
                category_id=category_id,
                is_active=is_active,
                is_featured=is_featured
            )
            db.session.add(product)
            db.session.commit()
            db.session.refresh(product)
            return product
    return _create_product


@pytest.fixture
def create_test_products(app, create_test_brand, create_test_category):
    """Fixture to create multiple test products."""
    def _create_products(count=3, category_id=None, brand_id=None, names=None, prices=None, **kwargs):
        with app.app_context():
            # Create brand and category if not provided
            if brand_id is None:
                brand = create_test_brand()
                brand_id = brand.id

            if category_id is None:
                category = create_test_category()
                category_id = category.id

            products = []
            for i in range(count):
                unique_id = str(uuid.uuid4())[:8]
                name = names[i] if names and i < len(names) else f'Test Product {i+1} {unique_id}'
                price = prices[i] if prices and i < len(prices) else 100.0 + (i * 50)

                sku = f'SKU-{uuid.uuid4().hex[:8].upper()}'

                # Generate unique slug
                import re
                base_slug = name.lower()
                base_slug = re.sub(r'[^a-z0-9\s-]', '', base_slug)
                base_slug = re.sub(r'\s+', '-', base_slug)
                slug = base_slug.strip('-')

                product = Product(
                    name=name,
                    slug=slug,
                    description=kwargs.get('description', f'Description for {name}'),
                    price=price,
                    sku=sku,
                    stock=kwargs.get('stock', 10),
                    brand_id=brand_id,
                    category_id=category_id,
                    is_active=kwargs.get('is_active', True),
                    is_featured=kwargs.get('is_featured', False)
                )
                db.session.add(product)
                products.append(product)

            db.session.commit()
            # Refresh all products
            for product in products:
                db.session.refresh(product)
            return products
    return _create_products


@pytest.fixture
def sample_category_data():
    """Fixture providing sample category data for tests."""
    unique_id = str(uuid.uuid4())[:8]
    return {
        'name': f'Electronics {unique_id}',
        'slug': f'electronics-{unique_id}',
        'description': 'Electronic devices and gadgets',
        'is_featured': True
    }


@pytest.fixture
def cleanup_categories(app):
    """Fixture to clean up categories after tests."""
    yield
    with app.app_context():
        # Clean up any remaining test categories
        Category.query.filter(Category.name.like('Test Category%')).delete()
        Category.query.filter(Category.name.like('Electronics%')).delete()
        Category.query.filter(Category.name.like('Clothing%')).delete()
        db.session.commit()


@pytest.fixture
def cleanup_products(app):
    """Fixture to clean up products after tests."""
    yield
    with app.app_context():
        # Clean up any remaining test products
        Product.query.filter(Product.name.like('Test Product%')).delete()
        db.session.commit()
