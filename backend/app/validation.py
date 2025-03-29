"""
Validation module for Mizizzi E-commerce platform.
Provides validation middleware and handlers for different routes.
"""
from functools import wraps
from flask import request, jsonify, g
from .validators import (
    UserValidator, LoginValidator, AddressValidator, ProductValidator,
    ProductVariantValidator, CartItemValidator, OrderValidator,
    PaymentValidator, ReviewValidator, ValidationError
)
from .models import User, UserRole, OrderStatus
from datetime import datetime

def validate_request(validator_class, context=None):
    """
    Decorator to validate request data using the specified validator class.

    Args:
        validator_class: The validator class to use
        context: Additional context to pass to the validator

    Returns:
        Decorated function
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Get request data based on content type
            if request.is_json:
                data = request.get_json() or {}
            else:
                data = request.form.to_dict()

            # Create validator instance
            validator = validator_class(data, context)

            # Validate data
            if not validator.is_valid():
                return jsonify({
                    "error": "Validation failed",
                    "errors": validator.get_errors()
                }), 400

            # Store validated data in g for access in the view
            g.validated_data = data

            return f(*args, **kwargs)
        return decorated_function
    return decorator

def admin_required(f):
    """
    Decorator to check if the current user is an admin.

    Returns:
        Decorated function
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request

        try:
            verify_jwt_in_request()
            current_user_id = get_jwt_identity()
            user = User.query.get(current_user_id)

            if not user or user.role != UserRole.ADMIN:
                return jsonify({"error": "Admin access required"}), 403

            return f(*args, **kwargs)
        except Exception as e:
            return jsonify({"error": "Unauthorized", "details": str(e)}), 401

    return decorated_function

# ----------------------
# User Validation Handlers
# ----------------------

def validate_user_registration():
    """Validate user registration data."""
    return validate_request(UserValidator)

def validate_user_login():
    """Validate user login data."""
    return validate_request(LoginValidator)

def validate_user_update(user_id):
    """
    Validate user update data.

    Args:
        user_id: The ID of the user being updated

    Returns:
        Validation decorator
    """
    return validate_request(UserValidator, context={'user_id': user_id})

# ----------------------
# Address Validation Handlers
# ----------------------

def validate_address_creation(user_id):
    """
    Validate address creation data.

    Args:
        user_id: The ID of the user creating the address

    Returns:
        Validation decorator
    """
    return validate_request(AddressValidator, context={'user_id': user_id})


def validate_address_update(user_id, address_id):
    """
    Validate address update data.

    Args:
        user_id: The ID of the user updating the address
        address_id: The ID of the address being updated

    Returns:
        Validation decorator
    """
    return validate_request(AddressValidator, context={'user_id': user_id, 'address_id': address_id})

# ----------------------
# Product Validation Handlers
# ----------------------

def validate_product_creation():
    """Validate product creation data."""
    return validate_request(ProductValidator)

def validate_product_update(product_id):
    """
    Validate product update data.

    Args:
        product_id: The ID of the product being updated

    Returns:
        Validation decorator
    """
    return validate_request(ProductValidator, context={'product_id': product_id})

def validate_product_variant_creation(product_id):
    """
    Validate product variant creation data.

    Args:
        product_id: The ID of the product for which the variant is being created

    Returns:
        Validation decorator
    """
    return validate_request(ProductVariantValidator, context={'product_id': product_id})

def validate_product_variant_update(variant_id):
    """
    Validate product variant update data.

    Args:
        variant_id: The ID of the variant being updated

    Returns:
        Validation decorator
    """
    return validate_request(ProductVariantValidator, context={'variant_id': variant_id})

# ----------------------
# Cart Validation Handlers
# ----------------------

def validate_cart_item_addition(user_id):
    """
    Validate cart item addition data.

    Args:
        user_id: The ID of the user adding the item to cart

    Returns:
        Validation decorator
    """
    return validate_request(CartItemValidator, context={'user_id': user_id})

