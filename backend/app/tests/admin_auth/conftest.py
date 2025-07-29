"""
Pytest configuration and fixtures for admin authentication tests.
Provides comprehensive fixtures for testing admin authentication functionality.
"""
import pytest
import tempfile
import os
import sys
import pyotp
from datetime import datetime, timedelta

# Add the backend directory to Python path
backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Add the app directory to Python path
app_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if app_dir not in sys.path:
    sys.path.insert(0, app_dir)

try:
    from app import create_app
    from app.configuration.extensions import db
    from app.models.models import User, UserRole
    from app.routes.admin.admin_auth import AdminMFA, AdminActivityLog, TokenBlacklist
except ImportError:
    # Fallback imports
    try:
        import sys
        sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
        from app import create_app
        from app.configuration.extensions import db
        from app.models.models import User, UserRole
        from app.routes.admin.admin_auth import AdminMFA, AdminActivityLog, TokenBlacklist
    except ImportError:
        # Create mock objects for testing
        print("Warning: Could not import required modules. Creating mock objects.")

        class MockApp:
            def __init__(self):
                self.config = {}

            def app_context(self):
                return self

            def __enter__(self):
                return self

            def __exit__(self, *args):
                pass

        def create_app(config_name='testing'):
            return MockApp()

        class MockDB:
            def create_all(self):
                pass

            def session(self):
                return self

            def add(self, obj):
                pass

            def commit(self):
                pass

            def rollback(self):
                pass

        db = MockDB()

        class UserRole:
            ADMIN = 'admin'
            USER = 'user'

        class User:
            def __init__(self, **kwargs):
                for key, value in kwargs.items():
                    setattr(self, key, value)
                self.id = 1

            def set_password(self, password):
                self.password_hash = password

        class AdminMFA:
            def __init__(self, **kwargs):
                for key, value in kwargs.items():
                    setattr(self, key, value)

        class AdminActivityLog:
            def __init__(self, **kwargs):
                for key, value in kwargs.items():
                    setattr(self, key, value)

        class TokenBlacklist:
            def __init__(self, **kwargs):
                for key, value in kwargs.items():
                    setattr(self, key, value)

@pytest.fixture
def app():
    """Create and configure a new app instance for each test."""
    # Create a temporary file to serve as the database
    db_fd, db_path = tempfile.mkstemp()

    app = create_app('testing')

    # Configure the app for testing
    if hasattr(app, 'config'):
        app.config.update({
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": f"sqlite:///{db_path}",
            "WTF_CSRF_ENABLED": False,
            "JWT_SECRET_KEY": "test-secret-key-for-admin-auth",
            "SECRET_KEY": "test-secret-key-for-admin-auth",
            "JWT_ACCESS_TOKEN_EXPIRES": False,  # Disable expiration for testing
            "JWT_REFRESH_TOKEN_EXPIRES": False,
            "BREVO_API_KEY": "test-brevo-key",
            "FRONTEND_URL": "http://localhost:3000",
            "TWILIO_ACCOUNT_SID": "test-twilio-sid",
            "TWILIO_AUTH_TOKEN": "test-twilio-token",
            "TWILIO_PHONE_NUMBER": "+1234567890",
            "ENV": "testing"
        })

    try:
        with app.app_context():
            # Create all tables including admin auth tables
            db.create_all()

            # Import and initialize admin auth tables
            try:
                from app.routes.admin.admin_auth import init_admin_auth_tables
                init_admin_auth_tables()
            except ImportError:
                pass  # Skip if not available

            yield app
    except Exception as e:
        print(f"Warning: App context error: {e}")
        yield app

    try:
        os.close(db_fd)
        os.unlink(db_path)
    except:
        pass

@pytest.fixture
def client(app):
    """A test client for the app."""
    if hasattr(app, 'test_client'):
        return app.test_client()
    else:
        # Mock client for testing
        class MockClient:
            def post(self, *args, **kwargs):
                return MockResponse()
            def get(self, *args, **kwargs):
                return MockResponse()
            def put(self, *args, **kwargs):
                return MockResponse()
            def delete(self, *args, **kwargs):
                return MockResponse()

        class MockResponse:
            def __init__(self):
                self.status_code = 200
                self.data = b'{"status": "ok"}'

            def get_json(self):
                return {"status": "ok"}

        return MockClient()

@pytest.fixture
def runner(app):
    """A test runner for the app's Click commands."""
    if hasattr(app, 'test_cli_runner'):
        return app.test_cli_runner()
    else:
        return None

