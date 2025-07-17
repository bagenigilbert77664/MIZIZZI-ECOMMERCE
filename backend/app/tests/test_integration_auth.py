import unittest
import json
import os
import sys
from datetime import datetime
import time
from unittest.mock import patch

# Add the parent directory to the path so we can import the app
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.models.models import User, UserRole
from backend import create_app

from configuration.extensions import db
# from models.models import User, UserRole
# from __init__ import create_app

class IntegrationAuthTestCase(unittest.TestCase):
    """Integration test case for authentication flows"""

    def setUp(self):
        """Set up test client and initialize database"""
        self.app = create_app('testing')
        self.app_context = self.app.app_context()
        self.app_context.push()
        self.client = self.app.test_client()
        db.create_all()

    def tearDown(self):
        """Clean up after tests"""
        db.session.remove()
        db.drop_all()
        self.app_context.pop()

    @patch('backend.routes.user.user.send_email')
    def test_full_email_registration_flow(self, mock_send_email):
        """Test the complete email registration and verification flow"""
        mock_send_email.return_value = True

        # Step 1: Register a new user
        register_response = self.client.post(
            '/api/user/register',
            json={
                'name': 'Flow User',
                'email': 'flow@example.com',
                'password': 'FlowPassword123!'
            }
        )

        self.assertEqual(register_response.status_code, 201)
        register_data = json.loads(register_response.data)
        user_id = register_data['user_id']

        # Step 2: Get the verification code from the database
        user = User.query.get(user_id)
        self.assertIsNotNone(user)

        # Manually set a verification code for testing
        verification_code = '123456'
        user.set_verification_code(verification_code, is_phone=False)
        db.session.commit()

        # Step 3: Verify the email using the code
        verify_response = self.client.post(
            '/api/user/verify-code',
            json={
                'user_id': user_id,
                'code': verification_code,
                'is_phone': False
            }
        )

        self.assertEqual(verify_response.status_code, 200)

        # Step 4: Login with the verified account
        login_response = self.client.post(
            '/api/user/login',
            json={
                'identifier': 'flow@example.com',
                'password': 'FlowPassword123!'
            }
        )

        self.assertEqual(login_response.status_code, 200)
        login_data = json.loads(login_response.data)
        self.assertIn('access_token', login_data)

        # Step 5: Access protected resource with token
        headers = {'Authorization': f'Bearer {login_data["access_token"]}'}
        profile_response = self.client.get(
            '/api/user/profile',
            headers=headers
        )

        self.assertEqual(profile_response.status_code, 200)
        profile_data = json.loads(profile_response.data)
        self.assertEqual(profile_data['user']['email'], 'flow@example.com')

    @patch('backend.routes.user.user.send_sms')
    def test_full_phone_registration_flow(self, mock_send_sms):
        """Test the complete phone registration and verification flow"""
        mock_send_sms.return_value = True

        # Step 1: Register a new user with phone
        register_response = self.client.post(
            '/api/user/register',
            json={
                'name': 'Phone Flow User',
                'phone': '+9876543210',
                'password': 'PhonePassword123!'
            }
        )

        self.assertEqual(register_response.status_code, 201)
        register_data = json.loads(register_response.data)
        user_id = register_data['user_id']

        # Step 2: Get the verification code from the database
        user = User.query.get(user_id)
        self.assertIsNotNone(user)

        # Manually set a verification code for testing
        verification_code = '654321'
        user.set_verification_code(verification_code, is_phone=True)
        db.session.commit()

        # Step 3: Verify the phone using the code
        verify_response = self.client.post(
            '/api/user/verify-code',
            json={
                'user_id': user_id,
                'code': verification_code,
                'is_phone': True
            }
        )

        self.assertEqual(verify_response.status_code, 200)

        # Step 4: Login with the verified account
        login_response = self.client.post(
            '/api/user/login',
            json={
                'identifier': '+9876543210',
                'password': 'PhonePassword123!'
            }
        )

        self.assertEqual(login_response.status_code, 200)
        login_data = json.loads(login_response.data)
        self.assertIn('access_token', login_data)

    @patch('backend.routes.user.user.send_email')
    def test_password_reset_flow(self, mock_send_email):
        """Test the complete password reset flow"""
        mock_send_email.return_value = True

        # Create a user
        user = User(
            name='Reset User',
            email='reset@example.com',
            is_active=True,
            email_verified=True,
            created_at=datetime.utcnow()
        )
        user.set_password('OldPassword123!')
        db.session.add(user)
        db.session.commit()

        # Step 1: Request password reset
        forgot_response = self.client.post(
            '/api/user/forgot-password',
            json={
                'email': 'reset@example.com'
            }
        )

        self.assertEqual(forgot_response.status_code, 200)
        mock_send_email.assert_called_once()

        # Step 2: Generate a reset token (normally this would be sent via email)
        from flask_jwt_extended import create_access_token
        reset_token = create_access_token(identity='reset@example.com')

        # Step 3: Reset the password
        reset_response = self.client.post(
            '/api/user/reset-password',
            json={
                'token': reset_token,
                'password': 'NewResetPassword123!'
            }
        )

        self.assertEqual(reset_response.status_code, 200)

        # Step 4: Login with the new password
        login_response = self.client.post(
            '/api/user/login',
            json={
                'identifier': 'reset@example.com',
                'password': 'NewResetPassword123!'
            }
        )

        self.assertEqual(login_response.status_code, 200)

    def test_token_refresh_flow(self):
        """Test the token refresh flow"""
        # Create a user
        user = User(
            name='Refresh User',
            email='refresh@example.com',
            is_active=True,
            email_verified=True,
            created_at=datetime.utcnow()
        )
        user.set_password('RefreshPassword123!')
        db.session.add(user)
        db.session.commit()

        # Step 1: Login to get tokens
        login_response = self.client.post(
            '/api/user/login',
            json={
                'identifier': 'refresh@example.com',
                'password': 'RefreshPassword123!'
            }
        )

        self.assertEqual(login_response.status_code, 200)
        login_data = json.loads(login_response.data)
        self.assertIn('access_token', login_data)
        self.assertIn('refresh_token', login_data)

        # Step 2: Wait a moment to ensure tokens are different
        time.sleep(1)

        # Step 3: Use refresh token to get a new access token
        refresh_response = self.client.post(
            '/api/user/refresh',
            headers={'Authorization': f'Bearer {login_data["refresh_token"]}'}
        )

        self.assertEqual(refresh_response.status_code, 200)
        refresh_data = json.loads(refresh_response.data)
        self.assertIn('access_token', refresh_data)

        # Step 4: Verify the new access token works
        profile_response = self.client.get(
            '/api/user/profile',
            headers={'Authorization': f'Bearer {refresh_data["access_token"]}'}
        )

        self.assertEqual(profile_response.status_code, 200)

    @patch('backend.routes.user.user.id_token.verify_oauth2_token')
    def test_google_auth_flow(self, mock_verify_token):
        """Test the Google authentication flow"""
        # Mock the Google token verification
        mock_verify_token.return_value = {
            'sub': 'google-user-id',
            'email': 'google-flow@example.com',
            'name': 'Google Flow User',
            'email_verified': True
        }

        # Step 1: Login with Google
        google_response = self.client.post(
            '/api/user/google-login',
            json={
                'token': 'fake-google-token'
            }
        )

        self.assertEqual(google_response.status_code, 200)
        google_data = json.loads(google_response.data)
        self.assertIn('access_token', google_data)

        # Step 2: Access protected resource with token
        profile_response = self.client.get(
            '/api/user/profile',
            headers={'Authorization': f'Bearer {google_data["access_token"]}'}
        )

        self.assertEqual(profile_response.status_code, 200)
        profile_data = json.loads(profile_response.data)
        self.assertEqual(profile_data['user']['email'], 'google-flow@example.com')

        # Step 3: Verify user was created with Google flag
        user = User.query.filter_by(email='google-flow@example.com').first()
        self.assertIsNotNone(user)
        self.assertTrue(user.is_google_user)
        self.assertTrue(user.email_verified)

if __name__ == '__main__':
    unittest.main()
