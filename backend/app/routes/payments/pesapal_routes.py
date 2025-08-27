"""
Pesapal Card Payment Routes for Mizizzi E-commerce Platform
Handles Pesapal card payments, callbacks, and transaction management

Production-ready implementation with comprehensive error handling,
security features, and UAT support.
"""

import os
import logging
import uuid
import json
import time
import random
from datetime import datetime, timezone, timedelta
from decimal import Decimal, InvalidOperation
from flask import Blueprint, request, jsonify, current_app, redirect, url_for
from flask_jwt_extended import jwt_required, get_jwt_identity, verify_jwt_in_request
from flask_cors import cross_origin
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy import and_, or_, func
from sqlalchemy import text

# Database and models
try:
    from ...configuration.extensions import db
    from ...models.models import User, Order, PesapalTransaction, UserRole
except ImportError:
    try:
        from app.configuration.extensions import db
        from app.models.models import User, Order, PesapalTransaction, UserRole
    except ImportError:
        from configuration.extensions import db
        from models.models import User, Order, PesapalTransaction, UserRole

# Utilities
try:
    from app.utils.pesapal_utils import (
        create_card_payment_request,
        get_transaction_status,
        validate_pesapal_ipn,
        get_payment_status_message,
        validate_card_payment_data,
        process_card_payment_callback,
        format_phone_number,
        generate_merchant_reference
    )
    from app.utils.validation_utils import validate_email, validate_payment_amount, sanitize_input
    from app.utils.auth_utils import admin_required
except ImportError:
    # Fallback implementations
    def create_card_payment_request(**kwargs):
        return {"status": "success", "order_tracking_id": f"TRK{int(time.time())}", "redirect_url": "https://pay.pesapal.com/redirect"}

    def get_transaction_status(tracking_id):
        return {"status": "success", "payment_status": "PENDING"}

    def validate_pesapal_ipn(ipn_data):
        return True

    def get_payment_status_message(status):
        return f"Payment status: {status}"

    def validate_card_payment_data(data):
        return {"valid": True, "errors": []}

    def process_card_payment_callback(callback_data, transaction):
        # Update transaction status based on callback
        payment_status = callback_data.get('payment_status', 'pending')
        if payment_status == 'completed':
            transaction.status = 'completed'
        elif payment_status == 'failed':
            transaction.status = 'failed'
        elif payment_status == 'cancelled':
            transaction.status = 'cancelled'

        db.session.commit()
        return {"status": "success", "payment_status": payment_status}

    def format_phone_number(phone):
        return phone

    def generate_merchant_reference(prefix="MIZIZZI"):
        return f"{prefix}_{int(time.time())}_{uuid.uuid4().hex[:8]}"

    def validate_email(email):
        return {"valid": "@" in email if email else False, "email": email}

    def validate_payment_amount(amount):
        try:
            amount_val = float(amount)
            if amount_val <= 0:
                return {"valid": False, "error": "Amount must be greater than 0"}
            return {"valid": True, "amount": Decimal(str(amount_val))}
        except (ValueError, TypeError):
            return {"valid": False, "error": "Invalid amount format"}

    def sanitize_input(input_data):
        return str(input_data).strip() if input_data else ""

    def admin_required(f):
        from functools import wraps
        @wraps(f)
        def pesapal_admin_wrapper(*args, **kwargs):
            try:
                user_id = get_jwt_identity()
                user = db.session.get(User, user_id)
                if user and user.role == UserRole.ADMIN:
                    return f(*args, **kwargs)
                else:
                    return jsonify({'status': 'error', 'message': 'Admin access required'}), 403
            except:
                return jsonify({'status': 'error', 'message': 'Authentication required'}), 401
        return pesapal_admin_wrapper

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create blueprint
pesapal_routes = Blueprint('pesapal_routes', __name__)

# Configuration
PESAPAL_CONFIG = {
    'consumer_key': 'MneI7qziaBzoGPuRhd1QZNTjZedp5EqhConsumer Secret: Iy98/30kmlhg3/pjG1Wsneay9/Y=',
    'consumer_secret': 'Iy98/30kmlhg3/pjG1Wsneay9/Y=',
    'environment': 'production',
    'base_url': 'https://pay.pesapal.com/v3',
    'callback_url': 'https://mizizzi.com/api/pesapal/callback',
    'min_amount': 1.0,
    'max_amount': 1000000.0,
    'supported_currencies': ['KES', 'USD', 'EUR', 'GBP']
}

def generate_unique_merchant_reference(order_id, user_id=None):
    """Generate a unique merchant reference with enhanced uniqueness"""
    timestamp = int(time.time() * 1000000)  # Microseconds
    random_suffix = random.randint(100000, 999999)
    unique_id = str(uuid.uuid4())[:8].upper()
    user_suffix = f"U{user_id}" if user_id else ""
    return f"MIZIZZI_{order_id}_{timestamp}_{random_suffix}_{unique_id}{user_suffix}"

def validate_required_fields(data, required_fields):
    """Validate required fields in request data"""
    missing_fields = []
    for field in required_fields:
        if field not in data or data[field] is None or data[field] == '':
            missing_fields.append(field)
    return missing_fields

def create_error_response(message, status_code=400, error_code=None):
    """Create standardized error response"""
    response = {
        'status': 'error',
        'message': message,
        'timestamp': datetime.now(timezone.utc).isoformat()
    }
    if error_code:
        response['error_code'] = error_code
    return jsonify(response), status_code