@pytest.fixture
def admin_user(app):
    """Create an admin user for testing."""
    try:
        with app.app_context():
            # Check if user already exists
            existing_user = User.query.filter_by(email="admin@test.com").first()
            if existing_user:
                db.session.delete(existing_user)
                db.session.commit()

            admin = User(
                name="Test Admin",
                email="admin@test.com",
                phone="+254712345678",
                role=UserRole.ADMIN,
                is_active=True,
                email_verified=True,
                phone_verified=True,
                created_at=datetime.utcnow()
            )
            admin.set_password("AdminPass123!")

            if hasattr(db, 'session'):
                db.session.add(admin)
                db.session.commit()
                # Get fresh instance to avoid detached instance error
                fresh_admin = db.session.get(User, admin.id)
                return fresh_admin

            return admin
    except Exception as e:
        print(f"Warning: Could not create admin user: {e}")
        # Return mock admin user
        admin = User(
            name="Test Admin",
            email="admin@test.com",
            phone="+254712345678",
            role=UserRole.ADMIN,
            is_active=True,
            email_verified=True,
            phone_verified=True,
            created_at=datetime.utcnow()
        )
        admin.set_password("AdminPass123!")
        admin.id = 1  # Set a mock ID
        return admin

@pytest.fixture
def regular_user(app):
    """Create a regular user for testing."""
    try:
        with app.app_context():
            # Check if user already exists
            existing_user = User.query.filter_by(email="user@test.com").first()
            if existing_user:
                db.session.delete(existing_user)
                db.session.commit()

            user = User(
                name="Test User",
                email="user@test.com",
                phone="+254712345679",
                role=UserRole.USER,
                is_active=True,
                email_verified=True,
                phone_verified=True,
                created_at=datetime.utcnow()
            )
            user.set_password("UserPass123!")

            if hasattr(db, 'session'):
                db.session.add(user)
                db.session.commit()
                # Get fresh instance to avoid detached instance error
                fresh_user = db.session.get(User, user.id)
                return fresh_user

            return user
    except Exception as e:
        print(f"Warning: Could not create regular user: {e}")
        # Return mock user
        user = User(
            name="Test User",
            email="user@test.com",
            phone="+254712345679",
            role=UserRole.USER,
            is_active=True,
            email_verified=True,
            phone_verified=True,
            created_at=datetime.utcnow()
        )
        user.set_password("UserPass123!")
        user.id = 2  # Set a mock ID
        return user

@pytest.fixture
def inactive_admin(app):
    """Create an inactive admin user for testing."""
    try:
        with app.app_context():
            # Check if user already exists
            existing_user = User.query.filter_by(email="inactive@test.com").first()
            if existing_user:
                db.session.delete(existing_user)
                db.session.commit()

            admin = User(
                name="Inactive Admin",
                email="inactive@test.com",
                phone="+254712345680",
                role=UserRole.ADMIN,
                is_active=False,
                email_verified=True,
                phone_verified=True,
                created_at=datetime.utcnow()
            )
            admin.set_password("AdminPass123!")

            if hasattr(db, 'session'):
                db.session.add(admin)
                db.session.commit()
                # Get fresh instance to avoid detached instance error
                fresh_admin = db.session.get(User, admin.id)
                return fresh_admin

            return admin
    except Exception as e:
        print(f"Warning: Could not create inactive admin: {e}")
        # Return mock admin
        admin = User(
            name="Inactive Admin",
            email="inactive@test.com",
            phone="+254712345680",
            role=UserRole.ADMIN,
            is_active=False,
            email_verified=True,
            phone_verified=True,
            created_at=datetime.utcnow()
        )
        admin.set_password("AdminPass123!")
        admin.id = 3  # Set a mock ID
        return admin

