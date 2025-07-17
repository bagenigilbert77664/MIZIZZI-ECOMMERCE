"""
Cart API Routes for Mizizzi E-commerce Platform
Provides comprehensive cart management with RESTful naming conventions.
"""
from flask import Blueprint, jsonify, request, g, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
import logging
from datetime import datetime
import json
import uuid

from ...models.models import (
    User, Product, ProductVariant, Cart, CartItem,
    Coupon, Promotion, Address, AddressType,
    ShippingZone, ShippingMethod, PaymentMethod,
    Inventory, CouponType, db
)
from ...validations.cart_validation import (
    CartValidator, validate_cart_middleware,
    validate_checkout,
    CartValidationError
)
from ...schemas.cart_schema import (
    cart_schema, cart_items_schema, cart_item_schema, coupon_schema
)
from ...websocket import broadcast_to_user, broadcast_to_admins
from ..inventory.inventory_routes import get_inventory_lock
from ...validations.cart_validation import validate_cart_item_stock, validate_cart_items

# Set up logger
logger = logging.getLogger(__name__)

# Create blueprint
cart_routes = Blueprint('cart', __name__)

# ----------------------
# Cart Retrieval Routes
# ----------------------

@cart_routes.route('', methods=['GET'])
@cart_routes.route('/', methods=['GET'])
@jwt_required()
def get_cart():
    """
    Get the current user's cart.

    Returns:
        JSON with cart details, items, and validation status
    """
    user_id = get_jwt_identity()

    # Get or create cart
    cart = db.session.query(Cart).filter(Cart.user_id == user_id, Cart.is_active == True).first()

    if not cart:
        # Create new cart
        cart = Cart(user_id=user_id, is_active=True)
        db.session.add(cart)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'New cart created',
            'cart': cart_schema.dump(cart),
            'items': []
        })

    # Get cart items
    cart_items = CartItem.query.filter_by(cart_id=cart.id).all()

    # Validate cart
    validator = CartValidator(user_id=user_id)
    validator.validate_cart()

    return jsonify({
        'success': True,
        'cart': cart_schema.dump(cart),
        'items': cart_items_schema.dump(cart_items),
        'validation': {
            'is_valid': not validator.has_errors(),
            'errors': validator.get_errors(),
            'warnings': validator.get_warnings()
        }
    })

@cart_routes.route('/summary', methods=['GET'])
@jwt_required(optional=True)
def get_cart_summary():
    """
    Get a summary of the cart for display in header/mini cart.
    Works for both authenticated and guest users.

    Returns:
        JSON with item count, total, and has_items flag
    """
    user_id = get_jwt_identity()

    try:
        if user_id:
            # Get cart for authenticated user
            cart = Cart.query.filter_by(user_id=user_id, is_active=True).first()
        else:
            # For guest users, get cart from session if implemented
            cart = None
            return jsonify({
                'success': True,
                'item_count': 0,
                'total': 0,
                'has_items': False,
                'guest': True
            })

        if not cart:
            return jsonify({
                'success': True,
                'item_count': 0,
                'total': 0,
                'has_items': False
            })

        # Get cart items count
        item_count = cart.get_item_count()

        return jsonify({
            'success': True,
            'item_count': item_count,
            'total': float(cart.total),
            'has_items': item_count > 0
        })

    except Exception as e:
        logger.error(f"Error getting cart summary: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to retrieve cart summary',
            'details': str(e)
        }), 500

# ----------------------
# Cart Item Operations
# ----------------------

