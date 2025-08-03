"""
Pytest configuration and fixtures for Pesapal payment tests
"""

import pytest
import json
import uuid
import time
import random
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from unittest.mock import Mock, patch, MagicMock

# Flask and testing imports
from flask import Flask
from flask_testing import TestCase
from flask import jsonify

# Database and models
try:
    from app import create_app
    from app.configuration.extensions import db
    from app.models.models import User, Order, PesapalTransaction
except ImportError:
    try:
        from app import create_app
        from app.configuration.extensions import db
        from app.models.models import User, Order, PesapalTransaction
    except ImportError:
        from app.configuration.extensions import db
        from app.models.models import User, Order, PesapalTransaction

# JWT for authentication
from flask_jwt_extended import create_access_token

# Add this import at the top
from app.models.models import UserRole

def generate_unique_merchant_reference(order_id, user_id=None):
    """Generate a unique merchant reference for tests"""
    timestamp = int(time.time() * 1000000)  # Use microseconds
    random_suffix = random.randint(10000, 99999)
    unique_id = str(uuid.uuid4())[:8]
    user_suffix = f"_{user_id}" if user_id else ""
    return f"MIZIZZI_{order_id}_{timestamp}_{random_suffix}_{unique_id}{user_suffix}"

@pytest.fixture(scope='session')
def app():
    """Create application for testing"""
    try:
        app = create_app('testing')
    except:
        # Fallback app creation
        app = Flask(__name__)
        app.config['TESTING'] = True
        app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
        app.config['JWT_SECRET_KEY'] = 'test-secret-key'
        app.config['WTF_CSRF_ENABLED'] = False

        # Initialize extensions
        db.init_app(app)

        from flask_jwt_extended import JWTManager
        jwt = JWTManager(app)

        # Register Pesapal routes
        try:
            from app.routes.payments.pesapal_routes import pesapal_routes
            app.register_blueprint(pesapal_routes, url_prefix='/api/pesapal')
        except ImportError:
            pass  # Routes might not be available in test environment

    return app

@pytest.fixture(scope='function')
def client(app):
    """Create test client"""
    return app.test_client()

@pytest.fixture(scope='function')
def app_context(app):
    """Create application context"""
    with app.app_context():
        yield app

@pytest.fixture(scope='function')
def db_session(app_context):
    """Create database session for testing"""
    db.create_all()
    yield db.session
    db.session.remove()
    db.drop_all()

@pytest.fixture
def test_user(db_session):
    """Create a test user"""
    user = User(
        id=1,
        email='testuser@example.com',
        name='testuser',  # Changed from username to name
        password_hash='hashed_password',
        is_active=True,
        created_at=datetime.now(timezone.utc)
    )
    db_session.add(user)
    db_session.commit()
    return user

@pytest.fixture
def admin_user(db_session):
    """Create an admin user"""
    from app.models.models import UserRole
    admin = User(
        id=2,
        email='admin@example.com',
        name='admin',  # Changed from username to name
        password_hash='hashed_password',
        is_active=True,
        role=UserRole.ADMIN,  # Use role enum instead of is_admin
        created_at=datetime.now(timezone.utc)
    )
    db_session.add(admin)
    db_session.commit()
    return admin

@pytest.fixture
def test_order(db_session, test_user):
    """Create a test order"""
    order = Order(
        id='TEST_ORDER_123',
        user_id=test_user.id,
        order_number='TEST_ORDER_123',
        status='pending',  # Use string instead of enum
        total_amount=Decimal('1000.00'),
        subtotal=Decimal('1000.00'),
        tax_amount=Decimal('0.00'),
        shipping_address={'address': 'Test Address'},
        billing_address={'address': 'Test Address'},
        payment_status='pending',  # Use string instead of enum
        created_at=datetime.now(timezone.utc)
    )
    db_session.add(order)
    db_session.commit()
    return order

@pytest.fixture
def cancelled_order(db_session, test_user):
    """Create a cancelled test order"""
    order = Order(
        id='CANCELLED_ORDER_123',
        user_id=test_user.id,
        order_number='CANCELLED_ORDER_123',
        status='cancelled',  # Use string instead of enum
        total_amount=Decimal('500.00'),
        subtotal=Decimal('500.00'),
        tax_amount=Decimal('0.00'),
        shipping_address={'address': 'Test Address'},
        billing_address={'address': 'Test Address'},
        payment_status='failed',   # Use 'failed' instead of 'cancelled'
        created_at=datetime.now(timezone.utc)
    )
    db_session.add(order)
    db_session.commit()
    return order

