"""
Flutterwave Card Payment API Routes for Mizizzi E-commerce Platform.
Handles all card payment operations for both users and admins.
"""

from flask import Blueprint, jsonify, request, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from flask_cors import cross_origin
import logging
from datetime import datetime
import json
import traceback

from ...models.models import db, PaymentTransaction, PaymentStatus, User, Order, OrderStatus
from ...services.flutterwave_service import flutterwave_service, FlutterwaveError
from ...validations.validation import admin_required

# Set up logger
logger = logging.getLogger(__name__)

# Create blueprint
card_routes = Blueprint('card_routes', __name__)

# Helper function to handle OPTIONS requests
def handle_options_request():
    response = jsonify({'status': 'ok'})
    response.headers.add('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    return response

# =====================
# USER ENDPOINTS
# =====================

@card_routes.route('/initiate', methods=['POST', 'OPTIONS'])
@cross_origin()
@jwt_required()
def initiate_card_payment():
    """
    Initiate a card payment with Flutterwave.

    Request Body:
        amount (float): Amount to charge
        email (str): Customer's email
        phone (str): Customer's phone number
        name (str): Customer's name
        reference (str, optional): Payment reference
        currency (str, optional): Currency code (default: KES)
        redirect_url (str, optional): Redirect URL after payment
        card_details (dict, optional): Card details for direct charge

    Returns:
        JSON with payment initiation status
    """
    if request.method == 'OPTIONS':
        return handle_options_request()

    user_id = get_jwt_identity()

    try:
        data = request.get_json()

        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400

        # Validate required fields
        required_fields = ['amount', 'email', 'phone', 'name']
        missing_fields = [field for field in required_fields if field not in data]

        if missing_fields:
            return jsonify({
                'success': False,
                'error': f"Missing required fields: {', '.join(missing_fields)}"
            }), 400

        amount = data.get('amount')
        email = data.get('email')
        phone = data.get('phone')
        name = data.get('name')
        reference = data.get('reference', f"CARD-{user_id}-{int(datetime.now().timestamp())}")
        currency = data.get('currency', 'KES')
        redirect_url = data.get('redirect_url')
        card_details = data.get('card_details')

        logger.info(f"User {user_id} initiating card payment: {amount} {currency}")

        # Initiate card payment using the service
        try:
            payment_response = flutterwave_service.initiate_card_payment(
                amount=amount,
                email=email,
                phone_number=phone,
                name=name,
                tx_ref=reference,
                currency=currency,
                redirect_url=redirect_url,
                card_details=card_details
            )

            if not payment_response:
                return jsonify({
                    'success': False,
                    'error': 'Failed to initiate card payment'
                }), 500

            # Extract payment data
            payment_data = payment_response.get('data', {})

            # Create transaction record
            transaction = PaymentTransaction(
                user_id=user_id,
                amount=float(amount),
                payment_method_id=1,  # Assuming 1 is Card
                transaction_type="card_payment",
                reference_id=reference,
                provider="flutterwave",
                provider_reference=payment_data.get('id'),
                status=PaymentStatus.PENDING,
                transaction_metadata=payment_response
            )

            db.session.add(transaction)
            db.session.commit()

            return jsonify({
                'success': True,
                'message': 'Card payment initiated successfully',
                'data': {
                    'transaction_id': transaction.id,
                    'flutterwave_id': payment_data.get('id'),
                    'tx_ref': payment_data.get('tx_ref'),
                    'flw_ref': payment_data.get('flw_ref'),
                    'amount': float(amount),
                    'currency': currency,
                    'status': payment_data.get('status'),
                    'payment_link': payment_data.get('link'),
                    'redirect_url': payment_data.get('redirect_url'),
                    'reference': reference
                }
            }), 201

        except FlutterwaveError as e:
            logger.error(f"Flutterwave error for user {user_id}: {str(e)}")
            return jsonify({
                'success': False,
                'error': str(e),
                'error_code': e.error_code,
                'details': e.details
            }), 400

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error initiating card payment for user {user_id}: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': f"Failed to initiate payment: {str(e)}"
        }), 500