@cart_routes.route('/items', methods=['POST'])
@jwt_required(optional=True)
def add_to_cart():
    """
    Add item to cart.

    This endpoint replaces the previous /add endpoint for better RESTful design.
    """
    try:
        data = request.get_json()

        # Validate required fields
        if not data or 'product_id' not in data or 'quantity' not in data:
            return jsonify({"error": "Product ID and quantity are required"}), 400

        product_id = data['product_id']
        quantity = int(data['quantity'])
        variant_id = data.get('variant_id')

        if quantity <= 0:
            return jsonify({"error": "Quantity must be positive"}), 400

        # Check if product exists
        product = Product.query.get(product_id)
        if not product:
            return jsonify({"error": "Product not found"}), 404

        # Check if variant exists if provided
        if variant_id:
            variant = ProductVariant.query.get(variant_id)
            if not variant or variant.product_id != product_id:
                return jsonify({"error": "Invalid variant"}), 400

        # Validate stock availability using inventory system
        with get_inventory_lock(product_id, variant_id):
            valid, available, error_message = validate_cart_item_stock(product_id, variant_id, quantity)

            if not valid:
                return jsonify({
                    "error": "Stock validation failed",
                    "errors": [{
                        "message": error_message,
                        "code": "insufficient_stock",
                        "product_id": product_id,
                        "variant_id": variant_id,
                        "available_stock": available,
                        "requested_quantity": quantity
                    }]
                }), 400

            # Get current user or guest ID
            current_user_id = get_jwt_identity()
            guest_id = None

            if not current_user_id:
                # For guest users, get or create guest ID from cookies
                guest_id = request.cookies.get('guest_id')
                if not guest_id:
                    guest_id = str(uuid.uuid4())

            # Find active cart
            cart = None
            if current_user_id:
                cart = Cart.query.filter_by(user_id=current_user_id, is_active=True).first()
            elif guest_id:
                cart = Cart.query.filter_by(guest_id=guest_id, is_active=True).first()

            # Create cart if it doesn't exist
            if not cart:
                cart = Cart(
                    user_id=current_user_id,
                    guest_id=guest_id if not current_user_id else None,
                    is_active=True
                )
                db.session.add(cart)
                db.session.flush()  # Get cart ID without committing

            # Check if item already exists in cart
            cart_item = CartItem.query.filter_by(
                cart_id=cart.id,
                product_id=product_id,
                variant_id=variant_id
            ).first()

            # Get price from product or variant
            if variant_id and variant:
                price = variant.price
            else:
                price = product.sale_price or product.price

            if cart_item:
                # Update quantity if item exists
                new_quantity = cart_item.quantity + quantity

                # Validate new quantity against inventory
                valid, available, error_message = validate_cart_item_stock(product_id, variant_id, new_quantity)

                if not valid:
                    return jsonify({
                        "error": "Stock validation failed",
                        "errors": [{
                            "message": error_message,
                            "code": "insufficient_stock",
                            "product_id": product_id,
                            "variant_id": variant_id,
                            "available_stock": available,
                            "requested_quantity": new_quantity
                        }]
                    }), 400

                cart_item.quantity = new_quantity
                cart_item.price = price  # Update price in case it changed
                cart_item.updated_at = datetime.utcnow()
            else:
                # Create new cart item
                cart_item = CartItem(
                    cart_id=cart.id,
                    user_id=current_user_id,
                    product_id=product_id,
                    variant_id=variant_id,
                    quantity=quantity,
                    price=price
                )
                db.session.add(cart_item)

            # Reserve the inventory
            inventory = Inventory.query.filter_by(
                product_id=product_id,
                variant_id=variant_id
            ).first()

            if not inventory:
                # Create inventory if it doesn't exist
                inventory = Inventory(
                    product_id=product_id,
                    variant_id=variant_id,
                    stock_level=available,
                    reserved_quantity=0
                )
                db.session.add(inventory)
                db.session.flush()

            # Reserve the quantity
            if cart_item.quantity > inventory.reserved_quantity:
                additional_reserve = cart_item.quantity - inventory.reserved_quantity
                inventory.reserve_stock(additional_reserve)

            # Update cart totals
            cart.update_totals()
            cart.last_activity = datetime.utcnow()

            db.session.commit()

            # Get updated cart with items
            cart_items = CartItem.query.filter_by(cart_id=cart.id).all()

            # Create response
            response = jsonify({
                "success": True,
                "message": "Item added to cart",
                "cart": cart.to_dict(),
                "items": [item.to_dict() for item in cart_items]
            })

            # Set guest_id cookie for guest users
            if not current_user_id and guest_id:
                response.set_cookie(
                    'guest_id',
                    guest_id,
                    max_age=60*60*24*30,  # 30 days
                    httponly=True,
                    samesite='Lax'
                )

            return response

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error adding to cart: {str(e)}")
        return jsonify({"error": "Failed to add item to cart", "details": str(e)}), 500

