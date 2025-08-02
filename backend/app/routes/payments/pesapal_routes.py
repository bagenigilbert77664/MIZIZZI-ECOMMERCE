"""
Pesapal Payment Routes for Mizizzi E-commerce Platform
Handles Pesapal card payments, callbacks, and transaction management
"""

import os
import logging
import uuid
import json
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from flask import Blueprint, request, jsonify, current_app, redirect, url_for
from flask_jwt_extended import jwt_required, get_jwt_identity, verify_jwt_in_request
from flask_cors import cross_origin

# Database and models
try:
    from ...configuration.extensions import db
    from ...models.models import User, Order, PesapalTransaction
except ImportError:
    try:
        from app.configuration.extensions import db
        from app.models.models import User, Order, PesapalTransaction
    except ImportError:
        # Fallback for different import structures
        from configuration.extensions import db
        from models.models import User, Order, PesapalTransaction

# Utilities
try:
    from app.utils.pesapal_utils import (
        create_payment_request,
        get_transaction_status,
        validate_pesapal_ipn,
        get_payment_status_message
    )
    from app.utils.validation_utils import validate_email, validate_payment_amount, sanitize_input
    from app.utils.auth_utils import admin_required
except ImportError:
    try:
        from app.utils.pesapal_utils import (
            create_payment_request,
            get_transaction_status,
            validate_pesapal_ipn,
            get_payment_status_message
        )
        from app.utils.validation_utils import validate_email, validate_payment_amount, sanitize_input
        from app.utils.auth_utils import admin_required
    except ImportError:
        # Create fallback functions if imports fail
        def create_payment_request(**kwargs):
            return {"status": "error", "message": "Pesapal service not available"}

        def get_transaction_status(tracking_id):
            return {"status": "error", "message": "Pesapal service not available"}

        def validate_pesapal_ipn(ipn_data):
            return False

        def get_payment_status_message(status):
            return f"Payment status: {status}"

        def validate_email(email):
            return "@" in email if email else False

        def validate_payment_amount(amount):
            return {"valid": True, "amount": Decimal(str(amount))}

        def sanitize_input(input_data):
            return str(input_data).strip()

        def admin_required(f):
            return f

# Setup logging
logger = logging.getLogger(__name__)

# Create blueprint
pesapal_routes = Blueprint('pesapal_routes', __name__)

# =====================
# USER ROUTES
# =====================

