"""
Checkout API Routes for Mizizzi E-commerce Platform.
Provides endpoints for checkout process and payment integration.
"""
from flask import Blueprint, jsonify, request, g, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
import logging
import json
from datetime import datetime
import uuid

from ...models.models import (
    User, Cart, CartItem, Order, OrderItem, OrderStatus,
    Payment, PaymentStatus, Address, ShippingMethod, PaymentMethod, db
)
from ...validations.cart_validation import validate_checkout
from ...direct_mpesa import initiate_stk_push

# Set up logger
logger = logging.getLogger(__name__)

# Create blueprint
checkout_routes = Blueprint('checkout', __name__)

@checkout_routes.route('/process', methods=['POST'])
@jwt_required()
def process_checkout():
    """
    Process checkout and create an order.

    Request Body:
        payment_method: Payment method ID or code
        shipping_method: Shipping method ID (if applicable)
        shipping_address: Shipping address ID
        billing_address: Billing address ID (optional if same as shipping)
        same_as_shipping: Boolean indicating if billing address is same as shipping
        notes: Order notes (optional)

    Returns:
        JSON with order details and payment instructions
    """
    user_id = get_jwt_identity()

    # Get request data
    data = request.get_json()

    if not data:
        return jsonify({
            'success': False,
            'error': 'No data provided'
        }), 400

    # Extract data
    payment_method_id = data.get('payment_method')
    shipping_method_id = data.get('shipping_method')
    shipping_address_id = data.get('shipping_address')
    billing_address_id = data.get('billing_address')
    same_as_shipping = data.get('same_as_shipping', True)
    notes = data.get('notes')

    # Validate required fields
    if not payment_method_id:
        return jsonify({
            'success': False,
            'error': 'Payment method is required'
        }), 400

    if not shipping_address_id:
        return jsonify({
            'success': False,
            'error': 'Shipping address is required'
        }), 400

    try:
        # Get active cart
        cart = Cart.query.filter_by(user_id=user_id, is_active=True).first()

        if not cart:
            return jsonify({
                'success': False,
                'error': 'Cart not found'
            }), 404

        # Validate cart for checkout
        is_valid, errors, warnings = validate_checkout(cart.id)

        if not is_valid:
            return jsonify({
                'success': False,
                'errors': errors,
                'warnings': warnings
            }), 400

        # Get shipping address
        shipping_address = Address.query.get(shipping_address_id)

        if not shipping_address:
            return jsonify({
                'success': False,
                'error': 'Shipping address not found'
            }), 404

        # Check if shipping address belongs to user
        if shipping_address.user_id != int(user_id):
            return jsonify({
                'success': False,
                'error': 'Shipping address does not belong to user'
            }), 403

        # Get billing address
        billing_address = None
        if same_as_shipping:
            billing_address = shipping_address
        elif billing_address_id:
            billing_address = Address.query.get(billing_address_id)

            if not billing_address:
                return jsonify({
                    'success': False,
                    'error': 'Billing address not found'
                }), 404

            # Check if billing address belongs to user
            if billing_address.user_id != int(user_id):
                return jsonify({
                    'success': False,
                    'error': 'Billing address does not belong to user'
                }), 403
        else:
            return jsonify({
                'success': False,
                'error': 'Billing address is required when not using shipping address'
            }), 400

        # Get shipping method if applicable
        shipping_method = None
        if shipping_method_id:
            shipping_method = ShippingMethod.query.get(shipping_method_id)

            if not shipping_method:
                return jsonify({
                    'success': False,
                    'error': 'Shipping method not found'
                }), 404

        # Get payment method
        payment_method = None
        payment_method_code = None

        # Check if payment_method_id is a code or an ID
        if isinstance(payment_method_id, str) and not payment_method_id.isdigit():
            payment_method_code = payment_method_id
            payment_method = PaymentMethod.query.filter_by(code=payment_method_code).first()
        else:
            payment_method = PaymentMethod.query.get(payment_method_id)
            if payment_method:
                payment_method_code = payment_method.code

        if not payment_method:
            return jsonify({
                'success': False,
                'error': 'Payment method not found'
            }), 404

        # Create order
        order_number = f"ORD-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"

        order = Order(
            user_id=user_id,
            order_number=order_number,
            status=OrderStatus.PENDING,
            total_amount=cart.total,
            shipping_address=shipping_address.to_dict(),
            billing_address=billing_address.to_dict(),
            payment_method=payment_method_code or payment_method.name,
            payment_status=PaymentStatus.PENDING,
            shipping_method=shipping_method.name if shipping_method else None,
            shipping_cost=shipping_method.cost if shipping_method else 0.0,
            notes=notes,
            created_at=datetime.now(),
            updated_at=datetime.now()
        )

        db.session.add(order)
        db.session.flush()  # Get order ID without committing

        # Create order items
        cart_items = CartItem.query.filter_by(cart_id=cart.id).all()

        for cart_item in cart_items:
            order_item = OrderItem(
                order_id=order.id,
                product_id=cart_item.product_id,
                variant_id=cart_item.variant_id,
                quantity=cart_item.quantity,
                price=cart_item.price,
                total=cart_item.price * cart_item.quantity
            )

            db.session.add(order_item)

        # Handle payment based on payment method
        payment_instructions = None
        payment_redirect = None

        if payment_method_code == 'mpesa':
            # Get phone number from shipping address
            phone_number = shipping_address.phone

            # Format phone number
            if phone_number.startswith("+"):
                phone_number = phone_number[1:]
            if phone_number.startswith("0"):
                phone_number = "254" + phone_number[1:]

            # Create payment record
            payment = Payment(
                order_id=order.id,
                amount=cart.total,
                payment_method="M-PESA",
                status=PaymentStatus.PENDING,
                created_at=datetime.now()
            )

            db.session.add(payment)

            # Commit to save order and payment
            db.session.commit()

            # Set payment instructions
            payment_instructions = {
                'method': 'mpesa',
                'phone': phone_number,
                'amount': cart.total,
                'order_id': order.id,
                'message': 'Please complete the payment on your phone'
            }

            # Set payment redirect
            payment_redirect = f"/checkout/mpesa?order_id={order.id}&phone={phone_number}&amount={cart.total}"

        elif payment_method_code == 'card':
            # Create payment record
            payment = Payment(
                order_id=order.id,
                amount=cart.total,
                payment_method="Card",
                status=PaymentStatus.PENDING,
                created_at=datetime.now()
            )

            db.session.add(payment)

            # Commit to save order and payment
            db.session.commit()

            # Set payment redirect
            payment_redirect = f"/checkout/card?order_id={order.id}"

        elif payment_method_code == 'cod':
            # Create payment record
            payment = Payment(
                order_id=order.id,
                amount=cart.total,
                payment_method="Cash on Delivery",
                status=PaymentStatus.PENDING,
                created_at=datetime.now()
            )

            db.session.add(payment)

            # Commit to save order and payment
            db.session.commit()

            # Set payment redirect
            payment_redirect = f"/order-confirmation/{order.id}"

        else:
            # Generic payment handling
            # Create payment record
            payment = Payment(
                order_id=order.id,
                amount=cart.total,
                payment_method=payment_method.name,
                status=PaymentStatus.PENDING,
                created_at=datetime.now()
            )

            db.session.add(payment)

            # Commit to save order and payment
            db.session.commit()

            # Set payment redirect
            payment_redirect = f"/checkout/payment?order_id={order.id}&method={payment_method_code}"

        # Clear cart
        cart.is_active = False
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Order created successfully',
            'order': {
                'id': order.id,
                'order_number': order.order_number,
                'total_amount': order.total_amount,
                'status': order.status.value,
                'payment_status': order.payment_status.value,
                'created_at': order.created_at.isoformat()
            },
            'payment_instructions': payment_instructions,
            'payment_redirect': payment_redirect
        })

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error processing checkout: {str(e)}")
        return jsonify({
            'success': False,
            'error': f"Failed to process checkout: {str(e)}"
        }), 500