@cart_routes.route('/items/<int:item_id>', methods=['PUT'])
@jwt_required()
def update_item(item_id):
    """
    Update a cart item's quantity.

    Path Parameters:
        item_id: ID of the cart item to update

    Request Body:
        quantity: New quantity for the item

    Returns:
        JSON with updated cart and items
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
    quantity = data.get('quantity')

    if quantity is None:
        return jsonify({
            'success': False,
            'error': 'Quantity is required'
        }), 400

    try:
        quantity = int(quantity)
    except ValueError:
        return jsonify({
            'success': False,
            'error': 'Quantity must be a number'
        }), 400

    try:
        # Get cart
        cart = Cart.query.filter_by(user_id=user_id, is_active=True).first()

        if not cart:
            return jsonify({
                'success': False,
                'error': 'Cart not found'
            }), 404

        # Get cart item
        cart_item = CartItem.query.filter_by(id=item_id, cart_id=cart.id).first()

        if not cart_item:
            return jsonify({
                'success': False,
                'error': 'Cart item not found'
            }), 404

        # If quantity is 0, remove item
        if quantity <= 0:
            # Update inventory to release reserved items
            inventory = Inventory.query.filter_by(
                product_id=cart_item.product_id,
                variant_id=cart_item.variant_id
            ).first()

            if inventory and inventory.reserved_quantity:
                # Release the reserved quantity
                inventory.reserved_quantity -= cart_item.quantity

                # Ensure reserved quantity doesn't go below zero
                if inventory.reserved_quantity < 0:
                    inventory.reserved_quantity = 0

            db.session.delete(cart_item)
            db.session.commit()

            # Update cart totals
            cart.update_totals()
            db.session.commit()

            # Get updated cart items
            cart_items = CartItem.query.filter_by(cart_id=cart.id).all()

            # Notify via WebSocket
            try:
                if hasattr(request, 'namespace'):
                    broadcast_to_user(user_id, 'cart_updated', {
                        'cart': cart_schema.dump(cart),
                        'items': cart_items_schema.dump(cart_items)
                    })
            except Exception as e:
                logger.error(f"WebSocket notification error: {str(e)}")

            return jsonify({
                'success': True,
                'message': 'Item removed from cart',
                'cart': cart_schema.dump(cart),
                'items': cart_items_schema.dump(cart_items)
            })

        # Validate new quantity
        is_valid, errors, warnings = validate_cart_item_addition(
            user_id, cart_item.product_id, cart_item.variant_id, quantity
        )

        if not is_valid:
            return jsonify({
                'success': False,
                'errors': errors,
                'warnings': warnings
            }), 400

        # Update inventory tracking
        inventory = Inventory.query.filter_by(
            product_id=cart_item.product_id,
            variant_id=cart_item.variant_id
        ).first()

        if inventory:
            # Calculate the difference in quantity
            quantity_diff = quantity - cart_item.quantity

            # We don't need to update reserved quantity here
            # Just ensure we don't exceed available stock
            if quantity > inventory.stock_level:
                return jsonify({
                    'success': False,
                    'errors': [{
                        'message': f"Requested quantity ({quantity}) exceeds available stock ({inventory.stock_level}) for product '{inventory.product.name}'",
                        'code': "insufficient_stock",
                        'available_stock': inventory.stock_level
                    }]
                }), 400

        # Update quantity
        cart_item.quantity = quantity

        # Update cart totals
        cart.update_totals()

        db.session.commit()

        # Get updated cart items
        cart_items = CartItem.query.filter_by(cart_id=cart.id).all()

        # Notify via WebSocket
        try:
            if hasattr(request, 'namespace'):
                broadcast_to_user(user_id, 'cart_updated', {
                    'cart': cart_schema.dump(cart),
                    'items': cart_items_schema.dump(cart_items)
                })
        except Exception as e:
            logger.error(f"WebSocket notification error: {str(e)}")

        return jsonify({
            'success': True,
            'message': 'Cart item updated',
            'cart': cart_schema.dump(cart),
            'items': cart_items_schema.dump(cart_items),
            'warnings': warnings
        })

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating cart item: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to update cart item',
            'details': str(e)
        }), 500

# The existing update_item route at /items/<int:item_id> will handle this functionality
# We'll keep the function name but mark it as deprecated
@cart_routes.route('/update/<int:item_id>', methods=['PUT'])
@jwt_required(optional=True)
def update_cart_item(item_id):
    """
    Update cart item quantity.

    DEPRECATED: Use PUT /api/cart/items/<int:item_id> instead.
    This route is maintained for backward compatibility.
    """
    # Call the new consolidated function
    return update_item(item_id)

@cart_routes.route('/items/<int:item_id>', methods=['DELETE'])
@jwt_required()
def remove_item(item_id):
    """
    Remove an item from the cart.

    Path Parameters:
        item_id: ID of the cart item to remove

    Returns:
        JSON with updated cart and items
    """
    user_id = get_jwt_identity()

    try:
        # Get cart
        cart = Cart.query.filter_by(user_id=user_id, is_active=True).first()

        if not cart:
            return jsonify({
                'success': False,
                'error': 'Cart not found'
            }), 404

        # Get cart item
        cart_item = CartItem.query.filter_by(id=item_id, cart_id=cart.id).first()

        if not cart_item:
            return jsonify({
                'success': False,
                'error': 'Cart item not found'
            }), 404

        # No need to update inventory reserved quantities when removing items
        # Just remove the item from the cart

        # Remove item
        db.session.delete(cart_item)

        # Update cart totals
        cart.update_totals()

        db.session.commit()

        # Get updated cart items
        cart_items = CartItem.query.filter_by(cart_id=cart.id).all()

        # Notify via WebSocket
        try:
            if hasattr(request, 'namespace'):
                broadcast_to_user(user_id, 'cart_updated', {
                    'cart': cart_schema.dump(cart),
                    'items': cart_items_schema.dump(cart_items)
                })
        except Exception as e:
            logger.error(f"WebSocket notification error: {str(e)}")

        return jsonify({
            'success': True,
            'message': 'Item removed from cart',
            'cart': cart_schema.dump(cart),
            'items': cart_items_schema.dump(cart_items)
        })

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error removing cart item: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to remove cart item',
            'details': str(e)
        }), 500

# The existing remove_item route at /items/<int:item_id> will handle this functionality
# We'll keep the function name but mark it as deprecated
@cart_routes.route('/remove/<int:item_id>', methods=['DELETE'])
@jwt_required(optional=True)
def remove_from_cart(item_id):
    """
    Remove item from cart.

    DEPRECATED: Use DELETE /api/cart/items/<int:item_id> instead.
    This route is maintained for backward compatibility.
    """
    # Call the new consolidated function
    return remove_item(item_id)

# ----------------------
# Coupon Operations
# ----------------------

@cart_routes.route('/coupons', methods=['POST'])
@jwt_required()
def apply_coupon():
    """
    Apply a coupon to the cart.

    Request Body:
        code: Coupon code to apply

    Returns:
        JSON with updated cart, items, and coupon details
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
    coupon_code = data.get('code')

    if not coupon_code:
        return jsonify({
            'success': False,
            'error': 'Coupon code is required'
        }), 400

    try:
        # Get cart
        cart = Cart.query.filter_by(user_id=user_id, is_active=True).first()

        if not cart:
            return jsonify({
                'success': False,
                'error': 'Cart not found'
            }), 404

        # Get coupon
        coupon = Coupon.query.filter_by(code=coupon_code, is_active=True).first()

        if not coupon:
            return jsonify({
                'success': False,
                'error': 'Invalid coupon code'
            }), 400

        # Apply coupon to cart
        cart.coupon_code = coupon_code

        # Update cart totals
        cart.update_totals()

        db.session.commit()

        # Validate cart with new coupon
        validator = CartValidator(user_id=user_id)
        validator.validate_cart()

        # If there are coupon-specific errors, remove the coupon
        coupon_errors = [error for error in validator.get_errors()
                         if error.get('code', '').startswith('coupon_')]

        if coupon_errors:
            cart.coupon_code = None
            cart.update_totals()
            db.session.commit()

            return jsonify({
                'success': False,
                'errors': coupon_errors
            }), 400

        # Get cart items
        cart_items = CartItem.query.filter_by(cart_id=cart.id).all()

        # Notify via WebSocket
        try:
            if hasattr(request, 'namespace'):
                broadcast_to_user(user_id, 'cart_updated', {
                    'cart': cart_schema.dump(cart),
                    'items': cart_items_schema.dump(cart_items)
                })
        except Exception as e:
            logger.error(f"WebSocket notification error: {str(e)}")

        return jsonify({
            'success': True,
            'message': 'Coupon applied',
            'cart': cart_schema.dump(cart),
            'items': cart_items_schema.dump(cart_items),
            'coupon': coupon_schema.dump(coupon)
        })

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error applying coupon: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to apply coupon',
            'details': str(e)
        }), 500

