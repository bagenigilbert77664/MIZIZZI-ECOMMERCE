"""
Comprehensive tests for Pesapal payment routes
Tests all endpoints, error cases, edge cases, and integration scenarios
"""

import pytest
import json
import uuid
from datetime import datetime, timedelta
from decimal import Decimal
from unittest.mock import Mock, patch, MagicMock

# Import test fixtures and utilities
from .conftest import (
    assert_transaction_data, assert_error_response, assert_success_response,
    create_test_transactions, TestDataGenerator
)

# Database and models
try:
    from app.models.models import User, Order, PesapalTransaction
    from app.configuration.extensions import db
except ImportError:
    try:
        from app.models.models import User, Order, PesapalTransaction
        from app.configuration.extensions import db
    except ImportError:
        from app.models.models import User, Order, PesapalTransaction
        from app.configuration.extensions import db


class TestPesapalPaymentInitiation:
    """Test payment initiation endpoint"""

    def test_initiate_payment_success(self, client, auth_headers, valid_payment_data,
                                    mock_create_payment_request, mock_pesapal_success_response,
                                    mock_validate_email, mock_validate_payment_amount):
        """Test successful payment initiation"""
        mock_create_payment_request.return_value = mock_pesapal_success_response

        response = client.post('/api/pesapal/initiate',
                             json=valid_payment_data,
                             headers=auth_headers)

        data = assert_success_response(response)
        assert 'transaction_id' in data
        assert 'order_tracking_id' in data
        assert 'redirect_url' in data
        assert 'merchant_reference' in data
        assert data['message'] == 'Payment request created successfully'

        # Verify mock calls
        mock_create_payment_request.assert_called_once()
        mock_validate_email.assert_called_once_with(valid_payment_data['customer_email'])
        mock_validate_payment_amount.assert_called_once_with(valid_payment_data['amount'])

    def test_initiate_payment_no_authentication(self, client, valid_payment_data):
        """Test payment initiation without authentication"""
        response = client.post('/api/pesapal/initiate', json=valid_payment_data)
        assert response.status_code == 401

    def test_initiate_payment_invalid_token(self, client, invalid_auth_headers, valid_payment_data):
        """Test payment initiation with invalid token"""
        response = client.post('/api/pesapal/initiate',
                             json=valid_payment_data,
                             headers=invalid_auth_headers)
        assert response.status_code == 422

    def test_initiate_payment_invalid_json(self, client, auth_headers):
        """Test payment initiation with invalid JSON"""
        response = client.post('/api/pesapal/initiate',
                             data='invalid json',
                             headers=auth_headers,
                             content_type='application/json')
        assert response.status_code == 400

    def test_initiate_payment_missing_fields(self, client, auth_headers):
        """Test payment initiation with missing required fields"""
        incomplete_data = {'amount': 1000.00}

        response = client.post('/api/pesapal/initiate',
                             json=incomplete_data,
                             headers=auth_headers)

        assert_error_response(response, 400, 'Missing required field')

    def test_initiate_payment_invalid_amount(self, client, auth_headers, valid_payment_data,
                                           mock_validate_email, mock_validate_payment_amount):
        """Test payment initiation with invalid amount"""
        mock_validate_payment_amount.return_value = {"valid": False, "error": "Amount too low"}

        response = client.post('/api/pesapal/initiate',
                             json=valid_payment_data,
                             headers=auth_headers)

        assert_error_response(response, 400, 'Invalid amount')

    def test_initiate_payment_invalid_email(self, client, auth_headers, valid_payment_data,
                                          mock_validate_email, mock_validate_payment_amount):
        """Test payment initiation with invalid email"""
        mock_validate_email.return_value = False

        response = client.post('/api/pesapal/initiate',
                             json=valid_payment_data,
                             headers=auth_headers)

        assert_error_response(response, 400, 'Invalid email address')

    def test_initiate_payment_nonexistent_order(self, client, auth_headers, mock_validate_email,
                                              mock_validate_payment_amount):
        """Test payment initiation for non-existent order"""
        payment_data = TestDataGenerator.generate_payment_data(order_id='NONEXISTENT')

        response = client.post('/api/pesapal/initiate',
                             json=payment_data,
                             headers=auth_headers)

        assert_error_response(response, 404, 'Order not found')

    def test_initiate_payment_cancelled_order(self, client, auth_headers, cancelled_order,
                                            mock_validate_email, mock_validate_payment_amount):
        """Test payment initiation for cancelled order"""
        payment_data = TestDataGenerator.generate_payment_data(
            order_id=cancelled_order.id,
            amount=float(cancelled_order.total_amount)
        )

        response = client.post('/api/pesapal/initiate',
                             json=payment_data,
                             headers=auth_headers)

        # Should still work for cancelled orders (business logic decision)
        # Or modify to return error if cancelled orders shouldn't accept payments
        assert response.status_code in [200, 400]

    def test_initiate_payment_amount_mismatch(self, client, auth_headers, test_order,
                                            mock_validate_email, mock_validate_payment_amount):
        """Test payment initiation with amount mismatch"""
        payment_data = TestDataGenerator.generate_payment_data(
            order_id=test_order.id,
            amount=2000.00  # Different from order total
        )

        response = client.post('/api/pesapal/initiate',
                             json=payment_data,
                             headers=auth_headers)

        assert_error_response(response, 400, 'Payment amount does not match order total')

    def test_initiate_payment_duplicate_request(self, client, auth_headers, test_transaction,
                                              mock_validate_email, mock_validate_payment_amount):
        """Test duplicate payment initiation for same order"""
        payment_data = TestDataGenerator.generate_payment_data(
            order_id=test_transaction.order_id,
            amount=float(test_transaction.amount)
        )

        response = client.post('/api/pesapal/initiate',
                             json=payment_data,
                             headers=auth_headers)

        assert_error_response(response, 409, 'already a pending payment')

    def test_initiate_payment_pending_transaction_exists(self, client, auth_headers, db_session,
                                                       test_user, test_order, mock_validate_email,
                                                       mock_validate_payment_amount):
        """Test payment initiation when pending transaction exists"""
        # Create pending transaction
        pending_transaction = PesapalTransaction(
            user_id=test_user.id,
            order_id=test_order.id,
            merchant_reference=f'MIZIZZI_PENDING_{int(datetime.utcnow().timestamp())}',
            amount=test_order.total_amount,
            currency='KES',
            customer_email='test@example.com',
            customer_phone='254712345678',
            description='Pending payment',
            status='pending',
            created_at=datetime.utcnow()
        )
        db_session.add(pending_transaction)
        db_session.commit()

        payment_data = TestDataGenerator.generate_payment_data(
            order_id=test_order.id,
            amount=float(test_order.total_amount)
        )

        response = client.post('/api/pesapal/initiate',
                             json=payment_data,
                             headers=auth_headers)

        assert_error_response(response, 409, 'already a pending payment')

    def test_initiate_payment_pesapal_api_failure(self, client, auth_headers, valid_payment_data,
                                                 mock_create_payment_request, mock_pesapal_failure_response,
                                                 mock_validate_email, mock_validate_payment_amount):
        """Test payment initiation when Pesapal API fails"""
        mock_create_payment_request.return_value = mock_pesapal_failure_response

        response = client.post('/api/pesapal/initiate',
                             json=valid_payment_data,
                             headers=auth_headers)

        assert_error_response(response, 400, 'Payment initiation failed')

    def test_initiate_payment_pesapal_api_exception(self, client, auth_headers, valid_payment_data,
                                                   mock_create_payment_request, mock_validate_email,
                                                   mock_validate_payment_amount):
        """Test payment initiation when Pesapal API raises exception"""
        mock_create_payment_request.return_value = None

        response = client.post('/api/pesapal/initiate',
                             json=valid_payment_data,
                             headers=auth_headers)

        assert_error_response(response, 500, 'Failed to initiate payment')

    def test_initiate_payment_pesapal_service_unavailable(self, client, auth_headers, valid_payment_data,
                                                         mock_validate_email, mock_validate_payment_amount):
        """Test payment initiation when Pesapal service is unavailable"""
        with patch('app.routes.payments.pesapal_routes.create_payment_request',
                  side_effect=Exception("Service unavailable")):
            response = client.post('/api/pesapal/initiate',
                                 json=valid_payment_data,
                                 headers=auth_headers)

            assert_error_response(response, 500, 'Internal server error')

    def test_initiate_payment_database_error(self, client, auth_headers, valid_payment_data,
                                           mock_create_payment_request, mock_pesapal_success_response,
                                           mock_validate_email, mock_validate_payment_amount, mock_db_error):
        """Test payment initiation with database error"""
        mock_create_payment_request.return_value = mock_pesapal_success_response

        response = client.post('/api/pesapal/initiate',
                             json=valid_payment_data,
                             headers=auth_headers)

        assert_error_response(response, 500, 'Internal server error')