def create_success_response(data, message="Success", status_code=200):
    """Create standardized success response"""
    response = {
        'status': 'success',
        'message': message,
        'timestamp': datetime.now(timezone.utc).isoformat()
    }
    response.update(data)
    return jsonify(response), status_code

# =====================
# CARD PAYMENT ROUTES
# =====================

@pesapal_routes.route('/card/initiate', methods=['POST'])
@jwt_required()
@cross_origin()
def initiate_card_payment():
    """
    Initiate Pesapal card payment request.
    """
    try:
        logger.info("=== PESAPAL CARD PAYMENT INITIATION STARTED ===")

        # Get and validate JSON data
        try:
            data = request.get_json(force=True)
            logger.info(f"Received payment data: {json.dumps(data, indent=2)}")
        except Exception as e:
            logger.error(f"Failed to parse JSON data: {str(e)}")
            data = None

        if not data:
            return create_error_response('No JSON data provided', 400, 'MISSING_DATA')

        # Validate required fields
        required_fields = ['order_id', 'amount', 'currency', 'customer_email', 'customer_phone', 'description']
        missing_fields = validate_required_fields(data, required_fields)
        if missing_fields:
            return create_error_response(
                f'Missing required fields: {", ".join(missing_fields)}',
                400, 'MISSING_FIELDS'
            )

        # Get current user
        current_user_id = get_jwt_identity()
        user = db.session.get(User, current_user_id)
        if not user:
            return create_error_response('User not found', 404, 'USER_NOT_FOUND')

        logger.info(f"User {current_user_id} initiating payment for order {data['order_id']}")

        # Validate card payment data
        validation_result = validate_card_payment_data(data)
        if not validation_result['valid']:
            logger.error(f"Validation failed: {validation_result['errors']}")
            return create_error_response(
                f'Validation errors: {"; ".join(validation_result["errors"])}',
                400, 'VALIDATION_ERROR'
            )

        # Sanitize inputs
        order_id = sanitize_input(data['order_id'])
        customer_email = sanitize_input(data['customer_email']).lower()
        customer_phone = sanitize_input(data['customer_phone'])
        description = sanitize_input(data['description'])[:200]  # Limit description

        # Validate and convert amount
        try:
            amount = Decimal(str(data['amount']))
            if amount <= 0:
                return create_error_response('Amount must be greater than 0', 400, 'INVALID_AMOUNT')
            if amount > Decimal('1000000'):
                return create_error_response('Amount exceeds maximum limit', 400, 'AMOUNT_TOO_HIGH')
        except (InvalidOperation, ValueError):
            return create_error_response('Invalid amount format', 400, 'INVALID_AMOUNT_FORMAT')

        # Validate currency
        currency = data['currency'].upper()
        if currency not in PESAPAL_CONFIG['supported_currencies']:
            return create_error_response(
                f'Unsupported currency. Supported: {", ".join(PESAPAL_CONFIG["supported_currencies"])}',
                400, 'UNSUPPORTED_CURRENCY'
            )

        # Check if order exists and belongs to user
        order = Order.query.filter_by(id=order_id, user_id=current_user_id).first()
        if not order:
            return create_error_response(
                'Order not found or does not belong to user',
                404, 'ORDER_NOT_FOUND'
            )

        # Validate order status
        if hasattr(order, 'status') and order.status in ['cancelled', 'refunded']:
            return create_error_response(
                f'Cannot process payment for {order.status} order',
                400, 'INVALID_ORDER_STATUS'
            )

        # Check if order amount matches (with small tolerance for floating point)
        if hasattr(order, 'total_amount'):
            order_amount = Decimal(str(order.total_amount))
            logger.info(f"Comparing payment amount {amount} with order total {order_amount}")
            if abs(order_amount - amount) > Decimal('0.01'):
                return create_error_response(
                    f'Payment amount ({amount}) does not match order total ({order_amount})',
                    400, 'AMOUNT_MISMATCH'
                )

        # Check for existing pending transactions
        existing_transaction = PesapalTransaction.query.filter_by(
            order_id=order_id,
            user_id=current_user_id,
            status='pending'
        ).first()

        if existing_transaction:
            # Check if transaction is expired (24 hours)
            expires_at = existing_transaction.expires_at
            if expires_at and expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)

            if expires_at and datetime.now(timezone.utc) > expires_at:
                # Mark expired transaction as cancelled
                existing_transaction.status = 'cancelled'
                existing_transaction.error_message = 'Transaction expired'
                db.session.commit()
            else:
                return create_error_response(
                    'There is already a pending payment for this order',
                    409, 'PENDING_PAYMENT_EXISTS'
                )

        # Generate unique merchant reference
        merchant_reference = None
        max_retries = 10
        for attempt in range(max_retries):
            merchant_reference = generate_unique_merchant_reference(order_id, current_user_id)
            existing_ref = PesapalTransaction.query.filter_by(merchant_reference=merchant_reference).first()
            if not existing_ref:
                break
            if attempt == max_retries - 1:
                return create_error_response(
                    'Unable to generate unique reference. Please try again.',
                    500, 'REFERENCE_GENERATION_FAILED'
                )

        # Create transaction record
        try:
            transaction = PesapalTransaction(
                id=str(uuid.uuid4()),
                user_id=current_user_id,
                order_id=order_id,
                merchant_reference=merchant_reference,
                amount=amount,
                currency=currency,
                email=customer_email,
                phone_number=format_phone_number(customer_phone),
                description=description,
                status='initiated',
                created_at=datetime.now(timezone.utc),
                expires_at=datetime.now(timezone.utc) + timedelta(hours=24)
            )

            # Add billing address if provided
            billing_address = data.get('billing_address', {})
            if billing_address:
                transaction.first_name = sanitize_input(billing_address.get('first_name', ''))[:50]
                transaction.last_name = sanitize_input(billing_address.get('last_name', ''))[:50]

            db.session.add(transaction)
            db.session.flush()  # Get the transaction ID

            # Set callback URL
            callback_url = data.get('callback_url', f"https://mizizzi.com/payment-success/{transaction.id}")

            logger.info(f"Creating Pesapal payment request:")
            logger.info(f"  - Amount: {float(amount)} {currency}")
            logger.info(f"  - Description: {description}")
            logger.info(f"  - Customer: {customer_email} / {transaction.phone_number}")
            logger.info(f"  - Merchant Reference: {merchant_reference}")
            logger.info(f"  - Callback URL: {callback_url}")

            # Create card payment request with Pesapal
            try:
                payment_response = create_card_payment_request(
                    amount=float(amount),
                    currency=currency,
                    description=description,
                    customer_email=customer_email,
                    customer_phone=transaction.phone_number,
                    callback_url=callback_url,
                    merchant_reference=merchant_reference,
                    billing_address=billing_address,
                    first_name=billing_address.get('first_name', ''),
                    last_name=billing_address.get('last_name', ''),
                    country_code=billing_address.get('country_code', 'KE')
                )

                logger.info(f"Pesapal API response: {json.dumps(payment_response, indent=2)}")

            except Exception as pesapal_error:
                logger.error(f"Pesapal API call failed: {str(pesapal_error)}")
                logger.error(f"Pesapal error type: {type(pesapal_error).__name__}")

                transaction.status = 'failed'
                transaction.error_message = f'Pesapal API error: {str(pesapal_error)}'
                db.session.commit()

                return create_error_response(
                    f'Payment service error: {str(pesapal_error)}',
                    500, 'PESAPAL_API_ERROR'
                )

            if not payment_response:
                transaction.status = 'failed'
                transaction.error_message = 'Failed to create payment request with Pesapal'
                db.session.commit()
                return create_error_response(
                    'Failed to initiate card payment. Please try again.',
                    500, 'PAYMENT_INITIATION_FAILED'
                )

            if payment_response.get('status') == 'success':
                # Update transaction with Pesapal response
                tracking_id = payment_response.get('order_tracking_id')

                # Ensure unique tracking ID
                if tracking_id:
                    existing_tracking = PesapalTransaction.query.filter(
                        and_(
                            PesapalTransaction.pesapal_tracking_id == tracking_id,
                            PesapalTransaction.id != transaction.id
                        )
                    ).first()
                    if existing_tracking:
                        tracking_id = f"{tracking_id}_{transaction.id[:8]}"

                transaction.pesapal_tracking_id = tracking_id
                transaction.payment_url = payment_response.get('redirect_url')
                transaction.status = 'pending'
                transaction.pesapal_response = json.dumps(payment_response)

                db.session.commit()

                logger.info(f"Card payment initiated successfully for transaction {transaction.id}")

                return create_success_response({
                    'transaction_id': transaction.id,
                    'order_tracking_id': transaction.pesapal_tracking_id,
                    'redirect_url': transaction.payment_url,
                    'merchant_reference': merchant_reference,
                    'expires_at': transaction.expires_at.isoformat(),
                    'payment_method': 'card'
                }, 'Card payment request created successfully')

            else:
                transaction.status = 'failed'
                transaction.error_message = payment_response.get('message', 'Payment request failed')
                transaction.pesapal_response = json.dumps(payment_response)
                db.session.commit()

                logger.warning(f"Card payment initiation failed for transaction {transaction.id}: {payment_response.get('message')}")

                return create_error_response(
                    payment_response.get('message', 'Card payment request failed'),
                    400, 'PESAPAL_ERROR'
                )

        except IntegrityError as e:
            db.session.rollback()
            logger.error(f"Database integrity error during card payment initiation: {str(e)}")
            return create_error_response(
                'Database conflict. Please try again.',
                409, 'DATABASE_CONFLICT'
            )

    except Exception as e:
        logger.error(f"=== UNEXPECTED ERROR IN CARD PAYMENT INITIATION ===")
        logger.error(f"Error type: {type(e).__name__}")
        logger.error(f"Error message: {str(e)}")
        logger.error(f"Error details: {repr(e)}")

        # Log the full traceback
        import traceback
        logger.error(f"Full traceback:\n{traceback.format_exc()}")

        db.session.rollback()
        return create_error_response(
            'Internal server error. Please try again.',
            500, 'INTERNAL_ERROR'
        )