@pytest.fixture
def test_transaction(db_session, test_user, test_order):
    """Create a test Pesapal transaction"""
    transaction = PesapalTransaction(
        id='test-transaction-1',
        user_id=test_user.id,
        order_id=test_order.id,
        merchant_reference=generate_unique_merchant_reference(test_order.id, test_user.id),
        amount=Decimal('1000.00'),
        currency='KES',
        email='testuser@example.com',  # Changed from customer_email
        phone_number='254712345678',  # Changed from customer_phone
        description=f'Payment for Order {test_order.id}',
        status='pending',
        created_at=datetime.now(timezone.utc)
    )
    db_session.add(transaction)
    db_session.commit()
    return transaction

@pytest.fixture
def completed_transaction(db_session, test_user, test_order):
    """Create a completed Pesapal transaction"""
    transaction = PesapalTransaction(
        id='test-transaction-2',
        user_id=test_user.id,
        order_id=test_order.id,
        merchant_reference=generate_unique_merchant_reference(f"{test_order.id}_COMPLETED", test_user.id),
        pesapal_tracking_id='TRK123456789',  # Use correct field name
        amount=Decimal('1000.00'),
        currency='KES',
        email='testuser@example.com',
        phone_number='254712345678',
        description=f'Payment for Order {test_order.id}',
        status='completed',
        payment_method='CARD',
        pesapal_receipt_number='CONF123456',  # Use correct field name
        transaction_date=datetime.now(timezone.utc),
        created_at=datetime.now(timezone.utc)
    )
    db_session.add(transaction)
    db_session.commit()
    return transaction

@pytest.fixture
def failed_transaction(db_session, test_user, test_order):
    """Create a failed Pesapal transaction"""
    transaction = PesapalTransaction(
        id='test-transaction-3',
        user_id=test_user.id,
        order_id=test_order.id,
        merchant_reference=generate_unique_merchant_reference(f"{test_order.id}_FAILED", test_user.id),
        pesapal_tracking_id='TRK_FAILED',
        amount=Decimal('1000.00'),
        currency='KES',
        email='testuser@example.com',
        phone_number='254712345678',
        description=f'Payment for Order {test_order.id}',
        status='failed',
        error_message='Payment failed',
        created_at=datetime.now(timezone.utc)
    )
    db_session.add(transaction)
    db_session.commit()
    return transaction

@pytest.fixture
def expired_transaction(db_session, test_user, test_order):
    """Create an expired Pesapal transaction"""
    transaction = PesapalTransaction(
        id='test-transaction-4',
        user_id=test_user.id,
        order_id=test_order.id,
        merchant_reference=generate_unique_merchant_reference(f"{test_order.id}_EXPIRED", test_user.id),
        pesapal_tracking_id='TRK_EXPIRED',
        amount=Decimal('1000.00'),
        currency='KES',
        email='testuser@example.com',
        phone_number='254712345678',
        description=f'Payment for Order {test_order.id}',
        status='pending',
        created_at=datetime.now(timezone.utc) - timedelta(hours=25)  # Expired
    )
    db_session.add(transaction)
    db_session.commit()
    return transaction

@pytest.fixture
def user_token(app_context, test_user):
    """Create JWT token for test user"""
    with app_context.app_context():
        return create_access_token(identity=test_user.id)

@pytest.fixture
def admin_token(app_context, admin_user):
    """Create JWT token for admin user"""
    with app_context.app_context():
        return create_access_token(identity=admin_user.id)

@pytest.fixture
def invalid_token():
    """Create an invalid JWT token"""
    return 'invalid.jwt.token'

@pytest.fixture
def auth_headers(user_token):
    """Create authorization headers for regular user"""
    return {'Authorization': f'Bearer {user_token}'}

@pytest.fixture
def admin_headers(admin_token):
    """Create authorization headers for admin user"""
    return {'Authorization': f'Bearer {admin_token}'}

@pytest.fixture
def invalid_auth_headers(invalid_token):
    """Create invalid authorization headers"""
    return {'Authorization': f'Bearer {invalid_token}'}

@pytest.fixture
def valid_payment_data(test_order):
    """Valid payment initiation data"""
    return {
        'order_id': test_order.id,
        'amount': 1000.00,
        'currency': 'KES',
        'customer_email': 'testuser@example.com',
        'customer_phone': '254712345678',
        'description': f'Payment for Order {test_order.id}',
        'callback_url': 'https://example.com/payment-success'
    }