@card_routes.route('/status/<int:transaction_id>', methods=['GET', 'OPTIONS'])
@cross_origin()
@jwt_required()
def get_card_transaction_status(transaction_id):
    """
    Check status of a specific card transaction.

    Path Parameters:
        transaction_id (int): ID of the transaction to check

    Returns:
        JSON with transaction status
    """
    if request.method == 'OPTIONS':
        return handle_options_request()

    user_id = get_jwt_identity()

    try:
        # Get transaction
        transaction = PaymentTransaction.query.filter_by(
            id=transaction_id,
            user_id=user_id,
            provider="flutterwave"
        ).first()

        if not transaction:
            return jsonify({
                'success': False,
                'error': 'Transaction not found'
            }), 404

        # Verify transaction with Flutterwave if we have a provider reference
        if transaction.provider_reference:
            try:
                verification_response = flutterwave_service.verify_transaction(transaction.provider_reference)

                # Update transaction based on verification
                if verification_response.get('status') == 'success':
                    verification_data = verification_response.get('data', {})
                    status = verification_data.get('status')

                    if status == 'successful':
                        transaction.status = PaymentStatus.PAID
                        transaction.completed_at = datetime.now()
                    elif status == 'failed':
                        transaction.status = PaymentStatus.FAILED

                    # Update metadata
                    transaction.transaction_metadata = {
                        **transaction.transaction_metadata,
                        'verification': verification_response
                    }

                    db.session.commit()

            except FlutterwaveError as e:
                logger.warning(f"Failed to verify Flutterwave transaction {transaction_id}: {str(e)}")

        return jsonify({
            'success': True,
            'data': {
                'transaction_id': transaction.id,
                'status': transaction.status.value if hasattr(transaction.status, 'value') else str(transaction.status),
                'amount': float(transaction.amount),
                'provider_reference': transaction.provider_reference,
                'created_at': transaction.created_at.isoformat() if transaction.created_at else None,
                'completed_at': transaction.completed_at.isoformat() if transaction.completed_at else None,
                'metadata': transaction.transaction_metadata
            }
        }), 200

    except Exception as e:
        logger.error(f"Error checking card transaction status: {str(e)}")
        return jsonify({
            'success': False,
            'error': f"Failed to check transaction status: {str(e)}"
        }), 500

@card_routes.route('/retry/<int:transaction_id>', methods=['POST', 'OPTIONS'])
@cross_origin()
@jwt_required()
def retry_card_payment(transaction_id):
    """
    Retry a failed/pending card transaction.

    Path Parameters:
        transaction_id (int): ID of the transaction to retry

    Request Body:
        card_details (dict, optional): New card details to use

    Returns:
        JSON with retry status
    """
    if request.method == 'OPTIONS':
        return handle_options_request()

    user_id = get_jwt_identity()

    try:
        # Get transaction
        transaction = PaymentTransaction.query.filter_by(
            id=transaction_id,
            user_id=user_id,
            provider="flutterwave"
        ).first()

        if not transaction:
            return jsonify({
                'success': False,
                'error': 'Transaction not found'
            }), 404

        # Check if transaction can be retried
        if transaction.status == PaymentStatus.PAID:
            return jsonify({
                'success': False,
                'error': 'Transaction is already completed'
            }), 400

        data = request.get_json() or {}
        card_details = data.get('card_details')

        # Get original transaction metadata
        original_metadata = transaction.transaction_metadata or {}
        original_data = original_metadata.get('data', {})

        logger.info(f"User {user_id} retrying card payment {transaction_id}")

        # Retry card payment
        try:
            payment_response = flutterwave_service.initiate_card_payment(
                amount=float(transaction.amount),
                email=original_data.get('customer', {}).get('email', 'retry@example.com'),
                phone_number=original_data.get('customer', {}).get('phone_number', ''),
                name=original_data.get('customer', {}).get('name', 'Retry Customer'),
                tx_ref=f"{transaction.reference_id}-RETRY-{int(datetime.now().timestamp())}",
                currency=original_data.get('currency', 'KES'),
                card_details=card_details
            )

            if not payment_response:
                return jsonify({
                    'success': False,
                    'error': 'Failed to retry card payment'
                }), 500

            # Extract payment data
            payment_data = payment_response.get('data', {})

            # Update transaction
            transaction.provider_reference = payment_data.get('id')
            transaction.status = PaymentStatus.PENDING
            transaction.transaction_metadata = {
                **transaction.transaction_metadata,
                'retry': payment_response,
                'retried_at': datetime.now().isoformat()
            }
            transaction.updated_at = datetime.now()

            db.session.commit()

            return jsonify({
                'success': True,
                'message': 'Card payment retry initiated successfully',
                'data': {
                    'transaction_id': transaction.id,
                    'flutterwave_id': payment_data.get('id'),
                    'tx_ref': payment_data.get('tx_ref'),
                    'flw_ref': payment_data.get('flw_ref'),
                    'amount': float(transaction.amount),
                    'status': payment_data.get('status'),
                    'payment_link': payment_data.get('link'),
                    'redirect_url': payment_data.get('redirect_url')
                }
            }), 200

        except FlutterwaveError as e:
            logger.error(f"Flutterwave retry error for user {user_id}: {str(e)}")
            return jsonify({
                'success': False,
                'error': str(e),
                'error_code': e.error_code,
                'details': e.details
            }), 400

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error retrying card payment: {str(e)}")
        return jsonify({
            'success': False,
            'error': f"Failed to retry payment: {str(e)}"
        }), 500

