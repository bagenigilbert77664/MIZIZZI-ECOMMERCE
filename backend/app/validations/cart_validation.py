"""
Cart validation module for Mizizzi E-commerce Platform
Provides comprehensive cart validation functionality.
"""

import logging
from datetime import datetime, timedelta
from typing import List, Dict, Tuple, Optional, Any
from functools import wraps

from flask import request, jsonify, g
from flask_jwt_extended import get_jwt_identity

from ..models.models import (
    Cart, CartItem, Product, ProductVariant, User, Coupon,
    Inventory, ShippingMethod, PaymentMethod, Address,
    CouponType, db
)

# Set up logger
logger = logging.getLogger(__name__)

class CartValidationError(Exception):
    """Custom exception for cart validation errors."""
    def __init__(self, message, code=None, details=None):
        self.message = message
        self.code = code
        self.details = details
        super().__init__(self.message)

class CartValidator:
    """
    Comprehensive cart validator class.
    Handles all cart validation logic including inventory, pricing, coupons, etc.
    """

    def __init__(self, user_id=None, cart_id=None, cart=None):
        """
        Initialize the cart validator.

        Args:
            user_id: ID of the user (optional)
            cart_id: ID of the cart (optional)
            cart: Cart object (optional)
        """
        self.user_id = user_id
        self.cart_id = cart_id
        self.cart = cart
        self.user = None
        self.errors = []
        self.warnings = []

        # Load user if user_id is provided
        if self.user_id:
            self.user = db.session.get(User, self.user_id)

        # Load cart if not provided
        if not self.cart:
            if self.cart_id:
                self.cart = db.session.get(Cart, self.cart_id)
            elif self.user_id:
                self.cart = Cart.query.filter_by(
                    user_id=self.user_id,
                    is_active=True
                ).first()

    def validate_cart(self) -> bool:
        """
        Validate the entire cart.

        Returns:
            bool: True if cart is valid, False otherwise
        """
        self.errors = []
        self.warnings = []

        try:
            # Basic cart validation
            if not self._validate_cart_exists():
                return False

            # Validate cart items
            if not self._validate_cart_items():
                return False

            # Validate inventory
            if not self._validate_inventory():
                return False

            # Validate pricing
            if not self._validate_pricing():
                return False

            # Validate coupons
            if not self._validate_coupons():
                return False

            # Additional business rules
            if not self._validate_business_rules():
                return False

            return len(self.errors) == 0

        except Exception as e:
            logger.error(f"Error during cart validation: {str(e)}")
            self.errors.append({
                "message": f"Validation error: {str(e)}",
                "code": "validation_error"
            })
            return False

    def _validate_cart_exists(self) -> bool:
        """Validate that cart exists and is active."""
        if not self.cart:
            self.errors.append({
                "message": "Cart not found",
                "code": "cart_not_found"
            })
            return False

        if not self.cart.is_active:
            self.errors.append({
                "message": "Cart is not active",
                "code": "cart_inactive"
            })
            return False

        return True

    def _validate_cart_items(self) -> bool:
        """Validate cart items exist and are valid."""
        cart_items = CartItem.query.filter_by(cart_id=self.cart.id).all()

        if not cart_items:
            self.errors.append({
                "message": "Cart is empty",
                "code": "cart_empty"
            })
            return False

        for item in cart_items:
            # Validate product exists
            product = db.session.get(Product, item.product_id)
            if not product:
                self.errors.append({
                    "message": f"Product with ID {item.product_id} not found",
                    "code": "product_not_found",
                    "item_id": item.id
                })
                continue

            # Validate product is active/visible
            if hasattr(product, 'is_visible') and not product.is_visible:
                self.errors.append({
                    "message": f"Product '{product.name}' is no longer available",
                    "code": "product_inactive",
                    "item_id": item.id,
                    "product_id": product.id
                })

            # Validate variant if applicable
            if item.variant_id:
                variant = db.session.get(ProductVariant, item.variant_id)
                if not variant:
                    self.errors.append({
                        "message": f"Product variant with ID {item.variant_id} not found",
                        "code": "variant_not_found",
                        "item_id": item.id
                    })
                    continue

                if variant.product_id != product.id:
                    self.errors.append({
                        "message": f"Variant does not belong to product '{product.name}'",
                        "code": "variant_mismatch",
                        "item_id": item.id
                    })

            # Validate quantity
            if item.quantity <= 0:
                self.errors.append({
                    "message": f"Invalid quantity for product '{product.name}'",
                    "code": "invalid_quantity",
                    "item_id": item.id
                })

        return len([e for e in self.errors if e.get('code') in [
            'product_not_found', 'variant_not_found', 'variant_mismatch', 'invalid_quantity'
        ]]) == 0

    def _validate_inventory(self) -> bool:
        """Validate inventory availability for all cart items."""
        cart_items = CartItem.query.filter_by(cart_id=self.cart.id).all()

        for item in cart_items:
            # Get inventory record
            inventory = Inventory.query.filter_by(
                product_id=item.product_id,
                variant_id=item.variant_id
            ).first()

            if not inventory:
                # Fall back to product stock
                product = db.session.get(Product, item.product_id)
                if product:
                    stock_level = getattr(product, 'stock', 0)
                    self.warnings.append({
                        "message": f"Using product stock level for '{product.name}'",
                        "code": "using_product_stock",
                        "item_id": item.id
                    })

                    if stock_level <= 0:
                        self.errors.append({
                            "message": f"Product '{product.name}' is out of stock",
                            "code": "out_of_stock",
                            "item_id": item.id,
                            "product_id": product.id
                        })
                    elif item.quantity > stock_level:
                        self.errors.append({
                            "message": f"Requested quantity ({item.quantity}) exceeds available stock ({stock_level}) for product '{product.name}'",
                            "code": "insufficient_stock",
                            "item_id": item.id,
                            "product_id": product.id,
                            "available_stock": stock_level,
                            "requested_quantity": item.quantity
                        })
                else:
                    self.errors.append({
                        "message": f"Product with ID {item.product_id} not found",
                        "code": "product_not_found",
                        "item_id": item.id
                    })
            else:
                # Check inventory stock
                if inventory.stock_level <= 0:
                    product = db.session.get(Product, item.product_id)
                    product_name = product.name if product else f"Product ID {item.product_id}"
                    self.errors.append({
                        "message": f"Product '{product_name}' is out of stock",
                        "code": "out_of_stock",
                        "item_id": item.id,
                        "product_id": item.product_id
                    })
                elif item.quantity > inventory.stock_level:
                    product = db.session.get(Product, item.product_id)
                    product_name = product.name if product else f"Product ID {item.product_id}"
                    self.errors.append({
                        "message": f"Requested quantity ({item.quantity}) exceeds available stock ({inventory.stock_level}) for product '{product_name}'",
                        "code": "insufficient_stock",
                        "item_id": item.id,
                        "product_id": item.product_id,
                        "available_stock": inventory.stock_level,
                        "requested_quantity": item.quantity
                    })

        return len([e for e in self.errors if e.get('code') in [
            'out_of_stock', 'insufficient_stock'
        ]]) == 0

    def _validate_pricing(self) -> bool:
        """Validate pricing for all cart items."""
        cart_items = CartItem.query.filter_by(cart_id=self.cart.id).all()

        for item in cart_items:
            product = db.session.get(Product, item.product_id)
            if not product:
                continue

            # Get current price
            current_price = product.sale_price or product.price
            if item.variant_id:
                variant = db.session.get(ProductVariant, item.variant_id)
                if variant:
                    current_price = variant.price

            # Check if price has changed significantly
            if abs(float(item.price) - float(current_price)) > 0.01:
                self.warnings.append({
                    "message": f"Price for '{product.name}' has changed from {item.price} to {current_price}",
                    "code": "price_changed",
                    "item_id": item.id,
                    "old_price": float(item.price),
                    "new_price": float(current_price)
                })

        return True

    def _validate_coupons(self) -> bool:
        """Validate applied coupons."""
        if not self.cart.coupon_code:
            return True

        coupon = Coupon.query.filter_by(
            code=self.cart.coupon_code,
            is_active=True
        ).first()

        if not coupon:
            self.errors.append({
                "message": f"Coupon '{self.cart.coupon_code}' is not valid",
                "code": "coupon_invalid"
            })
            return False

        # Check coupon validity period
        now = datetime.utcnow()
        if coupon.start_date and now < coupon.start_date:
            self.errors.append({
                "message": f"Coupon '{coupon.code}' is not yet active",
                "code": "coupon_not_active"
            })
            return False

        if coupon.end_date and now > coupon.end_date:
            self.errors.append({
                "message": f"Coupon '{coupon.code}' has expired",
                "code": "coupon_expired"
            })
            return False

        # Check usage limits
        if coupon.usage_limit and coupon.used_count >= coupon.usage_limit:
            self.errors.append({
                "message": f"Coupon '{coupon.code}' has reached its usage limit",
                "code": "coupon_usage_limit_reached"
            })
            return False

        # Check minimum order amount
        if hasattr(coupon, 'min_purchase') and coupon.min_purchase and self.cart.subtotal < coupon.min_purchase:
            self.errors.append({
                "message": f"Minimum order amount of {coupon.min_purchase} required for coupon '{coupon.code}'",
                "code": "coupon_minimum_not_met",
                "minimum_amount": float(coupon.min_purchase),
                "current_amount": float(self.cart.subtotal)
            })
            return False

        return True

    def _validate_business_rules(self) -> bool:
        """Validate additional business rules."""
        # Check minimum order amount
        min_order_amount = 100  # Example minimum order amount
        if self.cart.total < min_order_amount:
            self.warnings.append({
                "message": f"Minimum order amount is {min_order_amount}",
                "code": "minimum_order_warning",
                "minimum_amount": min_order_amount,
                "current_amount": float(self.cart.total)
            })

        # Check maximum order amount
        max_order_amount = 50000  # Example maximum order amount
        if self.cart.total > max_order_amount:
            self.errors.append({
                "message": f"Maximum order amount is {max_order_amount}",
                "code": "maximum_order_exceeded",
                "maximum_amount": max_order_amount,
                "current_amount": float(self.cart.total)
            })
            return False

        return True

    def get_errors(self) -> List[Dict[str, Any]]:
        """Get validation errors."""
        return self.errors

    def get_warnings(self) -> List[Dict[str, Any]]:
        """Get validation warnings."""
        return self.warnings

    def has_errors(self) -> bool:
        """Check if there are validation errors."""
        return len(self.errors) > 0

    def has_warnings(self) -> bool:
        """Check if there are validation warnings."""
        return len(self.warnings) > 0