@cart_routes.route('/coupons', methods=['DELETE'])
@jwt_required()
def remove_coupon():
    """
    Remove the applied coupon from the cart.

    Returns:
        JSON with updated cart and items
    """
    user_id = get_jwt_identity()

    try:
        # Get cart
        cart = Cart.query.filter_by(user_id=user_id, is_active=True).first()

        if not cart:
            return jsonify({
                'success': False,
                'error': 'Cart not found'
            }), 404

        # Remove coupon
        cart.coupon_code = None

        # Update cart totals
        cart.update_totals()

        db.session.commit()

        # Get cart items
        cart_items = CartItem.query.filter_by(cart_id=cart.id).all()

        # Notify via WebSocket
        try:
            if hasattr(request, 'namespace'):
                broadcast_to_user(user_id, 'cart_updated', {
                    'cart': cart_schema.dump(cart),
                    'items': cart_items_schema.dump(cart_items)
                })
        except Exception as e:
            logger.error(f"WebSocket notification error: {str(e)}")

        return jsonify({
            'success': True,
            'message': 'Coupon removed',
            'cart': cart_schema.dump(cart),
            'items': cart_items_schema.dump(cart_items)
        })

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error removing coupon: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to remove coupon',
            'details': str(e)
        }), 500

# ----------------------
# Shipping & Payment Methods
# ----------------------

@cart_routes.route('/shipping-methods', methods=['GET'])
@jwt_required()
def get_shipping_methods():
    """
    Get available shipping methods for the cart.

    Returns:
        JSON with list of available shipping methods
    """
    user_id = get_jwt_identity()

    try:
        # Get cart
        cart = Cart.query.filter_by(user_id=user_id, is_active=True).first()

        if not cart:
            return jsonify({
                'success': False,
                'error': 'Cart not found'
            }), 404

        # Get shipping methods
        shipping_methods = ShippingMethod.query.filter_by(is_active=True).all()

        if not shipping_methods:
            # Create a default shipping zone and method for testing
            try:
                # Check if Kenya shipping zone exists
                shipping_zone = ShippingZone.query.filter_by(country="Kenya").first()

                if not shipping_zone:
                    # Create a shipping zone for Kenya
                    shipping_zone = ShippingZone(
                        name="Kenya Zone",
                        country="Kenya",
                        all_regions=True,
                        is_active=True
                    )
                    db.session.add(shipping_zone)
                    db.session.flush()  # Get the ID without committing

                # Create a default shipping method
                default_method = ShippingMethod(
                    shipping_zone_id=shipping_zone.id,
                    name="Standard Delivery",
                    description="3-5 business days",
                    cost=500,
                    estimated_days="3-5 days",
                    is_active=True
                )
                db.session.add(default_method)
                db.session.commit()

                shipping_methods = [default_method]
                logger.info("Created default shipping method for testing")
            except Exception as e:
                logger.error(f"Error creating default shipping method: {str(e)}")

        available_methods = []
        for method in shipping_methods:
            available_methods.append({
                'id': method.id,
                'name': method.name,
                'description': method.description,
                'cost': float(method.cost),
                'estimated_days': method.estimated_days
            })

        return jsonify({
            'success': True,
            'shipping_methods': available_methods
        })

    except Exception as e:
        logger.error(f"Error getting shipping methods: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to get shipping methods',
            'details': str(e)
        }), 500