@card_routes.route('/callback', methods=['POST', 'OPTIONS'])
@cross_origin()
def card_callback():
    """
    Endpoint to receive Flutterwave webhooks/callbacks.

    Request Body:
        Flutterwave webhook data

    Returns:
        JSON acknowledgment
    """
    if request.method == 'OPTIONS':
        return handle_options_request()

    try:
        # Get webhook data
        webhook_data = request.get_json()

        if not webhook_data:
            logger.error("Empty Flutterwave webhook data")
            return jsonify({
                'success': False,
                'error': 'Empty webhook data'
            }), 400

        logger.info(f"Flutterwave webhook received: {json.dumps(webhook_data)}")

        # Verify webhook signature (optional but recommended)
        signature = request.headers.get('verif-hash')
        if signature:
            payload = request.get_data(as_text=True)
            if not flutterwave_service.verify_webhook_signature(payload, signature):
                logger.warning("Invalid Flutterwave webhook signature")
                return jsonify({
                    'success': False,
                    'error': 'Invalid webhook signature'
                }), 401

        # Process webhook using the service
        processed_data = flutterwave_service.process_webhook(webhook_data)

        if not processed_data:
            logger.error("Failed to process Flutterwave webhook")
            return jsonify({
                'success': False,
                'error': 'Failed to process webhook'
            }), 400

        # Find transaction by provider reference (Flutterwave ID)
        flutterwave_id = processed_data.get('transaction_id')
        if not flutterwave_id:
            logger.error("No transaction ID in webhook")
            return jsonify({
                'success': False,
                'error': 'No transaction ID in webhook'
            }), 400

        transaction = PaymentTransaction.query.filter_by(
            provider="flutterwave",
            provider_reference=str(flutterwave_id)
        ).first()

        if transaction:
            # Update transaction based on webhook
            status = processed_data.get('status')

            if status == 'successful':
                # Payment successful
                transaction.status = PaymentStatus.PAID
                transaction.completed_at = datetime.now()

                # Update order status if this is for an order
                if transaction.reference_id and transaction.reference_id.startswith('ORDER'):
                    order_id = transaction.reference_id.replace('ORDER', '')
                    try:
                        order = Order.query.get(int(order_id))
                        if order:
                            order.payment_status = PaymentStatus.PAID
                            if order.status == OrderStatus.PENDING:
                                order.status = OrderStatus.PROCESSING
                    except (ValueError, TypeError):
                        pass
            elif status == 'failed':
                # Payment failed
                transaction.status = PaymentStatus.FAILED

            # Update transaction metadata
            transaction.transaction_metadata = {
                **transaction.transaction_metadata,
                'webhook': processed_data
            }

            db.session.commit()

            logger.info(f"Transaction {transaction.id} updated from Flutterwave webhook")

            return jsonify({
                'success': True,
                'message': 'Webhook processed successfully',
                'transaction_id': transaction.id
            }), 200
        else:
            logger.warning(f"No matching transaction found for Flutterwave ID: {flutterwave_id}")

            return jsonify({
                'success': True,
                'message': 'Webhook received but no matching transaction found',
                'flutterwave_id': flutterwave_id
            }), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error processing Flutterwave webhook: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': f"Failed to process webhook: {str(e)}"
        }), 500