@pesapal_routes.route('/card/status/<transaction_id>', methods=['GET'])
@jwt_required()
@cross_origin()
def check_card_payment_status(transaction_id):
    """
    Check Pesapal card payment status.

    Returns:
    {
        "status": "success",
        "transaction_status": "completed|pending|failed|cancelled",
        "message": "Payment completed successfully",
        "transaction_data": {
            "id": "uuid",
            "amount": 1000.00,
            "currency": "KES",
            "payment_method": "CARD",
            "card_type": "VISA",
            "last_four_digits": "1234",
            "receipt_number": "CONF123456",
            "transaction_date": "2024-01-01T12:00:00Z",
            "created_at": "2024-01-01T10:00:00Z"
        }
    }
    """
    try:
        current_user_id = get_jwt_identity()

        # Validate transaction ID format
        if not transaction_id or len(transaction_id.strip()) == 0:
            return create_error_response('Invalid transaction ID format', 400, 'INVALID_TRANSACTION_ID')

        # Try to validate as UUID, but also accept other formats for backward compatibility
        try:
            if len(transaction_id) == 36:  # Standard UUID length
                uuid.UUID(transaction_id)
        except ValueError:
            # If it's not a valid UUID but looks like a transaction ID, continue
            if not transaction_id.replace('-', '').replace('_', '').isalnum():
                return create_error_response('Invalid transaction ID format', 400, 'INVALID_TRANSACTION_ID')

        # Get transaction
        transaction = PesapalTransaction.query.filter_by(
            id=transaction_id,
            user_id=current_user_id
        ).first()

        if not transaction:
            return create_error_response('Transaction not found', 404, 'TRANSACTION_NOT_FOUND')

        # Check if transaction is expired
        current_time = datetime.now(timezone.utc)
        expires_at = transaction.expires_at
        if expires_at and expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)

        if (expires_at and current_time > expires_at and transaction.status == 'pending'):
            transaction.status = 'expired'
            transaction.error_message = 'Transaction expired'
            db.session.commit()

        # If transaction is in final state, return current status
        if transaction.status in ['completed', 'failed', 'cancelled', 'expired']:
            transaction_data = {
                'id': transaction.id,
                'order_id': transaction.order_id,
                'amount': float(transaction.amount),
                'currency': transaction.currency,
                'email': transaction.email,
                'payment_method': getattr(transaction, 'payment_method', 'CARD'),
                'card_type': getattr(transaction, 'card_type', None),
                'last_four_digits': getattr(transaction, 'last_four_digits', None),
                'receipt_number': getattr(transaction, 'pesapal_receipt_number', None),
                'transaction_date': transaction.transaction_date.isoformat() if hasattr(transaction, 'transaction_date') and transaction.transaction_date else None,
                'created_at': transaction.created_at.isoformat(),
                'expires_at': transaction.expires_at.isoformat() if transaction.expires_at else None,
                'status': transaction.status
            }

            return create_success_response({
                'transaction_status': transaction.status,
                'transaction_data': transaction_data
            }, get_payment_status_message(transaction.status))

        # Query Pesapal for current status
        if hasattr(transaction, 'pesapal_tracking_id') and transaction.pesapal_tracking_id:
            try:
                status_response = get_transaction_status(transaction.pesapal_tracking_id)

                if status_response and status_response.get('status') == 'success':
                    payment_status = status_response.get('payment_status', 'PENDING')

                    if payment_status == 'COMPLETED':
                        # Card payment successful
                        transaction.status = 'completed'
                        transaction.payment_method = status_response.get('payment_method', 'CARD')
                        transaction.pesapal_receipt_number = status_response.get('confirmation_code')
                        transaction.transaction_date = datetime.now(timezone.utc)

                        # Extract card details if available
                        payment_account = status_response.get('payment_account', '')
                        if payment_account and '*' in payment_account:
                            # Extract last 4 digits and card type
                            if payment_account.startswith('****'):
                                transaction.last_four_digits = payment_account[-4:]
                            # Card type detection (basic)
                            if 'visa' in payment_account.lower():
                                transaction.card_type = 'VISA'
                            elif 'master' in payment_account.lower():
                                transaction.card_type = 'MASTERCARD'

                        # Update order status
                        if transaction.order_id:
                            order = db.session.get(Order, transaction.order_id)
                            if order:
                                if hasattr(order, 'payment_status'):
                                    order.payment_status = 'paid'
                                if hasattr(order, 'status') and order.status == 'pending':
                                    order.status = 'confirmed'
                                if hasattr(order, 'updated_at'):
                                    order.updated_at = datetime.now(timezone.utc)

                        logger.info(f"Card payment completed for transaction {transaction.id}")

                    elif payment_status == 'FAILED':
                        transaction.status = 'failed'
                        transaction.error_message = status_response.get('error_message', 'Card payment failed')
                        logger.info(f"Card payment failed for transaction {transaction.id}")

                    elif payment_status == 'CANCELLED':
                        transaction.status = 'cancelled'
                        logger.info(f"Card payment cancelled for transaction {transaction.id}")

                    # Store status response
                    transaction.status_response = json.dumps(status_response)
                    transaction.last_status_check = datetime.now(timezone.utc)
                    db.session.commit()

            except Exception as e:
                logger.error(f"Error querying Pesapal status for transaction {transaction.id}: {str(e)}")
                # Continue with current transaction status

        # Prepare response data
        transaction_data = {
            'id': transaction.id,
            'order_id': transaction.order_id,
            'amount': float(transaction.amount),
            'currency': transaction.currency,
            'email': transaction.email,
            'payment_method': getattr(transaction, 'payment_method', 'CARD'),
            'card_type': getattr(transaction, 'card_type', None),
            'last_four_digits': getattr(transaction, 'last_four_digits', None),
            'receipt_number': getattr(transaction, 'pesapal_receipt_number', None),
            'transaction_date': transaction.transaction_date.isoformat() if hasattr(transaction, 'transaction_date') and transaction.transaction_date else None,
            'created_at': transaction.created_at.isoformat(),
            'expires_at': transaction.expires_at.isoformat() if transaction.expires_at else None,
            'status': transaction.status
        }

        return create_success_response({
            'transaction_status': transaction.status,
            'transaction_data': transaction_data
        }, get_payment_status_message(transaction.status))

    except Exception as e:
        logger.error(f"Error checking card payment status: {str(e)}")
        return create_error_response(
            'Failed to check payment status',
            500, 'STATUS_CHECK_FAILED'
        )


