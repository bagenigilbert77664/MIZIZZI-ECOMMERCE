"""
Pytest configuration and fixtures for admin categories tests.
Provides reusable test data, authentication tokens, and database setup/teardown.
"""

import pytest
import uuid
from datetime import datetime, timedelta
from flask_jwt_extended import create_access_token
from app.models.models import User, Category, Product, db

# Add these imports
import os
import sys
import tempfile

# Add the parent directories to sys.path to allow absolute imports
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.abspath(os.path.join(current_dir, '..', '..'))
app_dir = os.path.abspath(os.path.join(backend_dir, 'app'))

for path in [backend_dir, app_dir]:
    if path not in sys.path:
        sys.path.insert(0, path)

from app import create_app
from app.configuration.extensions import db as _db


@pytest.fixture(scope='session')
def app():
    """Create application for the tests."""
    # Create a temporary database file
    db_fd, db_path = tempfile.mkstemp()

    app = create_app('testing')
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{db_path}'
    app.config['WTF_CSRF_ENABLED'] = False
    app.config['JWT_SECRET_KEY'] = 'test-secret-key'
    app.config['SECRET_KEY'] = 'test-secret-key'
    app.config['MAIL_SUPPRESS_SEND'] = True
    app.config['MAIL_DEFAULT_SENDER'] = 'test@example.com'

    # Disable rate limiting for tests
    app.config['RATELIMIT_ENABLED'] = False

    with app.app_context():
        _db.create_all()
        yield app
        _db.drop_all()

    os.close(db_fd)
    os.unlink(db_path)


@pytest.fixture(scope='function')
def db(app):
    """Create database for the tests."""
    with app.app_context():
        _db.create_all()
        yield _db
        _db.session.rollback()
        _db.drop_all()


@pytest.fixture(scope='function')
def client(app):
    """Create a test client for the app."""
    return app.test_client()


@pytest.fixture(scope='function')
def runner(app):
    """Create a test runner for the app's Click commands."""
    return app.test_cli_runner()


@pytest.fixture
def admin_user(app, db):
    """Create an admin user for testing admin endpoints."""
    with app.app_context():
        # Import UserRole enum
        from app.models.models import UserRole

        # Create admin user with unique email
        admin_email = f"admin_{uuid.uuid4().hex[:8]}@test.com"
        admin = User(
            name="Admin User",  # Use 'name' instead of 'first_name' and 'last_name'
            email=admin_email,
            role=UserRole.ADMIN,  # Use enum value instead of string
            is_active=True,
            email_verified=True
        )
        admin.set_password("admin123")

        db.session.add(admin)
        db.session.commit()

        yield admin

        # Cleanup
        try:
            db.session.delete(admin)
            db.session.commit()
        except Exception:
            db.session.rollback()


@pytest.fixture
def regular_user(app, db):
    """Create a regular user for testing authorization."""
    with app.app_context():
        # Import UserRole enum
        from app.models.models import UserRole

        # Create regular user with unique email
        user_email = f"user_{uuid.uuid4().hex[:8]}@test.com"
        user = User(
            name="Regular User",  # Use 'name' instead of 'first_name' and 'last_name'
            email=user_email,
            role=UserRole.USER,  # Use enum value instead of string
            is_active=True,
            email_verified=True
        )
        user.set_password("user123")

        db.session.add(user)
        db.session.commit()

        yield user

        # Cleanup
        try:
            db.session.delete(user)
            db.session.commit()
        except Exception:
            db.session.rollback()


@pytest.fixture
def admin_token(app, admin_user):
    """Generate JWT token for admin user."""
    with app.app_context():
        token = create_access_token(
            identity=admin_user.id,
            expires_delta=timedelta(hours=1)
        )
        return token


@pytest.fixture
def user_token(app, regular_user):
    """Generate JWT token for regular user."""
    with app.app_context():
        token = create_access_token(
            identity=regular_user.id,
            expires_delta=timedelta(hours=1)
        )
        return token


@pytest.fixture
def sample_category(app, db):
    """Create a sample category for testing."""
    with app.app_context():
        category_name = f"Test Category {uuid.uuid4().hex[:8]}"
        category = Category(
            name=category_name,
            slug=category_name.lower().replace(' ', '-'),
            description="Test category description",
            is_featured=False
        )

        db.session.add(category)
        db.session.commit()

        yield category

        # Cleanup
        try:
            db.session.delete(category)
            db.session.commit()
        except Exception:
            db.session.rollback()