@card_routes.route('/transactions', methods=['GET', 'OPTIONS'])
@cross_origin()
@jwt_required()
def get_user_card_transactions():
    """
    List user's card transactions with filters.

    Query Parameters:
        page (int): Page number (default: 1)
        per_page (int): Items per page (default: 10)
        status (str): Filter by status (optional)
        start_date (str): Start date filter (YYYY-MM-DD)
        end_date (str): End date filter (YYYY-MM-DD)

    Returns:
        JSON with user's card transactions
    """
    if request.method == 'OPTIONS':
        return handle_options_request()

    user_id = get_jwt_identity()

    try:
        # Get query parameters
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        status = request.args.get('status')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')

        # Build query
        query = PaymentTransaction.query.filter_by(
            user_id=user_id,
            provider="flutterwave"
        )

        # Apply filters
        if status:
            query = query.filter(PaymentTransaction.status == status)

        if start_date:
            try:
                start_dt = datetime.strptime(start_date, '%Y-%m-%d')
                query = query.filter(PaymentTransaction.created_at >= start_dt)
            except ValueError:
                return jsonify({
                    'success': False,
                    'error': 'Invalid start_date format. Use YYYY-MM-DD'
                }), 400

        if end_date:
            try:
                end_dt = datetime.strptime(end_date, '%Y-%m-%d')
                query = query.filter(PaymentTransaction.created_at <= end_dt)
            except ValueError:
                return jsonify({
                    'success': False,
                    'error': 'Invalid end_date format. Use YYYY-MM-DD'
                }), 400

        # Order by created_at (newest first)
        query = query.order_by(PaymentTransaction.created_at.desc())

        # Paginate results
        paginated = query.paginate(page=page, per_page=per_page, error_out=False)

        # Format transactions
        transactions = []
        for transaction in paginated.items:
            transactions.append({
                'id': transaction.id,
                'amount': float(transaction.amount),
                'status': transaction.status.value if hasattr(transaction.status, 'value') else str(transaction.status),
                'reference_id': transaction.reference_id,
                'provider_reference': transaction.provider_reference,
                'created_at': transaction.created_at.isoformat() if transaction.created_at else None,
                'completed_at': transaction.completed_at.isoformat() if transaction.completed_at else None,
                'metadata': transaction.transaction_metadata
            })

        return jsonify({
            'success': True,
            'data': {
                'transactions': transactions,
                'pagination': {
                    'page': paginated.page,
                    'per_page': paginated.per_page,
                    'total_pages': paginated.pages,
                    'total_items': paginated.total
                }
            }
        }), 200

    except Exception as e:
        logger.error(f"Error fetching user card transactions: {str(e)}")
        return jsonify({
            'success': False,
            'error': f"Failed to fetch transactions: {str(e)}"
        }), 500

# =====================
# ADMIN ENDPOINTS
# =====================