class TestPesapalPaymentStatus:
    """Test payment status checking endpoint"""

    def test_check_status_completed_transaction(self, client, auth_headers, completed_transaction):
        """Test checking status of completed transaction"""
        response = client.get(f'/api/pesapal/status/{completed_transaction.id}',
                            headers=auth_headers)

        data = assert_success_response(response)
        assert data['transaction_status'] == 'completed'
        assert 'transaction_data' in data
        assert_transaction_data(data['transaction_data'], completed_transaction)

    def test_check_status_pending_transaction(self, client, auth_headers, test_transaction,
                                            mock_get_transaction_status, mock_pesapal_status_pending):
        """Test checking status of pending transaction"""
        mock_get_transaction_status.return_value = mock_pesapal_status_pending

        response = client.get(f'/api/pesapal/status/{test_transaction.id}',
                            headers=auth_headers)

        data = assert_success_response(response)
        assert data['transaction_status'] == 'pending'

    def test_check_status_failed_transaction(self, client, auth_headers, failed_transaction):
        """Test checking status of failed transaction"""
        response = client.get(f'/api/pesapal/status/{failed_transaction.id}',
                            headers=auth_headers)

        data = assert_success_response(response)
        assert data['transaction_status'] == 'failed'

    def test_check_status_query_pesapal_api(self, client, auth_headers, test_transaction,
                                           mock_get_transaction_status, mock_pesapal_status_completed):
        """Test querying Pesapal API for transaction status"""
        # Set order_tracking_id for the transaction
        test_transaction.order_tracking_id = 'TRK123456789'
        db.session.commit()

        mock_get_transaction_status.return_value = mock_pesapal_status_completed

        response = client.get(f'/api/pesapal/status/{test_transaction.id}',
                            headers=auth_headers)

        data = assert_success_response(response)
        assert data['transaction_status'] == 'completed'

        # Verify API was called
        mock_get_transaction_status.assert_called_once_with('TRK123456789')

    def test_check_status_invalid_transaction_id_format(self, client, auth_headers):
        """Test checking status with invalid transaction ID format"""
        response = client.get('/api/pesapal/status/invalid_id', headers=auth_headers)
        assert response.status_code == 404

    def test_check_status_nonexistent_transaction(self, client, auth_headers):
        """Test checking status of non-existent transaction"""
        response = client.get('/api/pesapal/status/99999', headers=auth_headers)
        assert_error_response(response, 404, 'Transaction not found')

    def test_check_status_unauthorized_transaction(self, client, auth_headers, db_session, admin_user):
        """Test checking status of transaction belonging to another user"""
        # Create transaction for admin user
        admin_transaction = PesapalTransaction(
            user_id=admin_user.id,
            order_id='ADMIN_ORDER',
            merchant_reference='ADMIN_REF',
            amount=Decimal('500.00'),
            currency='KES',
            customer_email='admin@example.com',
            customer_phone='254712345678',
            description='Admin payment',
            status='pending',
            created_at=datetime.utcnow()
        )
        db_session.add(admin_transaction)
        db_session.commit()

        # Try to access with regular user token
        response = client.get(f'/api/pesapal/status/{admin_transaction.id}',
                            headers=auth_headers)

        assert_error_response(response, 404, 'Transaction not found')

    def test_check_status_no_authentication(self, client, test_transaction):
        """Test checking status without authentication"""
        response = client.get(f'/api/pesapal/status/{test_transaction.id}')
        assert response.status_code == 401

    def test_check_status_pesapal_api_error(self, client, auth_headers, test_transaction,
                                          mock_get_transaction_status):
        """Test checking status when Pesapal API returns error"""
        test_transaction.order_tracking_id = 'TRK123456789'
        db.session.commit()

        mock_get_transaction_status.return_value = {'status': 'error', 'message': 'API Error'}

        response = client.get(f'/api/pesapal/status/{test_transaction.id}',
                            headers=auth_headers)

        data = assert_success_response(response)
        assert data['transaction_status'] == 'pending'  # Should remain unchanged


