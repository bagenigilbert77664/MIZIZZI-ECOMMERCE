"""
Admin Cart Management Routes for Mizizzi E-commerce Platform
Handles all admin cart operations with proper session management.
"""

import logging
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify, g
from flask_jwt_extended import jwt_required, get_jwt_identity
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import joinedload
from marshmallow import ValidationError

from ...models.models import (
    Cart, CartItem, User, Product, ProductVariant, Coupon,
    ShippingMethod, PaymentMethod, Address, db, CouponType
)
from ...schemas.cart_schema import cart_schema, cart_item_schema, cart_items_schema

# Set up logger
logger = logging.getLogger(__name__)

# Create blueprint
admin_cart_routes = Blueprint('admin_cart_routes', __name__)

# Rate limiting setup
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"]
)

def admin_required(f):
    """Decorator to ensure user has admin privileges"""
    from functools import wraps

    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            current_user_id = get_jwt_identity()
            if not current_user_id:
                return jsonify({
                    'success': False,
                    'error': 'Authentication required'
                }), 401

            # Get user with fresh session query
            user = db.session.get(User, current_user_id)
            if not user:
                return jsonify({
                    'success': False,
                    'error': 'User not found'
                }), 404

            if user.role.value != 'admin':
                return jsonify({
                    'success': False,
                    'error': 'Admin privileges required'
                }), 403

            return f(*args, **kwargs)
        except Exception as e:
            logger.error(f"Admin authorization error: {str(e)}")
            return jsonify({
                'success': False,
                'error': 'Authorization failed'
            }), 500

    return decorated_function

def get_cart_with_session(cart_id):
    """Get cart with proper session binding and eager loading"""
    try:
        cart = db.session.query(Cart).options(
            joinedload(Cart.items).joinedload(CartItem.product),
            joinedload(Cart.shipping_method),
            joinedload(Cart.payment_method),
            joinedload(Cart.shipping_address),
            joinedload(Cart.billing_address),
            joinedload(Cart.user)
        ).filter(Cart.id == cart_id).first()

        return cart
    except Exception as e:
        logger.error(f"Error getting cart {cart_id}: {str(e)}")
        return None

def serialize_cart_response(cart):
    """Serialize cart with all related data to avoid detached instance errors"""
    try:
        if not cart:
            return None, []

        # Get cart items with proper session binding
        items = db.session.query(CartItem).options(
            joinedload(CartItem.product),
            joinedload(CartItem.variant)
        ).filter(CartItem.cart_id == cart.id).all()

        # Serialize cart data
        cart_data = {
            'id': cart.id,
            'user_id': cart.user_id,
            'guest_id': cart.guest_id,
            'is_guest': cart.guest_id is not None,
            'is_active': cart.is_active,
            'subtotal': float(cart.subtotal) if cart.subtotal else 0.0,
            'tax': float(cart.tax) if cart.tax else 0.0,
            'shipping': float(cart.shipping) if cart.shipping else 0.0,
            'discount': float(cart.discount) if cart.discount else 0.0,
            'total': float(cart.total) if cart.total else 0.0,
            'coupon_code': cart.coupon_code,
            'shipping_method_id': cart.shipping_method_id,
            'payment_method_id': cart.payment_method_id,
            'shipping_address_id': cart.shipping_address_id,
            'billing_address_id': cart.billing_address_id,
            'same_as_shipping': cart.same_as_shipping,
            'requires_shipping': cart.requires_shipping,
            'notes': cart.notes,
            'created_at': cart.created_at.isoformat() if cart.created_at else None,
            'updated_at': cart.updated_at.isoformat() if cart.updated_at else None,
            'last_activity': cart.last_activity.isoformat() if cart.last_activity else None,
            'expires_at': cart.expires_at.isoformat() if cart.expires_at else None,
        }

        # Serialize items data
        items_data = []
        for item in items:
            item_data = {
                'id': item.id,
                'cart_id': item.cart_id,
                'user_id': item.user_id,
                'product_id': item.product_id,
                'variant_id': item.variant_id,
                'quantity': item.quantity,
                'price': float(item.price) if item.price else 0.0,
                'subtotal': float(item.price * item.quantity) if item.price else 0.0,
                'created_at': item.created_at.isoformat() if item.created_at else None,
                'updated_at': item.updated_at.isoformat() if item.updated_at else None
            }

            # Add product info if available
            if item.product:
                item_data['product'] = {
                    'id': item.product.id,
                    'name': item.product.name,
                    'slug': item.product.slug,
                    'thumbnail_url': item.product.thumbnail_url,
                    'price': float(item.product.price) if item.product.price else None,
                    'sale_price': float(item.product.sale_price) if item.product.sale_price else None
                }

            # Add variant info if available
            if item.variant:
                item_data['variant'] = {
                    'id': item.variant.id,
                    'color': item.variant.color,
                    'size': item.variant.size,
                    'price': float(item.variant.price) if item.variant.price else None,
                    'sale_price': float(item.variant.sale_price) if item.variant.sale_price else None
                }

            items_data.append(item_data)

        return cart_data, items_data
    except Exception as e:
        logger.error(f"Error serializing cart response: {str(e)}")
        return None, []