@card_routes.route('/admin/transactions', methods=['GET', 'OPTIONS'])
@cross_origin()
@jwt_required()
@admin_required
def get_admin_card_transactions():
    """
    List/filter/search all card transactions (Admin only).

    Query Parameters:
        page (int): Page number (default: 1)
        per_page (int): Items per page (default: 20)
        status (str): Filter by status (optional)
        user_id (int): Filter by user ID (optional)
        start_date (str): Start date filter (YYYY-MM-DD)
        end_date (str): End date filter (YYYY-MM-DD)
        search (str): Search in reference_id or provider_reference

    Returns:
        JSON with all card transactions
    """
    if request.method == 'OPTIONS':
        return handle_options_request()

    try:
        # Get query parameters
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        status = request.args.get('status')
        user_id = request.args.get('user_id', type=int)
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        search = request.args.get('search')

        # Build query
        query = PaymentTransaction.query.filter_by(provider="flutterwave")

        # Apply filters
        if status:
            query = query.filter(PaymentTransaction.status == status)

        if user_id:
            query = query.filter(PaymentTransaction.user_id == user_id)

        if start_date:
            try:
                start_dt = datetime.strptime(start_date, '%Y-%m-%d')
                query = query.filter(PaymentTransaction.created_at >= start_dt)
            except ValueError:
                return jsonify({
                    'success': False,
                    'error': 'Invalid start_date format. Use YYYY-MM-DD'
                }), 400

        if end_date:
            try:
                end_dt = datetime.strptime(end_date, '%Y-%m-%d')
                query = query.filter(PaymentTransaction.created_at <= end_dt)
            except ValueError:
                return jsonify({
                    'success': False,
                    'error': 'Invalid end_date format. Use YYYY-MM-DD'
                }), 400

        if search:
            query = query.filter(
                db.or_(
                    PaymentTransaction.reference_id.ilike(f'%{search}%'),
                    PaymentTransaction.provider_reference.ilike(f'%{search}%')
                )
            )

        # Order by created_at (newest first)
        query = query.order_by(PaymentTransaction.created_at.desc())

        # Paginate results
        paginated = query.paginate(page=page, per_page=per_page, error_out=False)

        # Format transactions with user info
        transactions = []
        for transaction in paginated.items:
            user = User.query.get(transaction.user_id)
            transactions.append({
                'id': transaction.id,
                'user_id': transaction.user_id,
                'user_name': user.name if user else 'Unknown',
                'user_email': user.email if user else 'Unknown',
                'amount': float(transaction.amount),
                'status': transaction.status.value if hasattr(transaction.status, 'value') else str(transaction.status),
                'reference_id': transaction.reference_id,
                'provider_reference': transaction.provider_reference,
                'created_at': transaction.created_at.isoformat() if transaction.created_at else None,
                'completed_at': transaction.completed_at.isoformat() if transaction.completed_at else None,
                'metadata': transaction.transaction_metadata
            })

        return jsonify({
            'success': True,
            'data': {
                'transactions': transactions,
                'pagination': {
                    'page': paginated.page,
                    'per_page': paginated.per_page,
                    'total_pages': paginated.pages,
                    'total_items': paginated.total
                }
            }
        }), 200

    except Exception as e:
        logger.error(f"Error fetching admin card transactions: {str(e)}")
        return jsonify({
            'success': False,
            'error': f"Failed to fetch transactions: {str(e)}"
        }), 500

@card_routes.route('/admin/transaction/<int:transaction_id>', methods=['GET', 'OPTIONS'])
@cross_origin()
@jwt_required()
@admin_required
def get_admin_card_transaction_details(transaction_id):
    """
    View details of a specific card transaction (Admin only).

    Path Parameters:
        transaction_id (int): ID of the transaction to view

    Returns:
        JSON with transaction details
    """
    if request.method == 'OPTIONS':
        return handle_options_request()

    try:
        # Get transaction
        transaction = PaymentTransaction.query.filter_by(
            id=transaction_id,
            provider="flutterwave"
        ).first()

        if not transaction:
            return jsonify({
                'success': False,
                'error': 'Transaction not found'
            }), 404

        # Get user info
        user = User.query.get(transaction.user_id)

        # Get order info if available
        order = None
        if transaction.reference_id and transaction.reference_id.startswith('ORDER'):
            order_id = transaction.reference_id.replace('ORDER', '')
            try:
                order = Order.query.get(int(order_id))
            except (ValueError, TypeError):
                pass

        transaction_data = {
            'id': transaction.id,
            'user_id': transaction.user_id,
            'user_name': user.name if user else 'Unknown',
            'user_email': user.email if user else 'Unknown',
            'amount': float(transaction.amount),
            'status': transaction.status.value if hasattr(transaction.status, 'value') else str(transaction.status),
            'reference_id': transaction.reference_id,
            'provider_reference': transaction.provider_reference,
            'created_at': transaction.created_at.isoformat() if transaction.created_at else None,
            'updated_at': transaction.updated_at.isoformat() if transaction.updated_at else None,
            'completed_at': transaction.completed_at.isoformat() if transaction.completed_at else None,
            'metadata': transaction.transaction_metadata,
            'order': {
                'id': order.id,
                'order_number': order.order_number,
                'status': order.status.value if hasattr(order.status, 'value') else str(order.status),
                'total_amount': float(order.total_amount)
            } if order else None
        }

        return jsonify({
            'success': True,
            'data': transaction_data
        }), 200

    except Exception as e:
        logger.error(f"Error fetching card transaction details: {str(e)}")
        return jsonify({
            'success': False,
            'error': f"Failed to fetch transaction details: {str(e)}"
        }), 500

