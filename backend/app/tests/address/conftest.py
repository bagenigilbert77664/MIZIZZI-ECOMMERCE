"""
Pytest configuration and fixtures for address tests.
"""

import pytest
import tempfile
import os
from datetime import datetime, timedelta
from flask import Flask
from flask_jwt_extended import create_access_token
from app import create_app
from app.configuration.extensions import db
from app.models.models import User, UserRole, Address, AddressType

# Set test environment before importing app
os.environ['FLASK_ENV'] = 'testing'
os.environ['TESTING'] = 'True'

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
    """Factory fixture to create test users."""
    def _create_user(user_data=None, verified=True, active=True):
        if user_data is None:
            user_data = {
                'name': 'Test User',
                'email': 'test@example.com',
                'phone': '+254712345678',
                'password': 'TestPass123!',
                'role': 'user'
            }

        # Handle the verified parameter properly
        if isinstance(user_data, dict) and 'verified' in user_data:
            verified = user_data.pop('verified')

        # Handle the active parameter properly
        if isinstance(user_data, dict) and 'active' in user_data:
            active = user_data.pop('active')

        # Ensure required fields have defaults
        if 'name' not in user_data:
            user_data['name'] = f"Test User {user_data.get('email', 'default')}"

        if 'phone' not in user_data:
            user_data['phone'] = '+254712345678'

        if 'password' not in user_data:
            user_data['password'] = 'TestPass123!'

        user = User(
            name=user_data['name'],
            email=user_data['email'],
            phone=user_data.get('phone'),
            role=UserRole.USER if user_data.get('role', 'user') == 'user' else UserRole.ADMIN,
            is_active=active
        )
        user.set_password(user_data['password'])

        # Set verification status
        user.email_verified = verified
        user.phone_verified = verified

        database.session.add(user)
        database.session.commit()
        return user

    return _create_user


@pytest.fixture
def create_admin_user(database):
    """Factory fixture to create admin users."""
    def _create_admin(user_data=None, verified=True, active=True):
        if user_data is None:
            user_data = {
                'name': 'Admin User',
                'email': 'admin@example.com',
                'phone': '+254712345679',
                'password': 'AdminPass123!',
                'role': 'admin'
            }
        else:
            # Ensure it's an admin
            user_data['role'] = 'admin'
            # Ensure required fields have defaults
            if 'name' not in user_data:
                user_data['name'] = f"Admin User {user_data.get('email', 'default')}"

            if 'phone' not in user_data:
                user_data['phone'] = '+254712345679'

            if 'password' not in user_data:
                user_data['password'] = 'AdminPass123!'

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
            role=UserRole.ADMIN,
            is_active=active
        )
        user.set_password(user_data['password'])

        # Set verification status
        user.email_verified = verified
        user.phone_verified = verified

        database.session.add(user)
        database.session.commit()
        return user

    return _create_admin


@pytest.fixture
def auth_headers(app, create_test_user):
    """Create authorization headers for a test user."""
    user = create_test_user()
    with app.app_context():
        access_token = create_access_token(
            identity=str(user.id),
            additional_claims={"role": user.role.value}
        )
        return {'Authorization': f'Bearer {access_token}'}


@pytest.fixture
def admin_headers(app, create_admin_user):
    """Create authorization headers for an admin user."""
    admin = create_admin_user()
    with app.app_context():
        access_token = create_access_token(
            identity=str(admin.id),
            additional_claims={"role": admin.role.value}
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


@pytest.fixture
def sample_address_data():
    """Sample address data for testing."""
    return {
        "first_name": "John",
        "last_name": "Doe",
        "address_line1": "123 Main Street",
        "address_line2": "Apt 4B",
        "city": "Nairobi",
        "state": "Nairobi",
        "postal_code": "00100",
        "country": "Kenya",
        "phone": "+254712345678",
        "alternative_phone": "+254712345679",
        "address_type": "shipping",
        "is_default": True,
        "additional_info": "Leave at the gate"
    }


@pytest.fixture
def create_address(database):
    """Factory fixture to create test addresses."""
    def _create_address(user_id, address_data=None, is_default=False):
        if address_data is None:
            address_data = {
                "first_name": "John",
                "last_name": "Doe",
                "address_line1": "123 Main Street",
                "city": "Nairobi",
                "state": "Nairobi",
                "postal_code": "00100",
                "country": "Kenya",
                "phone": "+254712345678",
                "address_type": "shipping"
            }

        address = Address(
            user_id=user_id,
            first_name=address_data["first_name"],
            last_name=address_data["last_name"],
            address_line1=address_data["address_line1"],
            address_line2=address_data.get("address_line2"),
            city=address_data["city"],
            state=address_data["state"],
            postal_code=address_data["postal_code"],
            country=address_data["country"],
            phone=address_data["phone"],
            alternative_phone=address_data.get("alternative_phone"),
            address_type=AddressType.SHIPPING if address_data.get("address_type", "shipping") == "shipping" else AddressType.BILLING,
            is_default=is_default,
            additional_info=address_data.get("additional_info")
        )

        database.session.add(address)
        database.session.commit()
        return address

    return _create_address


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