class TestPesapalCallback:
    """Test Pesapal callback endpoint"""

    def test_callback_success_get_method(self, client, test_transaction, valid_callback_data,
                                       mock_get_transaction_status, mock_pesapal_status_completed):
        """Test successful callback via GET method"""
        test_transaction.order_tracking_id = valid_callback_data['OrderTrackingId']
        db.session.commit()

        mock_get_transaction_status.return_value = mock_pesapal_status_completed

        response = client.get('/api/pesapal/callback', query_string=valid_callback_data)

        data = assert_success_response(response)
        assert data['message'] == 'Callback processed successfully'

        # Verify transaction was updated
        db.session.refresh(test_transaction)
        assert test_transaction.status == 'completed'

    def test_callback_success_post_method(self, client, test_transaction, valid_callback_data,
                                        mock_get_transaction_status, mock_pesapal_status_completed):
        """Test successful callback via POST method"""
        test_transaction.order_tracking_id = valid_callback_data['OrderTrackingId']
        db.session.commit()

        mock_get_transaction_status.return_value = mock_pesapal_status_completed

        response = client.post('/api/pesapal/callback', json=valid_callback_data)

        data = assert_success_response(response)
        assert data['message'] == 'Callback processed successfully'

    def test_callback_failed_payment(self, client, test_transaction, valid_callback_data,
                                   mock_get_transaction_status, mock_pesapal_status_failed):
        """Test callback for failed payment"""
        test_transaction.order_tracking_id = valid_callback_data['OrderTrackingId']
        db.session.commit()

        mock_get_transaction_status.return_value = mock_pesapal_status_failed

        response = client.post('/api/pesapal/callback', json=valid_callback_data)

        data = assert_success_response(response)

        # Verify transaction was updated to failed
        db.session.refresh(test_transaction)
        assert test_transaction.status == 'failed'

    def test_callback_cancelled_payment(self, client, test_transaction, valid_callback_data,
                                      mock_get_transaction_status):
        """Test callback for cancelled payment"""
        test_transaction.order_tracking_id = valid_callback_data['OrderTrackingId']
        db.session.commit()

        mock_get_transaction_status.return_value = {
            'status': 'success',
            'payment_status': 'CANCELLED'
        }

        response = client.post('/api/pesapal/callback', json=valid_callback_data)

        data = assert_success_response(response)

        # Verify transaction was updated to cancelled
        db.session.refresh(test_transaction)
        assert test_transaction.status == 'cancelled'

    def test_callback_already_processed(self, client, completed_transaction, valid_callback_data,
                                      mock_get_transaction_status, mock_pesapal_status_completed):
        """Test callback for already processed transaction"""
        completed_transaction.order_tracking_id = valid_callback_data['OrderTrackingId']
        db.session.commit()

        mock_get_transaction_status.return_value = mock_pesapal_status_completed

        response = client.post('/api/pesapal/callback', json=valid_callback_data)

        data = assert_success_response(response)
        assert data['message'] == 'Callback processed successfully'

    def test_callback_updates_order_status(self, client, test_transaction, test_order, valid_callback_data,
                                         mock_get_transaction_status, mock_pesapal_status_completed):
        """Test callback updates associated order status"""
        test_transaction.order_tracking_id = valid_callback_data['OrderTrackingId']
        test_transaction.order_id = test_order.id
        db.session.commit()

        mock_get_transaction_status.return_value = mock_pesapal_status_completed

        response = client.post('/api/pesapal/callback', json=valid_callback_data)

        data = assert_success_response(response)

        # Verify order was updated
        db.session.refresh(test_order)
        if hasattr(test_order, 'payment_status'):
            assert test_order.payment_status == 'paid'
        if hasattr(test_order, 'status'):
            assert test_order.status == 'confirmed'

    def test_callback_with_merchant_reference(self, client, test_transaction, valid_callback_data,
                                            mock_get_transaction_status, mock_pesapal_status_completed):
        """Test callback using merchant reference instead of tracking ID"""
        test_transaction.merchant_reference = valid_callback_data['OrderMerchantReference']
        db.session.commit()

        # Remove tracking ID from callback
        callback_data = valid_callback_data.copy()
        del callback_data['OrderTrackingId']

        mock_get_transaction_status.return_value = mock_pesapal_status_completed

        response = client.post('/api/pesapal/callback', json=callback_data)

        data = assert_success_response(response)

    def test_callback_invalid_data(self, client, invalid_callback_data):
        """Test callback with invalid data"""
        response = client.post('/api/pesapal/callback', json=invalid_callback_data)
        assert_error_response(response, 400, 'Invalid callback data')

    def test_callback_missing_tracking_id_and_reference(self, client):
        """Test callback missing both tracking ID and merchant reference"""
        callback_data = {'invalid_field': 'value'}

        response = client.post('/api/pesapal/callback', json=callback_data)
        assert_error_response(response, 400, 'Invalid callback data')

    def test_callback_transaction_not_found(self, client, valid_callback_data):
        """Test callback for non-existent transaction"""
        response = client.post('/api/pesapal/callback', json=valid_callback_data)
        assert_error_response(response, 404, 'Transaction not found')

    def test_callback_pesapal_api_error(self, client, test_transaction, valid_callback_data,
                                      mock_get_transaction_status):
        """Test callback when Pesapal API returns error"""
        test_transaction.order_tracking_id = valid_callback_data['OrderTrackingId']
        db.session.commit()

        mock_get_transaction_status.return_value = {'status': 'error', 'message': 'API Error'}

        response = client.post('/api/pesapal/callback', json=valid_callback_data)

        data = assert_success_response(response)
        # Should still process callback even if status query fails

    def test_callback_database_error(self, client, test_transaction, valid_callback_data,
                                   mock_get_transaction_status, mock_pesapal_status_completed, mock_db_error):
        """Test callback with database error"""
        test_transaction.order_tracking_id = valid_callback_data['OrderTrackingId']
        db.session.commit()

        mock_get_transaction_status.return_value = mock_pesapal_status_completed

        response = client.post('/api/pesapal/callback', json=valid_callback_data)

        assert_error_response(response, 500, 'Callback processing failed')


