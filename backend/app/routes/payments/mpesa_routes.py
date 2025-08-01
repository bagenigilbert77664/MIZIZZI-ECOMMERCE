"""
M-PESA Payment Routes for Mizizzi E-commerce Platform
Handles M-PESA STK Push payments, callbacks, and transaction management
"""

import os
import logging
import uuid
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity, verify_jwt_in_request
from flask_cors import cross_origin

# Database and models
try:
    from ...configuration.extensions import db
    from ...models.models import User, Order, MpesaTransaction, OrderStatus, PaymentStatus, UserRole
except ImportError:
    try:
        from app.configuration.extensions import db
        from app.models.models import User, Order, MpesaTransaction, OrderStatus, PaymentStatus, UserRole
    except ImportError:
        # Fallback for different import structures
        from configuration.extensions import db
        from models.models import User, Order, MpesaTransaction, OrderStatus, PaymentStatus, UserRole

# Utilities
try:
    from ...utils.mpesa_utils import MpesaClient
    from ...utils.validation_utils import validate_phone_number, validate_payment_amount, sanitize_input
    from ...utils.auth_utils import admin_required
except ImportError:
    try:
        from app.utils.mpesa_utils import MpesaClient
        from app.utils.validation_utils import validate_phone_number, validate_payment_amount, sanitize_input
        from app.utils.auth_utils import admin_required
    except ImportError:
        # Create fallback classes if imports fail
        class MpesaClient:
            def __init__(self):
                pass
            def stk_push(self, **kwargs):
                return {"ResponseCode": "1", "errorMessage": "M-PESA client not available"}
            def query_stk_status(self, checkout_request_id):
                return {"ResponseCode": "1", "errorMessage": "M-PESA client not available"}
            def get_access_token(self):
                return None

        def validate_phone_number(phone):
            return {"valid": True, "mpesa_format": phone}

        def validate_payment_amount(amount):
            return {"valid": True, "amount": Decimal(str(amount))}

        def sanitize_input(input_data):
            return str(input_data).strip()

        def admin_required(f):
            def decorated_function(*args, **kwargs):
                try:
                    user_id = get_jwt_identity()
                    user = User.query.get(user_id)
                    if not user or user.role != UserRole.ADMIN:
                        return jsonify({"error": "Admin access required"}), 403
                    return f(*args, **kwargs)
                except Exception as e:
                    return jsonify({"error": "Authorization failed"}), 403
            return decorated_function

# Setup logging
logger = logging.getLogger(__name__)

# Create blueprint
mpesa_routes = Blueprint('mpesa_routes', __name__)

# Initialize M-PESA client
try:
    mpesa_client = MpesaClient()
except Exception as e:
    logger.error(f"Failed to initialize M-PESA client: {str(e)}")
    mpesa_client = None

# =====================
# USER ROUTES
# =====================

