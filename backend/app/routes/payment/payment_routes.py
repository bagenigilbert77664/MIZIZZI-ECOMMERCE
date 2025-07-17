"""
Payment API Routes for Mizizzi E-commerce Platform.
Handles all payment-related operations including transactions, methods, and callbacks.
"""
from flask import Blueprint, jsonify, request, current_app, g
from flask_jwt_extended import jwt_required, get_jwt_identity
from flask_cors import cross_origin
import logging
from datetime import datetime
import json
import uuid
import traceback

from ...models.models import (
    User, Payment, PaymentStatus, Order, OrderStatus, db, PaymentMethod,
    PaymentTransaction
)
from ...validations.validation import admin_required

# Set up logger
logger = logging.getLogger(__name__)

# Create blueprint
payment_routes = Blueprint('payment', __name__)

# Helper function to handle OPTIONS requests
def handle_options_request():
    response = jsonify({'status': 'ok'})
    response.headers.add('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    return response

@payment_routes.route('/transactions', methods=['GET', 'OPTIONS'])
@cross_origin()
@jwt_required()
def get_transactions():
    """
    Get user's transaction history.

    Query Parameters:
        page: Page number (default: 1)
        per_page: Items per page (default: 10)
        status: Filter by status (optional)
        payment_method: Filter by payment method (optional)

    Returns:
        JSON with transaction history
    """
    if request.method == 'OPTIONS':
        return handle_options_request()

    # Check if user is authenticated
    try:
        user_id = get_jwt_identity()
        if not user_id:
            return jsonify({
                'success': False,
                'error': 'Authentication required'
            }), 401
    except Exception:
        return jsonify({
            'success': False,
            'error': 'Authentication required'
        }), 401

    # Get query parameters
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    status = request.args.get('status')
    payment_method = request.args.get('payment_method')

    try:
        # First try to get transactions from PaymentTransaction model
        query = PaymentTransaction.query.filter_by(user_id=user_id)

        # Apply filters
        if status:
            query = query.filter(PaymentTransaction.status == status)

        if payment_method:
            query = query.join(PaymentMethod).filter(PaymentMethod.name.ilike(f'%{payment_method}%'))

        # Order by created_at (newest first)
        query = query.order_by(PaymentTransaction.created_at.desc())

        # Paginate results
        paginated = query.paginate(page=page, per_page=per_page, error_out=False)

        # Prepare response
        transactions = []

        for transaction in paginated.items:
            # Format transaction
            tx_data = {
                'id': transaction.id,
                'user_id': transaction.user_id,
                'amount': float(transaction.amount),
                'payment_method': transaction.payment_method.name if transaction.payment_method else None,
                'transaction_type': transaction.transaction_type,
                'reference_id': transaction.reference_id,
                'transaction_id': transaction.transaction_id,
                'provider_reference': transaction.provider_reference,
                'status': transaction.status,
                'created_at': transaction.created_at.isoformat() if transaction.created_at else None,
                'updated_at': transaction.updated_at.isoformat() if transaction.updated_at else None,
                'completed_at': transaction.completed_at.isoformat() if transaction.completed_at else None,
                'transaction_metadata': transaction.transaction_metadata
            }

            transactions.append(tx_data)

        # If no transactions found in the new model, try the old Payment model
        if not transactions:
            # Build query for old Payment model
            payment_query = Payment.query.join(Order).filter(Order.user_id == user_id)

            # Apply filters
            if status:
                payment_query = payment_query.filter(Payment.status == status)

            if payment_method:
                payment_query = payment_query.filter(Payment.payment_method.ilike(f'%{payment_method}%'))

            # Order by created_at (newest first)
            payment_query = payment_query.order_by(Payment.created_at.desc())

            # Paginate results
            payment_paginated = payment_query.paginate(page=page, per_page=per_page, error_out=False)

            for payment in payment_paginated.items:
                # Get order details
                order = Order.query.get(payment.order_id)

                # Parse transaction data if available
                transaction_data = {}
                if payment.transaction_data:
                    try:
                        if isinstance(payment.transaction_data, str):
                            transaction_data = json.loads(payment.transaction_data)
                        else:
                            transaction_data = payment.transaction_data
                    except (json.JSONDecodeError, TypeError):
                        transaction_data = {}

                # Format transaction
                tx_data = {
                    'id': payment.id,
                    'order_id': payment.order_id,
                    'order_number': order.order_number if order else None,
                    'amount': float(payment.amount),
                    'payment_method': payment.payment_method,
                    'transaction_id': payment.transaction_id,
                    'status': payment.status.value if hasattr(payment.status, 'value') else str(payment.status),
                    'created_at': payment.created_at.isoformat() if payment.created_at else None,
                    'completed_at': payment.completed_at.isoformat() if payment.completed_at else None,
                    'reference': payment.transaction_id or transaction_data.get('reference') or f"REF-{payment.id}",
                    'transaction_data': transaction_data
                }

                transactions.append(tx_data)

            # Update pagination info
            paginated = payment_paginated

        return jsonify({
            'success': True,
            'transactions': transactions,
            'pagination': {
                'page': paginated.page,
                'per_page': paginated.per_page,
                'total_pages': paginated.pages,
                'total_items': paginated.total
            }
        })

    except Exception as e:
        logger.error(f"Error fetching transactions: {str(e)}")
        return jsonify({
            'success': False,
            'error': f"Failed to fetch transactions: {str(e)}"
        }), 500

@payment_routes.route('/methods', methods=['GET', 'OPTIONS'])
@cross_origin()
def get_payment_methods():
    """
    Get available payment methods.

    Returns:
        JSON with payment methods
    """
    if request.method == 'OPTIONS':
        return handle_options_request()

    try:
        # Get all active payment methods
        methods = PaymentMethod.query.filter_by(is_active=True).all()

        payment_methods = []

        for method in methods:
            payment_methods.append({
                'id': method.id,
                'name': method.name,
                'code': method.code,
                'description': method.description,
                'instructions': method.instructions,
                'min_amount': float(method.min_amount) if method.min_amount else None,
                'max_amount': float(method.max_amount) if method.max_amount else None,
                'countries': method.countries.split(',') if method.countries else []
            })

        # If no payment methods found, return some default methods
        if not payment_methods:
            payment_methods = [
                {
                    'id': 1,
                    'name': 'Credit Card',
                    'code': 'card',
                    'description': 'Pay with Visa, Mastercard, or American Express',
                    'instructions': 'Enter your card details to complete the payment',
                    'min_amount': 1.00,
                    'max_amount': 10000.00,
                    'countries': ['US', 'CA', 'GB', 'EU', 'KE']
                },
                {
                    'id': 2,
                    'name': 'M-PESA',
                    'code': 'mpesa',
                    'description': 'Pay with M-PESA mobile money',
                    'instructions': 'Enter your phone number to receive a payment prompt',
                    'min_amount': 10.00,
                    'max_amount': 150000.00,
                    'countries': ['KE', 'TZ', 'UG']
                },
                {
                    'id': 3,
                    'name': 'Cash on Delivery',
                    'code': 'cod',
                    'description': 'Pay when you receive your order',
                    'instructions': 'Have the exact amount ready when your order arrives',
                    'min_amount': 0.00,
                    'max_amount': 50000.00,
                    'countries': ['KE']
                }
            ]

        return jsonify({
            'success': True,
            'payment_methods': payment_methods
        })

    except Exception as e:
        logger.error(f"Error fetching payment methods: {str(e)}")
        return jsonify({
            'success': False,
            'error': f"Failed to fetch payment methods: {str(e)}"
        }), 500

@payment_routes.route('/initiate', methods=['POST'])
@jwt_required()
def initiate_payment():
    """
    Initiate a payment transaction.

    Request Body:
        payment_method: Payment method code
        amount: Amount to pay
        reference_id: Reference ID (e.g., order ID)
        metadata: Additional metadata (optional)

    Returns:
        JSON with payment initiation status
    """
    user_id = get_jwt_identity()

    try:
        data = request.get_json()

        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400

        # Validate required fields
        required_fields = ['payment_method', 'amount', 'reference_id']
        missing_fields = [field for field in required_fields if field not in data]

        if missing_fields:
            return jsonify({
                'success': False,
                'error': f"Missing required fields: {', '.join(missing_fields)}"
            }), 400

        payment_method = data.get('payment_method')
        amount = float(data.get('amount'))
        reference_id = data.get('reference_id')
        metadata = data.get('metadata', {})

        # Handle different payment methods
        if payment_method == 'mpesa':
            # Validate phone number
            phone = data.get('phone')
            if not phone:
                return jsonify({
                    'success': False,
                    'error': 'Phone number is required for M-PESA payments'
                }), 400

            # Format phone number
            if phone.startswith("+"):
                phone = phone[1:]
            if phone.startswith("0"):
                phone = "254" + phone[1:]

            # Import the direct M-PESA implementation
            try:
                from ...mpesa.direct_mpesa import initiate_stk_push
            except ImportError:
                # Try alternative import paths
                try:
                    from ...mpesa.direct_mpesa import initiate_stk_push
                except ImportError:
                    logger.error("Failed to import initiate_stk_push function")
                    return jsonify({
                        'success': False,
                        'error': 'M-PESA integration is not available'
                    }), 500

            # Use the direct implementation to initiate payment
            response = initiate_stk_push(
                phone_number=phone,
                amount=amount,
                account_reference=f"REF-{reference_id}",
                transaction_desc=f"Payment for reference {reference_id}"
            )

            if not response:
                return jsonify({
                    'success': False,
                    'error': 'Failed to initiate payment'
                }), 500

            # Create transaction record
            transaction = PaymentTransaction(
                user_id=user_id,
                amount=amount,
                payment_method_id=2,  # Assuming 2 is M-PESA
                transaction_type="payment",
                reference_id=reference_id,
                provider="mpesa",
                provider_reference=response.get('CheckoutRequestID'),
                status="pending",
                transaction_metadata=response
            )

            db.session.add(transaction)
            db.session.commit()

            # Return the response
            return jsonify({
                'success': True,
                'message': 'M-PESA payment initiated',
                'reference_id': reference_id,
                'phone': phone,
                'amount': amount,
                'checkout_request_id': response.get('CheckoutRequestID'),
                'merchant_request_id': response.get('MerchantRequestID'),
                'response_code': response.get('ResponseCode'),
                'response_description': response.get('ResponseDescription'),
                'customer_message': response.get('CustomerMessage'),
                'transaction_id': transaction.id
            })

        elif payment_method == 'card':
            # For card payments, we would typically redirect to a payment gateway
            # or use a client-side SDK. For this example, we'll just create a
            # transaction record and return a success response.

            transaction = PaymentTransaction(
                user_id=user_id,
                amount=amount,
                payment_method_id=1,  # Assuming 1 is Credit Card
                transaction_type="payment",
                reference_id=reference_id,
                provider="card",
                status="pending",
                transaction_metadata=metadata
            )

            db.session.add(transaction)
            db.session.commit()

            return jsonify({
                'success': True,
                'message': 'Card payment initiated',
                'reference_id': reference_id,
                'amount': amount,
                'transaction_id': transaction.id,
                'redirect_url': f"/payments/{transaction.id}/card"
            })

        elif payment_method == 'cod':
            # For cash on delivery, we just create a transaction record
            # and mark it as pending

            transaction = PaymentTransaction(
                user_id=user_id,
                amount=amount,
                payment_method_id=3,  # Assuming 3 is Cash on Delivery
                transaction_type="payment",
                reference_id=reference_id,
                provider="cod",
                status="pending",
                transaction_metadata=metadata
            )

            db.session.add(transaction)
            db.session.commit()

            return jsonify({
                'success': True,
                'message': 'Cash on delivery payment recorded',
                'reference_id': reference_id,
                'amount': amount,
                'transaction_id': transaction.id
            })

        else:
            return jsonify({
                'success': False,
                'error': f"Unsupported payment method: {payment_method}"
            }), 400

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error initiating payment: {str(e)}")
        return jsonify({
            'success': False,
            'error': f"Failed to initiate payment: {str(e)}"
        }), 500

@payment_routes.route('/check-status/<transaction_id>', methods=['GET'])
@jwt_required()
def check_payment_status(transaction_id):
    """
    Check the status of a payment transaction.

    Path Parameters:
        transaction_id: ID of the transaction to check

    Returns:
        JSON with payment status
    """
    user_id = get_jwt_identity()

    try:
        # Get transaction details
        transaction = PaymentTransaction.query.filter_by(id=transaction_id).first()

        if not transaction:
            return jsonify({
                'success': False,
                'error': 'Transaction not found'
            }), 404

        # Validate transaction belongs to user
        if transaction.user_id != user_id:
            return jsonify({
                'success': False,
                'error': 'Unauthorized access to transaction'
            }), 403

        # For M-PESA transactions, check the status with Safaricom
        if transaction.provider == 'mpesa' and transaction.provider_reference:
            try:
                # Import the query function
                try:
                    from ...mpesa.direct_mpesa import query_stk_status
                except ImportError:
                    # Try alternative import paths
                    try:
                        from ...mpesa.direct_mpesa import query_stk_status
                    except ImportError:
                        logger.error("Failed to import query_stk_status function")
                        return jsonify({
                            'success': True,
                            'transaction': {
                                'id': transaction.id,
                                'status': transaction.status,
                                'provider': transaction.provider,
                                'provider_reference': transaction.provider_reference,
                                'amount': float(transaction.amount),
                                'created_at': transaction.created_at.isoformat() if transaction.created_at else None,
                                'updated_at': transaction.updated_at.isoformat() if transaction.updated_at else None,
                                'completed_at': transaction.completed_at.isoformat() if transaction.completed_at else None
                            }
                        })

                # Query the status
                response = query_stk_status(transaction.provider_reference)

                if response:
                    # Update transaction status based on response
                    result_code = response.get('ResultCode')

                    if result_code == 0:
                        transaction.status = 'completed'
                        transaction.completed_at = datetime.now()

                        # Update order status if this is for an order
                        if transaction.reference_id and transaction.reference_id.isdigit():
                            order = Order.query.get(int(transaction.reference_id))
                            if order:
                                order.payment_status = PaymentStatus.PAID

                                # If order was pending payment, move it to processing
                                if order.status == OrderStatus.PENDING:
                                    order.status = OrderStatus.PROCESSING

                                # Update payment record
                                payment = Payment.query.filter_by(order_id=order.id).first()
                                if payment:
                                    payment.status = PaymentStatus.PAID
                                    payment.completed_at = datetime.now()
                                    payment.transaction_id = transaction.id

                    elif result_code == 1:
                        # Transaction is still being processed
                        transaction.status = 'pending'
                    else:
                        # Transaction failed
                        transaction.status = 'failed'

                    # Update transaction metadata
                    transaction.transaction_metadata = response

                    # Save changes
                    db.session.commit()
            except Exception as e:
                logger.error(f"Error querying M-PESA status: {str(e)}")
                # Continue with the current status

        # Return transaction details
        return jsonify({
            'success': True,
            'transaction': {
                'id': transaction.id,
                'status': transaction.status,
                'provider': transaction.provider,
                'provider_reference': transaction.provider_reference,
                'amount': float(transaction.amount),
                'created_at': transaction.created_at.isoformat() if transaction.created_at else None,
                'updated_at': transaction.updated_at.isoformat() if transaction.updated_at else None,
                'completed_at': transaction.completed_at.isoformat() if transaction.completed_at else None,
                'metadata': transaction.transaction_metadata
            }
        })

    except Exception as e:
        logger.error(f"Error checking payment status: {str(e)}")
        return jsonify({
            'success': False,
            'error': f"Failed to check payment status: {str(e)}"
        }), 500

@payment_routes.route('/callback/<provider>', methods=['POST', 'OPTIONS'])
@cross_origin()
def payment_callback(provider):
    """
    Callback endpoint for payment notifications.

    Request Body:
        Payment callback data

    Returns:
        JSON acknowledgment
    """
    if request.method == 'OPTIONS':
        return handle_options_request()

    try:
        # Get callback data
        data = request.get_json()

        if not data:
            logger.error(f"Empty {provider} callback data")
            return jsonify({
                'success': False,
                'error': 'Empty callback data'
            }), 400

        logger.info(f"{provider} callback received: {data}")

        # Handle different providers
        if provider == 'mpesa':
            # Extract M-PESA specific fields
            transaction_id = data.get('TransID') or data.get('transaction_id')
            reference = data.get('BillRefNumber') or data.get('reference')
            status = data.get('ResultCode') or data.get('status')

            # Find the transaction by provider reference
            transaction = None
            if reference:
                transaction = PaymentTransaction.query.filter_by(
                    provider='mpesa',
                    provider_reference=reference
                ).first()

            # If not found by reference, try by transaction ID
            if not transaction and transaction_id:
                transaction = PaymentTransaction.query.filter_by(
                    provider='mpesa',
                    provider_transaction_id=transaction_id
                ).first()

            if transaction:
                # Update transaction with callback data
                transaction.provider_transaction_id = transaction_id or transaction.provider_transaction_id
                transaction.transaction_metadata = data

                # Update status based on M-PESA result code
                if status == '0' or status == 'success':
                    transaction.status = 'completed'
                    transaction.completed_at = datetime.now()

                    # If this is for an order, update the order status
                    if transaction.reference_id and transaction.reference_id.isdigit():
                        order = Order.query.get(int(transaction.reference_id))
                        if order:
                            order.payment_status = PaymentStatus.PAID

                            # If order was pending payment, move it to processing
                            if order.status == OrderStatus.PENDING:
                                order.status = OrderStatus.PROCESSING

                            # Update payment record
                            payment = Payment.query.filter_by(order_id=order.id).first()
                            if payment:
                                payment.status = PaymentStatus.PAID
                                payment.completed_at = datetime.now()
                                payment.transaction_id = transaction.id
                else:
                    transaction.status = 'failed'

                db.session.commit()

                return jsonify({
                    "message": "Callback processed successfully",
                    "transaction_id": transaction.id,
                    "status": transaction.status
                }), 200
            else:
                logger.warning(f"No matching transaction found for {provider} callback: {json.dumps(data)}")
                return jsonify({
                    "message": "No matching transaction found",
                    "received_data": data
                }), 200

        elif provider == 'card':
            # Extract card payment specific fields
            transaction_id = data.get('transaction_id')
            reference = data.get('reference')
            status = data.get('status')

            # Find the transaction by provider reference
            transaction = None
            if reference:
                transaction = PaymentTransaction.query.filter_by(
                    provider='card',
                    provider_reference=reference
                ).first()

            # If not found by reference, try by transaction ID
            if not transaction and transaction_id:
                transaction = PaymentTransaction.query.filter_by(
                    provider='card',
                    provider_transaction_id=transaction_id
                ).first()

            if transaction:
                # Update transaction with callback data
                transaction.provider_transaction_id = transaction_id or transaction.provider_transaction_id
                transaction.transaction_metadata = data

                # Update status based on card payment status
                if status == 'success':
                    transaction.status = 'completed'
                    transaction.completed_at = datetime.now()

                    # If this is for an order, update the order status
                    if transaction.reference_id and transaction.reference_id.isdigit():
                        order = Order.query.get(int(transaction.reference_id))
                        if order:
                            order.payment_status = PaymentStatus.PAID

                            # If order was pending payment, move it to processing
                            if order.status == OrderStatus.PENDING:
                                order.status = OrderStatus.PROCESSING

                            # Update payment record
                            payment = Payment.query.filter_by(order_id=order.id).first()
                            if payment:
                                payment.status = PaymentStatus.PAID
                                payment.completed_at = datetime.now()
                                payment.transaction_id = transaction.id
                elif status == 'failed':
                    transaction.status = 'failed'

                db.session.commit()

                return jsonify({
                    "message": "Callback processed successfully",
                    "transaction_id": transaction.id,
                    "status": transaction.status
                }), 200
            else:
                logger.warning(f"No matching transaction found for {provider} callback: {json.dumps(data)}")
                return jsonify({
                    "message": "No matching transaction found",
                    "received_data": data
                }), 200

        else:
            # Generic handler for other providers
            logger.warning(f"Unhandled payment provider callback: {provider}")
            return jsonify({
                "message": f"Callback received for provider: {provider}",
                "received_data": data
            }), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error processing {provider} callback: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({
            "error": f"Failed to process {provider} callback",
            "details": str(e)
        }), 500

@payment_routes.route('/verify/<transaction_id>', methods=['POST'])
@jwt_required()
def verify_payment(transaction_id):
    """
    Manually verify a payment transaction.

    Path Parameters:
        transaction_id: ID of the transaction to verify

    Returns:
        JSON with verification status
    """
    user_id = get_jwt_identity()

    try:
        # Get transaction details
        transaction = PaymentTransaction.query.filter_by(id=transaction_id).first()

        if not transaction:
            return jsonify({
                'success': False,
                'error': 'Transaction not found'
            }), 404

        # Validate transaction belongs to user
        if transaction.user_id != user_id:
            return jsonify({
                'success': False,
                'error': 'Unauthorized access to transaction'
            }), 403

        # Update transaction status
        transaction.status = 'completed'
        transaction.completed_at = datetime.now()

        # If this is for an order, update the order status
        if transaction.reference_id and transaction.reference_id.isdigit():
            order = Order.query.get(int(transaction.reference_id))
            if order:
                order.payment_status = PaymentStatus.PAID

                # If order was pending payment, move it to processing
                if order.status == OrderStatus.PENDING:
                    order.status = OrderStatus.PROCESSING

                # Update payment record
                payment = Payment.query.filter_by(order_id=order.id).first()
                if payment:
                    payment.status = PaymentStatus.PAID
                    payment.completed_at = datetime.now()
                    payment.transaction_id = transaction.id

        # Save changes
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Payment verified successfully',
            'transaction': {
                'id': transaction.id,
                'status': transaction.status,
                'provider': transaction.provider,
                'amount': float(transaction.amount),
                'completed_at': transaction.completed_at.isoformat() if transaction.completed_at else None
            }
        })

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error verifying payment: {str(e)}")
        return jsonify({
            'success': False,
            'error': f"Failed to verify payment: {str(e)}"
        }), 500

