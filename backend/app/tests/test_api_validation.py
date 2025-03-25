"""
Tests for the API validation of Mizizzi E-commerce platform.
"""
import unittest
import json
from app import create_app, db
from app.models import User, UserRole, Address, AddressType, Product, Category, Brand
from werkzeug.security import generate_password_hash

class APIValidationTestCase(unittest.TestCase):
    """Test case for API validation."""

    def setUp(self):
        """Set up test environment."""
        self.app = create_app('testing')
        self.app_context = self.app.app_context()
        self.app_context.push()
        db.create_all()
        self.client = self.app.test_client()

        # Create test user
        user = User(
            name='Test User',
            email='test@example.com',
            password_hash=generate_password_hash('P@ssw0rd'),
            role=UserRole.USER,
            phone='+254712345678',
            is_active=True
        )
        db.session.add(user)

        # Create admin user
        admin = User(
            name='Admin User',
            email='admin@example.com',
            password_hash=generate_password_hash('P@ssw0rd'),
            role=UserRole.ADMIN,
            phone='+254712345678',
            is_active=True
        )
        db.session.add(admin)

        # Create test category
        category = Category(
            name='Test Category',
            slug='test-category',
            description='Test category description'
        )
        db.session.add(category)

        # Create test brand
        brand = Brand(
            name='Test Brand',
            slug='test-brand',
            description='Test brand description'
        )
        db.session.add(brand)

        db.session.commit()

        # Get user IDs
        self.user_id = user.id
        self.admin_id = admin.id
        self.category_id = category.id
        self.brand_id = brand.id

        # Get auth tokens
        response = self.client.post('/api/auth/login', json={
            'email': 'test@example.com',
            'password': 'P@ssw0rd'
        })
        data = json.loads(response.data)
        self.user_token = data['access_token']

        response = self.client.post('/api/auth/login', json={
            'email': 'admin@example.com',
            'password': 'P@ssw0rd'
        })
        data = json.loads(response.data)
        self.admin_token = data['access_token']

    def tearDown(self):
        """Tear down test environment."""
        db.session.remove()
        db.drop_all()
        self.app_context.pop()

    def test_user_registration_validation(self):
        """Test user registration validation."""
        # Valid data
        response = self.client.post('/api/auth/register', json={
            'name': 'New User',
            'email': 'new@example.com',
            'password': 'P@ssw0rd',
            'phone': '+254712345678'
        })
        self.assertEqual(response.status_code, 201)

        # Invalid data
        response = self.client.post('/api/auth/register', json={
            'name': 'N',  # Too short
            'email': 'invalid-email',
            'password': 'password',  # Weak password
            'phone': '712345678'  # Invalid format
        })
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        self.assertIn('errors', data)
        self.assertIn('name', data['errors'])
        self.assertIn('email', data['errors'])
        self.assertIn('password', data['errors'])
        self.assertIn('phone', data['errors'])

    def test_user_login_validation(self):
        """Test user login validation."""
        # Valid data
        response = self.client.post('/api/auth/login', json={
            'email': 'test@example.com',
            'password': 'P@ssw0rd'
        })
        self.assertEqual(response.status_code, 200)

        # Invalid data
        response = self.client.post('/api/auth/login', json={
            'email': '',
            'password': ''
        })
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        self.assertIn('errors', data)
        self.assertIn('email', data['errors'])
        self.assertIn('password', data['errors'])

    def test_address_validation(self):
        """Test address validation."""
        # Valid data
        response = self.client.post('/api/addresses',
            headers={'Authorization': f'Bearer {self.user_token}'},
            json={
                'first_name': 'John',
                'last_name': 'Doe',
                'address_line1': '123 Main St',
                'city': 'Nairobi',
                'state': 'Nairobi',
                'postal_code': '00100',
                'country': 'Kenya',
                'phone': '+254712345678',
                'address_type': 'shipping'
            }
        )
        self.assertEqual(response.status_code, 201)

        # Invalid data
        response = self.client.post('/api/addresses',
            headers={'Authorization': f'Bearer {self.user_token}'},
            json={
                'first_name': '',
                'last_name': '',
                'address_line1': '',
                'city': '',
                'state': '',
                'postal_code': '',
                'country': '',
                'phone': '',
                'address_type': ''
            }
        )
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        self.assertIn('errors', data)
        self.assertIn('first_name', data['errors'])
        self.assertIn('last_name', data['errors'])
        self.assertIn('address_line1', data['errors'])
        self.assertIn('city', data['errors'])
        self.assertIn('state', data['errors'])
        self.assertIn('postal_code', data['errors'])
        self.assertIn('country', data['errors'])
        self.assertIn('phone', data['errors'])
        self.assertIn('address_type', data['errors'])

    def test_product_validation(self):
        """Test product validation."""
        # Valid data
        response = self.client.post('/api/products',
            headers={'Authorization': f'Bearer {self.admin_token}'},
            json={
                'name': 'Test Product',
                'slug': 'test-product-unique',  # Make sure this is unique
                'description': 'Test product description',
                'price': 100.0,
                'stock': 10,
                'category_id': self.category_id,
                'brand_id': self.brand_id
            }
        )
        self.assertEqual(response.status_code, 201)

        # Invalid data
        response = self.client.post('/api/products',
            headers={'Authorization': f'Bearer {self.admin_token}'},
            json={
                'name': 'T',  # Too short
                'slug': 'test product',  # Invalid format
                'description': 'Test product description',
                'price': -100.0,  # Negative price
                'stock': -10,  # Negative stock
                'category_id': 9999,  # Invalid category
                'brand_id': 9999  # Invalid brand
            }
        )
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        self.assertIn('errors', data)
        self.assertIn('name', data['errors'])
        self.assertIn('slug', data['errors'])
        self.assertIn('price', data['errors'])
        self.assertIn('stock', data['errors'])
        self.assertIn('category_id', data['errors'])
        self.assertIn('brand_id', data['errors'])

if __name__ == '__main__':
    unittest.main()