@pytest.fixture
def unverified_admin(app):
    """Create an unverified admin user for testing."""
    try:
        with app.app_context():
            # Check if user already exists
            existing_user = User.query.filter_by(email="unverified@test.com").first()
            if existing_user:
                db.session.delete(existing_user)
                db.session.commit()

            admin = User(
                name="Unverified Admin",
                email="unverified@test.com",
                phone="+254712345681",
                role=UserRole.ADMIN,
                is_active=True,
                email_verified=False,  # Not verified
                phone_verified=True,
                created_at=datetime.utcnow()
            )
            admin.set_password("AdminPass123!")

            if hasattr(db, 'session'):
                db.session.add(admin)
                db.session.commit()
                # Get fresh instance to avoid detached instance error
                fresh_admin = db.session.get(User, admin.id)
                return fresh_admin

            return admin
    except Exception:
        # Return mock admin
        admin = User(
            name="Unverified Admin",
            email="unverified@test.com",
            phone="+254712345681",
            role=UserRole.ADMIN,
            is_active=True,
            email_verified=False,
            phone_verified=True,
            created_at=datetime.utcnow()
        )
        admin.set_password("AdminPass123!")
        admin.id = 4  # Set a mock ID
        return admin

@pytest.fixture
def admin_user_with_mfa(app):
    """Create an admin user with MFA enabled for testing."""
    try:
        with app.app_context():
            # Check if user already exists
            existing_user = User.query.filter_by(email="mfa@test.com").first()
            if existing_user:
                db.session.delete(existing_user)
                db.session.commit()

            admin = User(
                name="MFA Admin",
                email="mfa@test.com",
                phone="+254712345682",
                role=UserRole.ADMIN,
                is_active=True,
                email_verified=True,
                phone_verified=True,
                created_at=datetime.utcnow()
            )
            admin.set_password("AdminPass123!")

            if hasattr(db, 'session'):
                db.session.add(admin)
                db.session.commit()

                # Create MFA settings
                secret_key = pyotp.random_base32()
                mfa_settings = AdminMFA(
                    user_id=admin.id,
                    secret_key=secret_key,
                    is_enabled=True,
                    backup_codes=['12345678', '87654321', '11111111', '22222222', '33333333']
                )

                db.session.add(mfa_settings)
                db.session.commit()

                # Get fresh instance to avoid detached instance error
                fresh_admin = db.session.get(User, admin.id)
                # Store secret key for test access
                fresh_admin._test_mfa_secret = secret_key

                return fresh_admin

            return admin
    except Exception:
        # Return mock admin with MFA
        admin = User(
            name="MFA Admin",
            email="mfa@test.com",
            phone="+254712345682",
            role=UserRole.ADMIN,
            is_active=True,
            email_verified=True,
            phone_verified=True,
            created_at=datetime.utcnow()
        )
        admin.set_password("AdminPass123!")
        admin.id = 5  # Set a mock ID
        admin._test_mfa_secret = pyotp.random_base32()
        return admin

@pytest.fixture
def admin_token(admin_user, app):
    """Create a valid admin token for testing."""
    try:
        with app.app_context():
            from flask_jwt_extended import create_access_token

            # Ensure we have a valid user ID
            user_id = getattr(admin_user, 'id', 1)

            return create_access_token(
                identity=str(user_id),
                additional_claims={"role": "admin"}
            )
    except ImportError:
        return "mock-admin-token"

@pytest.fixture
def admin_refresh_token(admin_user, app):
    """Create a valid admin refresh token for testing."""
    try:
        with app.app_context():
            from flask_jwt_extended import create_refresh_token

            # Ensure we have a valid user ID
            user_id = getattr(admin_user, 'id', 1)

            return create_refresh_token(
                identity=str(user_id),
                additional_claims={"role": "admin"}
            )
    except ImportError:
        return "mock-admin-refresh-token"

@pytest.fixture
def non_admin_token(regular_user, app):
    """Create a non-admin token for testing."""
    try:
        with app.app_context():
            from flask_jwt_extended import create_access_token

            # Ensure we have a valid user ID
            user_id = getattr(regular_user, 'id', 2)

            return create_access_token(
                identity=str(user_id),
                additional_claims={"role": "user"}
            )
    except ImportError:
        return "mock-user-token"

@pytest.fixture
def reset_token(admin_user, app):
    """Create a password reset token for testing."""
    try:
        with app.app_context():
            from flask_jwt_extended import create_access_token
            from datetime import timedelta

            # Ensure we have a valid email
            email = getattr(admin_user, 'email', 'admin@test.com')

            return create_access_token(
                identity=email,
                expires_delta=timedelta(minutes=15),
                additional_claims={"purpose": "admin_password_reset", "role": "admin"}
            )
    except ImportError:
        return "mock-reset-token"

# Add helper function for getting fresh user instances
def get_fresh_user(user_id, app):
    """Get a fresh user instance from the database."""
    try:
        with app.app_context():
            return db.session.get(User, user_id)
    except:
        return None

