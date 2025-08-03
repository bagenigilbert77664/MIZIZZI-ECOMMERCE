"""
Pytest fixtures for M-PESA route testing.
Provides test data, mocks, and setup for comprehensive M-PESA testing.
"""

import pytest
import uuid
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from unittest.mock import Mock, patch, MagicMock
from flask import Flask
from flask_jwt_extended import JWTManager, create_access_token

# Import models and extensions
from app.configuration.extensions import db
from app.models.models import (
    User, Order, MpesaTransaction, UserRole
)

# Import the routes blueprint
from app.routes.payments.mpesa_routes import mpesa_routes

import os
import sys

# Add the backend directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../..'))

@pytest.fixture(scope='function')
def app():
    """Create Flask app for testing"""
    # Create a minimal Flask app for testing
    app = Flask(__name__)
    app.config.update({
        'TESTING': True,
        'SQLALCHEMY_DATABASE_URI': 'sqlite:///:memory:',
        'JWT_SECRET_KEY': 'test-secret-key',
        'WTF_CSRF_ENABLED': False,
        'JWT_ACCESS_TOKEN_EXPIRES': timedelta(hours=1),
        'SECRET_KEY': 'test-secret-key'
    })

    # Initialize extensions
    db.init_app(app)
    jwt = JWTManager(app)

    # Import and register the M-PESA blueprint with a unique name for testing
    from app.routes.payments.mpesa_routes import mpesa_routes
    app.register_blueprint(mpesa_routes, url_prefix='/api/mpesa', name='test_mpesa_routes')

    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture(scope='function')
def client(app):
    """Create test client"""
    return app.test_client()


@pytest.fixture(scope='function')
def test_user(app):
    """Create a test user"""
    with app.app_context():
        user = User(
            name='Test User',
            email='test@example.com',
            role=UserRole.USER,
            phone='254712345678',
            email_verified=True,
            is_active=True
        )
        user.set_password('password123')

        db.session.add(user)
        db.session.commit()

        # Refresh to ensure it's attached to the session
        db.session.refresh(user)
        return user


@pytest.fixture(scope='function')
def admin_user(app):
    """Create an admin user"""
    with app.app_context():
        admin = User(
            name='Admin User',
            email='admin@example.com',
            role=UserRole.ADMIN,
            phone='254712345679',
            email_verified=True,
            is_active=True
        )
        admin.set_password('admin123')

        db.session.add(admin)
        db.session.commit()

        # Refresh to ensure it's attached to the session
        db.session.refresh(admin)
        return admin


@pytest.fixture(scope='function')
def other_user(app):
    """Create another test user"""
    with app.app_context():
        user = User(
            name='Other User',
            email='other@example.com',
            role=UserRole.USER,
            phone='254712345677',
            email_verified=True,
            is_active=True
        )
        user.set_password('password123')

        db.session.add(user)
        db.session.commit()

        # Refresh to ensure it's attached to the session
        db.session.refresh(user)
        return user


@pytest.fixture(scope='function')
def test_order(app, test_user):
    """Create a test order"""
    with app.app_context():
        # Ensure user is in the current session
        user = db.session.merge(test_user)

        order = Order(
            id=str(uuid.uuid4()),  # Add explicit ID since it's now a String primary key
            user_id=user.id,
            order_number='ORD123456',
            status='pending',  # Use string instead of OrderStatus.PENDING
            payment_status='pending',  # Use string instead of PaymentStatus.PENDING
            total_amount=1000.00,
            subtotal=900.00,
            tax_amount=100.00,
            shipping_address={'city': 'Nairobi', 'country': 'Kenya'},
            billing_address={'city': 'Nairobi', 'country': 'Kenya'},
            payment_method='mpesa',
            shipping_cost=0.00
        )

        db.session.add(order)
        db.session.commit()

        # Refresh to ensure it's attached to the session
        db.session.refresh(order)
        return order