@cart_routes.route('/shipping-method', methods=['POST'])
@jwt_required()
def set_shipping_method():
    """
    Set shipping method for the cart.

    Request Body:
        shipping_method_id: ID of the shipping method to set

    Returns:
        JSON with updated cart and items
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
    shipping_method_id = data.get('shipping_method_id')

    if not shipping_method_id:
        return jsonify({
            'success': False,
            'error': 'Shipping method ID is required'
        }), 400

    try:
        # Get cart
        cart = Cart.query.filter_by(user_id=user_id, is_active=True).first()

        if not cart:
            return jsonify({
                'success': False,
                'error': 'Cart not found'
            }), 404

        # Get shipping method
        shipping_method = ShippingMethod.query.get(shipping_method_id)

        if not shipping_method:
            return jsonify({
                'success': False,
                'error': 'Invalid shipping method'
            }), 400

        # Set shipping method
        cart.shipping_method_id = shipping_method_id

        # Update cart totals
        cart.update_totals()

        db.session.commit()

        # Validate cart with new shipping method
        validator = CartValidator(user_id=user_id)
        validator.validate_cart()

        # If there are shipping-specific errors, remove the shipping method
        shipping_errors = [error for error in validator.get_errors()
                         if error.get('code', '').startswith('shipping_')]

        if shipping_errors:
            cart.shipping_method_id = None
            cart.update_totals()
            db.session.commit()

            return jsonify({
                'success': False,
                'errors': shipping_errors
            }), 400

        # Get cart items
        cart_items = CartItem.query.filter_by(cart_id=cart.id).all()

        # Notify via WebSocket
        try:
            if hasattr(request, 'namespace'):
                broadcast_to_user(user_id, 'cart_updated', {
                    'cart': cart_schema.dump(cart),
                    'items': cart_items_schema.dump(cart_items)
                })
        except Exception as e:
            logger.error(f"WebSocket notification error: {str(e)}")

        return jsonify({
            'success': True,
            'message': 'Shipping method set',
            'cart': cart_schema.dump(cart),
            'items': cart_items_schema.dump(cart_items)
        })

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error setting shipping method: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to set shipping method',
            'details': str(e)
        }), 500

@cart_routes.route('/payment-methods', methods=['GET'])
@jwt_required()
def get_payment_methods():
    """
    Get available payment methods for the cart.

    Returns:
        JSON with list of available payment methods
    """
    user_id = get_jwt_identity()

    try:
        # Get cart
        cart = Cart.query.filter_by(user_id=user_id, is_active=True).first()

        if not cart:
            return jsonify({
                'success': False,
                'error': 'Cart not found'
            }), 404

        # Get payment methods
        payment_methods = PaymentMethod.query.filter_by(is_active=True).all()

        if not payment_methods:
            # Create a default payment method for testing
            try:
                default_payment = PaymentMethod(
                    name="Test Payment",
                    code="test_payment",
                    description="Test payment method for automated tests",
                    is_active=True
                )
                db.session.add(default_payment)
                db.session.commit()

                payment_methods = [default_payment]
            except Exception as e:
                logger.error(f"Error creating default payment method: {str(e)}")

        available_methods = []
        for method in payment_methods:
            available_methods.append({
                'id': method.id,
                'name': method.name,
                'code': method.code,
                'description': method.description,
                'instructions': getattr(method, 'instructions', None)
            })

        return jsonify({
            'success': True,
            'payment_methods': available_methods
        })

    except Exception as e:
        logger.error(f"Error getting payment methods: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to get payment methods',
            'details': str(e)
        }), 500

@cart_routes.route('/payment-method', methods=['POST'])
@jwt_required()
def set_payment_method():
    """
    Set payment method for the cart.

    Request Body:
        payment_method_id: ID of the payment method to set

    Returns:
        JSON with updated cart and items
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
    payment_method_id = data.get('payment_method_id')

    if not payment_method_id:
        return jsonify({
            'success': False,
            'error': 'Payment method ID is required'
        }), 400

    try:
        # Get cart
        cart = Cart.query.filter_by(user_id=user_id, is_active=True).first()

        if not cart:
            return jsonify({
                'success': False,
                'error': 'Cart not found'
            }), 404

        # Get payment method
        payment_method = PaymentMethod.query.get(payment_method_id)

        if not payment_method:
            return jsonify({
                'success': False,
                'error': 'Invalid payment method'
            }), 400

        # Set payment method
        cart.payment_method_id = payment_method_id

        db.session.commit()

        # Validate cart with new payment method
        validator = CartValidator(user_id=user_id)
        validator.validate_cart()

        # If there are payment-specific errors, remove the payment method
        payment_errors = [error for error in validator.get_errors()
                         if error.get('code', '').startswith('payment_')]

        if payment_errors:
            cart.payment_method_id = None
            db.session.commit()

            return jsonify({
                'success': False,
                'errors': payment_errors
            }), 400

        # Get cart items
        cart_items = CartItem.query.filter_by(cart_id=cart.id).all()

        # Notify via WebSocket
        try:
            if hasattr(request, 'namespace'):
                broadcast_to_user(user_id, 'cart_updated', {
                    'cart': cart_schema.dump(cart),
                    'items': cart_items_schema.dump(cart_items)
                })
        except Exception as e:
            logger.error(f"WebSocket notification error: {str(e)}")

        return jsonify({
            'success': True,
            'message': 'Payment method set',
            'cart': cart_schema.dump(cart),
            'items': cart_items_schema.dump(cart_items)
        })

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error setting payment method: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to set payment method',
            'details': str(e)
        }), 500

# ----------------------
# Address Management
# ----------------------