@card_routes.route('/admin/verify/<int:transaction_id>', methods=['POST', 'OPTIONS'])
@cross_origin()
@jwt_required()
@admin_required
def admin_verify_card_transaction(transaction_id):
    """
    Manually verify/mark a card transaction as completed/failed (Admin only).

    Path Parameters:
        transaction_id (int): ID of the transaction to verify

    Request Body:
        status (str): New status ('paid' or 'failed')
        notes (str, optional): Admin notes

    Returns:
        JSON with verification status
    """
    if request.method == 'OPTIONS':
        return handle_options_request()

    admin_id = get_jwt_identity()

    try:
        data = request.get_json()

        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400

        new_status = data.get('status')
        notes = data.get('notes', '')

        if new_status not in ['paid', 'failed']:
            return jsonify({
                'success': False,
                'error': 'Status must be either "paid" or "failed"'
            }), 400

        # Get transaction
        transaction = PaymentTransaction.query.filter_by(
            id=transaction_id,
            provider="flutterwave"
        ).first()

        if not transaction:
            return jsonify({
                'success': False,
                'error': 'Transaction not found'
            }), 404

        # Update transaction status
        old_status = transaction.status
        transaction.status = PaymentStatus.PAID if new_status == 'paid' else PaymentStatus.FAILED

        if new_status == 'paid':
            transaction.completed_at = datetime.now()

        # Update metadata with admin verification info
        transaction.transaction_metadata = {
            **transaction.transaction_metadata,
            'admin_verification': {
                'verified_by': admin_id,
                'verified_at': datetime.now().isoformat(),
                'old_status': old_status.value if hasattr(old_status, 'value') else str(old_status),
                'new_status': new_status,
                'notes': notes
            }
        }

        transaction.updated_at = datetime.now()

        # Update order status if this is for an order and payment is successful
        if new_status == 'paid' and transaction.reference_id and transaction.reference_id.startswith('ORDER'):
            order_id = transaction.reference_id.replace('ORDER', '')
            try:
                order = Order.query.get(int(order_id))
                if order:
                    order.payment_status = PaymentStatus.PAID
                    if order.status == OrderStatus.PENDING:
                        order.status = OrderStatus.PROCESSING
            except (ValueError, TypeError):
                pass

        db.session.commit()

        logger.info(f"Admin {admin_id} verified card transaction {transaction_id} as {new_status}")

        return jsonify({
            'success': True,
            'message': f'Transaction marked as {new_status} successfully',
            'data': {
                'transaction_id': transaction.id,
                'old_status': old_status.value if hasattr(old_status, 'value') else str(old_status),
                'new_status': new_status,
                'verified_by': admin_id,
                'verified_at': datetime.now().isoformat()
            }
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error verifying card transaction: {str(e)}")
        return jsonify({
            'success': False,
            'error': f"Failed to verify transaction: {str(e)}"
        }), 500

@card_routes.route('/admin/refund/<int:transaction_id>', methods=['POST', 'OPTIONS'])
@cross_origin()
@jwt_required()
@admin_required
def admin_refund_card_transaction(transaction_id):
    """
    Initiate a refund for a card transaction (Admin only).

    Path Parameters:
        transaction_id (int): ID of the transaction to refund

    Request Body:
        amount (float, optional): Amount to refund (full refund if not specified)
        reason (str): Reason for refund

    Returns:
        JSON with refund status
    """
    if request.method == 'OPTIONS':
        return handle_options_request()

    admin_id = get_jwt_identity()

    try:
        data = request.get_json()

        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400

        refund_amount = data.get('amount')
        reason = data.get('reason', '')

        if not reason:
            return jsonify({
                'success': False,
                'error': 'Refund reason is required'
            }), 400

        # Get transaction
        transaction = PaymentTransaction.query.filter_by(
            id=transaction_id,
            provider="flutterwave"
        ).first()

        if not transaction:
            return jsonify({
                'success': False,
                'error': 'Transaction not found'
            }), 404

        if transaction.status != PaymentStatus.PAID:
            return jsonify({
                'success': False,
                'error': 'Only paid transactions can be refunded'
            }), 400

        if not transaction.provider_reference:
            return jsonify({
                'success': False,
                'error': 'Cannot refund transaction without Flutterwave reference'
            }), 400

        # Validate refund amount
        if refund_amount:
            try:
                refund_amount = float(refund_amount)
                if refund_amount <= 0 or refund_amount > float(transaction.amount):
                    return jsonify({
                        'success': False,
                        'error': 'Invalid refund amount'
                    }), 400
            except (ValueError, TypeError):
                return jsonify({
                    'success': False,
                    'error': 'Invalid refund amount format'
                }), 400

        logger.info(f"Admin {admin_id} initiating refund for card transaction {transaction_id}")

        # Initiate refund with Flutterwave
        try:
            refund_response = flutterwave_service.initiate_refund(
                transaction_id=transaction.provider_reference,
                amount=refund_amount
            )

            if refund_response.get('status') == 'success':
                # Update transaction status
                transaction.status = PaymentStatus.REFUNDED

                # Update metadata with refund info
                transaction.transaction_metadata = {
                    **transaction.transaction_metadata,
                    'refund': {
                        'initiated_by': admin_id,
                        'initiated_at': datetime.now().isoformat(),
                        'amount': refund_amount or float(transaction.amount),
                        'reason': reason,
                        'flutterwave_response': refund_response
                    }
                }

                transaction.updated_at = datetime.now()

                db.session.commit()

                return jsonify({
                    'success': True,
                    'message': 'Refund initiated successfully',
                    'data': {
                        'transaction_id': transaction.id,
                        'refund_amount': refund_amount or float(transaction.amount),
                        'reason': reason,
                        'flutterwave_response': refund_response,
                        'initiated_by': admin_id,
                        'initiated_at': datetime.now().isoformat()
                    }
                }), 200
            else:
                return jsonify({
                    'success': False,
                    'error': f"Refund failed: {refund_response.get('message', 'Unknown error')}",
                    'details': refund_response
                }), 400

        except FlutterwaveError as e:
            logger.error(f"Flutterwave refund error: {str(e)}")
            return jsonify({
                'success': False,
                'error': str(e),
                'error_code': e.error_code,
                'details': e.details
            }), 400

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error initiating card refund: {str(e)}")
        return jsonify({
            'success': False,
            'error': f"Failed to initiate refund: {str(e)}"
        }), 500

# =====================
# UTILITY ENDPOINTS
# =====================

@card_routes.route('/health', methods=['GET', 'OPTIONS'])
@cross_origin()
def card_health_check():
    """
    Health check endpoint for Flutterwave card service.

    Returns:
        JSON with service health status
    """
    if request.method == 'OPTIONS':
        return handle_options_request()

    try:
        # Test Flutterwave service connection
        service_info = flutterwave_service.get_service_info()

        return jsonify({
            'success': True,
            'service': 'Flutterwave Card Payments',
            'status': service_info.get('status', 'unknown'),
            'environment': service_info.get('environment'),
            'features': service_info.get('features', []),
            'timestamp': datetime.now().isoformat()
        }), 200

    except Exception as e:
        logger.error(f"Flutterwave health check failed: {str(e)}")
        return jsonify({
            'success': False,
            'service': 'Flutterwave Card Payments',
            'status': 'error',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

@card_routes.route('/simulate', methods=['POST', 'OPTIONS'])
@cross_origin()
def simulate_card_payment():
    """
    Simulate card payment for testing (Development/Sandbox only).

    Request Body:
        amount (float): Amount to charge
        email (str): Customer's email
        phone (str): Customer's phone number
        name (str): Customer's name
        success (bool, optional): Whether to simulate success (default: true)

    Returns:
        JSON with simulation response
    """
    if request.method == 'OPTIONS':
        return handle_options_request()

    # Only allow in development/sandbox environment
    if flutterwave_service.environment.lower() not in ['sandbox', 'development']:
        return jsonify({
            'success': False,
            'error': 'Simulation is only available in sandbox/development environment'
        }), 403

    try:
        data = request.get_json()

        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400

        amount = data.get('amount')
        email = data.get('email')
        phone = data.get('phone')
        name = data.get('name')
        success = data.get('success', True)

        required_fields = ['amount', 'email', 'phone', 'name']
        missing_fields = [field for field in required_fields if not data.get(field)]

        if missing_fields:
            return jsonify({
                'success': False,
                'error': f"Missing required fields: {', '.join(missing_fields)}"
            }), 400

        # Simulate card payment
        response = flutterwave_service.simulate_card_payment(
            amount=amount,
            email=email,
            phone_number=phone,
            name=name,
            success=success
        )

        return jsonify({
            'success': True,
            'message': 'Card payment simulated',
            'data': response
        }), 200

    except Exception as e:
        logger.error(f"Error simulating card payment: {str(e)}")
        return jsonify({
            'success': False,
            'error': f"Simulation failed: {str(e)}"
        }), 500

# Export the blueprint
__all__ = ['card_routes']
