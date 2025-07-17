"""
Checkout routes for the Mizizzi E-commerce platform.
Handles checkout process, payment methods, and order creation.
"""
from flask import Blueprint, request, jsonify, current_app, g
from flask_jwt_extended import jwt_required, get_jwt_identity
from flask_cors import cross_origin
import logging
import uuid
from datetime import datetime
import json
import random
import string

# Import models
from ...models.models import (
    db, User, Cart, CartItem, Order, OrderItem, OrderStatus,
    PaymentStatus, Address, ShippingMethod, Product,
    ProductVariant, Inventory, Payment, PaymentTransaction
)

# Create blueprint
checkout_routes = Blueprint('checkout', __name__)

# Set up logger
logger = logging.getLogger(__name__)

def generate_order_number():
    """Generate a unique order number"""
    prefix = "MZ"
    timestamp = datetime.now().strftime("%y%m%d")
    random_chars = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    return f"{prefix}{timestamp}{random_chars}"

@checkout_routes.route('/validate-cart', methods=['POST'])
@jwt_required()
def validate_cart():
    """
    Validate cart items before checkout.
    Checks stock availability and price changes.

    Returns:
        JSON with validation results
    """
    user_id = get_jwt_identity()

    try:
        # Get user's active cart
        cart = Cart.query.filter_by(user_id=user_id, is_active=True).first()

        if not cart or not cart.items:
            return jsonify({
                'success': False,
                'error': 'Cart is empty',
                'code': 'EMPTY_CART'
            }), 400

        # Check each item for stock and price changes
        stock_issues = []
        price_changes = []

        for item in cart.items:
            product = Product.query.get(item.product_id)

            if not product:
                stock_issues.append({
                    'product_id': item.product_id,
                    'message': 'Product no longer exists'
                })
                continue

            if not product.is_active:
                stock_issues.append({
                    'product_id': item.product_id,
                    'product_name': product.name,
                    'message': 'Product is no longer available'
                })
                continue

            # Check variant if applicable
            if item.variant_id:
                variant = ProductVariant.query.get(item.variant_id)
                if not variant:
                    stock_issues.append({
                        'product_id': item.product_id,
                        'product_name': product.name,
                        'message': 'Selected variant no longer exists'
                    })
                    continue

                # Check variant stock
                if variant.stock < item.quantity:
                    stock_issues.append({
                        'product_id': item.product_id,
                        'product_name': product.name,
                        'variant_id': variant.id,
                        'available': variant.stock,
                        'requested': item.quantity,
                        'message': f'Only {variant.stock} items available'
                    })

                # Check variant price
                current_price = float(variant.sale_price or variant.price)
                if abs(current_price - item.price) > 0.01:  # Allow for small floating point differences
                    price_changes.append({
                        'product_id': item.product_id,
                        'product_name': product.name,
                        'variant_id': variant.id,
                        'old_price': item.price,
                        'new_price': current_price,
                        'message': 'Price has changed'
                    })
            else:
                # Check product stock
                if product.stock < item.quantity:
                    stock_issues.append({
                        'product_id': item.product_id,
                        'product_name': product.name,
                        'available': product.stock,
                        'requested': item.quantity,
                        'message': f'Only {product.stock} items available'
                    })

                # Check product price
                current_price = float(product.sale_price or product.price)
                if abs(current_price - item.price) > 0.01:  # Allow for small floating point differences
                    price_changes.append({
                        'product_id': item.product_id,
                        'product_name': product.name,
                        'old_price': item.price,
                        'new_price': current_price,
                        'message': 'Price has changed'
                    })

        # Return validation results
        return jsonify({
            'success': True,
            'is_valid': len(stock_issues) == 0 and len(price_changes) == 0,
            'stock_issues': stock_issues,
            'price_changes': price_changes
        })

    except Exception as e:
        logger.error(f"Error validating cart: {str(e)}")
        return jsonify({
            'success': False,
            'error': f"Failed to validate cart: {str(e)}"
        }), 500