# Middleware and decorator functions
def validate_cart_middleware(f):
    """Middleware to validate cart before processing requests."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user_id = get_jwt_identity()
        if user_id:
            validator = CartValidator(user_id=user_id)
            if not validator.validate_cart():
                return jsonify({
                    'success': False,
                    'errors': validator.get_errors(),
                    'warnings': validator.get_warnings()
                }), 400
        return f(*args, **kwargs)
    return decorated_function

def validate_cart_item_stock(product_id: int, variant_id: Optional[int], quantity: int) -> Tuple[bool, int, str]:
    """
    Validate stock availability for a cart item.

    Args:
        product_id: ID of the product
        variant_id: ID of the variant (optional)
        quantity: Requested quantity

    Returns:
        Tuple of (is_valid, available_stock, error_message)
    """
    try:
        # Get inventory record
        inventory = Inventory.query.filter_by(
            product_id=product_id,
            variant_id=variant_id
        ).first()

        if not inventory:
            # Fall back to product stock
            product = db.session.get(Product, product_id)
            if not product:
                return False, 0, f"Product with ID {product_id} not found"

            stock_level = getattr(product, 'stock', 0)
            if stock_level <= 0:
                return False, 0, f"Product '{product.name}' is out of stock"

            if quantity > stock_level:
                return False, stock_level, f"Requested quantity ({quantity}) exceeds available stock ({stock_level})"

            return True, stock_level, ""

        # Check inventory stock
        if inventory.stock_level <= 0:
            product = db.session.get(Product, product_id)
            product_name = product.name if product else f"Product ID {product_id}"
            return False, 0, f"Product '{product_name}' is out of stock"

        if quantity > inventory.stock_level:
            product = db.session.get(Product, product_id)
            product_name = product.name if product else f"Product ID {product_id}"
            return False, inventory.stock_level, f"Requested quantity ({quantity}) exceeds available stock ({inventory.stock_level})"

        return True, inventory.stock_level, ""

    except Exception as e:
        logger.error(f"Error validating cart item stock: {str(e)}")
        return False, 0, f"Error validating stock: {str(e)}"

def validate_cart_items(items_data: List[Dict[str, Any]]) -> Tuple[bool, List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Validate multiple cart items against inventory.

    Args:
        items_data: List of cart item dictionaries

    Returns:
        Tuple of (is_valid, errors, warnings)
    """
    errors = []
    warnings = []

    try:
        for item_data in items_data:
            product_id = item_data.get('product_id')
            variant_id = item_data.get('variant_id')
            quantity = item_data.get('quantity', 1)
            item_id = item_data.get('id')

            # Validate stock
            is_valid, available_stock, error_message = validate_cart_item_stock(
                product_id, variant_id, quantity
            )

            if not is_valid:
                errors.append({
                    "message": error_message,
                    "code": "insufficient_stock" if "exceeds" in error_message else "out_of_stock",
                    "item_id": item_id,
                    "product_id": product_id,
                    "variant_id": variant_id,
                    "available_stock": available_stock,
                    "requested_quantity": quantity
                })

        return len(errors) == 0, errors, warnings

    except Exception as e:
        logger.error(f"Error validating cart items: {str(e)}")
        errors.append({
            "message": f"Error validating cart items: {str(e)}",
            "code": "validation_error"
        })
        return False, errors, warnings

def validate_checkout(cart_id: int) -> Tuple[bool, List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Validate cart for checkout.

    Args:
        cart_id: ID of the cart to validate

    Returns:
        Tuple of (is_valid, errors, warnings)
    """
    try:
        cart = db.session.get(Cart, cart_id)
        if not cart:
            return False, [{"message": "Cart not found", "code": "cart_not_found"}], []

        validator = CartValidator(cart=cart)
        is_valid = validator.validate_cart()

        return is_valid, validator.get_errors(), validator.get_warnings()

    except Exception as e:
        logger.error(f"Error validating checkout: {str(e)}")
        return False, [{"message": f"Error validating checkout: {str(e)}", "code": "validation_error"}], []