@pytest.fixture(scope='function')
def cancelled_order(app, test_user):
    """Create a cancelled order"""
    with app.app_context():
        user = db.session.merge(test_user)

        order = Order(
            id=str(uuid.uuid4()),  # Add explicit ID since it's now a String primary key
            user_id=user.id,
            order_number='ORD123457',
            status='cancelled',  # Use string instead of OrderStatus.CANCELLED
            payment_status='pending',  # Use string instead of PaymentStatus.PENDING
            total_amount=1000.00,
            subtotal=900.00,
            tax_amount=100.00,
            shipping_address={'city': 'Nairobi', 'country': 'Kenya'},
            billing_address={'city': 'Nairobi', 'country': 'Kenya'},
            payment_method='mpesa',
            shipping_cost=0.00
        )

        db.session.add(order)
        db.session.commit()
        db.session.refresh(order)
        return order


@pytest.fixture(scope='function')
def pending_transaction(app, test_user, test_order):
    """Create a pending M-PESA transaction"""
    with app.app_context():
        # Ensure objects are in the current session
        user = db.session.merge(test_user)
        order = db.session.merge(test_order)

        transaction = MpesaTransaction(
            user_id=user.id,
            order_id=str(order.id),
            transaction_type='stk_push',
            phone_number='254712345678',
            amount=Decimal('1000.00'),
            account_reference=str(order.id),
            transaction_desc='Test payment',
            status='pending',
            checkout_request_id='ws_CO_123456789',
            merchant_request_id='mr_123456789',
            created_at=datetime.now(timezone.utc)
        )

        db.session.add(transaction)
        db.session.commit()

        # Refresh to ensure it's attached to the session
        db.session.refresh(transaction)
        return transaction


@pytest.fixture(scope='function')
def completed_transaction(app, test_user, test_order):
    """Create a completed M-PESA transaction"""
    with app.app_context():
        # Ensure objects are in the current session
        user = db.session.merge(test_user)
        order = db.session.merge(test_order)

        transaction = MpesaTransaction(
            user_id=user.id,
            order_id=str(order.id),
            transaction_type='stk_push',
            phone_number='254712345678',
            amount=Decimal('1000.00'),
            account_reference=str(order.id),
            transaction_desc='Test payment',
            status='completed',
            checkout_request_id='ws_CO_123456789',
            merchant_request_id='mr_123456789',
            mpesa_receipt_number='NLJ7RT61SV',
            result_code='0',
            result_desc='Success',
            transaction_date=datetime.now(timezone.utc),
            created_at=datetime.now(timezone.utc)
        )

        db.session.add(transaction)
        db.session.commit()

        # Refresh to ensure it's attached to the session
        db.session.refresh(transaction)
        return transaction


@pytest.fixture(scope='function')
def failed_transaction(app, test_user, test_order):
    """Create a failed M-PESA transaction"""
    with app.app_context():
        user = db.session.merge(test_user)
        order = db.session.merge(test_order)

        transaction = MpesaTransaction(
            user_id=user.id,
            order_id=str(order.id),
            transaction_type='stk_push',
            phone_number='254712345678',
            amount=Decimal('1000.00'),
            account_reference=str(order.id),
            transaction_desc='Test payment',
            status='failed',
            checkout_request_id='ws_CO_123456789',
            merchant_request_id='mr_123456789',
            result_code='1',
            result_desc='Insufficient balance',
            error_message='Insufficient balance',
            created_at=datetime.now(timezone.utc)
        )

        db.session.add(transaction)
        db.session.commit()
        db.session.refresh(transaction)
        return transaction


@pytest.fixture(scope='function')
def expired_transaction(app, test_user, test_order):
    """Create an expired M-PESA transaction"""
    with app.app_context():
        user = db.session.merge(test_user)
        order = db.session.merge(test_order)

        transaction = MpesaTransaction(
            user_id=user.id,
            order_id=str(order.id),
            transaction_type='stk_push',
            phone_number='254712345678',
            amount=Decimal('1000.00'),
            account_reference=str(order.id),
            transaction_desc='Test payment',
            status='failed',
            checkout_request_id='ws_CO_123456789',
            merchant_request_id='mr_123456789',
            result_code='1037',
            result_desc='Transaction expired',
            error_message='Transaction expired',
            created_at=datetime.now(timezone.utc) - timedelta(hours=1)  # Expired
        )

        db.session.add(transaction)
        db.session.commit()
        db.session.refresh(transaction)
        return transaction