@checkout_routes.route('/shipping-methods', methods=['GET'])
@jwt_required()
def get_shipping_methods():
    """
    Get available shipping methods.

    Query Parameters:
        country: Country code (optional)

    Returns:
        JSON with shipping methods
    """
    try:
        country = request.args.get('country', 'KE')

        # Get shipping methods from database
        shipping_methods = ShippingMethod.query.filter(
            ShippingMethod.is_active == True
        ).all()

        # If no shipping methods found, return default methods
        if not shipping_methods:
            default_methods = [
                {
                    'id': 1,
                    'name': 'Standard Shipping',
                    'description': 'Delivery within 3-5 business days',
                    'cost': 250.00,
                    'estimated_days': '3-5 days'
                },
                {
                    'id': 2,
                    'name': 'Express Shipping',
                    'description': 'Delivery within 1-2 business days',
                    'cost': 450.00,
                    'estimated_days': '1-2 days'
                },
                {
                    'id': 3,
                    'name': 'Free Shipping',
                    'description': 'Free shipping for orders over KES 10,000',
                    'cost': 0.00,
                    'estimated_days': '5-7 days',
                    'min_order_value': 10000.00
                }
            ]

            return jsonify({
                'success': True,
                'shipping_methods': default_methods
            })

        # Format shipping methods
        formatted_methods = []
        for method in shipping_methods:
            formatted_methods.append({
                'id': method.id,
                'name': method.name,
                'description': method.description,
                'cost': float(method.cost),
                'estimated_days': method.estimated_days,
                'min_order_value': float(method.min_order_value) if method.min_order_value else None,
                'max_weight': float(method.max_weight) if method.max_weight else None
            })

        return jsonify({
            'success': True,
            'shipping_methods': formatted_methods
        })

    except Exception as e:
        logger.error(f"Error fetching shipping methods: {str(e)}")
        return jsonify({
            'success': False,
            'error': f"Failed to fetch shipping methods: {str(e)}"
        }), 500

@checkout_routes.route('/calculate-totals', methods=['POST'])
@jwt_required()
def calculate_totals():
    """
    Calculate order totals including taxes, shipping, and discounts.

    Request Body:
        shipping_method_id: ID of selected shipping method (optional)
        coupon_code: Coupon code (optional)

    Returns:
        JSON with calculated totals
    """
    user_id = get_jwt_identity()

    try:
        data = request.get_json() or {}

        # Get user's active cart
        cart = Cart.query.filter_by(user_id=user_id, is_active=True).first()

        if not cart or not cart.items:
            return jsonify({
                'success': False,
                'error': 'Cart is empty',
                'code': 'EMPTY_CART'
            }), 400

        # Get shipping method if provided
        shipping_method_id = data.get('shipping_method_id')
        shipping_cost = 0.0

        if shipping_method_id:
            shipping_method = ShippingMethod.query.get(shipping_method_id)
            if shipping_method:
                shipping_cost = float(shipping_method.cost)

                # Check if order qualifies for free shipping
                if shipping_method.min_order_value and cart.subtotal >= shipping_method.min_order_value:
                    shipping_cost = 0.0

        # Calculate subtotal
        subtotal = 0.0
        for item in cart.items:
            subtotal += item.price * item.quantity

        # Calculate tax (16% VAT for Kenya)
        tax_rate = 0.16
        tax = subtotal * tax_rate

        # Apply coupon if provided
        coupon_code = data.get('coupon_code')
        discount = 0.0

        if coupon_code:
            # Apply coupon logic here
            pass

        # Calculate total
        total = subtotal + tax + shipping_cost - discount

        return jsonify({
            'success': True,
            'subtotal': subtotal,
            'tax': tax,
            'shipping': shipping_cost,
            'discount': discount,
            'total': total,
            'currency': 'KES',
            'items_count': sum(item.quantity for item in cart.items)
        })

    except Exception as e:
        logger.error(f"Error calculating totals: {str(e)}")
        return jsonify({
            'success': False,
            'error': f"Failed to calculate totals: {str(e)}"
        }), 500