class TestPesapalUserTransactions:
    """Test user transactions endpoint"""

    def test_get_user_transactions_success(self, client, auth_headers, db_session, test_user):
        """Test getting user transactions successfully"""
        # Create test transactions
        transactions = create_test_transactions(db_session, test_user, 3)

        response = client.get('/api/pesapal/transactions', headers=auth_headers)

        data = assert_success_response(response)
        assert 'transactions' in data
        assert 'pagination' in data
        assert len(data['transactions']) == 3

        # Verify transaction data format
        for transaction_data in data['transactions']:
            assert 'id' in transaction_data
            assert 'amount' in transaction_data
            assert 'status' in transaction_data
            assert 'created_at' in transaction_data

    def test_get_user_transactions_with_status_filter(self, client, auth_headers, db_session, test_user):
        """Test getting user transactions with status filter"""
        transactions = create_test_transactions(db_session, test_user, 5)

        response = client.get('/api/pesapal/transactions?status=completed', headers=auth_headers)

        data = assert_success_response(response)
        completed_transactions = [t for t in data['transactions'] if t['status'] == 'completed']
        assert len(completed_transactions) > 0

        # All returned transactions should have completed status
        for transaction in data['transactions']:
            assert transaction['status'] == 'completed'

    def test_get_user_transactions_with_pagination(self, client, auth_headers, db_session, test_user):
        """Test getting user transactions with pagination"""
        transactions = create_test_transactions(db_session, test_user, 10)

        # Get first page
        response = client.get('/api/pesapal/transactions?page=1&per_page=5', headers=auth_headers)

        data = assert_success_response(response)
        assert len(data['transactions']) == 5
        assert data['pagination']['page'] == 1
        assert data['pagination']['per_page'] == 5
        assert data['pagination']['total'] == 10
        assert data['pagination']['has_next'] is True

        # Get second page
        response = client.get('/api/pesapal/transactions?page=2&per_page=5', headers=auth_headers)

        data = assert_success_response(response)
        assert len(data['transactions']) == 5
        assert data['pagination']['page'] == 2
        assert data['pagination']['has_prev'] is True

    def test_get_user_transactions_empty_list(self, client, auth_headers):
        """Test getting user transactions when none exist"""
        response = client.get('/api/pesapal/transactions', headers=auth_headers)

        data = assert_success_response(response)
        assert data['transactions'] == []
        assert data['pagination']['total'] == 0

    def test_get_user_transactions_no_authentication(self, client):
        """Test getting user transactions without authentication"""
        response = client.get('/api/pesapal/transactions')
        assert response.status_code == 401

    def test_get_user_transactions_invalid_pagination(self, client, auth_headers):
        """Test getting user transactions with invalid pagination parameters"""
        response = client.get('/api/pesapal/transactions?page=0&per_page=-1', headers=auth_headers)

        # Should handle invalid parameters gracefully
        data = assert_success_response(response)
        assert 'transactions' in data
        assert 'pagination' in data

    def test_get_user_transactions_large_per_page(self, client, auth_headers):
        """Test getting user transactions with large per_page value"""
        response = client.get('/api/pesapal/transactions?per_page=1000', headers=auth_headers)

        data = assert_success_response(response)
        # Should be limited to maximum allowed (100)
        assert data['pagination']['per_page'] <= 100


class TestPesapalAdminRoutes:
    """Test admin-only endpoints"""

    def test_admin_get_all_transactions(self, client, admin_headers, db_session, test_user, admin_user):
        """Test admin getting all transactions"""
        # Create transactions for different users
        user_transactions = create_test_transactions(db_session, test_user, 3)
        admin_transactions = create_test_transactions(db_session, admin_user, 2)

        response = client.get('/api/pesapal/admin/transactions', headers=admin_headers)

        data = assert_success_response(response)
        assert len(data['transactions']) == 5  # All transactions

        # Verify admin-specific fields are included
        for transaction in data['transactions']:
            assert 'user_id' in transaction
            assert 'user_email' in transaction

    def test_admin_get_transactions_with_filters(self, client, admin_headers, db_session, test_user):
        """Test admin getting transactions with filters"""
        transactions = create_test_transactions(db_session, test_user, 5)

        # Filter by user
        response = client.get(f'/api/pesapal/admin/transactions?user_id={test_user.id}',
                            headers=admin_headers)

        data = assert_success_response(response)
        for transaction in data['transactions']:
            assert transaction['user_id'] == test_user.id

        # Filter by status
        response = client.get('/api/pesapal/admin/transactions?status=pending',
                            headers=admin_headers)

        data = assert_success_response(response)
        for transaction in data['transactions']:
            assert transaction['status'] == 'pending'

    def test_admin_get_pesapal_stats(self, client, admin_headers, db_session, test_user):
        """Test admin getting Pesapal statistics"""
        # Create transactions with different statuses
        transactions = create_test_transactions(db_session, test_user, 6)

        response = client.get('/api/pesapal/admin/stats', headers=admin_headers)

        data = assert_success_response(response)
        assert 'stats' in data

        stats = data['stats']
        assert 'total_transactions' in stats
        assert 'completed_transactions' in stats
        assert 'failed_transactions' in stats
        assert 'pending_transactions' in stats
        assert 'cancelled_transactions' in stats
        assert 'total_amount' in stats
        assert 'success_rate' in stats
        assert 'average_transaction_amount' in stats
        assert 'payment_methods' in stats

        assert stats['total_transactions'] == 6

    def test_admin_get_stats_with_date_range(self, client, admin_headers, db_session, test_user):
        """Test admin getting statistics with date range"""
        transactions = create_test_transactions(db_session, test_user, 3)

        from_date = (datetime.utcnow() - timedelta(days=7)).isoformat()
        to_date = datetime.utcnow().isoformat()

        response = client.get(f'/api/pesapal/admin/stats?from_date={from_date}&to_date={to_date}',
                            headers=admin_headers)

        data = assert_success_response(response)
        assert 'stats' in data

    def test_admin_routes_user_access_denied(self, client, auth_headers):
        """Test regular user cannot access admin routes"""
        response = client.get('/api/pesapal/admin/transactions', headers=auth_headers)
        assert response.status_code == 403

        response = client.get('/api/pesapal/admin/stats', headers=auth_headers)
        assert response.status_code == 403

    def test_admin_routes_no_authentication(self, client):
        """Test admin routes without authentication"""
        response = client.get('/api/pesapal/admin/transactions')
        assert response.status_code == 401

        response = client.get('/api/pesapal/admin/stats')
        assert response.status_code == 401