def validate_cart_item_update(user_id, item_id):
    """
    Validate cart item update data.

    Args:
        user_id: The ID of the user updating the cart item
        item_id: The ID of the cart item being updated

    Returns:
        Validation decorator
    """
    return validate_request(CartItemValidator, context={'user_id': user_id, 'item_id': item_id})

# ----------------------
# Order Validation Handlers
# ----------------------

def validate_order_creation(user_id):
    """
    Validate order creation data.

    Args:
        user_id: The ID of the user creating the order

    Returns:
        Validation decorator
    """
    return validate_request(OrderValidator, context={'user_id': user_id})

def validate_order_status_update(order_id):
    """
    Validate order status update data.

    Args:
        order_id: The ID of the order being updated

    Returns:
        Validation decorator
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Get request data
            if request.is_json:
                data = request.get_json() or {}
            else:
                data = request.form.to_dict()

            # Validate status
            status = data.get('status')
            if not status:
                return jsonify({
                    "error": "Validation failed",
                    "errors": {
                        "status": [{"message": "Status is required", "code": "required"}]
                    }
                }), 400

            # Check if status is valid
            try:
                OrderStatus(status)
            except ValueError:
                return jsonify({
                    "error": "Validation failed",
                    "errors": {
                        "status": [{"message": "Invalid status value", "code": "invalid_choice"}]
                    }
                }), 400

            # Store validated data in g for access in the view
            g.validated_data = data

            return f(*args, **kwargs)
        return decorated_function
    return decorator

# ----------------------
# Payment Validation Handlers
# ----------------------

def validate_payment_creation(user_id, order_id):
    """
    Validate payment creation data.

    Args:
        user_id: The ID of the user making the payment
        order_id: The ID of the order being paid for

    Returns:
        Validation decorator
    """
    return validate_request(PaymentValidator, context={'user_id': user_id, 'order_id': order_id})

def validate_mpesa_payment():
    """Validate M-Pesa payment data."""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Get request data
            if request.is_json:
                data = request.get_json() or {}
            else:
                data = request.form.to_dict()

            # Validate required fields
            required_fields = ['phone', 'amount']
            errors = {}

            for field in required_fields:
                if field not in data or not data[field]:
                    if field not in errors:
                        errors[field] = []
                    errors[field].append({
                        "message": f"{field.capitalize()} is required",
                        "code": "required"
                    })

            if errors:
                return jsonify({
                    "error": "Validation failed",
                    "errors": errors
                }), 400

            # Validate phone number
            from .validation_utils import is_valid_kenyan_phone

            if not is_valid_kenyan_phone(data['phone']):
                if 'phone' not in errors:
                    errors['phone'] = []
                errors['phone'].append({
                    "message": "Invalid Kenyan phone number format",
                    "code": "invalid_format"
                })

            # Validate amount
            from .validation_utils import is_valid_number

            if not is_valid_number(data['amount'], min_value=1):
                if 'amount' not in errors:
                    errors['amount'] = []
                errors['amount'].append({
                    "message": "Amount must be a positive number",
                    "code": "invalid_value"
                })

            if errors:
                return jsonify({
                    "error": "Validation failed",
                    "errors": errors
                }), 400

            # Store validated data in g for access in the view
            g.validated_data = data

            return f(*args, **kwargs)
        return decorated_function
    return decorator

# ----------------------
# Review Validation Handlers
# ----------------------

def validate_review_creation(user_id, product_id):
    """
    Validate review creation data.

    Args:
        user_id: The ID of the user creating the review
        product_id: The ID of the product being reviewed

    Returns:
        Validation decorator
    """
    return validate_request(ReviewValidator, context={'user_id': user_id, 'product_id': product_id})

def validate_review_update(user_id, review_id):
    """
    Validate review update data.

    Args:
        user_id: The ID of the user updating the review
        review_id: The ID of the review being updated

    Returns:
        Validation decorator
    """
    return validate_request(ReviewValidator, context={'user_id': user_id, 'review_id': review_id})

