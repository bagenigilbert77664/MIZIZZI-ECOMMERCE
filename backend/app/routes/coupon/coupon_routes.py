"""
Coupon routes for Mizizzi E-commerce platform.
Handles coupon validation and management.
"""
# Standard Libraries
import os
import json
import uuid
import secrets
import re
import random
import string
import logging
from datetime import datetime, timedelta
from functools import wraps

# Flask Core
from flask import Blueprint, request, jsonify, g, current_app, make_response, render_template_string, url_for, redirect
from flask_cors import cross_origin
from flask_jwt_extended import (
    create_access_token, create_refresh_token,
    jwt_required, get_jwt_identity, get_jwt,
    set_access_cookies, set_refresh_cookies
)

# Security & Validation
from werkzeug.security import generate_password_hash, check_password_hash
from email_validator import validate_email, EmailNotValidError
from sqlalchemy.exc import IntegrityError

# Database & ORM
from sqlalchemy import or_, desc, func

try:
    from ...configuration.extensions import db, ma, mail, cache, cors
except ImportError:
    try:
        from app.configuration.extensions import db, ma, mail, cache, cors
    except ImportError:
        # Fallback imports
        from flask_sqlalchemy import SQLAlchemy
        from flask_marshmallow import Marshmallow
        from flask_mail import Mail
        from flask_caching import Cache
        from flask_cors import CORS

        db = SQLAlchemy()
        ma = Marshmallow()
        mail = Mail()
        cache = Cache()
        cors = CORS()

# Models
try:
    from ...models.models import (
        User, UserRole, Category, Product, ProductVariant, Brand, Review,
        CartItem, Order, OrderItem, WishlistItem, Coupon, Payment,
        OrderStatus, PaymentStatus, Newsletter, CouponType, Address, AddressType,
        ProductImage
    )
except ImportError:
    try:
        from ...models.models import (
            User, UserRole, Category, Product, ProductVariant, Brand, Review,
            CartItem, Order, OrderItem, WishlistItem, Coupon, Payment,
            OrderStatus, PaymentStatus, Newsletter, CouponType, Address, AddressType,
            ProductImage
        )
    except ImportError:
        # Create minimal model classes for fallback
        class User:
            pass
        class UserRole:
            ADMIN = 'admin'
        class Coupon:
            pass
        class CouponType:
            PERCENTAGE = 'percentage'
            FIXED = 'fixed'

# Schemas
try:
    from ...schemas.schemas import (
        user_schema, users_schema, category_schema, categories_schema,
        product_schema, products_schema, brand_schema, brands_schema,
        review_schema, reviews_schema, cart_item_schema, cart_items_schema,
        order_schema, orders_schema, wishlist_item_schema, wishlist_items_schema,
        coupon_schema, coupons_schema, payment_schema, payments_schema,
        product_variant_schema, product_variants_schema,
        address_schema, addresses_schema,
        product_images_schema, product_image_schema
    )
except ImportError:
    try:
        from app.schemas.schemas import (coupons_schema)
    except ImportError:
        # Create minimal schema classes for fallback
        class Schema:
            def dump(self, obj):
                return {}
            def dumps(self, obj):
                return []

        coupon_schema = Schema()
        coupons_schema = Schema()

# Validations & Decorators
try:
    from ...validations.validation import (
        validate_user_registration, validate_user_login, validate_user_update,
        validate_address_creation, validate_address_update,
        validate_product_creation, validate_product_update,
        validate_product_variant_creation, validate_product_variant_update,
        validate_cart_item_addition, validate_cart_item_update,
        validate_order_creation, validate_order_status_update,
        validate_payment_creation, validate_mpesa_payment,
        validate_review_creation, validate_review_update,
        admin_required
    )