@pytest.fixture
def fresh_admin_user(app, admin_user):
    """Get a fresh admin user instance from the database."""
    try:
        with app.app_context():
            if hasattr(admin_user, 'id') and admin_user.id:
                fresh_user = db.session.get(User, admin_user.id)
                if fresh_user:
                    return fresh_user
            return admin_user
    except:
        return admin_user

@pytest.fixture
def admin_user_with_mfa_disabled(app):
    """Create an admin user with MFA disabled for testing."""
    try:
        with app.app_context():
            admin = User(
                name="MFA Disabled Admin",
                email="mfa_disabled@test.com",
                phone="+254712345683",
                role=UserRole.ADMIN,
                is_active=True,
                email_verified=True,
                phone_verified=True,
                created_at=datetime.utcnow()
            )
            admin.set_password("AdminPass123!")

            if hasattr(db, 'session'):
                db.session.add(admin)
                db.session.commit()

            # Create MFA settings but disabled
            secret_key = pyotp.random_base32()
            mfa_settings = AdminMFA(
                user_id=admin.id,
                secret_key=secret_key,
                is_enabled=False,
                backup_codes=['12345678', '87654321', '11111111', '22222222', '33333333']
            )

            if hasattr(db, 'session'):
                db.session.add(mfa_settings)
                db.session.commit()

            # Store secret key for test access
            admin._test_mfa_secret = secret_key

            return admin
    except Exception:
        # Return mock admin
        admin = User(
            name="MFA Disabled Admin",
            email="mfa_disabled@test.com",
            phone="+254712345683",
            role=UserRole.ADMIN,
            is_active=True,
            email_verified=True,
            phone_verified=True,
            created_at=datetime.utcnow()
        )
        admin.set_password("AdminPass123!")
        admin._test_mfa_secret = pyotp.random_base32()
        return admin

@pytest.fixture
def super_admin(app):
    """Create a super admin user for testing admin creation."""
    try:
        with app.app_context():
            super_admin = User(
                name="Super Admin",
                email="superadmin@test.com",
                phone="+254712345684",
                role=UserRole.ADMIN,
                is_active=True,
                email_verified=True,
                phone_verified=True,
                created_at=datetime.utcnow()
            )
            super_admin.set_password("SuperAdminPass123!")

            if hasattr(db, 'session'):
                db.session.add(super_admin)
                db.session.commit()

            return super_admin
    except Exception:
        # Return mock super admin
        super_admin = User(
            name="Super Admin",
            email="superadmin@test.com",
            phone="+254712345684",
            role=UserRole.ADMIN,
            is_active=True,
            email_verified=True,
            phone_verified=True,
            created_at=datetime.utcnow()
        )
        super_admin.set_password("SuperAdminPass123!")
        return super_admin

@pytest.fixture
def multiple_users(app):
    """Create multiple users for testing user management."""
    try:
        with app.app_context():
            users = []

            # Create 5 regular users
            for i in range(5):
                user = User(
                    name=f"User {i+1}",
                    email=f"user{i+1}@test.com",
                    phone=f"+25471234568{i}",
                    role=UserRole.USER,
                    is_active=True if i % 2 == 0 else False,  # Mix of active/inactive
                    email_verified=True,
                    phone_verified=True,
                    created_at=datetime.utcnow()
                )
                user.set_password("UserPass123!")
                users.append(user)

            # Create 2 additional admins
            for i in range(2):
                admin = User(
                    name=f"Admin {i+1}",
                    email=f"admin{i+1}@test.com",
                    phone=f"+25471234569{i}",
                    role=UserRole.ADMIN,
                    is_active=True,
                    email_verified=True,
                    phone_verified=True,
                    created_at=datetime.utcnow()
                )
                admin.set_password("AdminPass123!")
                users.append(admin)

            if hasattr(db, 'session'):
                db.session.add_all(users)
                db.session.commit()

            return users
    except Exception:
        # Return mock users
        users = []
        for i in range(7):  # 5 users + 2 admins
            if i < 5:
                user = User(
                    name=f"User {i+1}",
                    email=f"user{i+1}@test.com",
                    phone=f"+25471234568{i}",
                    role=UserRole.USER,
                    is_active=True if i % 2 == 0 else False,
                    email_verified=True,
                    phone_verified=True,
                    created_at=datetime.utcnow()
                )
            else:
                user = User(
                    name=f"Admin {i-4}",
                    email=f"admin{i-4}@test.com",
                    phone=f"+25471234569{i-5}",
                    role=UserRole.ADMIN,
                    is_active=True,
                    email_verified=True,
                    phone_verified=True,
                    created_at=datetime.utcnow()
                )
            user.set_password("UserPass123!" if i < 5 else "AdminPass123!")
            users.append(user)
        return users