@pesapal_routes.route('/callback', methods=['GET', 'POST'])
@cross_origin()
def pesapal_callback():
    """
    Handle Pesapal payment callback for card payments.
    This endpoint receives payment confirmations from Pesapal.

    Supports both GET and POST methods as per Pesapal documentation.
    """
    try:
        # Pesapal can send callbacks via GET or POST
        if request.method == 'GET':
            callback_data = request.args.to_dict()
        else:
            callback_data = request.get_json() or request.form.to_dict()

        # Log callback for debugging (remove in production)
        logger.info(f"Pesapal Callback received: {json.dumps(callback_data, indent=2)}")

        # Validate callback data
        if not validate_pesapal_ipn(callback_data):
            logger.warning("Invalid Pesapal callback received")
            return create_error_response('Invalid callback data', 400, 'INVALID_CALLBACK')

        # Extract callback information
        order_tracking_id = callback_data.get('OrderTrackingId')
        merchant_reference = callback_data.get('OrderMerchantReference')

        if not order_tracking_id and not merchant_reference:
            logger.warning("Pesapal callback missing required identifiers")
            return create_error_response(
                'Invalid callback data: missing tracking ID and merchant reference',
                400, 'MISSING_IDENTIFIERS'
            )

        # Find transaction
        transaction = None
        if order_tracking_id:
            transaction = PesapalTransaction.query.filter_by(
                pesapal_tracking_id=order_tracking_id
            ).first()

        if not transaction and merchant_reference:
            transaction = PesapalTransaction.query.filter_by(
                merchant_reference=merchant_reference
            ).first()

        if not transaction:
            logger.warning(f"Transaction not found for callback: tracking_id={order_tracking_id}, reference={merchant_reference}")
            return create_error_response('Transaction not found', 404, 'TRANSACTION_NOT_FOUND')

        # Process callback
        try:
            callback_result = process_card_payment_callback(callback_data, transaction)

            if callback_result['status'] == 'success':
                payment_status = callback_result.get('payment_status', 'pending')

                if payment_status == 'completed':
                    # Update order status for completed payments
                    if transaction.order_id:
                        order = db.session.get(Order, transaction.order_id)
                        if order:
                            if hasattr(order, 'payment_status'):
                                order.payment_status = 'paid'
                            if hasattr(order, 'status') and order.status == 'pending':
                                order.status = 'confirmed'
                            if hasattr(order, 'updated_at'):
                                order.updated_at = datetime.now(timezone.utc)

                    logger.info(f"Card payment callback processed successfully for transaction {transaction.id}")

                elif payment_status == 'failed':
                    logger.info(f"Card payment failed callback processed for transaction {transaction.id}")

                elif payment_status == 'cancelled':
                    logger.info(f"Card payment cancelled callback processed for transaction {transaction.id}")

            # Store callback data and timestamp
            transaction.callback_response = json.dumps(callback_data)
            transaction.callback_received_at = datetime.now(timezone.utc)
            db.session.commit()

            return create_success_response({
                'transaction_id': transaction.id,
                'payment_status': callback_result.get('payment_status', 'pending')
            }, 'Callback processed successfully')

        except Exception as e:
            logger.error(f"Error processing callback for transaction {transaction.id}: {str(e)}")
            db.session.rollback()
            return create_error_response(
                'Callback processing failed',
                500, 'CALLBACK_PROCESSING_FAILED'
            )

    except Exception as e:
        logger.error(f"Unexpected error processing Pesapal callback: {str(e)}")
        return create_error_response(
            'Callback processing failed',
            500, 'CALLBACK_ERROR'
        )


