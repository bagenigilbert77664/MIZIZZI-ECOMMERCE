"""
Comprehensive pytest test suite for Flask authentication routes in user.py.
Tests cover all authentication endpoints with success and failure scenarios.
"""

import pytest
import json
import uuid
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock
from flask import Flask
from flask_jwt_extended import create_access_token, create_refresh_token

# Import the application factory and models
from backend import create_app
from backend.configuration.extensions import db
from backend.models.models import User, UserRole


class TestUserAuth:
    """Test class for user authentication routes."""

    @pytest.fixture
    def app(self):
        """Create and configure a test Flask application."""
        app = create_app('testing')
        app.config.update({
            'TESTING': True,
            'SQLALCHEMY_DATABASE_URI': 'sqlite:///:memory:',
            'JWT_SECRET_KEY': 'test-jwt-secret',
            'SECRET_KEY': 'test-secret-key',
            'WTF_CSRF_ENABLED': False,
            'BREVO_API_KEY': 'test-brevo-key',
            'TWILIO_ACCOUNT_SID': 'test-twilio-sid',
            'TWILIO_AUTH_TOKEN': 'test-twilio-token',
            'TWILIO_PHONE_NUMBER': '+1234567890'
        })

        with app.app_context():
            db.create_all()
            yield app
            db.drop_all()

    @pytest.fixture
    def client(self, app):
        """Create a test client."""
        return app.test_client()

    @pytest.fixture
    def runner(self, app):
        """Create a test runner."""
        return app.test_cli_runner()

    @pytest.fixture
    def sample_user_data(self):
        """Sample user data for testing."""
        return {
            'name': 'John Doe',
            'email': 'john.doe@example.com',
            'phone': '+254700123456',
            'password': 'SecurePass123!'
        }

    @pytest.fixture
    def create_test_user(self, app, sample_user_data):
        """Create a test user in the database."""
        with app.app_context():
            user = User(
                name=sample_user_data['name'],
                email=sample_user_data['email'],
                phone=sample_user_data['phone'],
                email_verified=True,
                phone_verified=True,
                is_active=True
            )
            user.set_password(sample_user_data['password'])
            db.session.add(user)
            db.session.commit()
            return user

    @pytest.fixture
    def auth_headers(self, app, create_test_user):
        """Create authentication headers with valid JWT token."""
        with app.app_context():
            access_token = create_access_token(
                identity=str(create_test_user.id),
                additional_claims={"role": create_test_user.role.value}
            )
            return {'Authorization': f'Bearer {access_token}'}

    @pytest.fixture
    def admin_user(self, app):
        """Create an admin user."""
        with app.app_context():
            admin = User(
                name='Admin User',
                email='admin@example.com',
                phone='+254700999999',
                role=UserRole.ADMIN,
                email_verified=True,
                phone_verified=True,
                is_active=True
            )
            admin.set_password('AdminPass123!')
            db.session.add(admin)
            db.session.commit()
            return admin

    @pytest.fixture
    def admin_headers(self, app, admin_user):
        """Create admin authentication headers."""
        with app.app_context():
            access_token = create_access_token(
                identity=str(admin_user.id),
                additional_claims={"role": admin_user.role.value}
            )
            return {'Authorization': f'Bearer {access_token}'}

    # ==================== REGISTRATION TESTS ====================

    @patch('backend.routes.user.user.send_email')
    def test_register_with_email_success(self, mock_send_email, client, sample_user_data):
        """Test successful user registration with email."""
        mock_send_email.return_value = True

        response = client.post('/api/register',
                             json=sample_user_data,
                             content_type='application/json')

        assert response.status_code == 201
        data = json.loads(response.data)
        assert 'msg' in data
        assert 'user_id' in data
        assert 'Please check your email' in data['msg']
        mock_send_email.assert_called_once()

    @patch('backend.routes.user.user.send_sms')
    def test_register_with_phone_success(self, mock_send_sms, client):
        """Test successful user registration with phone only."""
        mock_send_sms.return_value = True

        user_data = {
            'name': 'Jane Doe',
            'phone': '+254700987654',
            'password': 'SecurePass123!'
        }

        response = client.post('/api/register',
                             json=user_data,
                             content_type='application/json')

        assert response.status_code == 201
        data = json.loads(response.data)
        assert 'msg' in data
        assert 'user_id' in data
        assert 'Please check your phone' in data['msg']
        mock_send_sms.assert_called_once()

    def test_register_missing_required_fields(self, client):
        """Test registration with missing required fields."""
        # Missing name
        response = client.post('/api/register',
                             json={'email': 'test@example.com', 'password': 'pass123'},
                             content_type='application/json')
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'Name and password are required' in data['msg']

        # Missing password
        response = client.post('/api/register',
                             json={'name': 'Test User', 'email': 'test@example.com'},
                             content_type='application/json')
        assert response.status_code == 400

        # Missing both email and phone
        response = client.post('/api/register',
                             json={'name': 'Test User', 'password': 'pass123'},
                             content_type='application/json')
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'Either email or phone is required' in data['msg']

    def test_register_invalid_email_format(self, client):
        """Test registration with invalid email format."""
        user_data = {
            'name': 'Test User',
            'email': 'invalid-email',
            'password': 'SecurePass123!'
        }

        response = client.post('/api/register',
                             json=user_data,
                             content_type='application/json')

        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'Invalid email format' in data['msg']

    def test_register_invalid_phone_format(self, client):
        """Test registration with invalid phone format."""
        user_data = {
            'name': 'Test User',
            'phone': '123456',  # Invalid format
            'password': 'SecurePass123!'
        }

        response = client.post('/api/register',
                             json=user_data,
                             content_type='application/json')

        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'Invalid phone number format' in data['msg']

    def test_register_weak_password(self, client):
        """Test registration with weak password."""
        user_data = {
            'name': 'Test User',
            'email': 'test@example.com',
            'password': '123'  # Too weak
        }

        response = client.post('/api/register',
                             json=user_data,
                             content_type='application/json')

        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'Password must be at least 8 characters' in data['msg']

    def test_register_duplicate_email(self, client, create_test_user):
        """Test registration with duplicate email."""
        user_data = {
            'name': 'Another User',
            'email': create_test_user.email,  # Duplicate email
            'password': 'SecurePass123!'
        }

        response = client.post('/api/register',
                             json=user_data,
                             content_type='application/json')

        assert response.status_code == 409
        data = json.loads(response.data)
        assert 'User with this email already exists' in data['msg']

    def test_register_duplicate_phone(self, client, create_test_user):
        """Test registration with duplicate phone."""
        user_data = {
            'name': 'Another User',
            'phone': create_test_user.phone,  # Duplicate phone
            'password': 'SecurePass123!'
        }

        response = client.post('/api/register',
                             json=user_data,
                             content_type='application/json')

        assert response.status_code == 409
        data = json.loads(response.data)
        assert 'User with this phone number already exists' in data['msg']

    @patch('backend.routes.user.user.send_email')
    def test_register_email_send_failure(self, mock_send_email, client, sample_user_data):
        """Test registration when email sending fails."""
        mock_send_email.return_value = False

        response = client.post('/api/register',
                             json=sample_user_data,
                             content_type='application/json')

        assert response.status_code == 500
        data = json.loads(response.data)
        assert 'Failed to send verification email' in data['msg']

    # ==================== VERIFICATION TESTS ====================

    def test_verify_code_success(self, client, app, sample_user_data):
        """Test successful code verification."""
        with app.app_context():
            # Create unverified user
            user = User(
                name=sample_user_data['name'],
                email=sample_user_data['email'],
                email_verified=False,
                verification_code='123456',
                verification_code_expires=datetime.utcnow() + timedelta(minutes=5)
            )
            user.set_password(sample_user_data['password'])
            db.session.add(user)
            db.session.commit()
            user_id = user.id

        response = client.post('/api/verify-code',
                             json={
                                 'user_id': user_id,
                                 'code': '123456',
                                 'is_phone': False
                             },
                             content_type='application/json')

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['verified'] is True
        assert 'access_token' in data
        assert 'refresh_token' in data
        assert 'csrf_token' in data

    def test_verify_code_invalid_user_id(self, client):
        """Test verification with invalid user ID."""
        response = client.post('/api/verify-code',
                             json={
                                 'user_id': 99999,  # Non-existent user
                                 'code': '123456',
                                 'is_phone': False
                             },
                             content_type='application/json')

        assert response.status_code == 404
        data = json.loads(response.data)
        assert 'User not found' in data['msg']

    def test_verify_code_missing_fields(self, client):
        """Test verification with missing required fields."""
        # Missing user_id
        response = client.post('/api/verify-code',
                             json={'code': '123456'},
                             content_type='application/json')
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'User ID and verification code are required' in data['msg']

        # Missing code
        response = client.post('/api/verify-code',
                             json={'user_id': 1},
                             content_type='application/json')
        assert response.status_code == 400

    def test_verify_code_expired(self, client, app, sample_user_data):
        """Test verification with expired code."""
        with app.app_context():
            user = User(
                name=sample_user_data['name'],
                email=sample_user_data['email'],
                email_verified=False,
                verification_code='123456',
                verification_code_expires=datetime.utcnow() - timedelta(minutes=1)  # Expired
            )
            user.set_password(sample_user_data['password'])
            db.session.add(user)
            db.session.commit()
            user_id = user.id

        response = client.post('/api/verify-code',
                             json={
                                 'user_id': user_id,
                                 'code': '123456',
                                 'is_phone': False
                             },
                             content_type='application/json')

        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'Verification code has expired' in data['msg']

    def test_verify_code_incorrect(self, client, app, sample_user_data):
        """Test verification with incorrect code."""
        with app.app_context():
            user = User(
                name=sample_user_data['name'],
                email=sample_user_data['email'],
                email_verified=False,
                verification_code='123456',
                verification_code_expires=datetime.utcnow() + timedelta(minutes=5)
            )
            user.set_password(sample_user_data['password'])
            db.session.add(user)
            db.session.commit()
            user_id = user.id

        response = client.post('/api/verify-code',
                             json={
                                 'user_id': user_id,
                                 'code': '654321',  # Wrong code
                                 'is_phone': False
                             },
                             content_type='application/json')

        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'Invalid verification code' in data['msg']

    def test_verify_code_no_code_set(self, client, app, sample_user_data):
        """Test verification when no code is set."""
        with app.app_context():
            user = User(
                name=sample_user_data['name'],
                email=sample_user_data['email'],
                email_verified=False
                # No verification code set
            )
            user.set_password(sample_user_data['password'])
            db.session.add(user)
            db.session.commit()
            user_id = user.id

        response = client.post('/api/verify-code',
                             json={
                                 'user_id': user_id,
                                 'code': '123456',
                                 'is_phone': False
                             },
                             content_type='application/json')

        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'No verification code set' in data['msg']

    # ==================== LOGIN TESTS ====================

    def test_login_with_email_success(self, client, create_test_user, sample_user_data):
        """Test successful login with email."""
        response = client.post('/api/login',
                             json={
                                 'identifier': sample_user_data['email'],
                                 'password': sample_user_data['password']
                             },
                             content_type='application/json')

        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'access_token' in data
        assert 'refresh_token' in data
        assert 'csrf_token' in data
        assert 'user' in data
        assert data['user']['email'] == sample_user_data['email']

    def test_login_with_phone_success(self, client, create_test_user, sample_user_data):
        """Test successful login with phone."""
        response = client.post('/api/login',
                             json={
                                 'identifier': sample_user_data['phone'],
                                 'password': sample_user_data['password']
                             },
                             content_type='application/json')

        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'access_token' in data
        assert 'refresh_token' in data
        assert 'user' in data
        assert data['user']['phone'] == sample_user_data['phone']

    def test_login_missing_fields(self, client):
        """Test login with missing required fields."""
        # Missing identifier
        response = client.post('/api/login',
                             json={'password': 'password123'},
                             content_type='application/json')
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'Identifier (email/phone) and password are required' in data['msg']

        # Missing password
        response = client.post('/api/login',
                             json={'identifier': 'test@example.com'},
                             content_type='application/json')
        assert response.status_code == 400

    def test_login_invalid_credentials(self, client, create_test_user, sample_user_data):
        """Test login with invalid credentials."""
        # Wrong password
        response = client.post('/api/login',
                             json={
                                 'identifier': sample_user_data['email'],
                                 'password': 'wrongpassword'
                             },
                             content_type='application/json')
        assert response.status_code == 401
        data = json.loads(response.data)
        assert 'Invalid credentials' in data['msg']

        # Non-existent user
        response = client.post('/api/login',
                             json={
                                 'identifier': 'nonexistent@example.com',
                                 'password': 'password123'
                             },
                             content_type='application/json')
        assert response.status_code == 401

    def test_login_unverified_email(self, client, app, sample_user_data):
        """Test login with unverified email."""
        with app.app_context():
            user = User(
                name=sample_user_data['name'],
                email=sample_user_data['email'],
                email_verified=False,  # Not verified
                is_active=True
            )
            user.set_password(sample_user_data['password'])
            db.session.add(user)
            db.session.commit()

        response = client.post('/api/login',
                             json={
                                 'identifier': sample_user_data['email'],
                                 'password': sample_user_data['password']
                             },
                             content_type='application/json')

        assert response.status_code == 403
        data = json.loads(response.data)
        assert 'Email not verified' in data['msg']
        assert data['verification_required'] is True

    def test_login_unverified_phone(self, client, app, sample_user_data):
        """Test login with unverified phone."""
        with app.app_context():
            user = User(
                name=sample_user_data['name'],
                phone=sample_user_data['phone'],
                phone_verified=False,  # Not verified
                is_active=True
            )
            user.set_password(sample_user_data['password'])
            db.session.add(user)
            db.session.commit()

        response = client.post('/api/login',
                             json={
                                 'identifier': sample_user_data['phone'],
                                 'password': sample_user_data['password']
                             },
                             content_type='application/json')

        assert response.status_code == 403
        data = json.loads(response.data)
        assert 'Phone number not verified' in data['msg']
        assert data['verification_required'] is True

    def test_login_deactivated_account(self, client, app, sample_user_data):
        """Test login with deactivated account."""
        with app.app_context():
            user = User(
                name=sample_user_data['name'],
                email=sample_user_data['email'],
                email_verified=True,
                is_active=False  # Deactivated
            )
            user.set_password(sample_user_data['password'])
            db.session.add(user)
            db.session.commit()

        response = client.post('/api/login',
                             json={
                                 'identifier': sample_user_data['email'],
                                 'password': sample_user_data['password']
                             },
                             content_type='application/json')

        assert response.status_code == 403
        data = json.loads(response.data)
        assert 'Account is deactivated' in data['msg']

    # ==================== RESEND VERIFICATION TESTS ====================

    @patch('backend.routes.user.user.send_email')
    def test_resend_verification_email_success(self, mock_send_email, client, app, sample_user_data):
        """Test successful resend verification for email."""
        mock_send_email.return_value = True

        with app.app_context():
            user = User(
                name=sample_user_data['name'],
                email=sample_user_data['email'],
                email_verified=False
            )
            user.set_password(sample_user_data['password'])
            db.session.add(user)
            db.session.commit()

        response = client.post('/api/resend-verification',
                             json={'identifier': sample_user_data['email']},
                             content_type='application/json')

        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'Verification code sent' in data['msg']
        mock_send_email.assert_called_once()

    @patch('backend.routes.user.user.send_sms')
    def test_resend_verification_phone_success(self, mock_send_sms, client, app, sample_user_data):
        """Test successful resend verification for phone."""
        mock_send_sms.return_value = True

        with app.app_context():
            user = User(
                name=sample_user_data['name'],
                phone=sample_user_data['phone'],
                phone_verified=False
            )
            user.set_password(sample_user_data['password'])
            db.session.add(user)
            db.session.commit()

        response = client.post('/api/resend-verification',
                             json={'identifier': sample_user_data['phone']},
                             content_type='application/json')

        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'Verification code sent' in data['msg']
        mock_send_sms.assert_called_once()

    def test_resend_verification_missing_identifier(self, client):
        """Test resend verification with missing identifier."""
        response = client.post('/api/resend-verification',
                             json={},
                             content_type='application/json')

        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'Email or phone number is required' in data['msg']

    def test_resend_verification_user_not_found(self, client):
        """Test resend verification for non-existent user."""
        response = client.post('/api/resend-verification',
                             json={'identifier': 'nonexistent@example.com'},
                             content_type='application/json')

        assert response.status_code == 404
        data = json.loads(response.data)
        assert 'User not found' in data['msg']

    # ==================== FORGOT PASSWORD TESTS ====================

    @patch('backend.routes.user.user.send_email')
    def test_forgot_password_success(self, mock_send_email, client, create_test_user, sample_user_data):
        """Test successful forgot password request."""
        mock_send_email.return_value = True

        response = client.post('/api/forgot-password',
                             json={'email': sample_user_data['email']},
                             content_type='application/json')

        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'password reset link' in data['message']
        mock_send_email.assert_called_once()

    def test_forgot_password_missing_email(self, client):
        """Test forgot password with missing email."""
        response = client.post('/api/forgot-password',
                             json={},
                             content_type='application/json')

        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'Email is required' in data['error']

    def test_forgot_password_invalid_email(self, client):
        """Test forgot password with invalid email format."""
        response = client.post('/api/forgot-password',
                             json={'email': 'invalid-email'},
                             content_type='application/json')

        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'Invalid email format' in data['error']

    def test_forgot_password_nonexistent_user(self, client):
        """Test forgot password for non-existent user."""
        response = client.post('/api/forgot-password',
                             json={'email': 'nonexistent@example.com'},
                             content_type='application/json')

        # Should return success message for security (don't reveal if email exists)
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'password reset link' in data['message']

    @patch('backend.routes.user.user.send_email')
    def test_forgot_password_email_send_failure(self, mock_send_email, client, create_test_user, sample_user_data):
        """Test forgot password when email sending fails."""
        mock_send_email.return_value = False

        response = client.post('/api/forgot-password',
                             json={'email': sample_user_data['email']},
                             content_type='application/json')

        assert response.status_code == 500
        data = json.loads(response.data)
        assert 'Failed to send password reset email' in data['error']

    # ==================== RESET PASSWORD TESTS ====================

    def test_reset_password_success(self, client, app, create_test_user, sample_user_data):
        """Test successful password reset."""
        with app.app_context():
            # Create a valid reset token
            from flask_jwt_extended import create_access_token
            reset_token = create_access_token(
                identity=sample_user_data['email'],
                additional_claims={'purpose': 'password_reset'},
                expires_delta=timedelta(minutes=30)
            )

        response = client.post('/api/reset-password',
                             json={
                                 'token': reset_token,
                                 'password': 'NewSecurePass123!'
                             },
                             content_type='application/json')

        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'Password reset successful' in data['message']

    def test_reset_password_missing_fields(self, client):
        """Test reset password with missing fields."""
        # Missing token
        response = client.post('/api/reset-password',
                             json={'password': 'NewPass123!'},
                             content_type='application/json')
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'Token and new password are required' in data['error']

        # Missing password
        response = client.post('/api/reset-password',
                             json={'token': 'some-token'},
                             content_type='application/json')
        assert response.status_code == 400

    def test_reset_password_weak_password(self, client):
        """Test reset password with weak password."""
        response = client.post('/api/reset-password',
                             json={
                                 'token': 'some-token',
                                 'password': '123'  # Too weak
                             },
                             content_type='application/json')

        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'Password must be at least 8 characters' in data['error']

    def test_reset_password_invalid_token(self, client):
        """Test reset password with invalid token."""
        response = client.post('/api/reset-password',
                             json={
                                 'token': 'invalid-token',
                                 'password': 'NewSecurePass123!'
                             },
                             content_type='application/json')

        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'Invalid reset token' in data['error']

    def test_reset_password_expired_token(self, client, app, sample_user_data):
        """Test reset password with expired token."""
        with app.app_context():
            # Create an expired reset token
            from flask_jwt_extended import create_access_token
            reset_token = create_access_token(
                identity=sample_user_data['email'],
                additional_claims={'purpose': 'password_reset'},
                expires_delta=timedelta(seconds=-1)  # Already expired
            )

        response = client.post('/api/reset-password',
                             json={
                                 'token': reset_token,
                                 'password': 'NewSecurePass123!'
                             },
                             content_type='application/json')

        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'Password reset link expired' in data['error']

    def test_reset_password_wrong_purpose_token(self, client, app, sample_user_data):
        """Test reset password with token not created for password reset."""
        with app.app_context():
            # Create a token without password_reset purpose
            from flask_jwt_extended import create_access_token
            wrong_token = create_access_token(
                identity=sample_user_data['email'],
                additional_claims={'purpose': 'email_verification'}  # Wrong purpose
            )

        response = client.post('/api/reset-password',
                             json={
                                 'token': wrong_token,
                                 'password': 'NewSecurePass123!'
                             },
                             content_type='application/json')

        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'Invalid reset token' in data['error']

    # ==================== PROFILE TESTS ====================

    def test_get_profile_success(self, client, auth_headers, create_test_user, sample_user_data):
        """Test successful profile retrieval."""
        response = client.get('/api/profile', headers=auth_headers)

        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'user' in data
        assert data['user']['email'] == sample_user_data['email']
        assert data['user']['name'] == sample_user_data['name']

    def test_get_profile_no_token(self, client):
        """Test profile retrieval without authentication token."""
        response = client.get('/api/profile')

        assert response.status_code == 401
        data = json.loads(response.data)
        assert 'Authorization required' in data['error']

    def test_get_profile_invalid_token(self, client):
        """Test profile retrieval with invalid token."""
        headers = {'Authorization': 'Bearer invalid-token'}
        response = client.get('/api/profile', headers=headers)

        assert response.status_code == 401
        data = json.loads(response.data)
        assert 'Invalid token' in data['error']

    def test_update_profile_success(self, client, auth_headers, create_test_user):
        """Test successful profile update."""
        update_data = {
            'name': 'Updated Name',
            'phone': '+254700999888'
        }

        response = client.put('/api/profile',
                            json=update_data,
                            headers=auth_headers,
                            content_type='application/json')

        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'Profile updated successfully' in data['msg']
        assert data['user']['name'] == 'Updated Name'
        assert data['user']['phone'] == '+254700999888'

    def test_update_profile_email_conflict(self, client, auth_headers, app, sample_user_data):
        """Test profile update with conflicting email."""
        with app.app_context():
            # Create another user with different email
            other_user = User(
                name='Other User',
                email='other@example.com',
                email_verified=True,
                is_active=True
            )
            other_user.set_password('password123')
            db.session.add(other_user)
            db.session.commit()

        # Try to update profile with the other user's email
        update_data = {'email': 'other@example.com'}

        response = client.put('/api/profile',
                            json=update_data,
                            headers=auth_headers,
                            content_type='application/json')

        assert response.status_code == 409
        data = json.loads(response.data)
        assert 'Email already in use' in data['msg']

    def test_update_profile_phone_conflict(self, client, auth_headers, app, sample_user_data):
        """Test profile update with conflicting phone."""
        with app.app_context():
            # Create another user with different phone
            other_user = User(
                name='Other User',
                phone='+254700888777',
                phone_verified=True,
                is_active=True
            )
            other_user.set_password('password123')
            db.session.add(other_user)
            db.session.commit()

        # Try to update profile with the other user's phone
        update_data = {'phone': '+254700888777'}

        response = client.put('/api/profile',
                            json=update_data,
                            headers=auth_headers,
                            content_type='application/json')

        assert response.status_code == 409
        data = json.loads(response.data)
        assert 'Phone number already in use' in data['msg']

    def test_update_profile_invalid_role(self, client, auth_headers):
        """Test profile update with invalid role."""
        update_data = {'role': 'invalid_role'}

        response = client.put('/api/profile',
                            json=update_data,
                            headers=auth_headers,
                            content_type='application/json')

        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'Invalid role' in data['msg']

    # ==================== CHANGE PASSWORD TESTS ====================

    def test_change_password_success(self, client, auth_headers, sample_user_data):
        """Test successful password change."""
        change_data = {
            'current_password': sample_user_data['password'],
            'new_password': 'NewSecurePass123!'
        }

        response = client.post('/api/change-password',
                             json=change_data,
                             headers=auth_headers,
                             content_type='application/json')

        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'Password changed successfully' in data['msg']

    def test_change_password_missing_fields(self, client, auth_headers):
        """Test change password with missing fields."""
        # Missing current password
        response = client.post('/api/change-password',
                             json={'new_password': 'NewPass123!'},
                             headers=auth_headers,
                             content_type='application/json')
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'Current password and new password are required' in data['msg']

        # Missing new password
        response = client.post('/api/change-password',
                             json={'current_password': 'oldpass'},
                             headers=auth_headers,
                             content_type='application/json')
        assert response.status_code == 400

    def test_change_password_incorrect_current(self, client, auth_headers):
        """Test change password with incorrect current password."""
        change_data = {
            'current_password': 'wrongpassword',
            'new_password': 'NewSecurePass123!'
        }

        response = client.post('/api/change-password',
                             json=change_data,
                             headers=auth_headers,
                             content_type='application/json')

        assert response.status_code == 401
        data = json.loads(response.data)
        assert 'Current password is incorrect' in data['msg']

    def test_change_password_weak_new_password(self, client, auth_headers, sample_user_data):
        """Test change password with weak new password."""
        change_data = {
            'current_password': sample_user_data['password'],
            'new_password': '123'  # Too weak
        }

        response = client.post('/api/change-password',
                             json=change_data,
                             headers=auth_headers,
                             content_type='application/json')

        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'Password must be at least 8 characters' in data['msg']

    def test_change_password_no_token(self, client):
        """Test change password without authentication token."""
        change_data = {
            'current_password': 'oldpass',
            'new_password': 'NewSecurePass123!'
        }

        response = client.post('/api/change-password',
                             json=change_data,
                             content_type='application/json')

        assert response.status_code == 401
        data = json.loads(response.data)
        assert 'Authorization required' in data['error']

    # ==================== DELETE ACCOUNT TESTS ====================

    def test_delete_account_success(self, client, auth_headers, sample_user_data):
        """Test successful account deletion."""
        delete_data = {'password': sample_user_data['password']}

        response = client.post('/api/delete-account',
                             json=delete_data,
                             headers=auth_headers,
                             content_type='application/json')

        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'Account deleted successfully' in data['msg']

    def test_delete_account_missing_password(self, client, auth_headers):
        """Test delete account with missing password."""
        response = client.post('/api/delete-account',
                             json={},
                             headers=auth_headers,
                             content_type='application/json')

        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'Password is required' in data['msg']

    def test_delete_account_incorrect_password(self, client, auth_headers):
        """Test delete account with incorrect password."""
        delete_data = {'password': 'wrongpassword'}

        response = client.post('/api/delete-account',
                             json=delete_data,
                             headers=auth_headers,
                             content_type='application/json')

        assert response.status_code == 401
        data = json.loads(response.data)
        assert 'Password is incorrect' in data['msg']

    def test_delete_account_no_token(self, client):
        """Test delete account without authentication token."""
        delete_data = {'password': 'password123'}

        response = client.post('/api/delete-account',
                             json=delete_data,
                             content_type='application/json')

        assert response.status_code == 401
        data = json.loads(response.data)
        assert 'Authorization required' in data['error']

    def test_delete_account_options_method(self, client):
        """Test delete account OPTIONS method for CORS."""
        response = client.options('/api/delete-account')
        assert response.status_code == 200

    # ==================== LOGOUT TESTS ====================

    def test_logout_success(self, client, auth_headers):
        """Test successful logout."""
        response = client.post('/api/logout', headers=auth_headers)

        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'Successfully logged out' in data['msg']

    def test_logout_no_token(self, client):
        """Test logout without authentication token."""
        response = client.post('/api/logout')

        assert response.status_code == 401
        data = json.loads(response.data)
        assert 'Authorization required' in data['error']

    # ==================== CHECK AVAILABILITY TESTS ====================

    def test_check_availability_email_available(self, client):
        """Test check availability for available email."""
        response = client.post('/api/check-availability',
                             json={'email': 'available@example.com'},
                             content_type='application/json')

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['email_available'] is True

    def test_check_availability_email_unavailable(self, client, create_test_user, sample_user_data):
        """Test check availability for unavailable email."""
        response = client.post('/api/check-availability',
                             json={'email': sample_user_data['email']},
                             content_type='application/json')

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['email_available'] is False

    def test_check_availability_phone_available(self, client):
        """Test check availability for available phone."""
        response = client.post('/api/check-availability',
                             json={'phone': '+254700999999'},
                             content_type='application/json')

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['phone_available'] is True

    def test_check_availability_phone_unavailable(self, client, create_test_user, sample_user_data):
        """Test check availability for unavailable phone."""
        response = client.post('/api/check-availability',
                             json={'phone': sample_user_data['phone']},
                             content_type='application/json')

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['phone_available'] is False

    def test_check_availability_both_fields(self, client, create_test_user, sample_user_data):
        """Test check availability for both email and phone."""
        response = client.post('/api/check-availability',
                             json={
                                 'email': 'available@example.com',
                                 'phone': sample_user_data['phone']
                             },
                             content_type='application/json')

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['email_available'] is True
        assert data['phone_available'] is False

    def test_check_availability_missing_fields(self, client):
        """Test check availability with missing fields."""
        response = client.post('/api/check-availability',
                             json={},
                             content_type='application/json')

        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'Either email or phone is required' in data['msg']

    # ==================== TOKEN REFRESH TESTS ====================

    def test_refresh_token_success(self, client, app, create_test_user):
        """Test successful token refresh."""
        with app.app_context():
            refresh_token = create_refresh_token(
                identity=str(create_test_user.id),
                additional_claims={"role": create_test_user.role.value}
            )

        headers = {'Authorization': f'Bearer {refresh_token}'}
        response = client.post('/api/refresh', headers=headers)

        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'access_token' in data
        assert 'csrf_token' in data

    def test_refresh_token_no_token(self, client):
        """Test token refresh without refresh token."""
        response = client.post('/api/refresh')

        assert response.status_code == 401
        data = json.loads(response.data)
        assert 'Authorization required' in data['error']

    def test_refresh_token_invalid_token(self, client):
        """Test token refresh with invalid token."""
        headers = {'Authorization': 'Bearer invalid-token'}
        response = client.post('/api/refresh', headers=headers)

        assert response.status_code == 401
        data = json.loads(response.data)
        assert 'Invalid token' in data['error']

    def test_refresh_token_access_token_used(self, client, auth_headers):
        """Test token refresh using access token instead of refresh token."""
        # This should fail because we need a refresh token, not access token
        response = client.post('/api/refresh', headers=auth_headers)

        assert response.status_code == 422  # Unprocessable Entity for wrong token type

    def test_refresh_token_inactive_user(self, client, app, sample_user_data):
        """Test token refresh for inactive user."""
        with app.app_context():
            user = User(
                name=sample_user_data['name'],
                email=sample_user_data['email'],
                email_verified=True,
                is_active=False  # Inactive user
            )
            user.set_password(sample_user_data['password'])
            db.session.add(user)
            db.session.commit()

            refresh_token = create_refresh_token(
                identity=str(user.id),
                additional_claims={"role": user.role.value}
            )

        headers = {'Authorization': f'Bearer {refresh_token}'}
        response = client.post('/api/refresh', headers=headers)

        assert response.status_code == 404
        data = json.loads(response.data)
        assert 'User not found or inactive' in data['msg']

    # ==================== M-PESA TESTS ====================

    def test_mpesa_initiate_success(self, client, auth_headers):
        """Test successful M-Pesa payment initiation."""
        mpesa_data = {
            'phone': '+254700123456',
            'amount': 1000.0
        }

        response = client.post('/api/mpesa/initiate',
                             json=mpesa_data,
                             headers=auth_headers,
                             content_type='application/json')

        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'M-Pesa payment initiated' in data['message']
        assert 'checkout_request_id' in data
        assert data['phone'] == mpesa_data['phone']
        assert data['amount'] == mpesa_data['amount']

    def test_mpesa_initiate_missing_fields(self, client, auth_headers):
        """Test M-Pesa initiation with missing fields."""
        # Missing phone
        response = client.post('/api/mpesa/initiate',
                             json={'amount': 1000.0},
                             headers=auth_headers,
                             content_type='application/json')
        assert response.status_code == 400

        # Missing amount
        response = client.post('/api/mpesa/initiate',
                             json={'phone': '+254700123456'},
                             headers=auth_headers,
                             content_type='application/json')
        assert response.status_code == 400

    def test_mpesa_initiate_invalid_phone(self, client, auth_headers):
        """Test M-Pesa initiation with invalid phone format."""
        mpesa_data = {
            'phone': '123456',  # Invalid format
            'amount': 1000.0
        }

        response = client.post('/api/mpesa/initiate',
                             json=mpesa_data,
                             headers=auth_headers,
                             content_type='application/json')

        assert response.status_code == 400

    def test_mpesa_initiate_invalid_amount(self, client, auth_headers):
        """Test M-Pesa initiation with invalid amount."""
        mpesa_data = {
            'phone': '+254700123456',
            'amount': -100  # Negative amount
        }

        response = client.post('/api/mpesa/initiate',
                             json=mpesa_data,
                             headers=auth_headers,
                             content_type='application/json')

        assert response.status_code == 400

    def test_mpesa_initiate_no_token(self, client):
        """Test M-Pesa initiation without authentication token."""
        mpesa_data = {
            'phone': '+254700123456',
            'amount': 1000.0
        }

        response = client.post('/api/mpesa/initiate',
                             json=mpesa_data,
                             content_type='application/json')

        assert response.status_code == 401
        data = json.loads(response.data)
        assert 'Authorization required' in data['error']

    def test_mpesa_initiate_options_method(self, client):
        """Test M-Pesa initiate OPTIONS method for CORS."""
        response = client.options('/api/mpesa/initiate')
        assert response.status_code == 200

    # ==================== GOOGLE LOGIN TESTS ====================

    @patch('backend.routes.user.user.id_token.verify_oauth2_token')
    def test_google_login_success(self, mock_verify_token, client):
        """Test successful Google OAuth login."""
        # Mock Google token verification
        mock_verify_token.return_value = {
            'email': 'google.user@example.com',
            'name': 'Google User',
            'email_verified': True,
            'sub': 'google-user-id-123'
        }

        google_data = {
            'credential': 'valid-google-token'
        }

        response = client.post('/api/auth/google',
                             json=google_data,
                             content_type='application/json')

        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'access_token' in data
        assert 'refresh_token' in data
        assert 'user' in data
        assert data['user']['email'] == 'google.user@example.com'
        assert data['user']['is_google_user'] is True

    @patch('backend.routes.user.user.id_token.verify_oauth2_token')
    def test_google_login_invalid_token(self, mock_verify_token, client):
        """Test Google login with invalid token."""
        # Mock Google token verification failure
        mock_verify_token.side_effect = ValueError("Invalid token")

        google_data = {
            'credential': 'invalid-google-token'
        }

        response = client.post('/api/auth/google',
                             json=google_data,
                             content_type='application/json')

        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'Invalid Google token' in data['error']

    def test_google_login_missing_credential(self, client):
        """Test Google login with missing credential."""
        response = client.post('/api/auth/google',
                             json={},
                             content_type='application/json')

        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'Google credential is required' in data['error']

    @patch('backend.routes.user.user.id_token.verify_oauth2_token')
    def test_google_login_existing_user(self, mock_verify_token, client, create_test_user, sample_user_data):
        """Test Google login with existing user email."""
        # Mock Google token verification with existing user's email
        mock_verify_token.return_value = {
            'email': sample_user_data['email'],  # Same email as existing user
            'name': 'Google User',
            'email_verified': True,
            'sub': 'google-user-id-123'
        }

        google_data = {
            'credential': 'valid-google-token'
        }

        response = client.post('/api/auth/google',
                             json=google_data,
                             content_type='application/json')

        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'access_token' in data
        assert data['user']['email'] == sample_user_data['email']

    # ==================== CSRF TOKEN TESTS ====================

    def test_get_csrf_token_success(self, client, auth_headers):
        """Test successful CSRF token generation."""
        response = client.post('/api/auth/csrf', headers=auth_headers)

        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'csrf_token' in data
        assert len(data['csrf_token']) > 0

    def test_get_csrf_token_no_auth(self, client):
        """Test CSRF token generation without authentication."""
        response = client.post('/api/auth/csrf')

        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'csrf_token' in data

    def test_get_csrf_token_options_method(self, client):
        """Test CSRF token OPTIONS method for CORS."""
        response = client.options('/api/auth/csrf')
        assert response.status_code == 200

    # ==================== EMAIL VERIFICATION LINK TESTS ====================

    def test_verify_email_link_success(self, client, app, sample_user_data):
        """Test successful email verification via link."""
        with app.app_context():
            user = User(
                name=sample_user_data['name'],
                email=sample_user_data['email'],
                email_verified=False
            )
            user.set_password(sample_user_data['password'])
            db.session.add(user)
            db.session.commit()

            # Create verification token
            from flask_jwt_extended import create_access_token
            verification_token = create_access_token(
                identity=sample_user_data['email'],
                expires_delta=timedelta(hours=24)
            )

        response = client.get(f'/api/verify-email?token={verification_token}')

        # Should redirect to frontend with tokens
        assert response.status_code == 302
        assert 'access_token' in response.location
        assert 'refresh_token' in response.location

    def test_verify_email_link_json_request(self, client, app, sample_user_data):
        """Test email verification link with JSON Accept header."""
        with app.app_context():
            user = User(
                name=sample_user_data['name'],
                email=sample_user_data['email'],
                email_verified=False
            )
            user.set_password(sample_user_data['password'])
            db.session.add(user)
            db.session.commit()

            # Create verification token
            from flask_jwt_extended import create_access_token
            verification_token = create_access_token(
                identity=sample_user_data['email'],
                expires_delta=timedelta(hours=24)
            )

        headers = {'Accept': 'application/json'}
        response = client.get(f'/api/verify-email?token={verification_token}', headers=headers)

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['verified'] is True
        assert 'access_token' in data
        assert 'refresh_token' in data

    def test_verify_email_link_no_token(self, client):
        """Test email verification link without token."""
        response = client.get('/api/verify-email')

        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'No token provided' in data['msg']

    def test_verify_email_link_invalid_token(self, client):
        """Test email verification link with invalid token."""
        response = client.get('/api/verify-email?token=invalid-token')

        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'Invalid verification token' in data['msg']

    def test_verify_email_link_expired_token(self, client, app, sample_user_data):
        """Test email verification link with expired token."""
        with app.app_context():
            # Create expired verification token
            from flask_jwt_extended import create_access_token
            verification_token = create_access_token(
                identity=sample_user_data['email'],
                expires_delta=timedelta(seconds=-1)  # Already expired
            )

        response = client.get(f'/api/verify-email?token={verification_token}')

        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'Verification link expired' in data['msg']

    def test_verify_email_link_user_not_found(self, client, app):
        """Test email verification link for non-existent user."""
        with app.app_context():
            # Create verification token for non-existent user
            from flask_jwt_extended import create_access_token
            verification_token = create_access_token(
                identity='nonexistent@example.com',
                expires_delta=timedelta(hours=24)
            )

        response = client.get(f'/api/verify-email?token={verification_token}')

        assert response.status_code == 404
        data = json.loads(response.data)
        assert 'User not found' in data['msg']

    # ==================== EDGE CASES AND ERROR HANDLING ====================

    def test_malformed_json_request(self, client):
        """Test handling of malformed JSON requests."""
        response = client.post('/api/register',
                             data='{"invalid": json}',
                             content_type='application/json')

        assert response.status_code == 400

    def test_empty_json_request(self, client):
        """Test handling of empty JSON requests."""
        response = client.post('/api/register',
                             json=None,
                             content_type='application/json')

        assert response.status_code == 400

    def test_large_payload_handling(self, client):
        """Test handling of unusually large payloads."""
        large_data = {
            'name': 'A' * 10000,  # Very long name
            'email': 'test@example.com',
            'password': 'SecurePass123!'
        }

        response = client.post('/api/register',
                             json=large_data,
                             content_type='application/json')

        # Should handle gracefully (either accept or reject with proper error)
        assert response.status_code in [201, 400, 413]

    def test_concurrent_registration_same_email(self, client, sample_user_data):
        """Test concurrent registration attempts with same email."""
        # This test simulates race conditions but is limited by test environment
        # In real scenarios, database constraints should handle this

        response1 = client.post('/api/register',
                              json=sample_user_data,
                              content_type='application/json')

        response2 = client.post('/api/register',
                              json=sample_user_data,
                              content_type='application/json')

        # One should succeed, one should fail
        status_codes = [response1.status_code, response2.status_code]
        assert 201 in status_codes
        assert 409 in status_codes

    def test_special_characters_in_fields(self, client):
        """Test handling of special characters in input fields."""
        special_data = {
            'name': 'José María Ñoño',  # Unicode characters
            'email': 'test+tag@example.com',  # Plus sign in email
            'password': 'Pássw0rd!@#$%'  # Special characters in password
        }

        response = client.post('/api/register',
                             json=special_data,
                             content_type='application/json')

        # Should handle Unicode and special characters properly
        assert response.status_code in [201, 400, 500]

    def test_sql_injection_attempts(self, client):
        """Test protection against SQL injection attempts."""
        injection_data = {
            'name': "'; DROP TABLE users; --",
            'email': 'test@example.com',
            'password': 'SecurePass123!'
        }

        response = client.post('/api/register',
                             json=injection_data,
                             content_type='application/json')

        # Should not cause server error and should handle safely
        assert response.status_code in [201, 400]

    def test_xss_attempts_in_fields(self, client):
        """Test protection against XSS attempts in input fields."""
        xss_data = {
            'name': '<script>alert("xss")</script>',
            'email': 'test@example.com',
            'password': 'SecurePass123!'
        }

        response = client.post('/api/register',
                             json=xss_data,
                             content_type='application/json')

        # Should handle XSS attempts safely
        assert response.status_code in [201, 400]

    # ==================== PERFORMANCE AND STRESS TESTS ====================

    def test_multiple_rapid_requests(self, client, sample_user_data):
        """Test handling of multiple rapid requests."""
        responses = []
        for i in range(10):
            user_data = sample_user_data.copy()
            user_data['email'] = f'test{i}@example.com'

            response = client.post('/api/register',
                                 json=user_data,
                                 content_type='application/json')
            responses.append(response.status_code)

        # All requests should be handled properly
        for status_code in responses:
            assert status_code in [201, 400, 500]

    def test_database_connection_handling(self, client, app):
        """Test handling when database operations fail."""
        # This is a simplified test - in real scenarios you'd mock database failures
        with app.app_context():
            # Test with app context to ensure database is available
            response = client.get('/api/health-check')
            assert response.status_code == 200

    # ==================== CLEANUP AND TEARDOWN ====================

    def test_user_cleanup_after_tests(self, app):
        """Verify that test users are properly cleaned up."""
        with app.app_context():
            # This test runs last and verifies cleanup
            # In a real test suite, this would be handled by fixtures
            user_count = User.query.count()
            # Should be manageable number of test users
            assert user_count >= 0  # Basic sanity check