def validate_checkout(cart_id):
    """Simple cart validation function"""
    try:
        cart = db.session.get(Cart, cart_id)
        if not cart:
            return False, ['Cart not found'], []

        errors = []
        warnings = []

        # Check if cart has items
        items = db.session.query(CartItem).filter(CartItem.cart_id == cart_id).all()
        if not items:
            errors.append('Cart is empty')

        # Check if cart has required shipping info for physical products
        if cart.requires_shipping and not cart.shipping_address_id:
            errors.append('Shipping address is required')

        # Check if cart has payment method
        if not cart.payment_method_id:
            warnings.append('Payment method not selected')

        is_valid = len(errors) == 0
        return is_valid, errors, warnings

    except Exception as e:
        logger.error(f"Error validating cart {cart_id}: {str(e)}")
        return False, [f'Validation error: {str(e)}'], []

# Health check endpoint
@admin_cart_routes.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint for admin cart routes"""
    try:
        # Test database connection
        db.session.execute(db.text('SELECT 1'))

        return jsonify({
            'success': True,
            'service': 'admin_cart_routes',
            'status': 'healthy',
            'timestamp': datetime.utcnow().isoformat()
        }), 200
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return jsonify({
            'success': False,
            'service': 'admin_cart_routes',
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 500

# List all carts
@admin_cart_routes.route('/carts', methods=['GET'])
@jwt_required()
@admin_required
@limiter.limit("10 per minute")
def list_carts():
    """List all carts with pagination and filtering"""
    try:
        # Get query parameters
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 100)
        user_id = request.args.get('user_id', type=int)
        is_active = request.args.get('is_active', type=str)
        is_guest = request.args.get('is_guest', type=str)

        # Build query with proper session binding
        query = db.session.query(Cart).options(
            joinedload(Cart.user),
            joinedload(Cart.items)
        )

        # Apply filters
        if user_id:
            query = query.filter(Cart.user_id == user_id)

        if is_active is not None:
            active_filter = is_active.lower() == 'true'
            query = query.filter(Cart.is_active == active_filter)

        if is_guest is not None:
            guest_filter = is_guest.lower() == 'true'
            if guest_filter:
                query = query.filter(Cart.guest_id.isnot(None))
            else:
                query = query.filter(Cart.guest_id.is_(None))

        # Order by most recent
        query = query.order_by(Cart.updated_at.desc())

        # Paginate
        pagination = query.paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )

        # Serialize carts
        carts_data = []
        for cart in pagination.items:
            cart_data, _ = serialize_cart_response(cart)
            if cart_data:
                # Add item count
                cart_data['item_count'] = len(cart.items) if cart.items else 0
                # Add user info if available
                if cart.user:
                    cart_data['user'] = {
                        'id': cart.user.id,
                        'name': cart.user.name,
                        'email': cart.user.email
                    }
                carts_data.append(cart_data)

        return jsonify({
            'success': True,
            'carts': carts_data,
            'pagination': {
                'page': pagination.page,
                'per_page': pagination.per_page,
                'total_pages': pagination.pages,
                'total_items': pagination.total,
                'has_next': pagination.has_next,
                'has_prev': pagination.has_prev
            }
        }), 200

    except Exception as e:
        logger.error(f"Error listing carts: {str(e)}")
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': f'Failed to list carts: {str(e)}'
        }), 500

# Get specific cart
@admin_cart_routes.route('/carts/<int:cart_id>', methods=['GET'])
@jwt_required()
@admin_required
def get_cart(cart_id):
    """Get specific cart with all details"""
    try:
        # Get cart with proper session binding
        cart = get_cart_with_session(cart_id)
        if not cart:
            return jsonify({
                'success': False,
                'error': 'Cart not found'
            }), 404

        # Serialize cart response
        cart_data, items_data = serialize_cart_response(cart)
        if not cart_data:
            return jsonify({
                'success': False,
                'error': 'Failed to serialize cart data'
            }), 500

        # Add user info if available
        if cart.user:
            cart_data['user'] = {
                'id': cart.user.id,
                'name': cart.user.name,
                'email': cart.user.email
            }

        # Add shipping method info if available
        if cart.shipping_method:
            cart_data['shipping_method'] = {
                'id': cart.shipping_method.id,
                'name': cart.shipping_method.name,
                'description': cart.shipping_method.description,
                'cost': float(cart.shipping_method.cost),
                'estimated_days': cart.shipping_method.estimated_days
            }

        # Add payment method info if available
        if cart.payment_method:
            cart_data['payment_method'] = {
                'id': cart.payment_method.id,
                'name': cart.payment_method.name,
                'code': cart.payment_method.code,
                'description': cart.payment_method.description
            }

        return jsonify({
            'success': True,
            'cart': cart_data,
            'items': items_data
        }), 200

    except Exception as e:
        logger.error(f"Error getting cart {cart_id}: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Failed to get cart: {str(e)}'
        }), 500

# Add item to cart
@admin_cart_routes.route('/carts/<int:cart_id>/items', methods=['POST'])
@jwt_required()
@admin_required
@limiter.limit("20 per minute")
def add_item_to_cart(cart_id):
    """Add item to cart"""
    try:
        # Handle empty or malformed JSON
        try:
            data = request.get_json()
        except Exception as json_error:
            logger.error(f"JSON parsing error: {str(json_error)}")
            return jsonify({
                'success': False,
                'error': 'Invalid JSON data provided'
            }), 400

        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400

        product_id = data.get('product_id')
        variant_id = data.get('variant_id')
        quantity = data.get('quantity', 1)

        # Validate required fields
        if not product_id or not quantity:
            return jsonify({
                'success': False,
                'error': 'Product ID and quantity are required'
            }), 400

        if not isinstance(quantity, int) or quantity <= 0:
            return jsonify({
                'success': False,
                'error': 'Quantity must be a positive integer'
            }), 400

        # Get cart with fresh session query
        cart = db.session.get(Cart, cart_id)
        if not cart:
            return jsonify({
                'success': False,
                'error': 'Cart not found'
            }), 404

        # Get product with fresh session query
        product = db.session.get(Product, product_id)
        if not product:
            return jsonify({
                'success': False,
                'error': 'Product not found'
            }), 404

        # Validate variant if provided
        variant = None
        if variant_id:
            variant = db.session.get(ProductVariant, variant_id)
            if not variant or variant.product_id != product_id:
                return jsonify({
                    'success': False,
                    'error': 'Invalid variant for this product'
                }), 400

        # Determine price
        price = variant.price if variant else (product.sale_price or product.price)

        # Check if item already exists in cart
        existing_item = db.session.query(CartItem).filter(
            CartItem.cart_id == cart_id,
            CartItem.product_id == product_id,
            CartItem.variant_id == variant_id
        ).first()

        if existing_item:
            # Update existing item quantity
            existing_item.quantity = quantity
            existing_item.price = float(price)
        else:
            # Create new cart item
            new_item = CartItem(
                cart_id=cart_id,
                user_id=cart.user_id,
                product_id=product_id,
                variant_id=variant_id,
                quantity=quantity,
                price=float(price)
            )
            db.session.add(new_item)

        # Update cart totals
        cart.update_totals()
        cart.last_activity = datetime.utcnow()

        # Commit changes
        db.session.commit()

        # Get updated cart data
        updated_cart = get_cart_with_session(cart_id)
        cart_data, items_data = serialize_cart_response(updated_cart)

        return jsonify({
            'success': True,
            'message': 'Item added to cart successfully',
            'cart': cart_data,
            'items': items_data
        }), 200

    except Exception as e:
        logger.error(f"Error adding item to cart {cart_id}: {str(e)}")
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': f'Failed to add item to cart: {str(e)}'
        }), 500

# Update cart item
@admin_cart_routes.route('/carts/items/<int:item_id>', methods=['PUT'])
@jwt_required()
@admin_required
def update_cart_item(item_id):
    """Update cart item quantity"""
    try:
        # Handle empty or malformed JSON
        try:
            data = request.get_json()
        except Exception as json_error:
            logger.error(f"JSON parsing error: {str(json_error)}")
            return jsonify({
                'success': False,
                'error': 'Invalid JSON data provided'
            }), 400

        if not data:
            return jsonify({
                'success': False,
                'error': 'Quantity is required'
            }), 400

        quantity = data.get('quantity')
        if quantity is None:
            return jsonify({
                'success': False,
                'error': 'Quantity is required'
            }), 400

        if not isinstance(quantity, int) or quantity < 0:
            return jsonify({
                'success': False,
                'error': 'Quantity must be a non-negative integer'
            }), 400

        # Get cart item with fresh session query
        cart_item = db.session.get(CartItem, item_id)
        if not cart_item:
            return jsonify({
                'success': False,
                'error': 'Cart item not found'
            }), 404

        # Get cart with fresh session query
        cart = db.session.get(Cart, cart_item.cart_id)
        if not cart:
            return jsonify({
                'success': False,
                'error': 'Cart not found'
            }), 404

        if quantity == 0:
            # Remove item if quantity is 0
            db.session.delete(cart_item)
        else:
            # Update quantity
            cart_item.quantity = quantity

        # Update cart totals
        cart.update_totals()
        cart.last_activity = datetime.utcnow()

        # Commit changes
        db.session.commit()

        # Get updated cart data
        updated_cart = get_cart_with_session(cart.id)
        cart_data, items_data = serialize_cart_response(updated_cart)

        return jsonify({
            'success': True,
            'message': 'Cart item updated successfully',
            'cart': cart_data,
            'items': items_data
        }), 200

    except Exception as e:
        logger.error(f"Error updating cart item {item_id}: {str(e)}")
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': f'Failed to update cart item: {str(e)}'
        }), 500

# Remove cart item
@admin_cart_routes.route('/carts/items/<int:item_id>', methods=['DELETE'])
@jwt_required()
@admin_required
def remove_cart_item(item_id):
    """Remove item from cart"""
    try:
        # Get cart item with fresh session query
        cart_item = db.session.get(CartItem, item_id)
        if not cart_item:
            return jsonify({
                'success': False,
                'error': 'Cart item not found'
            }), 404

        cart_id = cart_item.cart_id

        # Get cart with fresh session query
        cart = db.session.get(Cart, cart_id)
        if not cart:
            return jsonify({
                'success': False,
                'error': 'Cart not found'
            }), 404

        # Remove item
        db.session.delete(cart_item)

        # Update cart totals
        cart.update_totals()
        cart.last_activity = datetime.utcnow()

        # Commit changes
        db.session.commit()

        # Get updated cart data
        updated_cart = get_cart_with_session(cart_id)
        cart_data, items_data = serialize_cart_response(updated_cart)

        return jsonify({
            'success': True,
            'message': 'Item removed from cart successfully',
            'cart': cart_data,
            'items': items_data
        }), 200

    except Exception as e:
        logger.error(f"Error removing cart item {item_id}: {str(e)}")
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': f'Failed to remove cart item: {str(e)}'
        }), 500

# Apply coupon to cart
@admin_cart_routes.route('/carts/<int:cart_id>/coupon', methods=['POST'])
@jwt_required()
@admin_required
def apply_coupon(cart_id):
    """Apply coupon to cart"""
    try:
        # Handle empty or malformed JSON
        try:
            data = request.get_json()
        except Exception as json_error:
            logger.error(f"JSON parsing error: {str(json_error)}")
            return jsonify({
                'success': False,
                'error': 'Invalid JSON data provided'
            }), 400

        if not data:
            return jsonify({
                'success': False,
                'error': 'Coupon code is required'
            }), 400

        coupon_code = data.get('code')
        if not coupon_code:
            return jsonify({
                'success': False,
                'error': 'Coupon code is required'
            }), 400

        # Get cart with fresh session query
        cart = db.session.get(Cart, cart_id)
        if not cart:
            return jsonify({
                'success': False,
                'error': 'Cart not found'
            }), 404

        # Get coupon with fresh session query
        coupon = db.session.query(Coupon).filter(
            Coupon.code == coupon_code,
            Coupon.is_active == True
        ).first()

        if not coupon:
            return jsonify({
                'success': False,
                'error': 'Invalid coupon code'
            }), 400

        # Validate coupon
        now = datetime.utcnow()
        if coupon.start_date and now < coupon.start_date:
            return jsonify({
                'success': False,
                'error': 'Coupon is not yet active'
            }), 400

        if coupon.end_date and now > coupon.end_date:
            return jsonify({
                'success': False,
                'error': 'Coupon has expired'
            }), 400

        if coupon.usage_limit and coupon.used_count >= coupon.usage_limit:
            return jsonify({
                'success': False,
                'error': 'Coupon usage limit reached'
            }), 400

        # Check minimum purchase requirement
        if hasattr(coupon, 'min_purchase') and coupon.min_purchase and cart.subtotal < coupon.min_purchase:
            return jsonify({
                'success': False,
                'error': f'Minimum order amount of {coupon.min_purchase} required'
            }), 400

        # Apply coupon
        cart.coupon_code = coupon_code
        cart.update_totals()
        cart.last_activity = datetime.utcnow()

        # Commit changes
        db.session.commit()

        # Get updated cart data
        updated_cart = get_cart_with_session(cart_id)
        cart_data, items_data = serialize_cart_response(updated_cart)

        # Serialize coupon data
        coupon_data = {
            'id': coupon.id,
            'code': coupon.code,
            'type': coupon.type.value,
            'value': float(coupon.value),
            'min_purchase': float(coupon.min_purchase) if coupon.min_purchase else None,
            'max_discount': float(coupon.max_discount) if coupon.max_discount else None
        }

        return jsonify({
            'success': True,
            'message': 'Coupon applied successfully',
            'cart': cart_data,
            'items': items_data,
            'coupon': coupon_data
        }), 200

    except Exception as e:
        logger.error(f"Error applying coupon to cart {cart_id}: {str(e)}")
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': f'Failed to apply coupon: {str(e)}'
        }), 500

# Remove coupon from cart
@admin_cart_routes.route('/carts/<int:cart_id>/coupon', methods=['DELETE'])
@jwt_required()
@admin_required
def remove_coupon(cart_id):
    """Remove coupon from cart"""
    try:
        # Get cart with fresh session query
        cart = db.session.get(Cart, cart_id)
        if not cart:
            return jsonify({
                'success': False,
                'error': 'Cart not found'
            }), 404

        # Remove coupon
        cart.coupon_code = None
        cart.update_totals()
        cart.last_activity = datetime.utcnow()

        # Commit changes
        db.session.commit()

        # Get updated cart data
        updated_cart = get_cart_with_session(cart_id)
        cart_data, items_data = serialize_cart_response(updated_cart)

        return jsonify({
            'success': True,
            'message': 'Coupon removed successfully',
            'cart': cart_data,
            'items': items_data
        }), 200

    except Exception as e:
        logger.error(f"Error removing coupon from cart {cart_id}: {str(e)}")
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': f'Failed to remove coupon: {str(e)}'
        }), 500

# Set shipping method
@admin_cart_routes.route('/carts/<int:cart_id>/shipping-method', methods=['POST'])
@jwt_required()
@admin_required
def set_shipping_method(cart_id):
    """Set shipping method for cart"""
    try:
        # Handle empty or malformed JSON
        try:
            data = request.get_json()
        except Exception as json_error:
            logger.error(f"JSON parsing error: {str(json_error)}")
            return jsonify({
                'success': False,
                'error': 'Invalid JSON data provided'
            }), 400

        if not data:
            return jsonify({
                'success': False,
                'error': 'Shipping method ID is required'
            }), 400

        shipping_method_id = data.get('shipping_method_id')
        if not shipping_method_id:
            return jsonify({
                'success': False,
                'error': 'Shipping method ID is required'
            }), 400

        # Get cart with fresh session query
        cart = db.session.get(Cart, cart_id)
        if not cart:
            return jsonify({
                'success': False,
                'error': 'Cart not found'
            }), 404

        # Get shipping method with fresh session query
        shipping_method = db.session.get(ShippingMethod, shipping_method_id)
        if not shipping_method:
            return jsonify({
                'success': False,
                'error': 'Invalid shipping method'
            }), 400

        # Set shipping method
        cart.shipping_method_id = shipping_method_id
        cart.update_totals()
        cart.last_activity = datetime.utcnow()

        # Commit changes
        db.session.commit()

        # Get updated cart data
        updated_cart = get_cart_with_session(cart_id)
        cart_data, items_data = serialize_cart_response(updated_cart)

        return jsonify({
            'success': True,
            'message': 'Shipping method set successfully',
            'cart': cart_data,
            'items': items_data
        }), 200

    except Exception as e:
        logger.error(f"Error setting shipping method for cart {cart_id}: {str(e)}")
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': f'Failed to set shipping method: {str(e)}'
        }), 500

# Set payment method
@admin_cart_routes.route('/carts/<int:cart_id>/payment-method', methods=['POST'])
@jwt_required()
@admin_required
def set_payment_method(cart_id):
    """Set payment method for cart"""
    try:
        # Handle empty or malformed JSON
        try:
            data = request.get_json()
        except Exception as json_error:
            logger.error(f"JSON parsing error: {str(json_error)}")
            return jsonify({
                'success': False,
                'error': 'Invalid JSON data provided'
            }), 400

        if not data:
            return jsonify({
                'success': False,
                'error': 'Payment method ID is required'
            }), 400

        payment_method_id = data.get('payment_method_id')
        if not payment_method_id:
            return jsonify({
                'success': False,
                'error': 'Payment method ID is required'
            }), 400

        # Get cart with fresh session query
        cart = db.session.get(Cart, cart_id)
        if not cart:
            return jsonify({
                'success': False,
                'error': 'Cart not found'
            }), 404

        # Get payment method with fresh session query
        payment_method = db.session.get(PaymentMethod, payment_method_id)
        if not payment_method:
            return jsonify({
                'success': False,
                'error': 'Invalid payment method'
            }), 400

        # Set payment method
        cart.payment_method_id = payment_method_id
        cart.last_activity = datetime.utcnow()

        # Commit changes
        db.session.commit()

        # Get updated cart data
        updated_cart = get_cart_with_session(cart_id)
        cart_data, items_data = serialize_cart_response(updated_cart)

        return jsonify({
            'success': True,
            'message': 'Payment method set successfully',
            'cart': cart_data,
            'items': items_data
        }), 200

    except Exception as e:
        logger.error(f"Error setting payment method for cart {cart_id}: {str(e)}")
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': f'Failed to set payment method: {str(e)}'
        }), 500

# Set addresses
@admin_cart_routes.route('/carts/<int:cart_id>/addresses', methods=['POST'])
@jwt_required()
@admin_required
def set_addresses(cart_id):
    """Set shipping and billing addresses for cart"""
    try:
        # Handle empty or malformed JSON
        try:
            data = request.get_json()
        except Exception as json_error:
            logger.error(f"JSON parsing error: {str(json_error)}")
            return jsonify({
                'success': False,
                'error': 'Invalid JSON data provided'
            }), 400

        if not data:
            return jsonify({
                'success': False,
                'error': 'Address data is required'
            }), 400

        shipping_address_id = data.get('shipping_address_id')
        billing_address_id = data.get('billing_address_id')
        same_as_shipping = data.get('same_as_shipping', True)

        if not shipping_address_id:
            return jsonify({
                'success': False,
                'error': 'Shipping address ID is required'
            }), 400

        # Get cart with fresh session query
        cart = db.session.get(Cart, cart_id)
        if not cart:
            return jsonify({
                'success': False,
                'error': 'Cart not found'
            }), 404

        # Get shipping address with fresh session query
        shipping_address = db.session.get(Address, shipping_address_id)
        if not shipping_address:
            return jsonify({
                'success': False,
                'error': 'Invalid shipping address'
            }), 400

        # Set shipping address
        cart.shipping_address_id = shipping_address_id
        cart.same_as_shipping = same_as_shipping

        if same_as_shipping:
            # Use shipping address as billing address
            cart.billing_address_id = shipping_address_id
        else:
            # Validate billing address
            if not billing_address_id:
                return jsonify({
                    'success': False,
                    'error': 'Billing address is required when not same as shipping'
                }), 400

            billing_address = db.session.get(Address, billing_address_id)
            if not billing_address:
                return jsonify({
                    'success': False,
                    'error': 'Invalid billing address'
                }), 400

            cart.billing_address_id = billing_address_id

        cart.last_activity = datetime.utcnow()

        # Commit changes
        db.session.commit()

        # Get updated cart data
        updated_cart = get_cart_with_session(cart_id)
        cart_data, items_data = serialize_cart_response(updated_cart)

        return jsonify({
            'success': True,
            'message': 'Addresses set successfully',
            'cart': cart_data,
            'items': items_data
        }), 200

    except Exception as e:
        logger.error(f"Error setting addresses for cart {cart_id}: {str(e)}")
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': f'Failed to set addresses: {str(e)}'
        }), 500

# Set notes
@admin_cart_routes.route('/carts/<int:cart_id>/notes', methods=['POST'])
@jwt_required()
@admin_required
def set_notes(cart_id):
    """Set notes for cart"""
    try:
        # Handle empty or malformed JSON
        try:
            data = request.get_json()
        except Exception as json_error:
            logger.error(f"JSON parsing error: {str(json_error)}")
            return jsonify({
                'success': False,
                'error': 'Invalid JSON data provided'
            }), 400

        if not data:
            return jsonify({
                'success': False,
                'error': 'Notes are required'
            }), 400

        notes = data.get('notes')
        if notes is None:
            return jsonify({
                'success': False,
                'error': 'Notes are required'
            }), 400

        # Get cart with fresh session query
        cart = db.session.get(Cart, cart_id)
        if not cart:
            return jsonify({
                'success': False,
                'error': 'Cart not found'
            }), 404

        # Set notes
        cart.notes = notes
        cart.last_activity = datetime.utcnow()

        # Commit changes
        db.session.commit()

        # Get updated cart data
        updated_cart = get_cart_with_session(cart_id)
        cart_data, items_data = serialize_cart_response(updated_cart)

        return jsonify({
            'success': True,
            'message': 'Notes set successfully',
            'cart': cart_data,
            'items': items_data
        }), 200

    except Exception as e:
        logger.error(f"Error setting notes for cart {cart_id}: {str(e)}")
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': f'Failed to set notes: {str(e)}'
        }), 500

# Set shipping options
@admin_cart_routes.route('/carts/<int:cart_id>/shipping-options', methods=['POST'])
@jwt_required()
@admin_required
def set_shipping_options(cart_id):
    """Set shipping options for cart"""
    try:
        # Handle empty or malformed JSON
        try:
            data = request.get_json()
        except Exception as json_error:
            logger.error(f"JSON parsing error: {str(json_error)}")
            return jsonify({
                'success': False,
                'error': 'Invalid JSON data provided'
            }), 400

        if not data:
            return jsonify({
                'success': False,
                'error': 'Requires shipping flag is required'
            }), 400

        requires_shipping = data.get('requires_shipping')
        if requires_shipping is None:
            return jsonify({
                'success': False,
                'error': 'Requires shipping flag is required'
            }), 400

        # Get cart with fresh session query
        cart = db.session.get(Cart, cart_id)
        if not cart:
            return jsonify({
                'success': False,
                'error': 'Cart not found'
            }), 404

        # Set shipping options
        cart.requires_shipping = requires_shipping

        # If shipping is not required, clear shipping method
        if not requires_shipping:
            cart.shipping_method_id = None
            cart.shipping = 0.0

        cart.update_totals()
        cart.last_activity = datetime.utcnow()

        # Commit changes
        db.session.commit()

        # Get updated cart data
        updated_cart = get_cart_with_session(cart_id)
        cart_data, items_data = serialize_cart_response(updated_cart)

        return jsonify({
            'success': True,
            'message': 'Shipping options set successfully',
            'cart': cart_data,
            'items': items_data
        }), 200

    except Exception as e:
        logger.error(f"Error setting shipping options for cart {cart_id}: {str(e)}")
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': f'Failed to set shipping options: {str(e)}'
        }), 500

# Validate cart
@admin_cart_routes.route('/carts/<int:cart_id>/validate', methods=['GET'])
@jwt_required()
@admin_required
def validate_cart_endpoint(cart_id):
    """Validate cart for checkout"""
    try:
        # Get cart with fresh session query
        cart = db.session.get(Cart, cart_id)
        if not cart:
            return jsonify({
                'success': False,
                'error': 'Cart not found'
            }), 404

        # Validate cart using the validation service
        is_valid, errors, warnings = validate_checkout(cart_id)

        return jsonify({
            'success': True,
            'is_valid': is_valid,
            'errors': errors,
            'warnings': warnings
        }), 200

    except Exception as e:
        logger.error(f"Error validating cart {cart_id}: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Failed to validate cart: {str(e)}'
        }), 500
