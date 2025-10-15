import unittest
import json
import os
import sys
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock

# Add the parent directory to the path so we can import the app
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.models.models import User, UserRole
from backend import create_app

class AuthTestCase(unittest.TestCase):
    """Test case for authentication endpoints"""

    def setUp(self):
        """Set up test client and initialize database"""
        self.app = create_app('testing')
        self.app_context = self.app.app_context()
        self.app_context.push()
        self.client = self.app.test_client()
        db.create_all()

        # Create a test user
        test_user = User(
            name='Test User',
            email='test@example.com',
            phone='+1234567890',
            is_active=True,
            email_verified=True,
            phone_verified=True,
            created_at=datetime.utcnow()
        )
        test_user.set_password('Password123!')
        db.session.add(test_user)
        db.session.commit()

    def tearDown(self):
        """Clean up after tests"""
        db.session.remove()
        db.drop_all()
        self.app_context.pop()

    # Helper methods
    def get_auth_headers(self, email='test@example.com', password='Password123!'):
        """Get authentication headers for a user"""
        response = self.client.post(
            '/api/user/login',
            json={'identifier': email, 'password': password}
        )
        data = json.loads(response.data)
        return {
            'Authorization': f'Bearer {data["access_token"]}'
        }

    # Registration Tests
    @patch('backend.routes.user.user.send_email')
    def test_register_with_email(self, mock_send_email):
        """Test user registration with email"""
        mock_send_email.return_value = True

        response = self.client.post(
            '/api/user/register',
            json={
                'name': 'New User',
                'email': 'new@example.com',
                'password': 'NewPassword123!'
            }
        )

        self.assertEqual(response.status_code, 201)
        data = json.loads(response.data)
        self.assertIn('user_id', data)
        self.assertIn('Please check your email for verification', data['msg'])

        # Verify user was created in database
        user = User.query.filter_by(email='new@example.com').first()
        self.assertIsNotNone(user)
        self.assertEqual(user.name, 'New User')
        self.assertFalse(user.email_verified)

        # Verify email was "sent"
        mock_send_email.assert_called_once()

    @patch('backend.routes.user.user.send_sms')
    def test_register_with_phone(self, mock_send_sms):
        """Test user registration with phone number"""
        mock_send_sms.return_value = True

        response = self.client.post(
            '/api/user/register',
            json={
                'name': 'Phone User',
                'phone': '+9876543210',
                'password': 'PhonePassword123!'
            }
        )

        self.assertEqual(response.status_code, 201)
        data = json.loads(response.data)
        self.assertIn('user_id', data)
        self.assertIn('Please check your phone for verification code', data['msg'])

        # Verify user was created in database
        user = User.query.filter_by(phone='+9876543210').first()
        self.assertIsNotNone(user)
        self.assertEqual(user.name, 'Phone User')
        self.assertFalse(user.phone_verified)

        # Verify SMS was "sent"
        mock_send_sms.assert_called_once()

    def test_register_with_invalid_data(self):
        """Test registration with invalid data"""
        # Test missing required fields
        response = self.client.post(
            '/api/user/register',
            json={
                'name': 'Invalid User'
            }
        )
        self.assertEqual(response.status_code, 400)

        # Test invalid email format
        response = self.client.post(
            '/api/user/register',
            json={
                'name': 'Invalid User',
                'email': 'not-an-email',
                'password': 'Password123!'
            }
        )
        self.assertEqual(response.status_code, 400)

        # Test invalid phone format
        response = self.client.post(
            '/api/user/register',
            json={
                'name': 'Invalid User',
                'phone': '123', # Too short
                'password': 'Password123!'
            }
        )
        self.assertEqual(response.status_code, 400)

        # Test weak password
        response = self.client.post(
            '/api/user/register',
            json={
                'name': 'Invalid User',
                'email': 'valid@example.com',
                'password': 'weak'
            }
        )
        self.assertEqual(response.status_code, 400)

    def test_register_existing_user(self):
        """Test registration with existing email/phone"""
        # Test existing email
        response = self.client.post(
            '/api/user/register',
            json={
                'name': 'Duplicate User',
                'email': 'test@example.com', # Already exists
                'password': 'Password123!'
            }
        )
        self.assertEqual(response.status_code, 409)

        # Test existing phone
        response = self.client.post(
            '/api/user/register',
            json={
                'name': 'Duplicate User',
                'phone': '+1234567890', # Already exists
                'password': 'Password123!'
            }
        )
        self.assertEqual(response.status_code, 409)

    # Verification Tests
    @patch('backend.routes.user.user.jwt.decode')
    def test_verify_email(self, mock_jwt_decode):
        """Test email verification via token"""
        # Mock JWT decode to return a valid payload
        mock_jwt_decode.return_value = {'sub': 'unverified@example.com'}

        # Create an unverified user
        user = User(
            name='Unverified User',
            email='unverified@example.com',
            is_active=True,
            email_verified=False,
            created_at=datetime.utcnow()
        )
        user.set_password('Password123!')
        db.session.add(user)
        db.session.commit()

        # Test verification
        response = self.client.get('/api/user/verify-email?token=fake_token')

        # Should return HTML response
        self.assertEqual(response.status_code, 200)

        # Check if user is now verified
        user = User.query.filter_by(email='unverified@example.com').first()
        self.assertTrue(user.email_verified)

    def test_verify_code(self):
        """Test verification code validation"""
        # Create an unverified user with a verification code
        user = User(
            name='Code User',
            email='code@example.com',
            is_active=True,
            email_verified=False,
            created_at=datetime.utcnow()
        )
        user.set_password('Password123!')

        # Set a verification code that expires in 10 minutes
        verification_code = '123456'
        user.verification_code_hash = User.hash_verification_code(verification_code)
        user.verification_code_expires = datetime.utcnow() + timedelta(minutes=10)

        db.session.add(user)
        db.session.commit()

        # Test with correct code
        response = self.client.post(
            '/api/user/verify-code',
            json={
                'user_id': user.id,
                'code': verification_code,
                'is_phone': False
            }
        )

        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertTrue(data['verified'])

        # Check if user is now verified
        user = User.query.filter_by(email='code@example.com').first()
        self.assertTrue(user.email_verified)

        # Test with incorrect code
        response = self.client.post(
            '/api/user/verify-code',
            json={
                'user_id': user.id,
                'code': 'wrong-code',
                'is_phone': False
            }
        )

        self.assertEqual(response.status_code, 400)

    @patch('backend.routes.user.user.send_email')
    def test_resend_verification_email(self, mock_send_email):
        """Test resending verification email"""
        mock_send_email.return_value = True

        # Create an unverified user
        user = User(
            name='Resend User',
            email='resend@example.com',
            is_active=True,
            email_verified=False,
            created_at=datetime.utcnow()
        )
        user.set_password('Password123!')
        db.session.add(user)
        db.session.commit()

        # Test resending verification
        response = self.client.post(
            '/api/user/resend-verification',
            json={
                'identifier': 'resend@example.com'
            }
        )

        self.assertEqual(response.status_code, 200)
        mock_send_email.assert_called_once()

    @patch('backend.routes.user.user.send_sms')
    def test_resend_verification_sms(self, mock_send_sms):
        """Test resending verification SMS"""
        mock_send_sms.return_value = True

        # Create an unverified user
        user = User(
            name='SMS User',
            phone='+5555555555',
            is_active=True,
            phone_verified=False,
            created_at=datetime.utcnow()
        )
        user.set_password('Password123!')
        db.session.add(user)
        db.session.commit()

        # Test resending verification
        response = self.client.post(
            '/api/user/resend-verification',
            json={
                'identifier': '+5555555555'
            }
        )

        self.assertEqual(response.status_code, 200)
        mock_send_sms.assert_called_once()

    # Login Tests
    def test_login_with_email(self):
        """Test login with email"""
        response = self.client.post(
            '/api/user/login',
            json={
                'identifier': 'test@example.com',
                'password': 'Password123!'
            }
        )

        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('access_token', data)
        self.assertIn('refresh_token', data)
        self.assertIn('user', data)

    def test_login_with_phone(self):
        """Test login with phone number"""
        response = self.client.post(
            '/api/user/login',
            json={
                'identifier': '+1234567890',
                'password': 'Password123!'
            }
        )

        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('access_token', data)
        self.assertIn('refresh_token', data)
        self.assertIn('user', data)

    def test_login_with_invalid_credentials(self):
        """Test login with invalid credentials"""
        # Test wrong password
        response = self.client.post(
            '/api/user/login',
            json={
                'identifier': 'test@example.com',
                'password': 'WrongPassword123!'
            }
        )
        self.assertEqual(response.status_code, 401)

        # Test non-existent user
        response = self.client.post(
            '/api/user/login',
            json={
                'identifier': 'nonexistent@example.com',
                'password': 'Password123!'
            }
        )
        self.assertEqual(response.status_code, 401)

    def test_login_with_unverified_account(self):
        """Test login with unverified account"""
        # Create an unverified user
        user = User(
            name='Unverified User',
            email='unverified@example.com',
            is_active=True,
            email_verified=False,
            created_at=datetime.utcnow()
        )
        user.set_password('Password123!')
        db.session.add(user)
        db.session.commit()

        # Test login
        response = self.client.post(
            '/api/user/login',
            json={
                'identifier': 'unverified@example.com',
                'password': 'Password123!'
            }
        )

        self.assertEqual(response.status_code, 403)
        data = json.loads(response.data)
        self.assertIn('verification_required', data)
        self.assertTrue(data['verification_required'])

    # Google Authentication Tests
    @patch('backend.routes.user.user.id_token.verify_oauth2_token')
    def test_google_login(self, mock_verify_token):
        """Test Google login"""
        # Mock the Google token verification
        mock_verify_token.return_value = {
            'sub': 'google-user-id',
            'email': 'google@example.com',
            'name': 'Google User',
            'email_verified': True
        }

        response = self.client.post(
            '/api/user/google-login',
            json={
                'token': 'fake-google-token'
            }
        )

        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('access_token', data)
        self.assertIn('refresh_token', data)
        self.assertIn('user', data)

        # Verify user was created in database
        user = User.query.filter_by(email='google@example.com').first()
        self.assertIsNotNone(user)
        self.assertEqual(user.name, 'Google User')
        self.assertTrue(user.email_verified)
        self.assertTrue(user.is_google_user)

    @patch('backend.routes.user.user.id_token.verify_oauth2_token')
    def test_google_login_existing_user(self, mock_verify_token):
        """Test Google login with existing user"""
        # Create a user that will match the Google email
        user = User(
            name='Existing Google User',
            email='existing-google@example.com',
            is_active=True,
            email_verified=True,
            created_at=datetime.utcnow()
        )
        user.set_password('Password123!')
        db.session.add(user)
        db.session.commit()

        # Mock the Google token verification
        mock_verify_token.return_value = {
            'sub': 'google-user-id',
            'email': 'existing-google@example.com',
            'name': 'Google User',
            'email_verified': True
        }

        response = self.client.post(
            '/api/user/google-login',
            json={
                'token': 'fake-google-token'
            }
        )

        self.assertEqual(response.status_code, 200)

        # Verify user was updated
        user = User.query.filter_by(email='existing-google@example.com').first()
        self.assertTrue(user.is_google_user)

    # Password Reset Tests
    @patch('backend.routes.user.user.send_email')
    def test_forgot_password(self, mock_send_email):
        """Test forgot password functionality"""
        mock_send_email.return_value = True

        response = self.client.post(
            '/api/user/forgot-password',
            json={
                'email': 'test@example.com'
            }
        )

        self.assertEqual(response.status_code, 200)
        mock_send_email.assert_called_once()

    @patch('backend.routes.user.user.jwt.decode')
    def test_reset_password(self, mock_jwt_decode):
        """Test password reset"""
        # Mock JWT decode to return a valid payload
        mock_jwt_decode.return_value = {'sub': 'test@example.com'}

        response = self.client.post(
            '/api/user/reset-password',
            json={
                'token': 'fake-reset-token',
                'password': 'NewPassword123!'
            }
        )

        self.assertEqual(response.status_code, 200)

        # Verify password was changed
        user = User.query.filter_by(email='test@example.com').first()
        self.assertTrue(user.verify_password('NewPassword123!'))

    # Token Refresh Test
    def test_token_refresh(self):
        """Test token refresh"""
        # First login to get tokens
        login_response = self.client.post(
            '/api/user/login',
            json={
                'identifier': 'test@example.com',
                'password': 'Password123!'
            }
        )

        login_data = json.loads(login_response.data)
        refresh_token = login_data['refresh_token']

        # Use refresh token to get new access token
        response = self.client.post(
            '/api/user/refresh',
            headers={'Authorization': f'Bearer {refresh_token}'}
        )

        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('access_token', data)

    # Profile Tests
    def test_get_profile(self):
        """Test getting user profile"""
        headers = self.get_auth_headers()

        response = self.client.get(
            '/api/user/profile',
            headers=headers
        )

        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('user', data)
        self.assertEqual(data['user']['email'], 'test@example.com')

    @patch('backend.routes.user.user.send_email')
    def test_update_profile(self, mock_send_email):
        """Test updating user profile"""
        mock_send_email.return_value = True
        headers = self.get_auth_headers()

        response = self.client.put(
            '/api/user/profile',
            headers=headers,
            json={
                'name': 'Updated Name',
                'email': 'updated@example.com'
            }
        )

        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('user', data)
        self.assertEqual(data['user']['name'], 'Updated Name')
        self.assertEqual(data['user']['email'], 'updated@example.com')

        # Verify email verification was triggered
        self.assertTrue(data['verification_required']['email'])
        mock_send_email.assert_called_once()

    def test_change_password(self):
        """Test changing password"""
        headers = self.get_auth_headers()

        response = self.client.post(
            '/api/user/change-password',
            headers=headers,
            json={
                'current_password': 'Password123!',
                'new_password': 'NewPassword456!'
            }
        )

        self.assertEqual(response.status_code, 200)

        # Verify password was changed by logging in with new password
        login_response = self.client.post(
            '/api/user/login',
            json={
                'identifier': 'test@example.com',
                'password': 'NewPassword456!'
            }
        )

        self.assertEqual(login_response.status_code, 200)

    def test_delete_account(self):
        """Test account deletion"""
        headers = self.get_auth_headers()

        response = self.client.post(
            '/api/user/delete-account',
            headers=headers,
            json={
                'password': 'Password123!'
            }
        )

        self.assertEqual(response.status_code, 200)

        # Verify user is now inactive
        user = User.query.filter_by(email='test@example.com').first()
        self.assertFalse(user.is_active)
        self.assertTrue(user.is_deleted)

    # Logout Test
    def test_logout(self):
        """Test logout functionality"""
        headers = self.get_auth_headers()

        response = self.client.post(
            '/api/user/logout',
            headers=headers
        )

        self.assertEqual(response.status_code, 200)
        # Note: In a stateless JWT system, the client discards the tokens
        # This test just verifies the endpoint returns success

    # Admin Tests
    def test_admin_get_users(self):
        """Test admin getting all users"""
        # Create an admin user
        admin = User(
            name='Admin User',
            email='admin@example.com',
            is_active=True,
            email_verified=True,
            role=UserRole.ADMIN,
            created_at=datetime.utcnow()
        )
        admin.set_password('AdminPass123!')
        db.session.add(admin)
        db.session.commit()

        # Get admin auth headers
        headers = self.get_auth_headers('admin@example.com', 'AdminPass123!')

        response = self.client.get(
            '/api/user/admin/users',
            headers=headers
        )

        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('users', data)
        self.assertGreaterEqual(len(data['users']), 2)  # At least admin and test user

    def test_non_admin_access_denied(self):
        """Test non-admin access to admin routes is denied"""
        headers = self.get_auth_headers()  # Regular user

        response = self.client.get(
            '/api/user/admin/users',
            headers=headers
        )

        self.assertEqual(response.status_code, 403)

if __name__ == '__main__':
    unittest.main()