@pesapal_routes.route('/initiate', methods=['POST'])
@jwt_required()
@cross_origin()
def initiate_pesapal_payment():
    """
    Initiate Pesapal payment request.

    Expected JSON payload:
    {
        "order_id": "ORD123456",
        "amount": 1000.00,
        "currency": "KES",
        "customer_email": "customer@example.com",
        "customer_phone": "254712345678",
        "description": "Payment for Order ORD123456",
        "callback_url": "https://your-domain.com/payment-success"
    }
    """
    try:
        data = request.get_json()

        # Validate required fields
        required_fields = ['order_id', 'amount', 'customer_email', 'customer_phone']
        for field in required_fields:
            if not data.get(field):
                return jsonify({
                    'status': 'error',
                    'message': f'Missing required field: {field}'
                }), 400

        # Get current user
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        if not user:
            return jsonify({
                'status': 'error',
                'message': 'User not found'
            }), 404

        # Validate email
        if not validate_email(data['customer_email']):
            return jsonify({
                'status': 'error',
                'message': 'Invalid email address'
            }), 400

        # Validate amount
        amount_validation = validate_payment_amount(data['amount'])
        if not amount_validation.get("valid"):
            return jsonify({
                'status': 'error',
                'message': f'Invalid amount: {amount_validation.get("error", "Invalid amount")}'
            }), 400

        validated_amount = amount_validation["amount"]

        # Check if order exists and belongs to user
        order = Order.query.filter_by(
            id=data['order_id'],
            user_id=current_user_id
        ).first()

        if not order:
            return jsonify({
                'status': 'error',
                'message': 'Order not found or does not belong to user'
            }), 404

        # Check if order amount matches
        if hasattr(order, 'total_amount') and abs(float(order.total_amount) - float(validated_amount)) > 0.01:
            return jsonify({
                'status': 'error',
                'message': 'Payment amount does not match order total'
            }), 400

        # Check if there's already a pending transaction for this order
        existing_transaction = PesapalTransaction.query.filter_by(
            order_id=data['order_id'],
            status='pending'
        ).first()

        if existing_transaction:
            return jsonify({
                'status': 'error',
                'message': 'There is already a pending payment for this order',
                'transaction_id': existing_transaction.id
            }), 409

        # Generate merchant reference
        merchant_reference = f"MIZIZZI_{data['order_id']}_{int(datetime.utcnow().timestamp())}"

        # Create transaction record
        transaction = PesapalTransaction(
            user_id=current_user_id,
            order_id=data['order_id'],
            merchant_reference=merchant_reference,
            amount=validated_amount,
            currency=data.get('currency', 'KES'),
            customer_email=data['customer_email'],
            customer_phone=data['customer_phone'],
            description=data.get('description', f'Payment for Order {data["order_id"]}'),
            status='initiated',
            created_at=datetime.utcnow()
        )

        db.session.add(transaction)
        db.session.flush()  # Get the transaction ID

        # Set callback URL
        callback_url = data.get('callback_url', f"https://your-domain.com/payment-success/{transaction.id}")

        # Create payment request with Pesapal
        payment_response = create_payment_request(
            amount=float(validated_amount),
            currency=transaction.currency,
            description=transaction.description,
            customer_email=transaction.customer_email,
            customer_phone=transaction.customer_phone,
            callback_url=callback_url,
            merchant_reference=merchant_reference
        )

        if not payment_response:
            transaction.status = 'failed'
            transaction.error_message = 'Failed to create payment request'
            db.session.commit()

            return jsonify({
                'status': 'error',
                'message': 'Failed to initiate payment. Please try again.'
            }), 500

        if payment_response.get('status') == 'success':
            # Update transaction with Pesapal response
            transaction.order_tracking_id = payment_response.get('order_tracking_id')
            transaction.redirect_url = payment_response.get('redirect_url')
            transaction.status = 'pending'
            transaction.pesapal_response = json.dumps(payment_response)

            db.session.commit()

            return jsonify({
                'status': 'success',
                'message': 'Payment request created successfully',
                'transaction_id': transaction.id,
                'order_tracking_id': transaction.order_tracking_id,
                'redirect_url': transaction.redirect_url,
                'merchant_reference': merchant_reference
            }), 200
        else:
            transaction.status = 'failed'
            transaction.error_message = payment_response.get('message', 'Payment request failed')
            transaction.pesapal_response = json.dumps(payment_response)

            db.session.commit()

            return jsonify({
                'status': 'error',
                'message': payment_response.get('message', 'Payment initiation failed'),
                'transaction_id': transaction.id
            }), 400

    except Exception as e:
        logger.error(f"Error initiating Pesapal payment: {str(e)}")
        db.session.rollback()

        return jsonify({
            'status': 'error',
            'message': 'Internal server error. Please try again.'
        }), 500