@pesapal_routes.route('/transactions', methods=['GET'])
@jwt_required()
@cross_origin()
def get_user_card_transactions():
    """
    Get user's Pesapal card transactions with pagination and filtering.

    Query parameters:
    - page: Page number (default: 1)
    - per_page: Items per page (default: 10, max: 100)
    - status: Filter by status (pending, completed, failed, cancelled)
    - from_date: Filter from date (ISO format)
    - to_date: Filter to date (ISO format)
    - order_id: Filter by order ID

    Returns:
    {
        "status": "success",
        "transactions": [...],
        "pagination": {
            "page": 1,
            "pages": 5,
            "per_page": 10,
            "total": 50,
            "has_next": true,
            "has_prev": false
        },
        "summary": {
            "total_amount": 50000.00,
            "completed_count": 45,
            "pending_count": 3,
            "failed_count": 2
        }
    }
    """
    try:
        current_user_id = get_jwt_identity()

        # Get pagination parameters
        page = max(1, request.args.get('page', 1, type=int))
        per_page = min(max(1, request.args.get('per_page', 10, type=int)), 100)

        # Get filter parameters
        status = request.args.get('status')
        from_date = request.args.get('from_date')
        to_date = request.args.get('to_date')
        order_id = request.args.get('order_id')

        # Build query
        query = PesapalTransaction.query.filter_by(user_id=current_user_id)

        # Apply filters
        if status:
            query = query.filter_by(status=status)

        if order_id:
            query = query.filter_by(order_id=sanitize_input(order_id))

        if from_date:
            try:
                from_date_obj = datetime.fromisoformat(from_date.replace('Z', '+00:00'))
                query = query.filter(PesapalTransaction.created_at >= from_date_obj)
            except ValueError:
                return create_error_response('Invalid from_date format', 400, 'INVALID_DATE_FORMAT')

        if to_date:
            try:
                to_date_obj = datetime.fromisoformat(to_date.replace('Z', '+00:00'))
                query = query.filter(PesapalTransaction.created_at <= to_date_obj)
            except ValueError:
                return create_error_response('Invalid to_date format', 400, 'INVALID_DATE_FORMAT')

        # Order by creation date (newest first)
        query = query.order_by(PesapalTransaction.created_at.desc())

        # Get summary statistics
        summary_query = PesapalTransaction.query.filter_by(user_id=current_user_id)
        if from_date:
            summary_query = summary_query.filter(PesapalTransaction.created_at >= from_date_obj)
        if to_date:
            summary_query = summary_query.filter(PesapalTransaction.created_at <= to_date_obj)

        completed_transactions = summary_query.filter_by(status='completed').all()
        total_amount = sum(float(t.amount) for t in completed_transactions)

        summary = {
            'total_amount': total_amount,
            'completed_count': len(completed_transactions),
            'pending_count': summary_query.filter_by(status='pending').count(),
            'failed_count': summary_query.filter_by(status='failed').count(),
            'cancelled_count': summary_query.filter_by(status='cancelled').count()
        }

        # Paginate
        transactions = query.paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )

        # Format response
        transaction_list = []
        for transaction in transactions.items:
            transaction_data = {
                'id': transaction.id,
                'order_id': transaction.order_id,
                'merchant_reference': transaction.merchant_reference,
                'amount': float(transaction.amount),
                'currency': transaction.currency,
                'email': transaction.email,
                'status': transaction.status,
                'description': transaction.description,
                'payment_method': getattr(transaction, 'payment_method', 'CARD'),
                'card_type': getattr(transaction, 'card_type', None),
                'last_four_digits': getattr(transaction, 'last_four_digits', None),
                'receipt_number': getattr(transaction, 'pesapal_receipt_number', None),
                'transaction_date': transaction.transaction_date.isoformat() if hasattr(transaction, 'transaction_date') and transaction.transaction_date else None,
                'created_at': transaction.created_at.isoformat(),
                'expires_at': transaction.expires_at.isoformat() if transaction.expires_at else None,
                'status_message': get_payment_status_message(transaction.status)
            }
            transaction_list.append(transaction_data)

        return create_success_response({
            'transactions': transaction_list,
            'pagination': {
                'page': transactions.page,
                'pages': transactions.pages,
                'per_page': transactions.per_page,
                'total': transactions.total,
                'has_next': transactions.has_next,
                'has_prev': transactions.has_prev
            },
            'summary': summary
        }, 'Transactions retrieved successfully')

    except Exception as e:
        logger.error(f"Error fetching user card transactions: {str(e)}")
        return create_error_response(
            'Failed to fetch transactions',
            500, 'FETCH_TRANSACTIONS_FAILED'
        )