@mpesa_routes.route('/initiate', methods=['POST'])
@jwt_required()
@cross_origin()
def initiate_payment():
    """
    Initiate M-PESA STK Push payment

    Expected JSON payload:
    {
        "order_id": "12345",
        "phone_number": "254712345678",
        "amount": 1000.00,
        "description": "Payment for order #12345"
    }
    """
    try:
        if not mpesa_client:
            return jsonify({"error": "M-PESA service not available"}), 503

        # Get current user
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404

        # Get request data with proper error handling
        try:
            data = request.get_json()
            if not data:
                return jsonify({"error": "No data provided"}), 400
        except Exception as e:
            logger.error(f"Invalid JSON in request: {str(e)}")
            return jsonify({"error": "Invalid JSON format"}), 400

        # Validate required fields
        required_fields = ['order_id', 'phone_number', 'amount']
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing required field: {field}"}), 400

        # Sanitize and validate inputs
        order_id = sanitize_input(str(data['order_id']))
        phone_number = sanitize_input(str(data['phone_number']))
        amount = data['amount']
        description = sanitize_input(data.get('description', f'Payment for order #{order_id}'))

        # Validate phone number
        phone_validation = validate_phone_number(phone_number)
        if not phone_validation.get("valid"):
            return jsonify({"error": f"Invalid phone number: {phone_validation.get('error', 'Invalid format')}"}), 400

        # Validate amount
        amount_validation = validate_payment_amount(amount)
        if not amount_validation.get("valid"):
            return jsonify({"error": f"Invalid amount: {amount_validation.get('error', 'Invalid amount')}"}), 400

        validated_amount = amount_validation["amount"]
        mpesa_phone = phone_validation.get("mpesa_format", phone_number)

        # Check if order exists and belongs to user
        order = Order.query.filter_by(id=order_id, user_id=user_id).first()
        if not order:
            return jsonify({"error": "Order not found"}), 404

        # Check if order is already paid
        if hasattr(order, 'payment_status') and order.payment_status == 'paid':
            return jsonify({"error": "Order is already paid"}), 400

        # Check for existing pending transaction
        existing_transaction = MpesaTransaction.query.filter_by(
            order_id=order_id,
            status='initiated'
        ).first()

        if existing_transaction:
            # Check if transaction is still valid (not expired)
            # Ensure both datetimes are timezone-aware for comparison
            existing_created_at = existing_transaction.created_at
            if existing_created_at.tzinfo is None:
                existing_created_at = existing_created_at.replace(tzinfo=timezone.utc)

            current_time = datetime.now(timezone.utc)
            if existing_created_at > current_time - timedelta(minutes=5):

                return jsonify({
                    "error": "Payment already in progress",
                    "transaction_id": existing_transaction.id,
                    "message": "Please complete the payment on your phone or wait for timeout"
                }), 400

        # Generate unique transaction ID and idempotency key
        transaction_id = str(uuid.uuid4())
        idempotency_key = f"mpesa_{user_id}_{order_id}_{int(datetime.now().timestamp())}"

        # Create transaction record with all required fields
        transaction = MpesaTransaction(
            user_id=user_id,
            order_id=str(order_id),  # Ensure it's a string
            transaction_type='stk_push',  # Add the missing transaction_type
            phone_number=mpesa_phone,
            amount=validated_amount,
            description=description,
            status='initiated',
            idempotency_key=idempotency_key,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )

        try:
            db.session.add(transaction)
            db.session.commit()
        except Exception as db_error:
            db.session.rollback()
            logger.error(f"Database error creating transaction: {str(db_error)}")
            return jsonify({"error": "Failed to create transaction record"}), 500

        # Initiate STK Push
        try:
            stk_response = mpesa_client.stk_push(
                phone_number=mpesa_phone,
                amount=int(float(validated_amount)),
                account_reference=order_id,
                transaction_desc=description,
                callback_url=f"{request.host_url.rstrip('/')}/api/mpesa/callback"
            )

            if stk_response.get('ResponseCode') == '0':
                # Update transaction with M-PESA response
                transaction.checkout_request_id = stk_response.get('CheckoutRequestID')
                transaction.merchant_request_id = stk_response.get('MerchantRequestID')
                transaction.mpesa_response = str(stk_response)
                transaction.status = 'pending'
                transaction.updated_at = datetime.now(timezone.utc)

                db.session.commit()

                logger.info(f"STK Push initiated successfully for user {user_id}, order {order_id}")

                return jsonify({
                    "success": True,
                    "message": "Payment initiated successfully. Please complete payment on your phone.",
                    "transaction_id": transaction_id,
                    "checkout_request_id": stk_response.get('CheckoutRequestID'),
                    "merchant_request_id": stk_response.get('MerchantRequestID'),
                    "amount": float(validated_amount),
                    "phone_number": mpesa_phone
                }), 200

            else:
                # STK Push failed
                error_message = stk_response.get('errorMessage', 'STK Push failed')
                transaction.status = 'failed'
                transaction.error_message = error_message
                transaction.mpesa_response = str(stk_response)
                transaction.updated_at = datetime.now(timezone.utc)

                db.session.commit()

                logger.error(f"STK Push failed for user {user_id}, order {order_id}: {error_message}")

                return jsonify({
                    "error": "Failed to initiate payment",
                    "message": error_message,
                    "transaction_id": transaction_id
                }), 400

        except Exception as e:
            # Update transaction status
            transaction.status = 'failed'
            transaction.error_message = str(e)
            transaction.updated_at = datetime.now(timezone.utc)
            db.session.commit()

            logger.error(f"STK Push error for user {user_id}, order {order_id}: {str(e)}")

            return jsonify({
                "error": "Payment initiation failed",
                "message": "Please try again later",
                "transaction_id": transaction_id
            }), 500

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error initiating M-PESA payment: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