@pytest.fixture(scope='function')
def max_retry_transaction(app, test_user, test_order):
    """Create a transaction that has exceeded max retry attempts"""
    with app.app_context():
        user = db.session.merge(test_user)
        order = db.session.merge(test_order)

        transaction = MpesaTransaction(
            user_id=user.id,
            order_id=str(order.id),
            transaction_type='stk_push',
            phone_number='254712345678',
            amount=Decimal('1000.00'),
            account_reference=str(order.id),
            transaction_desc='Test payment',
            status='failed',
            checkout_request_id='ws_CO_123456789',
            merchant_request_id='mr_123456789',
            result_code='1',
            result_desc='Max retries exceeded',
            retry_count=5,  # Assuming max is 3
            error_message='Max retry attempts exceeded',
            created_at=datetime.now(timezone.utc)
        )

        db.session.add(transaction)
        db.session.commit()
        db.session.refresh(transaction)
        return transaction


@pytest.fixture(scope='function')
def other_user_transaction(app, other_user):
    """Create a transaction for another user"""
    with app.app_context():
        user = db.session.merge(other_user)

        transaction = MpesaTransaction(
            user_id=user.id,
            order_id=str(uuid.uuid4()),
            transaction_type='stk_push',
            phone_number='254712345677',
            amount=Decimal('500.00'),
            account_reference=str(uuid.uuid4()),
            transaction_desc='Other user payment',
            status='completed',
            checkout_request_id='ws_CO_987654321',
            merchant_request_id='mr_987654321',
            mpesa_receipt_number='NLJ7RT61SX',
            result_code='0',
            result_desc='Success',
            transaction_date=datetime.now(timezone.utc),
            created_at=datetime.now(timezone.utc)
        )

        db.session.add(transaction)
        db.session.commit()
        db.session.refresh(transaction)
        return transaction


@pytest.fixture(scope='function')
def user_transactions(app, test_user):
    """Create multiple transactions for a user"""
    with app.app_context():
        # Ensure user is in the current session
        user = db.session.merge(test_user)

        transactions = []
        statuses = ['completed', 'pending', 'failed', 'cancelled']

        for i in range(10):
            transaction = MpesaTransaction(
                user_id=user.id,
                order_id=str(uuid.uuid4()),
                transaction_type='stk_push',
                phone_number='254712345678',
                amount=Decimal(str(100 * (i + 1))),
                account_reference=str(uuid.uuid4()),
                transaction_desc=f'Test payment {i + 1}',
                status=statuses[i % len(statuses)],
                retry_count=0,
                created_at=datetime.now(timezone.utc) - timedelta(days=i)
            )

            if transaction.status == 'completed':
                transaction.mpesa_receipt_number = f'NLJ7RT61S{i}'
                transaction.result_code = '0'
                transaction.result_desc = 'Success'
                transaction.transaction_date = datetime.now(timezone.utc)
            elif transaction.status == 'pending':
                transaction.checkout_request_id = f'ws_CO_12345678{i}'
                transaction.merchant_request_id = f'mr_12345678{i}'
            elif transaction.status == 'failed':
                transaction.result_code = '1'
                transaction.result_desc = 'Failed'
                transaction.error_message = 'Test failure'

            transactions.append(transaction)
            db.session.add(transaction)

        db.session.commit()

        # Refresh all transactions
        for transaction in transactions:
            db.session.refresh(transaction)

        return transactions


@pytest.fixture(scope='function')
def user_token(app, test_user):
    """Create JWT token for test user"""
    with app.app_context():
        # Ensure user is in the current session
        user = db.session.merge(test_user)
        return create_access_token(identity=user.id)


@pytest.fixture(scope='function')
def admin_token(app, admin_user):
    """Create JWT token for admin user"""
    with app.app_context():
        # Ensure admin is in the current session
        admin = db.session.merge(admin_user)
        return create_access_token(identity=admin.id)


@pytest.fixture(scope='function')
def invalid_token():
    """Create an invalid JWT token"""
    return 'invalid.jwt.token'