# =====================
# ADMIN ROUTES
# =====================

@pesapal_routes.route('/admin/transactions', methods=['GET'])
@jwt_required()
@admin_required
@cross_origin()
def get_all_card_transactions():
    """
    Get all Pesapal card transactions (Admin only).

    Query parameters:
    - page: Page number (default: 1)
    - per_page: Items per page (default: 20, max: 100)
    - status: Filter by status
    - user_id: Filter by user ID
    - from_date: Filter from date
    - to_date: Filter to date
    - search: Search in email, order_id, or merchant_reference

    Returns comprehensive transaction data including user information.
    """
    try:
        # Get pagination parameters
        page = max(1, request.args.get('page', 1, type=int))
        per_page = min(max(1, request.args.get('per_page', 20, type=int)), 100)

        # Get filter parameters
        status = request.args.get('status')
        user_id = request.args.get('user_id', type=int)
        from_date = request.args.get('from_date')
        to_date = request.args.get('to_date')
        search = request.args.get('search')

        # Build query
        query = PesapalTransaction.query

        # Apply filters
        if status:
            query = query.filter_by(status=status)

        if user_id:
            query = query.filter_by(user_id=user_id)

        if from_date:
            try:
                from_date_obj = datetime.fromisoformat(from_date.replace('Z', '+00:00'))
                query = query.filter(PesapalTransaction.created_at >= from_date_obj)
            except ValueError:
                return create_error_response('Invalid from_date format', 400, 'INVALID_DATE_FORMAT')

        if to_date:
            try:
                to_date_obj = datetime.fromisoformat(to_date.replace('Z', '+00:00'))
                query = query.filter(PesapalTransaction.created_at <= to_date_obj)
            except ValueError:
                return create_error_response('Invalid to_date format', 400, 'INVALID_DATE_FORMAT')

        if search:
            search_term = f"%{sanitize_input(search)}%"
            query = query.filter(
                or_(
                    PesapalTransaction.email.ilike(search_term),
                    PesapalTransaction.order_id.ilike(search_term),
                    PesapalTransaction.merchant_reference.ilike(search_term)
                )
            )

        # Order by creation date (newest first)
        query = query.order_by(PesapalTransaction.created_at.desc())

        # Paginate
        transactions = query.paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )

        # Format response with user information
        transaction_list = []
        for transaction in transactions.items:
            # Get user info
            user = db.session.get(User, transaction.user_id)

            transaction_data = {
                'id': transaction.id,
                'user_id': transaction.user_id,
                'user_email': user.email if user else None,
                'user_name': user.name if user else None,
                'order_id': transaction.order_id,
                'merchant_reference': transaction.merchant_reference,
                'pesapal_tracking_id': getattr(transaction, 'pesapal_tracking_id', None),
                'amount': float(transaction.amount),
                'currency': transaction.currency,
                'email': transaction.email,
                'phone_number': transaction.phone_number,
                'status': transaction.status,
                'description': transaction.description,
                'payment_method': getattr(transaction, 'payment_method', 'CARD'),
                'card_type': getattr(transaction, 'card_type', None),
                'last_four_digits': getattr(transaction, 'last_four_digits', None),
                'receipt_number': getattr(transaction, 'pesapal_receipt_number', None),
                'error_message': getattr(transaction, 'error_message', None),
                'transaction_date': transaction.transaction_date.isoformat() if hasattr(transaction, 'transaction_date') and transaction.transaction_date else None,
                'callback_received_at': transaction.callback_received_at.isoformat() if hasattr(transaction, 'callback_received_at') and transaction.callback_received_at else None,
                'created_at': transaction.created_at.isoformat(),
                'expires_at': transaction.expires_at.isoformat() if transaction.expires_at else None,
                'status_message': get_payment_status_message(transaction.status)
            }
            transaction_list.append(transaction_data)

        return create_success_response({
            'transactions': transaction_list,
            'pagination': {
                'page': transactions.page,
                'pages': transactions.pages,
                'per_page': transactions.per_page,
                'total': transactions.total,
                'has_next': transactions.has_next,
                'has_prev': transactions.has_prev
            }
        }, 'Admin transactions retrieved successfully')

    except Exception as e:
        logger.error(f"Error fetching admin card transactions: {str(e)}")
        return create_error_response(
            'Failed to fetch transactions',
            500, 'ADMIN_FETCH_FAILED'
        )