@mpesa_routes.route('/status/<transaction_id>', methods=['GET'])
@jwt_required()
@cross_origin()
def check_payment_status(transaction_id):
    """Check M-PESA payment status"""
    try:
        user_id = get_jwt_identity()

        # Get transaction
        transaction = MpesaTransaction.query.filter_by(
            id=transaction_id,
            user_id=user_id
        ).first()

        if not transaction:
            return jsonify({"error": "Transaction not found"}), 404

        # If transaction is still pending and has checkout_request_id, query M-PESA
        if transaction.status == 'pending' and transaction.checkout_request_id and mpesa_client:
            try:
                status_response = mpesa_client.query_stk_status(transaction.checkout_request_id)

                if status_response.get('ResponseCode') == '0':
                    result_code = status_response.get('ResultCode')

                    if result_code == '0':
                        # Payment successful
                        transaction.status = 'completed'
                        transaction.result_code = str(result_code)
                        transaction.result_desc = status_response.get('ResultDesc')
                        transaction.mpesa_receipt_number = status_response.get('MpesaReceiptNumber')
                        transaction.transaction_date = datetime.now(timezone.utc)
                        transaction.callback_received_at = datetime.now(timezone.utc)
                        transaction.updated_at = datetime.now(timezone.utc)

                        # Update order status
                        order = Order.query.get(transaction.order_id)
                        if order:
                            if hasattr(order, 'payment_status'):
                                order.payment_status = PaymentStatus.PAID
                            if hasattr(order, 'status'):
                                order.status = OrderStatus.CONFIRMED

                        db.session.commit()

                    elif result_code in ['1032', '1037']:
                        # Payment cancelled by user
                        transaction.status = 'cancelled'
                        transaction.result_code = str(result_code)
                        transaction.result_desc = status_response.get('ResultDesc')
                        transaction.updated_at = datetime.now(timezone.utc)
                        db.session.commit()

                    else:
                        # Payment failed
                        transaction.status = 'failed'
                        transaction.result_code = str(result_code)
                        transaction.result_desc = status_response.get('ResultDesc')
                        transaction.updated_at = datetime.now(timezone.utc)
                        db.session.commit()

            except Exception as e:
                logger.error(f"Error querying STK status: {str(e)}")

        return jsonify({
            "transaction_id": transaction.id,
            "status": transaction.status,
            "amount": float(transaction.amount),
            "phone_number": transaction.phone_number,
            "mpesa_receipt_number": getattr(transaction, 'mpesa_receipt_number', None),
            "transaction_date": transaction.transaction_date.isoformat() if hasattr(transaction, 'transaction_date') and transaction.transaction_date else None,
            "result_desc": getattr(transaction, 'result_desc', None),
            "created_at": transaction.created_at.isoformat()
        }), 200

    except Exception as e:
        logger.error(f"Error checking payment status: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

@mpesa_routes.route('/transactions', methods=['GET'])
@jwt_required()
@cross_origin()
def get_user_transactions():
    """Get user's M-PESA transactions"""
    try:
        user_id = get_jwt_identity()

        # Get pagination parameters
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 10, type=int), 100)

        # Get transactions
        transactions = MpesaTransaction.query.filter_by(user_id=user_id)\
            .order_by(MpesaTransaction.created_at.desc())\
            .paginate(page=page, per_page=per_page, error_out=False)

        # Convert transactions to dict
        transaction_list = []
        for transaction in transactions.items:
            transaction_dict = {
                "id": transaction.id,
                "order_id": transaction.order_id,
                "phone_number": transaction.phone_number,
                "amount": float(transaction.amount),
                "description": transaction.description,
                "status": transaction.status,
                "created_at": transaction.created_at.isoformat(),
                "mpesa_receipt_number": getattr(transaction, 'mpesa_receipt_number', None),
                "transaction_date": transaction.transaction_date.isoformat() if hasattr(transaction, 'transaction_date') and transaction.transaction_date else None,
                "result_desc": getattr(transaction, 'result_desc', None)
            }
            transaction_list.append(transaction_dict)

        return jsonify({
            "transactions": transaction_list,
            "pagination": {
                "page": transactions.page,
                "per_page": transactions.per_page,
                "total": transactions.total,
                "pages": transactions.pages,
                "has_next": transactions.has_next,
                "has_prev": transactions.has_prev
            }
        }), 200

    except Exception as e:
        logger.error(f"Error getting user transactions: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

@mpesa_routes.route('/callback', methods=['POST'])
@cross_origin()
def mpesa_callback():
    """Handle M-PESA callback"""
    try:
        callback_data = request.get_json()
        logger.info(f"M-PESA Callback received: {callback_data}")

        if not callback_data:
            return jsonify({"ResultCode": 1, "ResultDesc": "No data received"}), 400

        # Extract callback data
        stk_callback = callback_data.get('Body', {}).get('stkCallback', {})
        checkout_request_id = stk_callback.get('CheckoutRequestID')
        result_code = stk_callback.get('ResultCode')
        result_desc = stk_callback.get('ResultDesc')

        if not checkout_request_id:
            logger.error("No CheckoutRequestID in callback")
            return jsonify({"ResultCode": 1, "ResultDesc": "Invalid callback data"}), 400

        # Find transaction
        transaction = MpesaTransaction.query.filter_by(
            checkout_request_id=checkout_request_id
        ).first()

        if not transaction:
            logger.error(f"Transaction not found for CheckoutRequestID: {checkout_request_id}")
            return jsonify({"ResultCode": 1, "ResultDesc": "Transaction not found"}), 404

        # Update transaction
        transaction.result_code = str(result_code)
        transaction.result_desc = result_desc
        transaction.callback_response = str(callback_data)
        transaction.callback_received_at = datetime.now(timezone.utc)
        transaction.updated_at = datetime.now(timezone.utc)

        if result_code == 0:
            # Payment successful
            transaction.status = 'completed'
            transaction.transaction_date = datetime.now(timezone.utc)

            # Extract M-PESA receipt number from callback items with proper error handling
            try:
                callback_metadata = stk_callback.get('CallbackMetadata', {})
                items = callback_metadata.get('Item', [])

                # Ensure items is a list
                if isinstance(items, list):
                    for item in items:
                        if isinstance(item, dict) and item.get('Name') == 'MpesaReceiptNumber':
                            transaction.mpesa_receipt_number = item.get('Value')
                            break
            except Exception as metadata_error:
                logger.warning(f"Error parsing callback metadata: {str(metadata_error)}")

            # Update order status
            try:
                order = Order.query.get(transaction.order_id)
                if order:
                    if hasattr(order, 'payment_status'):
                        order.payment_status = PaymentStatus.PAID
                    if hasattr(order, 'status'):
                        order.status = OrderStatus.CONFIRMED
            except Exception as order_error:
                logger.warning(f"Error updating order status: {str(order_error)}")

            logger.info(f"Payment completed for transaction {transaction.id}")

        elif result_code in [1032, 1037]:
            # Payment cancelled
            transaction.status = 'cancelled'
            logger.info(f"Payment cancelled for transaction {transaction.id}")

        else:
            # Payment failed
            transaction.status = 'failed'
            logger.info(f"Payment failed for transaction {transaction.id}: {result_desc}")

        db.session.commit()

        return jsonify({"ResultCode": 0, "ResultDesc": "Success"}), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error processing M-PESA callback: {str(e)}")
        return jsonify({"ResultCode": 1, "ResultDesc": "Internal server error"}), 500

# =====================
# ADMIN ROUTES
# =====================

@mpesa_routes.route('/admin/transactions', methods=['GET'])
@jwt_required()
@admin_required
@cross_origin()
def admin_get_transactions():
    """Get all M-PESA transactions (Admin only)"""
    try:
        # Get query parameters
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 100)
        status = request.args.get('status')
        user_id = request.args.get('user_id', type=int)
        order_id = request.args.get('order_id')

        # Build query
        query = MpesaTransaction.query

        if status:
            query = query.filter(MpesaTransaction.status == status)
        if user_id:
            query = query.filter(MpesaTransaction.user_id == user_id)
        if order_id:
            query = query.filter(MpesaTransaction.order_id == order_id)

        # Get paginated results
        transactions = query.order_by(MpesaTransaction.created_at.desc())\
            .paginate(page=page, per_page=per_page, error_out=False)

        # Get transaction data with user info
        transaction_data = []
        for transaction in transactions.items:
            data = {
                "id": transaction.id,
                "user_id": transaction.user_id,
                "order_id": transaction.order_id,
                "phone_number": transaction.phone_number,
                "amount": float(transaction.amount) if transaction.amount else 0,
                "description": transaction.description,
                "status": transaction.status,
                "created_at": transaction.created_at.isoformat() if transaction.created_at else None,
                "mpesa_receipt_number": getattr(transaction, 'mpesa_receipt_number', None),
                "transaction_date": transaction.transaction_date.isoformat() if hasattr(transaction, 'transaction_date') and transaction.transaction_date else None,
                "result_desc": getattr(transaction, 'result_desc', None)
            }

            # Add user info
            if transaction.user_id:
                user = User.query.get(transaction.user_id)
                if user:
                    data['user'] = {
                        'id': user.id,
                        'name': getattr(user, 'name', 'Unknown'),
                        'email': getattr(user, 'email', 'Unknown')
                    }
            else:
                data['user'] = None
            transaction_data.append(data)

        return jsonify({
            "transactions": transaction_data,
            "pagination": {
                "page": transactions.page,
                "per_page": transactions.per_page,
                "total": transactions.total,
                "pages": transactions.pages,
                "has_next": transactions.has_next,
                "has_prev": transactions.has_prev
            }
        }), 200

    except Exception as e:
        logger.error(f"Error getting admin transactions: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

@mpesa_routes.route('/admin/stats', methods=['GET'])
@jwt_required()
@admin_required
@cross_origin()
def admin_get_stats():
    """Get M-PESA payment statistics (Admin only)"""
    try:
        from sqlalchemy import func, and_

        # Get date range
        days = request.args.get('days', 30, type=int)
        start_date = datetime.now(timezone.utc) - timedelta(days=days)

        # Total transactions
        total_transactions = MpesaTransaction.query.count()

        # Recent transactions
        recent_transactions = MpesaTransaction.query.filter(
            MpesaTransaction.created_at >= start_date
        ).count()

        # Transaction status counts
        status_counts = db.session.query(
            MpesaTransaction.status,
            func.count(MpesaTransaction.id)
        ).group_by(MpesaTransaction.status).all()

        # Total amount processed
        total_amount = db.session.query(
            func.sum(MpesaTransaction.amount)
        ).filter(MpesaTransaction.status == 'completed').scalar() or 0

        # Recent amount processed
        recent_amount = db.session.query(
            func.sum(MpesaTransaction.amount)
        ).filter(
            and_(
                MpesaTransaction.status == 'completed',
                MpesaTransaction.created_at >= start_date
            )
        ).scalar() or 0

        # Success rate
        completed_count = MpesaTransaction.query.filter_by(status='completed').count()
        success_rate = (completed_count / total_transactions * 100) if total_transactions > 0 else 0

        return jsonify({
            "total_transactions": total_transactions,
            "recent_transactions": recent_transactions,
            "total_amount": float(total_amount),
            "recent_amount": float(recent_amount),
            "success_rate": round(success_rate, 2),
            "status_counts": {status: count for status, count in status_counts},
            "period_days": days
        }), 200

    except Exception as e:
        logger.error(f"Error getting M-PESA stats: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

# =====================
# HEALTH CHECK
# =====================

@mpesa_routes.route('/health', methods=['GET'])
@cross_origin()
def health_check():
    """M-PESA service health check"""
    try:
        # Test M-PESA client
        token_valid = mpesa_client.get_access_token() is not None if mpesa_client else False

        return jsonify({
            "status": "healthy" if token_valid else "unhealthy",
            "service": "mpesa",
            "token_valid": token_valid,
            "client_available": mpesa_client is not None,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }), 200 if token_valid else 503

    except Exception as e:
        logger.error(f"M-PESA health check failed: {str(e)}")
        return jsonify({
            "status": "unhealthy",
            "service": "mpesa",
            "error": str(e),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }), 503

# Export the blueprint
__all__ = ['mpesa_routes']