@payment_routes.route('/retry/<transaction_id>', methods=['POST'])
@jwt_required()
def retry_payment(transaction_id):
    """
    Retry a failed payment transaction.

    Path Parameters:
        transaction_id: ID of the transaction to retry

    Returns:
        JSON with retry status
    """
    user_id = get_jwt_identity()

    try:
        # Get transaction details
        transaction = PaymentTransaction.query.filter_by(id=transaction_id).first()

        if not transaction:
            return jsonify({
                'success': False,
                'error': 'Transaction not found'
            }), 404

        # Validate transaction belongs to user
        if transaction.user_id != user_id:
            return jsonify({
                'success': False,
                'error': 'Unauthorized access to transaction'
            }), 403

        # Check if transaction is failed or pending
        if transaction.status not in ['failed', 'pending']:
            return jsonify({
                'success': False,
                'error': 'Only failed or pending transactions can be retried'
            }), 400

        # Get request data
        data = request.get_json() or {}

        # Handle different payment methods
        if transaction.provider == 'mpesa':
            # Validate phone number
            phone = data.get('phone')
            if not phone:
                return jsonify({
                    'success': False,
                    'error': 'Phone number is required for M-PESA payments'
                }), 400

            # Format phone number
            if phone.startswith("+"):
                phone = phone[1:]
            if phone.startswith("0"):
                phone = "254" + phone[1:]

            # Import the direct M-PESA implementation
            try:
                from ...mpesa.direct_mpesa import initiate_stk_push
            except ImportError:
                # Try alternative import paths
                try:
                    from ...mpesa.direct_mpesa import initiate_stk_push
                except ImportError:
                    logger.error("Failed to import initiate_stk_push function")
                    return jsonify({
                        'success': False,
                        'error': 'M-PESA integration is not available'
                    }), 500

            # Use the direct implementation to initiate payment
            response = initiate_stk_push(
                phone_number=phone,
                amount=float(transaction.amount),
                account_reference=f"REF-{transaction.reference_id}",
                transaction_desc=f"Payment retry for reference {transaction.reference_id}"
            )

            if not response:
                return jsonify({
                    'success': False,
                    'error': 'Failed to initiate payment'
                }), 500

            # Update transaction
            transaction.status = 'pending'
            transaction.provider_reference = response.get('CheckoutRequestID')
            transaction.transaction_metadata = response
            transaction.updated_at = datetime.now()

            # Save changes
            db.session.commit()

            # Return the response
            return jsonify({
                'success': True,
                'message': 'M-PESA payment retry initiated',
                'reference_id': transaction.reference_id,
                'phone': phone,
                'amount': float(transaction.amount),
                'checkout_request_id': response.get('CheckoutRequestID'),
                'merchant_request_id': response.get('MerchantRequestID'),
                'response_code': response.get('ResponseCode'),
                'response_description': response.get('ResponseDescription'),
                'customer_message': response.get('CustomerMessage'),
                'transaction_id': transaction.id
            })

        elif transaction.provider == 'card':
            # For card payments, we would typically redirect to a payment gateway
            # or use a client-side SDK. For this example, we'll just update the
            # transaction record and return a success response.

            transaction.status = 'pending'
            transaction.updated_at = datetime.now()

            db.session.commit()

            return jsonify({
                'success': True,
                'message': 'Card payment retry initiated',
                'reference_id': transaction.reference_id,
                'amount': float(transaction.amount),
                'transaction_id': transaction.id,
                'redirect_url': f"/payments/{transaction.id}/card"
            })

        else:
            return jsonify({
                'success': False,
                'error': f"Unsupported payment method: {transaction.provider}"
            }), 400

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error retrying payment: {str(e)}")
        return jsonify({
            'success': False,
            'error': f"Failed to retry payment: {str(e)}"
        }), 500

@payment_routes.route('/status', methods=['GET'])
def payment_status():
    """
    Get the status of the payment system.

    Returns:
        JSON with payment system status
    """
    return jsonify({
        'success': True,
        'status': 'active',
        'message': 'Payment system is operational',
        'version': '1.0.0',
        'supported_methods': ['mpesa', 'card', 'cod']
    })