class TestPesapalHealthCheck:
    """Test health check endpoint"""

    def test_health_check_success(self, client):
        """Test successful health check"""
        response = client.get('/api/pesapal/health')

        data = assert_success_response(response)
        assert data['status'] == 'healthy'
        assert data['service'] == 'pesapal'
        assert 'timestamp' in data
        assert 'endpoints' in data
        assert len(data['endpoints']) > 0

    def test_health_check_service_error(self, client):
        """Test health check when service has errors"""
        with patch('app.routes.payments.pesapal_routes.datetime') as mock_datetime:
            mock_datetime.now.side_effect = Exception("Service error")

            response = client.get('/api/pesapal/health')

            assert response.status_code == 503
            data = response.get_json()
            assert data['status'] == 'unhealthy'
            assert 'error' in data


class TestPesapalErrorHandlers:
    """Test error handlers"""

    def test_not_found_handler(self, client):
        """Test 404 error handler"""
        response = client.get('/api/pesapal/nonexistent')

        assert response.status_code == 404
        data = response.get_json()
        assert data['status'] == 'error'
        assert 'not found' in data['message'].lower()

    def test_method_not_allowed_handler(self, client):
        """Test 405 error handler"""
        response = client.delete('/api/pesapal/health')  # DELETE not allowed

        assert response.status_code == 405
        data = response.get_json()
        assert data['status'] == 'error'
        assert 'method not allowed' in data['message'].lower()

    def test_internal_server_error_handler(self, client, auth_headers, valid_payment_data):
        """Test 500 error handler"""
        with patch('app.routes.payments.pesapal_routes.get_jwt_identity',
                  side_effect=Exception("Internal error")):
            response = client.post('/api/pesapal/initiate',
                                 json=valid_payment_data,
                                 headers=auth_headers)

            assert response.status_code == 500
            data = response.get_json()
            assert data['status'] == 'error'
            assert 'internal server error' in data['message'].lower()


class TestPesapalSecurityFeatures:
    """Test security features and input validation"""

    def test_input_sanitization(self, client, auth_headers, mock_validate_email,
                               mock_validate_payment_amount, mock_sanitize_input):
        """Test input sanitization"""
        payment_data = TestDataGenerator.generate_payment_data(
            customer_email='  test@example.com  ',
            description='  Test payment  '
        )

        response = client.post('/api/pesapal/initiate',
                             json=payment_data,
                             headers=auth_headers)

        # Verify sanitization was called
        mock_sanitize_input.assert_called()

    def test_sql_injection_prevention(self, client, auth_headers, mock_validate_email,
                                    mock_validate_payment_amount):
        """Test SQL injection prevention"""
        malicious_data = TestDataGenerator.generate_payment_data(
            order_id="'; DROP TABLE orders; --",
            customer_email="test@example.com'; DROP TABLE users; --"
        )

        response = client.post('/api/pesapal/initiate',
                             json=malicious_data,
                             headers=auth_headers)

        # Should handle malicious input safely
        assert response.status_code in [400, 404, 500]  # Should not succeed

    def test_amount_precision_validation(self, client, auth_headers, mock_validate_email):
        """Test amount precision validation"""
        with patch('app.routes.payments.pesapal_routes.validate_payment_amount') as mock_validate:
            mock_validate.return_value = {"valid": False, "error": "Invalid precision"}

            payment_data = TestDataGenerator.generate_payment_data(amount=1000.123456789)

            response = client.post('/api/pesapal/initiate',
                                 json=payment_data,
                                 headers=auth_headers)

            assert_error_response(response, 400, 'Invalid amount')

    def test_transaction_isolation(self, client, auth_headers, db_session, test_user, test_order,
                                 mock_validate_email, mock_validate_payment_amount,
                                 mock_create_payment_request, mock_pesapal_success_response):
        """Test transaction isolation"""
        mock_create_payment_request.return_value = mock_pesapal_success_response

        payment_data = TestDataGenerator.generate_payment_data(
            order_id=test_order.id,
            amount=float(test_order.total_amount)
        )

        # Simulate concurrent requests
        import threading
        results = []

        def make_request():
            response = client.post('/api/pesapal/initiate',
                                 json=payment_data,
                                 headers=auth_headers)
            results.append(response.status_code)

        threads = [threading.Thread(target=make_request) for _ in range(3)]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join()

        # Only one should succeed, others should get conflict
        success_count = sum(1 for status in results if status == 200)
        conflict_count = sum(1 for status in results if status == 409)

        assert success_count == 1
        assert conflict_count == 2