# Update the process_checkout function to handle payment-first approach
@checkout_routes.route('/process', methods=['POST'])
@jwt_required()
def process_checkout():
    """
    Process checkout and create an order.

    Request Body:
        payment_method: Payment method code
        shipping_method: Shipping method ID (optional)
        shipping_address: Shipping address ID
        billing_address: Billing address ID (optional)
        same_as_shipping: Whether billing address is same as shipping (default: true)
        notes: Order notes (optional)
        payment_data: Payment data if payment has already been made (optional)

    Returns:
        JSON with order details
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
        required_fields = ['payment_method', 'shipping_address']
        missing_fields = [field for field in required_fields if field not in data]

        if missing_fields:
            return jsonify({
                'success': False,
                'error': f"Missing required fields: {', '.join(missing_fields)}"
            }), 400

        # Get user's active cart
        cart = Cart.query.filter_by(user_id=user_id, is_active=True).first()

        if not cart or not cart.items:
            return jsonify({
                'success': False,
                'error': 'Cart is empty',
                'code': 'EMPTY_CART'
            }), 400

        # Get shipping address
        shipping_address_id = data.get('shipping_address')
        shipping_address = Address.query.filter_by(id=shipping_address_id, user_id=user_id).first()

        if not shipping_address:
            return jsonify({
                'success': False,
                'error': 'Invalid shipping address'
            }), 400

        # Get or use shipping address for billing
        same_as_shipping = data.get('same_as_shipping', True)

        if same_as_shipping:
            billing_address = shipping_address
        else:
            billing_address_id = data.get('billing_address')
            if not billing_address_id:
                return jsonify({
                    'success': False,
                    'error': 'Billing address is required when same_as_shipping is false'
                }), 400

            billing_address = Address.query.filter_by(id=billing_address_id, user_id=user_id).first()

            if not billing_address:
                return jsonify({
                    'success': False,
                    'error': 'Invalid billing address'
                }), 400

        # Get shipping method
        shipping_method_id = data.get('shipping_method')
        shipping_method = None
        shipping_cost = 0.0

        if shipping_method_id:
            shipping_method = ShippingMethod.query.get(shipping_method_id)
            if shipping_method:
                shipping_cost = float(shipping_method.cost)

                # Check if order qualifies for free shipping
                if shipping_method.min_order_value and cart.subtotal >= shipping_method.min_order_value:
                    shipping_cost = 0.0

        # Calculate totals
        subtotal = 0.0
        for item in cart.items:
            subtotal += item.price * item.quantity

        # Calculate tax (16% VAT for Kenya)
        tax_rate = 0.16
        tax = subtotal * tax_rate

        # Apply coupon if provided
        coupon_code = data.get('coupon_code')
        discount = 0.0

        if coupon_code:
            # Apply coupon logic here
            pass

        # Calculate total
        total = subtotal + tax + shipping_cost - discount

        # Check if payment data is provided (payment-first approach)
        payment_data = data.get('payment_data', {})
        payment_status = PaymentStatus.PENDING

        # If payment data is provided and it's for M-PESA, check if it's valid
        if payment_data and data.get('payment_method') == 'mpesa':
            # Verify the payment data
            if payment_data.get('transaction_id') and payment_data.get('checkout_request_id'):
                # This means payment has been completed
                payment_status = PaymentStatus.PAID
                logger.info(f"Order being created with completed M-PESA payment: {payment_data}")

        # Create order
        order = Order(
            user_id=user_id,
            order_number=generate_order_number(),
            status=OrderStatus.PENDING if payment_status == PaymentStatus.PENDING else OrderStatus.PROCESSING,
            total_amount=total,
            shipping_address=shipping_address.to_dict(),
            billing_address=billing_address.to_dict(),
            payment_method=data.get('payment_method'),
            payment_status=payment_status,
            shipping_method=shipping_method.name if shipping_method else 'Standard Shipping',
            shipping_cost=shipping_cost,
            notes=data.get('notes', '')
        )

        db.session.add(order)
        db.session.flush()  # Get order ID without committing

        # Create order items
        for cart_item in cart.items:
            product = Product.query.get(cart_item.product_id)

            if not product:
                continue

            # Create order item
            order_item = OrderItem(
                order_id=order.id,
                product_id=cart_item.product_id,
                variant_id=cart_item.variant_id,
                quantity=cart_item.quantity,
                price=cart_item.price,
                total=cart_item.price * cart_item.quantity
            )

            db.session.add(order_item)

            # Update product stock
            if cart_item.variant_id:
                variant = ProductVariant.query.get(cart_item.variant_id)
                if variant:
                    variant.stock -= cart_item.quantity
            else:
                product.stock -= cart_item.quantity

            # Update inventory if available
            inventory = Inventory.query.filter_by(
                product_id=cart_item.product_id,
                variant_id=cart_item.variant_id
            ).first()

            if inventory:
                inventory.stock_level -= cart_item.quantity
                inventory.update_status()

        # Create payment record
        payment = Payment(
            order_id=order.id,
            amount=total,
            payment_method=data.get('payment_method'),
            status=payment_status
        )

        # If payment data is provided, add transaction details
        if payment_data and payment_status == PaymentStatus.PAID:
            payment.transaction_id = payment_data.get('transaction_id')
            payment.completed_at = datetime.now()
            payment.transaction_data = payment_data

        db.session.add(payment)

        # Clear the cart
        cart.is_active = False

        # Commit all changes
        db.session.commit()

        # Return order details
        return jsonify({
            'success': True,
            'message': 'Order created successfully',
            'order': {
                'id': order.id,
                'order_number': order.order_number,
                'total_amount': float(order.total_amount),
                'status': order.status.value,
                'payment_status': order.payment_status.value,
                'created_at': order.created_at.isoformat()
            },
            'payment': {
                'id': payment.id,
                'amount': float(payment.amount),
                'payment_method': payment.payment_method,
                'status': payment.status.value,
                'transaction_id': payment.transaction_id
            }
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
def mpesa_payment():
    """
    Process M-PESA payment for an order.

    Request Body:
        order_id: ID of the order to pay for
        phone: Customer's phone number

    Returns:
        JSON with payment initiation status
    """
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

    # Validate required fields
    if not order_id or not phone:
        return jsonify({
            'success': False,
            'error': 'Order ID and phone number are required'
        }), 400

    try:
        # Get order details
        order = Order.query.get(order_id)

        if not order:
            return jsonify({
                'success': False,
                'error': 'Order not found'
            }), 404

        # Validate order belongs to user
        user_id = get_jwt_identity()
        if order.user_id != user_id:
            return jsonify({
                'success': False,
                'error': 'Unauthorized access to order'
            }), 403

        # Check if order is already paid
        if order.payment_status == PaymentStatus.PAID:
            return jsonify({
                'success': False,
                'error': 'Order is already paid'
            }), 400

        # Format phone number
        if phone.startswith("+"):
            phone = phone[1:]
        if phone.startswith("0"):
            phone = "254" + phone[1:]

        # Import the direct M-PESA implementation
        try:
            from ...mpesa.direct_mpesa import initiate_stk_push, MpesaError
        except ImportError:
            # Try alternative import paths
            try:
                from ...mpesa.direct_mpesa import initiate_stk_push, MpesaError
            except ImportError:
                logger.error("Failed to import initiate_stk_push function")
                return jsonify({
                    'success': False,
                    'error': 'M-PESA integration is not available'
                }), 500

        # Use the direct implementation to initiate payment
        response = initiate_stk_push(
            phone_number=phone,
            amount=float(order.total_amount),
            account_reference=f"ORDER-{order.order_number}",
            transaction_desc=f"Payment for order {order.order_number}"
        )

        if not response:
            return jsonify({
                'success': False,
                'error': 'Failed to initiate payment'
            }), 500

        # Create transaction record
        transaction = PaymentTransaction(
            user_id=user_id,
            amount=order.total_amount,
            payment_method_id=2,  # Assuming 2 is M-PESA
            transaction_type="payment",
            reference_id=str(order.id),
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
            'order_id': order.id,
            'order_number': order.order_number,
            'phone': phone,
            'amount': float(order.total_amount),
            'checkout_request_id': response.get('CheckoutRequestID'),
            'merchant_request_id': response.get('MerchantRequestID'),
            'response_code': response.get('ResponseCode'),
            'response_description': response.get('ResponseDescription'),
            'customer_message': response.get('CustomerMessage'),
            'transaction_id': transaction.id
        })

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error processing M-PESA payment: {str(e)}")
        return jsonify({
            'success': False,
            'error': f"Failed to process payment: {str(e)}"
        }), 500

@checkout_routes.route('/check-payment-status/<order_id>', methods=['GET'])
@jwt_required()
def check_payment_status(order_id):
    """
    Check the payment status of an order.

    Path Parameters:
        order_id: ID of the order to check

    Returns:
        JSON with payment status
    """
    try:
        # Get order details
        order = Order.query.get(order_id)

        if not order:
            return jsonify({
                'success': False,
                'error': 'Order not found'
            }), 404

        # Validate order belongs to user
        user_id = get_jwt_identity()
        if order.user_id != user_id:
            return jsonify({
                'success': False,
                'error': 'Unauthorized access to order'
            }), 403

        # Get payment details
        payment = Payment.query.filter_by(order_id=order.id).first()

        # Get transaction details
        transaction = PaymentTransaction.query.filter_by(
            reference_id=str(order.id),
            transaction_type="payment"
        ).order_by(PaymentTransaction.created_at.desc()).first()

        return jsonify({
            'success': True,
            'order': {
                'id': order.id,
                'order_number': order.order_number,
                'status': order.status.value,
                'payment_status': order.payment_status.value
            },
            'payment': {
                'id': payment.id if payment else None,
                'status': payment.status.value if payment else None,
                'payment_method': payment.payment_method if payment else None,
                'transaction_id': payment.transaction_id if payment else None,
                'created_at': payment.created_at.isoformat() if payment and payment.created_at else None,
                'completed_at': payment.completed_at.isoformat() if payment and payment.completed_at else None
            },
            'transaction': {
                'id': transaction.id if transaction else None,
                'status': transaction.status if transaction else None,
                'provider': transaction.provider if transaction else None,
                'provider_reference': transaction.provider_reference if transaction else None,
                'created_at': transaction.created_at.isoformat() if transaction and transaction.created_at else None,
                'completed_at': transaction.completed_at.isoformat() if transaction and transaction.completed_at else None
            }
        })

    except Exception as e:
        logger.error(f"Error checking payment status: {str(e)}")
        return jsonify({
            'success': False,
            'error': f"Failed to check payment status: {str(e)}"
        }), 500

@checkout_routes.route('/complete-order/<order_id>', methods=['POST'])
@jwt_required()
def complete_order(order_id):
    """
    Complete an order after successful payment.

    Path Parameters:
        order_id: ID of the order to complete

    Returns:
        JSON with order completion status
    """
    try:
        # Get order details
        order = Order.query.get(order_id)

        if not order:
            return jsonify({
                'success': False,
                'error': 'Order not found'
            }), 404

        # Validate order belongs to user
        user_id = get_jwt_identity()
        if order.user_id != user_id:
            return jsonify({
                'success': False,
                'error': 'Unauthorized access to order'
            }), 403

        # Update order status
        order.status = OrderStatus.PROCESSING
        order.payment_status = PaymentStatus.PAID

        # Update payment status
        payment = Payment.query.filter_by(order_id=order.id).first()
        if payment:
            payment.status = PaymentStatus.PAID
            payment.completed_at = datetime.now()

        # Commit changes
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Order completed successfully',
            'order': {
                'id': order.id,
                'order_number': order.order_number,
                'status': order.status.value,
                'payment_status': order.payment_status.value
            }
        })

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error completing order: {str(e)}")
        return jsonify({
            'success': False,
            'error': f"Failed to complete order: {str(e)}"
        }), 500

@checkout_routes.route('/status', methods=['GET'])
def checkout_status():
    """
    Get the status of the checkout system.

    Returns:
        JSON with checkout system status
    """
    return jsonify({
        'success': True,
        'status': 'active',
        'message': 'Checkout system is operational',
        'version': '1.0.0'
    })