@pytest.fixture
def invalid_payment_data():
    """Invalid payment initiation data"""
    return {
        'order_id': '',
        'amount': -100,
        'customer_email': 'invalid-email',
        'customer_phone': '123'
    }

@pytest.fixture
def mock_pesapal_success_response():
    """Mock successful Pesapal API response"""
    return {
        'status': 'success',
        'order_tracking_id': f'TRK{int(time.time() * 1000)}',
        'redirect_url': 'https://pesapal.com/payment/redirect/123',
        'message': 'Payment request created successfully'
    }

@pytest.fixture
def mock_pesapal_failure_response():
    """Mock failed Pesapal API response"""
    return {
        'status': 'error',
        'message': 'Payment request failed',
        'error_code': 'INVALID_REQUEST'
    }

@pytest.fixture
def mock_pesapal_status_completed():
    """Mock completed payment status response"""
    return {
        'status': 'success',
        'payment_status': 'COMPLETED',
        'payment_method': 'CARD',
        'payment_account': '**** 1234',
        'confirmation_code': 'CONF123456',
        'amount': 1000.00,
        'currency': 'KES'
    }

@pytest.fixture
def mock_pesapal_status_failed():
    """Mock failed payment status response"""
    return {
        'status': 'success',
        'payment_status': 'FAILED',
        'error_message': 'Payment was declined'
    }

@pytest.fixture
def mock_pesapal_status_pending():
    """Mock pending payment status response"""
    return {
        'status': 'success',
        'payment_status': 'PENDING'
    }

@pytest.fixture
def valid_callback_data():
    """Valid Pesapal callback data"""
    return {
        'OrderTrackingId': f'TRK{int(time.time() * 1000)}',
        'OrderMerchantReference': generate_unique_merchant_reference('ORD123456'),
        'OrderNotificationType': 'IPNCHANGE',
        'OrderCreatedDate': datetime.now().isoformat()
    }

@pytest.fixture
def invalid_callback_data():
    """Invalid Pesapal callback data"""
    return {
        'invalid_field': 'invalid_value'
    }

# Mock patches
@pytest.fixture
def mock_create_payment_request():
    """Mock create_payment_request function"""
    with patch('app.routes.payments.pesapal_routes.create_card_payment_request') as mock:
        yield mock

@pytest.fixture
def mock_get_transaction_status():
    """Mock get_transaction_status function"""
    with patch('app.routes.payments.pesapal_routes.get_transaction_status') as mock:
        yield mock

@pytest.fixture
def mock_validate_pesapal_ipn():
    """Mock validate_pesapal_ipn function"""
    with patch('app.routes.payments.pesapal_routes.validate_pesapal_ipn') as mock:
        yield mock

@pytest.fixture
def mock_get_payment_status_message():
    """Mock get_payment_status_message function"""
    with patch('app.routes.payments.pesapal_routes.get_payment_status_message') as mock:
        mock.return_value = "Payment completed successfully"
        yield mock

@pytest.fixture
def mock_validate_email():
    """Mock validate_email function"""
    with patch('app.routes.payments.pesapal_routes.validate_email') as mock:
        mock.return_value = True
        yield mock

@pytest.fixture
def mock_validate_payment_amount():
    """Mock validate_payment_amount function"""
    with patch('app.routes.payments.pesapal_routes.validate_payment_amount') as mock:
        mock.return_value = {"valid": True, "amount": Decimal('1000.00')}
        yield mock

@pytest.fixture
def mock_sanitize_input():
    """Mock sanitize_input function"""
    with patch('app.routes.payments.pesapal_routes.sanitize_input') as mock:
        mock.side_effect = lambda x: str(x).strip()
        yield mock

# Database error simulation
@pytest.fixture
def mock_db_error():
    """Mock database error"""
    with patch('app.routes.payments.pesapal_routes.db.session.commit') as mock:
        mock.side_effect = Exception("Database connection failed")
        yield mock

# Update the admin_required mock function
@pytest.fixture
def admin_required():
    """Mock admin_required decorator"""
    def decorated_function(f):
        def wrapper(*args, **kwargs):
            # Mock implementation that checks user role
            from flask_jwt_extended import get_jwt_identity
            try:
                user_id = get_jwt_identity()
                user = User.query.get(user_id)
                if user and user.role == UserRole.ADMIN:
                    return f(*args, **kwargs)
                else:
                    return jsonify({'status': 'error', 'message': 'Admin access required'}), 403
            except:
                return jsonify({'status': 'error', 'message': 'Authentication required'}), 401
        return wrapper
    return decorated_function