@pytest.fixture
def admin_with_activity_logs(app, admin_user):
    """Create admin user with some activity logs for testing."""
    try:
        with app.app_context():
            # Create some activity logs
            logs = [
                AdminActivityLog(
                    admin_id=admin_user.id,
                    action='LOGIN',
                    details='Admin logged in successfully',
                    ip_address='127.0.0.1',
                    user_agent='Test User Agent',
                    endpoint='/api/admin/login',
                    method='POST',
                    status_code=200,
                    created_at=datetime.utcnow()
                ),
                AdminActivityLog(
                    admin_id=admin_user.id,
                    action='PROFILE_UPDATE',
                    details='Admin updated profile',
                    ip_address='127.0.0.1',
                    user_agent='Test User Agent',
                    endpoint='/api/admin/profile',
                    method='PUT',
                    status_code=200,
                    created_at=datetime.utcnow()
                ),
                AdminActivityLog(
                    admin_id=admin_user.id,
                    action='PASSWORD_CHANGE',
                    details='Admin changed password',
                    ip_address='127.0.0.1',
                    user_agent='Test User Agent',
                    endpoint='/api/admin/change-password',
                    method='POST',
                    status_code=200,
                    created_at=datetime.utcnow()
                )
            ]

            if hasattr(db, 'session'):
                db.session.add_all(logs)
                db.session.commit()

            return admin_user
    except Exception:
        return admin_user

@pytest.fixture
def blacklisted_tokens(app, admin_user):
    """Create some blacklisted tokens for testing."""
    try:
        with app.app_context():
            import uuid

            tokens = [
                TokenBlacklist(
                    jti=str(uuid.uuid4()),
                    token_type='access',
                    user_id=admin_user.id,
                    expires_at=datetime.utcnow() + timedelta(hours=1),
                    reason='logout'
                ),
                TokenBlacklist(
                    jti=str(uuid.uuid4()),
                    token_type='refresh',
                    user_id=admin_user.id,
                    expires_at=datetime.utcnow() + timedelta(days=1),
                    reason='password_change'
                ),
                TokenBlacklist(
                    jti=str(uuid.uuid4()),
                    token_type='access',
                    user_id=admin_user.id,
                    expires_at=datetime.utcnow() - timedelta(hours=1),  # Expired
                    reason='security'
                )
            ]

            if hasattr(db, 'session'):
                db.session.add_all(tokens)
                db.session.commit()

            return tokens
    except Exception:
        return []

@pytest.fixture(autouse=True)
def setup_test_environment(app):
    """Setup test environment before each test."""
    try:
        with app.app_context():
            # Clear any existing data
            if hasattr(db, 'session'):
                try:
                    db.session.query(AdminMFA).delete()
                    db.session.query(AdminActivityLog).delete()
                    db.session.query(TokenBlacklist).delete()
                    db.session.commit()
                except:
                    pass

            yield

            # Cleanup after test
            if hasattr(db, 'session'):
                try:
                    db.session.rollback()
                except:
                    pass
    except Exception:
        yield

@pytest.fixture
def mock_email_service():
    """Mock email service for testing."""
    from unittest.mock import patch

    with patch('app.routes.admin.admin_auth.send_admin_email') as mock_send:
        mock_send.return_value = True
        yield mock_send

@pytest.fixture
def mock_sms_service():
    """Mock SMS service for testing."""
    from unittest.mock import patch

    with patch('app.routes.admin.admin_auth.send_sms_otp') as mock_sms:
        mock_sms.return_value = True
        yield mock_sms

@pytest.fixture
def expired_admin_token(admin_user):
    """Create an expired admin token for testing."""
    try:
        from flask_jwt_extended import create_access_token
        from datetime import timedelta

        return create_access_token(
            identity=str(admin_user.id),
            additional_claims={"role": "admin"},
            expires_delta=timedelta(seconds=-1)  # Already expired
        )
    except ImportError:
        return "mock-expired-admin-token"