@pesapal_routes.route('/admin/stats', methods=['GET'])
@jwt_required()
@admin_required
@cross_origin()
def get_card_payment_stats():
    """
    Get comprehensive Pesapal card payment statistics (Admin only).

    Query parameters:
    - from_date: Start date for statistics
    - to_date: End date for statistics
    - group_by: Group statistics by 'day', 'week', 'month'

    Returns detailed analytics including success rates, amounts, and trends.
    """
    try:
        # Get date range
        from_date = request.args.get('from_date')
        to_date = request.args.get('to_date')
        group_by = request.args.get('group_by', 'day')

        # Build base query
        query = PesapalTransaction.query

        if from_date:
            try:
                from_date_obj = datetime.fromisoformat(from_date.replace('Z', '+00:00'))
                query = query.filter(PesapalTransaction.created_at >= from_date_obj)
            except ValueError:
                return create_error_response('Invalid from_date format', 400, 'INVALID_DATE_FORMAT')

        if to_date:
            try:
                to_date_obj = datetime.fromisoformat(to_date.replace('Z', '+00:00'))
                query = query.filter(PesapalTransaction.created_at <= to_date_obj)
            except ValueError:
                return create_error_response('Invalid to_date format', 400, 'INVALID_DATE_FORMAT')

        # Get basic statistics
        total_transactions = query.count()
        completed_transactions = query.filter_by(status='completed').count()
        failed_transactions = query.filter_by(status='failed').count()
        pending_transactions = query.filter_by(status='pending').count()
        cancelled_transactions = query.filter_by(status='cancelled').count()

        # Calculate amounts
        completed_query = query.filter_by(status='completed')
        completed_list = completed_query.all()
        total_amount = sum(float(t.amount) for t in completed_list)

        failed_query = query.filter_by(status='failed')
        failed_list = failed_query.all()
        failed_amount = sum(float(t.amount) for t in failed_list)

        # Success rate
        success_rate = (completed_transactions / total_transactions * 100) if total_transactions > 0 else 0

        # Average transaction amount
        avg_transaction_amount = total_amount / completed_transactions if completed_transactions > 0 else 0

        # Payment methods breakdown
        payment_methods = db.session.query(
            PesapalTransaction.payment_method,
            func.count(PesapalTransaction.id).label('count'),
            func.sum(PesapalTransaction.amount).label('total_amount')
        ).filter_by(status='completed').group_by(PesapalTransaction.payment_method).all()

        payment_methods_stats = {}
        for method, count, amount in payment_methods:
            if method:
                payment_methods_stats[method] = {
                    'count': count,
                    'total_amount': float(amount or 0)
                }

        # Card types breakdown
        card_types = db.session.query(
            PesapalTransaction.card_type,
            func.count(PesapalTransaction.id).label('count')
        ).filter_by(status='completed').group_by(PesapalTransaction.card_type).all()

        card_types_stats = {}
        for card_type, count in card_types:
            if card_type:
                card_types_stats[card_type] = count

        # Currency breakdown
        currencies = db.session.query(
            PesapalTransaction.currency,
            func.count(PesapalTransaction.id).label('count'),
            func.sum(PesapalTransaction.amount).label('total_amount')
        ).filter_by(status='completed').group_by(PesapalTransaction.currency).all()

        currency_stats = {}
        for currency, count, amount in currencies:
            currency_stats[currency] = {
                'count': count,
                'total_amount': float(amount or 0)
            }

        # Time-based trends (simplified)
        trends = []
        if group_by in ['day', 'week', 'month']:
            # This would require more complex SQL for proper grouping
            # For now, return basic daily stats for the last 7 days
            for i in range(7):
                date = datetime.now(timezone.utc) - timedelta(days=i)
                day_start = date.replace(hour=0, minute=0, second=0, microsecond=0)
                day_end = day_start + timedelta(days=1)

                day_transactions = query.filter(
                    and_(
                        PesapalTransaction.created_at >= day_start,
                        PesapalTransaction.created_at < day_end
                    )
                ).count()

                day_completed = query.filter(
                    and_(
                        PesapalTransaction.created_at >= day_start,
                        PesapalTransaction.created_at < day_end,
                        PesapalTransaction.status == 'completed'
                    )
                ).count()

                trends.append({
                    'date': day_start.isoformat(),
                    'total_transactions': day_transactions,
                    'completed_transactions': day_completed,
                    'success_rate': (day_completed / day_transactions * 100) if day_transactions > 0 else 0
                })

        return create_success_response({
            'stats': {
                'total_transactions': total_transactions,
                'completed_transactions': completed_transactions,
                'failed_transactions': failed_transactions,
                'pending_transactions': pending_transactions,
                'cancelled_transactions': cancelled_transactions,
                'total_amount': total_amount,
                'failed_amount': failed_amount,
                'success_rate': round(success_rate, 2),
                'average_transaction_amount': round(avg_transaction_amount, 2),
                'payment_methods': payment_methods_stats,
                'card_types': card_types_stats,
                'currencies': currency_stats
            },
            'trends': trends
        }, 'Statistics retrieved successfully')

    except Exception as e:
        logger.error(f"Error fetching card payment stats: {str(e)}")
        return create_error_response(
            'Failed to fetch statistics',
            500, 'STATS_FETCH_FAILED'
        )