# Utility functions for tests
def create_test_transactions(db_session, user, count=5):
    """Create multiple test transactions with unique references"""
    transactions = []
    for i in range(count):
        # Create unique order IDs to avoid conflicts
        order_id = f'ORD{user.id:03d}{i:06d}'

        transaction = PesapalTransaction(
            id=f'test-transaction-{user.id}-{i+10}',  # Use user ID to make unique
            user_id=user.id,
            order_id=order_id,
            merchant_reference=generate_unique_merchant_reference(order_id, user.id),
            amount=Decimal(f'{(i+1)*100}.00'),
            currency='KES',
            email=user.email,  # Changed from customer_email
            phone_number='254712345678',  # Changed from customer_phone
            description=f'Payment for Order {order_id}',
            status=['pending', 'completed', 'failed'][i % 3],
            created_at=datetime.now(timezone.utc) - timedelta(days=i, microseconds=i*1000)  # Add microseconds for uniqueness
        )
        transactions.append(transaction)
        db_session.add(transaction)

    db_session.commit()
    return transactions

def assert_transaction_data(transaction_data, transaction):
    """Assert transaction data matches expected format"""
    assert transaction_data['id'] == transaction.id
    assert transaction_data['order_id'] == transaction.order_id
    assert transaction_data['merchant_reference'] == transaction.merchant_reference
    assert float(transaction_data['amount']) == float(transaction.amount)
    assert transaction_data['currency'] == transaction.currency
    assert transaction_data['email'] == transaction.email  # Changed from customer_email
    assert transaction_data['status'] == transaction.status
    assert 'created_at' in transaction_data

def assert_error_response(response, status_code, message_contains=None):
    """Assert error response format"""
    assert response.status_code == status_code
    data = response.get_json()
    if data:  # Handle cases where JSON response might be None
        if 'status' in data:
            assert data['status'] == 'error'
        if message_contains and 'message' in data:
            assert message_contains in data['message']

def assert_success_response(response, status_code=200):
    """Assert success response format"""
    assert response.status_code == status_code
    data = response.get_json()
    assert data['status'] == 'success'
    return data

# Test data generators
class TestDataGenerator:
    """Generate test data for various scenarios"""

    @staticmethod
    def generate_payment_data(**overrides):
        """Generate payment initiation data"""
        base_data = {
            'order_id': 'ORD123456',
            'amount': 1000.00,
            'currency': 'KES',
            'customer_email': 'test@example.com',
            'customer_phone': '254712345678',
            'description': 'Test payment',
            'callback_url': 'https://example.com/callback'
        }
        base_data.update(overrides)
        return base_data

    @staticmethod
    def generate_callback_data(**overrides):
        """Generate callback data"""
        base_data = {
            'OrderTrackingId': f'TRK{int(time.time() * 1000)}',
            'OrderMerchantReference': generate_unique_merchant_reference('ORD123456'),
            'OrderNotificationType': 'IPNCHANGE',
            'OrderCreatedDate': datetime.now().isoformat()
        }
        base_data.update(overrides)
        return base_data

# Export fixtures and utilities
__all__ = [
    'app', 'client', 'app_context', 'db_session',
    'test_user', 'admin_user', 'test_order', 'cancelled_order',
    'test_transaction', 'completed_transaction', 'failed_transaction', 'expired_transaction',
    'user_token', 'admin_token', 'invalid_token',
    'auth_headers', 'admin_headers', 'invalid_auth_headers',
    'valid_payment_data', 'invalid_payment_data',
    'mock_pesapal_success_response', 'mock_pesapal_failure_response',
    'mock_pesapal_status_completed', 'mock_pesapal_status_failed', 'mock_pesapal_status_pending',
    'valid_callback_data', 'invalid_callback_data',
    'mock_create_payment_request', 'mock_get_transaction_status',
    'mock_validate_pesapal_ipn', 'mock_get_payment_status_message',
    'mock_validate_email', 'mock_validate_payment_amount', 'mock_sanitize_input',
    'mock_db_error', 'admin_required',
    'create_test_transactions', 'assert_transaction_data',
    'assert_error_response', 'assert_success_response',
    'TestDataGenerator', 'generate_unique_merchant_reference'
]
