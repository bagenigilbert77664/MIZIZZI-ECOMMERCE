"""
Test configuration and fixtures for user authentication tests.
"""
import pytest
import os
import sys
from unittest.mock import Mock, patch
from datetime import datetime, timedelta
import tempfile
import json

# Add the parent directories to sys.path to allow absolute imports
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.abspath(os.path.join(current_dir, '..', '..'))
app_dir = os.path.abspath(os.path.join(backend_dir, 'app'))

for path in [backend_dir, app_dir]:
    if path not in sys.path:
        sys.path.insert(0, path)

from app import create_app
from app.configuration.extensions import db as _db
from app.models.models import User, UserRole
from flask_jwt_extended import create_access_token, create_refresh_token


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
def sample_user_data():
    """Sample user data for testing."""
    return {
        'name': 'John Doe',
        'email': 'john.doe@example.com',
        'phone': '+254712345678',
        'password': 'SecurePass123!',
        'role': 'customer'
    }


@pytest.fixture
def admin_user_data():
    """Sample admin user data for testing."""
    return {
        'name': 'Admin User',
        'email': 'admin@example.com',
        'phone': '+254700000000',
        'password': 'AdminPass123!',
        'role': 'admin'
    }


@pytest.fixture
def create_test_user(db):
    """Create a test user in the database."""
    def _create_user(user_data=None, verified=True, active=True):
        if user_data is None:
            user_data = {
                'name': 'Test User',
                'email': 'test@example.com',
                'phone': '+254712345678',
                'password': 'TestPass123!',
                'role': 'customer'
            }

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
            role=UserRole.USER if user_data.get('role', 'customer') == 'customer' else UserRole.ADMIN,
            is_active=active
        )
        user.set_password(user_data['password'])

        if verified:
            user.email_verified = True
            user.phone_verified = True
        else:
            user.email_verified = False
            user.phone_verified = False

        db.session.add(user)
        db.session.commit()
        return user

    return _create_user


@pytest.fixture
def create_admin_user(db):
    """Create an admin user in the database."""
    def _create_admin(user_data=None):
        if user_data is None:
            user_data = {
                'name': 'Admin User',
                'email': 'admin@example.com',
                'phone': '+254700000000',
                'password': 'AdminPass123!',
                'role': 'admin'
            }

        user = User(
            name=user_data['name'],
            email=user_data['email'],
            phone=user_data['phone'],
            role=UserRole.ADMIN,
            is_active=True,
            email_verified=True,
            phone_verified=True
        )
        user.set_password(user_data['password'])

        db.session.add(user)
        db.session.commit()
        return user

    return _create_admin


@pytest.fixture
def auth_headers(app, create_test_user):
    """Create authorization headers for a test user."""
    user = create_test_user()
    with app.app_context():
        access_token = create_access_token(identity=str(user.id))
        return {'Authorization': f'Bearer {access_token}'}


@pytest.fixture
def admin_headers(app, create_admin_user):
    """Create authorization headers for an admin user."""
    admin = create_admin_user()
    with app.app_context():
        access_token = create_access_token(identity=str(admin.id))
        return {'Authorization': f'Bearer {access_token}'}


@pytest.fixture
def refresh_token_headers(app, create_test_user):
    """Create refresh token headers for a test user."""
    user = create_test_user()
    with app.app_context():
        refresh_token = create_refresh_token(identity=str(user.id))
        return {'Authorization': f'Bearer {refresh_token}'}


@pytest.fixture
def expired_token_headers(app, create_test_user):
    """Create expired token headers for testing."""
    user = create_test_user()
    with app.app_context():
        # Create a token that expired 1 hour ago
        expired_token = create_access_token(
            identity=str(user.id),
            expires_delta=timedelta(hours=-1)
        )
        return {'Authorization': f'Bearer {expired_token}'}


@pytest.fixture
def invalid_token_headers():
    """Create invalid token headers for testing."""
    return {'Authorization': 'Bearer invalid.token.here'}


@pytest.fixture
def unverified_user(db):
    """Create an unverified user for testing."""
    user = User(
        name='Unverified User',
        email='unverified@example.com',
        phone='+254712345679',
        role=UserRole.USER,
        is_active=True,
        email_verified=False,
        phone_verified=False
    )
    user.set_password('TestPass123!')

    db.session.add(user)
    db.session.commit()
    return user


@pytest.fixture
def inactive_user(db):
    """Create an inactive user for testing."""
    user = User(
        name='Inactive User',
        email='inactive@example.com',
        phone='+254712345680',
        role=UserRole.USER,
        is_active=False,
        email_verified=True,
        phone_verified=True
    )
    user.set_password('TestPass123!')

    db.session.add(user)
    db.session.commit()
    return user


@pytest.fixture
def mock_email():
    """Mock email sending functionality."""
    with patch('app.routes.user.user.send_email') as mock_send:
        mock_send.return_value = True
        yield mock_send


@pytest.fixture
def mock_sms():
    """Mock SMS sending functionality."""
    with patch('app.routes.user.user.send_sms') as mock_send:
        mock_send.return_value = True
        yield mock_send


@pytest.fixture
def mock_google_oauth():
    """Mock Google OAuth verification."""
    with patch('google.oauth2.id_token.verify_oauth2_token') as mock_verify:
        mock_verify.return_value = {
            'sub': '123456789',
            'email': 'google@example.com',
            'name': 'Google User',
            'email_verified': True
        }
        yield mock_verify


