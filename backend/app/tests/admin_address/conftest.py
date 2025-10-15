"""
Pytest configuration and fixtures for admin address tests.
"""

import pytest
import tempfile
import os
from datetime import datetime, timedelta

# Set test environment before importing app
os.environ['FLASK_ENV'] = 'testing'
os.environ['TESTING'] = 'True'

from app import create_app
from app.configuration.extensions import db
from app.models.models import User, UserRole, Address, AddressType
from flask_jwt_extended import create_access_token


@pytest.fixture(scope='session')
def app():
    """Create application for the tests."""
    # Create a temporary file for the test database
    db_fd, db_path = tempfile.mkstemp()

    app = create_app('testing')
    app.config.update({
        'TESTING': True,
        'SQLALCHEMY_DATABASE_URI': f'sqlite:///{db_path}',
        'JWT_SECRET_KEY': 'test-jwt-secret-key',
        'SECRET_KEY': 'test-secret-key',
        'WTF_CSRF_ENABLED': False,
        'ITEMS_PER_PAGE': 12,
        'MAIL_SUPPRESS_SEND': True,
        'MAIL_DEFAULT_SENDER': 'test@example.com'
    })

    with app.app_context():
        db.create_all()
        yield app
        db.drop_all()

    os.close(db_fd)
    os.unlink(db_path)


@pytest.fixture
def client(app):
    """Create a test client for the app."""
    return app.test_client()


@pytest.fixture
def runner(app):
    """Create a test runner for the app."""
    return app.test_cli_runner()


@pytest.fixture
def database(app):
    """Create database fixture."""
    with app.app_context():
        db.create_all()
        yield db
        db.session.remove()
        db.drop_all()


@pytest.fixture
def create_test_user(database):
    """Create a test user in the database."""
    def _create_user(user_data=None, verified=True, active=True):
        if user_data is None:
            user_data = {
                'name': 'Test User',
                'email': 'test@example.com',
                'phone': '+254712345678',
                'password': 'TestPass123!',
                'role': 'user'
            }

        # Merge with defaults to ensure all required fields are present
        default_data = {
            'name': 'Test User',
            'email': 'test@example.com',
            'phone': '+254712345678',
            'password': 'TestPass123!',
            'role': 'user'
        }

        # Update defaults with provided data
        if isinstance(user_data, dict):
            default_data.update(user_data)

        user_data = default_data

        # Handle the verified parameter properly
        if isinstance(user_data, dict) and 'verified' in user_data:
            verified = user_data.pop('verified')

        # Handle the active parameter properly
        if isinstance(user_data, dict) and 'active' in user_data:
            active = user_data.pop('active')

        user = User(
            name=user_data['name'],
            email=user_data['email'],
            phone=user_data.get('phone'),
            role=UserRole.ADMIN if user_data.get('role', 'user') == 'admin' else UserRole.USER,
            is_active=active
        )
        user.set_password(user_data['password'])

        if verified:
            user.email_verified = True
            user.phone_verified = True
        else:
            user.email_verified = False
            user.phone_verified = False

        database.session.add(user)
        database.session.commit()
        return user

    return _create_user


@pytest.fixture
def create_test_address(database):
    """Create a test address in the database."""
    def _create_address(user_id, address_data=None):
        # Default address data
        default_data = {
            'first_name': 'Test',
            'last_name': 'User',
            'address_line1': '123 Test Street',
            'address_line2': '',
            'city': 'Nairobi',
            'state': 'Nairobi',
            'postal_code': '00100',
            'country': 'Kenya',
            'phone': '+254712345678',
            'alternative_phone': '',
            'address_type': AddressType.SHIPPING,
            'is_default': True,
            'additional_info': ''
        }

        # Merge provided data with defaults
        if address_data is not None:
            default_data.update(address_data)

        address = Address(
            user_id=user_id,
            first_name=default_data['first_name'],
            last_name=default_data['last_name'],
            address_line1=default_data['address_line1'],
            address_line2=default_data['address_line2'],
            city=default_data['city'],
            state=default_data['state'],
            postal_code=default_data['postal_code'],
            country=default_data['country'],
            phone=default_data['phone'],
            alternative_phone=default_data['alternative_phone'],
            address_type=default_data['address_type'],
            is_default=default_data['is_default'],
            additional_info=default_data['additional_info']
        )

        database.session.add(address)
        database.session.commit()
        return address

    return _create_address


@pytest.fixture
def admin_headers(app, create_test_user):
    """Create authorization headers for an admin user."""
    admin_user = create_test_user({
        'name': 'Admin User',
        'email': 'admin@example.com',
        'role': 'admin',
        'password': 'AdminPass123!'
    })
    with app.app_context():
        access_token = create_access_token(
            identity=str(admin_user.id),
            additional_claims={"role": admin_user.role.value}
        )
        return {'Authorization': f'Bearer {access_token}'}


@pytest.fixture
def user_headers(app, create_test_user):
    """Create authorization headers for a regular user."""
    user = create_test_user()
    with app.app_context():
        access_token = create_access_token(
            identity=str(user.id),
            additional_claims={"role": user.role.value}
        )
        return {'Authorization': f'Bearer {access_token}'}


@pytest.fixture(autouse=True)
def setup_test_environment(app):
    """
    Setup test environment for all tests.
    This fixture is automatically used for all tests.
    """
    with app.app_context():
        # Clear any existing data
        db.session.remove()
        db.drop_all()
        db.create_all()
        yield
        # Cleanup after test
        db.session.remove()


def pytest_configure(config):
    """Configure pytest with custom markers."""
    config.addinivalue_line(
        "markers", "slow: marks tests as slow (deselect with '-m \"not slow\"')"
    )
    config.addinivalue_line(
        "markers", "integration: marks tests as integration tests"
    )
    config.addinivalue_line(
        "markers", "unit: marks tests as unit tests"
    )
    config.addinivalue_line(
        "markers", "admin_address: marks tests as admin address tests"
    )
    config.addinivalue_line(
        "markers", "routes: marks tests as route tests"
    )


def pytest_collection_modifyitems(config, items):
    """Modify test collection to add markers automatically."""
    for item in items:
        # Add 'unit' marker to all tests by default
        if not any(item.iter_markers()):
            item.add_marker(pytest.mark.unit)

        # Add 'slow' marker to tests that might be slow
        if 'multiple' in item.name or 'integration' in item.name:
            item.add_marker(pytest.mark.slow)

        # Add 'integration' marker to tests that test multiple components
        if any(keyword in item.name for keyword in ['lifecycle', 'workflow', 'complete']):
            item.add_marker(pytest.mark.integration)