@pesapal_routes.route('/status/<int:transaction_id>', methods=['GET'])
@jwt_required()
@cross_origin()
def check_payment_status(transaction_id):
    """
    Check Pesapal payment status.
    """
    try:
        current_user_id = get_jwt_identity()

        # Get transaction
        transaction = PesapalTransaction.query.filter_by(
            id=transaction_id,
            user_id=current_user_id
        ).first()

        if not transaction:
            return jsonify({
                'status': 'error',
                'message': 'Transaction not found'
            }), 404

        # If transaction is already completed or failed, return current status
        if transaction.status in ['completed', 'failed', 'cancelled']:
            return jsonify({
                'status': 'success',
                'transaction_status': transaction.status,
                'message': get_payment_status_message(getattr(transaction, 'payment_status', 'PENDING')),
                'transaction_data': {
                    'id': transaction.id,
                    'amount': float(transaction.amount),
                    'currency': transaction.currency,
                    'customer_email': transaction.customer_email,
                    'payment_method': getattr(transaction, 'payment_method', None),
                    'confirmation_code': getattr(transaction, 'confirmation_code', None),
                    'transaction_date': transaction.transaction_date.isoformat() if hasattr(transaction, 'transaction_date') and transaction.transaction_date else None,
                    'created_at': transaction.created_at.isoformat()
                }
            }), 200

        # Query Pesapal for current status
        if hasattr(transaction, 'order_tracking_id') and transaction.order_tracking_id:
            status_response = get_transaction_status(transaction.order_tracking_id)

            if status_response and status_response.get('status') == 'success':
                payment_status = status_response.get('payment_status', 'PENDING')

                if payment_status == 'COMPLETED':
                    # Payment successful
                    transaction.status = 'completed'
                    transaction.payment_status = payment_status
                    transaction.payment_method = status_response.get('payment_method')
                    transaction.payment_account = status_response.get('payment_account')
                    transaction.confirmation_code = status_response.get('confirmation_code')
                    transaction.transaction_date = datetime.utcnow()

                    # Update order status
                    if transaction.order_id:
                        order = Order.query.get(transaction.order_id)
                        if order:
                            if hasattr(order, 'payment_status'):
                                order.payment_status = 'paid'
                            if hasattr(order, 'status'):
                                order.status = 'confirmed'

                elif payment_status == 'FAILED':
                    transaction.status = 'failed'
                    transaction.payment_status = payment_status

                elif payment_status == 'CANCELLED':
                    transaction.status = 'cancelled'
                    transaction.payment_status = payment_status

                # Store status response
                transaction.status_response = json.dumps(status_response)
                db.session.commit()

        return jsonify({
            'status': 'success',
            'transaction_status': transaction.status,
            'message': get_payment_status_message(getattr(transaction, 'payment_status', 'PENDING')),
            'transaction_data': {
                'id': transaction.id,
                'amount': float(transaction.amount),
                'currency': transaction.currency,
                'customer_email': transaction.customer_email,
                'payment_method': getattr(transaction, 'payment_method', None),
                'confirmation_code': getattr(transaction, 'confirmation_code', None),
                'transaction_date': transaction.transaction_date.isoformat() if hasattr(transaction, 'transaction_date') and transaction.transaction_date else None,
                'created_at': transaction.created_at.isoformat()
            }
        }), 200

    except Exception as e:
        logger.error(f"Error checking payment status: {str(e)}")

        return jsonify({
            'status': 'error',
            'message': 'Failed to check payment status'
        }), 500

@pesapal_routes.route('/callback', methods=['GET', 'POST'])
@cross_origin()
def pesapal_callback():
    """
    Handle Pesapal payment callback.
    This endpoint receives payment confirmations from Pesapal.
    """
    try:
        # Pesapal can send callbacks via GET or POST
        if request.method == 'GET':
            callback_data = request.args.to_dict()
        else:
            callback_data = request.get_json() or request.form.to_dict()

        # Log callback for debugging
        logger.info(f"Pesapal Callback received: {json.dumps(callback_data, indent=2)}")

        # Extract callback information
        order_tracking_id = callback_data.get('OrderTrackingId')
        merchant_reference = callback_data.get('OrderMerchantReference')

        if not order_tracking_id and not merchant_reference:
            logger.warning("Invalid Pesapal callback: missing tracking ID and merchant reference")
            return jsonify({'status': 'error', 'message': 'Invalid callback data'}), 400

        # Find transaction
        transaction = None
        if order_tracking_id:
            transaction = PesapalTransaction.query.filter_by(
                pesapal_tracking_id=order_tracking_id  # Changed from order_tracking_id
            ).first()
        elif merchant_reference:
            transaction = PesapalTransaction.query.filter_by(
                merchant_reference=merchant_reference
            ).first()

        if not transaction:
            logger.warning(f"Transaction not found for callback: {callback_data}")
            return jsonify({'status': 'error', 'message': 'Transaction not found'}), 404

        # Get current transaction status from Pesapal
        if hasattr(transaction, 'pesapal_tracking_id') and transaction.pesapal_tracking_id:
            status_response = get_transaction_status(transaction.pesapal_tracking_id)

            if status_response and status_response.get('status') == 'success':
                payment_status = status_response.get('payment_status', 'PENDING')

                if payment_status == 'COMPLETED':
                    # Payment successful
                    transaction.status = 'completed'
                    transaction.payment_status = payment_status
                    transaction.payment_method = status_response.get('payment_method')
                    transaction.payment_account = status_response.get('payment_account')
                    transaction.confirmation_code = status_response.get('confirmation_code')
                    transaction.transaction_date = datetime.utcnow()

                    # Update order status
                    if transaction.order_id:
                        order = Order.query.get(transaction.order_id)
                        if order:
                            if hasattr(order, 'payment_status'):
                                order.payment_status = 'paid'
                            if hasattr(order, 'status'):
                                order.status = 'confirmed'
                            if hasattr(order, 'updated_at'):
                                order.updated_at = datetime.utcnow()

                    logger.info(f"Payment completed for transaction {transaction.id}")

                elif payment_status == 'FAILED':
                    transaction.status = 'failed'
                    transaction.payment_status = payment_status
                    logger.info(f"Payment failed for transaction {transaction.id}")

                elif payment_status == 'CANCELLED':
                    transaction.status = 'cancelled'
                    transaction.payment_status = payment_status
                    logger.info(f"Payment cancelled for transaction {transaction.id}")

                # Store status response
                transaction.status_response = json.dumps(status_response)

        # Store callback data
        transaction.callback_response = json.dumps(callback_data)

        db.session.commit()

        # Return success response
        return jsonify({
            'status': 'success',
            'message': 'Callback processed successfully'
        }), 200

    except Exception as e:
        logger.error(f"Error processing Pesapal callback: {str(e)}")
        db.session.rollback()

        return jsonify({
            'status': 'error',
            'message': 'Callback processing failed'
        }), 500