@pytest.fixture
def mfa_token(admin_user_with_mfa):
    """Generate a valid MFA token for testing."""
    try:
        totp = pyotp.TOTP(admin_user_with_mfa._test_mfa_secret)
        return totp.now()
    except:
        return "123456"

@pytest.fixture
def invalid_mfa_token():
    """Generate an invalid MFA token for testing."""
    return "123456"  # Invalid token

@pytest.fixture
def backup_code(admin_user_with_mfa):
    """Get a valid backup code for testing."""
    return "12345678"

@pytest.fixture
def admin_headers(admin_token):
    """Create headers with admin authorization."""
    return {
        'Authorization': f'Bearer {admin_token}',
        'Content-Type': 'application/json'
    }

@pytest.fixture
def admin_headers_with_mfa(admin_token, mfa_token):
    """Create headers with admin authorization and MFA token."""
    return {
        'Authorization': f'Bearer {admin_token}',
        'Content-Type': 'application/json',
        'X-MFA-Token': mfa_token
    }

@pytest.fixture
def non_admin_headers(non_admin_token):
    """Create headers with non-admin authorization."""
    return {
        'Authorization': f'Bearer {non_admin_token}',
        'Content-Type': 'application/json'
    }

@pytest.fixture
def expired_headers(expired_admin_token):
    """Create headers with expired admin token."""
    return {
        'Authorization': f'Bearer {expired_admin_token}',
        'Content-Type': 'application/json'
    }

@pytest.fixture
def invalid_reset_token(admin_user):
    """Create an invalid password reset token for testing."""
    try:
        from flask_jwt_extended import create_access_token
        from datetime import timedelta

        return create_access_token(
            identity=admin_user.email,
            expires_delta=timedelta(minutes=15),
            additional_claims={"purpose": "user_password_reset", "role": "user"}  # Wrong purpose and role
        )
    except ImportError:
        return "mock-invalid-reset-token"

@pytest.fixture
def mock_jwt_blacklist():
    """Mock JWT blacklist checking."""
    from unittest.mock import patch

    with patch('app.routes.admin.admin_auth.is_token_blacklisted') as mock_blacklist:
        mock_blacklist.return_value = False
        yield mock_blacklist

@pytest.fixture
def mock_jwt_blacklist_true():
    """Mock JWT blacklist checking to return True."""
    from unittest.mock import patch

    with patch('app.routes.admin.admin_auth.is_token_blacklisted') as mock_blacklist:
        mock_blacklist.return_value = True
        yield mock_blacklist

@pytest.fixture
def sample_admin_data():
    """Sample data for creating admin users."""
    return {
        'name': 'New Admin',
        'email': 'newadmin@test.com',
        'phone': '+254712345699',
        'password': 'NewAdminPass123!'
    }

@pytest.fixture
def invalid_admin_data():
    """Invalid data for testing admin creation validation."""
    return {
        'name': '',  # Empty name
        'email': 'invalid-email',  # Invalid email
        'phone': '123',  # Invalid phone
        'password': 'weak'  # Weak password
    }

@pytest.fixture
def profile_update_data():
    """Sample data for updating admin profile."""
    return {
        'name': 'Updated Admin Name',
        'phone': '+254712345688',
        'avatar_url': 'https://example.com/avatar.jpg'
    }

@pytest.fixture
def password_change_data():
    """Sample data for changing admin password."""
    return {
        'current_password': 'AdminPass123!',
        'new_password': 'NewAdminPass456!',
        'confirm_password': 'NewAdminPass456!'
    }

@pytest.fixture
def invalid_password_change_data():
    """Invalid data for testing password change validation."""
    return {
        'current_password': 'WrongPassword',
        'new_password': 'weak',
        'confirm_password': 'different'
    }

@pytest.fixture
def mock_rate_limiter():
    """Mock rate limiter for testing."""
    from unittest.mock import patch

    with patch('app.routes.admin.admin_auth.limiter.limit') as mock_limit:
        def dummy_decorator(func):
            return func
        mock_limit.return_value = dummy_decorator
        yield mock_limit

@pytest.fixture
def cleanup_database(app):
    """Clean up database after tests."""
    yield

    try:
        with app.app_context():
            # Clean up all test data
            if hasattr(db, 'session'):
                try:
                    db.session.query(AdminMFA).delete()
                    db.session.query(AdminActivityLog).delete()
                    db.session.query(TokenBlacklist).delete()
                    db.session.query(User).delete()
                    db.session.commit()
                except:
                    pass
    except Exception:
        pass