@pytest.fixture
def sample_categories(app, db):
    """Create multiple sample categories for testing."""
    with app.app_context():
        categories = []

        # Create parent category
        parent_name = f"Parent Category {uuid.uuid4().hex[:8]}"
        parent = Category(
            name=parent_name,
            slug=parent_name.lower().replace(' ', '-'),
            description="Parent category description",
            is_featured=True
        )
        db.session.add(parent)
        db.session.flush()  # Get the ID
        categories.append(parent)

        # Create child categories
        for i in range(3):
            child_name = f"Child Category {i+1} {uuid.uuid4().hex[:8]}"
            child = Category(
                name=child_name,
                slug=child_name.lower().replace(' ', '-'),
                description=f"Child category {i+1} description",
                parent_id=parent.id,
                is_featured=False
            )
            db.session.add(child)
            categories.append(child)

        db.session.commit()

        yield categories

        # Cleanup
        try:
            for category in reversed(categories):  # Delete children first
                db.session.delete(category)
            db.session.commit()
        except Exception:
            db.session.rollback()


@pytest.fixture
def category_with_products(app, db, sample_category):
    """Create a category with associated products."""
    with app.app_context():
        products = []

        for i in range(3):
            product_name = f"Test Product {i+1} {uuid.uuid4().hex[:8]}"
            product = Product(
                name=product_name,
                slug=product_name.lower().replace(' ', '-'),
                description=f"Test product {i+1} description",
                price=100.00 + (i * 10),
                category_id=sample_category.id,
                is_active=True,
                stock=50
            )
            db.session.add(product)
            products.append(product)

        db.session.commit()

        yield sample_category, products

        # Cleanup
        try:
            for product in products:
                db.session.delete(product)
            db.session.commit()
        except Exception:
            db.session.rollback()


@pytest.fixture
def auth_headers(admin_token):
    """Create authorization headers for admin requests."""
    return {
        'Authorization': f'Bearer {admin_token}',
        'Content-Type': 'application/json'
    }


@pytest.fixture
def user_auth_headers(user_token):
    """Create authorization headers for regular user requests."""
    return {
        'Authorization': f'Bearer {user_token}',
        'Content-Type': 'application/json'
    }


@pytest.fixture
def category_data():
    """Sample category data for creation/update tests."""
    unique_id = uuid.uuid4().hex[:8]
    return {
        'name': f'New Category {unique_id}',
        'description': 'A new test category',
        'is_featured': False,
        'meta_title': f'New Category {unique_id} - Meta Title',
        'meta_description': 'Meta description for new category'
    }


@pytest.fixture
def invalid_category_data():
    """Invalid category data for validation tests."""
    return {
        'name': '',  # Empty name should fail validation
        'description': 'x' * 1001,  # Too long description
        'parent_id': 99999  # Non-existent parent
    }


@pytest.fixture
def bulk_category_data():
    """Sample data for bulk operations."""
    unique_id = uuid.uuid4().hex[:8]
    return [
        {
            'name': f'Bulk Category 1 {unique_id}',
            'description': 'First bulk category',
            'is_featured': True
        },
        {
            'name': f'Bulk Category 2 {unique_id}',
            'description': 'Second bulk category',
            'is_featured': True
        },
        {
            'name': f'Bulk Category 3 {unique_id}',
            'description': 'Third bulk category',
            'is_featured': False
        }
    ]


@pytest.fixture
def performance_categories(app, db):
    """Create a large number of categories for performance testing."""
    with app.app_context():
        categories = []
        unique_id = uuid.uuid4().hex[:8]

        # Create 100 categories for performance testing
        for i in range(100):
            category = Category(
                name=f'Performance Category {i+1} {unique_id}',
                slug=f'performance-category-{i+1}-{unique_id}',
                description=f'Performance test category {i+1}',
                is_featured=(i % 10 == 0)  # Every 10th category is featured
            )
            db.session.add(category)
            categories.append(category)

        db.session.commit()

        yield categories

        # Cleanup
        try:
            for category in categories:
                db.session.delete(category)
            db.session.commit()
        except Exception:
            db.session.rollback()


@pytest.fixture(autouse=True)
def cleanup_test_data(app, db):
    """Automatically cleanup test data after each test."""
    yield

    with app.app_context():
        try:
            # Clean up any test categories that might have been left behind
            test_categories = Category.query.filter(
                Category.name.like('%Test Category%')
            ).all()

            for category in test_categories:
                # Delete associated products first
                products = Product.query.filter_by(category_id=category.id).all()
                for product in products:
                    db.session.delete(product)

                # Delete the category
                db.session.delete(category)

            db.session.commit()
        except Exception:
            db.session.rollback()


@pytest.fixture
def mock_file_upload():
    """Mock file upload for image testing."""
    from io import BytesIO
    from werkzeug.datastructures import FileStorage

    # Create a simple test image (1x1 pixel PNG)
    png_data = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\tpHYs\x00\x00\x0b\x13\x00\x00\x0b\x13\x01\x00\x9a\x9c\x18\x00\x00\x00\nIDATx\x9cc\xf8\x00\x00\x00\x01\x00\x01\x00\x00\x00\x00IEND\xaeB`\x82'

    return FileStorage(
        stream=BytesIO(png_data),
        filename='test_image.png',
        content_type='image/png'
    )