@cart_routes.route('/shipping-address', methods=['POST'])
@jwt_required()
def set_shipping_address():
    """
    Set shipping address for the cart.

    Request Body:
        address_id: ID of the address to use for shipping

    Returns:
        JSON with updated cart and items
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
    address_id = data.get('address_id')

    if not address_id:
        return jsonify({
            'success': False,
            'error': 'Address ID is required'
        }), 400

    try:
        # Get cart
        cart = Cart.query.filter_by(user_id=user_id, is_active=True).first()

        if not cart:
            return jsonify({
                'success': False,
                'error': 'Cart not found'
            }), 404

        # Get address
        address = Address.query.get(address_id)

        if not address:
            return jsonify({
                'success': False,
                'error': 'Invalid address'
            }), 400

        # Check if address belongs to user
        if address.user_id != int(user_id):
            return jsonify({
                'success': False,
                'error': 'Address does not belong to user'
            }), 403

        # Set shipping address
        cart.shipping_address_id = address_id

        # If same_as_shipping is true, also set billing address
        if cart.same_as_shipping:
            cart.billing_address_id = address_id

        db.session.commit()

        # Validate cart with new address
        validator = CartValidator(user_id=user_id)
        validator.validate_cart()

        # If there are address-specific errors, return them
        address_errors = [error for error in validator.get_errors()
                         if 'address' in error.get('code', '')]

        if address_errors:
            return jsonify({
                'success': False,
                'errors': address_errors
            }), 400

        # Get cart items
        cart_items = CartItem.query.filter_by(cart_id=cart.id).all()

        # Notify via WebSocket
        try:
            if hasattr(request, 'namespace'):
                broadcast_to_user(user_id, 'cart_updated', {
                    'cart': cart_schema.dump(cart),
                    'items': cart_items_schema.dump(cart_items)
                })
        except Exception as e:
            logger.error(f"WebSocket notification error: {str(e)}")

        return jsonify({
            'success': True,
            'message': 'Shipping address set',
            'cart': cart_schema.dump(cart),
            'items': cart_items_schema.dump(cart_items)
        })

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error setting shipping address: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to set shipping address',
            'details': str(e)
        }), 500

@cart_routes.route('/billing-address', methods=['POST'])
@jwt_required()
def set_billing_address():
    """
    Set billing address for the cart.

    Request Body:
        address_id: ID of the address to use for billing (optional if same_as_shipping is true)
        same_as_shipping: Boolean indicating whether to use shipping address for billing

    Returns:
        JSON with updated cart and items
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
    address_id = data.get('address_id')
    same_as_shipping = data.get('same_as_shipping', False)

    if not address_id and not same_as_shipping:
        return jsonify({
            'success': False,
            'error': 'Address ID is required when not using shipping address'
        }), 400

    try:
        # Get cart
        cart = Cart.query.filter_by(user_id=user_id, is_active=True).first()

        if not cart:
            return jsonify({
                'success': False,
                'error': 'Cart not found'
            }), 404

        # Set same_as_shipping flag
        cart.same_as_shipping = same_as_shipping

        if same_as_shipping:
            # Use shipping address for billing
            cart.billing_address_id = cart.shipping_address_id
        else:
            # Get address
            address = Address.query.get(address_id)

            if not address:
                return jsonify({
                    'success': False,
                    'error': 'Invalid address'
                }), 400

            # Check if address belongs to user
            if address.user_id != int(user_id):
                return jsonify({
                    'success': False,
                    'error': 'Address does not belong to user'
                }), 403

            # Set billing address
            cart.billing_address_id = address_id

        db.session.commit()

        # Validate cart with new address
        validator = CartValidator(user_id=user_id)
        validator.validate_cart()

        # If there are address-specific errors, return them
        address_errors = [error for error in validator.get_errors()
                         if 'address' in error.get('code', '')]

        if address_errors:
            return jsonify({
                'success': False,
                'errors': address_errors
            }), 400

        # Get cart items
        cart_items = CartItem.query.filter_by(cart_id=cart.id).all()

        # Notify via WebSocket
        try:
            if hasattr(request, 'namespace'):
                broadcast_to_user(user_id, 'cart_updated', {
                    'cart': cart_schema.dump(cart),
                    'items': cart_items_schema.dump(cart_items)
                })
        except Exception as e:
            logger.error(f"WebSocket notification error: {str(e)}")

        return jsonify({
            'success': True,
            'message': 'Billing address set',
            'cart': cart_schema.dump(cart),
            'items': cart_items_schema.dump(cart_items)
        })

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error setting billing address: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to set billing address',
            'details': str(e)
        }), 500

# ----------------------
# Checkout Process
# ----------------------

@cart_routes.route('/checkout/validate', methods=['GET'])
@jwt_required()
@validate_cart_middleware
def validate_checkout():
    """
    Validate the cart for checkout.

    Returns:
        JSON with validation status, errors, and warnings
    """
    user_id = get_jwt_identity()

    try:
        # Get cart
        cart = Cart.query.filter_by(user_id=user_id, is_active=True).first()

        if not cart:
            return jsonify({
                'success': False,
                'error': 'Cart not found'
            }), 404

        # Validate cart for checkout
        is_valid, errors, warnings = validate_checkout(cart.id)

        # Get cart items
        cart_items = CartItem.query.filter_by(cart_id=cart.id).all()

        return jsonify({
            'success': True,
            'is_valid': is_valid,
            'errors': errors,
            'warnings': warnings,
            'cart': cart_schema.dump(cart),
            'items': cart_items_schema.dump(cart_items)
        })

    except Exception as e:
        logger.error(f"Error validating checkout: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to validate checkout',
            'details': str(e)
        }), 500