@checkout_routes.route('/mpesa-payment', methods=['POST'])
@jwt_required()
def initiate_mpesa_payment():
    """
    Initiate M-PESA payment for an order.

    Request Body:
        order_id: Order ID
        phone: Phone number (optional, will use address phone if not provided)

    Returns:
        JSON with payment initiation status
    """
    user_id = get_jwt_identity()

    # Get request data
    data = request.get_json()

    if not data:
        return jsonify({
            'success': False,
            'error': 'No data provided'
        }), 400

    # Extract data
    order_id = data.get('order_id')
    phone = data.get('phone')

    if not order_id:
        return jsonify({
            'success': False,
            'error': 'Order ID is required'
        }), 400

    try:
        # Get order
        order = Order.query.get(order_id)

        if not order:
            return jsonify({
                'success': False,
                'error': 'Order not found'
            }), 404

        # Check if order belongs to user
        if order.user_id != int(user_id):
            return jsonify({
                'success': False,
                'error': 'Order does not belong to user'
            }), 403

        # Check if order is already paid
        if order.payment_status == PaymentStatus.PAID:
            return jsonify({
                'success': False,
                'error': 'Order is already paid'
            }), 400

        # Get phone number
        if not phone:
            # Get phone from shipping address
            shipping_address = order.shipping_address
            if isinstance(shipping_address, str):
                shipping_address = json.loads(shipping_address)

            phone = shipping_address.get('phone')

        # Format phone number
        if phone.startswith("+"):
            phone = phone[1:]
        if phone.startswith("0"):
            phone = "254" + phone[1:]

        # Log the request
        logger.info(f"Initiating M-PESA payment for order {order_id}: phone={phone}, amount={order.total_amount}")

        # Use the direct implementation
        response = initiate_stk_push(
            phone_number=phone,
            amount=int(order.total_amount),
            account_reference=f"ORDER-{order.order_number}",
            transaction_desc=f"Payment for order #{order.order_number}"
        )

        if not response:
            return jsonify({
                'success': False,
                'error': 'Failed to initiate M-PESA payment'
            }), 500

        # Log the response
        logger.info(f"M-PESA payment response for order {order_id}: {response}")

        # Check if request was successful
        if 'ResponseCode' in response and response['ResponseCode'] == '0':
            # Store the checkout request ID for later reference
            checkout_request_id = response.get('CheckoutRequestID')
            merchant_request_id = response.get('MerchantRequestID')

            # Create or update payment record
            payment = Payment.query.filter_by(order_id=order.id).first()

            if not payment:
                payment = Payment(
                    order_id=order.id,
                    amount=order.total_amount,
                    payment_method="M-PESA",
                    transaction_id=checkout_request_id,
                    transaction_data=json.dumps({
                        'checkout_request_id': checkout_request_id,
                        'merchant_request_id': merchant_request_id,
                        'phone': phone
                    }),
                    status=PaymentStatus.PENDING,
                    created_at=datetime.now()
                )

                db.session.add(payment)
            else:
                payment.transaction_id = checkout_request_id
                payment.transaction_data = json.dumps({
                    'checkout_request_id': checkout_request_id,
                    'merchant_request_id': merchant_request_id,
                    'phone': phone
                })
                payment.status = PaymentStatus.PENDING
                payment.updated_at = datetime.now()

            db.session.commit()

            return jsonify({
                'success': True,
                'message': 'M-PESA payment initiated successfully',
                'checkout_request_id': checkout_request_id,
                'merchant_request_id': merchant_request_id,
                'response': response
            })
        else:
            error_message = response.get('ResponseDescription', 'Unknown error')
            logger.error(f"M-PESA payment initiation failed: {error_message}")

            return jsonify({
                'success': False,
                'error': f"Failed to initiate M-PESA payment: {error_message}",
                'response': response
            }), 400

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error initiating M-PESA payment: {str(e)}")
        return jsonify({
            'success': False,
            'error': f"Failed to initiate M-PESA payment: {str(e)}"
        }), 500
