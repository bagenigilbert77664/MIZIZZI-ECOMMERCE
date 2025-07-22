"""Brand routes for Mizizzi E-commerce platform.
Handles brand management and operations."""

# Standard Libraries
import os
import json
import uuid
import secrets
import re
import random
import string
import logging
from datetime import datetime, timedelta, UTC # Import UTC
from functools import wraps
from json.decoder import JSONDecodeError # Import JSONDecodeError

# Flask Core
from flask import Blueprint, request, jsonify, g, current_app, make_response, render_template_string, url_for, redirect
from flask_cors import cross_origin
from flask_jwt_extended import (
    create_access_token, create_refresh_token,
    jwt_required, get_jwt_identity, get_jwt,
    set_access_cookies, set_refresh_cookies)

# Security & Validation
from werkzeug.security import generate_password_hash, check_password_hash
from email_validator import validate_email, EmailNotValidError
from sqlalchemy.exc import IntegrityError
from werkzeug.exceptions import NotFound, BadRequest # Import BadRequest

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
        from app.models.models import (
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
        class Brand:
            pass
        class Product:
            pass

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
        from app.schemas.schemas import (
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
        # Create minimal schema classes for fallback
        class Schema:
            def dump(self, obj):
                return {}
            def dumps(self, obj):
                return []

        brand_schema = Schema()
        brands_schema = Schema()
        products_schema = Schema()

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
    # Create proper admin_required decorator for fallback
    def admin_required(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            try:
                # This will raise JWTError if token is invalid/expired/missing
                identity = get_jwt_identity()
                claims = get_jwt() # Get raw claims to check for 'role'
                is_admin = False

                # Check if identity is a dict with role (e.g., from create_access_token(identity={'user_id': user.id, 'role': user.role.value}))
                if isinstance(identity, dict) and identity.get('role') == UserRole.ADMIN:
                    is_admin = True
                # Fallback: if identity is just user_id, query DB
                elif isinstance(identity, (int, str)):
                    user = User.query.get(identity)
                    if user and hasattr(user, 'role') and user.role == UserRole.ADMIN:
                        is_admin = True
                # Check claims directly if available (e.g., if role is in claims but not identity)
                elif claims and claims.get('role') == UserRole.ADMIN:
                    is_admin = True

                if not is_admin:
                    return jsonify({"error": "Admin access required"}), 403

                return f(*args, **kwargs)
            except Exception as e:
                # Handle JWT-related errors and other authentication issues
                error_msg = str(e)
                logger.error(f"Authentication error in admin_required: {error_msg}")

                # Check if it's a JWT-related error based on the error message
                if any(jwt_keyword in error_msg.lower() for jwt_keyword in ['jwt', 'token', 'expired', 'invalid', 'signature']):
                    return jsonify({"msg": error_msg}), 422
                else:
                    return jsonify({"error": "An unexpected error occurred during authentication"}), 500

        return decorated_function

# Setup logger
logger = logging.getLogger(__name__)

# Create blueprint
brand_routes = Blueprint('brand_routes', __name__)

# Helper Functions
def get_pagination_params():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', current_app.config.get('ITEMS_PER_PAGE', 12), type=int)
    return page, per_page

def paginate_response(query, schema, page, per_page):
    try:
        paginated = query.paginate(page=page, per_page=per_page, error_out=False)
        return {
            "items": schema.dump(paginated.items),
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

def generate_slug(name):
    """Generates a URL-friendly slug from a given name."""
    if not name:
        return None

    # Convert to lowercase
    slug = name.lower()
    # Replace non-alphanumeric characters with hyphens
    slug = re.sub(r'[^a-z0-9\s-]', '', slug)
    # Replace spaces with hyphens
    slug = re.sub(r'\s+', '-', slug)
    # Remove leading/trailing hyphens
    slug = slug.strip('-')

    return slug

def create_cors_response(data=None, status_code=200):
    """Create a response with proper CORS headers."""
    if data is None:
        data = {'status': 'ok'}

    response = make_response(jsonify(data), status_code)
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    return response

def get_json_data():
    """Safely get JSON data from request with proper error handling."""
    try:
        if not request.is_json:
            return None, {"error": "Request must be JSON"}, 400

        data = request.get_json()
        if data is None:
            return None, {"error": "No data provided"}, 400

        return data, None, None
    except JSONDecodeError as e:
        logger.error(f"JSON decode error: {str(e)}")
        return None, {"error": "Invalid JSON format"}, 400
    except Exception as e:
        logger.error(f"Error getting JSON data: {str(e)}")
        return None, {"error": "Failed to process request data"}, 400

# ----------------------
# Brand Routes
# ----------------------

@brand_routes.route('/', methods=['GET', 'OPTIONS'])
@brand_routes.route('', methods=['GET', 'OPTIONS'])
@cross_origin()
def get_brands():
    """Get all brands with pagination and filtering."""
    if request.method == 'OPTIONS':
        return create_cors_response()

    try:
        page, per_page = get_pagination_params()

        # Filter parameters
        search = request.args.get('search') or request.args.get('q')
        is_active = request.args.get('active')
        featured_only = request.args.get('featured', '').lower() == 'true'

        query = Brand.query

        if search:
            query = query.filter(
                or_(
                    Brand.name.ilike(f'%{search}%'),
                    Brand.description.ilike(f'%{search}%')
                )
            )

        if is_active is not None:
            is_active_bool = is_active.lower() == 'true'
            query = query.filter_by(is_active=is_active_bool)

        if featured_only:
            query = query.filter_by(is_featured=True)

        # Order by name
        query = query.order_by(Brand.name.asc())

        return jsonify(paginate_response(query, brands_schema, page, per_page)), 200

    except Exception as e:
        logger.error(f"Error getting brands: {str(e)}")
        return jsonify({"error": "Failed to retrieve brands", "details": str(e)}), 500

@brand_routes.route('/<int:brand_id>', methods=['GET', 'OPTIONS'])
@cross_origin()
def get_brand(brand_id):
    """Get brand by ID."""
    if request.method == 'OPTIONS':
        return create_cors_response()

    try:
        brand = Brand.query.get(brand_id)
        if not brand:
            return jsonify({"error": "Brand not found"}), 404

        return jsonify(brand_schema.dump(brand)), 200

    except Exception as e:
        logger.error(f"Error getting brand: {str(e)}")
        return jsonify({"error": "Failed to retrieve brand", "details": str(e)}), 500

@brand_routes.route('/slug/<string:slug>', methods=['GET', 'OPTIONS'])
@cross_origin()
def get_brand_by_slug(slug):
    """Get brand by slug."""
    if request.method == 'OPTIONS':
        return create_cors_response()

    try:
        brand = Brand.query.filter_by(slug=slug).first()
        if not brand:
            return jsonify({"error": "Brand not found"}), 404

        return jsonify(brand_schema.dump(brand)), 200

    except Exception as e:
        logger.error(f"Error getting brand by slug: {str(e)}")
        return jsonify({"error": "Failed to retrieve brand", "details": str(e)}), 500

@brand_routes.route('/', methods=['POST', 'OPTIONS'])
@brand_routes.route('', methods=['POST', 'OPTIONS'])
@cross_origin()
@jwt_required()
@admin_required
def create_brand():
    """Create a new brand."""
    if request.method == 'OPTIONS':
        return create_cors_response()

    try:
        # Get JSON data with proper error handling
        data, error_response, status_code = get_json_data()
        if error_response:
            return jsonify(error_response), status_code

        # Validate required fields
        name = data.get('name')
        if not name or not name.strip():
            return jsonify({"error": "Brand name is required"}), 400

        # Generate slug if not provided or empty
        provided_slug = data.get('slug')
        if not provided_slug or not provided_slug.strip():
            final_slug = generate_slug(name)
        else:
            final_slug = provided_slug.strip()

        # Check if brand name already exists (case-insensitive)
        if Brand.query.filter(func.lower(Brand.name) == name.lower()).first():
            return jsonify({"error": "Brand name already exists"}), 409

        # Check if slug already exists (if provided or generated)
        if final_slug and Brand.query.filter_by(slug=final_slug).first():
            return jsonify({"error": "Slug already exists"}), 409

        new_brand = Brand(
            name=name.strip(),
            slug=final_slug,
            description=data.get('description', ''),
            logo_url=data.get('logo_url'),
            website=data.get('website'),
            is_featured=data.get('is_featured', False),
            is_active=data.get('is_active', True)
        )

        db.session.add(new_brand)
        db.session.commit()

        return jsonify({
            "message": "Brand created successfully",
            "brand": brand_schema.dump(new_brand)
        }), 201

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error creating brand: {str(e)}")
        return jsonify({"error": "Failed to create brand", "details": str(e)}), 500

@brand_routes.route('/<int:brand_id>', methods=['PUT', 'OPTIONS'])
@cross_origin()
@jwt_required()
@admin_required
def update_brand(brand_id):
    """Update a brand."""
    if request.method == 'OPTIONS':
        return create_cors_response()

    try:
        brand = Brand.query.get(brand_id)
        if not brand:
            return jsonify({"error": "Brand not found"}), 404

        # Get JSON data with proper error handling
        data, error_response, status_code = get_json_data()
        if error_response:
            return jsonify(error_response), status_code

        if not data:
            return jsonify({"error": "No data provided"}), 400

        # Update fields
        if 'name' in data:
            new_name = data['name'].strip()
            if not new_name:
                return jsonify({"error": "Brand name cannot be empty"}), 400

            # Check if name already exists (case-insensitive)
            existing = Brand.query.filter(
                func.lower(Brand.name) == new_name.lower(),
                Brand.id != brand_id
            ).first()
            if existing:
                return jsonify({"error": "Brand name already exists"}), 409

            brand.name = new_name

        if 'slug' in data:
            new_slug_input = data['slug']
            if not new_slug_input or not new_slug_input.strip():
                # If slug is explicitly set to empty/None, regenerate from name
                name_for_slug = data.get('name', brand.name)
                brand.slug = generate_slug(name_for_slug)
            else:
                final_slug = new_slug_input.strip()
                # Check if slug already exists and is not this brand
                existing = Brand.query.filter_by(slug=final_slug).first()
                if existing and existing.id != brand_id:
                    return jsonify({"error": "Slug already exists"}), 409
                brand.slug = final_slug

        if 'description' in data:
            brand.description = data['description']
        if 'logo_url' in data:
            brand.logo_url = data['logo_url']
        if 'website' in data:
            brand.website = data['website']
        if 'is_featured' in data:
            brand.is_featured = data['is_featured']
        if 'is_active' in data:
            brand.is_active = data['is_active']

        brand.updated_at = datetime.now(UTC)
        db.session.commit()

        return jsonify({
            "message": "Brand updated successfully",
            "brand": brand_schema.dump(brand)
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating brand: {str(e)}")
        return jsonify({"error": "Failed to update brand", "details": str(e)}), 500

@brand_routes.route('/<int:brand_id>', methods=['DELETE', 'OPTIONS'])
@cross_origin()
@jwt_required()
@admin_required
def delete_brand(brand_id):
    """Delete a brand."""
    if request.method == 'OPTIONS':
        return create_cors_response()

    try:
        brand = Brand.query.get(brand_id)
        if not brand:
            return jsonify({"error": "Brand not found"}), 404

        # Check if brand has associated products
        product_count = Product.query.filter_by(brand_id=brand_id).count()
        if product_count > 0:
            return jsonify({
                "error": f"Cannot delete brand. It has {product_count} associated products."
            }), 400

        db.session.delete(brand)
        db.session.commit()

        return jsonify({"message": "Brand deleted successfully"}), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting brand: {str(e)}")
        return jsonify({"error": "Failed to delete brand", "details": str(e)}), 500

@brand_routes.route('/<int:brand_id>/products', methods=['GET', 'OPTIONS'])
@cross_origin()
def get_brand_products(brand_id):
    """Get products for a specific brand."""
    if request.method == 'OPTIONS':
        return create_cors_response()

    try:
        # Verify brand exists
        brand = Brand.query.get(brand_id)
        if not brand:
            return jsonify({"error": "Brand not found"}), 404

        page, per_page = get_pagination_params()

        # Filter parameters
        is_active = request.args.get('active')
        featured_only = request.args.get('featured', '').lower() == 'true'
        new_only = request.args.get('new', '').lower() == 'true'
        sale_only = request.args.get('sale', '').lower() == 'true'
        min_price = request.args.get('min_price', type=float)
        max_price = request.args.get('max_price', type=float)
        search_query = request.args.get('q') or request.args.get('search')

        # Sort parameters
        sort_by = request.args.get('sort_by', 'created_at')
        sort_order = request.args.get('sort_order', 'desc')

        query = Product.query.filter_by(brand_id=brand_id)

        if is_active is not None:
            is_active_bool = is_active.lower() == 'true'
            query = query.filter_by(is_active=is_active_bool)

        if featured_only:
            query = query.filter_by(is_featured=True)

        if new_only:
            query = query.filter_by(is_new=True)

        if sale_only:
            query = query.filter_by(is_sale=True)

        if min_price is not None:
            query = query.filter(Product.price >= min_price)

        if max_price is not None:
            query = query.filter(Product.price <= max_price)

        if search_query:
            search_term = f"%{search_query}%"
            query = query.filter(
                or_(
                    Product.name.ilike(search_term),
                    Product.description.ilike(search_term)
                )
            )

        # Apply sorting
        if sort_by == 'price':
            if sort_order == 'asc':
                query = query.order_by(Product.price.asc())
            else:
                query = query.order_by(Product.price.desc())
        elif sort_by == 'name':
            if sort_order == 'asc':
                query = query.order_by(Product.name.asc())
            else:
                query = query.order_by(Product.name.desc())
        else:  # Default to created_at
            if sort_order == 'asc':
                query = query.order_by(Product.created_at.asc())
            else:
                query = query.order_by(Product.created_at.desc())

        result = paginate_response(query, products_schema, page, per_page)
        result['brand'] = brand_schema.dump(brand)

        return jsonify(result), 200

    except Exception as e:
        logger.error(f"Error getting brand products: {str(e)}")
        return jsonify({"error": "Failed to retrieve brand products", "details": str(e)}), 500

@brand_routes.route('/<int:brand_id>/toggle-status', methods=['POST', 'OPTIONS'])
@cross_origin()
@jwt_required()
@admin_required
def toggle_brand_status(brand_id):
    """Toggle brand active status."""
    if request.method == 'OPTIONS':
        return create_cors_response()

    try:
        brand = Brand.query.get(brand_id)
        if not brand:
            return jsonify({"error": "Brand not found"}), 404

        brand.is_active = not getattr(brand, 'is_active', True)
        brand.updated_at = datetime.now(UTC)
        db.session.commit()

        status = "activated" if brand.is_active else "deactivated"
        return jsonify({
            "message": f"Brand {status} successfully",
            "brand": brand_schema.dump(brand)
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error toggling brand status: {str(e)}")
        return jsonify({"error": "Failed to toggle brand status", "details": str(e)}), 500

@brand_routes.route('/<int:brand_id>/toggle-featured', methods=['POST', 'OPTIONS'])
@cross_origin()
@jwt_required()
@admin_required
def toggle_brand_featured(brand_id):
    """Toggle the featured status of a brand."""
    if request.method == 'OPTIONS':
        return create_cors_response()

    try:
        brand = Brand.query.get(brand_id)
        if not brand:
            return jsonify({"error": "Brand not found"}), 404

        brand.is_featured = not getattr(brand, 'is_featured', False)
        brand.updated_at = datetime.now(UTC)
        db.session.commit()

        status = "featured" if brand.is_featured else "unfeatured"
        return jsonify({
            "message": f"Brand {status} successfully",
            "brand": brand_schema.dump(brand)
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error toggling brand featured: {str(e)}")
        return jsonify({"error": "Failed to toggle brand featured status", "details": str(e)}), 500

# Health check endpoint
@brand_routes.route('/health', methods=['GET', 'OPTIONS'])
@cross_origin()
def brand_health_check():
    """Health check for brand routes."""
    if request.method == 'OPTIONS':
        return create_cors_response()

    return jsonify({
        "status": "ok",
        "service": "brand_routes",
        "timestamp": datetime.now(UTC).isoformat(),
        "endpoints": [
            "/",
            "/<int:brand_id>",
            "/slug/<string:slug>",
            "/<int:brand_id>/products",
            "/<int:brand_id>/toggle-status",
            "/<int:brand_id>/toggle-featured"
        ]
    }), 200

# Export the blueprint with the correct name for import
validation_routes = brand_routes  # Alias for backward compatibility