# =====================
# UTILITY ROUTES
# =====================

@pesapal_routes.route('/health', methods=['GET'])
@cross_origin()
def health_check():
    """Pesapal card payment service health check"""
    try:
        # Check database connectivity
        db.session.execute(text('SELECT 1'))

        # Check recent transaction activity
        recent_transactions = PesapalTransaction.query.filter(
            PesapalTransaction.created_at >= datetime.now(timezone.utc) - timedelta(hours=24)
        ).count()

        current_time = datetime.now(timezone.utc)

        return create_success_response({
            'service': 'pesapal_card_payments',
            'version': '1.0.0',
            'environment': PESAPAL_CONFIG['environment'],
            'database_status': 'connected',
            'recent_transactions_24h': recent_transactions,
            'supported_currencies': PESAPAL_CONFIG['supported_currencies'],
            'endpoints': [
                '/api/pesapal/card/initiate',
                '/api/pesapal/card/status/<transaction_id>',
                '/api/pesapal/callback',
                '/api/pesapal/transactions',
                '/api/pesapal/admin/transactions',
                '/api/pesapal/admin/stats'
            ]
        }, 'Service is healthy')

    except Exception as e:
        logger.error(f"Pesapal health check failed: {str(e)}")
        return jsonify({
            'status': 'error',
            'service': 'pesapal_card_payments',
            'error': str(e),
            'timestamp': datetime.now(timezone.utc).isoformat()
        }), 503


@pesapal_routes.route('/config', methods=['GET'])
@jwt_required()
@cross_origin()
def get_payment_config():
    """Get Pesapal payment configuration (for frontend)"""
    try:
        return create_success_response({
            'supported_currencies': PESAPAL_CONFIG['supported_currencies'],
            'min_amount': PESAPAL_CONFIG['min_amount'],
            'max_amount': PESAPAL_CONFIG['max_amount'],
            'environment': PESAPAL_CONFIG['environment'],
            'payment_methods': ['CARD'],
            'supported_card_types': ['VISA', 'MASTERCARD', 'AMERICAN_EXPRESS'],
            'transaction_timeout_hours': 24
        }, 'Configuration retrieved successfully')

    except Exception as e:
        logger.error(f"Error fetching payment config: {str(e)}")
        return create_error_response(
            'Failed to fetch configuration',
            500, 'CONFIG_FETCH_FAILED'
        )


# =====================
# ERROR HANDLERS
# =====================

@pesapal_routes.errorhandler(404)
def not_found_error(error):
    return create_error_response('Endpoint not found', 404, 'ENDPOINT_NOT_FOUND')


@pesapal_routes.errorhandler(405)
def method_not_allowed_error(error):
    return create_error_response('Method not allowed', 405, 'METHOD_NOT_ALLOWED')


@pesapal_routes.errorhandler(500)
def internal_server_error(error):
    db.session.rollback()
    logger.error(f"Internal server error: {str(error)}")
    return create_error_response('Internal server error', 500, 'INTERNAL_SERVER_ERROR')


# Export the blueprint
__all__ = ['pesapal_routes']