@pesapal_routes.route('/transactions', methods=['GET'])
@jwt_required()
@cross_origin()
def get_user_transactions():
    """
    Get user's Pesapal transactions with pagination.
    """
    try:
        current_user_id = get_jwt_identity()

        # Get pagination parameters
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 10, type=int), 100)
        status = request.args.get('status')

        # Build query
        query = PesapalTransaction.query.filter_by(user_id=current_user_id)

        if status:
            query = query.filter_by(status=status)

        # Order by creation date (newest first)
        query = query.order_by(PesapalTransaction.created_at.desc())

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
                'customer_email': transaction.customer_email,
                'status': transaction.status,
                'payment_status': getattr(transaction, 'payment_status', None),
                'description': transaction.description,
                'payment_method': getattr(transaction, 'payment_method', None),
                'confirmation_code': getattr(transaction, 'confirmation_code', None),
                'transaction_date': transaction.transaction_date.isoformat() if hasattr(transaction, 'transaction_date') and transaction.transaction_date else None,
                'created_at': transaction.created_at.isoformat(),
                'status_message': get_payment_status_message(getattr(transaction, 'payment_status', 'PENDING'))
            }
            transaction_list.append(transaction_data)

        return jsonify({
            'status': 'success',
            'transactions': transaction_list,
            'pagination': {
                'page': transactions.page,
                'pages': transactions.pages,
                'per_page': transactions.per_page,
                'total': transactions.total,
                'has_next': transactions.has_next,
                'has_prev': transactions.has_prev
            }
        }), 200

    except Exception as e:
        logger.error(f"Error fetching user transactions: {str(e)}")

        return jsonify({
            'status': 'error',
            'message': 'Failed to fetch transactions'
        }), 500

# =====================
# ADMIN ROUTES
# =====================

@pesapal_routes.route('/admin/transactions', methods=['GET'])
@jwt_required()
@admin_required
@cross_origin()
def get_all_transactions():
    """
    Get all Pesapal transactions (Admin only).
    """
    try:
        # Get pagination parameters
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 100)
        status = request.args.get('status')
        user_id = request.args.get('user_id', type=int)

        # Build query
        query = PesapalTransaction.query

        if status:
            query = query.filter_by(status=status)

        if user_id:
            query = query.filter_by(user_id=user_id)

        # Order by creation date (newest first)
        query = query.order_by(PesapalTransaction.created_at.desc())

        # Paginate
        transactions = query.paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )

        # Format response
        transaction_list = []
        for transaction in transactions.items:
            # Get user info
            user = User.query.get(transaction.user_id)

            transaction_data = {
                'id': transaction.id,
                'user_id': transaction.user_id,
                'user_email': user.email if user else None,
                'order_id': transaction.order_id,
                'merchant_reference': transaction.merchant_reference,
                'order_tracking_id': getattr(transaction, 'order_tracking_id', None),
                'amount': float(transaction.amount),
                'currency': transaction.currency,
                'customer_email': transaction.customer_email,
                'customer_phone': transaction.customer_phone,
                'status': transaction.status,
                'payment_status': getattr(transaction, 'payment_status', None),
                'description': transaction.description,
                'payment_method': getattr(transaction, 'payment_method', None),
                'payment_account': getattr(transaction, 'payment_account', None),
                'confirmation_code': getattr(transaction, 'confirmation_code', None),
                'transaction_date': transaction.transaction_date.isoformat() if hasattr(transaction, 'transaction_date') and transaction.transaction_date else None,
                'created_at': transaction.created_at.isoformat(),
                'status_message': get_payment_status_message(getattr(transaction, 'payment_status', 'PENDING'))
            }
            transaction_list.append(transaction_data)

        return jsonify({
            'status': 'success',
            'transactions': transaction_list,
            'pagination': {
                'page': transactions.page,
                'pages': transactions.pages,
                'per_page': transactions.per_page,
                'total': transactions.total,
                'has_next': transactions.has_next,
                'has_prev': transactions.has_prev
            }
        }), 200

    except Exception as e:
        logger.error(f"Error fetching all transactions: {str(e)}")

        return jsonify({
            'status': 'error',
            'message': 'Failed to fetch transactions'
        }), 500

