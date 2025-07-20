"""
Pytest configuration and shared fixtures for the test suite.
"""

import pytest
import os
import tempfile
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock

# Set test environment before importing app
os.environ['FLASK_ENV'] = 'testing'
os.environ['TESTING'] = 'True'

from app import create_app
from ...configuration.extensions import db
from ...models.models import User, UserRole


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
        'BREVO_API_KEY': 'test-brevo-key',
        'TWILIO_ACCOUNT_SID': 'test-twilio-sid',
        'TWILIO_AUTH_TOKEN': 'test-twilio-token',
        'TWILIO_PHONE_NUMBER': '+1234567890',
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
def mock_email():
    """Mock email sending functionality."""
    with patch('backend.routes.user.user.send_email') as mock:
        mock.return_value = True
        yield mock


@pytest.fixture
def mock_sms():
    """Mock SMS sending functionality."""
    with patch('backend.routes.user.user.send_sms') as mock:
        mock.return_value = True
        yield mock


@pytest.fixture
def mock_google_oauth():
    """Mock Google OAuth token verification."""
    with patch('backend.routes.user.user.id_token.verify_oauth2_token') as mock:
        mock.return_value = {
            'email': 'google.user@example.com',
            'name': 'Google User',
            'email_verified': True,
            'sub': 'google-user-id-123'
        }
        yield mock


@pytest.fixture
def mock_brevo_api():
    """Mock Brevo API requests."""
    with patch('requests.post') as mock:
        mock.return_value.status_code = 200
        mock.return_value.json.return_value = {'messageId': 'test-message-id'}
        yield mock


@pytest.fixture
def mock_twilio_api():
    """Mock Twilio API requests."""
    with patch('requests.post') as mock:
        mock.return_value.status_code = 201
        mock.return_value.json.return_value = {'sid': 'test-message-sid'}
        yield mock


@pytest.fixture
def sample_user_data():
    """Sample user data for testing."""
    return {
        'name': 'John Doe',
        'email': 'john.doe@example.com',
        'phone': '+254700123456',
        'password': 'SecurePass123!'
    }


@pytest.fixture
def admin_user_data():
    """Sample admin user data for testing."""
    return {
        'name': 'Admin User',
        'email': 'admin@example.com',
        'phone': '+254700999999',
        'password': 'AdminPass123!',
        'role': 'admin'
    }


@pytest.fixture
def create_test_user(app, sample_user_data):
    """Create a test user in the database."""
    with app.app_context():
        user = User(
            name=sample_user_data['name'],
            email=sample_user_data['email'],
            phone=sample_user_data['phone'],
            email_verified=True,
            phone_verified=True,
            is_active=True,
            role=UserRole.USER
        )
        user.set_password(sample_user_data['password'])
        db.session.add(user)
        db.session.commit()
        return user


@pytest.fixture
def create_admin_user(app, admin_user_data):
    """Create an admin user in the database."""
    with app.app_context():
        admin = User(
            name=admin_user_data['name'],
            email=admin_user_data['email'],
            phone=admin_user_data['phone'],
            email_verified=True,
            phone_verified=True,
            is_active=True,
            role=UserRole.ADMIN
        )
        admin.set_password(admin_user_data['password'])
        db.session.add(admin)
        db.session.commit()
        return admin


@pytest.fixture
def unverified_user(app, sample_user_data):
    """Create an unverified test user."""
    with app.app_context():
        user = User(
            name=sample_user_data['name'],
            email=sample_user_data['email'],
            phone=sample_user_data['phone'],
            email_verified=False,
            phone_verified=False,
            is_active=True,
            verification_code='123456',
            verification_code_expires=datetime.utcnow() + timedelta(minutes=10)
        )
        user.set_password(sample_user_data['password'])
        db.session.add(user)
        db.session.commit()
        return user


@pytest.fixture
def inactive_user(app, sample_user_data):
    """Create an inactive test user."""
    with app.app_context():
        user = User(
            name=sample_user_data['name'],
            email='inactive@example.com',
            phone='+254700888777',
            email_verified=True,
            phone_verified=True,
            is_active=False
        )
        user.set_password(sample_user_data['password'])
        db.session.add(user)
        db.session.commit()
        return user


@pytest.fixture
def auth_headers(app, create_test_user):
    """Create authentication headers with valid JWT token."""
    from flask_jwt_extended import create_access_token

    with app.app_context():
        access_token = create_access_token(
            identity=str(create_test_user.id),
            additional_claims={"role": create_test_user.role.value}
        )
        return {'Authorization': f'Bearer {access_token}'}


@pytest.fixture
def admin_headers(app, create_admin_user):
    """Create admin authentication headers."""
    from flask_jwt_extended import create_access_token

    with app.app_context():
        access_token = create_access_token(
            identity=str(create_admin_user.id),
            additional_claims={"role": create_admin_user.role.value}
        )
        return {'Authorization': f'Bearer {access_token}'}


@pytest.fixture
def refresh_token_headers(app, create_test_user):
    """Create refresh token headers."""
    from flask_jwt_extended import create_refresh_token

    with app.app_context():
        refresh_token = create_refresh_token(
            identity=str(create_test_user.id),
            additional_claims={"role": create_test_user.role.value}
        )
        return {'Authorization': f'Bearer {refresh_token}'}


@pytest.fixture
def expired_token_headers(app, create_test_user):
    """Create expired token headers."""
    from flask_jwt_extended import create_access_token

    with app.app_context():
        expired_token = create_access_token(
            identity=str(create_test_user.id),
            additional_claims={"role": create_test_user.role.value},
            expires_delta=timedelta(seconds=-1)  # Already expired
        )
        return {'Authorization': f'Bearer {expired_token}'}


@pytest.fixture
def invalid_token_headers():
    """Create invalid token headers."""
    return {'Authorization': 'Bearer invalid-token-string'}


@pytest.fixture(autouse=True)
def enable_db_access_for_all_tests(db):
    """
    Give all tests access to the database.
    This fixture is automatically used for all tests.
    """
    pass


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
        if 'multiple_rapid_requests' in item.name or 'concurrent' in item.name:
            item.add_marker(pytest.mark.slow)

        # Add 'integration' marker to tests that test multiple components
        if any(keyword in item.name for keyword in ['google_login', 'mpesa', 'email_verification']):
            item.add_marker(pytest.mark.integration)