@pytest.fixture(scope='function')
def valid_payment_data(test_order):
    """Valid payment data for testing"""
    return {
        'order_id': str(test_order.id) if test_order else str(uuid.uuid4()),
        'phone_number': '254712345678',
        'amount': 1000,
        'description': 'Test payment'
    }


@pytest.fixture(scope='function')
def mock_mpesa_client():
    """Mock M-PESA client for testing"""
    with patch('app.routes.payments.mpesa_routes.mpesa_client') as mock_client:
        # Configure mock methods
        mock_client.stk_push = Mock()
        mock_client.query_stk_status = Mock()
        mock_client.get_access_token = Mock()

        # Default return values
        mock_client.stk_push.return_value = {
            'ResponseCode': '0',
            'ResponseDescription': 'Success',
            'CheckoutRequestID': 'ws_CO_123456789',
            'MerchantRequestID': 'mr_123456789'
        }

        mock_client.query_stk_status.return_value = {
            'ResponseCode': '0',
            'ResultCode': '0',
            'ResultDesc': 'Success'
        }

        mock_client.get_access_token.return_value = 'valid_access_token'

        yield mock_client


@pytest.fixture(scope='function')
def mock_validation_utils():
    """Mock validation utilities"""
    with patch('app.routes.payments.mpesa_routes.validate_phone_number') as mock_phone, \
         patch('app.routes.payments.mpesa_routes.validate_payment_amount') as mock_amount, \
         patch('app.routes.payments.mpesa_routes.sanitize_input') as mock_sanitize:

        # Configure mock returns
        mock_phone.return_value = {
            'valid': True,
            'mpesa_format': '254712345678',
            'formatted': '+254712345678'
        }

        mock_amount.return_value = {
            'valid': True,
            'amount': Decimal('1000.00'),
            'amount_str': '1000.00'
        }

        mock_sanitize.side_effect = lambda x, *args, **kwargs: str(x).strip()

        yield {
            'phone': mock_phone,
            'amount': mock_amount,
            'sanitize': mock_sanitize
        }


@pytest.fixture(scope='function')
def mock_admin_required():
    """Mock admin_required decorator"""
    with patch('app.routes.payments.mpesa_routes.admin_required') as mock_decorator:
        # Make the decorator pass through the function unchanged
        mock_decorator.side_effect = lambda f: f
        yield mock_decorator


# Database session fixtures
@pytest.fixture(scope='function', autouse=True)
def setup_database(app):
    """Setup and teardown database for each test"""
    with app.app_context():
        db.create_all()
        yield
        db.session.remove()
        db.drop_all()


# Error simulation fixtures
@pytest.fixture
def simulate_db_error():
    """Simulate database errors"""
    with patch.object(db.session, 'commit') as mock_commit:
        mock_commit.side_effect = Exception("Database connection failed")
        yield mock_commit


@pytest.fixture
def simulate_mpesa_timeout():
    """Simulate M-PESA API timeout"""
    with patch('app.routes.payments.mpesa_routes.mpesa_client') as mock_client:
        mock_client.stk_push.side_effect = Exception("Connection timeout")
        yield mock_client


# Performance testing fixtures
@pytest.fixture
def large_transaction_dataset(app, test_user):
    """Create large dataset for performance testing"""
    with app.app_context():
        # Ensure user is in the current session
        user = db.session.merge(test_user)

        transactions = []
        for i in range(100):  # Reduced for faster testing
            transaction = MpesaTransaction(
                user_id=user.id,
                order_id=str(uuid.uuid4()),
                transaction_type='stk_push',
                phone_number='254712345678',
                amount=Decimal('100.00'),
                account_reference=str(uuid.uuid4()),
                transaction_desc=f'Bulk transaction {i}',
                status='completed',
                retry_count=0,
                transaction_date=datetime.now(timezone.utc),
                created_at=datetime.now(timezone.utc) - timedelta(seconds=i)
            )
            transactions.append(transaction)
            db.session.add(transaction)

            # Commit every 20 records
            if (i + 1) % 20 == 0:
                db.session.commit()

        db.session.commit()

        # Refresh all transactions
        for transaction in transactions:
            db.session.refresh(transaction)

        return transactions