class TestPesapalEdgeCases:
    """Test edge cases and boundary conditions"""

    def test_concurrent_payment_requests(self, client, auth_headers, db_session, test_user,
                                       mock_validate_email, mock_validate_payment_amount,
                                       mock_create_payment_request, mock_pesapal_success_response):
        """Test concurrent payment requests for same order"""
        # Create multiple orders to avoid conflicts
        orders = []
        for i in range(3):
            order = Order(
                id=f'ORD_CONCURRENT_{i}',
                user_id=test_user.id,
                total_amount=Decimal('1000.00'),
                status='pending',
                payment_status='pending',
                created_at=datetime.utcnow()
            )
            orders.append(order)
            db_session.add(order)
        db_session.commit()

        mock_create_payment_request.return_value = mock_pesapal_success_response

        # Make concurrent requests for different orders
        import threading
        results = []

        def make_request(order_id):
            payment_data = TestDataGenerator.generate_payment_data(
                order_id=order_id,
                amount=1000.00
            )
            response = client.post('/api/pesapal/initiate',
                                 json=payment_data,
                                 headers=auth_headers)
            results.append(response.status_code)

        threads = [threading.Thread(target=make_request, args=(order.id,)) for order in orders]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join()

        # All should succeed since they're for different orders
        assert all(status == 200 for status in results)

    def test_large_transaction_amount(self, client, auth_headers, db_session, test_user,
                                    mock_validate_email, mock_validate_payment_amount,
                                    mock_create_payment_request, mock_pesapal_success_response):
        """Test handling of large transaction amounts"""
        large_order = Order(
            id='ORD_LARGE',
            user_id=test_user.id,
            total_amount=Decimal('999999.99'),
            status='pending',
            payment_status='pending',
            created_at=datetime.utcnow()
        )
        db_session.add(large_order)
        db_session.commit()

        mock_create_payment_request.return_value = mock_pesapal_success_response

        payment_data = TestDataGenerator.generate_payment_data(
            order_id=large_order.id,
            amount=float(large_order.total_amount)
        )

        response = client.post('/api/pesapal/initiate',
                             json=payment_data,
                             headers=auth_headers)

        data = assert_success_response(response)
        assert 'transaction_id' in data

    def test_minimum_transaction_amount(self, client, auth_headers, db_session, test_user,
                                      mock_validate_email, mock_create_payment_request,
                                      mock_pesapal_success_response):
        """Test handling of minimum transaction amounts"""
        small_order = Order(
            id='ORD_SMALL',
            user_id=test_user.id,
            total_amount=Decimal('1.00'),
            status='pending',
            payment_status='pending',
            created_at=datetime.utcnow()
        )
        db_session.add(small_order)
        db_session.commit()

        with patch('app.routes.payments.pesapal_routes.validate_payment_amount') as mock_validate:
            mock_validate.return_value = {"valid": True, "amount": Decimal('1.00')}
            mock_create_payment_request.return_value = mock_pesapal_success_response

            payment_data = TestDataGenerator.generate_payment_data(
                order_id=small_order.id,
                amount=1.00
            )

            response = client.post('/api/pesapal/initiate',
                                 json=payment_data,
                                 headers=auth_headers)

            data = assert_success_response(response)
            assert 'transaction_id' in data

    def test_callback_race_condition(self, client, test_transaction, valid_callback_data,
                                   mock_get_transaction_status, mock_pesapal_status_completed):
        """Test callback race condition handling"""
        test_transaction.order_tracking_id = valid_callback_data['OrderTrackingId']
        db.session.commit()

        mock_get_transaction_status.return_value = mock_pesapal_status_completed

        # Simulate concurrent callbacks
        import threading
        results = []

        def make_callback():
            response = client.post('/api/pesapal/callback', json=valid_callback_data)
            results.append(response.status_code)

        threads = [threading.Thread(target=make_callback) for _ in range(3)]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join()

        # All should succeed (idempotent)
        assert all(status == 200 for status in results)

    def test_callback_with_malformed_data(self, client):
        """Test callback with malformed data"""
        malformed_data = {
            'OrderTrackingId': None,
            'OrderMerchantReference': '',
            'InvalidField': 'value'
        }

        response = client.post('/api/pesapal/callback', json=malformed_data)
        assert_error_response(response, 400, 'Invalid callback data')

    def test_transaction_expiry_boundary(self, client, auth_headers, expired_transaction,
                                       mock_get_transaction_status):
        """Test transaction at expiry boundary"""
        mock_get_transaction_status.return_value = {'status': 'success', 'payment_status': 'PENDING'}

        response = client.get(f'/api/pesapal/status/{expired_transaction.id}',
                            headers=auth_headers)

        data = assert_success_response(response)
        # Should still return transaction data even if expired
        assert 'transaction_data' in data

    def test_database_connection_failure(self, client, auth_headers, valid_payment_data):
        """Test handling of database connection failure"""
        with patch('app.routes.payments.pesapal_routes.db.session.add',
                  side_effect=Exception("Database connection failed")):
            response = client.post('/api/pesapal/initiate',
                                 json=valid_payment_data,
                                 headers=auth_headers)

            assert_error_response(response, 500, 'Internal server error')

    def test_empty_transaction_list(self, client, auth_headers):
        """Test handling of empty transaction list"""
        response = client.get('/api/pesapal/transactions', headers=auth_headers)

        data = assert_success_response(response)
        assert data['transactions'] == []
        assert data['pagination']['total'] == 0
        assert data['pagination']['pages'] == 0

    def test_invalid_currency_code(self, client, auth_headers, valid_payment_data,
                                 mock_validate_email, mock_validate_payment_amount,
                                 mock_create_payment_request):
        """Test handling of invalid currency codes"""
        payment_data = valid_payment_data.copy()
        payment_data['currency'] = 'INVALID'

        mock_create_payment_request.return_value = {
            'status': 'error',
            'message': 'Invalid currency code'
        }

        response = client.post('/api/pesapal/initiate',
                             json=payment_data,
                             headers=auth_headers)

        assert_error_response(response, 400, 'Invalid currency')

    def test_extremely_long_description(self, client, auth_headers, valid_payment_data,
                                      mock_validate_email, mock_validate_payment_amount,
                                      mock_create_payment_request, mock_pesapal_success_response):
        """Test handling of extremely long descriptions"""
        payment_data = valid_payment_data.copy()
        payment_data['description'] = 'A' * 10000  # Very long description

        mock_create_payment_request.return_value = mock_pesapal_success_response

        response = client.post('/api/pesapal/initiate',
                             json=payment_data,
                             headers=auth_headers)

        # Should handle gracefully (truncate or reject)
        assert response.status_code in [200, 400]