@cart_routes.route('/notes', methods=['POST'])
@jwt_required()
def set_notes():
    """
    Set notes for the cart.

    Request Body:
        notes: Notes to add to the cart

    Returns:
        JSON with updated cart
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
    notes = data.get('notes')

    try:
        # Get cart
        cart = Cart.query.filter_by(user_id=user_id, is_active=True).first()

        if not cart:
            return jsonify({
                'success': False,
                'error': 'Cart not found'
            }), 404

        # Set notes
        cart.notes = notes

        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Cart notes updated',
            'cart': cart_schema.dump(cart)
        })

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error setting cart notes: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to set cart notes',
            'details': str(e)
        }), 500

@cart_routes.route('/shipping-options', methods=['POST'])
@jwt_required()
def set_shipping_options():
    """
    Set shipping options for the cart.

    Request Body:
        requires_shipping: Boolean indicating whether the cart requires shipping

    Returns:
        JSON with updated cart and items
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
    requires_shipping = data.get('requires_shipping')

    if requires_shipping is None:
        return jsonify({
            'success': False,
            'error': 'Requires shipping flag is required'
        }), 400

    try:
        # Get cart
        cart = Cart.query.filter_by(user_id=user_id, is_active=True).first()

        if not cart:
            return jsonify({
                'success': False,
                'error': 'Cart not found'
            }), 404

        # Set requires shipping flag
        cart.requires_shipping = requires_shipping

        # If shipping is not required, reset shipping method
        if not requires_shipping:
            cart.shipping_method_id = None

        # Update cart totals
        cart.update_totals()

        db.session.commit()

        # Get cart items
        cart_items = CartItem.query.filter_by(cart_id=cart.id).all()

        return jsonify({
            'success': True,
            'message': 'Shipping options updated',
            'cart': cart_schema.dump(cart),
            'items': cart_items_schema.dump(cart_items)
        })

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error setting shipping options: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to set shipping options',
            'details': str(e)
        }), 500

def validate_cart_item_addition(user_id, product_id, variant_id=None, quantity=1):
    """
    Validate adding an item to the cart.

    Args:
        user_id: The ID of the user
        product_id: The ID of the product to add
        variant_id: The ID of the product variant (optional)
        quantity: The quantity to add

    Returns:
        tuple: (is_valid, errors, warnings)
    """
    errors = []
    warnings = []

    try:
        # Check if product exists
        product = Product.query.get(product_id)
        if not product:
            errors.append({
                "message": f"Product with ID {product_id} not found",
                "code": "product_not_found"
            })
            return False, errors, warnings

        # Check if product is visible (available)
        # Use is_visible instead of is_active for product availability
        if hasattr(product, 'is_visible') and not product.is_visible:
            errors.append({
                "message": f"Product '{product.name}' is no longer available",
                "code": "product_inactive"
            })

        # Check if variant exists (if applicable)
        variant = None
        if variant_id:
            variant = ProductVariant.query.get(variant_id)
            if not variant:
                errors.append({
                    "message": f"Product variant with ID {variant_id} not found",
                    "code": "variant_not_found"
                })
                return False, errors, warnings

            # Check if variant belongs to the product
            if variant.product_id != product.id:
                errors.append({
                    "message": f"Variant does not belong to product '{product.name}'",
                    "code": "variant_mismatch"
                })

        # Validate quantity
        if not isinstance(quantity, int) or quantity < 1:
            errors.append({
                "message": f"Invalid quantity for product '{product.name}'",
                "code": "invalid_quantity"
            })

        # Check stock availability
        inventory = Inventory.query.filter_by(
            product_id=product.id,
            variant_id=variant.id if variant else None
        ).first()

        if not inventory:
            # Fall back to product stock
            stock_level = getattr(product, 'stock', 0)

            # Only add a warning, not an error
            warnings.append({
                "message": f"Using product stock level for '{product.name}'",
                "code": "using_product_stock"
            })

            # Check if product is in stock
            if stock_level <= 0:
                errors.append({
                    "message": f"Product '{product.name}' is out of stock",
                    "code": "out_of_stock"
                })
                return False, errors, warnings

            # Check if requested quantity exceeds available stock
            if quantity > stock_level:
                errors.append({
                    "message": f"Requested quantity ({quantity}) exceeds available stock ({stock_level}) for product '{product.name}'",
                    "code": "insufficient_stock",
                    "available_stock": stock_level
                })
                return False, errors, warnings
        elif inventory.stock_level <= 0:
            errors.append({
                "message": f"Product '{product.name}' is out of stock",
                "code": "out_of_stock"
            })
            return False, errors, warnings
        elif quantity > inventory.stock_level:
            errors.append({
                "message": f"Requested quantity ({quantity}) exceeds available stock ({inventory.stock_level}) for product '{product.name}'",
                "code": "insufficient_stock",
                "available_stock": inventory.stock_level
            })
            return False, errors, warnings

        # Check purchase limits
        min_purchase = getattr(product, 'min_purchase_quantity', 1)
        if quantity < min_purchase:
            errors.append({
                "message": f"Minimum purchase quantity for '{product.name}' is {min_purchase}",
                "code": "below_min_quantity",
                "min_quantity": min_purchase
            })

        max_purchase = getattr(product, 'max_purchase_quantity', None)
        if max_purchase and quantity > max_purchase:
            errors.append({
                "message": f"Maximum purchase quantity for '{product.name}' is {max_purchase}",
                "code": "exceeds_max_quantity",
                "max_quantity": max_purchase
            })

        # Check if the user already has this product in their cart
        if user_id:
            cart = Cart.query.filter_by(user_id=user_id, is_active=True).first()

            if cart:
                existing_item = CartItem.query.filter_by(
                    cart_id=cart.id,
                    product_id=product_id,
                    variant_id=variant_id
                ).first()

                if existing_item:
                    total_quantity = existing_item.quantity + quantity

                    # Re-check stock with total quantity
                    if inventory and total_quantity > inventory.stock_level:
                        errors.append({
                            "message": f"Total quantity ({total_quantity}) exceeds available stock ({inventory.stock_level}) for product '{product.name}'",
                            "code": "insufficient_stock",
                            "available_stock": inventory.stock_level
                        })
                        return False, errors, warnings
                    elif not inventory and total_quantity > getattr(product, 'stock', 0):
                        errors.append({
                            "message": f"Total quantity ({total_quantity}) exceeds available stock ({getattr(product, 'stock', 0)}) for product '{product.name}'",
                            "code": "insufficient_stock",
                            "available_stock": getattr(product, 'stock', 0)
                        })
                        return False, errors, warnings

                    # Re-check max purchase with total quantity
                    if max_purchase and total_quantity > max_purchase:
                        errors.append({
                            "message": f"Maximum purchase quantity for '{product.name}' is {max_purchase}",
                            "code": "exceeds_max_quantity",
                            "max_quantity": max_purchase
                        })
                        return False, errors, warnings

                    warnings.append({
                        "message": f"Product '{product.name}' is already in your cart. Quantity will be updated.",
                        "code": "product_already_in_cart",
                        "current_quantity": existing_item.quantity,
                        "new_quantity": total_quantity
                    })

        return len(errors) == 0, errors, warnings

    except Exception as e:
        logger.error(f"Error validating cart item addition: {str(e)}")
        errors.append({
            "message": f"An error occurred during validation: {str(e)}",
            "code": "validation_error"
        })
        return False, errors, warnings