# Security testing fixtures
@pytest.fixture
def malicious_payloads():
    """Malicious payloads for security testing"""
    return {
        'sql_injection': "'; DROP TABLE users; --",
        'xss': '<script>alert("xss")</script>',
        'command_injection': '; rm -rf /',
        'path_traversal': '../../../etc/passwd',
        'large_payload': 'A' * 1000,  # Reduced size
        'unicode_attack': '\u0000\u0001\u0002'
    }


@pytest.fixture
def rate_limit_setup():
    """Setup for rate limiting tests"""
    return {
        'max_requests': 10,
        'time_window': 60,  # seconds
        'block_duration': 300  # seconds
    }


# Additional utility fixtures
@pytest.fixture
def mock_logger():
    """Mock logger for testing"""
    with patch('app.routes.payments.mpesa_routes.logger') as mock_log:
        yield mock_log


@pytest.fixture
def mock_datetime():
    """Mock datetime for testing time-sensitive operations"""
    with patch('app.routes.payments.mpesa_routes.datetime') as mock_dt:
        mock_dt.now.return_value = datetime(2023, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
        mock_dt.side_effect = lambda *args, **kw: datetime(*args, **kw)
        yield mock_dt


@pytest.fixture
def callback_test_data():
    """Standard callback test data"""
    return {
        'success_callback': {
            'Body': {
                'stkCallback': {
                    'MerchantRequestID': 'mr_123456789',
                    'CheckoutRequestID': 'ws_CO_123456789',
                    'ResultCode': 0,
                    'ResultDesc': 'The service request is processed successfully.',
                    'CallbackMetadata': {
                        'Item': [
                            {'Name': 'Amount', 'Value': 1000.00},
                            {'Name': 'MpesaReceiptNumber', 'Value': 'NLJ7RT61SV'},
                            {'Name': 'TransactionDate', 'Value': 20210621144000},
                            {'Name': 'PhoneNumber', 'Value': 254712345678}
                        ]
                    }
                }
            }
        },
        'failed_callback': {
            'Body': {
                'stkCallback': {
                    'MerchantRequestID': 'mr_123456789',
                    'CheckoutRequestID': 'ws_CO_123456789',
                    'ResultCode': 1,
                    'ResultDesc': 'The balance is insufficient for the transaction.'
                }
            }
        },
        'cancelled_callback': {
            'Body': {
                'stkCallback': {
                    'MerchantRequestID': 'mr_123456789',
                    'CheckoutRequestID': 'ws_CO_123456789',
                    'ResultCode': 1032,
                    'ResultDesc': 'Request cancelled by user'
                }
            }
        }
    }


@pytest.fixture
def mock_mpesa_config():
    """Mock M-PESA configuration for testing"""
    return {
        'consumer_key': 'test_consumer_key',
        'consumer_secret': 'test_consumer_secret',
        'business_short_code': '174379',
        'passkey': 'test_passkey',
        'environment': 'sandbox'
    }


@pytest.fixture
def mock_successful_token_response():
    """Mock successful token response"""
    mock_response = Mock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        'access_token': 'mock_access_token',
        'expires_in': '3599'
    }
    return mock_response


@pytest.fixture
def mock_successful_stk_response():
    """Mock successful STK push response"""
    mock_response = Mock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        'ResponseCode': '0',
        'ResponseDescription': 'Success',
        'CheckoutRequestID': 'ws_CO_123456789',
        'MerchantRequestID': 'mr_123456789'
    }
    return mock_response


@pytest.fixture
def sample_callback_data():
    """Sample M-PESA callback data"""
    return {
        'Body': {
            'stkCallback': {
                'CheckoutRequestID': 'ws_CO_123456789',
                'MerchantRequestID': 'mr_123456789',
                'ResultCode': 0,
                'ResultDesc': 'The service request is processed successfully.',
                'CallbackMetadata': {
                    'Item': [
                        {'Name': 'Amount', 'Value': 1000.00},
                        {'Name': 'MpesaReceiptNumber', 'Value': 'NLJ7RT61SV'},
                        {'Name': 'PhoneNumber', 'Value': 254712345678}
                    ]
                }
            }
        }
    }