class TestPesapalIntegrationScenarios:
    """Test complete integration scenarios"""

    def test_complete_payment_flow_success(self, client, auth_headers, db_session, test_user, test_order,
                                         mock_validate_email, mock_validate_payment_amount,
                                         mock_create_payment_request, mock_get_transaction_status,
                                         mock_pesapal_success_response, mock_pesapal_status_completed):
        """Test complete successful payment flow"""
        # Step 1: Initiate payment
        mock_create_payment_request.return_value = mock_pesapal_success_response

        payment_data = TestDataGenerator.generate_payment_data(
            order_id=test_order.id,
            amount=float(test_order.total_amount)
        )

        response = client.post('/api/pesapal/initiate',
                             json=payment_data,
                             headers=auth_headers)

        data = assert_success_response(response)
        transaction_id = data['transaction_id']

        # Step 2: Check status (pending)
        response = client.get(f'/api/pesapal/status/{transaction_id}',
                            headers=auth_headers)

        data = assert_success_response(response)
        assert data['transaction_status'] == 'pending'

        # Step 3: Simulate callback
        transaction = PesapalTransaction.query.get(transaction_id)
        callback_data = TestDataGenerator.generate_callback_data(
            OrderTrackingId=transaction.order_tracking_id,
            OrderMerchantReference=transaction.merchant_reference
        )

        mock_get_transaction_status.return_value = mock_pesapal_status_completed

        response = client.post('/api/pesapal/callback', json=callback_data)
        assert_success_response(response)

        # Step 4: Check final status (completed)
        response = client.get(f'/api/pesapal/status/{transaction_id}',
                            headers=auth_headers)

        data = assert_success_response(response)
        assert data['transaction_status'] == 'completed'

        # Step 5: Verify transaction in user's list
        response = client.get('/api/pesapal/transactions', headers=auth_headers)

        data = assert_success_response(response)
        assert len(data['transactions']) == 1
        assert data['transactions'][0]['status'] == 'completed'

    def test_complete_payment_flow_failure(self, client, auth_headers, db_session, test_user, test_order,
                                         mock_validate_email, mock_validate_payment_amount,
                                         mock_create_payment_request, mock_get_transaction_status,
                                         mock_pesapal_success_response, mock_pesapal_status_failed):
        """Test complete failed payment flow"""
        # Step 1: Initiate payment
        mock_create_payment_request.return_value = mock_pesapal_success_response

        payment_data = TestDataGenerator.generate_payment_data(
            order_id=test_order.id,
            amount=float(test_order.total_amount)
        )

        response = client.post('/api/pesapal/initiate',
                             json=payment_data,
                             headers=auth_headers)

        data = assert_success_response(response)
        transaction_id = data['transaction_id']

        # Step 2: Simulate failed callback
        transaction = PesapalTransaction.query.get(transaction_id)
        callback_data = TestDataGenerator.generate_callback_data(
            OrderTrackingId=transaction.order_tracking_id,
            OrderMerchantReference=transaction.merchant_reference
        )

        mock_get_transaction_status.return_value = mock_pesapal_status_failed

        response = client.post('/api/pesapal/callback', json=callback_data)
        assert_success_response(response)

        # Step 3: Check final status (failed)
        response = client.get(f'/api/pesapal/status/{transaction_id}',
                            headers=auth_headers)

        data = assert_success_response(response)
        assert data['transaction_status'] == 'failed'

        # Step 4: Verify can initiate new payment for same order
        response = client.post('/api/pesapal/initiate',
                             json=payment_data,
                             headers=auth_headers)

        # Should succeed since previous transaction failed
        assert response.status_code == 200

    def test_admin_transaction_management_flow(self, client, admin_headers, db_session, test_user):
        """Test admin transaction management flow"""
        # Create various transactions
        transactions = create_test_transactions(db_session, test_user, 10)

        # Step 1: Get all transactions
        response = client.get('/api/pesapal/admin/transactions', headers=admin_headers)

        data = assert_success_response(response)
        assert len(data['transactions']) == 10

        # Step 2: Filter by status
        response = client.get('/api/pesapal/admin/transactions?status=completed',
                            headers=admin_headers)

        data = assert_success_response(response)
        completed_count = len(data['transactions'])

        # Step 3: Get statistics
        response = client.get('/api/pesapal/admin/stats', headers=admin_headers)

        data = assert_success_response(response)
        assert data['stats']['completed_transactions'] == completed_count
        assert data['stats']['total_transactions'] == 10

        # Step 4: Filter by user
        response = client.get(f'/api/pesapal/admin/transactions?user_id={test_user.id}',
                            headers=admin_headers)

        data = assert_success_response(response)
        assert len(data['transactions']) == 10  # All belong to test_user

        # Step 5: Get statistics with date range
        from_date = (datetime.utcnow() - timedelta(days=30)).isoformat()
        to_date = datetime.utcnow().isoformat()

        response = client.get(f'/api/pesapal/admin/stats?from_date={from_date}&to_date={to_date}',
                            headers=admin_headers)

        data = assert_success_response(response)
        assert 'stats' in data

    def test_error_recovery_flow(self, client, auth_headers, valid_payment_data,
                                mock_validate_email, mock_validate_payment_amount,
                                mock_create_payment_request):
        """Test error recovery scenarios"""
        # Step 1: First attempt fails
        mock_create_payment_request.return_value = {
            'status': 'error',
            'message': 'Temporary service unavailable'
        }

        response = client.post('/api/pesapal/initiate',
                             json=valid_payment_data,
                             headers=auth_headers)

        assert_error_response(response, 400)

        # Step 2: Second attempt succeeds
        mock_create_payment_request.return_value = {
            'status': 'success',
            'order_tracking_id': 'TRK123456789',
            'redirect_url': 'https://pesapal.com/payment/redirect/123'
        }

        response = client.post('/api/pesapal/initiate',
                             json=valid_payment_data,
                             headers=auth_headers)

        data = assert_success_response(response)
        assert 'transaction_id' in data

    def test_concurrent_user_operations(self, client, auth_headers, db_session, test_user):
        """Test concurrent operations by same user"""
        # Create multiple orders for concurrent operations
        orders = []
        for i in range(5):
            order = Order(
                id=f'ORD_CONCURRENT_USER_{i}',
                user_id=test_user.id,
                total_amount=Decimal(f'{(i+1)*100}.00'),
                status='pending',
                payment_status='pending',
                created_at=datetime.utcnow()
            )
            orders.append(order)
            db_session.add(order)
        db_session.commit()

        # Simulate concurrent operations
        import threading
        results = []

        def get_transactions():
            response = client.get('/api/pesapal/transactions', headers=auth_headers)
            results.append(('GET', response.status_code))

        def check_status():
            # Create a transaction first
            transaction = PesapalTransaction(
                user_id=test_user.id,
                order_id=orders[0].id,
                merchant_reference=f'CONCURRENT_{int(datetime.utcnow().timestamp())}',
                amount=orders[0].total_amount,
                currency='KES',
                customer_email='test@example.com',
                customer_phone='254712345678',
                description='Concurrent test',
                status='pending',
                created_at=datetime.utcnow()
            )
            db_session.add(transaction)
            db_session.commit()

            response = client.get(f'/api/pesapal/status/{transaction.id}', headers=auth_headers)
            results.append(('STATUS', response.status_code))

        # Run concurrent operations
        threads = [
            threading.Thread(target=get_transactions),
            threading.Thread(target=get_transactions),
            threading.Thread(target=check_status),
            threading.Thread(target=get_transactions)
        ]

        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join()

        # All operations should succeed
        assert all(status == 200 for _, status in results)