def validate_checkout(cart_id):
    """
    Validate cart for checkout.

    Args:
        cart_id: The ID of the cart to validate

    Returns:
        tuple: (is_valid, errors, warnings)
    """
    try:
        # Get cart
        cart = Cart.query.get(cart_id)

        if not cart:
            return False, [{"message": "Cart not found", "code": "cart_not_found"}], []

        # Create validator
        validator = CartValidator(user_id=cart.user_id, cart_id=cart_id)

        # Validate cart
        is_valid = validator.validate_cart()

        return is_valid, validator.get_errors(), validator.get_warnings()

    except Exception as e:
        logger.error(f"Error validating checkout: {str(e)}")
        return False, [{"message": f"An error occurred during validation: {str(e)}", "code": "validation_error"}], []

# Add a new route to validate cart against inventory
@cart_routes.route('/validate', methods=['GET', 'OPTIONS'])
@jwt_required(optional=True)
def validate_cart():
    """Validate cart against inventory."""
    # Handle OPTIONS request for CORS preflight
    if request.method == 'OPTIONS':
        response = current_app.make_default_options_response()
        origin = request.headers.get('Origin', '*')
        response.headers['Access-Control-Allow-Origin'] = origin
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization,X-Requested-With'
        response.headers['Access-Control-Allow-Methods'] = 'GET,OPTIONS'
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        return response

    try:
        # Get current user or guest ID
        current_user_id = get_jwt_identity()
        guest_id = None

        if not current_user_id:
            # For guest users, get guest ID from cookies
            guest_id = request.cookies.get('guest_id')

        # Find active cart
        cart = None
        if current_user_id:
            cart = Cart.query.filter_by(user_id=current_user_id, is_active=True).first()
        elif guest_id:
            cart = Cart.query.filter_by(guest_id=guest_id, is_active=True).first()

        if not cart:
            return jsonify({
                "is_valid": True,
                "errors": [],
                "warnings": []
            }), 200

        # Get all cart items
        cart_items = CartItem.query.filter_by(cart_id=cart.id).all()

        # Convert to list of dicts for validation
        items_data = [
            {
                "id": item.id,
                "product_id": item.product_id,
                "variant_id": item.variant_id,
                "quantity": item.quantity
            }
            for item in cart_items
        ]

        # Validate cart items against inventory
        is_valid, errors, warnings = validate_cart_items(items_data)

        return jsonify({
            "is_valid": is_valid,
            "errors": errors,
            "warnings": warnings
        }), 200

    except Exception as e:
        logger.error(f"Error validating cart: {str(e)}")
        return jsonify({"error": "Failed to validate cart", "details": str(e)}), 500