except ImportError:
    # Create minimal decorator for fallback
    def admin_required(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            return f(*args, **kwargs)
        return decorated_function

# Setup logger
logger = logging.getLogger(__name__)

# Create blueprint - this is the correct name that should be imported
coupon_routes = Blueprint('coupon_routes', __name__)

# Helper Functions
def get_pagination_params():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', current_app.config.get('ITEMS_PER_PAGE', 12), type=int)
    return page, per_page

def serialize_coupon(coupon):
    """Serialize a coupon object with proper enum handling."""
    try:
        # Convert coupon to dictionary manually to handle enums properly
        data = {
            'id': coupon.id,
            'code': coupon.code,
            'type': coupon.type.value if hasattr(coupon.type, 'value') else str(coupon.type),
            'value': float(coupon.value) if coupon.value else None,
            'min_purchase': float(coupon.min_purchase) if coupon.min_purchase else None,
            'max_discount': float(coupon.max_discount) if coupon.max_discount else None,
            'start_date': coupon.start_date.isoformat() if coupon.start_date else None,
            'end_date': coupon.end_date.isoformat() if coupon.end_date else None,
            'usage_limit': coupon.usage_limit,
            'used_count': coupon.used_count,
            'is_active': coupon.is_active
        }
        return data
    except Exception as e:
        logger.error(f"Error serializing coupon: {str(e)}")
        # Fallback to basic serialization
        return {
            'id': getattr(coupon, 'id', None),
            'code': getattr(coupon, 'code', None),
            'type': 'percentage',
            'value': 0,
            'is_active': getattr(coupon, 'is_active', False)
        }

def serialize_coupons(coupons):
    """Serialize a list of coupon objects with proper enum handling."""
    return [serialize_coupon(coupon) for coupon in coupons]

def paginate_response(query, schema, page, per_page):
    try:
        paginated = query.paginate(page=page, per_page=per_page, error_out=False)

        # Handle coupon serialization specially
        if schema == coupons_schema:
            items = serialize_coupons(paginated.items)
        else:
            items = schema.dump(paginated.items)

        return {
            "items": items,
            "pagination": {
                "page": paginated.page,
                "per_page": paginated.per_page,
                "total_pages": paginated.pages,
                "total_items": paginated.total
            }
        }
    except Exception as e:
        logger.error(f"Pagination error: {str(e)}")
        return {
            "items": [],
            "pagination": {
                "page": 1,
                "per_page": per_page,
                "total_pages": 0,
                "total_items": 0
            }
        }

# ----------------------
# Coupon Routes with Validation
# ----------------------

@coupon_routes.route('/validate', methods=['GET', 'POST', 'OPTIONS'])
@cross_origin()
@jwt_required()
def validate_coupon():
    """Validate a coupon code."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        # Handle both GET and POST requests
        if request.method == 'GET':
            data = request.get_json()
        else:  # POST
            data = request.get_json()

        if not data or not data.get('code'):
            return jsonify({"error": "Coupon code is required"}), 400

        coupon = Coupon.query.filter_by(code=data['code'], is_active=True).first()

        if not coupon:
            return jsonify({"error": "Invalid coupon code"}), 404

        # Check if coupon is valid
        now = datetime.utcnow()
        if (coupon.start_date and coupon.start_date > now) or (coupon.end_date and coupon.end_date < now):
            return jsonify({"error": "Coupon is not valid at this time"}), 400

        # Check if coupon has reached usage limit
        if coupon.usage_limit and coupon.used_count >= coupon.usage_limit:
            return jsonify({"error": "Coupon usage limit reached"}), 400

        return jsonify({
            "valid": True,
            "coupon": serialize_coupon(coupon)
        }), 200

    except Exception as e:
        logger.error(f"Error validating coupon: {str(e)}")
        return jsonify({"error": "Failed to validate coupon", "details": str(e)}), 500

@coupon_routes.route('/', methods=['GET', 'OPTIONS'])
@coupon_routes.route('', methods=['GET', 'OPTIONS'])
@cross_origin()
@jwt_required()
@admin_required
def get_coupons():
    """Get all coupons with pagination."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        page, per_page = get_pagination_params()

        # Filter parameters
        active_only = request.args.get('active', '').lower() == 'true'
        coupon_type = request.args.get('type')

        query = Coupon.query

        if active_only:
            query = query.filter_by(is_active=True)

        if coupon_type:
            try:
                coupon_type_enum = CouponType(coupon_type)
                query = query.filter_by(type=coupon_type_enum)
            except ValueError:
                pass  # Invalid coupon type, ignore filter

        # Order by creation date
        query = query.order_by(desc(Coupon.id))

        return jsonify(paginate_response(query, coupons_schema, page, per_page)), 200

    except Exception as e:
        logger.error(f"Error getting coupons: {str(e)}")
        return jsonify({"error": "Failed to retrieve coupons", "details": str(e)}), 500

@coupon_routes.route('/<int:coupon_id>', methods=['GET', 'OPTIONS'])
@cross_origin()
@jwt_required()
@admin_required
def get_coupon(coupon_id):
    """Get coupon by ID."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        coupon = Coupon.query.get_or_404(coupon_id)
        return jsonify(serialize_coupon(coupon)), 200

    except Exception as e:
        logger.error(f"Error getting coupon: {str(e)}")
        return jsonify({"error": "Failed to retrieve coupon", "details": str(e)}), 500

@coupon_routes.route('/', methods=['POST', 'OPTIONS'])
@coupon_routes.route('', methods=['POST', 'OPTIONS'])
@cross_origin()
@jwt_required()
@admin_required
def create_coupon():
    """Create a new coupon."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        data = request.get_json()

        # Validate required fields
        if not data or not data.get('code') or not data.get('value'):
            return jsonify({"error": "Code and value are required"}), 400

        # Check if code already exists
        if Coupon.query.filter_by(code=data['code']).first():
            return jsonify({"error": "Coupon code already exists"}), 409

        # Parse coupon type
        coupon_type = CouponType.PERCENTAGE
        if 'type' in data:
            try:
                coupon_type = CouponType(data['type'])
            except ValueError:
                return jsonify({"error": "Invalid coupon type"}), 400

        new_coupon = Coupon(
            code=data['code'],
            value=data['value'],
            type=coupon_type,
            min_purchase=data.get('min_purchase'),
            max_discount=data.get('max_discount'),
            usage_limit=data.get('usage_limit'),
            start_date=datetime.fromisoformat(data['start_date']) if data.get('start_date') else None,
            end_date=datetime.fromisoformat(data['end_date']) if data.get('end_date') else None,
            is_active=data.get('is_active', True)
        )

        db.session.add(new_coupon)
        db.session.commit()

        return jsonify({
            "message": "Coupon created successfully",
            "coupon": serialize_coupon(new_coupon)
        }), 201

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error creating coupon: {str(e)}")
        return jsonify({"error": "Failed to create coupon", "details": str(e)}), 500

@coupon_routes.route('/<int:coupon_id>', methods=['PUT', 'OPTIONS'])
@cross_origin()
@jwt_required()
@admin_required
def update_coupon(coupon_id):
    """Update a coupon."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'PUT, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        coupon = Coupon.query.get_or_404(coupon_id)
        data = request.get_json()

        if not data:
            return jsonify({"error": "No data provided"}), 400

        # Update fields
        if 'code' in data:
            # Check if code already exists and is not this coupon
            existing = Coupon.query.filter_by(code=data['code']).first()
            if existing and existing.id != coupon_id:
                return jsonify({"error": "Coupon code already exists"}), 409
            coupon.code = data['code']

        if 'value' in data:
            coupon.value = data['value']

        if 'type' in data:
            try:
                coupon.type = CouponType(data['type'])
            except ValueError:
                return jsonify({"error": "Invalid coupon type"}), 400

        if 'min_purchase' in data:
            coupon.min_purchase = data['min_purchase']

        if 'max_discount' in data:
            coupon.max_discount = data['max_discount']

        if 'usage_limit' in data:
            coupon.usage_limit = data['usage_limit']

        if 'start_date' in data:
            coupon.start_date = datetime.fromisoformat(data['start_date']) if data['start_date'] else None

        if 'end_date' in data:
            coupon.end_date = datetime.fromisoformat(data['end_date']) if data['end_date'] else None

        if 'is_active' in data:
            coupon.is_active = data['is_active']

        db.session.commit()

        return jsonify({
            "message": "Coupon updated successfully",
            "coupon": serialize_coupon(coupon)
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating coupon: {str(e)}")
        return jsonify({"error": "Failed to update coupon", "details": str(e)}), 500

@coupon_routes.route('/<int:coupon_id>', methods=['DELETE', 'OPTIONS'])
@cross_origin()
@jwt_required()
@admin_required
def delete_coupon(coupon_id):
    """Delete a coupon."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'DELETE, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        coupon = Coupon.query.get_or_404(coupon_id)

        db.session.delete(coupon)
        db.session.commit()

        return jsonify({"message": "Coupon deleted successfully"}), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting coupon: {str(e)}")
        return jsonify({"error": "Failed to delete coupon", "details": str(e)}), 500

@coupon_routes.route('/<int:coupon_id>/deactivate', methods=['POST', 'OPTIONS'])
@cross_origin()
@jwt_required()
@admin_required
def deactivate_coupon(coupon_id):
    """Deactivate a coupon."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    try:
        coupon = Coupon.query.get_or_404(coupon_id)

        coupon.is_active = False
        db.session.commit()

        return jsonify({
            "message": "Coupon deactivated successfully",
            "coupon": serialize_coupon(coupon)
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deactivating coupon: {str(e)}")
        return jsonify({"error": "Failed to deactivate coupon", "details": str(e)}), 500

# Export the blueprint with the correct name for import
validation_routes = coupon_routes  # Alias for backward compatibility

# Health check endpoint
@coupon_routes.route('/health', methods=['GET', 'OPTIONS'])
@cross_origin()
def coupon_health_check():
    """Health check for coupon routes."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response

    return jsonify({
        "status": "ok",
        "service": "coupon_routes",
        "timestamp": datetime.now().isoformat(),
        "endpoints": [
            "/validate",
            "/",
            "/<int:coupon_id>",
            "/<int:coupon_id>/deactivate"
        ]
    }), 200