class TestPesapalPerformance:
    """Test performance-related scenarios"""

    def test_large_transaction_list_pagination(self, client, auth_headers, db_session, test_user):
        """Test pagination with large number of transactions"""
        # Create many transactions
        transactions = create_test_transactions(db_session, test_user, 100)

        # Test first page
        response = client.get('/api/pesapal/transactions?page=1&per_page=20',
                            headers=auth_headers)

        data = assert_success_response(response)
        assert len(data['transactions']) == 20
        assert data['pagination']['total'] == 100
        assert data['pagination']['pages'] == 5

        # Test last page
        response = client.get('/api/pesapal/transactions?page=5&per_page=20',
                            headers=auth_headers)

        data = assert_success_response(response)
        assert len(data['transactions']) == 20
        assert data['pagination']['has_next'] is False

    def test_admin_stats_with_large_dataset(self, client, admin_headers, db_session, test_user):
        """Test admin statistics with large dataset"""
        # Create many transactions
        transactions = create_test_transactions(db_session, test_user, 1000)

        response = client.get('/api/pesapal/admin/stats', headers=admin_headers)

        data = assert_success_response(response)
        assert data['stats']['total_transactions'] == 1000

        # Should complete in reasonable time
        assert 'success_rate' in data['stats']
        assert 'average_transaction_amount' in data['stats']


class TestPesapalDataValidation:
    """Test comprehensive data validation"""

    def test_phone_number_formats(self, client, auth_headers, valid_payment_data,
                                 mock_validate_email, mock_validate_payment_amount,
                                 mock_create_payment_request, mock_pesapal_success_response):
        """Test various phone number formats"""
        mock_create_payment_request.return_value = mock_pesapal_success_response

        phone_formats = [
            '254712345678',
            '+254712345678',
            '0712345678',
            '712345678',
            '254 712 345 678',
            '+254 712 345 678'
        ]

        for phone in phone_formats:
            payment_data = valid_payment_data.copy()
            payment_data['customer_phone'] = phone

            response = client.post('/api/pesapal/initiate',
                                 json=payment_data,
                                 headers=auth_headers)

            # Should handle all formats gracefully
            assert response.status_code in [200, 400]

    def test_email_validation_edge_cases(self, client, auth_headers, valid_payment_data,
                                       mock_validate_payment_amount):
        """Test email validation edge cases"""
        invalid_emails = [
            '',
            'invalid',
            '@example.com',
            'test@',
            'test..test@example.com',
            'test@example',
            'test@.com'
        ]

        for email in invalid_emails:
            with patch('app.routes.payments.pesapal_routes.validate_email', return_value=False):
                payment_data = valid_payment_data.copy()
                payment_data['customer_email'] = email

                response = client.post('/api/pesapal/initiate',
                                     json=payment_data,
                                     headers=auth_headers)

                assert_error_response(response, 400, 'Invalid email')

    def test_amount_validation_edge_cases(self, client, auth_headers, valid_payment_data,
                                        mock_validate_email):
        """Test amount validation edge cases"""
        invalid_amounts = [
            -100,
            0,
            'invalid',
            None,
            float('inf'),
            float('nan')
        ]

        for amount in invalid_amounts:
            with patch('app.routes.payments.pesapal_routes.validate_payment_amount',
                      return_value={"valid": False, "error": "Invalid amount"}):
                payment_data = valid_payment_data.copy()
                payment_data['amount'] = amount

                response = client.post('/api/pesapal/initiate',
                                     json=payment_data,
                                     headers=auth_headers)

                assert_error_response(response, 400, 'Invalid amount')


# Run all tests
if __name__ == '__main__':
    pytest.main([__file__, '-v', '--tb=short'])