@pesapal_routes.route('/admin/stats', methods=['GET'])
@jwt_required()
@admin_required
@cross_origin()
def get_pesapal_stats():
    """
    Get Pesapal payment statistics (Admin only).
    """
    try:
        from sqlalchemy import func

        # Get date range
        from_date = request.args.get('from_date')
        to_date = request.args.get('to_date')

        query = PesapalTransaction.query

        if from_date:
            from_date = datetime.fromisoformat(from_date.replace('Z', '+00:00'))
            query = query.filter(PesapalTransaction.created_at >= from_date)

        if to_date:
            to_date = datetime.fromisoformat(to_date.replace('Z', '+00:00'))
            query = query.filter(PesapalTransaction.created_at <= to_date)

        # Get statistics
        total_transactions = query.count()
        completed_transactions = query.filter_by(status='completed').count()
        failed_transactions = query.filter_by(status='failed').count()
        pending_transactions = query.filter_by(status='pending').count()
        cancelled_transactions = query.filter_by(status='cancelled').count()

        # Calculate total amounts
        completed_query = query.filter_by(status='completed')
        total_amount = db.session.query(func.sum(PesapalTransaction.amount)).filter(
            PesapalTransaction.id.in_([t.id for t in completed_query.all()])
        ).scalar() or 0

        # Success rate
        success_rate = (completed_transactions / total_transactions * 100) if total_transactions > 0 else 0

        # Payment methods breakdown
        payment_methods = db.session.query(
            PesapalTransaction.payment_method,
            func.count(PesapalTransaction.id).label('count')
        ).filter_by(status='completed').group_by(PesapalTransaction.payment_method).all()

        payment_methods_stats = {method: count for method, count in payment_methods if method}

        return jsonify({
            'status': 'success',
            'stats': {
                'total_transactions': total_transactions,
                'completed_transactions': completed_transactions,
                'failed_transactions': failed_transactions,
                'pending_transactions': pending_transactions,
                'cancelled_transactions': cancelled_transactions,
                'total_amount': float(total_amount),
                'success_rate': round(success_rate, 2),
                'average_transaction_amount': float(total_amount / completed_transactions) if completed_transactions > 0 else 0,
                'payment_methods': payment_methods_stats
            }
        }), 200

    except Exception as e:
        logger.error(f"Error fetching Pesapal stats: {str(e)}")

        return jsonify({
            'status': 'error',
            'message': 'Failed to fetch statistics'
        }), 500

# =====================
# HEALTH CHECK
# =====================

@pesapal_routes.route('/health', methods=['GET'])
@cross_origin()
def health_check():
    """Pesapal service health check"""
    try:
        return jsonify({
            "status": "success",  # Changed from "healthy" to "success"
            "service": "pesapal",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "endpoints": [
                "/api/pesapal/initiate",
                "/api/pesapal/status/<transaction_id>",
                "/api/pesapal/callback",
                "/api/pesapal/transactions",
                "/api/pesapal/admin/transactions",
                "/api/pesapal/admin/stats"
            ]
        }), 200

    except Exception as e:
        logger.error(f"Pesapal health check failed: {str(e)}")
        return jsonify({
            "status": "error",  # Changed from "unhealthy" to "error"
            "service": "pesapal",
            "error": str(e),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }), 503

# Error handlers
@pesapal_routes.errorhandler(404)
def not_found(error):
    return jsonify({
        'status': 'error',
        'message': 'Endpoint not found'
    }), 404

@pesapal_routes.errorhandler(405)
def method_not_allowed(error):
    return jsonify({
        'status': 'error',
        'message': 'Method not allowed'
    }), 405

@pesapal_routes.errorhandler(500)
def internal_error(error):
    db.session.rollback()
    return jsonify({
        'status': 'error',
        'message': 'Internal server error'
    }), 500

# Export the blueprint
__all__ = ['pesapal_routes']