@pytest.fixture
def mock_brevo_api():
    """Mock Brevo API calls."""
    with patch('requests.post') as mock_post:
        mock_response = Mock()
        mock_response.status_code = 201
        mock_response.json.return_value = {'messageId': 'test-123'}
        mock_post.return_value = mock_response
        yield mock_post


@pytest.fixture
def mock_twilio_api():
    """Mock Twilio API calls."""
    with patch('app.routes.user.user.send_sms') as mock_twilio:
        mock_twilio.return_value = {'success': True, 'sid': 'test-sms-123'}
        yield mock_twilio


@pytest.fixture(autouse=True)
def enable_db_access_for_all_tests(db):
    """
    Automatically enable database access for all tests.
    This fixture runs automatically for every test.
    """
    pass


# Session-scoped fixtures for performance
@pytest.fixture(scope='session')
def _session_faker():
    """Session-scoped faker instance."""
    from faker import Faker
    return Faker()


@pytest.fixture
def faker(_session_faker):
    """Function-scoped faker instance."""
    return _session_faker


# Configuration fixtures
@pytest.fixture
def config():
    """Test configuration."""
    return {
        'TESTING': True,
        'WTF_CSRF_ENABLED': False,
        'JWT_SECRET_KEY': 'test-secret-key',
        'SECRET_KEY': 'test-secret-key',
        'MAIL_SUPPRESS_SEND': True,
        'RATELIMIT_ENABLED': False
    }


# Helper fixtures for common test patterns
@pytest.fixture
def json_headers():
    """JSON content type headers."""
    return {'Content-Type': 'application/json'}


@pytest.fixture
def accept_json():
    """Accept JSON headers."""
    return {'Accept': 'application/json'}


# Cleanup fixtures
@pytest.fixture(autouse=True)
def cleanup_after_test(db):
    """Clean up database after each test."""
    yield
    # Clean up any remaining data
    try:
        db.session.rollback()
        # Clear all tables
        for table in reversed(db.metadata.sorted_tables):
            db.session.execute(table.delete())
        db.session.commit()
    except Exception:
        db.session.rollback()


# Performance monitoring fixtures
@pytest.fixture
def benchmark():
    """Simple benchmark fixture for performance testing."""
    import time

    class Benchmark:
        def __init__(self):
            self.start_time = None
            self.end_time = None

        def start(self):
            self.start_time = time.time()

        def stop(self):
            self.end_time = time.time()
            return self.end_time - self.start_time if self.start_time else 0

    return Benchmark()


# Error simulation fixtures
@pytest.fixture
def simulate_db_error():
    """Simulate database errors for testing error handling."""
    def _simulate_error(error_type='connection'):
        if error_type == 'connection':
            return patch('app.configuration.extensions.db.session.commit',
                        side_effect=Exception('Database connection error'))
        elif error_type == 'integrity':
            from sqlalchemy.exc import IntegrityError
            return patch('app.configuration.extensions.db.session.commit',
                        side_effect=IntegrityError('', '', ''))
        else:
            return patch('app.configuration.extensions.db.session.commit',
                        side_effect=Exception('Generic database error'))

    return _simulate_error


# Request context fixtures
@pytest.fixture
def request_context(app):
    """Create a request context for testing."""
    with app.test_request_context():
        yield


# Cache fixtures
@pytest.fixture
def cache(app):
    """Cache instance for testing."""
    from app.configuration.extensions import cache
    with app.app_context():
        cache.clear()
        yield cache
        cache.clear()


# Rate limiting fixtures
@pytest.fixture
def disable_rate_limiting(app):
    """Disable rate limiting for tests."""
    app.config['RATELIMIT_ENABLED'] = False
    yield
    app.config['RATELIMIT_ENABLED'] = True


# File upload fixtures
@pytest.fixture
def temp_image_file():
    """Create a temporary image file for testing uploads."""
    import io
    from PIL import Image

    # Create a simple test image
    img = Image.new('RGB', (100, 100), color='red')
    img_bytes = io.BytesIO()
    img.save(img_bytes, format='PNG')
    img_bytes.seek(0)

    return img_bytes


# WebSocket fixtures (if needed)
@pytest.fixture
def socketio_client(app):
    """Create a SocketIO test client."""
    try:
        from app.websocket import socketio
        return socketio.test_client(app)
    except ImportError:
        # Return None if SocketIO is not available
        return None


# Environment variable fixtures
@pytest.fixture
def mock_env_vars():
    """Mock environment variables for testing."""
    env_vars = {
        'FLASK_ENV': 'testing',
        'SECRET_KEY': 'test-secret-key',
        'JWT_SECRET_KEY': 'test-jwt-secret',
        'MAIL_SERVER': 'localhost',
        'MAIL_PORT': '587',
        'MAIL_USE_TLS': 'True',
        'MAIL_USERNAME': 'test@example.com',
        'MAIL_PASSWORD': 'testpass',
        'BREVO_API_KEY': 'test-brevo-key',
        'TWILIO_ACCOUNT_SID': 'test-twilio-sid',
        'TWILIO_AUTH_TOKEN': 'test-twilio-token',
        'TWILIO_PHONE_NUMBER': '+1234567890',
        'GOOGLE_CLIENT_ID': 'test-google-client-id',
        'MPESA_CONSUMER_KEY': 'test-mpesa-key',
        'MPESA_CONSUMER_SECRET': 'test-mpesa-secret',
        'MPESA_SHORTCODE': '174379',
        'MPESA_PASSKEY': 'test-passkey',
        'MPESA_CALLBACK_URL': 'https://test.com/callback'
    }

    with patch.dict(os.environ, env_vars):
        yield env_vars
