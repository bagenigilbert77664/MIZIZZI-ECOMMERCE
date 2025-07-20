import unittest
import os
import sys
from datetime import datetime, timedelta

# Add the parent directory to the path so we can import the app
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.configuration.extensions import db
from backend.models.models import User, UserRole
from backend import create_app

class UserModelTestCase(unittest.TestCase):
    """Test case for User model"""

    def setUp(self):
        """Set up test client and initialize database"""
        self.app = create_app('testing')
        self.app_context = self.app.app_context()
        self.app_context.push()
        db.create_all()

    def tearDown(self):
        """Clean up after tests"""
        db.session.remove()
        db.drop_all()
        self.app_context.pop()

    def test_password_hashing(self):
        """Test password hashing"""
        user = User(name='Password User', email='password@example.com')
        user.set_password('TestPassword123!')

        self.assertTrue(user.password_hash is not None)
        self.assertNotEqual(user.password_hash, 'TestPassword123!')
        self.assertTrue(user.verify_password('TestPassword123!'))
        self.assertFalse(user.verify_password('WrongPassword123!'))

    def test_verification_code(self):
        """Test verification code generation and validation"""
        user = User(name='Code User', email='code@example.com')

        # Set a verification code
        code = '123456'
        user.set_verification_code(code)

        # Verify the code is hashed
        self.assertTrue(user.verification_code_hash is not None)
        self.assertNotEqual(user.verification_code_hash, code)

        # Verify the code is valid
        self.assertTrue(user.verify_verification_code(code))
        self.assertFalse(user.verify_verification_code('654321'))

        # Verify code expiration
        user.verification_code_expires = datetime.utcnow() - timedelta(minutes=1)
        self.assertFalse(user.verify_verification_code(code))

    def test_user_to_dict(self):
        """Test user to_dict method"""
        user = User(
            name='Dict User',
            email='dict@example.com',
            phone='+1234567890',
            role=UserRole.USER,
            is_active=True,
            email_verified=True,
            phone_verified=True,
            created_at=datetime.utcnow()
        )
        db.session.add(user)
        db.session.commit()

        user_dict = user.to_dict()

        self.assertEqual(user_dict['name'], 'Dict User')
        self.assertEqual(user_dict['email'], 'dict@example.com')
        self.assertEqual(user_dict['phone'], '+1234567890')
        self.assertEqual(user_dict['role'], 'user')
        self.assertTrue(user_dict['is_active'])
        self.assertTrue(user_dict['email_verified'])
        self.assertIn('created_at', user_dict)

        # Password hash should not be included
        self.assertNotIn('password_hash', user_dict)
        self.assertNotIn('verification_code_hash', user_dict)

    def test_user_roles(self):
        """Test user roles"""
        # Create users with different roles
        user = User(name='Regular User', email='user@example.com', role=UserRole.USER)
        admin = User(name='Admin User', email='admin@example.com', role=UserRole.ADMIN)
        moderator = User(name='Moderator User', email='mod@example.com', role=UserRole.MODERATOR)

        db.session.add_all([user, admin, moderator])
        db.session.commit()

        # Verify roles
        self.assertEqual(user.role, UserRole.USER)
        self.assertEqual(admin.role, UserRole.ADMIN)
        self.assertEqual(moderator.role, UserRole.MODERATOR)

        # Verify role values
        self.assertEqual(user.role.value, 'user')
        self.assertEqual(admin.role.value, 'admin')
        self.assertEqual(moderator.role.value, 'moderator')

if __name__ == '__main__':
    unittest.main()
